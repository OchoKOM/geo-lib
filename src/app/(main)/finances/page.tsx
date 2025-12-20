'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CreditCard,
  HandCoins,
  Plus,
  RefreshCw,
  Loader2,
  Search,
  Clock
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
  FinanceEntityData,
  DashboardLoanRequest
} from '@/lib/types'
import { CurrentEntity, DeleteTarget } from '@/lib/dashboard-config'
import {
  createEntityAction,
  deleteEntityAction,
  getDashboardDataAction,
  updateEntityAction
} from '../dashboard/actions'

export default function FinancePage () {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<
    'loans' | 'subscriptions' | 'requests'
  >('loans')
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Data State
  const [loans, setLoans] = useState<DashboardLoan[]>([])
  const [subscriptions, setSubscriptions] = useState<DashboardSubscription[]>(
    []
  )
  const [requests, setRequests] = useState<DashboardLoanRequest[]>([])

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
  const filteredLoans = useMemo(() => {
    if (!searchTerm) return loans
    const lowerTerm = searchTerm.toLowerCase()
    return loans.filter(
      l =>
        l.user.name?.toLowerCase().includes(lowerTerm) ||
        l.user.username.toLowerCase().includes(lowerTerm) ||
        l.user.email.toLowerCase().includes(lowerTerm) ||
        (l.book?.title || '').toLowerCase().includes(lowerTerm)
    )
  }, [loans, searchTerm])

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

  const filteredRequests = useMemo(() => {
    if (!searchTerm) return requests
    const lowerTerm = searchTerm.toLowerCase()
    return requests.filter(
      r =>
        r.user.name.toLowerCase().includes(lowerTerm) ||
        r.user.email.toLowerCase().includes(lowerTerm) ||
        r.book.title.toLowerCase().includes(lowerTerm)
    )
  }, [requests, searchTerm])

  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1. Charger les données principales
      if (activeTab === 'loans') {
        const res = await getDashboardDataAction('loans')
        if (res.success && res.data) setLoans(res.data as DashboardLoan[])
      } else if (activeTab === 'subscriptions') {
        const res = await getDashboardDataAction('subscriptions')
        if (res.success && res.data)
          setSubscriptions(res.data as DashboardSubscription[])
      } else if (activeTab === 'requests') {
        const res = await getDashboardDataAction('requests')
        if (res.success && res.data)
          setRequests(res.data as DashboardLoanRequest[])
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
      if (booksList.length === 0 && activeTab === 'loans') {
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
          currentEntity.type,
          currentEntity.id,
          currentEntity.data
        )
      } else {
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

        <div className='flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg'>
          <button
            onClick={() => setActiveTab('loans')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'loans'
                ? 'bg-white dark:bg-muted shadow text-orange-600 dark:text-orange-400'
                : 'text-slate-500 hover:text-muted-foreground'
            }`}
          >
            <HandCoins className='w-4 h-4' /> Prêts
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'subscriptions'
                ? 'bg-white dark:bg-muted shadow text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 hover:text-muted-foreground'
            }`}
          >
            <CreditCard className='w-4 h-4' /> Abonnements
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-muted shadow text-primary'
                : 'text-slate-500 hover:text-muted-foreground'
            }`}
          >
            <Clock className='w-4 h-4' /> Requêtes
          </button>

        </div>
      </header>

      {/* CONTENU */}
      <main className='flex-1 max-w-7xl w-full mx-auto p-6'>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6'>
          <h2 className='text-lg font-semibold text-slate-800 dark:text-slate-200'>
            {activeTab !== 'subscriptions'
              ? 'Registre des Prêts'
              : 'Liste des Abonnements'}
          </h2>

          <div className='flex items-center gap-2 w-full sm:w-auto'>
            {/* BARRE DE RECHERCHE */}
            <div className='relative flex-1 sm:w-64'>
              <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-slate-400' />
              <Input
                placeholder={
                  activeTab === 'loans'
                    ? 'Rechercher un prêt, un livre...'
                    : 'Rechercher un abonné...'
                }
                className='pl-9 h-10'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

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
            {
              activeTab !== 'requests' && isAuthorized(UserRole.LIBRARIAN) && (
            
            <Button
              onClick={() => {
                setCurrentEntity({
                  type: activeTab,
                  data: {} as FinanceEntityData,
                  isEditing: false
                })
                setIsDialogOpen(true)
              }}
              className={`shrink-0 ${
                activeTab === 'loans'
                  ? 'bg-orange-600 hover:bg-orange-700 text-white dark:bg-[orangered]/80 dark:hover:bg-[orangered] dark:text-[#050100]'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-emerald-950'
              }`}
            >
              <Plus className='w-4 h-4 mr-2' />
              <span className='hidden sm:inline'>
                {activeTab === 'loans' ? 'Nouveau Prêt' : 'Nouvel Abonnement'}
              </span>
              <span className='sm:hidden'>Nouveau</span>
            </Button>)}
          </div>
        </div>

        <FinanceTable
          data={
            activeTab === 'loans'
              ? filteredLoans
              : activeTab === 'subscriptions'
              ? filteredSubscriptions
              : filteredRequests
          }
          activeTab={activeTab}
          isLoading={loading}
          onMarkReturned={handleMarkReturned}
          onEdit={item => {
            let formData: Record<string, unknown> = {}
            if (activeTab === 'loans') {
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
        />
      </main>

      {/* DIALOG FORMULAIRE */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>
              {currentEntity?.isEditing ? 'Modifier' : 'Créer'}{' '}
              {activeTab === 'loans' ? 'un prêt' : 'un abonnement'}
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
