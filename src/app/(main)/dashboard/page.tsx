/* eslint-disable @typescript-eslint/ban-ts-comment */
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
  UserCog,
  Edit,
  UserPlus
} from 'lucide-react'

// --- 1. IMPORTS DES COMPOSANTS UI ---
import { Button } from '@/components/ui/button'
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
  ApiResponse,
  UserRole,
  DashboardUser,
  DashboardFaculty,
  DashboardDepartment,
  DashboardStudyArea,
  DashBoardAuthorProfile,
  BookSchema
} from '@/lib/types'
import { Session } from 'lucia'

// --- 3. NOUVEAUX COMPOSANTS SEPARÉS ---
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardForm } from '@/components/dashboard/DashboardForm'
import { DashboardTable } from '@/components/dashboard/DashboardTable'
import { NAV_ITEMS, CurrentEntity, DeleteTarget } from '@/lib/dashboard-config'
import React from 'react'

export default function DashboardPage() {
  // --- STATE UI ---
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<EntityType>('books')
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
      const response = await kyInstance
        .get('/api/auth')
        .json<{ user: DashboardUser | null; session: Session }>()
      setCurrentUser(response.user)
    } catch (err) {
      console.error('Auth check failed', err)
      setCurrentUser(null)
    } finally {
      setIsAuthLoading(false)
    }
  }, [])

  const fetchData = useCallback(async (entity: EntityType) => {
    setLoading(true)
    try {
      const response: ApiResponse<EntityData[]> = await kyInstance
        .get(`/api/dashboard?type=${entity}`)
        .json()
      if (response.success) {
        setData(prev => ({ ...prev, [entity]: response.data }))
        if (entity === 'author_profiles') {
          setAuthorProfiles(response.data as unknown as DashBoardAuthorProfile[])
        }
      } else {
        showToast(response.message || 'Erreur de chargement', 'destructive')
      }
    } catch (err) {
      showToast(`Erreur: ${(err as Error).message}`, 'destructive')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleAction = useCallback(async () => {
    if (!currentEntity) return
    setLoading(true)

    const method = currentEntity.isEditing ? 'PATCH' : 'POST'
    const payload = {
      type: currentEntity.type,
      id: currentEntity.isEditing ? currentEntity.id : undefined,
      data: currentEntity.data
    }

    try {
      const response: ApiResponse<EntityData> = await kyInstance(
        `/api/dashboard`,
        { method, json: payload }
      ).json()
      if (response.success) {
        if (
          currentEntity.type === 'author_profiles' ||
          currentEntity.type === 'create_ghost_author'
        ) {
          await fetchData('users')
          await fetchData('author_profiles')
        } else {
          await fetchData(currentEntity.type)
        }

        setIsFormDialogOpen(false)
        showToast(response.message || 'Opération réussie', 'default')
        if (['faculties', 'departments', 'studyareas'].includes(currentEntity.type)) {
          fetchData('faculties')
          fetchData('departments')
          fetchData('studyareas')
        }
      } else {
        showToast(response.message || "Erreur lors de l'opération", 'destructive')
      }
    } catch (err) {
      showToast(`Erreur technique: ${(err as Error).message}`, 'destructive')
    } finally {
      setLoading(false)
    }
  }, [currentEntity, fetchData])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setLoading(true)
    setIsDeleteDialogOpen(false)

    try {
      const response: ApiResponse<null> = await kyInstance(`/api/dashboard`, {
        method: 'DELETE',
        json: { type: deleteTarget.type, id: deleteTarget.id }
      }).json()

      if (response.success) {
        await fetchData(deleteTarget.type)
        showToast(response.message || 'Suppression réussie', 'default')
        if (['faculties', 'departments', 'studyareas'].includes(deleteTarget.type)) {
          fetchData('faculties')
          fetchData('departments')
          fetchData('studyareas')
        }
      } else {
        showToast(response.message || 'Erreur de suppression', 'destructive')
      }
    } catch (err) {
      showToast(`Erreur: ${(err as Error).message}`, 'destructive')
    } finally {
      setLoading(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget, fetchData])

  // --- EFFECTS ---
  useEffect(() => {
    fetchAuthStatus()
  }, [fetchAuthStatus])

  useEffect(() => {
    if (!isAuthLoading && currentUser) {
      fetchData(activeTab)
      if (activeTab === 'books') {
        fetchData('faculties')
        fetchData('departments')
        fetchData('studyareas')
        fetchData('author_profiles')
      }
      if (activeTab === 'departments') fetchData('faculties')
    }
  }, [activeTab, fetchData, isAuthLoading, currentUser])

  useEffect(() => {
    if (currentEntity?.type === 'books') {
      const bk = currentEntity.data as Partial<BookSchema>
      const id = bk.documentFile ? bk.documentFile.id : null
      const name = bk.documentFile ? bk.documentFile.name : null
      setUploadedFileId(id)
      setUploadedFileName(name)
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
          <Button className='w-full bg-blue-600 hover:bg-blue-700 text-white'>
            Se connecter
          </Button>
        </div>
      </div>
    )

  const activeNavLabel =
    NAV_ITEMS.find(n => n.type === activeTab)?.label || 'Tableau de bord'
    

  return (
    <div className='flex h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] w-full overflow-y-auto bg-slate-100 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200'>
      
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
      <div className='flex-1 flex flex-col relative h-full overflow-hidden'>
        {/* Top Bar */}
        <header className='bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 shadow-sm z-10'>
          <div className='flex items-center gap-4'>
            {!sidebarOpen && (
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className='w-5 h-5 text-slate-600 dark:text-slate-300' />
              </Button>
            )}
            <h1 className='text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wide flex items-center gap-2'>
              {/* @ts-expect-error */}
              {React.createElement(NAV_ITEMS.find(n => n.type === activeTab)?.icon)}
              {activeNavLabel}
            </h1>
          </div>

          <div className='flex items-center gap-2'>
            <div className='relative hidden md:block'>
              <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500' />
              <Input
                placeholder='Rechercher...'
                className='pl-9 w-64 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500 dark:text-white dark:placeholder:text-slate-500'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                fetchData(activeTab)
              }}
              disabled={loading}
              className='flex gap-2 items-center dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className='hidden sm:inline'>Actualiser</span>
            </Button>
            {activeTab === 'create_ghost_author' && isAuthorized(UserRole.LIBRARIAN) && (
              <Button
                size='sm'
                className=''
                onClick={() => {
                  setCurrentEntity({
                    type: 'create_ghost_author',
                    // @ts-expect-error dynamic
                    data: { id: '', name: '', biography: '' },
                    isEditing: false
                  })
                  setIsFormDialogOpen(true)
                }}
              >
                <UserPlus className='w-4 h-4' /> <span className='hidden sm:inline'>Auteur</span>
              </Button>
            )}
            {((activeTab === 'books' && isAuthorized(UserRole.AUTHOR)) ||
              (['faculties', 'departments', 'studyareas'].includes(activeTab) &&
                isAuthorized(UserRole.LIBRARIAN))) && (
              <Button
                size='sm'
                className='bg-blue-600 hover:bg-blue-700 text-white flex gap-2 items-center'
                onClick={() => {
                  setCurrentEntity({
                    type: activeTab,
                    data: {} as unknown as EntityData,
                    isEditing: false
                  })
                  setIsFormDialogOpen(true)
                }}
              >
                <Plus className='w-4 h-4' />
                <span className='hidden sm:inline'>Nouveau</span>
              </Button>
            )}
          </div>
        </header>

        {/* Data Content */}
        <main className='flex-1 overflow-auto p-4 bg-slate-100 dark:bg-slate-950 relative'>
          <DashboardTable
            data={data[activeTab] || []}
            activeTab={activeTab}
            searchTerm={searchTerm}
            loading={loading}
            currentUser={currentUser}
            isAuthorized={isAuthorized}
            onEdit={(item) => {
               const entityToEdit = { ...item }
               if (activeTab === 'books') {
                 /* @ts-expect-error dynamic */
                 entityToEdit.studyAreaIds = item.studyAreas?.map(
                     (s: { studyArea: { id: string } }) => s.studyArea.id
                   ) || []
                 /* @ts-expect-error dynamic */
                 entityToEdit.publicationYear = new Date(item.postedAt)
                 /* @ts-expect-error dynamic */
                 entityToEdit.type = item.type
               }
               setCurrentEntity({
                 type: activeTab,
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
                // @ts-expect-error dynamic
                data: { userId },
                isEditing: false
              })
              setIsFormDialogOpen(true)
            }}
          />
        </main>
      </div>

      {/* --- DIALOGUES --- */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className='sm:max-w-[600px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-blue-600 dark:text-blue-400'>
              {currentEntity?.isEditing ? (
                <Edit className='w-5 h-5' />
              ) : (
                <Plus className='w-5 h-5' />
              )}
              {currentEntity?.type === 'author_profiles'
                ? 'Créer un profil auteur'
                : `${currentEntity?.isEditing ? 'Modifier' : 'Ajouter'} ${
                    NAV_ITEMS.find(n => n.type === currentEntity?.type)?.label || ""
                  }`}
            </DialogTitle>
            <DialogDescription className='dark:text-slate-400'>
              Remplissez les informations ci-dessous pour mettre à jour la base de données.
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

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsFormDialogOpen(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            {/* Masquer le bouton Enregistrer si on est en train de créer une zone d'étude (redirection map) */}
            {!(currentEntity?.type === 'studyareas' && !currentEntity.isEditing) && (
              <Button onClick={handleAction} disabled={loading}>
                {loading && <Loader2 className='w-4 h-4 animate-spin' />}
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
            <Button
              variant='outline'
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant='destructive'
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Suppression...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}