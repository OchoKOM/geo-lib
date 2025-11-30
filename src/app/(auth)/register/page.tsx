/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { ChevronLeft, UserPlus, Moon, Sun, Loader2 } from 'lucide-react'
import { useEffect, useState, useRef, Suspense } from 'react'
import Link from 'next/link'
import { registerAction } from '../../auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter, useSearchParams } from 'next/navigation' // Nécessaire pour la redirection

// --- TYPES DE RETOUR ---
type AuthActionState = {
  error: string | null
  success?: boolean
  // Ajout de 'fields' pour stocker les données du formulaire en cas d'erreur
  fields: {
    name: string
    email: string
  }
}

// Définition de l'état initial pour useFormState
const initialState: AuthActionState = {
  error: null,
  success: undefined,
  fields: { name: '', email: '' } // Initialisation des champs vides
}

/**
 * @component ThemeToggle
 * @description Composant simple pour basculer entre les modes clair et sombre (inchangé).
 */
function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  // Synchronise le thème avec le DOM et localStorage au montage
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

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDark(initialDark)
    }
  }, [])

  /**
   * @function toggleTheme
   * @description Bascule la classe "dark" sur l'élément <html>.
   */
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
    <Button
      size='icon-lg'
      onClick={toggleTheme}
      aria-label='Toggle dark mode'
      className='p-3 rounded-full cursor-pointer'
      variant='outline'
    >
      {isDark ? <Sun className='w-5 h-5' /> : <Moon className='w-5 h-5' />}
    </Button>
  )
}

/**
 * @component SubmitButton
 * @description Composant qui gère l'état de chargement du bouton d'inscription.
 */
function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type='submit'
      aria-disabled={pending}
      disabled={pending}
      className='w-full'
    >
      {pending ? 'Inscription en cours...' : "S'inscrire"}
    </Button>
  )
}

/**
 * @component RegisterForm
 * @description Composant principal pour le formulaire d'inscription.
 */
function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Définition de l'état du formulaire avec useFormState
  const [state, formAction] = useFormState(registerAction, initialState)

  // État local pour gérer la persistance des données
  const [formValues, setFormValues] = useState(state.fields)
  const formRef = useRef<HTMLFormElement>(null);

  // Mettre à jour l'état local si useFormState retourne des valeurs (en cas d'erreur)
  useEffect(() => {
    setFormValues(state.fields)
  }, [state.fields])

  // Gérer la redirection en cas de succès
  useEffect(() => {
    if (state.success) {
      // Nettoyage des champs après succès (ou redirection immédiate)
      setFormValues({ name: '', email: '' })
      // get from the url the redirect url if any
      const callbackUrl = searchParams.get('back_url') || '/';
      // Optionnel: Afficher un message de succès avant de rediriger
      router.push(encodeURIComponent(callbackUrl));
    }
  }, [state.success, router, searchParams])

  const errorMessage = state.error



  return (
    <div className='flex flex-col items-center justify-center w-full h-full min-h-[100vh] py-8 bg-slate-50 dark:bg-slate-900 transition-colors duration-500 relative'>
      
      {/* Conteneur pour les éléments en haut à gauche et à droite */}
      <div className='absolute top-4 left-4 right-4 flex justify-between items-center z-10 sm:top-8 sm:left-8 sm:right-8'>
        {/* Bouton de retour vers l'accueil - Utilisation de Link */}
        <Link
          href='/'
          className='flex items-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800'
        >
          <ChevronLeft className='w-5 h-5 mr-1' />
          Accueil
        </Link>

        {/* Bouton de bascule du thème */}
        <ThemeToggle />
      </div>

      {/* Carte d'inscription (Même style que la connexion) */}
      <div className='w-full max-w-md p-8 space-y-7 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-700 transition-all duration-300 transform hover:shadow-indigo-500/20 mx-4 my-auto'>
        <div className='flex flex-col items-center space-y-2'>
          <UserPlus className='w-8 h-8 text-indigo-600 dark:text-indigo-400' />
          <h1 className='text-3xl font-bold text-slate-900 dark:text-white'>
            Créer un compte GeoLib
          </h1>
        </div>

        <p className='text-center text-slate-500 dark:text-slate-400 text-sm'>
          Rejoignez la plateforme pour accéder aux ressources géospatiales.
        </p>

        {/* Affichage des Messages d'Erreur */}
        {errorMessage && (
          <div
            className='p-3 text-sm text-red-800 bg-red-100 dark:bg-red-900 dark:text-red-300 rounded-lg border border-red-300 dark:border-red-700'
            role='alert'
          >
            {errorMessage}
          </div>
        )}
        
        {/* Message de Succès (Invisible en temps normal, visible après soumission si success: true) */}
        {state.success === true && (
            <div 
                className='p-3 text-sm text-green-800 bg-green-100 dark:bg-green-900 dark:text-green-300 rounded-lg border border-green-300 dark:border-green-700'
                role='status'
            >
                Inscription réussie ! Redirection en cours...
            </div>
        )}

        {/* Formulaire utilisant l'action du serveur */}
        <form
            ref={formRef}
            action={formAction}
            className='space-y-4'
        >
          {/* Champ Nom Complet */}
          <div>
            <label
              htmlFor='name'
              className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'
            >
              Nom complet
            </label>
            <Input
              id='name'
              name='name'
              type='text'
              required
              placeholder='Votre nom'
              // Persistance de la valeur
              defaultValue={formValues.name}
              key={state.success ? 'success-name' : 'error-name'} // Force la réinitialisation après succès
            />
          </div>

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
              // Persistance de la valeur
              defaultValue={formValues.email}
              key={state.success ? 'success-email' : 'error-email'} // Force la réinitialisation après succès
            />
          </div>

          {/* Champ Mot de passe (NE DOIT PAS être persistant pour la sécurité) */}
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
              placeholder='8 caractères minimum'
            />
          </div>

          {/* Champ Confirmer Mot de passe (NE DOIT PAS être persistant) */}
          <div>
            <label
              htmlFor='confirmPassword'
              className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'
            >
              Confirmer le mot de passe
            </label>
            <Input
              id='confirmPassword'
              name='confirmPassword'
              type='password'
              required
              placeholder='Confirmer le mot de passe'
            />
          </div>

          <div className='pt-2'>
            <SubmitButton />
          </div>
        </form>

        <p className='text-center text-sm text-slate-600 dark:text-slate-400'>
          Vous avez déjà un compte ?{' '}
          {/* Utilisation de Link pour la navigation Next.js */}
          <Link
            href='/login'
            className='font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition duration-200 hover:underline'
          >
            Connectez-vous ici
          </Link>
        </p>
      </div>
      <div className='flex-grow'></div>
    </div>
  )
}

export default function RegisterPage() {
  return <Suspense
      fallback={
        <div className='h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400'>
          <Loader2 className='w-10 h-10 animate-spin mb-4 text-blue-600' />
          <p>Chargement...</p>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
}