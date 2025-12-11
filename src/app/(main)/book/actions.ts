'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { UserRole, BookType } from '@prisma/client'
import { z } from 'zod'

// Schéma de validation pour la mise à jour d'un livre
const BookSchema = z.object({
  bookId: z.string().cuid('ID de livre invalide'),
  title: z.string().min(3, "Le titre est trop court."),
  description: z.string().min(20, "La description est trop courte.").nullable(),
  type: z.nativeEnum(BookType, { message: "Type de document invalide." }),
  coverImageId: z.string().optional().nullable(),
  documentFileId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  academicYearId: z.string().optional().nullable(),
})

export type BookFormState = {
  success?: boolean
  message?: string
  errors?: {
    [K in keyof z.infer<typeof BookSchema>]?: string[]
  }
}

/**
 * Met à jour un ouvrage (Book) et ses relations.
 * Seuls les Auteurs de l'ouvrage, les Bibliothécaires et les Admins sont autorisés.
 */
export async function updateBook(
  prevState: BookFormState,
  formData: FormData
): Promise<BookFormState> {
  const { user } = await getSession()

  if (!user) {
    return { success: false, message: "Non authentifié" }
  }

  // Extraction des données du formulaire
  const rawData = {
    bookId: formData.get('bookId') as string,
    title: formData.get('title') as string,
    description: (formData.get('description')) as string || null,
    type: formData.get('type') as BookType,
    coverImageId: (formData.get('coverImageId')) as string || null,
    documentFileId: formData.get('documentFileId') as string || null,
    departmentId: formData.get('departmentId') as string || null,
    academicYearId: formData.get('academicYearId') as string || null,
  }
  const validatedFields = BookSchema.safeParse(rawData)

  if (!validatedFields.success) {
    const message = Object.values(validatedFields.error.flatten().fieldErrors).flat().join(' ')
      
    return {
      success: false,
      message: message || "Erreur de validation des champs du livre",
      errors: validatedFields.error.flatten().fieldErrors
    }
  }

  const data = validatedFields.data

  try {
    // 1. Vérification des droits (L'utilisateur doit être l'auteur, un bibliothécaire ou un admin)
    const existingBook = await prisma.book.findUnique({
      where: { id: data.bookId },
      select: { authorId: true }
    })

    if (!existingBook) {
        return { success: false, message: "Livre non trouvé." }
    }

    const isAuthorized = user.role === UserRole.ADMIN || 
                         user.role === UserRole.LIBRARIAN || 
                         (existingBook.authorId && existingBook.authorId === user.id)

    if (!isAuthorized) {
        return { success: false, message: "Accès refusé. Vous n'êtes pas autorisé à modifier cet ouvrage." }
    }


    // 2. Mise à jour transactionnelle du livre
    await prisma.$transaction(async (tx) => {
      await tx.book.update({
        where: { id: data.bookId },
        data: {
          title: data.title,
          description: data.description || "",
          type: data.type,
          
          // Mise à jour de la relation Cover Image (File)
          coverImage: data.coverImageId 
            ? { connect: { id: data.coverImageId } } 
            : { disconnect: true }, // IMPORTANT: Déconnecte si l'ID est null

          // Mise à jour de la relation Document (File)
          documentFile: data.documentFileId 
            ? { connect: { id: data.documentFileId } } 
            : { disconnect: true }, 

          // Mise à jour des relations simples
          department: data.departmentId 
            ? { connect: { id: data.departmentId } } 
            : { disconnect: true },
          
          academicYear: data.academicYearId 
            ? { connect: { id: data.academicYearId } } 
            : { disconnect: true },
        }
      })
    })

    revalidatePath(`/book/${data.bookId}`)
    return { success: true, message: "Ouvrage mis à jour avec succès !" }

  } catch (error) {
    console.error("Erreur update book:", error)
    return { success: false, message: "Une erreur serveur est survenue." }
  }
}

/**
 * Fonction de chargement des données
 * @param bookId L'ID du livre à charger
 * @returns Le livre avec toutes ses relations
 */
export async function getBookData(bookId: string) {
    // Vérification de l'authentification (optionnelle pour la lecture, obligatoire pour l'édition)
    const { user } = await getSession();

    if (!bookId) {
      return null;
    }

    if (!user) {
        // En mode lecture, on peut renvoyer les données publiques sans erreur
        // En mode édition, vous pourriez vouloir rejeter ici, mais la page client gère ça.
    }
    
    
    try {
        const book = await prisma.book.findUnique({
            where: { id: bookId },
            include: {
                author: {
                    include: { user: { select: { name: true, username: true, id: true } } }
                },
                coverImage: true, // Inclut l'objet File pour l'URL de couverture
                documentFile: true, // Inclut l'objet File pour l'URL du document
                department: true,
                academicYear: true,
                studyAreas: {
                    include: {
                        studyArea: true
                    }
                }
            }
        });

        if (!book) {
            return null;
        }

        // On vérifie si l'utilisateur est autorisé à *éditer*
        const isEditable = user?.role === UserRole.ADMIN || 
                           user?.role === UserRole.LIBRARIAN || 
                           (book.authorId && book.authorId === user?.id);

        return {
            ...book,
            isEditable: isEditable,
        };

    } catch (error) {
        console.error("Erreur chargement livre:", error);
        return null;
    }
}

// Fonction utilitaire pour charger les listes de sélection (à adapter à vos besoins réels)
export async function getSelectOptions() {
    // Charger seulement ce qui est nécessaire pour l'édition
    const departments = await prisma.department.findMany({ select: { id: true, name: true } });
    const academicYears = await prisma.academicYear.findMany({ select: { id: true, year: true }, orderBy: { year: 'desc' } });
    
    return { departments, academicYears };
}