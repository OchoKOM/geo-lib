/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from "@/lib/prisma"
import { SearchSection } from "@/components/home/SearchSection"
import { Prisma } from "@prisma/client"

// Importation des nouveaux composants séparés
import { BookType } from "@prisma/client" // Type utilisé pour la base de données
import MainHome from "@/components/home/Main"

// Interface pour les props de la page
interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function HomePage({ searchParams }: PageProps) {
    const resolvedParams = await searchParams

  // --- 1. Extraction des filtres de l'URL (AJOUTS) ---
  const query = typeof resolvedParams.q === 'string' ? resolvedParams.q : undefined
  const typeParam = typeof resolvedParams.type === 'string' ? resolvedParams.type.split(',') as BookType[] : undefined
  const yearStart = typeof resolvedParams.yearStart === 'string' ? parseInt(resolvedParams.yearStart) : undefined
  const yearEnd = typeof resolvedParams.yearEnd === 'string' ? parseInt(resolvedParams.yearEnd) : undefined
  const zone = typeof resolvedParams.zone === 'string' ? resolvedParams.zone : undefined
  
  // NOUVEAUX PARAMÈTRES
  const facultyId = typeof resolvedParams.facultyId === 'string' ? resolvedParams.facultyId : undefined
  const departmentId = typeof resolvedParams.departmentId === 'string' ? resolvedParams.departmentId : undefined

  const viewParam = typeof resolvedParams.view === 'string' ? resolvedParams.view : 'list'
  const isGridView = viewParam === 'grid'

  // --- 2. Construction de la clause WHERE (MISE À JOUR) ---
  const whereClause: Prisma.BookWhereInput = {
    AND: [
        // Recherche textuelle (Titre ou Description)
        query ? {
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } }
            ]
        } : {},

        // Filtre par Type (plusieurs choix possibles)
        typeParam ? { type: { in: typeParam } } : {},

        // Filtre par Année (sur createdAt ou academicYear si disponible)
        yearStart ? { createdAt: { gte: new Date(`${yearStart}-01-01`) } } : {},
        yearEnd ? { createdAt: { lte: new Date(`${yearEnd}-12-31`) } } : {},

        // Filtre par Zone Géographique (via relation StudyArea)
        zone ? {
            studyAreas: {
                some: {
                    studyArea: {
                        name: { contains: zone, mode: 'insensitive' }
                    }
                }
            }
        } : {},

        // NOUVEAU: Filtre par Département (direct)
        departmentId ? { departmentId: departmentId } : {},

        // NOUVEAU: Filtre par Faculté (si un département n'est pas spécifié)
        // Si departmentId est vide, on filtre sur tous les livres liés à un département de cette faculté.
        // Si departmentId est présent, il a déjà filtré les livres.
        !departmentId && facultyId ? {
          department: {
            facultyId: facultyId
          }
        } : {}
    ]
  }

  // --- 3. Exécution des requêtes ---
  const books = await prisma.book.findMany({
    where: whereClause,
    take: 20, // Pagination à implémenter plus tard
    orderBy: { createdAt: 'desc' },
    include: {
      author: { include: { user: true } },
      studyAreas: { include: { studyArea: true } }
    }
  })

  // RÉCUPÉRATION DES DONNÉES STATIQUES POUR LES FILTRES

  // Récupération des stats (globales, non filtrées pour le menu de gauche)
  const statsGrouped = await prisma.book.groupBy({
    by: ['type'],
    _count: { type: true }
  })
  const getCount = (type: BookType) => statsGrouped.find(g => g.type === type)?._count.type || 0
  const stats = {
    tfc: getCount('TFC'),
    memoires: getCount('MEMOIRE'),
    theses: getCount('THESE'),
    cartes: await prisma.studyArea.count()
  }

  // Récupération de la liste des facultés et leurs départements pour le filtre
  const facultiesData = await prisma.faculty.findMany({
    select: {
      id: true,
      name: true,
      departments: {
        select: {
          id: true,
          name: true,
          facultyId: true,
        }
      }
    }
  })
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">

      {/* Composant Client (Recherche & Filtres, inclut les boutons de vue) */}
      <SearchSection />

      {/* Contenu Principal */}
      <MainHome books={books} stats={stats} query={query} isGridView={isGridView} facultiesData={facultiesData}/>
    </main>
  )
}