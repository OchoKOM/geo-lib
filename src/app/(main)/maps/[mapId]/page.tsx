import { notFound, redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import EditMapClient from './EditMapClient'
import { ExtendedFeature } from './map-types'

export default async function EditMapPage({ params }: { params: { mapId: string } }) {
  const session = await getSession()
  const {mapId} = await params
  
  if (!session) {
    redirect('/login')
  }

  // 1. Récupération de la zone d'étude
  const studyArea = await prisma.studyArea.findUnique({
    where: { id: mapId },
    include: {
      geojsonFile: true,
      // Inclusion des livres associés via la table de jointure
      books: {
        include: {
          book: {
            include: {
              author: { include: { user: true } }, // Pour afficher le nom de l'auteur
              department: true
            }
          }
        }
      }
    }
  })

  if (!studyArea) {
    notFound()
  }

  // 2. Récupération du contenu GeoJSON réel
  // Le champ 'geometry' PostGIS n'est pas directement lisible par Prisma Client standard sans raw query
  // Mais nous avons le fichier GeoJSON associé ou l'URL.
  // Pour l'édition, il est préférable de récupérer le GeoJSON source.
  let initialGeoJson = null
  
  try {
    if (studyArea.geojsonFile?.url) {
      const res = await fetch(studyArea.geojsonFile.url)
      if (res.ok) {
        initialGeoJson = await res.json()
      }
    }
  } catch (e) {
    console.error("Erreur lors du fetch du GeoJSON:", e)
  }

  // S'il n'y a pas de fichier, on essaie de construire un GeoJSON basique depuis les métadonnées
  if (!initialGeoJson) {
    initialGeoJson = {
      type: 'FeatureCollection',
      features: []
    }
  }

  const filteredFeatures = initialGeoJson.features.filter((f:ExtendedFeature)=>!!f.geometry)

  // Filtrer les features avec geometry et ignorer si sans geometry
  initialGeoJson =  {...initialGeoJson, features: filteredFeatures}

  // 3. Transformation des données pour le client
  // On formate les livres pour un affichage simple
  const associatedBooks = studyArea.books.map(relation => ({
    id: relation.book.id,
    title: relation.book.title,
    type: relation.book.type,
    authorName: relation.book.author?.user.name || "Auteur inconnu",
    department: relation.book.department?.name,
    year: relation.book.createdAt.getFullYear()
  }))

  return (
    <div className="h-full relative w-full flex flex-col">
      <EditMapClient 
        studyArea={studyArea} 
        initialGeoJson={initialGeoJson}
        initialBooks={associatedBooks}
      />
    </div>
  )
}