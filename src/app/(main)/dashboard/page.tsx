/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client'

import { useState, useEffect, useMemo, useCallback, JSX } from 'react'
import {
  Book,
  Users,
  Building2,
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Loader2,
  Layers,
  Database,
  ChevronLeft,
  Menu,
  AlertCircle,
  Ban,
  MapPin,
  UserPlus,
  ArrowRight,
  FileText,
  CheckCircle2,
  XCircle,
  UserCog
} from 'lucide-react'

// --- 1. IMPORTS DES COMPOSANTS UI ---
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { showToast } from '@/hooks/useToast'
import { useAuth } from '@/components/AuthProvider'

// --- 2. LOGIQUE API & TYPES ---
import kyInstance from '@/lib/ky'
import {
  EntityType,
  EntityData,
  ApiResponse,
  UserRole,
  BookType,
  DashboardBook,
  DashboardDepartment,
  DashboardFaculty,
  DashboardStudyArea,
  DashboardUser,
  FacultySchema,
  DepartmentSchema,
  StudyAreaSchema,
  BookSchema,
  UserUpdateSchema,
  DashBoardAuthorProfile,
  GhostAuthorSchema
} from '@/lib/types'
import { Session } from 'lucia'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { UploadDropzone } from '@/lib/uploadthing'
import { cn } from '@/lib/utils'

// --- 3. TYPES LOCAUX ---

type CurrentEntity = {
  type: EntityType | 'author_profiles' // Added extended type for author profile creation
  data: EntityData // Relaxed type to handle author profile
  isEditing: boolean
  id?: string
}

type DeleteTarget = {
  type: EntityType
  id: string
}

// Configuration de la navigation
const NAV_ITEMS: {
  type: EntityType
  label: string
  icon: JSX.Element
  role?: UserRole
}[] = [
  {
    type: 'books',
    label: 'Travaux & Livres',
    icon: <Book className='w-4 h-4' />,
    role: UserRole.READER
  },
  {
    type: 'faculties',
    label: 'Facultés',
    icon: <GraduationCap className='w-4 h-4' />,
    role: UserRole.READER
  },
  {
    type: 'departments',
    label: 'Départements',
    icon: <Building2 className='w-4 h-4' />,
    role: UserRole.READER
  },
  {
    type: 'studyareas',
    label: "Zones d'Étude",
    icon: <Layers className='w-4 h-4' />,
    role: UserRole.READER
  },
  {
    type: 'users',
    label: 'Utilisateurs',
    icon: <Users className='w-4 h-4' />,
    role: UserRole.LIBRARIAN
  },
  {
    type: 'create_ghost_author',
    label: 'Profil auteur',
    icon: <UserPlus className='w-4 h-4' />,
    role: UserRole.LIBRARIAN
  }
]

export default function DashboardPage () {
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
  const [authorProfiles, setAuthorProfiles] = useState<
    DashBoardAuthorProfile[]
  >([])
  const { user } = useAuth()
  const dashboardUser = user as DashboardUser | null
  const [currentUser, setCurrentUser] = useState<DashboardUser | null>(
    dashboardUser
  )
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [loading, setLoading] = useState(false)

  // --- STATE ACTIONS ---
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [currentEntity, setCurrentEntity] = useState<CurrentEntity | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  // --- STATE UPLOAD ---
  // On stocke l'ID du fichier retourné par UploadThing (via core.ts -> prisma)
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

  const faculties = data.faculties as DashboardFaculty[]
  const departments = data.departments as DashboardDepartment[]
  const studyAreas = data.studyareas as DashboardStudyArea[]
  // const users = data.users as DashboardUser[] // Décommenter si besoin de liste users pour Select Auteur

  // --- HELPERS AUTORISATIONS ---
  const userRoleIndex = useMemo(
    () =>
      currentUser ? Object.values(UserRole).indexOf(currentUser.role) : -1,
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

  // --- API CALLS ---
  const fetchData = useCallback(async (entity: EntityType) => {
    setLoading(true)
    try {
      const response: ApiResponse<EntityData[]> = await kyInstance
        .get(`/api/dashboard?type=${entity}`)
        .json()
      if (response.success) {
        setData(prev => ({ ...prev, [entity]: response.data }))
        if (entity === 'author_profiles') {
          setAuthorProfiles(
            response.data as unknown as DashBoardAuthorProfile[]
          )
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
      // filtrer les champs undefined et null dans data
      data: currentEntity.data
    }
    

    try {
      const response: ApiResponse<EntityData> = await kyInstance(
        `/api/dashboard`,
        { method, json: payload }
      ).json()
      if (response.success) {
        // Rafraîchissement des données
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
        if (
          ['faculties', 'departments', 'studyareas'].includes(
            currentEntity.type
          )
        ) {
          fetchData('faculties')
          fetchData('departments')
          fetchData('studyareas')
        }
      } else {
        showToast(
          response.message || "Erreur lors de l'opération",
          'destructive'
        )
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
        if (
          ['faculties', 'departments', 'studyareas'].includes(deleteTarget.type)
        ) {
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

  // --- RENDU DES FORMULAIRES ---
  const renderFormContent = () => {
    if (!currentEntity) return null
    const { type, data, isEditing } = currentEntity
    const updateData = (k: string, v: string | number | boolean | string[]) =>
      setCurrentEntity(prev =>
        prev ? { ...prev, data: { ...prev.data, [k]: v } } : null
      )

    switch (type) {
      case 'faculties':
        const fac = data as Partial<FacultySchema>
        return (
          <Input
            className='dark:bg-slate-800 dark:border-slate-700 dark:text-white'
            placeholder='Nom de la Faculté'
            value={fac.name || ''}
            onChange={e => updateData('name', e.target.value)}
          />
        )
      case 'departments':
        const dep = data as Partial<DepartmentSchema>
        return (
          <div className='space-y-4'>
            <Input
              className='dark:bg-slate-800 dark:border-slate-700 dark:text-white'
              placeholder='Nom du Département'
              value={dep.name || ''}
              onChange={e => updateData('name', e.target.value)}
            />
            <Select
              value={dep.facultyId || ''}
              onValueChange={v => updateData('facultyId', v)}
            >
              <SelectTrigger className='dark:bg-slate-800 dark:border-slate-700 dark:text-white'>
                <SelectValue placeholder='Faculté parente' />
              </SelectTrigger>
              <SelectContent className='dark:bg-slate-800 dark:border-slate-700 dark:text-white'>
                {faculties.map(f => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      case 'studyareas':
        const sa = data as Partial<StudyAreaSchema>

        // Modification demandée : Bloquer la création et rediriger vers la map
        if (!isEditing) {
          return (
            <div className='flex flex-col items-center justify-center p-6 text-center space-y-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
              <div className='bg-white dark:bg-slate-800 p-3 rounded-full shadow-sm'>
                <MapPin className='w-8 h-8 text-blue-600' />
              </div>
              <div>
                <h3 className='text-lg font-bold text-slate-800 dark:text-slate-100'>
                  Création Interactive Requise
                </h3>
                <p className='text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-sm'>
                  La création de zones d&apos;étude nécessite le dessin de
                  géométries complexes. Veuillez utiliser la carte interactive
                  pour définir une nouvelle zone.
                </p>
              </div>
              <Button asChild className='bg-blue-600 hover:bg-blue-700'>
                <Link
                  href='/map'
                  target='_blank'
                  className='flex items-center gap-2'
                >
                  Aller à la carte interactive{' '}
                  <ArrowRight className='w-4 h-4' />
                </Link>
              </Button>
            </div>
          )
        }

        // Si édition, on permet de changer le nom et la description
        return (
          <div className='space-y-4'>
            <div className='p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs rounded border border-yellow-200 dark:border-yellow-800 flex gap-2'>
              <AlertCircle className='w-4 h-4 flex-shrink-0' />
              <span>
                Pour modifier la géométrie de la zone, veuillez utiliser
                l&apos;outil carte. Ici, vous ne pouvez modifier que les
                métadonnées.
              </span>
            </div>
            <Input
              className='dark:bg-slate-800 dark:border-slate-700 dark:text-white'
              placeholder='Nom de la Zone'
              value={sa.name || ''}
              onChange={e => updateData('name', e.target.value)}
            />
            <Textarea
              className='dark:bg-slate-800 dark:border-slate-700 dark:text-white'
              placeholder='Description'
              value={sa.description || ''}
              onChange={e => updateData('description', e.target.value)}
            />
          </div>
        )
      case 'create_ghost_author':
        const ghost = data as Partial<GhostAuthorSchema>
        return (
          <div className='space-y-4'>
            <div className='bg-amber-50 dark:bg-amber-900/20 p-3 rounded text-xs text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 flex gap-2'>
              <UserCog className='w-5 h-5 flex-shrink-0' />
              <div>
                <strong>Création Auteur &quot;Hors-Ligne&quot; :</strong> Crée
                un compte utilisateur système et un profil auteur simultanément.
                Utile pour les auteurs décédés ou historiques qui ne se
                connecteront jamais.
              </div>
            </div>
            <Input
              className='dark:bg-slate-800 dark:border-slate-700'
              placeholder="Nom complet de l'auteur"
              value={ghost.name || ''}
              onChange={e => updateData('name', e.target.value)}
            />
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='text-xs mb-1 block'>
                  Date Naissance (Approx.)
                </label>
                <Input
                  type='date'
                  className='dark:bg-slate-800 dark:border-slate-700'
                  value={ghost.dateOfBirth || ''}
                  onChange={e => updateData('dateOfBirth', e.target.value)}
                />
              </div>
              <div>
                <label className='text-xs mb-1 block'>
                  Date Décès (Optionnel)
                </label>
                <Input
                  type='date'
                  className='dark:bg-slate-800 dark:border-slate-700'
                  value={ghost.dateOfDeath || ''}
                  onChange={e => updateData('dateOfDeath', e.target.value)}
                />
              </div>
            </div>
            <Textarea
              className='dark:bg-slate-800 dark:border-slate-700 min-h-[100px]'
              placeholder="Biographie de l'auteur..."
              value={ghost.biography || ''}
              onChange={e => updateData('biography', e.target.value)}
            />
          </div>
        )

      // Nouveau cas pour la création de profil auteur
      case 'author_profiles':
        return (
          <div className='space-y-4'>
            <div className='p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'>
              Création d&apos;un profil auteur pour l&apos;utilisateur
              sélectionné.
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium dark:text-slate-300'>
                Biographie (Markdown supporté)
              </label>
              <Textarea
                className='min-h-[150px] dark:bg-slate-800 dark:border-slate-700 dark:text-white'
                placeholder="Biographie complète de l'auteur..."
                // @ts-expect-error
                value={data.biography || ''}
                onChange={e => updateData('biography', e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium dark:text-slate-300'>
                Date de décès (Optionnel)
              </label>
              <Input
                type='date'
                className='dark:bg-slate-800 dark:border-slate-700 dark:text-white'
                // @ts-expect-error
                value={data.dateOfDeath || ''}
                onChange={e => updateData('dateOfDeath', e.target.value)}
              />
            </div>
          </div>
        )

      case 'books':
        const bk = data as Partial<BookSchema>
        return (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='md:col-span-2'>
              <Input
                className='dark:bg-slate-800 dark:border-slate-700'
                placeholder='Titre du document'
                value={bk.title || ''}
                onChange={e => updateData('title', e.target.value)}
              />
            </div>
            <div className='md:col-span-2'>
              <Textarea
                className='dark:bg-slate-800 dark:border-slate-700'
                placeholder='Description...'
                value={bk.description || ''}
                onChange={e => updateData('description', e.target.value)}
              />
            </div>

            <div className='md:col-span-2'>
              <label className='text-xs font-semibold mb-1 block text-slate-500'>
                Auteur du document
              </label>
              <Select
                value={bk.authorId || ''}
                onValueChange={v => updateData('authorId', v)}
              >
                <SelectTrigger className='dark:bg-slate-800 dark:border-slate-700'>
                  <SelectValue placeholder='Sélectionner un auteur...' />
                </SelectTrigger>
                <SelectContent className='dark:bg-slate-800 dark:border-slate-700 max-h-60'>
                  {authorProfiles.length === 0 && (
                    <div className='p-2 text-xs text-muted-foreground'>
                      Aucun auteur trouvé. Créez-en un d&apos;abord.
                    </div>
                  )}
                  {authorProfiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.user.name} (@{p.user.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ZONE UPLOADTHING */}
            <div className='md:col-span-2 p-4 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900'>
              <label className='flex items-center gap-2 text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300'>
                <FileText className='w-4 h-4' /> Fichier Numérique
              </label>

              {/* Condition d'affichage : soit le fichier est déjà uploadé, soit on affiche la dropzone */}
              {!uploadedFileId ? (
                <UploadDropzone
                  endpoint='documentUploader'
                  onClientUploadComplete={res => {
                    // UploadThing retourne un tableau de fichiers uploadés
                    if (res && res.length > 0) {
                      const file = res[0]
                      // serverData contient ce que nous avons retourné depuis core.ts (l'ID prisma)
                      setUploadedFileId(file.serverData.fileId)
                      setUploadedFileName(file.name)
                      showToast('Fichier uploadé avec succès', 'default')
                    }
                  }}
                  onUploadError={(error: Error) => {
                    showToast(`Erreur upload: ${error.message}`, 'destructive')
                  }}
                  appearance={{
                    container:
                      'border-2 border-dashed border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-800 h-40 sm:py-1 max-sm:py-1 ',
                    button: cn(buttonVariants({ variant: 'default' })),
                    label: 'text-slate-500 dark:text-slate-400 text-sm',
                    allowedContent: 'text-xs text-slate-400'
                  }}
                  config={{ mode: 'auto' }}
                  content={{
                    label: 'Glissez votre PDF, Word ou Texte ici',
                    allowedContent: 'PDF, Word, Texte (Max 32MB)'
                  }}
                />
              ) : (
                <div className='flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-800 dark:text-green-200'>
                  <div className='flex items-center gap-2'>
                    <CheckCircle2 className='w-5 h-5' />
                    <span className='font-medium text-sm'>
                      {uploadedFileName || 'Fichier prêt'}
                    </span>
                  </div>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900'
                    onClick={() => {
                      setUploadedFileId(null)
                      setUploadedFileName(null)
                    }}
                  >
                    <XCircle className='w-4 h-4 text-green-600 dark:text-green-400' />
                  </Button>
                </div>
              )}
            </div>

            <Input
              className='dark:bg-slate-800 dark:border-slate-700'
              type='number'
              placeholder='Année'
              value={
                bk.publicationYear
                  ? new Date(bk.publicationYear).getFullYear()
                  : ''
              }
              onChange={e =>
                updateData('publicationYear', Number(e.target.value))
              }
            />

            <Select
              value={bk.type || ''}
              onValueChange={v => updateData('type', v as BookType)}
            >
              <SelectTrigger className='dark:bg-slate-800 dark:border-slate-700'>
                <SelectValue placeholder='Type de document' />
              </SelectTrigger>
              <SelectContent className='dark:bg-slate-800 dark:border-slate-700'>
                {Object.values(BookType).map(t => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={bk.departmentId || ''}
              onValueChange={v => updateData('departmentId', v)}
            >
              <SelectTrigger className='dark:bg-slate-800 dark:border-slate-700'>
                <SelectValue placeholder='Département' />
              </SelectTrigger>
              <SelectContent className='dark:bg-slate-800 dark:border-slate-700'>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className='md:col-span-2'>
              <Select
                value={bk.studyAreaIds?.[0] || ''}
                onValueChange={v => updateData('studyAreaIds', [v])}
              >
                <SelectTrigger className='dark:bg-slate-800 dark:border-slate-700'>
                  <SelectValue placeholder="Zone d'étude principale" />
                </SelectTrigger>
                <SelectContent className='dark:bg-slate-800 dark:border-slate-700'>
                  {studyAreas.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      case 'users':
        const usr = data as Partial<UserUpdateSchema>
        const userEntity = data as unknown as DashboardUser
        if (!isEditing)
          return <p className='text-red-500'>Création interdite ici.</p>
        return (
          <div className='space-y-4'>
            <div className='p-3 bg-slate-100 dark:bg-slate-900 rounded text-sm dark:text-slate-200'>
              <span className='font-semibold'>Utilisateur :</span>{' '}
              {userEntity.username}
            </div>
            <Select
              value={usr.role || userEntity.role}
              onValueChange={v => updateData('role', v as UserRole)}
              disabled={!isAuthorized(UserRole.ADMIN)}
            >
              <SelectTrigger className='dark:bg-slate-800 dark:border-slate-700 dark:text-white'>
                <SelectValue placeholder='Rôle' />
              </SelectTrigger>
              <SelectContent className='dark:bg-slate-800 dark:border-slate-700 dark:text-white'>
                {Object.values(UserRole).map(r => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className='flex items-center space-x-2 dark:text-slate-200'>
              <input
                type='checkbox'
                id='susp'
                checked={usr.isSuspended ?? userEntity.isSuspended}
                onChange={e => updateData('isSuspended', e.target.checked)}
                className='h-4 w-4 rounded border-gray-300 dark:border-slate-600 dark:bg-slate-800'
                disabled={!isAuthorized(UserRole.ADMIN)}
              />
              <label htmlFor='susp' className='text-sm'>
                Compte suspendu
              </label>
            </div>
          </div>
        )
      default:
        return null
    }
  }

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
            Vous devez être connecté pour accéder au tableau de bord
            administratif.
          </p>
          <Button className='w-full bg-blue-600 hover:bg-blue-700 text-white'>
            Se connecter
          </Button>
        </div>
      </div>
    )

  const activeNavLabel =
    NAV_ITEMS.find(n => n.type === activeTab)?.label || 'Dashboard'

  return (
    <div className='flex h-screen w-full overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200'>
      {/* 1. SIDEBAR */}
      <div
        className={`flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 z-20 shadow-xl ${
          sidebarOpen
            ? 'w-72 translate-x-0'
            : 'w-0 -translate-x-full opacity-0 overflow-hidden'
        }`}
      >
        {/* Header Sidebar */}
        <div className='p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 bg-slate-50 dark:bg-slate-900'>
          <h2 className='font-bold flex items-center justify-between gap-2 text-sm uppercase tracking-wider text-slate-600 dark:text-slate-400'>
            <span className='flex items-center gap-2'>
              <Database className='w-4 h-4 text-blue-600' /> Administration
            </span>
            <Button
              size='sm'
              variant='ghost'
              className='h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              onClick={() => setSidebarOpen(false)}
            >
              <ChevronLeft className='w-4 h-4' />
            </Button>
          </h2>
          {/* User Info Mini Card */}
          <div className='flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm'>
            <div className='h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold'>
              {currentUser.username?.charAt(0).toUpperCase()}
            </div>
            <div className='overflow-hidden'>
              <p className='text-xs font-bold truncate text-slate-800 dark:text-slate-100'>
                {currentUser.username}
              </p>
              <Badge
                variant='outline'
                className='text-[10px] h-4 px-1 py-0 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'
              >
                {currentUser.role}
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className='flex-1 overflow-y-auto p-2 space-y-2 bg-white dark:bg-slate-900'>
          {NAV_ITEMS.map(item => {
            if (item.type === 'users' && !isAuthorized(UserRole.LIBRARIAN))
              return null
            const isActive = activeTab === item.type
            return (
              <div
                key={item.type}
                onClick={() => setActiveTab(item.type)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer border-2 group ${
                  isActive
                    ? 'bg-blue-50/70 dark:bg-blue-900/20 border-blue-500 shadow-sm'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                  }`}
                >
                  {item.icon}
                </div>
                <div className='flex-1'>
                  <p
                    className={`text-sm font-medium ${
                      isActive
                        ? 'text-blue-900 dark:text-blue-300'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className='text-[10px] text-slate-400 dark:text-slate-500'>
                    Gérer les {item.label.toLowerCase()}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Sidebar */}
        <div className='p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center'>
          <p className='text-xs text-slate-400 dark:text-slate-600'>
            GeoLibrary Admin v1.0
          </p>
        </div>
      </div>

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
              {NAV_ITEMS.find(n => n.type === activeTab)?.icon}
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
              onClick={() => fetchData(activeTab)}
              disabled={loading}
              className='dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
              />
              <span className='hidden sm:inline'>Actualiser</span>
            </Button>
            {activeTab === 'users' && isAuthorized(UserRole.LIBRARIAN) && (
              <Button
                size='sm'
                variant='outline'
                className='text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                onClick={() => {
                  setCurrentEntity({
                    type: 'create_ghost_author',
                    // @ts-expect-error
                    data: {
                      id: '',
                      name: '',
                      biography: '',
                    },
                    isEditing: false
                  })
                  setIsFormDialogOpen(true)
                }}
              >
                <UserCog className='w-4 h-4 mr-2' /> Auteur
              </Button>
            )}
            {((activeTab === 'books' && isAuthorized(UserRole.AUTHOR)) ||
              (['faculties', 'departments', 'studyareas'].includes(activeTab) &&
                isAuthorized(UserRole.LIBRARIAN))) && (
              <Button
                size='sm'
                className='bg-blue-600 hover:bg-blue-700 text-white'
                onClick={() => {
                  setCurrentEntity({
                    type: activeTab,
                    data: {},
                    isEditing: false
                  })
                  setIsFormDialogOpen(true)
                }}
              >
                <Plus className='w-4 h-4 mr-2' />
                <span className='hidden sm:inline'>Nouveau</span>
              </Button>
            )}
          </div>
        </header>

        {/* Data Content */}
        <main className='flex-1 overflow-auto p-4 bg-slate-100 dark:bg-slate-950 relative'>
          {(() => {
            const filteredData = (data[activeTab] || []).filter(item =>
              JSON.stringify(item)
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
            )

            return (
              <div className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden transition-colors'>
                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-slate-100 dark:divide-slate-800'>
                    <thead className='bg-slate-50 dark:bg-slate-800/50'>
                      <tr>
                        <th className='px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
                          ID / Nom
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
                          Détails
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
                          Relations
                        </th>
                        <th className='px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800'>
                      {filteredData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className='px-6 py-10 text-center text-slate-500 dark:text-slate-400'
                          >
                            {loading ? (
                              <Loader2 className='w-6 h-6 animate-spin mx-auto text-blue-600' />
                            ) : (
                              'Aucune donnée trouvée.'
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredData.map(item => {
                          return (
                            <tr
                              key={item.id}
                              className='hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group'
                            >
                              {/* Cellule 1 : Identité */}
                              <td className='px-6 py-4 whitespace-nowrap  truncate max-w-3xs'>
                                <div className='text-sm font-medium text-slate-900 dark:text-slate-100 truncate'>
                                  {/* @ts-expect-error*/}
                                  {item.title || item.name || item.username}
                                </div>
                                <div className='text-xs text-slate-400 dark:text-slate-500 font-mono truncate'>
                                  {item.id}
                                </div>
                              </td>

                              {/* Cellule 2 : Détails */}
                              <td className='px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300  truncate max-w-3xs'>
                                {activeTab === 'users' && (
                                  <Badge
                                    variant={
                                      /* @ts-expect-error*/
                                      item.role === 'ADMIN'
                                        ? 'destructive'
                                        : 'secondary'
                                    }
                                  >
                                    {/* @ts-expect-error*/}
                                    {item.role}
                                  </Badge>
                                )}
                                {activeTab === 'books' && (
                                  <span className='flex items-center gap-2'>
                                    <Badge
                                      variant='outline'
                                      className='dark:border-slate-600 dark:text-slate-300'
                                    >
                                      {/* @ts-expect-error*/}
                                      {item.type}
                                    </Badge>{' '}
                                    {/* @ts-expect-error*/}
                                    {new Date(item.postedAt).getFullYear()}
                                  </span>
                                )}
                                {activeTab === 'studyareas' && (
                                  <span className='truncate block max-w-xs text-xs'>
                                    {/* @ts-expect-error*/}
                                    {item.description}
                                  </span>
                                )}
                                {activeTab === 'departments' && (
                                  <span className='text-xs text-slate-500 dark:text-slate-400 truncate'>
                                    {/* @ts-expect-error*/}
                                    {item.description || ''}
                                  </span>
                                )}
                              </td>

                              {/* Cellule 3 : Relations */}
                              <td className='px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400'>
                                {/* @ts-expect-error*/}
                                {item.department && (
                                  <Badge
                                    variant='secondary'
                                    className='mr-1 dark:bg-slate-800 dark:text-slate-300'
                                  >
                                    {/* @ts-expect-error*/}
                                    {item.department.name}
                                  </Badge>
                                )}
                                {/* @ts-expect-error*/}
                                {item.faculty && (
                                  <Badge
                                    variant='outline'
                                    className='dark:border-slate-600 dark:text-slate-400'
                                  >
                                    {/* @ts-expect-error*/}
                                    {item.faculty.name}
                                  </Badge>
                                )}
                                {/* @ts-expect-error*/}
                                {item.author && (
                                  <span className='text-xs'>
                                    Par: {/* @ts-expect-error*/}
                                    {item.author.user?.username || 'Inconnu'}
                                  </span>
                                )}
                                {/* @ts-expect-error*/}
                                {item.studyAreas && item.studyAreas.length > 0 && (
                                  <div className='flex -space-x-1 overflow-hidden mt-1'>
                                    {/* @ts-expect-error*/}
                                    {item.studyAreas.map((sa, i: number) => (
                                      <div
                                        key={i}
                                        className='inline-block h-4 w-4 rounded-full bg-blue-400 ring-2 ring-white dark:ring-slate-900'
                                        title={sa.studyArea?.name}
                                      />
                                    ))}
                                  </div>
                                )}
                              </td>

                              {/* Cellule 4 : Actions */}
                              <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                                <div className='flex justify-end gap-2 opacity-0 max-md:opacity-100 group-hover:opacity-100 transition-opacity'>
                                  {/* BOUTON CRÉER PROFIL AUTEUR (NOUVEAU) */}
                                  {activeTab === 'users' &&
                                    isAuthorized(UserRole.LIBRARIAN) &&
                                    /* @ts-expect-error*/
                                    !item.authorProfile && (
                                      <Button
                                        variant='ghost'
                                        size='icon'
                                        className='h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-slate-800'
                                        title='Créer profil auteur'
                                        onClick={() => {
                                          setCurrentEntity({
                                            type: 'author_profiles',
                                            data: { userId: item.id },
                                            isEditing: false
                                          })
                                          setIsFormDialogOpen(true)
                                        }}
                                      >
                                        <UserPlus className='w-4 h-4' />
                                      </Button>
                                    )}

                                  {isAuthorized(UserRole.LIBRARIAN) &&
                                    (activeTab !== 'users' ||
                                      isAuthorized(UserRole.ADMIN)) && (
                                      <Button
                                        variant='ghost'
                                        size='icon'
                                        className='h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800'
                                        onClick={() => {
                                          const entityToEdit = { ...item }
                                          if (activeTab === 'books') {
                                            /* @ts-expect-error*/
                                            entityToEdit.studyAreaIds =
                                              item.studyAreas?.map(
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                (s: any) => s.studyArea.id
                                              ) || []
                                            /* @ts-expect-error*/
                                            entityToEdit.publicationYear =
                                              new Date(item.postedAt)
                                            /* @ts-expect-error*/
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
                                      >
                                        <Edit className='w-4 h-4' />
                                      </Button>
                                    )}
                                  {isAuthorized(UserRole.ADMIN) && (
                                    <Button
                                      variant='ghost'
                                      size='icon'
                                      className='h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-slate-800'
                                      onClick={() => {
                                        setDeleteTarget({
                                          type: activeTab,
                                          id: item.id
                                        })
                                        setIsDeleteDialogOpen(true)
                                      }}
                                      disabled={
                                        activeTab === 'users' &&
                                        item.id === currentUser?.id
                                      }
                                    >
                                      <Trash2 className='w-4 h-4' />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className='bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex justify-between'>
                  <span>Affichage de {filteredData.length} élément(s)</span>
                  <span>Base de données connectée</span>
                </div>
              </div>
            )
          })()}
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
                    NAV_ITEMS.find(n => n.type === currentEntity?.type)?.label
                  }`}
            </DialogTitle>
            <DialogDescription className='dark:text-slate-400'>
              Remplissez les informations ci-dessous pour mettre à jour la base
              de données.
            </DialogDescription>
          </DialogHeader>

          <div className='py-4'>{renderFormContent()}</div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsFormDialogOpen(false)}
              disabled={loading}
              className=''
            >
              Annuler
            </Button>
            {/* Masquer le bouton Enregistrer si on est en train de créer une zone d'étude (redirection map) */}
            {!(
              currentEntity?.type === 'studyareas' && !currentEntity.isEditing
            ) && (
              <Button onClick={handleAction} disabled={loading} className=''>
                {loading && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
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
              Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est
              irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className=''>
            <Button
              variant='outline'
              className=''
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant='destructive'
              className=''
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
