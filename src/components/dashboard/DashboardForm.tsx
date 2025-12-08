import {
  MapPin,
  ArrowRight,
  AlertCircle,
  UserCog,
  FileText,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { UploadDropzone } from '@/lib/uploadthing'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { showToast } from '@/hooks/useToast'

import {
  FacultySchema,
  DepartmentSchema,
  StudyAreaSchema,
  BookSchema,
  UserUpdateSchema,
  GhostAuthorSchema,
  DashboardFaculty,
  DashboardDepartment,
  DashboardStudyArea,
  DashBoardAuthorProfile,
  DashboardUser,
  UserRole,
  BookType
} from '@/lib/types'
import { CurrentEntity } from '@/lib/dashboard-config'

interface DashboardFormProps {
  currentEntity: CurrentEntity
  setCurrentEntity: (entity: CurrentEntity | null) => void
  faculties: DashboardFaculty[]
  departments: DashboardDepartment[]
  studyAreas: DashboardStudyArea[]
  authorProfiles: DashBoardAuthorProfile[]
  isAuthorized: (role: UserRole) => boolean
  uploadedFileId: string | null
  setUploadedFileId: (id: string | null) => void
  uploadedFileName: string | null
  setUploadedFileName: (name: string | null) => void
}

export function DashboardForm({
  currentEntity,
  setCurrentEntity,
  faculties,
  departments,
  studyAreas,
  authorProfiles,
  isAuthorized,
  uploadedFileId,
  setUploadedFileId,
  uploadedFileName,
  setUploadedFileName
}: DashboardFormProps) {
  const { type, data, isEditing } = currentEntity

  const updateData = (k: string, v: string | number | boolean | string[]) => {
    setCurrentEntity({
      ...currentEntity,
      data: { ...currentEntity.data, [k]: v }
    })
  }

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
              <Link href='/map' target='_blank' className='flex items-center gap-2'>
                Aller à la carte interactive <ArrowRight className='w-4 h-4' />
              </Link>
            </Button>
          </div>
        )
      }

      return (
        <div className='space-y-4'>
          <div className='p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs rounded border border-yellow-200 dark:border-yellow-800 flex gap-2'>
            <AlertCircle className='w-4 h-4 shrink-0' />
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
            <UserCog className='w-5 h-5 shrink-0' />
            <div>
              <strong>Création Auteur &quot;Hors-Ligne&quot; :</strong> Crée un
              compte utilisateur système et un profil auteur simultanément.
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
              // @ts-expect-error dynamic handling
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
              // @ts-expect-error dynamic handling
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

            {!uploadedFileId ? (
              <UploadDropzone
                endpoint='documentUploader'
                onClientUploadComplete={res => {
                  if (res && res.length > 0) {
                    const file = res[0]
                    if (file.serverData.fileId !== uploadedFileId) {
                      setUploadedFileId(file.serverData.fileId)
                      setUploadedFileName(file.name)
                      const fileId = file.serverData.fileId
                      updateData('documentFileId', fileId)
                    }
                    showToast('Document téléchargé avec succès!')
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
                    if (uploadedFileId) {
                      setUploadedFileId(null)
                      setUploadedFileName(null)
                    }
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
            onChange={e => updateData('publicationYear', Number(e.target.value))}
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