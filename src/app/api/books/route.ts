import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET: Recherche de livres (Texte + Spatial)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q"); // Recherche texte

    // Paramètres spatiaux
    const minLat = searchParams.get("minLat");
    const maxLat = searchParams.get("maxLat");
    const minLng = searchParams.get("minLng");
    const maxLng = searchParams.get("maxLng");

    const hasSpatial = minLat && maxLat && minLng && maxLng;

    let books;

    // SCÉNARIO 1 : Recherche SPATIALE (avec ou sans texte)
    if (hasSpatial) {
      const nMinLat = parseFloat(minLat);
      const nMaxLat = parseFloat(maxLat);
      const nMinLng = parseFloat(minLng);
      const nMaxLng = parseFloat(maxLng);

      // 1. Trouver les IDs des zones qui intersectent la bounding box
      const areaIdsRaw = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "StudyArea" 
        WHERE ST_Intersects(
            geometry, 
            ST_MakeEnvelope(${nMinLng}, ${nMinLat}, ${nMaxLng}, ${nMaxLat}, 4326)
        )
      `;

      const areaIds = areaIdsRaw.map((a) => a.id);

      if (areaIds.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      // 2. Trouver les livres liés à ces zones
      books = await prisma.book.findMany({
        where: {
          AND: [
            {
              studyAreas: {
                some: {
                  studyAreaId: { in: areaIds },
                },
              },
            },
            q
              ? {
                  OR: [
                    { title: { contains: q, mode: "insensitive" } },
                    { description: { contains: q, mode: "insensitive" } },
                  ],
                }
              : {},
          ],
        },
        include: {
          author: { select: { id: true, user: { select: { name: true } } } },
          academicYear: { select: { year: true } },
          department: { select: { name: true } },
          documentFile: true,
          studyAreas: {
            include: {
              studyArea: {
                select: { id: true, name: true, geometryType: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    } else {
      // SCÉNARIO 2 : Recherche TEXTUELLE SIMPLE
      books = await prisma.book.findMany({
        where: q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                // Recherche aussi par nom d'auteur
                {
                   author: {
                     user: {
                       name: { contains: q, mode: "insensitive" }
                     }
                   }
                }
              ],
            }
          : {},
        include: {
          author: { select: { id: true, user: { select: { name: true } } } },
          academicYear: { select: { year: true } },
          department: { select: { name: true } },
          documentFile: true,
          studyAreas: {
            include: {
              studyArea: {
                select: { id: true, name: true, geometryType: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    }

    // Mapping pour aplatir le nom de l'auteur si nécessaire pour le frontend
    const formattedBooks = books.map((b) => ({
      ...b,
      author: b.author ? { name: b.author.user.name, id: b.author.id } : null,
    }));

    return NextResponse.json({ success: true, data: formattedBooks });
  } catch (error) {
    console.error("Erreur recherche livres:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user)
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { authorProfile: true } // On inclut le profil pour vérifier
    });
    
    if (!user || !["ADMIN", "LIBRARIAN", "AUTHOR"].includes(user.role)) {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      type,
      studyAreaId,
      fileUrl,
      fileName,
      fileSize,
      authorId // NOUVEAU : ID de l'auteur sélectionné
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Le titre est requis" },
        { status: 400 }
      );
    }

    // Détermination de l'auteur final
    let finalAuthorId = authorId;

    // Si pas d'auteur sélectionné mais que l'utilisateur est lui-même un auteur, on l'assigne par défaut
    if (!finalAuthorId && user.role === 'AUTHOR' && user.authorProfile) {
        finalAuthorId = user.authorProfile.id;
    }

    // Construction de l'objet de données Prisma
    const bookData: any = {
      title,
      description: description || "",
      type,
      authorId: finalAuthorId || null, // Liaison explicite
    };

    // 1. Gestion Conditionnelle de la Zone d'Étude
    if (studyAreaId) {
      bookData.studyAreas = {
        create: {
          studyAreaId: studyAreaId,
        },
      };
    }

    // 2. Gestion du Fichier
    if (fileUrl) {
      const newFile = await prisma.file.create({
        data: {
          url: fileUrl,
          name: fileName || "Document.pdf",
          mimeType: "application/pdf",
          size: fileSize || 0,
          type: "DOCUMENT_PDF",
        },
      });
      bookData.documentFileId = newFile.id;
    }

    const book = await prisma.book.create({
      data: bookData,
      include: {
        studyAreas: true,
        documentFile: true,
      },
    });

    return NextResponse.json({ success: true, book });
  } catch (error) {
    console.error("Erreur création livre:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT: Modification d'un livre
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user)
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user || !["ADMIN", "LIBRARIAN", "AUTHOR"].includes(user.role)) {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      title,
      description,
      type,
      newStudyAreaId,
      fileUrl,
      fileName,
      fileSize,
      authorId // NOUVEAU : Possibilité de changer l'auteur
    } = body;

    if (!id)
      return NextResponse.json(
        { error: "ID du livre requis" },
        { status: 400 }
      );

    const updateData: any = {
      title,
      description,
      type,
      updatedAt: new Date(),
    };

    // Mise à jour de l'auteur si fourni (Admin/Librarian seulement idéalement, mais ici ouvert aux rôles autorisés)
    if (authorId) {
        updateData.authorId = authorId;
    }

    // Gestion de l'ajout d'une zone d'étude
    if (newStudyAreaId) {
      const areaExists = await prisma.studyArea.findUnique({
        where: { id: newStudyAreaId },
      });
      if (!areaExists) {
        return NextResponse.json(
          { error: "Code de zone introuvable" },
          { status: 404 }
        );
      }

      await prisma.bookStudyArea.deleteMany({
        where: {
          bookId: id,
          studyAreaId: newStudyAreaId,
        },
      });

      updateData.studyAreas = {
        create: {
          studyAreaId: newStudyAreaId,
        },
      };
    }

    // Gestion du fichier
    if (fileUrl) {
      const newFile = await prisma.file.create({
        data: {
          url: fileUrl,
          name: fileName || "Document.pdf",
          mimeType: "application/pdf",
          size: fileSize || 0,
          type: "DOCUMENT_PDF",
        },
      });
      updateData.documentFileId = newFile.id;
    }

    const updatedBook = await prisma.book.update({
      where: { id },
      data: updateData,
      include: {
        studyAreas: { include: { studyArea: true } },
        documentFile: true,
      },
    });

    return NextResponse.json({ success: true, book: updatedBook });
  } catch (error) {
    console.error("Erreur modification livre:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la modification" },
      { status: 500 }
    );
  }
}

// DELETE reste inchangé...
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user)
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user || !["ADMIN", "LIBRARIAN"].includes(user.role)) {
      return NextResponse.json(
        {
          error:
            "Interdit : Seuls les administrateurs et bibliothécaires peuvent supprimer des documents.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID du livre requis pour la suppression" },
        { status: 400 }
      );
    }

    const bookToDelete = await prisma.book.findUnique({
      where: { id },
      select: { documentFileId: true },
    });

    if (!bookToDelete) {
      return NextResponse.json({ error: "Livre non trouvé" }, { status: 404 });
    }

    await prisma.book.delete({
      where: { id },
    });

    if (bookToDelete.documentFileId) {
      await prisma.file.delete({
        where: { id: bookToDelete.documentFileId },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Livre supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur suppression livre:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la suppression" },
      { status: 500 }
    );
  }
}