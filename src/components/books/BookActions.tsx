'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, BookOpen, CheckCircle2, Download, Lock, Loader2 } from 'lucide-react'
import { showToast } from '@/hooks/useToast'
import { checkDownloadAccess, submitLoanRequest } from '@/lib/public-actions'
import { useRouter } from 'next/navigation'

interface BookActionsProps {
  bookId: string
  isAvailable: boolean
  hasDigitalFile: boolean
  user: {
    id: string
    hasActiveSubscription: boolean
  } | null
  existingRequestStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null
}

export function BookActions({ 
  bookId, 
  isAvailable, 
  hasDigitalFile, 
  user,
  existingRequestStatus
}: BookActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [downloading, setDownloading] = useState(false)
  const router = useRouter()

  // --- Gestion du Téléchargement ---
  const handleDownload = async () => {
    if (!user) return router.push('/login')
    
    setDownloading(true)
    try {
      const result = await checkDownloadAccess(bookId)
      if (result.success && result.data?.url) {
        showToast("Téléchargement lancé", "default")
        const name = result.data.name || 'document.pdf'
        const url = result.data.url
        const link = document.createElement('a')
        link.href = url
        link.download = name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        showToast(result.message, "destructive")
      }
    } catch {
      showToast("Erreur lors du téléchargement", "destructive")
    } finally {
      setDownloading(false)
    }
  }

  // --- Gestion de la Demande de Prêt ---
  const handleLoanRequest = () => {
    if (!user) return router.push('/login')

    startTransition(async () => {
      const result = await submitLoanRequest(bookId)
      if (result.success) {
        showToast("Demande envoyée !", "default")
      } else {
        showToast(result.message, "destructive")
      }
    })
  }

  // --- Rendu conditionnel des états ---

  if (!user) {
    return (
      <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5 text-slate-400" />
            Accès restreint
          </CardTitle>
          <CardDescription>
            Connectez-vous pour accéder aux fonctionnalités d&apos;emprunt et de lecture.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full" onClick={() => router.push('/login')}>
            Se connecter
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (!user.hasActiveSubscription) {
    return (
        <div className="bg-background rounded-xl">
        <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
            <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <AlertCircle className="w-5 h-5" />
                Abonnement Requis
            </CardTitle>
            <CardDescription className="text-orange-600/80 dark:text-orange-400/80">
                Votre abonnement est inactif ou expiré. Veuillez le renouveler pour emprunter ou télécharger.
            </CardDescription>
            </CardHeader>
            <CardFooter>
            <Button variant="outline" className="w-full border-orange-300 text-orange-700 hover:bg-orange-100" onClick={() => router.push('/subscription')}>
                Voir les offres
            </Button>
            </CardFooter>
        </Card>
        </div>
    )
  }

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader>
        <CardTitle>Options disponibles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* OPTION 1: EMPRUNT PHYSIQUE */}
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Exemplaire physique</span>
            {isAvailable ? (
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Disponible</Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Indisponible</Badge>
            )}
          </div>
          
          {existingRequestStatus === 'PENDING' ? (
            <div className="p-3 bg-blue-50 text-blue-700 rounded-md text-sm flex items-start gap-2 border border-blue-100">
              <Loader2 className="w-4 h-4 mt-0.5 animate-spin shrink-0" />
              <span>Votre demande est en cours de validation par un bibliothécaire.</span>
            </div>
          ) : existingRequestStatus === 'APPROVED' ? (
             <div className="p-3 bg-emerald-50 text-emerald-700 rounded-md text-sm flex items-start gap-2 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Demande validée ! Venez récupérer votre livre.</span>
            </div>
          ) : (
            <Button 
              className="w-full bg-slate-900 dark:bg-slate-100 text-background hover:bg-slate-800 dark:hover:bg-slate-200" 
              onClick={handleLoanRequest}
              disabled={!isAvailable || isPending}
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <BookOpen className="w-4 h-4 mr-2" />
              Demander un prêt
            </Button>
          )}
          <p className="text-xs text-slate-500 mt-1">
            Le prêt doit être validé par l&apos;administration avant retrait.
          </p>
        </div>

        <div className="h-px bg-slate-100 dark:bg-slate-800 my-4" />

        {/* OPTION 2: TÉLÉCHARGEMENT */}
        <div className="space-y-2">
           <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Version Numérique</span>
           {hasDigitalFile ? (
             <Button 
                variant="secondary" 
                className="w-full" 
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Télécharger le PDF
             </Button>
           ) : (
             <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md text-sm text-slate-500 text-center italic border border-slate-100 dark:border-slate-800">
               Aucune version numérique disponible pour cet ouvrage.
             </div>
           )}
        </div>

      </CardContent>
    </Card>
  )
}