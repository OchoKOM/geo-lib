/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { ChevronLeft, Moon, Sun, Lock, Loader2 } from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { loginAction } from '../../auth/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// --- TYPES DE RETOUR ---
type AuthActionState = {
  error: string | null
  success?: boolean
  callbackUrl?: string
  fields: {
    name: string
    email: string
  }
}

// Définition de l'état initial pour useFormState
const initialState: AuthActionState = {
  error: null,
  success: undefined,
  fields: { name: '', email: '' }
}

/**
 * @component ThemeToggle
 * @description Composant simple pour basculer entre les modes clair et sombre, avec persistance locale.
 */
function ThemeToggle () {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const htmlEl = document.documentElement
      const storedTheme = localStorage.getItem('theme')

      let initialDark = false

      if (storedTheme === 'dark') {
        initialDark = true
      } else if (storedTheme === 'light') {
        initialDark = false
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        initialDark = true
      }

      if (initialDark) {
        htmlEl.classList.add('dark')
      } else {
        htmlEl.classList.remove('dark')
      }

      setIsDark(initialDark)
    }
  }, [])

  const toggleTheme = () => {
    const htmlEl = document.documentElement
    htmlEl.classList.toggle('dark')
    const newIsDark = htmlEl.classList.contains('dark')
    setIsDark(newIsDark)

    if (typeof window !== 'undefined') {
      const newTheme = newIsDark ? 'dark' : 'light'
      localStorage.setItem('theme', newTheme)
    }
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label='Toggle dark mode'
      className='p-3 rounded-full bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm shadow-md text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/70 transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/50'
    >
      {isDark ? <Sun className='w-5 h-5' /> : <Moon className='w-5 h-5' />}
    </button>
  )
}

/**
 * @component SubmitButton
 * @description Composant qui gère l'état de chargement du bouton.
 */
function SubmitButton () {
  const { pending } = useFormStatus()

  return (
    <Button
      type='submit'
      aria-disabled={pending}
      disabled={pending}
      className='w-full'
    >
      {pending ? 'Connexion en cours...' : 'Se connecter'}
    </Button>
  )
}

/**
 * @component LoginForm
 * @description Composant principal pour le formulaire de connexion.
 */
function LoginForm () {
  // get from the url the redirect url if any
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('back_url') || '/'

  // Récupération de l'état de l'action serveur et de la fonction de soumission
  const [state, formAction] = useFormState(loginAction, { ...initialState })

  // État local pour contrôler le champ email (Persistance en cas d'erreur)
  const [email, setEmail] = useState('')

  // État pour gérer le message de succès post-inscription (via URL Query)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  const errorMessage = state.error

  useEffect(() => {
    // Gérer le message de succès après inscription (query param success=true)
    const successParam = searchParams.get('success')

    if (successParam === 'true' && !state.error) {
      setShowSuccessMessage(true)
    } else {
      setShowSuccessMessage(false)
    }
  }, [searchParams, state.error])

  return (
    <div className='flex flex-col items-center justify-center w-full h-full min-h-[100vh] py-8 bg-slate-50 dark:bg-slate-900 transition-colors duration-500 relative'>
      <div className='absolute top-4 left-4 right-4 flex justify-between items-center z-10 sm:top-8 sm:left-8 sm:right-8'>
        {/* Utilisation de Link pour la navigation Next.js */}
        <Link
          href='/'
          className='flex items-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800'
        >
          <ChevronLeft className='w-5 h-5 mr-1' />
          Accueil
        </Link>

        <ThemeToggle />
      </div>

      <div className='w-full max-w-md p-8 space-y-7 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-700 transition-all duration-300 transform hover:shadow-indigo-500/20 mx-4 my-auto'>
        <div className='flex flex-col items-center space-y-2'>
          <Lock className='w-8 h-8 text-indigo-600 dark:text-indigo-400' />
          <h1 className='text-3xl font-bold text-slate-900 dark:text-white'>
            Connexion à GeoLib
          </h1>
        </div>

        <p className='text-center text-slate-500 dark:text-slate-400 text-sm'>
          Accédez à votre espace pour gérer les documents et la cartographie.
        </p>

        {/* Affichage des Messages de Succès Post-Inscription */}
        {showSuccessMessage && (
          <div
            className='p-3 text-sm text-green-800 bg-green-100 dark:bg-green-900 dark:text-green-300 rounded-lg border border-green-300 dark:border-green-700'
            role='alert'
          >
            Inscription réussie ! Veuillez vous connecter avec vos nouveaux
            identifiants.
          </div>
        )}

        {/* Affichage des Messages d'Erreur Post-Connexion */}
        {errorMessage && (
          <div
            className='p-3 text-sm text-red-800 bg-red-100 dark:bg-red-900 dark:text-red-300 rounded-lg border border-red-300 dark:border-red-700'
            role='alert'
          >
            {errorMessage}
          </div>
        )}

        {/* Identifiants de test : admin@geolib.edu / P@ssword123 */}
        <form action={formAction} className='space-y-6'>
          {/* Champ caché pour le Callback URL */}
          {callbackUrl && (
            <input type='hidden' name='callbackUrl' value={callbackUrl} />
          )}

          {/* Champ Email */}
          <div>
            <label
              htmlFor='email'
              className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'
            >
              Adresse e-mail
            </label>
            <Input
              id='email'
              name='email'
              type='email'
              required
              placeholder='exemple@geolib.edu'
              // Persistance de la donnée
              value={email}
              onChange={e => setEmail(e.target.value)}
              className=''
            />
          </div>

          {/* Champ Mot de passe */}
          <div>
            <label
              htmlFor='password'
              className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'
            >
              Mot de passe
            </label>
            <Input
              id='password'
              name='password'
              type='password'
              required
              placeholder='Mot de passe'
              className='mt-1 block w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl shadow-inner placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white transition duration-200'
            />
          </div>

          <div className='flex justify-end'>
            <a
              href='#'
              className='text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition duration-200'
            >
              Mot de passe oublié ?
            </a>
          </div>

          <SubmitButton />
        </form>

        <p className='text-center text-sm text-slate-600 dark:text-slate-400'>
          Vous n&apos;avez pas de compte ?{' '}
          {/* Utilisation de Link pour la navigation Next.js */}
          <Link
            href='/register'
            className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition duration-200 hover:underline'
          >
            Créez-en un ici
          </Link>
        </p>
      </div>
      <div className='flex-grow'></div>
    </div>
  )
}

export default function LoginPage () {
  return (
    <Suspense
      fallback={
        <div className='h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400'>
          <Loader2 className='w-10 h-10 animate-spin mb-4 text-blue-600' />
          <p>Chargement...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
