import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth' // Ajout de l'import pour la session (si l'on veut filtrer par permissions)

// Type de ligne brute retourné par la requête SQL
type RawGeoRow = {
  id: string
  name: string
  book_count: number
  geojson: string
}

/**
 * Endpoint GET pour la recherche des zones d'étude par nom et/ou intersection géographique.
 * * URL: /api/study-areas/search?q=[nom]&bbox=[GeoJSON]
 * * @param request La requête Next.js contenant les paramètres de recherche.
 * @returns Une réponse JSON contenant les zones d'étude filtrées.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryTerm = searchParams.get('q') || '' // Terme de recherche par nom
    const geoJsonString = searchParams.get('bbox') // GeoJSON pour recherche spatiale (ex: Bounding Box ou polygone dessiné)

    // Initialisation des clauses WHERE et des paramètres pour la requête raw SQL
    let whereClauses: string[] = []
    let params: (string | number)[] = []
    let paramIndex = 1

    // 1. Recherche Textuelle (par nom)
    // Utilisation de ILIKE pour une recherche insensible à la casse
    if (queryTerm) {
      whereClauses.push(`sa.name ILIKE $${paramIndex++}`)
      params.push(`%${queryTerm}%`)
    }

    // 2. Recherche Spatiale (intersection PostGIS)
    // Utilisation de ST_Intersects avec ST_GeomFromGeoJSON
    if (geoJsonString) {
      try {
        // Validation simple: s'assurer que le GeoJSON est bien un objet JSON valide
        JSON.parse(geoJsonString) 

        // Le filtre spatial utilise ST_Intersects(géométrie_stockée, géométrie_fournie)
        // ST_GeomFromGeoJSON convertit le GeoJSON string en géométrie PostGIS.
        whereClauses.push(`ST_Intersects(sa.geometry, ST_GeomFromGeoJSON($${paramIndex++}))`)
        params.push(geoJsonString)
        
      } catch (e) {
        console.warn("GeoJSON non valide reçu pour la recherche spatiale. Ignorer le filtre spatial.")
        // On continue la recherche sans le filtre spatial si le GeoJSON est invalide
      }
    }
    
    // Construction de la clause WHERE finale
    const whereCondition = whereClauses.length > 0 
      ? `WHERE ${whereClauses.join(' AND ')}` 
      : ''
    
    // Construction de la requête SQL complète
    // Nous utilisons ST_AsGeoJSON pour retourner la géométrie dans un format lisible par le client Leaflet
    const sqlQuery = `
      SELECT 
        sa.id, 
        sa.name, 
        COUNT(bsa."bookId") as book_count,
        ST_AsGeoJSON(sa.geometry) as geojson
      FROM "StudyArea" sa
      LEFT JOIN "BookStudyArea" bsa ON sa.id = bsa."studyAreaId"
      ${whereCondition}
      GROUP BY sa.id
      ORDER BY sa.name ASC;
    `

    // Exécution de la requête raw avec les paramètres échappés par Prisma
    // L'ordre des paramètres dans `params` correspond à $1, $2, etc. dans la `sqlQuery`.
    const rawAreas = await prisma.$queryRawUnsafe<RawGeoRow[]>(sqlQuery, ...params)
    
    // Formatage de la sortie
    const studyAreas = rawAreas.map(area => ({
      id: area.id,
      name: area.name,
      // Conversion de BigInt (issu de COUNT) en Number
      bookCount: Number(area.book_count), 
      color: '#3b82f6', // Couleur par défaut
      geometry: JSON.parse(area.geojson), // GeoJSON est une chaîne, doit être parsé
      // Les permissions canEdit/canDelete devraient être déterminées ici 
      // si nous utilisions la session de l'utilisateur (omises pour la simplicité ici)
    }))

    return NextResponse.json({ success: true, areas: studyAreas })

  } catch (error) {
    console.error('Erreur lors de la recherche des zones d\'étude:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur lors de la recherche.' },
      { status: 500 }
    )
  }
}