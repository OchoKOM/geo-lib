'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CreditCard,
  HandCoins,
  RefreshCw,
  Loader2,
  Search,
  Clock,
  History
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { showToast } from '@/hooks/useToast'
import { useAuth } from '@/components/AuthProvider'

import { FinanceTable } from '@/components/finances/FinanceTable'
import { FinanceForm } from '@/components/finances/FinanceForm'
import {
  DashboardUser,
  UserRole,
  DashboardBook,
  DashboardLoan,
  DashboardSubscription,
  DashboardLoanRequest,
  DashboardSubscriptionRequest,
  FinanceEntityType
} from '@/lib/types'
import { RequestStatus } from '@prisma/client'
import { CurrentEntity, DeleteTarget } from '@/lib/dashboard-config'
import {
  createEntityAction,
  deleteEntityAction,
  getDashboardDataAction,
  updateEntityAction
} from '../dashboard/actions'

export default function FinancePage () {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<FinanceEntityType>('active-loans')
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [requestFilter, setRequestFilter] = useState<'all' | 'loan' | 'subscription'>('all')

  // Pagination state
  const [currentPage, setCurrentPage] = useState<Record<FinanceEntityType, number>>({
    'active-loans': 1,
    'history': 1,
    'requests': 1,
    'subscriptions': 1,
    'payments': 1
  })
  const pageSize = 10

  // Data State
  const [activeLoans, setActiveLoans] = useState<DashboardLoan[]>([])
  const [historyData, setHistoryData] = useState<(DashboardLoan | DashboardLoanRequest | DashboardSubscriptionRequest)[]>([])
  const [requests, setRequests] = useState<(DashboardLoanRequest | DashboardSubscriptionRequest)[]>([])
  const [subscriptions, setSubscriptions] = useState<DashboardSubscription[]>(
    []
  )
  const [payments, setPayments] = useState<DashboardLoanRequest[]>([])

  // Resources for Selects
  const [usersList, setUsersList] = useState<DashboardUser[]>([])
  const [booksList, setBooksList] = useState<DashboardBook[]>([])

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentEntity, setCurrentEntity] = useState<CurrentEntity | null>(null)

  // --- HELPERS ---
  const isAuthorized = (role: UserRole) => {
    if (!user) return false
    const roles = Object.values(UserRole)
    return roles.indexOf(user.role) >= roles.indexOf(role)
  }

  // --- FILTERING (RECHERCHE) ---
  const filteredActiveLoans = useMemo(() => {
    if (!searchTerm) return activeLoans
    const lowerTerm = searchTerm.toLowerCase()
    return activeLoans.filter(
      l =>
        l.user.name?.toLowerCase().includes(lowerTerm) ||
        l.user.username.toLowerCase().includes(lowerTerm) ||
        l.user.email.toLowerCase().includes(lowerTerm) ||
        (l.book?.title || '').toLowerCase().includes(lowerTerm)
    )
  }, [activeLoans, searchTerm])

  const filteredHistory = useMemo(() => {
    if (!searchTerm) return historyData
    const lowerTerm = searchTerm.toLowerCase()
    return historyData.filter(item => {
      if ('loanDate' in item) {
        // It's a loan
        return (
          item.user.name?.toLowerCase().includes(lowerTerm) ||
          item.user.username?.toLowerCase().includes(lowerTerm) ||
          item.user.email.toLowerCase().includes(lowerTerm) ||
          (item.book?.title || '').toLowerCase().includes(lowerTerm)
        )
      } else if ('book' in item) {
        // It's a loan request
        return (
          item.user.name?.toLowerCase().includes(lowerTerm) ||
          item.user.username?.toLowerCase().includes(lowerTerm) ||
          item.user.email.toLowerCase().includes(lowerTerm) ||
          (item.book?.title || '').toLowerCase().includes(lowerTerm)
        )
      } else {
        // It's a subscription request
        return (
          item.user.name.toLowerCase().includes(lowerTerm) ||
          item.user.email.toLowerCase().includes(lowerTerm)
        )
      }
    })
  }, [historyData, searchTerm])

  const filteredRequests = useMemo(() => {
    let filtered = requests

    // Filter by type
    if (requestFilter !== 'all') {
      filtered = filtered.filter(item => {
        if (requestFilter === 'loan') {
          return 'book' in item
        } else if (requestFilter === 'subscription') {
          return !('book' in item)
        }
        return true
      })
    }

    // Filter by search term
    if (!searchTerm) return filtered
    const lowerTerm = searchTerm.toLowerCase()
    return filtered.filter(item => {
      if ('book' in item) {
        // It's a loan request
        return (
          item.user.name.toLowerCase().includes(lowerTerm) ||
          item.user.email.toLowerCase().includes(lowerTerm) ||
          item.book.title.toLowerCase().includes(lowerTerm)
        )
      } else {
        // It's a subscription request
        return (
          item.user.name.toLowerCase().includes(lowerTerm) ||
          item.user.email.toLowerCase().includes(lowerTerm)
        )
      }
    })
  }, [requests, searchTerm, requestFilter])

  const filteredSubscriptions = useMemo(() => {
    if (!searchTerm) return subscriptions
    const lowerTerm = searchTerm.toLowerCase()
    return subscriptions.filter(
      s =>
        s.user.name?.toLowerCase().includes(lowerTerm) ||
        s.user.username.toLowerCase().includes(lowerTerm) ||
        s.user.email.toLowerCase().includes(lowerTerm)
    )
  }, [subscriptions, searchTerm])

  const filteredPayments = useMemo(() => {
    if (!searchTerm) return payments
    const lowerTerm = searchTerm.toLowerCase()
    return payments.filter(
      p =>
        p.user.name.toLowerCase().includes(lowerTerm) ||
        p.user.email.toLowerCase().includes(lowerTerm)
    )
  }, [payments, searchTerm])

  // --- PAGINATION ---
  const paginatedActiveLoans = useMemo(() => {
    const startIndex = (currentPage['active-loans'] - 1) * pageSize
    return filteredActiveLoans.slice(startIndex, startIndex + pageSize)
  }, [filteredActiveLoans, currentPage, pageSize])

  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage['history'] - 1) * pageSize
    return filteredHistory.slice(startIndex, startIndex + pageSize)
  }, [filteredHistory, currentPage, pageSize])

  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage['requests'] - 1) * pageSize
    return filteredRequests.slice(startIndex, startIndex + pageSize)
  }, [filteredRequests, currentPage, pageSize])

  const paginatedSubscriptions = useMemo(() => {
    const startIndex = (currentPage['subscriptions'] - 1) * pageSize
    return filteredSubscriptions.slice(startIndex, startIndex + pageSize)
  }, [filteredSubscriptions, currentPage, pageSize])

  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage['payments'] - 1) * pageSize
    return filteredPayments.slice(startIndex, startIndex + pageSize)
  }, [filteredPayments, currentPage, pageSize])

  const getTotalPages = (data: unknown[]) => Math.ceil(data.length / pageSize)

  const handlePageChange = (tab: FinanceEntityType, page: number) => {
    setCurrentPage(prev => ({ ...prev, [tab]: page }))
  }

  // Reset page when tab changes or search term changes
  useEffect(() => {
    setCurrentPage(prev => ({ ...prev, [activeTab]: 1 }))
  }, [activeTab, searchTerm, requestFilter])

  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1. Charger les données principales
      if (activeTab === 'active-loans') {
        // @ts-expect-error casting
        const res = await getDashboardDataAction('active-loans')
        if (res.success && res.data) {
          setActiveLoans(res.data as DashboardLoan[])
        }
      } else if (activeTab === 'history') {
        // Fetch both loan history and processed requests
        const loanHistoryRes = await getDashboardDataAction('history')
        const requestsRes = await getDashboardDataAction('requests')
        const subscriptionRequestsRes = await getDashboardDataAction('subscription-requests')

        const combinedData: (DashboardLoan | DashboardLoanRequest | DashboardSubscriptionRequest)[] = []

        if (loanHistoryRes.success && loanHistoryRes.data) {
          combinedData.push(...(loanHistoryRes.data as DashboardLoan[]))
        }

        if (requestsRes.success && requestsRes.data) {
          const processedRequests = (requestsRes.data as DashboardLoanRequest[]).filter(
            req => req.status !== RequestStatus.PENDING
          )
          combinedData.push(...processedRequests)
        }

        if (subscriptionRequestsRes.success && subscriptionRequestsRes.data) {
          const processedSubscriptionRequests = (subscriptionRequestsRes.data as DashboardSubscriptionRequest[]).filter(
            req => req.status !== RequestStatus.PENDING
          )
          combinedData.push(...processedSubscriptionRequests)
        }

        setHistoryData(combinedData)
      } else if (activeTab === 'requests') {
        const loanRequestsRes = await getDashboardDataAction('requests')
        const subscriptionRequestsRes = await getDashboardDataAction('subscription-requests')

        console.log('Loan requests response:', loanRequestsRes)
        console.log('Subscription requests response:', subscriptionRequestsRes)

        if (!loanRequestsRes.success) {
          showToast(loanRequestsRes.message, 'destructive')
        }
        if (!subscriptionRequestsRes.success) {
          showToast(subscriptionRequestsRes.message, 'destructive')
        }

        const combinedRequests: (DashboardLoanRequest | DashboardSubscriptionRequest)[] = []

        if (loanRequestsRes.success && loanRequestsRes.data) {
          combinedRequests.push(...(loanRequestsRes.data as DashboardLoanRequest[]))
        }

        if (subscriptionRequestsRes.success && subscriptionRequestsRes.data) {
          combinedRequests.push(...(subscriptionRequestsRes.data as DashboardSubscriptionRequest[]))
        }

        console.log('Combined requests:', combinedRequests)
        setRequests(combinedRequests)
      } else if (activeTab === 'subscriptions') {
        const res = await getDashboardDataAction('subscriptions')
        console.log('Subscriptions response:', res)
        if (res.success && res.data)
          setSubscriptions(res.data as DashboardSubscription[])
      } else if (activeTab === 'payments') {
        const res = await getDashboardDataAction('payments')
        if (res.success && res.data) setPayments(res.data as DashboardLoanRequest[])
      }

      // 2. Charger les ressources pour les formulaires (utilisateurs, livres)
      // On le fait une seule fois ou si vide
      if (usersList.length === 0) {
        // Astuce: on utilise l'action existante pour récupérer les users si admin
        // Sinon il faudrait une action spécifique "getUsersForSelect" pour les bibliothécaires
        const uRes = await getDashboardDataAction('users')
        // @ts-expect-error casting
        if (uRes.success && uRes.data) setUsersList(uRes.data)
      }
      if (booksList.length === 0 && (activeTab === 'active-loans' || activeTab === 'history')) {
        const bRes = await getDashboardDataAction('books')
        // @ts-expect-error casting
        if (bRes.success && bRes.data) setBooksList(bRes.data)
      }
    } catch (err) {
      console.error(err)
      showToast('Erreur de chargement', 'destructive')
    } finally {
      setLoading(false)
    }
  }, [activeTab, user, usersList.length, booksList.length])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleMarkReturned = async (loan: DashboardLoan) => {
    try {
      const res = await updateEntityAction('loans', loan.id, {
        isReturned: true
      })

      if (res.success) {
        showToast('Prêt marqué comme retourné')
        fetchData()
      } else {
        showToast(res.message, 'destructive')
      }
    } catch {
      showToast('Erreur lors de la mise à jour', 'destructive')
    }
  }

  // --- HANDLERS ---
  const handleCreateOrUpdate = async () => {
    if (!currentEntity) return
    setLoading(true)
    try {
      let res
      if (currentEntity.isEditing && currentEntity.id) {
        res = await updateEntityAction(
          // @ts-expect-error casting
          currentEntity.type,
          currentEntity.id,
          currentEntity.data
        )
      } else {
        // @ts-expect-error casting
        res = await createEntityAction(currentEntity.type, currentEntity.data)
      }

      if (res.success) {
        showToast(res.message, 'default')
        setIsDialogOpen(false)
        fetchData() // Refresh list
      } else {
        console.log(res.message)

        showToast(res.message, 'destructive')
      }
    } catch (e) {
      console.log(e)
      showToast('Erreur serveur', 'destructive')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (target: DeleteTarget) => {
    setLoading(true)
    try {
      // @ts-expect-error casting
      const res = await deleteEntityAction(target.type, target.id)
      if (res.success) {
        showToast('Supprimé avec succès', 'default')
        fetchData()
      } else {
        showToast(res.message, 'destructive')
      }
    } catch (e) {
      console.log(e)

      showToast('Erreur suppression', 'destructive')
    } finally {
      setLoading(false)
    }
  }

  // --- RENDER ---
  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans'>
      {/* HEADER SIMPLE */}
      <header className='bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10'>
        <div className='flex items-center gap-4'>
          <div>
            <h1 className='text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2'>
              <CreditCard className='w-6 h-6 text-emerald-600' />
              Portail Financier
            </h1>
            <p className='text-xs text-slate-500'>
              Gestion des prêts et abonnements
            </p>
          </div>
        </div>

        <div className='flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto'>
          <button
            onClick={() => setActiveTab('active-loans')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'active-loans'
                ? 'bg-white dark:bg-muted shadow text-orange-600 dark:text-orange-400'
                : 'text-slate-500 hover:text-muted-foreground'
            }`}
          >
            <HandCoins className='w-4 h-4' /> Prêts Actifs
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-white dark:bg-muted shadow text-orange-600 dark:text-orange-400'
                : 'text-slate-500 hover:text-muted-foreground'
            }`}
          >
            <History className='w-4 h-4' /> Historique
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-muted shadow text-yellow-600 dark:text-yellow-400'
                : 'text-slate-500 hover:text-muted-foreground'
            }`}
          >
            <Clock className='w-4 h-4' /> Demandes
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'subscriptions'
                ? 'bg-white dark:bg-muted shadow text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 hover:text-muted-foreground'
            }`}
          >
            <CreditCard className='w-4 h-4' /> Abonnements
          </button>

        </div>
      </header>

      {/* CONTENU */}
      <main className='flex-1 max-w-7xl w-full mx-auto p-6'>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6'>
          <h2 className='text-lg font-semibold text-slate-800 dark:text-slate-200'>
            {(activeTab === 'active-loans' || activeTab === 'history')
              ? 'Registre des Prêts'
              : activeTab === 'subscriptions'
              ? 'Liste des Abonnements'
              : 'Gestion des Demandes'}
          </h2>

          <div className='flex items-center gap-2 w-full sm:w-auto'>
            {/* BARRE DE RECHERCHE */}
            <div className='relative flex-1 sm:w-64'>
              <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-slate-400' />
              <Input
                placeholder={
                  activeTab === 'active-loans' || activeTab === 'history'
                    ? 'Rechercher un prêt, un livre...'
                    : activeTab === 'subscriptions'
                    ? 'Rechercher un abonné...'
                    : 'Rechercher une demande...'
                }
                className='pl-9 h-10'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* FILTER DROPDOWN FOR REQUESTS */}
            {activeTab === 'requests' && (
              <Select value={requestFilter} onValueChange={(value: 'all' | 'loan' | 'subscription') => setRequestFilter(value)}>
                <SelectTrigger className='w-40 shrink-0'>
                  <SelectValue placeholder='Filtrer par type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Tous les types</SelectItem>
                  <SelectItem value='loan'>Prêts</SelectItem>
                  <SelectItem value='subscription'>Abonnements</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Button
              variant='outline'
              size='icon'
              onClick={fetchData}
              disabled={loading}
              className='shrink-0'
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>

        <FinanceTable
          data={
            activeTab === 'active-loans'
              ? paginatedActiveLoans
              : activeTab === 'history'
              ? paginatedHistory
              : activeTab === 'requests'
              ? paginatedRequests
              : activeTab === 'subscriptions'
              ? paginatedSubscriptions
              : paginatedPayments
          }
          activeTab={activeTab}
          isLoading={loading}
          onMarkReturned={handleMarkReturned}
          onEdit={item => {
            let formData: Record<string, unknown> = {}
            if (activeTab === 'active-loans' || activeTab === 'history') {
              const loan = item as unknown as DashboardLoan
              formData = {
                userId: loan.user.id,
                bookId: loan.book?.id,
                dueDate: loan.dueDate,
                returnDate: loan.returnDate,
                isReturned: !!loan.returnDate
              }
            } else if (activeTab === 'subscriptions') {
              const sub = item as unknown as DashboardSubscription
              formData = {
                userId: sub.user.id,
                endDate: sub.endDate,
                isActive: sub.isActive
              }
            }
            setCurrentEntity({
              type: activeTab,
              data: formData,
              isEditing: true,
              id: item.id
            })
            setIsDialogOpen(true)
          }}
          onDelete={handleDelete}
          isAuthorized={isAuthorized}
          onRefresh={fetchData}
        />

        {/* PAGINATION CONTROLS */}
        {(() => {
          const currentData = activeTab === 'active-loans'
            ? filteredActiveLoans
            : activeTab === 'history'
            ? filteredHistory
            : activeTab === 'requests'
            ? filteredRequests
            : activeTab === 'subscriptions'
            ? filteredSubscriptions
            : filteredPayments
          const totalPages = getTotalPages(currentData)
          const currentPageNum = currentPage[activeTab]

          if (totalPages <= 1) return null

          return (
            <div className='flex items-center justify-center gap-2 mt-6'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handlePageChange(activeTab, currentPageNum - 1)}
                disabled={currentPageNum <= 1}
              >
                Précédent
              </Button>

              <span className='text-sm text-slate-600 dark:text-slate-400'>
                Page {currentPageNum} sur {totalPages}
              </span>

              <Button
                variant='outline'
                size='sm'
                onClick={() => handlePageChange(activeTab, currentPageNum + 1)}
                disabled={currentPageNum >= totalPages}
              >
                Suivant
              </Button>
            </div>
          )
        })()}
      </main>

      {/* DIALOG FORMULAIRE */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>
              {currentEntity?.isEditing ? 'Modifier' : 'Créer'}{' '}
              {activeTab === 'active-loans' ? 'un prêt' : 'un abonnement'}
            </DialogTitle>
          </DialogHeader>

          {currentEntity && (
            <FinanceForm
              currentEntity={currentEntity}
              setCurrentEntity={setCurrentEntity}
              users={usersList}
              books={booksList}
            />
          )}

          <DialogFooter>
            <Button variant='outline' onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateOrUpdate} disabled={loading}>
              {loading && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
