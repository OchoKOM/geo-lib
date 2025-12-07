'use client'
import { Sparkles } from 'lucide-react'
import { BookResults, BookWithRelations, FacultyData, FacultyFilters, Sidebar, ViewToggle } from '../results'
import { useState } from 'react'

export default function MainHome ({
  stats,
  books,
  query,
  isGridView: igv = false,
  facultiesData
}: {
  stats: { tfc: number; memoires: number; theses: number; cartes: number }
  books: BookWithRelations[]
  query?: string
  isGridView: boolean
    facultiesData: FacultyData[]
}) {
  const [isGridView, setIsGridView] = useState(igv)

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex flex-col lg:flex-row gap-8'>
        {/* MENU GAUCHE (MISE À JOUR) */}
          <div className="lg:w-1/4 space-y-6">
            {/* Nouveau composant de filtres Faculté/Département */}
            <FacultyFilters faculties={facultiesData} />
            
            {/* Ancien contenu Sidebar (déplacé dans un composant séparé dans l'étape 1) */}
            <Sidebar stats={stats} />
          </div>

        {/* LISTE RÉSULTATS (Séparé dans un composant BookResults) */}
        <div className='lg:w-3/4'>
          <div className='flex items-center justify-between mb-6'>
            <h3 className='text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2'>
              <Sparkles className='w-5 h-5 text-yellow-500' />
              {books.length} Résultat{books.length > 1 ? 's' : ''}{' '}
              {query && `pour "${query}"`}
            </h3>

            <ViewToggle isGridView={isGridView} onViewChange={setIsGridView} />
          </div>

          {/* Rendu des résultats via le composant BookResults */}
          <BookResults books={books} isGridView={isGridView} query={query} />
        </div>
      </div>
    </div>
  )
}
