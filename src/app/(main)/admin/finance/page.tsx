/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CreditCard,
  Calendar,
  Wallet,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Loader2,
  Search,
  ArrowRightLeft,
  RefreshCw,
  MoreVertical,
  Banknote
} from 'lucide-react'

// Imports UI (adapter les chemins selon votre structure)
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/components/AuthProvider'
import kyInstance from '@/lib/ky'
import { showToast } from '@/hooks/useToast'

// Types
import { 
    UserRole, 
    DashboardUser,
    DashboardLoan,
    DashboardSubscription,
    DashboardPayment,
    FinanceEntityType,
    ApiResponse,
    DashboardBook // Assurez-vous d'avoir exporté ce type
} from '@/lib/types'

// --- CONSTANTES ---
const TABS = [
  { id: 'profile', label: 'Mon Profil', icon: UserIcon, roles: [UserRole.READER, UserRole.AUTHOR, UserRole.LIBRARIAN, UserRole.ADMIN] },
  { id: 'loans', label: 'Gestion des Prêts', icon: ArrowRightLeft, roles: [UserRole.LIBRARIAN, UserRole.ADMIN] },
  { id: 'subscriptions', label: 'Abonnements', icon: Calendar, roles: [UserRole.LIBRARIAN, UserRole.ADMIN] },
  { id: 'payments', label: 'Paiements', icon: Wallet, roles: [UserRole.ADMIN] },
]

export default function FinancePage() {
  const { user } = useAuth()
  const currentUser = user as DashboardUser | null
  
  // States
  const [activeTab, setActiveTab] = useState<string>('profile')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Record<string, any[]>>({
    loans: [],
    subscriptions: [],
    payments: []
  })
  
  // Listes auxiliaires pour les formulaires
  const [userList, setUserList] = useState<DashboardUser[]>([])
  const [bookList, setBookList] = useState<DashboardBook[]>([])

  // Modal States
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<'create_loan' | 'create_payment' | 'manage_sub' | null>(null)
  const [formData, setFormData] = useState<any>({})

  // Helper Authorization
  const isAuthorized = useCallback((requiredRoles: UserRole[]) => {
    if (!currentUser) return false
    return requiredRoles.includes(currentUser.role)
  }, [currentUser])

  // --- API FETCHING ---
  const fetchData = useCallback(async (type: string) => {
    if (type === 'profile') return; // Pas de fetch global pour le profil
    
    setLoading(true)
    try {
      const res: ApiResponse<any[]> = await kyInstance.get(`/api/finance?type=${type}`).json()
      if (res.success) {
        setData(prev => ({ ...prev, [type]: res.data }))
      }
    } catch (e) {
      console.error(e)
      showToast("Erreur de chargement", "destructive")
    } finally {
      setLoading(false)
    }
  }, [])

  // Charger les listes utilisateurs/livres pour les selects
  const fetchAuxiliaryData = async () => {
    try {
        // On réutilise l'API dashboard existante pour récupérer les users et livres
        const usersRes: ApiResponse<DashboardUser[]> = await kyInstance.get('/api/dashboard?type=users').json();
        const booksRes: ApiResponse<DashboardBook[]> = await kyInstance.get('/api/dashboard?type=books').json();
        
        if(usersRes.success) setUserList(usersRes.data);
        if(booksRes.success) setBookList(booksRes.data.filter(b => b.available)); // Seulement livres dispos
    } catch (e) {
        console.error("Erreur chargement listes", e);
    }
  }

  useEffect(() => {
    if (activeTab !== 'profile' && isAuthorized([UserRole.ADMIN, UserRole.LIBRARIAN])) {
      fetchData(activeTab)
      fetchAuxiliaryData()
    }
  }, [activeTab, fetchData, isAuthorized])


  // --- ACTIONS ---
  const handleCreate = async () => {
    setLoading(true)
    try {
        let endpointType = '';
        if (dialogType === 'create_loan') endpointType = 'loans';
        if (dialogType === 'create_payment') endpointType = 'payments';
        if (dialogType === 'manage_sub') endpointType = 'subscriptions';

        const res: ApiResponse<any> = await kyInstance.post('/api/finance', {
            json: { type: endpointType, data: formData }
        }).json()

        if (res.success) {
            showToast("Opération réussie", "default")
            setIsDialogOpen(false)
            fetchData(endpointType)
            // Rafraichir la liste des livres si un prêt a été fait
            if (endpointType === 'loans') fetchAuxiliaryData(); 
        } else {
            showToast(res.message || "Erreur", "destructive")
        }
    } catch (e) {
        showToast("Erreur serveur", "destructive")
    } finally {
        setLoading(false)
    }
  }

  const handleReturnBook = async (loanId: string) => {
      if(!confirm("Confirmer le retour du livre ?")) return;
      try {
          const res: ApiResponse<null> = await kyInstance.patch('/api/finance', {
              json: { type: 'loans', id: loanId, action: 'return' }
          }).json()
          if(res.success) {
              showToast("Livre retourné", "default");
              fetchData('loans');
          }
      } catch(e) { showToast("Erreur retour", "destructive") }
  }


  // --- RENDERERS ---

  // 1. PROFIL
  const renderProfile = () => {
    if (!currentUser) return null
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-500">
        {/* Carte d'identité */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-blue-100 dark:border-blue-900">
              <AvatarImage src={currentUser.avatarUrl || ''} />
              <AvatarFallback className="text-xl bg-blue-600 text-white">
                {currentUser.username.substring(0,2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{currentUser.name || currentUser.username}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant={currentUser.role === 'ADMIN' ? 'destructive' : 'secondary'}>
                    {currentUser.role}
                </Badge>
                {currentUser.isSuspended && <Badge variant="outline" className="text-red-500 border-red-200">Suspendu</Badge>}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase">Email</label>
              <p className="text-sm font-medium dark:text-slate-200">{currentUser.email}</p>
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase">Membre depuis</label>
              <p className="text-sm font-medium dark:text-slate-200">
                {currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            {/* Si c'est un auteur, afficher sa bio */}
            {currentUser.authorProfile && (
                 <div className="grid gap-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-100 dark:border-slate-700">
                 <label className="text-xs font-medium text-slate-500 uppercase mb-1">Biographie Auteur</label>
                 <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-4">
                   {currentUser.authorProfile.biography}
                 </p>
               </div>
            )}
          </CardContent>
        </Card>

        {/* Statistiques (Mock pour l'exemple, à connecter si besoin) */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-blue-500"/> Mes Emprunts</CardTitle></CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">0</div>
                <p className="text-xs text-slate-500">Livres en cours d&apos;emprunt</p>
            </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-green-500"/> Abonnement</CardTitle></CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-slate-400"/>
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Inactif</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">Aucun abonnement actif trouvé.</p>
            </CardContent>
        </Card>
      </div>
    )
  }

  // 2. LOANS TABLE
  const renderLoans = () => (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-blue-600"/> Prêts en cours et Historique</h2>
              <Button onClick={() => { setDialogType('create_loan'); setFormData({}); setIsDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2"/> Nouveau Prêt
              </Button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs">
                      <tr>
                          <th className="px-6 py-3">Livre</th>
                          <th className="px-6 py-3">Emprunteur</th>
                          <th className="px-6 py-3">Dates</th>
                          <th className="px-6 py-3">Statut</th>
                          <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.loans.map((loan: DashboardLoan) => {
                          const isOverdue = !loan.returnDate && new Date() > new Date(loan.dueDate);
                          return (
                            <tr key={loan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                <td className="px-6 py-4 font-medium">{loan.book?.title || 'Livre supprimé'}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-900 dark:text-slate-200">{loan.user.name}</span>
                                        <span className="text-xs text-slate-500">@{loan.user.username}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                                    <div>Du: {loan.loanDate.getDate()}</div>
                                    <div>Au: {loan.loanDate.getDate()}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {loan.returnDate ? (
                                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Retourné</Badge>
                                    ) : isOverdue ? (
                                        <Badge variant="destructive">En Retard</Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">En cours</Badge>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {!loan.returnDate && (
                                        <Button size="sm" variant="outline" onClick={() => handleReturnBook(loan.id)}>
                                            <CheckCircle2 className="w-4 h-4 mr-1 text-green-600"/> Retour
                                        </Button>
                                    )}
                                </td>
                            </tr>
                          )
                      })}
                  </tbody>
              </table>
          </div>
      </div>
  )

  // 3. SUBSCRIPTIONS TABLE
  const renderSubscriptions = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-600"/> Gestion des Abonnements</h2>
            <Button onClick={() => { setDialogType('manage_sub'); setFormData({}); setIsDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2"/> Gérer Abonnement
            </Button>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.subscriptions.map((sub: DashboardSubscription) => (
                <Card key={sub.id} className="border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <CardTitle className="text-base">{sub.user.name}</CardTitle>
                            <Badge variant={sub.isActive ? 'default' : 'secondary'} className={sub.isActive ? 'bg-green-600' : ''}>
                                {sub.isActive ? 'Actif' : 'Inactif'}
                            </Badge>
                        </div>
                        <CardDescription>@{sub.user.username}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm space-y-2 mt-2">
                            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                <span className="text-slate-500">Début</span>
                                <span className="font-mono">{sub.startDate.getDate()}</span>
                            </div>
                            <div className="flex justify-between pt-2">
                                <span className="text-slate-500">Expiration</span>
                                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{sub.endDate.getDate()}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
  )

  // 4. PAYMENTS TABLE
  const renderPayments = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
         <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold flex items-center gap-2"><Banknote className="w-5 h-5 text-emerald-600"/> Historique des Paiements</h2>
            <Button onClick={() => { setDialogType('create_payment'); setFormData({}); setIsDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2"/> Encaisser
            </Button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs">
                      <tr>
                          <th className="px-6 py-3">Utilisateur</th>
                          <th className="px-6 py-3">Montant</th>
                          <th className="px-6 py-3">Motif</th>
                          <th className="px-6 py-3">Date</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.payments.map((pay: DashboardPayment) => (
                          <tr key={pay.id}>
                              <td className="px-6 py-4 font-medium">{pay.user.name}</td>
                              <td className="px-6 py-4 font-bold text-emerald-600">{Number(pay.amount).toFixed(2)} $</td>
                              <td className="px-6 py-4">
                                  {pay.reason}
                                  {pay.loan && <span className="block text-xs text-slate-400">Livre: {pay.loan.book?.title}</span>}
                              </td>
                              <td className="px-6 py-4 text-slate-500">{pay.paymentDate.getDate()}</td>
                          </tr>
                      ))}
                  </tbody>
            </table>
        </div>
    </div>
  )

  // --- RENDU FORMULAIRES DIALOG ---
  const renderDialogForm = () => {
      switch(dialogType) {
          case 'create_loan':
              return (
                  <div className="space-y-4">
                      <div className="space-y-2">
                          <label className="text-sm font-medium">Livre</label>
                          <Select onValueChange={(v) => setFormData({...formData, bookId: v})}>
                              <SelectTrigger><SelectValue placeholder="Choisir un livre disponible"/></SelectTrigger>
                              <SelectContent>
                                  {bookList.map(b => (
                                      <SelectItem key={b.id} value={b.id}>{b.title} ({b.department?.name})</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-medium">Emprunteur</label>
                          <Select onValueChange={(v) => setFormData({...formData, userId: v})}>
                              <SelectTrigger><SelectValue placeholder="Choisir un utilisateur"/></SelectTrigger>
                              <SelectContent>
                                  {userList.map(u => (
                                      <SelectItem key={u.id} value={u.id}>{u.name} (@{u.username})</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-medium">Date retour prévue</label>
                          <Input type="date" onChange={(e) => setFormData({...formData, dueDate: e.target.value})} />
                      </div>
                  </div>
              )
           case 'manage_sub':
               return (
                   <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Utilisateur</label>
                          <Select onValueChange={(v) => setFormData({...formData, userId: v})}>
                              <SelectTrigger><SelectValue placeholder="Choisir un utilisateur"/></SelectTrigger>
                              <SelectContent>
                                  {userList.map(u => (
                                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-medium">Date d&apos;expiration (Renouvellement)</label>
                          <Input type="date" onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2">
                          <input type="checkbox" id="isActive" className="rounded" 
                            onChange={(e) => setFormData({...formData, isActive: e.target.checked})} />
                          <label htmlFor="isActive">Activer l&apos;abonnement immédiatement</label>
                      </div>
                   </div>
               )
            case 'create_payment':
                return (
                    <div className="space-y-4">
                        <Select onValueChange={(v) => setFormData({...formData, userId: v})}>
                              <SelectTrigger><SelectValue placeholder="Payeur"/></SelectTrigger>
                              <SelectContent>
                                  {userList.map(u => (
                                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                  ))}
                              </SelectContent>
                        </Select>
                        <Input type="number" placeholder="Montant" onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})} />
                        <Input placeholder="Motif (ex: Frais retard, Abonnement annuel)" onChange={(e) => setFormData({...formData, reason: e.target.value})} />
                    </div>
                )
          default: return null;
      }
  }


  // --- MAIN RENDER ---

  if (!currentUser) return <div className="p-8 text-center">Veuillez vous connecter.</div>

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <div className="container mx-auto max-w-7xl p-4 md:p-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Espace Membre & Finance</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Gérez votre profil et consultez les activités financières.
            </p>
          </div>
          <div className="flex gap-2 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              {TABS.map(tab => {
                  if (!isAuthorized(tab.roles)) return null;
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            isActive 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                          <Icon className="w-4 h-4"/>
                          <span className="hidden md:inline">{tab.label}</span>
                      </button>
                  )
              })}
          </div>
        </div>

        {/* Content Area */}
        <main className="min-h-[500px]">
            {activeTab === 'profile' && renderProfile()}
            {activeTab === 'loans' && renderLoans()}
            {activeTab === 'subscriptions' && renderSubscriptions()}
            {activeTab === 'payments' && renderPayments()}
        </main>

      </div>

      {/* Dialog Manager */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <DialogHeader>
                  <DialogTitle>
                      {dialogType === 'create_loan' && "Nouveau Prêt de Livre"}
                      {dialogType === 'create_payment' && "Enregistrer un Paiement"}
                      {dialogType === 'manage_sub' && "Gérer l'Abonnement"}
                  </DialogTitle>
                  <DialogDescription>
                      Remplissez les informations ci-dessous.
                  </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                  {renderDialogForm()}
              </div>

              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                  <Button onClick={handleCreate} disabled={loading}>
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                      Confirmer
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

    </div>
  )
}