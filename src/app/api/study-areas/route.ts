import { NextRequest, NextResponse } from 'next/server'
import { GeometryType } from '@prisma/client'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface GeoJSONGeometry {
  type: string
  coordinates: number[] | number[][] | number[][][] | number[][][][]
}

// Helper function to convert GeoJSON to Well-Known Text (WKT)
function geojsonToWKT(geojson: GeoJSONGeometry): string {
  // This is a simplified conversion - in production, use a proper GeoJSON to WKT library
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

  throw new Error(`Unsupported geometry type or invalid coordinates: ${type}`)
}

// --- NOUVEAU : Méthode GET pour la recherche ---
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    // Si aucun terme de recherche n'est fourni, on peut renvoyer une liste vide ou les derniers ajouts
    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    // Recherche dans la base de données (insensible à la casse si configuré dans Prisma/DB)
    const studyAreas = await prisma.studyArea.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: {
        geojsonFile: true // On inclut le fichier pour récupérer l'URL ou les données si stockées
      },
      take: 10 // Limiter à 10 résultats pour la performance
    })

    // Pour chaque zone trouvée, nous devons idéalement renvoyer le GeoJSON.
    // NOTE: Si vos GeoJSON sont très lourds, il vaudrait mieux ne renvoyer que les métadonnées
    // et faire un second appel pour charger la géométrie au clic.
    // Ici, nous supposons que nous pouvons récupérer le contenu via l'URL du fichier ou qu'il faut le fetcher.
    
    // Simplification : nous renvoyons les métadonnées. Le frontend devra peut-être fetcher le GeoJSON via l'URL du fichier.
    
    return NextResponse.json({
      success: true,
      results: studyAreas
    })

  } catch (error) {
    console.error('Error searching study areas:', error)
    return NextResponse.json(
      { error: 'Internal server error during search' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // TEMPORARILY BYPASSED FOR TESTING - Check authentication and authorization
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || !['ADMIN', 'LIBRARIAN', 'AUTHOR'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { name, description, geometryType, geojson, centerLat, centerLng, fileUrl } = await request.json()

    if (!name || !geojson) {
      return NextResponse.json(
        { error: 'Name and GeoJSON data are required' },
        { status: 400 }
      )
    }

    // Validate and convert geometryType to enum
    const validGeometryTypes = Object.values(GeometryType)
    if (!validGeometryTypes.includes(geometryType as GeometryType)) {
      return NextResponse.json(
        { error: `Invalid geometry type. Must be one of: ${validGeometryTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Handle FeatureCollection - extract the first feature's geometry
    let geometryToConvert = geojson
    if (geojson.type === 'FeatureCollection' && geojson.features && geojson.features.length > 0) {
      geometryToConvert = geojson.features[0].geometry
    }

    // Convert GeoJSON to PostGIS geometry using raw SQL
    const geometryWKT = geojsonToWKT(geometryToConvert)

    // Save GeoJSON file
    const geojsonFile = await prisma.file.create({
      data: {
        url: fileUrl || '', // Will be set by file upload service
        name: `${name}.geojson`,
        mimeType: 'application/json',
        size: Buffer.byteLength(JSON.stringify(geojson)),
        type: 'GEOJSON_DATA'
      }
    })

    // Create study area - temporarily skip geometry field since Prisma doesn't support PostGIS directly
    const studyArea = await prisma.studyArea.create({
      data: {
        name,
        description,
        geometryType: geometryType as GeometryType,
        centerLat,
        centerLng,
        geojsonFileId: geojsonFile.id
        // geometry field is not supported by Prisma, will be handled separately
      }
    })

    // Update geometry using raw SQL after creation
    await prisma.$executeRaw`
      UPDATE "StudyArea"
      SET geometry = ST_GeomFromText(${geometryWKT}, 4326)
      WHERE id = ${studyArea.id}
    `

    return NextResponse.json({
      success: true,
      studyArea,
      message: 'Study area saved successfully'
    })

  } catch (error) {
    console.error('Error saving study area:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}