/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { ChevronLeft, Moon, Sun, Lock, Loader2 } from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { loginAction } from '../../auth/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// --- TYPES DE RETOUR ---
type LoginActionState = {
  error: string | null
  success?: boolean
  fields: {
    name: string
    identifier: string
  }
}

// Définition de l'état initial pour useFormState
const initialState: LoginActionState = {
  error: null,
  success: undefined,
  fields: { name: '', identifier: '' }
}

function checkIfUsernameOrEmail(field: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const usernameRegex = /^[a-zA-Z0-9-_]{3,20}$/
  if (emailRegex.test(field)) {
    return 'email'
  } else if (usernameRegex.test(field)) {
    return 'username'
  } else {
    return null
  }
}

/**
 * @component ThemeToggle
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
 */
function LoginForm () {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  
  // Gestion de l'état "continue" pour redirection après succès
  const [continueUrl, setContinueUrl] = useState('')

  // 1. LOGIQUE DE DÉTECTION DE L'HISTORIQUE (REFERRER)
  useEffect(() => {
    // Si 'continue' est déjà présent (ex: passé depuis Register), on l'utilise
    const paramContinue = searchParams.get('continue')
    if (paramContinue) {
      setContinueUrl(paramContinue)
      return
    }

    // Sinon, on regarde l'historique immédiat (referrer)
    if (typeof document !== 'undefined' && document.referrer && typeof window !== "undefined") {
      try {
        const referrerUrl = new URL(document.referrer)
        const currentOrigin = window.location.origin
        
        // Sécurité : On accepte uniquement les referrers de notre propre domaine
        if (referrerUrl.origin === currentOrigin) {
          const path = referrerUrl.pathname
          
          // Anti-boucle : On ne redirige pas vers Login ou Register
          if (path !== '/login' && path !== '/register' && path !== pathname) {
            setContinueUrl(path)
            
            // UX : Ajout transparent du paramètre dans l'URL du navigateur
            const newParams = new URLSearchParams(searchParams.toString())
            newParams.set('continue', path)
            router.replace(`${pathname}?${newParams.toString()}`)
          }
        }
      } catch (e) {
        console.error("Erreur lors de la lecture du referrer", e)
      }
    }
  }, [searchParams, pathname, router])


  const [state, formAction] = useFormState(loginAction, { ...initialState })
  const [usernameOrEmail, setUsernameOrEmail] = useState('')

  function handleUsernameOrEmailChange (e: React.ChangeEvent<HTMLInputElement>) {
    const inputType = checkIfUsernameOrEmail(e.target.value) === 'email' ? 'email' : 'text'
    const inputName = inputType === 'email' ? 'email' : 'username'
    const inputPattern = inputType === 'email' ? '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' : '^[a-zA-Z0-9-_]{3,20}$'
    e.target.name = inputName
    e.target.pattern = inputPattern
    e.target.type = inputType
    setUsernameOrEmail(e.target.value)
  }

  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const errorMessage = state.error

  useEffect(() => {
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
        <Link
          href={continueUrl ? continueUrl : '/'} // Retour intelligent vers la page précédente
          className='flex items-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800'
        >
          <ChevronLeft className='w-5 h-5 mr-1' />
          Retour
        </Link>
        <ThemeToggle />
      </div>

      <div className='w-full max-w-md p-8 space-y-7 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-700 transition-all duration-300 transform hover:shadow-indigo-500/20 mx-4 my-auto'>
        <div className='flex flex-col items-center space-y-2'>
          <Lock className='w-8 h-8 text-indigo-600 dark:text-indigo-400' />
          <h1 className='text-3xl font-bold text-slate-900 dark:text-white'>
            Connexion
          </h1>
        </div>

        <p className='text-center text-slate-500 dark:text-slate-400 text-sm'>
          Accédez à votre espace pour gérer les documents.
        </p>

        {showSuccessMessage && (
          <div className='p-3 text-sm text-green-800 bg-green-100 dark:bg-green-900 dark:text-green-300 rounded-lg border border-green-300 dark:border-green-700' role='alert'>
            Inscription réussie ! Veuillez vous connecter.
          </div>
        )}

        {errorMessage && (
          <div className='p-3 text-sm text-red-800 bg-red-100 dark:bg-red-900 dark:text-red-300 rounded-lg border border-red-300 dark:border-red-700' role='alert'>
            {errorMessage}
          </div>
        )}

        <form action={formAction} className='space-y-6'>
          {/* CHAMP CACHÉ POUR LA REDIRECTION (Supporte aussi callbackUrl legacy) */}
          <input type='hidden' name='continue' value={continueUrl} />
          {searchParams.get('callbackUrl') && (
             <input type='hidden' name='callbackUrl' value={searchParams.get('callbackUrl')!} />
          )}

          <div>
            <label htmlFor='emailOrUsername' className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
              Adresse e-mail ou nom d&apos;utilisateur
            </label>
            <Input
              id='emailOrUsername'
              name='identifier'
              type='text'
              required
              placeholder='exemple@geolib.edu'
              value={usernameOrEmail}
              onChange={handleUsernameOrEmailChange}
            />
          </div>

          <div>
            <label htmlFor='password' className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
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
            <a href='#' className='text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition duration-200'>
              Mot de passe oublié ?
            </a>
          </div>

          <SubmitButton />
        </form>

        <p className='text-center text-sm text-slate-600 dark:text-slate-400'>
          Vous n&apos;avez pas de compte ?{' '}
          {/* LIEN INTELLIGENT POUR PRÉSERVER LE FLUX */}
          <Link
            href={continueUrl ? `/register?continue=${encodeURIComponent(continueUrl)}` : '/register'}
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