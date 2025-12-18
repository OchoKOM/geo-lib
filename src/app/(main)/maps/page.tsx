import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { MapListClient } from './MapListClient'
import { Plus, Map as MapIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Toutes les Zones d\'Étude',
  description: 'Gestion et prévisualisation des zones géographiques.'
}

// Définition des props pour récupérer les searchParams (Next.js 13+)
interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function MapsIndexPage({ searchParams }: PageProps) {
  const {page: pageParam, q} = await searchParams;

  // 2. Gestion de la Pagination et de la Recherche
  const page = Number(pageParam) || 1
  const pageSize = 10 // Nombre d'éléments par page
  const searchQuery = typeof q === 'string' ? q : ''
  const skip = (page - 1) * pageSize

  // Construction du filtre de recherche (WHERE)
  const whereClause = searchQuery ? {
    OR: [
      { name: { contains: searchQuery, mode: 'insensitive' as const } },
      { description: { contains: searchQuery, mode: 'insensitive' as const } }
    ]
  } : {}

  // 3. Récupération des données en parallèle (Données + Compte total)
  const [studyAreas, totalCount] = await Promise.all([
    prisma.studyArea.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: skip,
      take: pageSize,
      include: {
        geojsonFile: {
          select: { url: true }
        },
        _count: {
          select: { books: true }
        }
      }
    }),
    prisma.studyArea.count({ where: whereClause })
  ])

  const totalPages = Math.ceil(totalCount / pageSize)

  // 4. Transformation des données pour le client
  const mapsData = studyAreas.map(area => ({
    id: area.id,
    name: area.name,
    description: area.description,
    geometryType: area.geometryType,
    centerLat: (area.centerLat && area.centerLat !== 0) ? area.centerLat : -4.4419,
    centerLng: (area.centerLng && area.centerLng !== 0) ? area.centerLng : 15.2663,
    geojsonUrl: area.geojsonFile?.url || null,
    bookCount: area._count.books,
    createdAt: area.createdAt.toISOString()
  }))

  return (
    <div className="h-[calc(100vh-64px)] relative bg-background flex flex-col">
      {/* En-tête de la page */}
      <div className="flex flex-wrap md:flex-row items-start md:items-center justify-between gap-4 p-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <MapIcon className="w-6 h-6 text-blue-600" />
            Zones d&apos;Étude
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {totalCount} zone(s) trouvée(s) • Page {page} sur {totalPages || 1}
          </p>
        </div>
        
        <Link href="/maps/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Nouvelle Zone
          </Button>
        </Link>
      </div>

      {/* Liste Client avec Previews */}
      {/* On passe les données paginées et les infos de pagination au client */}
      <MapListClient 
        maps={mapsData} 
        totalPages={totalPages}
        currentPage={page}
        totalCount={totalCount}
        initialSearchQuery={searchQuery}
      />
    </div>
  )
}