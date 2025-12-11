"use client"
import { useState, useEffect, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  User,
  Mail,
  Calendar,
  Save,
  UserCircle,
  BookOpen,
  ShieldCheck,
  Loader2,
  Camera
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { showToast } from '@/hooks/useToast'
import { UserRole } from '@prisma/client'
import { updateUserProfile } from './actions'
import { useAuth } from '@/components/AuthProvider'
import AvatarUploadDialog from './AvatarUploadDialog'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'

function SubmitButton () {
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

export default function Profile() {
  const { user } = useAuth()
  const { refresh } = useRouter()
  const [authorProfile, setAuthorProfile] = useState<{ biography: string } | null>(null)

  useEffect(() => {
    if (user?.role === UserRole.AUTHOR) {
      fetch('/api/authors/profile')
        .then(res => res.json())
        .then(data => setAuthorProfile(data))
        .catch(err => console.error('Failed to fetch author profile', err))
    }
  }, [user])

  // On initialise avec les données existantes
  // Note: user.avatarId peut être null si pas d'avatar
  const initialUser = user ? {...user} : null

  const [state, formAction] = useActionState(updateUserProfile, {
    message: '',
    success: false
  })

  // Gestion de l'état local pour l'affichage immédiat
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    initialUser?.avatarUrl || null
  )
  const [avatarId, setAvatarId] = useState<string | null>(null)

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        showToast(state.message, 'success')
        refresh()
      } else {
        showToast(state.message, 'destructive')
      }
    }
  }, [refresh, state])

  if (!initialUser) return (
      <div className="flex h-[50vh] w-full items-center justify-center text-slate-500 gap-2">
          <Loader2 className="h-6 w-6 animate-spin" /> Chargement du profil...
      </div>
  )

  return (
    <div className='max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500'>
      {/* En-tête */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6'>
        <div>
          <h1 className='text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3'>
            {initialUser.avatarUrl ? (
              <Image
                src={initialUser.avatarUrl}
                alt="Avatar"
                width={32}
                height={32}
                className="size-9 rounded-full object-cover"
              />
            ) : (<div className={cn(buttonVariants({variant: "outline"}), "rounded-full size-10")}><UserCircle className='size-8 text-blue-600' /></div> )}
            {initialUser.name || initialUser.username}
          </h1>
          <p className='text-slate-500 dark:text-slate-400 mt-2'>
            Gérez vos informations personnelles et votre apparence publique.
          </p>
        </div>

        <div className='flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'>
          <ShieldCheck className='w-4 h-4 text-blue-600 dark:text-blue-400' />
          <span className='text-sm font-semibold text-slate-700 dark:text-slate-200'>
            {initialUser.role}
          </span>
        </div>
      </div>

      <form
        action={formAction}
        className='grid grid-cols-1 lg:grid-cols-3 gap-8'
      >
        {/* COLONNE GAUCHE : Avatar & Info Rapide */}
        <div className='space-y-6'>
          <div className='bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6'>
            <div className='text-center'>
              <h3 className='text-lg font-medium text-slate-900 dark:text-white flex items-center justify-center gap-2'>
                <Camera className='w-4 h-4' /> Photo de profil
              </h3>

              {/* Input caché : 
                  - Si avatarId contient un ID (string), on le garde.
                  - Si avatarId est null (suppression), value devient "" (chaîne vide).
                  - Le serveur interprétera "" comme une demande de suppression.
              */}
              <input type='hidden' name='avatarId' value={avatarId ?? ''} />

              <AvatarUploadDialog 
                currentAvatarUrl={avatarUrl}
                onAvatarChange={(newId, newUrl) => {
                  setAvatarId(newId) // Peut être null
                  setAvatarUrl(newUrl) // Peut être null
                }}
              />
              
              <p className='mt-4 text-xs text-slate-500 dark:text-slate-400'>
                Format carré recommandé.<br/>
                Cliquez sur l&apos;image pour modifier ou supprimer.
              </p>
            </div>

            <div className='pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3'>
              <div className='flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 group'>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                    <Mail className='w-4 h-4 text-slate-500 group-hover:text-blue-500' />
                </div>
                <span className='truncate'>{initialUser.email}</span>
              </div>
              <div className='flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 group'>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                    <User className='w-4 h-4 text-slate-500 group-hover:text-blue-500' />
                </div>
                <span className='truncate'>@{initialUser.username}</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : Formulaire Détaillé */}
        <div className='lg:col-span-2 space-y-6'>
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
                  defaultValue={initialUser.name}
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
                      initialUser.dateOfBirth
                        ? new Date(initialUser.dateOfBirth)
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
                  defaultValue={initialUser.bio || ''}
                  className='dark:bg-slate-800 dark:border-slate-700 dark:text-white min-h-[100px] focus:ring-blue-500'
                  placeholder='Une courte description de vous-même...'
                />
              </div>
            </div>
          </div>

          {initialUser.role === UserRole.AUTHOR && (
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
        </div>
      </form>
    </div>
  )
}