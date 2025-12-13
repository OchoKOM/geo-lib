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
  console.log('POST /api/study-areas: Starting request processing')
    console.log('POST /api/study-areas: Getting session')
    const session = await getSession()

  try {
    if (!session?.user) {
      console.log('POST /api/study-areas: No session or user')
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    console.log('POST /api/study-areas: Fetching user details')
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || !['ADMIN', 'LIBRARIAN', 'AUTHOR'].includes(user.role)) {
      console.log('POST /api/study-areas: Insufficient permissions')
      return NextResponse.json(
        { error: 'Permissions insuffisantes' },
        { status: 403 }
      )
    }

    console.log('POST /api/study-areas: Parsing request body')
    const { name, description, geometryType, geojson, centerLat, centerLng, fileUrl } = await request.json()

    if (!name || !geojson) {
      console.log('POST /api/study-areas: Missing required fields')
      return NextResponse.json(
        { error: 'Le nom et les données GeoJSON sont requis' },
        { status: 400 }
      )
    }

    const validGeometryTypes = Object.values(GeometryType)
    if (!validGeometryTypes.includes(geometryType as GeometryType)) {
      console.log('POST /api/study-areas: Invalid geometry type')
      return NextResponse.json(
        { error: `Type de géométrie invalide. Doit être l'un de : ${validGeometryTypes.join(', ')}` },
        { status: 400 }
      )
    }

    console.log('POST /api/study-areas: Preparing geometry for conversion')
    let geometryToConvert = geojson
    if (geojson.type === 'FeatureCollection' && geojson.features && geojson.features.length > 0) {
      geometryToConvert = geojson.features[0].geometry
    }

    console.log('POST /api/study-areas: Converting GeoJSON to WKT')
    let geometryWKT: string
    try {
      geometryWKT = geojsonToWKT(geometryToConvert)
      console.log(`POST /api/study-areas: WKT conversion successful, length: ${geometryWKT.length}`)
    } catch (wktError) {
      console.error('POST /api/study-areas: WKT conversion failed:', wktError)
      return NextResponse.json(
        { error: 'Erreur lors de la conversion des données GeoJSON' },
        { status: 400 }
      )
    }

    console.log('POST /api/study-areas: Starting database transaction')
    const result = await prisma.$transaction(async (tx) => {
      console.log('POST /api/study-areas: Creating File record')
      const geojsonFile = await tx.file.create({
        data: {
          url: fileUrl || '',
          name: `${name}.geojson`,
          mimeType: 'application/json',
          size: Buffer.byteLength(JSON.stringify(geojson)),
          type: 'GEOJSON_DATA'
        }
      })

      console.log('POST /api/study-areas: Creating StudyArea record')
      const studyArea = await tx.studyArea.create({
        data: {
          name,
          description,
          geometryType: geometryType as GeometryType,
          centerLat,
          centerLng,
          geojsonFileId: geojsonFile.id
        }
      })

      console.log('POST /api/study-areas: Updating geometry with raw SQL')
      try {
        await tx.$executeRaw`
          UPDATE "StudyArea"
          SET geometry = ST_GeomFromText(${geometryWKT}, 4326)
          WHERE id = ${studyArea.id}
        `
        console.log('POST /api/study-areas: Geometry update successful')
      } catch (sqlError) {
        console.error('POST /api/study-areas: Raw SQL geometry update failed:', sqlError)
        throw new Error('Erreur lors de la mise à jour de la géométrie')
      }

      return { studyArea }
    })

    console.log('POST /api/study-areas: Transaction completed successfully')
    return NextResponse.json({
      success: true,
      studyArea: result.studyArea,
      message: 'Zone d\'étude enregistrée avec succès'
    })

  } catch (error) {
    console.error('POST /api/study-areas: Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
