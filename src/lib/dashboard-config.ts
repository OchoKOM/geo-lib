import { EntityType, EntityData, UserRole } from '@/lib/types'
import { Book, Building2, GraduationCap, Layers, UserPlus, Users } from 'lucide-react'

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

// Configuration de la navigation
export const NAV_ITEMS: {
  type: EntityType
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>,
  role?: UserRole
}[] = [
  {
    type: 'books',
    label: 'Travaux & Livres',
    icon: Book,
    role: UserRole.READER
  },
  {
    type: 'faculties',
    label: 'Facultés',
    icon: GraduationCap ,
    role: UserRole.READER
  },
  {
    type: 'departments',
    label: 'Départements',
    icon: Building2,
    role: UserRole.READER
  },
  {
    type: 'studyareas',
    label: "Zones d'Étude",
    icon: Layers,
    role: UserRole.READER
  },
  {
    type: 'users',
    label: 'Utilisateurs',
    icon: Users ,
    role: UserRole.LIBRARIAN
  },
  {
    type: 'author_profiles',
    label: 'Profil auteur',
    icon: UserPlus,
    role: UserRole.LIBRARIAN
  }
]