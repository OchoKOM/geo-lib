// Fichier : components/catalog/CatalogFilters.tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Search, RotateCcw } from 'lucide-react'
// Importer les types depuis le fichier parent (ou un fichier de types commun)
import { 
  CatalogSearchParams, 
  CatalogFilterData, 
  FilterOptions, 
  YearOption 
} from '@/app/(main)/catalog/page' 


interface CatalogFiltersProps {
  filters: CatalogFilterData
  // Les clés sont des strings, les valeurs sont des strings ou undefined
  currentParams: CatalogSearchParams 
}

export function CatalogFilters({ filters, currentParams }: CatalogFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  // État local pour la recherche par mot-clé
  const [searchTerm, setSearchTerm] = useState<string>(currentParams.search || '')
  
  // Fonction de manipulation des filtres
  const handleFilterChange = (key: keyof CatalogSearchParams, value: string) => {
    // Créer une nouvelle URLSearchParams à partir des paramètres existants
    // Note : On utilise la version de l'objet pour la construction de URLSearchParams
    const currentParamsObject: Record<string, string> = Object.fromEntries(
        Object.entries(currentParams).filter(([, val]) => val !== undefined) as [string, string][]
    )
    const params = new URLSearchParams(currentParamsObject)

    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    // Réinitialiser la pagination si on change de filtre
    params.delete('page') 

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  // Fonction de recherche par mot-clé
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Le type est sécurisé par keyof CatalogSearchParams
    handleFilterChange('search', searchTerm) 
  }

  // Fonction de réinitialisation des filtres
  const handleReset = () => {
    startTransition(() => {
        router.push(pathname)
    })
    setSearchTerm('')
  }

  // Déterminer si un filtre est actif (hors 'page')
  const hasActiveFilters = Object.keys(currentParams).some(key => 
    key !== 'page' && currentParams[key as keyof CatalogSearchParams]
  )

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-200 space-y-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white border-b pb-2 mb-4">
        Filtres et Recherche
      </h2>

      {/* Recherche par Mot-Clé */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Rechercher titre/description..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="flex-grow p-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
        />
        <button
          type="submit"
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          disabled={isPending}
        >
          {isPending ? '...' : <Search className="w-5 h-5" />}
        </button>
      </form>

      {/* Filtre par Département */}
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-slate-300">Département</label>
        <select
          value={currentParams.departmentId || ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('departmentId', e.target.value)}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
          disabled={isPending}
        >
          <option value="">Tous les Départements</option>
          {filters.departments.map((d: FilterOptions) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Filtre par Auteur */}
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-slate-300">Auteur</label>
        <select
          value={currentParams.authorId || ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('authorId', e.target.value)}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
          disabled={isPending}
        >
          <option value="">Tous les Auteurs</option>
          {filters.authors.map((a: FilterOptions) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>
      
      {/* Filtre par Année Académique */}
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-slate-300">Année Académique</label>
        <select
          value={currentParams.year || ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('year', e.target.value)}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
          disabled={isPending}
        >
          <option value="">Toutes les Années</option>
          {filters.years.map((y: YearOption) => (
            <option key={y.id} value={y.year}>{y.year}</option>
          ))}
        </select>
      </div>

      {/* Bouton de Réinitialisation (Affiché seulement si des filtres sont actifs) */}
      {hasActiveFilters && (
        <button
          onClick={handleReset}
          className="flex items-center gap-2 w-full justify-center p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
          disabled={isPending}
        >
          <RotateCcw className="w-4 h-4" /> 
          {isPending ? 'Réinitialisation...' : 'Réinitialiser les Filtres'}
        </button>
      )}

    </div>
  )
}