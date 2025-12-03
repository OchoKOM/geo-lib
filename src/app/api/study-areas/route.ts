/* eslint-disable @typescript-eslint/ban-ts-comment */
import { NextRequest, NextResponse } from 'next/server'
import { GeometryType } from '@prisma/client'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface GeoJSONGeometry {
  type: string
  coordinates: number[] | number[][] | number[][][] | number[][][][]
}

// Helper: Convertir GeoJSON en WKT (Well-Known Text) pour PostGIS
function geojsonToWKT(geojson: GeoJSONGeometry): string {
  const { type, coordinates } = geojson

  switch (type) {
    case 'Point':
      if (Array.isArray(coordinates) && coordinates.length >= 2) {
        return `POINT(${coordinates[0]} ${coordinates[1]})`
      }
      break

    case 'LineString':
      if (Array.isArray(coordinates) && coordinates.every(coord => Array.isArray(coord))) {
        const lineCoords = coordinates as number[][]
        const lineString = lineCoords.map(coord => `${coord[0]} ${coord[1]}`).join(', ')
        return `LINESTRING(${lineString})`
      }
      break

    case 'Polygon':
      if (Array.isArray(coordinates) && coordinates.length > 0 && Array.isArray(coordinates[0])) {
        const polyCoords = coordinates[0] as number[][]
        const polygonString = polyCoords.map(coord => `${coord[0]} ${coord[1]}`).join(', ')
        return `POLYGON((${polygonString}))`
      }
      break

    case 'MultiPolygon':
      if (Array.isArray(coordinates) && coordinates.every(ring => Array.isArray(ring))) {
        const multiPolyCoords = coordinates as number[][][][]
        const multiPolygonString = multiPolyCoords.map(ring =>
          `(${ring[0].map(coord => `${coord[0]} ${coord[1]}`).join(', ')})`
        ).join(', ')
        return `MULTIPOLYGON(${multiPolygonString})`
      }
      break
  }

  throw new Error(`Type de géométrie non supporté ou coordonnées invalides: ${type}`)
}

// --- GET : Recherche Textuelle ET Spatiale ---
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') // Texte (optionnel)
    
    // Paramètres spatiaux (Bounding Box)
    const minLat = searchParams.get('minLat')
    const maxLat = searchParams.get('maxLat')
    const minLng = searchParams.get('minLng')
    const maxLng = searchParams.get('maxLng')

    // Validation basique : soit du texte, soit une zone spatiale
    const hasSpatial = minLat && maxLat && minLng && maxLng
    const hasText = query && query.length >= 2

    if (!hasText && !hasSpatial) {
      return NextResponse.json({ results: [] })
    }

    let results = []

    if (hasSpatial) {
      // --- RECHERCHE SPATIALE AVEC POSTGIS (Raw SQL) ---
      // Prisma ne supporte pas encore nativement les filtres géographiques complexes dans findMany
      // Nous utilisons donc $queryRaw avec ST_MakeEnvelope et ST_Intersects
      
      // On construit la requête de base
      const textFilter = hasText ? `%${query}%` : null
      
      // Conversion des params en float
      const nMinLat = parseFloat(minLat)
      const nMaxLat = parseFloat(maxLat)
      const nMinLng = parseFloat(minLng)
      const nMaxLng = parseFloat(maxLng)

      // Note: On joint manuellement la table File pour récupérer l'URL du GeoJSON
      // @ts-expect-error
      results = await prisma.$queryRaw`
        SELECT 
          sa.id, 
          sa.name, 
          sa.description, 
          sa."geometryType", 
          sa."centerLat", 
          sa."centerLng",
          f.url as "geojsonUrl"
        FROM "StudyArea" sa
        LEFT JOIN "File" f ON sa."geojsonFileId" = f.id
        WHERE 
          -- 1. Filtre Spatial : L'intersection entre la géométrie en base et la boîte englobante de recherche
          ST_Intersects(
            sa.geometry, 
            ST_MakeEnvelope(${nMinLng}, ${nMinLat}, ${nMaxLng}, ${nMaxLat}, 4326)
          )
          AND
          -- 2. Filtre Textuel (Optionnel) : Si un texte est fourni, on filtre aussi par nom/description
          (
            ${textFilter}::text IS NULL 
            OR sa.name ILIKE ${textFilter} 
            OR sa.description ILIKE ${textFilter}
          )
        LIMIT 20;
      `
      
      // Mapping pour correspondre au format attendu par le frontend
      results = results.map(row => ({
        ...row,
        geojsonFile: { url: row.geojsonUrl }
      }))

    } else {
      // --- RECHERCHE TEXTUELLE CLASSIQUE (Prisma) ---
      results = await prisma.studyArea.findMany({
        where: {
          OR: [
            { name: { contains: query!, mode: 'insensitive' } },
            { description: { contains: query!, mode: 'insensitive' } }
          ]
        },
        include: {
          geojsonFile: true
        },
        take: 10
      })
    }
    
    return NextResponse.json({
      success: true,
      results: results
    })

  } catch (error) {
    console.error('Erreur lors de la recherche des zones d\'étude:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur lors de la recherche' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || !['ADMIN', 'LIBRARIAN', 'AUTHOR'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes' },
        { status: 403 }
      )
    }

    const { name, description, geometryType, geojson, centerLat, centerLng, fileUrl } = await request.json()

    if (!name || !geojson) {
      return NextResponse.json(
        { error: 'Le nom et les données GeoJSON sont requis' },
        { status: 400 }
      )
    }

    const validGeometryTypes = Object.values(GeometryType)
    if (!validGeometryTypes.includes(geometryType as GeometryType)) {
      return NextResponse.json(
        { error: `Type de géométrie invalide. Doit être l'un de : ${validGeometryTypes.join(', ')}` },
        { status: 400 }
      )
    }

    let geometryToConvert = geojson
    if (geojson.type === 'FeatureCollection' && geojson.features && geojson.features.length > 0) {
      geometryToConvert = geojson.features[0].geometry
    }

    const geometryWKT = geojsonToWKT(geometryToConvert)

    const geojsonFile = await prisma.file.create({
      data: {
        url: fileUrl || '',
        name: `${name}.geojson`,
        mimeType: 'application/json',
        size: Buffer.byteLength(JSON.stringify(geojson)),
        type: 'GEOJSON_DATA'
      }
    })

    const studyArea = await prisma.studyArea.create({
      data: {
        name,
        description,
        geometryType: geometryType as GeometryType,
        centerLat,
        centerLng,
        geojsonFileId: geojsonFile.id
      }
    })

    // Mise à jour brute SQL pour insérer la géométrie PostGIS
    await prisma.$executeRaw`
      UPDATE "StudyArea"
      SET geometry = ST_GeomFromText(${geometryWKT}, 4326)
      WHERE id = ${studyArea.id}
    `

    return NextResponse.json({
      success: true,
      studyArea,
      message: 'Zone d\'étude enregistrée avec succès'
    })

  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la zone:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}