// Fichier : app/catalog/page.tsx
import prisma from '@/lib/prisma'
import { CatalogList } from '@/components/catalog/CatalogList'
import { CatalogFilters } from '@/components/catalog/CatalogFilters'
import { Prisma } from '@prisma/client'

// =================================================================
// 1. Définitions des Types
// =================================================================

// Paramètres de l'URL pour la page de catalogue
export interface CatalogSearchParams {
  search?: string
  departmentId?: string
  authorId?: string
  year?: string
  page?: string 
}

// Interface de l'élément de livre formaté pour le client
export interface BookItem {
  id: string
  title: string
  description: string
  location: string
  departmentName: string
  authorName: string | null
  studyAreasCount: number
}

// Interface pour les options de filtre retournées au client
export interface FilterOptions {
  id: string
  name: string
}
export interface YearOption {
  id: string
  year: string
}
export interface CatalogFilterData {
  departments: FilterOptions[]
  authors: FilterOptions[]
  years: YearOption[]
}

// Interface des Props pour la Page (incluant les types de Next.js)
interface CatalogPageProps {
  searchParams: CatalogSearchParams
}


// =================================================================
// 2. Fonction de Récupération des Données (Typée)
// =================================================================

async function getCatalogData(
  searchParams: CatalogSearchParams
): Promise<{ books: BookItem[], filters: CatalogFilterData }> {
    

  const { search, departmentId, authorId, year } = searchParams
  
  // Type explicite pour la clause WHERE de Prisma
  const whereClause: Prisma.BookWhereInput = {}

  if (search) {
    // Recherche par titre ou description
    whereClause.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (departmentId) {
    whereClause.departmentId = departmentId
  }

  if (authorId) {
    whereClause.authorId = authorId
  }

  // Filtrage par Année
  if (year) {
    const academicYear = await prisma.academicYear.findUnique({
      where: { year: year },
      select: { id: true }
    })
    if (academicYear) {
      whereClause.academicYearId = academicYear.id
    }
  }

  // Définition explicite du type de sélection pour la requête
  const bookSelect = {
    id: true,
    title: true,
    description: true,
    location: true,
    department: {
      select: { name: true }
    },
    author: {
      select: { user: { select: { name: true } } }
    },
    studyAreas: {
      select: { studyAreaId: true }
    }
  }

  // Type pour le résultat direct de la requête Prisma
  type PrismaBookResult = Prisma.BookGetPayload<{ select: typeof bookSelect }>

  const books: PrismaBookResult[] = await prisma.book.findMany({
    where: whereClause,
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: bookSelect,
  })
  
  // Récupération des données pour les options de filtre
  const [departments, authors, academicYears] = await Promise.all([
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.authorProfile.findMany({ 
      select: { id: true, user: { select: { name: true } } },
      where: { user: { name: { not: undefined } } }
    }),
    prisma.academicYear.findMany({ select: { id: true, year: true }, orderBy: { year: 'desc' } }),
  ]);

  // Formatage des livres pour le composant client
  const formattedBooks: BookItem[] = books.map(book => ({
    id: book.id,
    title: book.title,
    description: book.description,
    location: book.location ?? 'N/A', // Assurez-vous que `location` peut être null dans Prisma si c'est le cas
    departmentName: book.department?.name ?? 'N/A',
    authorName: book.author?.user?.name ?? 'Auteur Inconnu',
    studyAreasCount: book.studyAreas.length,
  }))

  // Formatage des auteurs pour les options de filtre
  const formattedAuthors: FilterOptions[] = authors.map(a => ({ 
    id: a.id, 
    name: a.user.name ?? 'Auteur Inconnu' 
  }))

  const filterData: CatalogFilterData = {
      departments: departments,
      authors: formattedAuthors,
      years: academicYears,
  }

  return { books: formattedBooks, filters: filterData }
}

// =================================================================
// 3. Composant Principal de la Page
// =================================================================

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
    
  const { books, filters } = await getCatalogData(searchParams)

  return (
    <div className="container mx-auto p-4 lg:p-8">
      <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-8 border-b pb-4">
        Catalogue des Ouvrages <strong>Géospatiaux</strong>
      </h1>
      
      <div className="lg:grid lg:grid-cols-4 lg:gap-8">
        
        {/* Colonne des Filtres */}
        <aside className="lg:col-span-1 mb-8 lg:mb-0 lg:sticky top-20 h-fit">
          <CatalogFilters filters={filters} currentParams={searchParams} />
        </aside>

        {/* Colonne Principale */}
        <div className="lg:col-span-3">
          {/* Note : totalCount est maintenant books.length car nous n'avons pas la pagination globale ici */}
          <CatalogList books={books} totalCount={books.length} currentParams={searchParams} />
        </div>
      </div>
    </div>
  )
}