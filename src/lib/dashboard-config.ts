import { EntityType, EntityData, UserRole } from '@/lib/types'
import { Book, Building2, GraduationCap, Layers, UserPlus, Users, LucideIcon } from 'lucide-react'

// Types locaux pour la gestion de l'état du dashboard
export type CurrentEntity = {
  type: EntityType | 'author_profiles'
  data: EntityData
  isEditing: boolean
  id?: string
}

export type DeleteTarget = {
  type: EntityType
  id: string
}

// Définition d'un thème de couleur pour chaque section
export interface ColorTheme {
  primary: string // Texte principal et icônes
  bg: string // Fonds légers (badges, boutons actifs)
  border: string // Bordures
  hover: string // États au survol
  badge: string // Badge spécifique (variante solid)
}

export interface NavItem {
  type: EntityType
  label: string
  icon: LucideIcon
  role: UserRole
  theme: ColorTheme
}

// Configuration de la navigation avec thèmes
export const NAV_ITEMS: NavItem[] = [
  {
    type: 'books',
    label: 'Travaux & Livres',
    icon: Book,
    role: UserRole.READER,
    theme: {
      primary: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      hover: 'hover:bg-blue-50 dark:hover:bg-blue-900/30',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    }
  },
  {
    type: 'faculties',
    label: 'Facultés',
    icon: GraduationCap,
    role: UserRole.READER,
    theme: {
      primary: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-900/20',
      border: 'border-violet-200 dark:border-violet-800',
      hover: 'hover:bg-violet-50 dark:hover:bg-violet-900/30',
      badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300'
    }
  },
  {
    type: 'departments',
    label: 'Départements',
    icon: Building2,
    role: UserRole.READER,
    theme: {
      primary: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
    }
  },
  {
    type: 'studyareas',
    label: "Zones d'Étude",
    icon: Layers,
    role: UserRole.READER,
    theme: {
      primary: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      hover: 'hover:bg-amber-50 dark:hover:bg-amber-900/30',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
    }
  },
  {
    type: 'users',
    label: 'Utilisateurs',
    icon: Users,
    role: UserRole.LIBRARIAN,
    theme: {
      primary: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      border: 'border-rose-200 dark:border-rose-800',
      hover: 'hover:bg-rose-50 dark:hover:bg-rose-900/30',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300'
    }
  },
  {
    type: 'create_ghost_author',
    label: "Profil auteur",
    icon: UserPlus,
    role: UserRole.LIBRARIAN,
    theme: {
      primary: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-50 dark:bg-cyan-900/20',
      border: 'border-cyan-200 dark:border-cyan-800',
      hover: 'hover:bg-cyan-50 dark:hover:bg-cyan-900/30',
      badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300'
    }
  }
]