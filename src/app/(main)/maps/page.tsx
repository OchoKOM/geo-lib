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

export default async function MapsIndexPage() {
  // 1. Vérification de la session
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  // 2. Récupération des zones avec les relations nécessaires
  // On inclut le fichier GeoJSON pour obtenir l'URL et on compte les livres
  const studyAreas = await prisma.studyArea.findMany({
    orderBy: { createdAt: 'desc' }, // Les plus récentes en premier
    include: {
      geojsonFile: {
        select: { url: true } // On a juste besoin de l'URL pour la preview
      },
      _count: {
        select: { books: true } // Compteur de livres associés
      }
    }
  })

  // 3. Transformation des données pour le client
  // On nettoie les objets pour ne passer que le nécessaire au composant React
  const mapsData = studyAreas.map(area => ({
    id: area.id,
    name: area.name,
    description: area.description,
    geometryType: area.geometryType,
    centerLat: (area.centerLat && area.centerLat !== 0) ? area.centerLat : -4.4419, // Fallback Kinshasa if null or 0
    centerLng: (area.centerLng && area.centerLng !== 0) ? area.centerLng : 15.2663,
    geojsonUrl: area.geojsonFile?.url || null,
    bookCount: area._count.books,
    createdAt: area.createdAt.toISOString() // Sérialisation des dates pour le client
  }))

  return (
    <div className="h-[calc(100vh-64px)] relative bgbackground flex flex-col">
      {/* En-tête de la page */}
      <div className="flex flex-wrap md:flex-row items-start md:items-center justify-between gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <MapIcon className="w-6 h-6 text-blue-600" />
            Zones d&apos;Étude
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {mapsData.length} zone(s) enregistrée(s) dans la base de données.
          </p>
        </div>
        
        <Link href="/maps/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Nouvelle Zone
          </Button>
        </Link>
      </div>

      {/* Liste Client avec Previews */}
      <MapListClient maps={mapsData} />
    </div>
  )
}