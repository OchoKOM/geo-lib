'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { PRICING_PLANS, PlanKey } from '@/lib/pricing-plans'

type SubscriptionType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SEMESTER' | 'YEARLY'

export type SubscribeResponse = {
  success: boolean
  message: string
  requestId?: string
  isUpdate?: boolean
}

/**
 * Action pour créer une demande d'abonnement.
 * Crée une SubscriptionRequest au lieu d'un abonnement direct.
 */
export async function hasActiveSubscription(): Promise<boolean> {
  const session = await getSession()
  const user = session?.user

  if (!user) return false

  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id }
  })

  if (!sub) return false

  return sub.isActive && new Date(sub.endDate) > new Date()
}

export async function subscribeUser(planKey: PlanKey, isUpdate: boolean = false): Promise<SubscribeResponse> {
  const session = await getSession()
  const user = session?.user

  if (!user) {
    return { success: false, message: "Vous devez être connecté pour faire une demande d'abonnement." }
  }

  const selectedPlan = PRICING_PLANS[planKey]
  if (!selectedPlan) {
    return { success: false, message: "Plan invalide." }
  }

  try {
    // Vérifier s'il y a déjà une demande en attente
    const existingRequest = await prisma.subscriptionRequest.findUnique({
      where: { userId: user.id }
    })

    if (existingRequest) {
      return { success: false, message: "Vous avez déjà une demande d'abonnement en cours." }
    }

    // Créer la demande d'abonnement
    const request = await prisma.subscriptionRequest.create({
      data: {
        userId: user.id,
        type: planKey as SubscriptionType,
        isUpdate: isUpdate,
      }
    })

    revalidatePath('/pricing')
    revalidatePath('/dashboard')

    const message = isUpdate
      ? `Votre demande de mise à jour d'abonnement au plan ${selectedPlan.name} a été enregistrée. Vous recevrez un email de confirmation avec le reçu PDF.`
      : `Votre demande d'abonnement au plan ${selectedPlan.name} a été enregistrée. Vous recevrez un email de confirmation avec le reçu PDF.`

    return {
      success: true,
      message: message,
      requestId: request.id,
      isUpdate: isUpdate
    }

  } catch (error) {
    console.error("Erreur lors de la création de la demande:", error)
    return { success: false, message: "Une erreur est survenue lors du traitement de votre demande." }
  }
}
