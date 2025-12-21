'use client'

import {
  AlertTriangle,
  CheckCircle,
  CalendarClock,
  Book,
  User,
  Printer,
  Loader2,
  Eye,
  MoreVertical,
  Settings2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  DashboardLoan,
  DashboardLoanRequest,
  DashboardSubscription,
  DashboardSubscriptionRequest,
  UserRole,
  FinanceEntityType,
  FinanceEntityData
} from '@/lib/types'
import { DeleteTarget } from '@/lib/dashboard-config'
import { cn } from '@/lib/utils'
import { pdf } from '@react-pdf/renderer'
import { LoanReceipt } from './LoanReceipt'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { showToast } from '@/hooks/useToast'
import {
  approveLoanRequest,
  rejectLoanRequest,
  approveSubscriptionRequest,
  rejectSubscriptionRequest,
  suspendSubscription,
  activateSubscription
} from '@/app/(main)/dashboard/actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'

interface FinanceTableProps {
  data: FinanceEntityData[]
  activeTab: FinanceEntityType
  onEdit: (item: FinanceEntityData) => void
  onDelete: (item: DeleteTarget) => void
  isAuthorized: (role: UserRole) => boolean
  isLoading?: boolean
  onMarkReturned?: (loan: DashboardLoan) => void
  onRefresh: () => void
}

export function FinanceTable ({
  data,
  activeTab,
  onEdit,
  onDelete,
  isAuthorized,
  isLoading,
  onMarkReturned,
  onRefresh
}: FinanceTableProps) {
  const [printingId, setPrintingId] = useState<string | null>(null)

  // États pour la gestion de la suppression (Dialogue contrôlé)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<DeleteTarget | null>(null)

  // États pour les dialogues de confirmation d'approbation et de rejet
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [markReturnedDialogOpen, setMarkReturnedDialogOpen] = useState(false)
  const [itemToApprove, setItemToApprove] = useState<string | null>(null)
  const [itemToReject, setItemToReject] = useState<string | null>(null)
  const [loanToMark, setLoanToMark] = useState<DashboardLoan | null>(null)

  // États pour le dialogue d'action d'abonnement
  const [subscriptionActionDialogOpen, setSubscriptionActionDialogOpen] =
    useState(false)
  const [selectedSubscription, setSelectedSubscription] =
    useState<DashboardSubscription | null>(null)
  const [actionType, setActionType] = useState<'suspend' | 'activate' | null>(
    null
  )
  const [actionReason, setActionReason] = useState('')
  const [actionEndDate, setActionEndDate] = useState('')
  const [actionResumption, setActionResumption] = useState(false)

  // États pour le dialogue de détails d'abonnement
  const [subscriptionDetailsDialogOpen, setSubscriptionDetailsDialogOpen] =
    useState(false)
  const [selectedSubscriptionForDetails, setSelectedSubscriptionForDetails] =
    useState<DashboardSubscription | null>(null)

  // Ouvre le dialogue de détails d'abonnement
  const triggerSubscriptionDetails = (sub: DashboardSubscription) => {
    setSelectedSubscriptionForDetails(sub)
    setSubscriptionDetailsDialogOpen(true)
  }

  const handlePrint = async (loan: DashboardLoan) => {
    try {
      setPrintingId(loan.id)
      const blob = await pdf(<LoanReceipt loan={loan} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `recu_pret_${loan.id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur génération PDF', error)
      showToast('Impossible de générer le reçu.')
    } finally {
      setPrintingId(null)
    }
  }


  // Exécute la suppression et ferme le dialogue
  function confirmDelete () {
    if (itemToDelete) {
      onDelete(itemToDelete)
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    }
  }

  // Ouvre le dialogue de confirmation d'approbation
  const triggerApproveConfirm = (id: string) => {
    setItemToApprove(id)
    setApproveDialogOpen(true)
  }

  // Ouvre le dialogue de confirmation de rejet
  const triggerRejectConfirm = (id: string) => {
    setItemToReject(id)
    setRejectDialogOpen(true)
  }

  // Ouvre le dialogue de confirmation de marquage retourné
  const triggerMarkReturnedConfirm = (loan: DashboardLoan) => {
    setLoanToMark(loan)
    setMarkReturnedDialogOpen(true)
  }

  // Exécute l'approbation et ferme le dialogue
  function confirmApprove () {
    if (itemToApprove) {
      const item = data.find(d => d.id === itemToApprove)
      if (item && 'book' in item) {
        // It's a loan request
        handleApprove(itemToApprove, 'loan')
      } else if (item) {
        // It's a subscription request
        handleApprove(itemToApprove, 'subscription')
      }
      setApproveDialogOpen(false)
      setItemToApprove(null)
    }
  }

  // Exécute le rejet et ferme le dialogue
  function confirmReject () {
    if (itemToReject) {
      const item = data.find(d => d.id === itemToReject)
      if (item && 'book' in item) {
        // It's a loan request
        handleReject(itemToReject, 'loan')
      } else if (item) {
        // It's a subscription request
        handleReject(itemToReject, 'subscription')
      }
      setRejectDialogOpen(false)
      setItemToReject(null)
    }
  }

  // Exécute le marquage retourné et ferme le dialogue
  function confirmMarkReturned () {
    if (loanToMark && onMarkReturned) {
      onMarkReturned(loanToMark)
      setMarkReturnedDialogOpen(false)
      setLoanToMark(null)
    }
  }

  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleApprove = async (id: string, type: 'loan' | 'subscription') => {
    setProcessingId(id)
    const res =
      type === 'loan'
        ? await approveLoanRequest(id)
        : await approveSubscriptionRequest(id)
    if (res.success) {
      showToast('Demande approuvée', 'success')
      onRefresh()
    } else {
      showToast(
        res.message || "Erreur lors de l'approbation de la demande",
        res.message ? 'warning' : 'destructive'
      )
    }
    setProcessingId(null)
  }

  const handleReject = async (id: string, type: 'loan' | 'subscription') => {
    setProcessingId(id)
    const res =
      type === 'loan'
        ? await rejectLoanRequest(id)
        : await rejectSubscriptionRequest(id)
    if (res.success) {
      showToast('Demande rejetée')
      onRefresh()
    }
    setProcessingId(null)
  }

  // Ouvre le dialogue d'action d'abonnement
  const triggerSubscriptionAction = (
    sub: DashboardSubscription,
    action: 'suspend' | 'activate'
  ) => {
    setSelectedSubscription(sub)
    setActionType(action)
    setActionReason('')
    setActionEndDate('')
    setActionResumption(false)
    setSubscriptionActionDialogOpen(true)
  }

  // Confirme l'action d'abonnement et ferme le dialogue
  const confirmSubscriptionAction = async () => {
    if (!selectedSubscription || !actionType) return

    setProcessingId(selectedSubscription.id)
    const data = {
      type: actionType,
      resumption: actionResumption,
      endDate: actionEndDate
    }
    const res =
      actionType === 'suspend'
        ? await suspendSubscription(selectedSubscription.id, data)
        : await activateSubscription(selectedSubscription.id, data)
    if (res.success) {
      showToast(
        actionType === 'suspend' ? 'Abonnement suspendu' : 'Abonnement activé',
        'success'
      )
      setSubscriptionActionDialogOpen(false)
      setSelectedSubscription(null)
      setActionType(null)
      setActionReason('')
      setActionEndDate('')
      setActionResumption(false)
      onRefresh()
    } else {
      console.log(res)

      showToast("Erreur lors de la mise à jour de l'abonnement", 'destructive')
    }
    setProcessingId(null)
  }

  if (isLoading && !data.length) {
    return (
      <div className='flex flex-col items-center justify-center h-64 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700'>
        <Loader2 className='w-6 h-6 text-slate-500 animate-spin' />
        <span className='mt-2'>Chargement...</span>
      </div>
    )
  }

  if (!data.length && !isLoading) {
    return (
      <div className='flex flex-col items-center justify-center h-64 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700'>
        <p className='text-slate-500'>Aucune donnée financière enregistrée.</p>
      </div>
    )
  }

  return (
    <div className='relative bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm'>
      <table className='w-full text-sm text-left'>
        <thead className='bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800'>
          <tr>
            <th className='px-6 py-4 font-medium text-slate-500'>
              Utilisateur
            </th>
            {activeTab === 'history' && (
              <th className='px-6 py-4 font-medium text-slate-500'>Type</th>
            )}
            {(activeTab === 'loans' || activeTab === 'history') && (
              <>
                <th className='px-6 py-4 font-medium text-slate-500'>
                  Livre Emprunté
                </th>
                <th className='px-6 py-4 font-medium text-slate-500'>
                  Échéance
                </th>
                <th className='px-6 py-4 font-medium text-slate-500'>Statut</th>
              </>
            )}
            {activeTab === 'subscriptions' && (
              <>
                <th className='px-6 py-4 font-medium text-slate-500'>
                  Période
                </th>
                <th className='px-6 py-4 font-medium text-slate-500'>
                  Jours Restants
                </th>
                <th className='px-6 py-4 font-medium text-slate-500'>État</th>
              </>
            )}
            {activeTab === 'payments' && (
              <>
                <th className='px-6 py-4 font-medium text-slate-500'>
                  Montant
                </th>
                <th className='px-6 py-4 font-medium text-slate-500'>Date</th>
              </>
            )}
            {activeTab === 'requests' && (
              <>
                <th className='px-6 py-4 font-medium text-slate-500'>Type</th>
                <th className='px-6 py-4 font-medium text-slate-500'>
                  Type de Demande
                </th>
                <th className='px-6 py-4 font-medium text-slate-500'>
                  Détails
                </th>
                <th className='px-6 py-4 font-medium text-slate-500'>Statut</th>
              </>
            )}
            <th className='px-6 py-4 font-medium text-slate-500 text-right'>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className='divide-y divide-slate-100 dark:divide-slate-800'>
          {activeTab === 'history' &&
            data.map(item => {
              if ('loanDate' in item) {
                // It's a loan
                const loan = item as DashboardLoan
                return (
                  <tr
                    key={loan.id}
                    className='group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors'
                  >
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-3'>
                        <div className='w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500'>
                          <User className='w-4 h-4' />
                        </div>
                        <div>
                          <p className='font-medium text-slate-900 dark:text-slate-100'>
                            {loan.user?.name ||
                              loan.user?.username ||
                              'Utilisateur inconnu'}
                          </p>
                          <p className='text-xs text-slate-500'>
                            {loan.user?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <Badge
                        variant='outline'
                        className='bg-blue-50 text-blue-700 border-blue-200'
                      >
                        Prêt
                      </Badge>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-2 max-w-[200px]'>
                        <Book className='w-4 h-4 text-slate-400 shrink-0' />
                        <span className='truncate' title={loan.book?.title}>
                          {loan.book?.title || 'Livre supprimé'}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4 text-xs'>
                      <span className='text-slate-500'>
                        Du: {new Date(loan.loanDate).toLocaleDateString()}
                      </span>
                      <br />
                      <span
                        className={cn(
                          'font-medium',
                          new Date(loan.dueDate) < new Date() &&
                            !loan.returnDate
                            ? 'text-red-600'
                            : 'text-slate-700 dark:text-slate-300'
                        )}
                      >
                        Au: {new Date(loan.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      {loan.returnDate ? (
                        <Badge
                          variant='outline'
                          className='bg-green-50 text-green-700 border-green-200 gap-1'
                        >
                          <CheckCircle className='w-3 h-3' /> Retourné
                        </Badge>
                      ) : new Date(loan.dueDate) < new Date() ? (
                        <Badge variant='destructive' className='gap-1'>
                          <AlertTriangle className='w-3 h-3' /> En Retard
                        </Badge>
                      ) : (
                        <Badge
                          variant='secondary'
                          className='bg-blue-50 text-blue-700 border-blue-200 gap-1 dark:bg-blue-900/30 dark:text-blue-300'
                        >
                          <CalendarClock className='w-3 h-3' /> En cours
                        </Badge>
                      )}
                    </td>
                    <td className='px-6 py-4 text-right'>
                      <div className='flex justify-end items-center gap-2'>
                        <Button
                          size='icon'
                          variant='outline'
                          className='h-8 w-8'
                          onClick={() => handlePrint(loan)}
                          disabled={printingId === loan.id}
                        >
                          {printingId === loan.id ? (
                            <Loader2 className='w-4 h-4 animate-spin' />
                          ) : (
                            <Printer className='w-4 h-4' />
                          )}
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size='icon'
                              variant='ghost'
                              className='h-8 w-8'
                            >
                              <MoreVertical className='w-4 h-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='w-56'>
                            <DropdownMenuItem onClick={() => onEdit(loan)}>
                              <Eye className='w-4 h-4 mr-2' /> Voir les détails
                            </DropdownMenuItem>

                            {!loan.returnDate && onMarkReturned && (
                              <DropdownMenuItem
                                onClick={() => triggerMarkReturnedConfirm(loan)}
                                className='text-emerald-600'
                              >
                                <CheckCircle className='w-4 h-4 mr-2' /> Marquer
                                comme retourné
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                )
              } else if ('book' in item) {
                // It's a loan request
                const req = item as DashboardLoanRequest
                return (
                  <tr key={req.id}>
                    <td className='p-4'>
                      <div className='flex items-center gap-3'>
                        <User className='w-4 h-4 text-slate-400' />
                        <div>
                          <p className='font-medium'>{req.user.name}</p>
                          <p className='text-xs text-slate-500'>
                            {req.user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className='p-4'>
                      <Badge
                        variant='outline'
                        className='bg-yellow-50 text-yellow-700 border-yellow-200'
                      >
                        Demande de prêt
                      </Badge>
                    </td>
                    <td className='p-4 truncate max-w-[220px]'>
                      <Book className='inline w-4 h-4 mr-2 text-slate-400' />
                      {req.book.title}
                    </td>
                    <td className='p-4'>
                      <Badge variant='secondary'>
                        {req.status === 'APPROVED'
                          ? 'Approuvée'
                          : req.status === 'REJECTED'
                          ? 'Rejetée'
                          : 'En attente'}
                      </Badge>
                    </td>
                    <td className='p-4 text-right'>
                      {/* Actions for processed requests can be added here later */}
                    </td>
                  </tr>
                )
              } else {
                // It's a subscription request
                const req = item as DashboardSubscriptionRequest
                return (
                  <tr key={req.id}>
                    <td className='p-4'>
                      <div className='flex items-center gap-3'>
                        <User className='w-4 h-4 text-slate-400' />
                        <div>
                          <p className='font-medium'>{req.user.name}</p>
                          <p className='text-xs text-slate-500'>
                            {req.user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className='p-4'>
                      <Badge
                        variant='outline'
                        className='bg-purple-50 text-purple-700 border-purple-200'
                      >
                        Demande d&apos;abonnement
                      </Badge>
                    </td>
                    <td className='p-4'>-</td>
                    <td className='p-4'>
                      <Badge variant='secondary'>
                        {req.status === 'APPROVED'
                          ? 'Approuvée'
                          : req.status === 'REJECTED'
                          ? 'Rejetée'
                          : 'En attente'}
                      </Badge>
                    </td>
                    <td className='p-4 text-right'>
                      {/* Actions for processed subscription requests can be added here later */}
                    </td>
                  </tr>
                )
              }
            })}
          {activeTab === 'loans' &&
            (data as DashboardLoan[]).map(loan => (
              <tr
                key={loan.id}
                className='group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors'
              >
                <td className='px-6 py-4'>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500'>
                      <User className='w-4 h-4' />
                    </div>
                    <div>
                      <p className='font-medium text-slate-900 dark:text-slate-100'>
                        {loan.user?.name ||
                          loan.user?.username ||
                          'Utilisateur inconnu'}
                      </p>
                      <p className='text-xs text-slate-500'>
                        {loan.user?.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className='px-6 py-4'>
                  <div className='flex items-center gap-2 max-w-[200px]'>
                    <Book className='w-4 h-4 text-slate-400 shrink-0' />
                    <span className='truncate' title={loan.book?.title}>
                      {loan.book?.title || 'Livre supprimé'}
                    </span>
                  </div>
                </td>
                <td className='px-6 py-4 text-xs'>
                  <span className='text-slate-500'>
                    Du: {new Date(loan.loanDate).toLocaleDateString()}
                  </span>
                  <br />
                  <span
                    className={cn(
                      'font-medium',
                      new Date(loan.dueDate) < new Date() && !loan.returnDate
                        ? 'text-red-600'
                        : 'text-slate-700 dark:text-slate-300'
                    )}
                  >
                    Au: {new Date(loan.dueDate).toLocaleDateString()}
                  </span>
                </td>
                <td className='px-6 py-4'>
                  {loan.returnDate ? (
                    <Badge
                      variant='outline'
                      className='bg-green-50 text-green-700 border-green-200 gap-1'
                    >
                      <CheckCircle className='w-3 h-3' /> Retourné
                    </Badge>
                  ) : new Date(loan.dueDate) < new Date() ? (
                    <Badge variant='destructive' className='gap-1'>
                      <AlertTriangle className='w-3 h-3' /> En Retard
                    </Badge>
                  ) : (
                    <Badge
                      variant='secondary'
                      className='bg-blue-50 text-blue-700 border-blue-200 gap-1 dark:bg-blue-900/30 dark:text-blue-300'
                    >
                      <CalendarClock className='w-3 h-3' /> En cours
                    </Badge>
                  )}
                </td>
                <td className='px-6 py-4 text-right'>
                  <div className='flex justify-end items-center gap-2'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='outline' className='h-8'>
                          <Settings2 className='w-4 h-4' /> Options
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' className='w-56'>
                        <DropdownMenuItem
                          onClick={() => onEdit(loan)}
                          className='text-blue-600 focus:text-blue-600'
                        >
                          <Eye className='w-4 h-4 mr-2 text-inherit' /> Voir les
                          détails
                        </DropdownMenuItem>

                        {!loan.returnDate && onMarkReturned && (
                          <DropdownMenuItem
                            onClick={() => triggerMarkReturnedConfirm(loan)}
                            className='text-emerald-600 focus:text-emerald-600'
                          >
                            <CheckCircle className='w-4 h-4 mr-2 text-inherit' />{' '}
                            Marquer comme retourné
                          </DropdownMenuItem>
                        )}
                        {
                          <DropdownMenuItem
                            onClick={() => handlePrint(loan)}
                            className='text-yellow-600 focus:text-yellow-600'
                          >
                            {printingId === loan.id ? (
                              <Loader2 className='w-4 h-4 animate-spin text-inherit' />
                            ) : (
                              <Printer className='w-4 h-4 text-inherit' />
                            )}
                            Générer le reçu
                          </DropdownMenuItem>
                        }
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          {activeTab === 'subscriptions' &&
            (data as DashboardSubscription[]).map(sub => (
              <tr
                key={sub.id}
                className='group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors'
              >
                <td className='px-6 py-4'>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500'>
                      <User className='w-4 h-4' />
                    </div>
                    <div>
                      <p className='font-medium text-slate-900 dark:text-slate-100'>
                        {sub.user?.username || 'Utilisateur inconnu'}
                      </p>
                      <p className='text-xs text-slate-500'>
                        {sub.user?.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                  Du {new Date(sub.startDate).toLocaleDateString()} au{' '}
                  {new Date(sub.endDate).toLocaleDateString()}
                </td>
                <td className='px-6 py-4'>
                  {(() => {
                    const daysLeft = Math.ceil(
                      (new Date(sub.endDate).getTime() - new Date().getTime()) /
                        (1000 * 3600 * 24)
                    )
                    if (!sub.isActive)
                      return <span className='text-slate-400'>-</span>
                    return (
                      <span
                        className={cn(
                          'font-bold',
                          daysLeft < 5 ? 'text-red-600' : 'text-emerald-600'
                        )}
                      >
                        {daysLeft > 0 ? `${daysLeft} jours` : 'Expiré'}
                      </span>
                    )
                  })()}
                </td>
                <td className='px-6 py-4'>
                  {sub.isActive ? (
                    <Badge className='bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300'>
                      Actif
                    </Badge>
                  ) : (
                    <Badge variant='outline' className='text-slate-500'>
                      Inactif
                    </Badge>
                  )}
                </td>
                <td className='px-6 py-4 text-right'>
                  <div className='flex justify-end gap-2 items-center'>
                    {isAuthorized(UserRole.ADMIN) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size='sm' variant='outline' className='h-8'>
                            <Settings2 className='w-4 h-4' />
                            Options
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='w-48'>
                          <DropdownMenuItem
                            onClick={() => triggerSubscriptionDetails(sub)}
                          >
                            <Eye className='w-4 h-4 mr-2' /> Voir les détails
                          </DropdownMenuItem>
                          {sub.isActive ? (
                            <DropdownMenuItem
                              onClick={() =>
                                triggerSubscriptionAction(sub, 'suspend')
                              }
                              className='text-red-600 focus:text-red-600'
                              disabled={processingId === sub.id}
                            >
                              {processingId === sub.id ? (
                                <Loader2 className='w-4 h-4 animate-spin mr-2' />
                              ) : (
                                <AlertTriangle className='w-4 h-4 mr-2' />
                              )}
                              Suspendre
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                triggerSubscriptionAction(sub, 'activate')
                              }
                              className='text-emerald-600 focus:text-emerald-600'
                              disabled={processingId === sub.id}
                            >
                              {processingId === sub.id ? (
                                <Loader2 className='w-4 h-4 animate-spin mr-2' />
                              ) : (
                                <CheckCircle className='w-4 h-4 mr-2' />
                              )}
                              Activer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          {activeTab === 'requests' &&
            (
              data as (DashboardLoanRequest | DashboardSubscriptionRequest)[]
            ).map(item => {
              if ('book' in item) {
                // It's a loan request
                const req = item as DashboardLoanRequest
                return (
                  <tr
                    key={req.id}
                    className='group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors'
                  >
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-3'>
                        <div className='w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500'>
                          <User className='w-4 h-4' />
                        </div>
                        <div>
                          <p className='font-medium text-slate-900 dark:text-slate-100'>
                            {req.user?.name ||
                              req.user?.username ||
                              'Utilisateur inconnu'}
                          </p>
                          <p className='text-xs text-slate-500'>
                            {req.user?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <Badge
                        variant='outline'
                        className='bg-yellow-50 text-yellow-700 border-yellow-200'
                      >
                        Demande de prêt
                      </Badge>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-2 max-w-[200px]'>
                        <Book className='w-4 h-4 text-slate-400 shrink-0' />
                        <span className='truncate' title={req.book?.title}>
                          {req.book?.title || 'Livre supprimé'}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <Badge variant='secondary'>
                        {req.status === 'APPROVED'
                          ? 'Approuvée'
                          : req.status === 'REJECTED'
                          ? 'Rejetée'
                          : 'En attente'}
                      </Badge>
                    </td>
                    <td className='px-6 py-4 text-right'>
                      <div className='flex justify-end gap-2'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='outline' className='h-8'>
                              <Settings2 className='w-4 h-4' /> Options
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='w-56'>
                            {req.status === 'PENDING' && isAuthorized(UserRole.LIBRARIAN) ? (
                              <>
                              <DropdownMenuItem
                              onClick={() => triggerApproveConfirm(req.id)}
                              className='text-emerald-600 focus:text-emerald-600'
                              disabled={processingId === req.id}
                            >
                              {processingId === req.id ? (
                                <Loader2 className='w-4 h-4 animate-spin mr-2' />
                              ) : (
                                <CheckCircle className='w-4 h-4 mr-2' />
                              )}{' '}
                              Approuver
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => triggerRejectConfirm(req.id)}
                              className='text-orange-600 focus:text-orange-600'
                            >
                              {processingId === req.id ? (
                                <Loader2 className='w-4 h-4 animate-spin mr-2' />
                              ) : (
                                <AlertTriangle className='w-4 h-4 mr-2' />
                              )}
                              Rejeter
                            </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                              >
                                {/* Non autorisé */}
                                <AlertTriangle className='w-4 h-4 mr-2' />
                                Action non disponible
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                )
              } else {
                // It's a subscription request
                const req = item as DashboardSubscriptionRequest
                return (
                  <tr
                    key={req.id}
                    className='group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors'
                  >
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-3'>
                        <div className='w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500'>
                          <User className='w-4 h-4' />
                        </div>
                        <div>
                          <p className='font-medium text-slate-900 dark:text-slate-100'>
                            {req.user?.name ||
                              req.user?.username ||
                              'Utilisateur inconnu'}
                          </p>
                          <p className='text-xs text-slate-500'>
                            {req.user?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <Badge
                        variant='outline'
                        className='bg-purple-50 text-purple-700 border-purple-200'
                      >
                        Demande d&apos;abonnement
                      </Badge>
                    </td>
                    <td className='px-6 py-4'>
                      <Badge variant={req.isUpdate ? 'default' : 'secondary'}>
                        {req.isUpdate ? 'Mise à jour' : 'Nouvel abonnement'}
                      </Badge>
                    </td>
                    <td className='px-6 py-4'>
                      <span className='text-slate-500'>-</span>
                    </td>
                    <td className='px-6 py-4'>
                      <Badge variant='secondary'>
                        {req.status === 'APPROVED'
                          ? 'Approuvée'
                          : req.status === 'REJECTED'
                          ? 'Rejetée'
                          : 'En attente'}
                      </Badge>
                    </td>
                    <td className='px-6 py-4 text-right'>
                      <div className='flex justify-end gap-2'>
                        {req.status === 'PENDING' &&
                          isAuthorized(UserRole.ADMIN) && (
                            <>
                              <Button
                                size='sm'
                                variant='outline'
                                className='h-8'
                                onClick={() => triggerApproveConfirm(req.id)}
                                disabled={processingId === req.id}
                              >
                                {processingId === req.id ? (
                                  <Loader2 className='w-4 h-4 animate-spin mr-2' />
                                ) : (
                                  <CheckCircle className='w-4 h-4 mr-2' />
                                )}
                                Approuver
                              </Button>
                              <Button
                                size='sm'
                                variant='destructive'
                                className='h-8'
                                onClick={() => triggerRejectConfirm(req.id)}
                                disabled={processingId === req.id}
                              >
                                <AlertTriangle className='w-4 h-4 mr-2' />
                                Rejeter
                              </Button>
                            </>
                          )}
                      </div>
                    </td>
                  </tr>
                )
              }
            })}
        </tbody>
      </table>

      {/* UNIQUE DIALOG DE CONFIRMATION (Placé hors de la boucle) */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmation de suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est
              irréversible et supprimera définitivement les données associées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className=''>
            <Button
              variant='outline'
              onClick={() => setDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button variant='destructive' onClick={confirmDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue de confirmation pour marquer comme retourné */}
      <Dialog
        open={markReturnedDialogOpen}
        onOpenChange={setMarkReturnedDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmation de retour</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir marquer ce prêt comme retourné ? Cette
              action ne peut pas être annulée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className=''>
            <Button
              variant='outline'
              onClick={() => setMarkReturnedDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button variant='default' onClick={confirmMarkReturned}>
              Confirmer le retour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue de confirmation pour approuver une demande */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmation d&apos;approbation</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir approuver cette demande ? Cette action
              créera un prêt ou un abonnement actif.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className=''>
            <Button
              variant='outline'
              onClick={() => setApproveDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button variant='default' onClick={confirmApprove}>
              Approuver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue de confirmation pour rejeter une demande */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmation de rejet</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir rejeter cette demande ? Cette action est
              irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className=''>
            <Button
              variant='outline'
              onClick={() => setRejectDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button variant='destructive' onClick={confirmReject}>
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue d'action d'abonnement */}
      <Dialog
        open={subscriptionActionDialogOpen}
        onOpenChange={setSubscriptionActionDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'suspend'
                ? "Suspendre l'abonnement"
                : "Activer l'abonnement"}
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir{' '}
              {actionType === 'suspend' ? 'suspendre' : 'activer'}{' '}
              l&apos;abonnement de {selectedSubscription?.user?.username} ?
            </DialogDescription>
          </DialogHeader>
          <div className='py-4 space-y-4'>
            <div>
              <Label htmlFor='actionReason'>Raison (optionnel)</Label>
              <Textarea
                id='actionReason'
                placeholder='Entrez une raison pour cette action...'
                value={actionReason}
                onChange={e => setActionReason(e.target.value)}
                className='mt-2'
              />
            </div>
            {actionType === 'activate' && (
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='actionResumption'
                  checked={actionResumption}
                  onCheckedChange={checked =>
                    setActionResumption(checked as boolean)
                  }
                />
                <Label htmlFor='actionResumption'>
                  Reprendre avec les jours restants
                </Label>
              </div>
            )}
            <div>
              <Label htmlFor='actionEndDate'>Date de fin (optionnel)</Label>
              <Input
                id='actionEndDate'
                type='date'
                value={actionEndDate}
                onChange={e => setActionEndDate(e.target.value)}
                className='mt-2'
              />
            </div>
          </div>
          <DialogFooter className=''>
            <Button
              variant='outline'
              onClick={() => setSubscriptionActionDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant={actionType === 'suspend' ? 'destructive' : 'default'}
              onClick={confirmSubscriptionAction}
              disabled={processingId === selectedSubscription?.id}
            >
              {processingId === selectedSubscription?.id ? (
                <Loader2 className='w-4 h-4 animate-spin mr-2' />
              ) : null}
              {actionType === 'suspend' ? 'Suspendre' : 'Activer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue de détails d'abonnement */}
      <Dialog
        open={subscriptionDetailsDialogOpen}
        onOpenChange={setSubscriptionDetailsDialogOpen}
      >
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Détails de l&apos;abonnement</DialogTitle>
            <DialogDescription>
              Informations détaillées sur l&apos;abonnement de{' '}
              {selectedSubscriptionForDetails?.user?.username}
            </DialogDescription>
          </DialogHeader>
          {selectedSubscriptionForDetails && (
            <div className='py-4 space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label className='text-sm font-medium text-slate-500'>
                    Utilisateur
                  </Label>
                  <p className='text-sm font-medium'>
                    {selectedSubscriptionForDetails.user?.username ||
                      'Utilisateur inconnu'}
                  </p>
                  <p className='text-xs text-slate-500'>
                    {selectedSubscriptionForDetails.user?.email}
                  </p>
                </div>
                <div>
                  <Label className='text-sm font-medium text-slate-500'>
                    État
                  </Label>
                  <Badge
                    className={
                      selectedSubscriptionForDetails.isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-800'
                    }
                  >
                    {selectedSubscriptionForDetails.isActive
                      ? 'Actif'
                      : 'Inactif'}
                  </Badge>
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label className='text-sm font-medium text-slate-500'>
                    Date de début
                  </Label>
                  <p className='text-sm'>
                    {new Date(
                      selectedSubscriptionForDetails.startDate
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className='text-sm font-medium text-slate-500'>
                    Date de fin
                  </Label>
                  <p className='text-sm'>
                    {new Date(
                      selectedSubscriptionForDetails.endDate
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div>
                <Label className='text-sm font-medium text-slate-500'>
                  Type d&apos;abonnement
                </Label>
                <p className='text-sm'>{selectedSubscriptionForDetails.type}</p>
              </div>
              <div>
                <Label className='text-sm font-medium text-slate-500'>
                  Jours restants
                </Label>
                <p className='text-sm'>
                  {(() => {
                    const daysLeft = Math.ceil(
                      (new Date(
                        selectedSubscriptionForDetails.endDate
                      ).getTime() -
                        new Date().getTime()) /
                        (1000 * 3600 * 24)
                    )
                    if (!selectedSubscriptionForDetails.isActive) return '-'
                    return daysLeft > 0 ? `${daysLeft} jours` : 'Expiré'
                  })()}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setSubscriptionDetailsDialogOpen(false)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading && !!data.length && (
        <div className='absolute inset-0 bg-white/70 dark:bg-slate-900/70 flex items-center justify-center'>
          <Loader2 className='w-8 h-8 text-slate-500 animate-spin' />
        </div>
      )}
    </div>
  )
}
