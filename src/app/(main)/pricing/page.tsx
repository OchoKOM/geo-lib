'use client'

import { useTransition } from 'react'
import { Check, CreditCard, ShieldCheck, Zap, Loader2, CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/AuthProvider' // Assurez-vous que ce hook existe, sinon utilisez le contexte session
import { showToast } from '@/hooks/useToast'
import { subscribeUser } from '@/lib/pricing-actions'
import { PRICING_PLANS } from '@/lib/pricing-plans'
import { useRouter } from 'next/navigation'

// Composant pour une carte de prix individuelle
function PricingCard({ 
  planKey, 
  plan, 
  isCurrentPlan, 
  isPopular,
  onSubscribe,
  isPending 
}: { 
  planKey: string, 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: any, 
  isCurrentPlan: boolean, 
  isPopular?: boolean,
  onSubscribe: (key: string) => void,
  isPending: boolean
}) {
  return (
    <Card className={`relative flex flex-col ${isPopular ? 'border-emerald-500 border-2 shadow-lg scale-105 z-10' : 'border-slate-200 dark:border-slate-800'}`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
          Populaire
        </div>
      )}
      
      <CardHeader>
        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex justify-between items-center">
          {plan.name}
          {isCurrentPlan && <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Actif</Badge>}
        </CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1">
        <div className="mb-6">
          <span className="text-4xl font-extrabold text-slate-900 dark:text-white">${plan.price}</span>
          <span className="text-slate-500 dark:text-slate-400"> / période</span>
        </div>
        
        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Accès illimité aux ouvrages numériques</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Emprunt de livres physiques</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Durée de <strong>{plan.days} jours</strong></span>
          </li>
          {planKey === 'YEARLY' && (
             <li className="flex items-center gap-2">
             <Check className="w-4 h-4 text-emerald-500" />
             <span>Support prioritaire</span>
           </li>
          )}
        </ul>
      </CardContent>
      
      <CardFooter>
        <Button 
          className={`w-full ${isPopular ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
          variant={isPopular ? 'default' : 'outline'}
          onClick={() => onSubscribe(planKey)}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : isCurrentPlan ? (
            'Prolonger mon abonnement'
          ) : (
            'Choisir cette offre'
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function PricingPage() {
  const { user } = useAuth() // Récupère l'utilisateur et potentiellement son statut d'abonnement via le contexte
  const router = useRouter()
  const [isPending, startTransition] = useTransition()


  // Handler pour l'abonnement
  const handleSubscribe = (planKey: string) => {
    if (!user) {
      showToast("Veuillez vous connecter pour vous abonner.", "destructive")
      router.push('/login')
      return
    }

    startTransition(async () => {
      // @ts-expect-error Types stricts sur les clés
      const result = await subscribeUser(planKey)
      
      if (result.success) {
        showToast(result.message, "default")
        router.refresh()
      } else {
        showToast(result.message, "destructive")
      }
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto text-center mb-16 space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
          Accédez à tout le savoir de <span className="text-emerald-600">GeoLib</span>
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-slate-500 dark:text-slate-400">
          Choisissez le plan qui correspond à vos besoins académiques. Un abonnement unique pour débloquer les emprunts physiques et le téléchargement de ressources numériques.
        </p>
      </div>

      {/* BANNER AVANTAGES */}
      <div className="max-w-5xl mx-auto mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-4 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                    <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Accès Garanti</h3>
                <p className="text-sm text-slate-500 mt-2">Plus besoin d&apos;attendre. Réservez vos livres en priorité.</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
                    <Zap className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Instantané</h3>
                <p className="text-sm text-slate-500 mt-2">Activation immédiate après paiement. Téléchargez vos PDF sans délai.</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
                    <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Paiement Sécurisé</h3>
                <p className="text-sm text-slate-500 mt-2">Historique complet de vos paiements disponible dans votre dashboard.</p>
            </div>
        </div>
      </div>

      {/* GRILLE DES PRIX */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-8 items-start">
          
          <PricingCard 
            planKey="MONTHLY"
            plan={PRICING_PLANS.MONTHLY}
            isCurrentPlan={false} // Idéalement, comparer avec user.subscription.daysLeft
            onSubscribe={handleSubscribe}
            isPending={isPending}
          />

          <PricingCard 
            planKey="YEARLY"
            plan={PRICING_PLANS.YEARLY}
            isCurrentPlan={false}
            isPopular={true}
            onSubscribe={handleSubscribe}
            isPending={isPending}
          />

          <PricingCard 
            planKey="SEMESTER"
            plan={PRICING_PLANS.SEMESTER}
            isCurrentPlan={false}
            onSubscribe={handleSubscribe}
            isPending={isPending}
          />
        </div>
      </div>

      {/* FAQ SECTION */}
      <div className="max-w-3xl mx-auto mt-20 text-center">
         <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Questions Fréquentes</h2>
         <div className="space-y-6 text-left">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800">
                <h4 className="font-semibold flex items-center gap-2">
                    <CalendarClock className="w-5 h-5 text-slate-400" />
                    Puis-je changer de plan en cours de route ?
                </h4>
                <p className="text-slate-500 mt-2 text-sm">
                    Oui. Si vous souscrivez à un nouveau plan alors que le vôtre est encore actif, la durée du nouveau plan sera <strong>ajoutée</strong> à vos jours restants. Vous ne perdez rien.
                </p>
            </div>
            {/* Autres FAQs si nécessaire */}
         </div>
      </div>

    </div>
  )
}