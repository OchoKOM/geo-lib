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
  Loader2,
  Eye,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DashboardLoan,
  DashboardLoanRequest,
  DashboardSubscription,
  UserRole
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
import { approveLoanRequest, rejectLoanRequest } from '@/app/(main)/dashboard/actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'

interface FinanceTableProps {
  data: DashboardLoan[] | DashboardSubscription[] | DashboardLoanRequest[]
  activeTab: 'loans' | 'subscriptions' | 'requests'
  onEdit: (item: DashboardLoan | DashboardSubscription) => void
  onDelete: (item: DeleteTarget) => void
  isAuthorized: (role: UserRole) => boolean
  isLoading?: boolean
  onMarkReturned?: (loan: DashboardLoan) => void
}

export function FinanceTable ({
  data,
  activeTab,
  onEdit,
  onDelete,
  isAuthorized,
  isLoading,
  onMarkReturned
}: FinanceTableProps) {
  const [printingId, setPrintingId] = useState<string | null>(null)

  // États pour la gestion de la suppression (Dialogue contrôlé)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<DeleteTarget | null>(null)

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

  // Ouvre le dialogue de confirmation
  const triggerDeleteConfirm = (
    type: 'loans' | 'subscriptions',
    id: string
  ) => {
    setItemToDelete({ type, id })
    setDeleteDialogOpen(true)
  }

  // Exécute la suppression et ferme le dialogue
  function confirmDelete () {
    if (itemToDelete) {
      onDelete(itemToDelete)
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    }
  }

  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    const res = await approveLoanRequest(id);
    if (res.success) {
      showToast("Demande approuvée", "success");
    } else {
      showToast("Erreur lors de l'approbation de la demande", "destructive");
    }
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    const res = await rejectLoanRequest(id);
    if (res.success) {
      showToast("Demande rejetée");
    }
    setProcessingId(null);
  };

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
            {activeTab === 'loans' ? (
              <>
                <th className='px-6 py-4 font-medium text-slate-500'>
                  Livre Emprunté
                </th>
                <th className='px-6 py-4 font-medium text-slate-500'>
                  Échéance
                </th>
                <th className='px-6 py-4 font-medium text-slate-500'>Statut</th>
              </>
            ) : (
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
            <th className='px-6 py-4 font-medium text-slate-500 text-right'>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className='divide-y divide-slate-100 dark:divide-slate-800'>
          {activeTab === 'requests' &&
            (data as DashboardLoanRequest[]).map(req => (
              <tr key={req.id}>
                <td className='p-4'>
                  <div className='flex items-center gap-3'>
                    <User className='w-4 h-4 text-slate-400' />
                    <div>
                      <p className='font-medium'>{req.user.name}</p>
                      <p className='text-xs text-slate-500'>{req.user.email}</p>
                    </div>
                  </div>
                </td>

                <td className='p-4 truncate max-w-[220px]'>
                  <Book className='inline w-4 h-4 mr-2 text-slate-400' />
                  {req.book.title}
                </td>

                <td className='p-4'>
                  <Badge variant='secondary'>En attente</Badge>
                </td>

                <td className='p-4 text-right'>
                  <div className='flex justify-end gap-2'>
                    <Button
                      size='sm'
                      className='bg-primary text-white'
                      onClick={() => handleApprove(req.id)}
                    >
                      {processingId === req.id ? (
                        <Loader2 className='w-3 h-3 animate-spin' />
                      ) : (
                        'Approuver'
                      )}
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='text-red-600'
                      onClick={() => handleReject(req.id)}
                      disabled={processingId === req.id}
                    >
                      Refuser
                    </Button>
                  </div>
                </td>
              </tr>
            ))}

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
                        <Button size='icon' variant='ghost' className='h-8 w-8'>
                          <MoreVertical className='w-4 h-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' className='w-56'>
                        <DropdownMenuItem onClick={() => onEdit(loan)}>
                          <Eye className='w-4 h-4 mr-2' /> Voir les détails
                        </DropdownMenuItem>

                        {!loan.returnDate && onMarkReturned && (
                          <DropdownMenuItem
                            onClick={() => onMarkReturned(loan)}
                            className='text-emerald-600'
                          >
                            <CheckCircle className='w-4 h-4 mr-2' /> Marquer
                            comme retourné
                          </DropdownMenuItem>
                        )}

                        {isAuthorized(UserRole.ADMIN) && (
                          <DropdownMenuItem
                            className='text-red-600 focus:text-red-600'
                            onClick={() =>
                              triggerDeleteConfirm('loans', loan.id)
                            }
                          >
                            <Trash2 className='w-4 h-4 mr-2' /> Supprimer le
                            prêt
                          </DropdownMenuItem>
                        )}
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
                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-8 w-8'
                      onClick={() => onEdit(sub)}
                    >
                      <Edit className='w-4 h-4 text-slate-600' />
                    </Button>
                    {isAuthorized(UserRole.ADMIN) && (
                      <Button
                        size='icon'
                        variant='ghost'
                        className='h-8 w-8 hover:text-red-600'
                        onClick={() =>
                          triggerDeleteConfirm('subscriptions', sub.id)
                        }
                      >
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
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

      {isLoading && !!data.length && (
        <div className='absolute inset-0 bg-white/70 dark:bg-slate-900/70 flex items-center justify-center'>
          <Loader2 className='w-8 h-8 text-slate-500 animate-spin' />
        </div>
      )}
    </div>
  )
}
