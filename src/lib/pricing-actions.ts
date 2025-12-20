'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { PRICING_PLANS, PlanKey } from '@/lib/pricing-plans'

export type SubscribeResponse = {
  success: boolean
  message: string
}

/**
 * Action pour souscrire à un plan.
 * Simule un paiement et met à jour la base de données de manière atomique.
 */
export async function subscribeUser(planKey: PlanKey): Promise<SubscribeResponse> {
  const session = await getSession()
  const user = session?.user

  if (!user) {
    return { success: false, message: "Vous devez être connecté pour vous abonner." }
  }

  const selectedPlan = PRICING_PLANS[planKey]
  if (!selectedPlan) {
    return { success: false, message: "Plan invalide." }
  }

  try {
    // On utilise une transaction pour s'assurer que le paiement ET l'abonnement sont créés ensemble
    await prisma.$transaction(async (tx) => {
      
      // 1. Récupérer l'abonnement existant (s'il y en a un)
      const existingSub = await tx.subscription.findUnique({
        where: { userId: user.id }
      })

      // 2. Calculer les nouvelles dates
      const now = new Date()
      let newStartDate = now
      let newEndDate = new Date()

      if (existingSub && existingSub.isActive && existingSub.endDate > now) {
        // Si l'utilisateur est déjà actif, on prolonge à partir de la fin actuelle
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        newStartDate = existingSub.endDate // Juste pour info, le start date ne change pas vraiment logiquement si on prolonge
        newEndDate = new Date(existingSub.endDate)
        newEndDate.setDate(newEndDate.getDate() + selectedPlan.days)
      } else {
        // Sinon, on démarre maintenant
        newEndDate.setDate(now.getDate() + selectedPlan.days)
      }

      // 3. Créer ou Mettre à jour l'abonnement
      if (existingSub) {
        await tx.subscription.update({
          where: { userId: user.id },
          data: {
            isActive: true,
            endDate: newEndDate
            // On garde la startDate originale ou on la met à jour selon la logique métier souhaitée
          }
        })
      } else {
        await tx.subscription.create({
          data: {
            userId: user.id,
            startDate: now,
            endDate: newEndDate,
            isActive: true
          }
        })
      }

      // 4. Enregistrer le paiement (Historique)
      // Note: Le schéma Payment n'a pas de lien direct vers Subscription,
      // on utilise donc 'reason' pour stocker le contexte.
      await tx.payment.create({
        data: {
          userId: user.id,
          amount: selectedPlan.price,
          reason: `Abonnement ${selectedPlan.name} (${selectedPlan.days} jours)`,
          paymentDate: new Date(),
          // loanId reste null car ce n'est pas lié à un prêt
        }
      })
    })

    revalidatePath('/pricing')
    revalidatePath('/dashboard') // Mettre à jour le dashboard utilisateur aussi
    
    return { success: true, message: `Félicitations ! Vous êtes abonné au plan ${selectedPlan.name}.` }

  } catch (error) {
    console.error("Erreur d'abonnement:", error)
    return { success: false, message: "Une erreur est survenue lors du traitement de l'abonnement." }
  }
}