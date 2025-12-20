'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// --- TYPES ---
export type BookDetails = {
  id: string
  title: string
  description: string
  type: string
  postedAt: Date
  available: boolean
  author: {
    user: { name: string; username: string }
    biography: string | null
  } | null
  department: {
    name: string
    faculty: { name: string } | null
  } | null
  coverImage: { url: string } | null
  documentFileId: string | null
  studyAreas: { studyArea: { name: string } }[]
}

export type ActionResponse<T = null> = {
  success: boolean
  message: string
  data?: T
}

// 1. Récupération des données publiques du livre
export async function getPublicBookDetails(bookId: string): Promise<BookDetails | null> {
  try {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        author: {
          include: {
            user: { select: { name: true, username: true } }
          }
        },
        department: {
          include: { faculty: { select: { name: true } } }
        },
        coverImage: { select: { url: true } },
        studyAreas: {
          include: { studyArea: { select: { name: true } } }
        }
      }
    })

    if (!book) return null

    return book as unknown as BookDetails
  } catch (error) {
    console.error('Erreur chargement livre:', error)
    return null
  }
}

// 2. Vérification d'abonnement et accès au fichier
export async function checkDownloadAccess(bookId: string): Promise<ActionResponse<{ url: string; name: string }>> {
  const { user } = await getSession()

  if (!user) {
    return { success: false, message: "Vous devez être connecté pour télécharger ce document." }
  }

  // Vérifier l'abonnement
  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id }
  })

  if (!sub || !sub.isActive || new Date(sub.endDate) < new Date()) {
    return { 
      success: false, 
      message: "Un abonnement actif est requis pour accéder aux fichiers numériques." 
    }
  }

  // Récupérer l'URL du fichier
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { documentFile: true }
  })

  if (!book || !book.documentFile) {
    return { success: false, message: "Aucun fichier numérique associé à cet ouvrage." }
  }

  // Dans un cas réel, générer ici une URL signée (AWS S3 presigned URL) temporaire
  // Pour l'instant, on renvoie l'URL stockée
  return { 
    success: true, 
    message: "Téléchargement autorisé.",
    data: { url: book.documentFile.url, name: book.documentFile.name }
  }
}

// 3. Traitement de la demande de prêt
export async function submitLoanRequest(bookId: string): Promise<ActionResponse> {
  const { user } = await getSession()

  if (!user) {
    return { success: false, message: "Connexion requise pour emprunter." }
  }

  // 1. Vérification Abonnement
  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id }
  })

  if (!sub || !sub.isActive || new Date(sub.endDate) < new Date()) {
    return { success: false, message: "Abonnement requis pour effectuer un emprunt." }
  }

  // 2. Vérification Disponibilité Livre
  const book = await prisma.book.findUnique({ where: { id: bookId } })
  if (!book?.available) {
    return { success: false, message: "Cet ouvrage n'est pas disponible actuellement." }
  }

  // 3. Vérification s'il a déjà le livre (Prêt actif)
  const activeLoan = await prisma.loan.findFirst({
    where: { userId: user.id, bookId: bookId, returnDate: null }
  })
  if (activeLoan) {
    return { success: false, message: "Vous avez déjà cet ouvrage en votre possession." }
  }

  // 4. Vérification s'il a déjà une demande en attente
  const existingRequest = await prisma.loanRequest.findUnique({
    where: {
      userId_bookId: { userId: user.id, bookId: bookId }
    }
  })

  if (existingRequest) {
    if (existingRequest.status === 'PENDING') {
      return { success: false, message: "Vous avez déjà une demande en attente pour ce livre." }
    }
    // Si rejetée précédemment, on peut potentiellement laisser refaire une demande, 
    // ou bloquer. Ici on supprime l'ancienne pour en refaire une.
    await prisma.loanRequest.delete({ where: { id: existingRequest.id } })
  }

  // 5. Création de la demande
  try {
    await prisma.loanRequest.create({
      data: {
        userId: user.id,
        bookId: bookId,
        status: 'PENDING'
      }
    })
    
    revalidatePath(`/books/${bookId}`)
    return { 
      success: true, 
      message: "Votre demande a été transmise. Vous serez notifié une fois validée par un bibliothécaire." 
    }
  } catch (error) {
    console.error("Erreur demande prêt:", error)
    return { success: false, message: "Erreur lors de l'enregistrement de la demande." }
  }
}