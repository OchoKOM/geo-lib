'use client'

import { 
  Edit, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  CalendarClock, 
  Book, 
  User, 
  Printer, 
  Loader2 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardLoan, DashboardSubscription, UserRole } from '@/lib/types'
import { DeleteTarget } from '@/lib/dashboard-config'
import { cn } from '@/lib/utils'
import { pdf } from '@react-pdf/renderer'
import { LoanReceipt } from './LoanReceipt'
import { useState } from 'react'
import { showToast } from '@/hooks/useToast'

interface FinanceTableProps {
  data: DashboardLoan[] | DashboardSubscription[]
  activeTab: 'loans' | 'subscriptions'
  onEdit: (item: DashboardLoan | DashboardSubscription) => void
  onDelete: (item: DeleteTarget) => void
  isAuthorized: (role: UserRole) => boolean
}

export function FinanceTable({
  data,
  activeTab,
  onEdit,
  onDelete,
  isAuthorized
}: FinanceTableProps) {
  const [printingId, setPrintingId] = useState<string | null>(null)

  // Fonction de génération PDF à la volée
  const handlePrint = async (loan: DashboardLoan) => {
  try {
    setPrintingId(loan.id)

    // 1. Génération du PDF
    const blob = await pdf(<LoanReceipt loan={loan} />).toBlob()

    // 2. Création d’une URL temporaire
    const url = URL.createObjectURL(blob)

    // 3. Création d’un lien de téléchargement
    const link = document.createElement('a')
    link.href = url
    link.download = `recu_pret_${loan.id}.pdf`

    // 4. Déclenchement du téléchargement
    document.body.appendChild(link)
    link.click()

    // 5. Nettoyage
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Erreur génération PDF', error)
    showToast('Impossible de générer le reçu.')
  } finally {
    setPrintingId(null)
  }
}

  
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
        <p className="text-slate-500">Aucune donnée financière enregistrée.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="px-6 py-4 font-medium text-slate-500">Utilisateur</th>
            {activeTab === 'loans' ? (
              <>
                <th className="px-6 py-4 font-medium text-slate-500">Livre Emprunté</th>
                <th className="px-6 py-4 font-medium text-slate-500">Échéance</th>
                <th className="px-6 py-4 font-medium text-slate-500">Statut</th>
              </>
            ) : (
              <>
                <th className="px-6 py-4 font-medium text-slate-500">Période</th>
                <th className="px-6 py-4 font-medium text-slate-500">Jours Restants</th>
                <th className="px-6 py-4 font-medium text-slate-500">État</th>
              </>
            )}
            <th className="px-6 py-4 font-medium text-slate-500 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {activeTab === 'loans' ? (
            (data as DashboardLoan[]).map((loan) => (
              <tr key={loan.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                {/* COLONNE UTILISATEUR */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{loan.user?.username || 'Utilisateur inconnu'}</p>
                      <p className="text-xs text-slate-500">{loan.user?.email}</p>
                    </div>
                  </div>
                </td>

                {/* COLONNES SPÉCIFIQUES PRÊTS */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 max-w-[200px]">
                    <Book className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate" title={loan.book?.title}>{loan.book?.title || 'Livre supprimé'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col text-xs">
                    <span className="text-slate-500">Du: {new Date(loan.loanDate).toLocaleDateString()}</span>
                    <span className={cn("font-medium", new Date(loan.dueDate) < new Date() && !loan.returnDate ? "text-red-600" : "text-slate-700 dark:text-slate-300")}>
                      Au: {new Date(loan.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {loan.returnDate ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                      <CheckCircle className="w-3 h-3" /> Retourné
                    </Badge>
                  ) : new Date(loan.dueDate) < new Date() ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="w-3 h-3" /> En Retard
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 dark:bg-blue-900/30 dark:text-blue-300">
                      <CalendarClock className="w-3 h-3" /> En cours
                    </Badge>
                  )}
                </td>

                {/* ACTIONS */}
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 items-center">
                    {/* BOUTON IMPRESSION (Seulement pour les prêts) */}
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:border-blue-300"
                      title="Imprimer le reçu"
                      onClick={() => handlePrint(loan)}
                      disabled={printingId === loan.id}
                    >
                      {printingId === loan.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Printer className="w-4 h-4" />
                      )}
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => onEdit(loan)}
                    >
                      <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </Button>

                    {isAuthorized(UserRole.ADMIN) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        onClick={() => onDelete({ type: activeTab, id: loan.id })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          ) : (
            (data as DashboardSubscription[]).map((subscription) => (
              <tr key={subscription.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                {/* COLONNE UTILISATEUR */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{subscription.user?.username || 'Utilisateur inconnu'}</p>
                      <p className="text-xs text-slate-500">{subscription.user?.email}</p>
                    </div>
                  </div>
                </td>

                {/* COLONNES SPÉCIFIQUES ABONNEMENTS */}
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                  Du {new Date(subscription.startDate).toLocaleDateString()} au {new Date(subscription.endDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                   {(() => {
                      const daysLeft = Math.ceil((new Date(subscription.endDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                      if (!subscription.isActive) return <span className="text-slate-400">-</span>;
                      return (
                        <span className={cn("font-bold", daysLeft < 5 ? "text-red-600" : "text-emerald-600")}>
                          {daysLeft > 0 ? `${daysLeft} jours` : 'Expiré'}
                        </span>
                      )
                   })()}
                </td>
                <td className="px-6 py-4">
                  {subscription.isActive ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300">
                      Actif
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500">Inactif</Badge>
                  )}
                </td>

                {/* ACTIONS */}
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 items-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => onEdit(subscription)}
                    >
                      <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </Button>

                    {isAuthorized(UserRole.ADMIN) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        onClick={() => onDelete({ type: activeTab, id: subscription.id })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}