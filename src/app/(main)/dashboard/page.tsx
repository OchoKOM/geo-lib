'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus,
  Search,
  RefreshCw,
  Loader2,
  Menu,
  AlertCircle,
  Ban,
  Edit,
  ChevronRight,
  LayoutDashboard
} from 'lucide-react'

// --- 1. IMPORTS UI ---
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { showToast } from '@/hooks/useToast'
import { useAuth } from '@/components/AuthProvider'

// --- 2. LOGIQUE API & TYPES ---
import kyInstance from '@/lib/ky' 
import {
  EntityType,
  EntityData,
  UserRole,
  DashboardUser,
  DashboardFaculty,
  DashboardDepartment,
  DashboardStudyArea,
  DashBoardAuthorProfile,
  BookSchema,
  DashboardStats
} from '@/lib/types'
import { Session } from 'lucia'

// --- 3. ACTIONS SERVEUR ---
import { 
  getDashboardDataAction, 
  createEntityAction, 
  updateEntityAction, 
  deleteEntityAction,
  getDashboardStatsAction
} from './actions'

// --- 4. COMPOSANTS ---
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardForm } from '@/components/dashboard/DashboardForm'
import { DashboardTable } from '@/components/dashboard/DashboardTable'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { NAV_ITEMS, CurrentEntity, DeleteTarget } from '@/lib/dashboard-config'
import React from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function DashboardPage() {
  // --- STATE UI ---
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<EntityType | 'overview'>('overview')
  const [searchTerm, setSearchTerm] = useState('')

  // --- STATE DATA ---
  const [data, setData] = useState<Record<EntityType, EntityData[]>>({
    books: [],
    users: [],
    departments: [],
    faculties: [],
    studyareas: [],
    author_profiles: [],
    create_ghost_author: []
  })
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [authorProfiles, setAuthorProfiles] = useState<DashBoardAuthorProfile[]>([])
  const { user } = useAuth()
  const dashboardUser = user as DashboardUser | null
  const [currentUser, setCurrentUser] = useState<DashboardUser | null>(dashboardUser)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [loading, setLoading] = useState(false)

  // --- STATE ACTIONS ---
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [currentEntity, setCurrentEntity] = useState<CurrentEntity | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  // --- STATE UPLOAD ---
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

  const faculties = data.faculties as DashboardFaculty[]
  const departments = data.departments as DashboardDepartment[]
  const studyAreas = data.studyareas as DashboardStudyArea[]

  // --- CONFIG THEME ACTUEL ---
  const activeNavItem = NAV_ITEMS.find(n => n.type === activeTab)
  const activeTheme = activeNavItem?.theme || NAV_ITEMS[0].theme

  // --- HELPERS AUTORISATIONS ---
  const userRoleIndex = useMemo(
    () => (currentUser ? Object.values(UserRole).indexOf(currentUser.role) : -1),
    [currentUser]
  )

  const isAuthorized = useCallback(
    (requiredRole: UserRole) => {
      if (!currentUser) return false
      return userRoleIndex >= Object.values(UserRole).indexOf(requiredRole)
    },
    [currentUser, userRoleIndex]
  )

  // --- API CALLS ---
  const fetchAuthStatus = useCallback(async () => {
    try {
      const response = await kyInstance.get('/api/auth').json<{ user: DashboardUser | null; session: Session }>()
      setCurrentUser(response.user)
    } catch (err) {
      console.error('Auth check failed', err)
      setCurrentUser(null)
    } finally {
      setIsAuthLoading(false)
    }
  }, [])

  const fetchData = useCallback(async (entity: EntityType | 'overview') => {
    setLoading(true)
    try {
      if (entity === 'overview') {
        const response = await getDashboardStatsAction()
        // @ts-expect-error dynamic
        if (response.success) setStats(response.data)
      } else {
        const response = await getDashboardDataAction(entity)
        if (response.success && response.data) {
          setData(prev => ({ ...prev, [entity]: response.data }))
          if (entity === 'author_profiles') {
            setAuthorProfiles(response.data as unknown as DashBoardAuthorProfile[])
          }
        }
      }
    } catch (err) {
      showToast(`Erreur: ${(err as Error).message}`, 'destructive')
    } finally {
      setLoading(false)
    }
  }, [])

  // --- ACTIONS HANDLERS ---
  const handleAction = useCallback(async () => {
    if (!currentEntity) return
    setLoading(true)

    try {
      let response
      if (currentEntity.isEditing && currentEntity.id) {
        response = await updateEntityAction(currentEntity.type, currentEntity.id, currentEntity.data)
      } else {
        response = await createEntityAction(currentEntity.type, currentEntity.data)
      }

      if (response.success) {
        if (['faculties', 'departments', 'studyareas'].includes(currentEntity.type)) {
            fetchData('faculties')
            fetchData('departments')
            fetchData('studyareas')
        }
        // Toujours recharger l'entité courante
        if (activeTab !== 'overview') fetchData(activeTab)
        
        setIsFormDialogOpen(false)
        showToast(response.message || 'Opération réussie', 'default')
      } else {
        showToast(response.message || "Erreur lors de l'opération", 'destructive')
      }
    } catch (err) {
      showToast(`Erreur technique: ${(err as Error).message}`, 'destructive')
    } finally {
      setLoading(false)
    }
  }, [currentEntity, fetchData, activeTab])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setLoading(true)
    setIsDeleteDialogOpen(false)

    try {
      const response = await deleteEntityAction(deleteTarget.type, deleteTarget.id)
      if (response.success) {
        if (activeTab !== 'overview') fetchData(activeTab)
        showToast(response.message || 'Suppression réussie', 'default')
      } else {
        showToast(response.message || 'Erreur de suppression', 'destructive')
      }
    } catch (err) {
      showToast(`Erreur: ${(err as Error).message}`, 'destructive')
    } finally {
      setLoading(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget, fetchData, activeTab])

  // --- EFFECTS ---
  useEffect(() => {
    fetchAuthStatus()
  }, [fetchAuthStatus])

  useEffect(() => {
    if (!isAuthLoading && currentUser) {
      fetchData(activeTab)
      // Charger les dépendances pour les formulaires si nécessaire
      if (activeTab === 'books') {
        fetchData('faculties')
        fetchData('departments')
        fetchData('studyareas')
        fetchData('author_profiles')
      }
    }
  }, [activeTab, fetchData, isAuthLoading, currentUser])

  useEffect(() => {
    if (currentEntity?.type === 'books') {
      const bk = currentEntity.data as Partial<BookSchema>
      const id = bk.documentFile ? bk.documentFile.id : null
      const name = bk.documentFile ? bk.documentFile.name : null
      setUploadedFileId(id || null)
      setUploadedFileName(name || null)
    } else {
      setUploadedFileId(null)
      setUploadedFileName(null)
    }
  }, [currentEntity])

  // --- RENDU PRINCIPAL ---
  if (isAuthLoading)
    return (
      <div className='h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950'>
        <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
      </div>
    )
  if (!currentUser)
    return (
      <div className='h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4'>
        <div className='bg-white dark:bg-slate-900 p-8 rounded-lg shadow-xl text-center max-w-md border border-slate-200 dark:border-slate-800'>
          <Ban className='w-12 h-12 text-red-500 mx-auto mb-4' />
          <h1 className='text-xl font-bold text-slate-800 dark:text-white mb-2'>
            Accès Refusé
          </h1>
          <p className='text-slate-500 dark:text-slate-400 mb-6'>
            Vous devez être connecté pour accéder au tableau de bord administratif.
          </p>
          <Link href="/login" className={buttonVariants()}>
            Se connecter
          </Link>
        </div>
      </div>
    )

    if (currentUser.role === UserRole.READER)
      return (
        <div className='h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4'>
          <div className='bg-white dark:bg-slate-900 p-8 rounded-lg shadow-xl text-center max-w-md border border-slate-200 dark:border-slate-800'>
            <Ban className='w-12 h-12 text-red-500 mx-auto mb-4' />
            <h1 className='text-xl font-bold text-slate-800 dark:text-white mb-2'>
              Accès Refusé
            </h1>
            <p className='text-slate-500 dark:text-slate-400 mb-6'>
              Vous n&apos;avez pas les autorisations nécessaires pour accéder au tableau de bord administratif.
            </p>
            <Link href="/login" className={buttonVariants()}>
              Se connecter
            </Link>
          </div>
        </div>
      )

  return (
    <div className='flex max-h-[calc(100vh-64px)] h-[calc(100vh-64px)] w-full bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 overflow-hidden'>
      
      {/* 1. SIDEBAR */}
      <DashboardSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAuthorized={isAuthorized}
      />

      {/* 2. MAIN CONTENT AREA */}
      <div className='relative flex-1 flex flex-col h-full overflow-hidden'>
        
        {/* TOP BAR */}
        <header className='sticky top-0 h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0'>
          <div className='flex items-center gap-4'>
            {!sidebarOpen && (
              <Button variant='ghost' size='icon' onClick={() => setSidebarOpen(true)}>
                <Menu className='w-5 h-5 text-slate-600 dark:text-slate-300' />
              </Button>
            )}
            
            {/* Breadcrumb visuel */}
            <div className='flex items-center text-sm text-slate-500 dark:text-slate-400'>
              <div className='flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer' onClick={() => setActiveTab('overview')}>
                <LayoutDashboard className='w-4 h-4' />
                <span className='hidden sm:inline'>Tableau de bord</span>
              </div>
              {activeTab !== 'overview' && (
                <>
                  <ChevronRight className='w-4 h-4 mx-1 text-slate-300' />
                  <span className={cn('font-medium', activeTheme.primary)}>{activeNavItem?.label}</span>
                </>
              )}
            </div>
          </div>

          <div className='flex items-center gap-3'>
            {activeTab !== 'overview' && (
              <div className='relative hidden md:block'>
                <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-slate-400' />
                <Input
                  placeholder='Filtrer...'
                  className='pl-9 w-64 bg-slate-50 border-slate-200 focus:bg-white transition-all dark:bg-slate-800 dark:border-slate-700'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            )}
            
            <Button
              variant='outline'
              size='icon'
              onClick={() => fetchData(activeTab)}
              disabled={loading}
              title="Rafraîchir"
              className='text-slate-500'
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>

            {/* BOUTON D'ACTION PRINCIPAL */}
            {activeTab !== 'overview' && activeTab !== 'users' && (
              <Button
                size='sm'
                className={cn(
                  "text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105", 
                  activeTheme.primary.replace('text-', 'bg-').split(' ')[0]
                )}
                onClick={() => {
                  setCurrentEntity({
                    type: activeTab as EntityType,
                    data: {} as unknown as EntityData,
                    isEditing: false
                  })
                  setIsFormDialogOpen(true)
                }}
              >
                <Plus className='w-4 h-4 mr-2' />
                Nouveau
              </Button>
            )}
          </div>
        </header>

        {/* CONTENT SCROLLABLE */}
        <main className='flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950 max-h-full'>
          <div className='max-w-7xl mx-auto flex flex-col gap-6'>
            
            {/* Titre de Section Dynamique */}
            <div className="">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {activeNavItem?.label}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                {activeTab === 'overview' 
                  ? 'Bienvenue sur votre espace de gestion. Voici ce qui se passe aujourd\'hui.'
                  : `Gérez la liste des ${activeNavItem?.label.toLowerCase()} enregistrés.`
                }
              </p>
            </div>

            {activeTab === 'overview' ? (
              <DashboardOverview 
                stats={stats} 
                loading={loading} 
                onNavigate={setActiveTab} 
              />
            ) : (
              <DashboardTable
                data={data[activeTab as EntityType] || []}
                activeTab={activeTab as EntityType}
                activeTheme={activeTheme}
                searchTerm={searchTerm}
                loading={loading}
                currentUser={currentUser}
                isAuthorized={isAuthorized}
                onEdit={(item) => {
                   const entityToEdit = { ...item }
                   if (activeTab === 'books') {
                     /* @ts-expect-error dynamic */
                     entityToEdit.studyAreaIds = item.studyAreas?.map((s) => s.studyArea.id) || []
                     /* @ts-expect-error dynamic */
                     entityToEdit.publicationYear = new Date(item.postedAt)
                     /* @ts-expect-error dynamic */
                     entityToEdit.type = item.type
                   }
                   setCurrentEntity({
                     type: activeTab as EntityType,
                     data: entityToEdit,
                     isEditing: true,
                     id: item.id
                   })
                   setIsFormDialogOpen(true)
                }}
                onDelete={(target) => {
                  setDeleteTarget(target)
                  setIsDeleteDialogOpen(true)
                }}
                onCreateAuthor={(userId) => {
                  setCurrentEntity({
                    type: 'author_profiles',
                    data: { userId },
                    isEditing: false
                  })
                  setIsFormDialogOpen(true)
                }}
              />
            )}
          </div>
        </main>
      </div>

      {/* --- DIALOGUES (MODALS) --- */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className='sm:max-w-[600px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl'>
          <DialogHeader>
            <DialogTitle className={cn('flex items-center gap-2 text-xl', activeTheme.primary)}>
              {currentEntity?.isEditing ? <Edit className='w-5 h-5' /> : <Plus className='w-5 h-5' />}
              {currentEntity?.isEditing ? 'Modifier' : 'Ajouter'} {NAV_ITEMS.find(n => n.type === currentEntity?.type)?.label}
            </DialogTitle>
            <DialogDescription className='dark:text-slate-400'>
              Modification en temps réel de la base de données.
            </DialogDescription>
          </DialogHeader>

          <div className='py-4'>
            {currentEntity && (
              <DashboardForm
                currentEntity={currentEntity}
                setCurrentEntity={setCurrentEntity}
                faculties={faculties}
                departments={departments}
                studyAreas={studyAreas}
                authorProfiles={authorProfiles}
                isAuthorized={isAuthorized}
                uploadedFileId={uploadedFileId}
                setUploadedFileId={setUploadedFileId}
                uploadedFileName={uploadedFileName}
                setUploadedFileName={setUploadedFileName}
              />
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant='outline' onClick={() => setIsFormDialogOpen(false)} disabled={loading}>
              Annuler
            </Button>
            {!(currentEntity?.type === 'studyareas' && !currentEntity.isEditing) && (
              <Button onClick={handleAction} disabled={loading} className={cn(activeTheme.primary.replace('text-', 'bg-').split(' ')[0], "text-white hover:opacity-90")}>
                {loading && <Loader2 className='w-4 h-4 animate-spin mr-2' />}
                Enregistrer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className='max-w-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'>
          <DialogHeader>
            <DialogTitle className='text-red-600 flex items-center gap-2'>
              <AlertCircle className='w-5 h-5' /> Suppression Critique
            </DialogTitle>
            <DialogDescription className='pt-2 dark:text-slate-400'>
              Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant='destructive' onClick={handleDelete} disabled={loading}>
              {loading ? '...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}