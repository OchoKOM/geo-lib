/* eslint-disable react-hooks/static-components */
'use client'
import Link from 'next/link'
import {
  FileText,
  BookOpen,
  GraduationCap,
  Map as MapIcon,
  Compass,
  Calendar,
  Search,
  MapPin,
  Eye,
  Download,
  List,
  LayoutGrid,
  Building2,
  Landmark
} from 'lucide-react'
import { BookType } from '@prisma/client'
import { useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Combobox, ComboboxContent, ComboboxItem, ComboboxTrigger, ComboboxValue } from './ui/combobox'

// Interface pour la configuration visuelle d'un type de livre
export interface TypeConfig {
  label: string
  colorClass: string
  borderColor: string
}

// Fonction utilitaire pour obtenir la configuration visuelle
export const getTypeConfig = (type: BookType): TypeConfig => {
  switch (type) {
    case 'TFC':
      return {
        label: 'TFC',
        colorClass:
          'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
        borderColor: 'bg-green-500'
      }
    case 'MEMOIRE':
      return {
        label: 'Mémoire',
        colorClass:
          'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
        borderColor: 'bg-purple-500'
      }
    case 'THESE':
      return {
        label: 'Thèse',
        colorClass:
          'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
        borderColor: 'bg-orange-500'
      }
    case 'OUVRAGE':
      return {
        label: 'Ouvrage',
        colorClass:
          'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
        borderColor: 'bg-blue-500'
      }
    default:
      return {
        label: 'Autre',
        colorClass:
          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        borderColor: 'bg-slate-500'
      }
  }
}

// Interfaces pour les données de livre
export interface BookWithRelations {
  id: string
  title: string
  description: string
  type: BookType
  createdAt: Date
  author: {
    user: {
      name: string | null
    } | null
  } | null
  studyAreas: {
    studyArea: {
      name: string
    }
  }[]
  // Ajoutez d'autres champs si nécessaire
}

export interface BookCardProps {
  book: BookWithRelations
  style: TypeConfig
}

// Définition des types de props
interface SidebarProps {
  stats: {
    tfc: number
    memoires: number
    theses: number
    cartes: number
  }
}

export const Sidebar = ({ stats }: SidebarProps) => (
  <div className='space-y-6'>
    <div>
      <h3 className='text-sm font-bold text-slate-400 uppercase tracking-wider mb-3'>
        Par Type de Document
      </h3>
      <div className='space-y-2'>
        <Link
          href='/?type=TFC'
          className='group flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-green-400 dark:hover:border-green-500 cursor-pointer transition-all shadow-sm'
        >
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-md bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'>
              <FileText className='w-4 h-4' />
            </div>
            <span className='font-medium text-slate-700 dark:text-slate-200'>
              TFC / TFE
            </span>
          </div>
          <span className='text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded'>
            {stats.tfc}
          </span>
        </Link>

        <Link
          href='/?type=MEMOIRE'
          className='group flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500 cursor-pointer transition-all shadow-sm'
        >
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'>
              <BookOpen className='w-4 h-4' />
            </div>
            <span className='font-medium text-slate-700 dark:text-slate-200'>
              Mémoires
            </span>
          </div>
          <span className='text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded'>
            {stats.memoires}
          </span>
        </Link>

        <Link
          href='/?type=THESE'
          className='group flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-400 dark:hover:border-orange-500 cursor-pointer transition-all shadow-sm'
        >
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-md bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'>
              <GraduationCap className='w-4 h-4' />
            </div>
            <span className='font-medium text-slate-700 dark:text-slate-200'>
              Thèses
            </span>
          </div>
          <span className='text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded'>
            {stats.theses}
          </span>
        </Link>

        <Link
          href='/maps'
          className='group flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-500 cursor-pointer transition-all shadow-sm'
        >
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-md bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400'>
              <MapIcon className='w-4 h-4' />
            </div>
            <span className='font-medium text-slate-700 dark:text-slate-200'>
              Zones d&apos;Étude
            </span>
          </div>
          <span className='text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded'>
            {stats.cartes}
          </span>
        </Link>
      </div>
    </div>

    <div className='bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white shadow-lg relative overflow-hidden'>
      <div className='relative z-10'>
        <h4 className='font-bold text-lg mb-1'>Besoin d&apos;aide ?</h4>
        <p className='text-blue-100 text-sm mb-3'>
          Consultez le guide de recherche spatiale pour optimiser vos résultats.
        </p>
        <Link href="/user-guide" className='text-xs font-bold bg-white text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition'>
          Voir le Guide
        </Link>
      </div>
      <Compass className='absolute -bottom-4 -right-4 w-24 h-24 text-white opacity-10' />
    </div>
  </div>
)

// Composant pour la carte d'un livre en mode Liste
const BookListItem = ({ book, style }: BookCardProps) => (
  <Link href={`/book/${book.id}`} key={book.id}>
    <div className='search-card bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 relative overflow-hidden group hover:shadow-lg transition-shadow'>
      {/* Bande de couleur latérale */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${style.borderColor}`}
      ></div>

      <div className='flex-grow space-y-2'>
        <div className='flex items-start justify-between'>
          <div className='flex gap-2 items-center mb-1'>
            {/* Badge du Type */}
            <span
              className={`badge border text-xs font-semibold px-2 py-0.5 rounded-full ${style.colorClass}`}
            >
              {style.label}
            </span>
            {/* Année */}
            <span className='text-xs text-slate-400 font-medium flex items-center gap-1'>
              <Calendar className='w-3 h-3' />
              {new Date(book.createdAt).getFullYear()}
            </span>
          </div>
        </div>
        {/* Titre */}
        <h4 className='text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'>
          {book.title}
        </h4>
        {/* Description */}
        <p className='text-sm text-slate-500 dark:text-slate-400 line-clamp-2'>
          {book.description}
        </p>

        {/* Méta-données */}
        <div className='flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800'>
          {/* Auteur */}
          <div className='flex items-center gap-2'>
            <div className='w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300'>
              {book.author?.user?.name
                ? book.author.user.name.substring(0, 2).toUpperCase()
                : 'UK'}
            </div>
            <span className='text-xs font-medium text-slate-600 dark:text-slate-400'>
              {book.author?.user?.name || 'Auteur inconnu'}
            </span>
          </div>
          {/* Zone d'étude */}
          {book.studyAreas[0] && (
            <div className='flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md'>
              <MapPin className='w-3 h-3' />
              <span>{book.studyAreas[0].studyArea.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Boutons d'action */}
      <div className='flex md:flex-col items-center justify-center gap-2 border-l border-slate-100 dark:border-slate-800 pl-0 md:pl-4'>
        <button
          className='p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors'
          title='Voir'
        >
          <Eye className='w-5 h-5' />
        </button>
        <button
          className='p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors'
          title='Télécharger'
        >
          <Download className='w-5 h-5' />
        </button>
      </div>
    </div>
  </Link>
)

// Composant pour la carte d'un livre en mode Grille
const BookGridItem = ({ book, style }: BookCardProps) => (
  <Link href={`/book/${book.id}`} key={book.id}>
    <div className='grid-card bg-white dark:bg-slate-900 p-4 rounded-xl shadow-md border border-slate-100 dark:border-slate-800 flex flex-col items-start space-y-3 relative group hover:shadow-lg transition-shadow h-full'>
      {/* Placeholder d'image / icône */}
      <div
        className={`w-full h-32 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2`}
        style={{
          borderBottom: `4px solid ${
            style.borderColor === 'bg-green-500'
              ? '#10B981'
              : style.borderColor === 'bg-purple-500'
              ? '#8B5CF6'
              : style.borderColor === 'bg-orange-500'
              ? '#F97316'
              : '#3B82F6'
          }`
        }}
      >
        {style.label === 'TFC' && (
          <FileText className='w-8 h-8 text-green-500 opacity-60' />
        )}
        {style.label === 'Mémoire' && (
          <BookOpen className='w-8 h-8 text-purple-500 opacity-60' />
        )}
        {style.label === 'Thèse' && (
          <GraduationCap className='w-8 h-8 text-orange-500 opacity-60' />
        )}
        {style.label === 'Ouvrage' && (
          <BookOpen className='w-8 h-8 text-blue-500 opacity-60' />
        )}
        {style.label === 'Autre' && (
          <Search className='w-8 h-8 text-slate-500 opacity-60' />
        )}
      </div>

      {/* Badge du Type */}
      <span
        className={`badge border text-xs font-semibold px-2 py-0.5 rounded-full ${style.colorClass}`}
      >
        {style.label}
      </span>

      {/* Titre */}
      <h4 className='text-md font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 w-full flex-grow'>
        {book.title}
      </h4>

      {/* Méta-données */}
      <div className='w-full pt-3 border-t border-slate-100 dark:border-slate-800'>
        <div className='flex items-center gap-2 mb-1'>
          <MapPin className='w-3 h-3 text-blue-500' />
          <span className='text-xs text-slate-600 dark:text-slate-400'>
            {book.studyAreas[0]
              ? book.studyAreas[0].studyArea.name
              : 'Non localisé'}
          </span>
        </div>
        <div className='flex justify-between items-center text-xs text-slate-400'>
          <span>{new Date(book.createdAt).getFullYear()}</span>
          <button
            className='p-1 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors'
            title='Voir'
          >
            <Eye className='w-4 h-4' />
          </button>
        </div>
      </div>
    </div>
  </Link>
)

// Composant principal pour le rendu des résultats
interface BookResultsProps {
  books: BookWithRelations[]
  isGridView: boolean
  query?: string
}

export const BookResults = ({ books, isGridView, query }: BookResultsProps) => {
  const CardComponent = isGridView ? BookGridItem : BookListItem
  const gridClasses = isGridView
    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'
    : 'grid grid-cols-1 gap-4'

  if (books.length === 0) {
    return (
      <div className='col-span-full flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800'>
        <div className='bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4'>
          <Search className='w-8 h-8 text-slate-400' />
        </div>
        <h3 className='text-lg font-bold text-slate-700 dark:text-slate-200'>
          Aucun résultat trouvé
        </h3>
        <p className='text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xs text-center'>
          Essayez de modifier vos filtres ou utilisez des mots-clés plus
          généraux.
        </p>
        <Link href='/'>
          <button className='mt-4 text-blue-600 font-medium text-sm hover:underline'>
            Réinitialiser la recherche
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div className={gridClasses}>
      {books.map(book => {
        const style = getTypeConfig(book.type)
        return <CardComponent key={book.id} book={book} style={style} />
      })}
    </div>
  )
}

export function ViewToggle ({
  isGridView: isGV,
  onViewChange
}: {
  isGridView: boolean
  onViewChange: (isGridView: boolean) => void
}) {
  const [isGridView, setIsGridView] = useState(isGV)
  return (
    <div className=' flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800'>
      <div
        className={`p-1.5 rounded-md transition-colors ${
          !isGridView
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
            : 'text-slate-400'
        }`}
        onClick={() => {
          setIsGridView(false)
          onViewChange(false)
        }}
      >
        <List className='w-4 h-4' />
      </div>
      <div
        className={`p-1.5 rounded-md transition-colors ${
          isGridView
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
            : 'text-slate-400'
        }`}
        onClick={() => {
          setIsGridView(true)
          onViewChange(true)
        }}
      >
        <LayoutGrid className='w-4 h-4' />
      </div>
    </div>
  )
}

// Définition des types pour les données passées depuis le serveur
export interface DepartmentData {
  id: string
  name: string
  facultyId: string | null
}

export interface FacultyData {
  id: string
  name: string
  departments: DepartmentData[]
}

interface FacultyFiltersProps {
  faculties: FacultyData[]
}

// Composant Client pour l'interaction avec les filtres
export const FacultyFilters = ({ faculties }: FacultyFiltersProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 1. Gestion de l'état local basé sur l'URL
  const currentFacultyId = searchParams.get('facultyId') || ''
  const currentDepartmentId = searchParams.get('departmentId') || ''

  const [selectedFacultyId, setSelectedFacultyId] = useState(currentFacultyId)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(currentDepartmentId)

  // 2. Mémorisation des départements disponibles
  const availableDepartments = useMemo(() => {
    const faculty = faculties.find(f => f.id === selectedFacultyId)
    return faculty?.departments || []
  }, [faculties, selectedFacultyId])

  // 3. Logique de mise à jour de l'URL
  const updateUrl = (newFacultyId: string, newDepartmentId: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (newFacultyId) {
      params.set('facultyId', newFacultyId)
    } else {
      params.delete('facultyId')
    }

    if (newDepartmentId) {
      params.set('departmentId', newDepartmentId)
    } else {
      params.delete('departmentId')
    }
    
    // Conserver les autres filtres (q, type, view, etc.)
    router.push(`/?${params.toString()}`)
  }

  // --- Handlers ---

  const handleFacultyChange = (newFacultyId: string) => {
    // Si la faculté change, réinitialiser le département
    setSelectedFacultyId(newFacultyId)
    setSelectedDepartmentId('')
    updateUrl(newFacultyId, '')
  }

  const handleDepartmentChange = (newDepartmentId: string) => {
    setSelectedDepartmentId(newDepartmentId)
    // Assurez-vous que la faculté est toujours sélectionnée si un département l'est
    updateUrl(selectedFacultyId, newDepartmentId)
  }
  
  // Utilitaire pour un composant de sélection simple (ajoutez ce composant Select si non existant)
  // J'assume que vous avez un composant Select générique basé sur shadcn/ui.
  const SelectComponent = ({ value, onValueChange, placeholder, items, icon: Icon }: {
    value: string
    onValueChange: (v: string) => void
    placeholder: string
    items: { value: string; label: string }[]
    icon: React.ElementType
  }) => (
    <Combobox value={value} onValueChange={onValueChange}>
      <ComboboxTrigger className="w-full bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-blue-400 transition-colors">
        <Icon className="w-4 h-4 text-slate-500 mr-2" />
        <ComboboxValue placeholder={placeholder} />
      </ComboboxTrigger>
      <ComboboxContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
        <ComboboxItem value="" className="text-slate-500">
          {placeholder} (Tous)
        </ComboboxItem>
        {items.map(item => (
          <ComboboxItem key={item.value} value={item.value} label={item.label}>
            {item.label}
          </ComboboxItem>
        ))}
      </ComboboxContent>
    </Combobox>
  )

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
        Filtres Institutionnels
      </h3>

      {/* Select de la Faculté */}
      <SelectComponent
        value={selectedFacultyId}
        onValueChange={handleFacultyChange}
        placeholder="Sélectionner une Faculté"
        items={faculties.map(f => ({ value: f.id, label: f.name }))}
        icon={GraduationCap}
      />

      {/* Select du Département (désactivé si aucune faculté sélectionnée) */}
      <SelectComponent
        value={selectedDepartmentId}
        onValueChange={handleDepartmentChange}
        placeholder="Sélectionner un Département"
        items={availableDepartments.map(d => ({ value: d.id, label: d.name }))}
        icon={Building2}
      />
    </div>
  )
}