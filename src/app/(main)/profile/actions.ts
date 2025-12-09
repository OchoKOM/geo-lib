'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { GeometryType } from '@prisma/client'
import { getSession } from '@/lib/auth'
// import { utapi } from '@/server/uploadthing' // Optionnel: Si vous avez configuré UTAPI pour supprimer les fichiers du cloud

// --- TYPES ---
interface UpdateMapState {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}
export type CoordinateType = number[] | number[][] | number[][][] | number[][][][] | number[][][][][]

// --- HELPER: GeoJSON vers WKT ---
function geojsonToWKT(geometry: { type: string; 
  coordinates: CoordinateType}): string {
  const type = geometry.type
  const coords = geometry.coordinates

  if (!coords || coords.length === 0) throw new Error("Coordonnées invalides")

  function formatCoord(c: CoordinateType) : string {
    // une boucle récursive pour gérer les coordonnées imbriquées
    if (typeof c[0] === 'number') {
      return `${(c as number[])[0]} ${(c as number[])[1]}`
    } else {
      return `(${(c as (CoordinateType)[]).map(formatCoord).join(', ')})`
    }
  }

  switch (type) {
    case 'Point':
      return `POINT(${formatCoord(coords)})`
    case 'MultiPoint':
      return `MULTIPOINT(${(coords as CoordinateType[]).map((c) => formatCoord(c))})`
    case 'LineString':
      return `LINESTRING(${(coords as CoordinateType[]).map((c) => formatCoord(c))})`
    case 'MultiLineString':
      return `MULTILINESTRING(${(coords as CoordinateType[]).map((line) => 
        `(${(Array.isArray(line) ? (line as CoordinateType[]).map(c => formatCoord(c)) : [])})`
      ).join(', ')})`
    case 'Polygon':
      return `POLYGON(${(coords as CoordinateType[]).map((ring) => 
        `(${(ring as CoordinateType[]).map(c => formatCoord(c))})`
      ).join(', ')})`
    case 'MultiPolygon':
      return `MULTIPOLYGON(${(coords as CoordinateType[]).map((poly) => 
        `(${poly.map((ring) => 
          `(${(ring as CoordinateType[]).map(c => formatCoord(c)).join(', ')})`
        ).join(', ')})`
      ).join(', ')})`
    default:
      throw new Error(`Type de géométrie non supporté: ${type}`)
  }
}

// --- ACTION PRINCIPALE : Mise à jour de la zone ---
export async function updateStudyArea(
  id: string,
  prevState: UpdateMapState,
  formData: FormData
): Promise<UpdateMapState> {
  
  // 1. Vérification des droits
  const session = await getSession()
  const user = session?.user
  
  if (!user) {
    return { success: false, message: "Connexion requise." }
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser || !['ADMIN', 'LIBRARIAN', 'AUTHOR'].includes(dbUser.role)) {
    return { success: false, message: "Droits insuffisants." }
  }

  // 2. Extraction des données
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const geojsonRaw = formData.get('geojson') as string
  
  // NOUVEAU : On récupère les infos du nouveau fichier uploadé (s'il existe)
  const newFileUrl = formData.get('uploadedFileUrl') as string
  const newFileId = formData.get('uploadedFileId') as string
  
  if (!name || !geojsonRaw) {
    return { success: false, message: "Le nom et la géométrie sont requis." }
  }

  try {
    const geojsonData = JSON.parse(geojsonRaw)
    
    // Logique de détection de géométrie (simplifiée)
    let geometry = geojsonData
    if (geojsonData.type === 'FeatureCollection') {
      const count = geojsonData.features.length
      if (count === 0) throw new Error("Aucune géométrie dessinée")
      
      // Logique simple : on prend la première feature ou on force un MultiPolygon si complexe
      // Pour cet exemple, on suppose que le client a bien nettoyé les données
      geometry = geojsonData.features[0].geometry
    } else if (geojsonData.type === 'Feature') {
      geometry = geojsonData.geometry
    }

    const geometryType = geometry.type.toUpperCase() as GeometryType
    
    // Conversion en WKT pour PostGIS
    // Note: Si geometry est complexe, assurez-vous que geojsonToWKT gère bien votre structure
    const wkt = geojsonToWKT(geometry)

    // 3. Gestion du changement de fichier GeoJSON
    // Si un nouveau fichier a été uploadé via UploadThing coté client
    if (newFileId && newFileUrl) {
      // A. Trouver l'ancien fichier pour le supprimer
      const currentArea = await prisma.studyArea.findUnique({
        where: { id },
        select: { geojsonFileId: true }
      })

      // B. Mettre à jour la Zone d'étude avec le nouveau fichier
      await prisma.studyArea.update({
        where: { id },
        data: {
          name,
          description,
          geometryType,
          geojsonFileId: newFileId // Lien vers le nouveau fichier créé par UploadThing
        }
      })

      // C. Supprimer l'entrée de l'ancien fichier dans la table File
      if (currentArea?.geojsonFileId && currentArea.geojsonFileId !== newFileId) {
        await prisma.file.delete({
          where: { id: currentArea.geojsonFileId }
        })
        // Note: Pour supprimer le fichier réel du cloud UploadThing, 
        // il faudrait utiliser utapi.deleteFiles(fileKey) ici.
      }

    } else {
      // Pas de nouveau fichier uploadé, mise à jour simple des métadonnées
      await prisma.studyArea.update({
        where: { id },
        data: { name, description, geometryType }
      })
    }

    // 4. Mise à jour de la géométrie PostGIS brute (Toujours nécessaire)
    await prisma.$executeRawUnsafe(
      `UPDATE "StudyArea" SET geometry = ST_GeomFromText($1, 4326) WHERE id = $2`,
      wkt,
      id
    )

    revalidatePath(`/maps/${id}`)
    revalidatePath('/maps')
    
    return { success: true, message: "Zone d'étude et fichier mis à jour avec succès." }

  } catch (error) {
    console.error("Erreur updateStudyArea:", error)
    return { success: false, message: `Erreur: ${(error as Error).message}` }
  }
}