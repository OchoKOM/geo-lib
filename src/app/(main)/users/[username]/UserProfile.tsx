'use client'

import { useState, useEffect, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useAuth } from '@/components/AuthProvider'
import { showToast } from '@/hooks/useToast'
import {
  BookOpen,
  Calendar,
  ShieldCheck,
  Loader2,
  Edit,
  LogOut,
  Upload,
  Eye,
  AlertTriangle,
  Save,
  Camera,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Combobox, ComboboxContent, ComboboxItem, ComboboxTrigger, ComboboxValue } from '@/components/ui/combobox'
import { BookType } from '@prisma/client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import kyInstance from '@/lib/ky'
import { DashboardLoan, DashboardSubscription, DashBoardAuthorProfile, UserRole, DashboardDepartment, DashboardStudyArea } from '@/lib/types'
import { updateUserProfile } from '@/app/(main)/profile/actions'
import AvatarUploadDialog from '@/app/(main)/profile/AvatarUploadDialog'

interface UserProfileData {
  id: string
  username: string
  name: string | null
  avatarUrl: string | null
  bio: string | null
  role: UserRole
  createdAt: string
  dateOfBirth?: string | null
  loans: DashboardLoan[]
  subscription: DashboardSubscription | null
  authorProfile: DashBoardAuthorProfile | null
  isOwnProfile: boolean
}

interface UserProfileProps {
  username: string
}

function ProfileEditDialog({ profileData, onProfileUpdate }: {
  profileData: UserProfileData
  onProfileUpdate: () => void
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useAuth()
  const { refresh } = useRouter()
  const [authorProfile, setAuthorProfile] = useState<{ biography: string } | null>(null)
  const [state, formAction] = useActionState(updateUserProfile, {
    message: '',
    success: false
  })

  // Gestion de l'état local pour l'affichage immédiat
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profileData.avatarUrl || null)
  const [avatarId, setAvatarId] = useState<string | null>(null)

  useEffect(() => {
    if (profileData.role === UserRole.AUTHOR) {
      fetch('/api/authors/profile')
        .then(res => res.json())
        .then((data: { biography: string }) => setAuthorProfile(data))
        .catch(err => console.error('Failed to fetch author profile', err))
    }
  }, [profileData.role])

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        showToast(state.message, 'success')
        refresh()
        onProfileUpdate()
      } else {
        showToast(state.message, 'destructive')
      }
    }
  }, [refresh, state, onProfileUpdate])

  function SubmitButton() {
    const { pending } = useFormStatus()
    return (
      <Button
        type='submit'
        disabled={pending}
        className='w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95'
      >
        {pending ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Enregistrement...
          </>
        ) : (
          <>
            <Save className='mr-2 h-4 w-4' />
            Enregistrer les modifications
          </>
        )}
      </Button>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Camera className='w-5 h-5' />
            Modifier le Profil
          </DialogTitle>
        </DialogHeader>

        <form action={formAction} className='space-y-6'>
          {/* Avatar Section */}
          <div className='bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm'>
            <div className='text-center'>
              <h3 className='text-lg font-medium text-slate-900 dark:text-white flex items-center justify-center gap-2'>
                <Camera className='w-4 h-4' /> Photo de profil
              </h3>
              <input type='hidden' name='avatarId' value={avatarId ?? ''} />
              <AvatarUploadDialog
                currentAvatarUrl={avatarUrl}
                onAvatarChange={(newId, newUrl) => {
                  setAvatarId(newId)
                  setAvatarUrl(newUrl)
                }}
              />
              <p className='mt-4 text-xs text-slate-500 dark:text-slate-400'>
                Format carré recommandé.<br/>
                Cliquez sur l&apos;image pour modifier ou supprimer.
              </p>
            </div>
          </div>

          {/* Personal Information */}
          <div className='bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4'>
            <h2 className='text-xl font-semibold text-slate-900 dark:text-white'>
              Informations Personnelles
            </h2>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700 dark:text-slate-300'>
                  Nom Complet
                </label>
                <Input
                  name='name'
                  defaultValue={profileData.name || ''}
                  className='dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-blue-500'
                  placeholder='Votre nom'
                />
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700 dark:text-slate-300'>
                  Date de naissance
                </label>
                <div className='relative'>
                  <Calendar className='absolute left-3 top-2.5 h-4 w-4 text-slate-400' />
                  <Input
                    name='dateOfBirth'
                    type='date'
                    defaultValue={
                      profileData.dateOfBirth
                        ? new Date(profileData.dateOfBirth)
                            .toISOString()
                            .split('T')[0]
                        : ''
                    }
                    className='pl-10 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-blue-500'
                  />
                </div>
              </div>

              <div className='md:col-span-2 space-y-2'>
                <label className='text-sm font-medium text-slate-700 dark:text-slate-300'>
                  Bio / À propos
                </label>
                <Textarea
                  name='bio'
                  defaultValue={profileData.bio || ''}
                  className='dark:bg-slate-800 dark:border-slate-700 dark:text-white min-h-[100px] focus:ring-blue-500'
                  placeholder='Une courte description de vous-même...'
                />
              </div>
            </div>
          </div>

          {/* Author Profile Section */}
          {profileData.role === UserRole.AUTHOR && (
            <div className='bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-100 dark:border-blue-900/50 shadow-sm space-y-4'>
              <div className='flex items-center gap-2'>
                <BookOpen className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                <h2 className='text-xl font-semibold text-blue-900 dark:text-blue-100'>
                  Profil Auteur Académique
                </h2>
              </div>
              <p className='text-sm text-blue-700 dark:text-blue-300'>
                Ces informations apparaîtront sur vos publications et travaux de recherche.
              </p>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700 dark:text-slate-300'>
                  Biographie Académique Complète
                </label>
                <Textarea
                  name='authorBiography'
                  defaultValue={authorProfile?.biography || ''}
                  className='dark:bg-slate-800 dark:border-slate-700 dark:text-white min-h-[150px] focus:ring-blue-500'
                  placeholder='Votre parcours académique, universités, domaines de recherche...'
                />
              </div>
            </div>
          )}

          <div className='flex justify-end pt-4'>
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AddBookDialog({ profileData, onBookAdded }: {
  profileData: UserProfileData
  onBookAdded: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<DashboardDepartment[]>([])
  const [studyAreas, setStudyAreas] = useState<DashboardStudyArea[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: BookType.THESE,
    departmentId: '',
    studyAreaIds: [] as string[]
  })

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await kyInstance('/api/study-areas/departments')
        const data = await response.json()
        // @ts-expect-error TS2322
        setDepartments(data.departments)
      } catch (error) {
        console.error('Failed to fetch departments:', error)
      }
    }
    fetchDepartments()
  }, [])

  useEffect(() => {
    if (formData.departmentId) {
      const fetchStudyAreas = async () => {
        try {
          const response = await kyInstance(`/api/study-areas?departmentId=${formData.departmentId}`)
          const data = await response.json()
          // @ts-expect-error TS2322
          setStudyAreas(data.studyAreas)
        } catch (error) {
          console.error('Failed to fetch study areas:', error)
        }
      }
      fetchStudyAreas()
    } else {
      setStudyAreas([])
    }
  }, [formData.departmentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.description.trim() || !formData.departmentId) {
      showToast('Please fill in all required fields', 'destructive')
      return
    }

    setLoading(true)
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        departmentId: formData.departmentId,
        studyAreaIds: formData.studyAreaIds,
        authorId: profileData.id
      }

      const response = await kyInstance.post('/api/books', { json: payload })
      if (response.ok) {
        showToast('Book added successfully!', 'success')
        setOpen(false)
        setFormData({
          title: '',
          description: '',
          type: BookType.THESE,
          departmentId: '',
          studyAreaIds: []
        })
        onBookAdded()
      } else {
        throw new Error('Failed to add book')
      }
    } catch (error) {
      console.error('Error adding book:', error)
      showToast('Failed to add book. Please try again.', 'destructive')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Add New Book
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Book</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Book title"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type *</label>
              {/* @ts-expect-error TS2322 */}
              <Combobox value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as BookType }))}>
                <ComboboxTrigger>
                  <ComboboxValue placeholder="Select type" />
                </ComboboxTrigger>
                <ComboboxContent>
                  {Object.values(BookType).map((type) => (
                    <ComboboxItem key={type} value={type}>
                      {type}
                    </ComboboxItem>
                  ))}
                </ComboboxContent>
              </Combobox>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description *</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Book description"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Department *</label>
              <Combobox value={formData.departmentId} onValueChange={(value) => setFormData(prev => ({ ...prev, departmentId: value, studyAreaIds: [] }))}>
                <ComboboxTrigger>
                  <ComboboxValue placeholder="Select department" />
                </ComboboxTrigger>
                <ComboboxContent>
                  {departments.map((dept) => (
                    <ComboboxItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </ComboboxItem>
                  ))}
                </ComboboxContent>
              </Combobox>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Study Areas</label>
              <Combobox value={formData.studyAreaIds.join(',')} onValueChange={(value) => setFormData(prev => ({ ...prev, studyAreaIds: value ? value.split(',') : [] }))}>
                <ComboboxTrigger>
                  <ComboboxValue placeholder="Select study areas" />
                </ComboboxTrigger>
                <ComboboxContent>
                  {studyAreas.map((area) => (
                    <ComboboxItem key={area.id} value={area.id}>
                      {area.name}
                    </ComboboxItem>
                  ))}
                </ComboboxContent>
              </Combobox>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Book'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function UserProfile({ username }: UserProfileProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user: currentUser } = useAuth()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter()
  const [profileData, setProfileData] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await kyInstance(`/api/users/${username}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('User not found')
          } else {
            throw new Error('Failed to fetch profile')
          }
          return
        }
        const data = await response.json()
        // @ts-expect-error TS2322
        setProfileData(data.user)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [username])

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !profileData) {
    return (
      <div className='flex gap-4 flex-col items-center justify-center min-h-screen bg-linear-to-b from-indigo-50 via-white to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4'>
        <div className='modal-content bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 text-center dark:border dark:border-slate-700'>
          <div className='w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500'>
            <AlertTriangle size={32} />
          </div>
          <h3 className='text-xl font-bold text-slate-800 dark:text-white mb-2'>
            Erreur de Chargement du Profil
          </h3>
          <p className='text-slate-500 dark:text-slate-400 mb-6'>
            Une erreur s&apos;est produite lors du chargement de ce profil. Veuillez réessayer plus tard.
          </p>
        </div>
      </div>
    )
  }

  const { loans, subscription, authorProfile, isOwnProfile } = profileData

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src={profileData.avatarUrl || undefined} alt={profileData.name || profileData.username} />
            <AvatarFallback className="text-lg">
              {(profileData.name || profileData.username).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {profileData.name || profileData.username}
              </h1>
              <p className="text-slate-500 dark:text-slate-400">@{profileData.username}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {profileData.role}
              </Badge>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Joined {new Date(profileData.createdAt).toLocaleDateString()}
              </span>
            </div>
            {profileData.bio && (
              <p className="text-slate-700 dark:text-slate-300 max-w-2xl">{profileData.bio}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {isOwnProfile && (
            <>
              <ProfileEditDialog profileData={profileData} onProfileUpdate={() => setProfileData(null)} />
              <Button variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Loans */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Active Loans ({loans.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loans.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">No active loans</p>
              ) : (
                <div className="space-y-4">
                  {loans.map((loan) => (
                    <div key={loan.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      {loan.book?.coverImage?.url ? (
                        <Image
                          src={loan.book.coverImage.url}
                          alt={loan.book.title}
                          width={40}
                          height={60}
                          className="object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-15 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{loan.book?.title}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Due: {new Date(loan.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Uploaded Books (if author) */}
          {authorProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Uploaded Books ({authorProfile.books.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {authorProfile.books.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400">No books uploaded yet</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {authorProfile.books.map((book) => (
                      <div key={book.id} className="flex gap-3 p-3 border rounded-lg">
                        {book.coverImage?.url ? (
                          <Image
                            src={book.coverImage.url}
                            alt={book.title}
                            width={40}
                            height={60}
                            className="object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-15 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{book.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {book.type} • {book.department?.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {isOwnProfile && (
                  <div className="mt-4 pt-4 border-t">
                    <AddBookDialog profileData={profileData} onBookAdded={() => setProfileData(null)} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Subscription & Actions */}
        <div className="space-y-6">
          {/* Subscription Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-2">
                  <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Active
                  </Badge>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Type: {subscription.type}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Expires: {new Date(subscription.endDate).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Badge variant="secondary">No Active Subscription</Badge>
                  {isOwnProfile && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/pricing">Subscribe</Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {isOwnProfile && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                  <Link href="/dashboard">
                    <Eye className="w-4 h-4 mr-2" />
                    View Dashboard
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                  <Link href="/loans">
                    <BookOpen className="w-4 h-4 mr-2" />
                    My Loans
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
