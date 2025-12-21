// Définition des plans disponibles en dur (ou via une config)
export const PRICING_PLANS = {
  DAILY: {
    id: 'plan_daily',
    name: 'Journalier',
    price: 1,
    days: 1,
    description: 'Accès pour une journée'
  },
  WEEKLY: {
    id: 'plan_weekly',
    name: 'Hebdomadaire',
    price: 5,
    days: 7,
    description: 'Accès complet pour 7 jours'
  },
  MONTHLY: {
    id: 'plan_monthly',
    name: 'Mensuel',
    price: 10,
    days: 30,
    description: 'Accès complet pour 30 jours'
  },
  SEMESTER: {
    id: 'plan_semester',
    name: 'Semestriel',
    price: 50,
    days: 180,
    description: 'Économisez sur 6 mois'
  },
  YEARLY: {
    id: 'plan_yearly',
    name: 'Annuel',
    price: 90,
    days: 365,
    description: 'La meilleure offre pour toute l\'année'
  }
}

export type PlanKey = keyof typeof PRICING_PLANS
