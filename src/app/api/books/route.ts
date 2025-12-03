import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET: Recherche de livres (Texte + Spatial)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') // Recherche texte
    
    // Paramètres spatiaux
    const minLat = searchParams.get('minLat')
    const maxLat = searchParams.get('maxLat')
    const minLng = searchParams.get('minLng')
    const maxLng = searchParams.get('maxLng')
    
    const hasSpatial = minLat && maxLat && minLng && maxLng

    let books;

    // SCÉNARIO 1 : Recherche SPATIALE (avec ou sans texte)
    if (hasSpatial) {
      const textFilter = q ? `%${q}%` : null
      
      const nMinLat = parseFloat(minLat)
      const nMaxLat = parseFloat(maxLat)
      const nMinLng = parseFloat(minLng)
      const nMaxLng = parseFloat(maxLng)

      // 1. Trouver les IDs des zones qui intersectent la bounding box
      const areaIdsRaw = await prisma.$queryRaw<{id: string}[]>`
        SELECT id FROM "StudyArea" 
        WHERE ST_Intersects(
            geometry, 
            ST_MakeEnvelope(${nMinLng}, ${nMinLat}, ${nMaxLng}, ${nMaxLat}, 4326)
        )
      `
      
      const areaIds = areaIdsRaw.map(a => a.id)
      
      if (areaIds.length === 0) {
        return NextResponse.json({ success: true, data: [] })
      }

      // 2. Trouver les livres liés à ces zones
      books = await prisma.book.findMany({
        where: {
          AND: [
            {
              studyAreas: {
                some: {
                  studyAreaId: { in: areaIds }
                }
              }
            },
            q ? {
               OR: [
                 { title: { contains: q, mode: 'insensitive' } },
                 { description: { contains: q, mode: 'insensitive' } }
               ]
            } : {}
          ]
        },
        include: {
          author: { select: { id: true, user: { select: { name: true } } } }, // Modifié pour correspondre au schema AuthorProfile
          academicYear: { select: { year: true } },
          department: { select: { name: true } },
          documentFile: true, // Inclure le fichier lié
          studyAreas: {
            include: {
              studyArea: {
                select: { id: true, name: true, geometryType: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })

    } else {
      // SCÉNARIO 2 : Recherche TEXTUELLE SIMPLE
      books = await prisma.book.findMany({
        where: q ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } }
          ]
        } : {},
        include: {
          author: { select: { id: true, user: { select: { name: true } } } },
          academicYear: { select: { year: true } },
          department: { select: { name: true } },
          documentFile: true, // Inclure le fichier lié
          studyAreas: {
            include: {
              studyArea: {
                select: { id: true, name: true, geometryType: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    }

    // Mapping pour aplatir le nom de l'auteur si nécessaire pour le frontend
    const formattedBooks = books.map(b => ({
        ...b,
        author: b.author ? { name: b.author.user.name, id: b.author.id } : null
    }))

    return NextResponse.json({ success: true, data: formattedBooks })

  } catch (error) {
    console.error('Erreur recherche livres:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: Création d'un livre
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user || !['ADMIN', 'LIBRARIAN', 'AUTHOR'].includes(user.role)) {
        return NextResponse.json({ error: 'Interdit' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, type, studyAreaId } = body

    if (!title || !studyAreaId) {
        return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const book = await prisma.book.create({
        data: {
            title,
            description,
            type,
            studyAreas: {
                create: {
                    studyAreaId: studyAreaId
                }
            }
        }
    })

    return NextResponse.json({ success: true, book })

  } catch (error) {
    console.error('Erreur création livre:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// --- NOUVEAU : PUT POUR LA MODIFICATION ---
export async function PUT(request: NextRequest) {
    try {
      // 1. Authentification & Autorisation
      const session = await getSession()
      if (!session?.user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      
      const user = await prisma.user.findUnique({ where: { id: session.user.id } })
      if (!user || !['ADMIN', 'LIBRARIAN', 'AUTHOR'].includes(user.role)) {
          return NextResponse.json({ error: 'Interdit' }, { status: 403 })
      }
  
      const body = await request.json()
      const { 
          id, 
          title, 
          description, 
          type, 
          newStudyAreaId, // ID de la zone à ajouter
          fileUrl,        // URL du fichier uploadé (PDF)
          fileName,       // Nom du fichier
          fileSize        // Taille du fichier
      } = body
  
      if (!id) return NextResponse.json({ error: 'ID du livre requis' }, { status: 400 })
  
      // Préparation des données de mise à jour
      const updateData = {
          title,
          description,
          type,
          updatedAt: new Date() // Si champ existe, sinon ignoré
      }
  
      // 2. Gestion de l'ajout d'une zone d'étude
      if (newStudyAreaId) {
          // On vérifie d'abord si la zone existe
          const areaExists = await prisma.studyArea.findUnique({ where: { id: newStudyAreaId }})
          if (!areaExists) {
              return NextResponse.json({ error: "Code de zone introuvable" }, { status: 404 })
          }

          // On ajoute la relation (connectOrCreate ou create dans la table de liaison)
          // Note: Prisma gère les doublons sur @@id unique si on utilise create simple, donc on utilise upsert ou on ignore l'erreur
          // Ici, on utilise la syntaxe nested create qui échouera si existe déjà, donc on fait un check ou delete/create
          // Approche simple: deleteMany pour ce couple puis create
          await prisma.bookStudyArea.deleteMany({
              where: {
                  bookId: id,
                  studyAreaId: newStudyAreaId
              }
          })
          
          updateData.studyAreas = {
              create: {
                  studyAreaId: newStudyAreaId
              }
          }
      }
  
      // 3. Gestion du fichier électronique (PDF)
      if (fileUrl) {
          // On crée d'abord l'entrée fichier
          const newFile = await prisma.file.create({
              data: {
                  url: fileUrl,
                  name: fileName || 'Document.pdf',
                  mimeType: 'application/pdf', // Par défaut PDF pour cet usage
                  size: fileSize || 0,
                  type: 'DOCUMENT_PDF'
              }
          })
          
          // On lie ce fichier au livre
          updateData.documentFileId = newFile.id
      }
  
      // 4. Exécution de la mise à jour
      const updatedBook = await prisma.book.update({
          where: { id },
          data: updateData,
          include: {
             studyAreas: { include: { studyArea: true } },
             documentFile: true
          }
      })
  
      return NextResponse.json({ success: true, book: updatedBook })
  
    } catch (error) {
      console.error('Erreur modification livre:', error)
      return NextResponse.json({ error: 'Erreur serveur lors de la modification' }, { status: 500 })
    }
  }