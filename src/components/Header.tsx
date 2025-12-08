/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import * as React from 'react'
import Link from 'next/link'
// Importez votre hook useAuth
import { useAuth } from '@/components/AuthProvider'
import { logoutAction } from '@/app/auth/actions' // Importez votre Server Action de déconnexion
// Importations d'icônes (assurez-vous d'avoir installé lucide-react)
import {
  Globe2,
  Moon,
  UserCircle,
  LogIn,
  LogOut,
  BookOpen,
  Map,
  LayoutDashboard,
  Menu,
  Sun,
  X,
  Settings
} from 'lucide-react'
import { Button } from './ui/button'
import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from './ui/alert-dialog'
import { usePathname } from 'next/dist/client/components/navigation'
import { useTheme } from '@/context/ThemeProvider'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import Logo from './ui/logo'

// -----------------------------------------------------------------------------
// 1. Définition des Liens de Navigation
// -----------------------------------------------------------------------------

type NavLink = {
  href: string
  label: string
  page?: string
  icon: React.ReactNode
  // Rôles requis (INVITE est utilisé pour déconnecté)
  requires: ('INVITE' | 'READER' | 'AUTHOR' | 'LIBRARIAN' | 'ADMIN')[]
}
const labels = {
  invite: 'Invité',
  reader: 'Lecteur',
  author: 'Auteur',
  librarian: 'Bibliothécaire',
  admin: 'Administrateur'
}

const commonLinks: NavLink[] = [
  {
    href: '/',
    label: 'Accueil',
    page: "Accueil",
    icon: <Globe2 className='w-4 h-4' />,
    requires: ['INVITE', 'READER', 'AUTHOR', 'LIBRARIAN', 'ADMIN']
  },
  {
    href: '/map',
    label: 'Carte Interactive',
    page: "Carte",
    icon: <Map className='w-4 h-4' />,
    requires: ['INVITE', 'READER', 'AUTHOR', 'LIBRARIAN', 'ADMIN']
  },
]

const authenticatedLinks: NavLink[] = [
  {
    href: '/admin/loans',
    label: 'Gestion Prêts',
    page: "Admin",
    icon: <BookOpen className='w-4 h-4' />,
    requires: ['LIBRARIAN', 'ADMIN']
  },
  {
    href: '/dashboard',
    label: 'Tableau de Bord',
    page: "Admin",
    icon: <LayoutDashboard className='w-4 h-4' />,
    requires: ['ADMIN', "AUTHOR", "LIBRARIAN"]
  }
]

// Fichier : components/Header.tsx

/**
 * Composant de sélection de thème utilisant DropdownMenuRadioGroup.
 * Permet de choisir entre 'light', 'dark' et 'system'.
 */
/**
 * Composant de sélection de thème utilisant DropdownMenuRadioGroup.
 * Permet de choisir entre 'light', 'dark' et 'system'.
 */
const ThemeSelector = () => {
  // Récupération de l'état actuel du thème et de la fonction de modification
  const { theme, setTheme, isDark } = useTheme()
  
  // 1. NOUVEL ÉTAT : Utilisé pour savoir si le composant est monté côté client
  const [mounted, setMounted] = useState(false)

  // 2. useEffect : S'exécute uniquement après le premier rendu (hydratation)
  useEffect(() => {
    setMounted(true)
  }, [])

  // 3. LOGIQUE D'ICÔNE CONDITIONNELLE : 
  // Déterminer l'icône réelle
  let TriggerIcon = Sun
  if (mounted) {
    TriggerIcon = isDark ? Moon : Sun
  }
  
  // Fonction de gestion du changement de valeur
  const handleThemeChange = (value: string) => {
    setTheme(value as 'light' | 'dark' | 'system')
  }

 

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Le Button sert d'élément déclencheur (Trigger) */}
        <Button
          className='cursor-pointer'
          aria-label='Choisir le thème'
          variant='outline'
          size='icon'
        >
          {/* Affiche l'icône déterminée par la logique 'mounted' (la bonne icône) */}
          <TriggerIcon className='w-5 h-5' />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className='w-48'>
        <DropdownMenuLabel>Sélectionner le Thème</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Utilisation de DropdownMenuRadioGroup pour la sélection exclusive */}
        <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
          
          <DropdownMenuRadioItem value='light'>
            <Sun className='w-4 h-4 mr-2' />
            Clair
          </DropdownMenuRadioItem>
          
          <DropdownMenuRadioItem value='dark'>
            <Moon className='w-4 h-4 mr-2' />
            Sombre
          </DropdownMenuRadioItem>
          
          <DropdownMenuRadioItem value='system'>
            <Settings className='w-4 h-4 mr-2' />
            Système
          </DropdownMenuRadioItem>

        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
// -----------------------------------------------------------------------------
// 2. Composant de Navigation Principal
// -----------------------------------------------------------------------------
export default function Header () {
  // Récupération de l'état d'authentification
  const { isAuthenticated, role, user } = useAuth();
  const pathname = usePathname()
  // Cette fonction gère la correspondance exacte ET la correspondance des sous-chemins (pour ignorer les /admin/loans/123 et les URL Params)
  const isActive = (href: string) => {
    // 1. Cas spécial pour la racine '/' : doit correspondre EXACTEMENT
    if (href === '/') {
      return pathname === href
    }
    // 2. Tous les autres cas : vérifie si le chemin actuel COMMENCE par le href du lien
    return pathname.startsWith(href)
  }
  const activeLink = (href: string) => {
   // Retourne le lien actif complet
   const link = [...commonLinks, ...authenticatedLinks].find(link => link.href === href)
   return link || null
  }
  // ✨ NOUVEAUTÉ : État pour gérer l'ouverture/fermeture du menu mobile
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Concaténer les liens communs et les liens spécifiques
  const allLinks = [...commonLinks, ...authenticatedLinks]
  // Filtrer les liens en fonction du rôle de l'utilisateur
  const activeLinks = allLinks.filter(link => link.requires.includes(role))

  // Fonction pour fermer le menu lors du clic sur un lien
  const closeMenu = () => setIsMenuOpen(false)

  return (
    // Utilisez un Fragment ou une Div pour englober le header et le menu
    <header className='sticky top-0 z-200'>
      <header className='h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-2 lg:px-4 shadow-sm z-50 shrink-0'>
        {/* 📚 Logo & Titre */}
        <Link className='flex items-center gap-3 dark:text-white' href='/'>
          <div className='bg-blue-600 text-white p-1.5 rounded-lg shadow-sm'>
            <Logo className='w-6 h-6' />
          </div>
          <h1 className='text-xl font-bold tracking-tight'>
            GeoLib{' '}
            <span className='text-slate-400 font-normal text-sm'>
              {activeLink(pathname)?.page || ''}
            </span>
          </h1>
        </Link>

        {/* 🧭 Menu Central (Navigation Adaptée) - NON MODIFIÉ POUR DESKTOP */}
        <nav className='hidden md:flex items-center gap-6 mr-4 text-sm font-medium text-slate-600 dark:text-slate-300'>
          {activeLinks.map(link => (
            // L'URL actuelle doit être comparée à link.href pour déterminer le style actif
            <Link
              key={link.href}
              href={link.href}
              // Style actif (simulé ici pour la page d'accueil '/')
              className={`flex items-center gap-2 p-3 rounded-lg font-medium transition-colors ${
                isActive(link.href)
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* ⚙️ Menu Droite (Actions) - NON MODIFIÉ */}
        <div className='flex items-center gap-3'>
          {/* Toggle Dark Mode (Gardé tel quel) */}
          <ThemeSelector />

          {/* Bouton d'Action (Connexion ou Compte/Déconnexion) - AJOUT DE LA VISIBILITÉ MOBILE POUR CONNEXION/DECONNEXION */}
          {isAuthenticated ? (
            <>
              {/* Bouton 'Mon Compte' pour les connectés */}
              <Link href='/profile' passHref>
                <div className='flex items-center gap-1'>
                  <div className='hidden md:flex flex-col items-end mr-2'>
                    <span className='text-sm font-semibold '>
                      {user?.name || 'Compte'}{' '}
                    </span>
                    <span className='text-xs text-muted-foreground'>
                      {labels[role.toLowerCase() as keyof typeof labels]}
                    </span>
                  </div>
                  <UserCircle className='w-6 h-6' />
                </div>
              </Link>
              {/* LogoutDialog s'affiche uniquement sur desktop pour ne pas encombrer le header mobile */}
              <LogoutDialog isMobile={false} />
            </>
          ) : (
            <Link href='/login' passHref>
              <Button
                variant='ghost'
                className='hidden sm:flex items-center gap-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm'
              >
                <LogIn className='w-4 h-4' />
                <span>Connexion</span>
              </Button>
            </Link>
          )}

          {/* Bouton Hamburger pour Mobile - AJOUT DU CLIC POUR TOGGLE */}
          <Button
            className='cursor-pointer md:hidden'
            aria-label='Toggle menu'
            variant='outline'
            size='icon'
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {/* Bascule de l'icône Menu / X */}
            {isMenuOpen ? (
              <X className='w-5 h-5' /> // Affiche X lorsque le menu est ouvert
            ) : (
              <Menu className='w-5 h-5' /> // Affiche Menu lorsque le menu est fermé
            )}
          </Button>
        </div>
      </header>

      {/* 📱 NOUVEAUTÉ : Menu de Navigation Mobile (s'affiche conditionnellement) */}
      <nav
        className={`md:hidden absolute top-16 z-500 left-0 right-0 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-lg transition-all duration-300 ease-in-out ${
          isMenuOpen
            ? 'max-h-screen opacity-100 py-2 z-50'
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <ul className='flex flex-col gap-1 p-2'>
          {/* Liens de navigation principaux */}
          {activeLinks.map(link => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={closeMenu} // Ferme le menu après un clic
                className='flex items-center gap-2 p-3 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium'
              >
                {link.icon}
                {link.label}
              </Link>
            </li>
          ))}

          {/* Séparateur et actions d'authentification pour mobile */}
          <hr className='my-2 border-slate-200 dark:border-slate-700' />

          {isAuthenticated ? (
            <>
              <li>
                <Link
                  href='/profile'
                  onClick={closeMenu}
                  className='flex items-center gap-2 p-3 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium'
                >
                  <UserCircle className='w-4 h-4' />
                  Mon Compte
                </Link>
              </li>
              <li>
                <LogoutDialog isMobile={true} />
              </li>
            </>
          ) : (
            <li>
              <Link
                href='/login'
                onClick={closeMenu}
                className='flex items-center gap-2 p-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium'
              >
                <LogIn className='w-4 h-4' />
                Se Connecter
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </header>
  )
}

// Fichier : components/Header.tsx (Nouveau corps de la fonction LogoutDialog)

// Ajout de la prop isMobile pour styliser différemment
export function LogoutDialog ({ isMobile }: { isMobile: boolean }) {
  const [isLogingOut, setIsLogingOut] = useState(false)
  const [open, setOpen] = useState(false)
  // Gestion de la déconnexion
  const handleLogout = async () => {
    // Appel de la Server Action pour déconnecter
    setIsLogingOut(true)
    await logoutAction()
    // Le layout de Next.js se rafraîchira, et l'utilisateur reviendra à l'état déconnecté
    setIsLogingOut(false)
  }
  function closeDiaog () {
    if (!isLogingOut) {
      setOpen(false)
    }
  }
  function toggleDialog (open: boolean) {
    if (!open) {
      closeDiaog()
      return
    }
    setOpen(true)
  }

  return (
    <AlertDialog open={open} onOpenChange={toggleDialog}>
      {/* Bouton pour déclencher la déconnexion : style différent selon mobile ou desktop */}
      <div
        onClick={() => setOpen(true)}
        className={
          isMobile
            ? 'flex items-center gap-2 p-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 transition-colors font-medium cursor-pointer'
            : 'rounded-full hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 transition-colors hidden sm:block cursor-pointer p-2'
        }
        aria-label='Déconnexion'
      >
        <LogOut className='w-5 h-5' />
        {isMobile && <span>Déconnexion</span>}{' '}
        {/* Affiche le texte sur mobile */}
      </div>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Déconnexion ?</AlertDialogTitle>
          <AlertDialogDescription>
            Voulez-vous vraiment vous déconnecter
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant='secondary'
            disabled={isLogingOut}
            onClick={closeDiaog}
          >
            Annuler
          </Button>
          <Button
            disabled={isLogingOut}
            onClick={() => handleLogout()}
            variant='destructive'
          >
            {isLogingOut ? 'Déconnexion...' : 'Oui Se Déconnecter'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
