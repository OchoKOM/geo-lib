// Fichier : components/catalog/CatalogList.tsx (Révisé avec <strong>)
import Link from 'next/link'
import { BookOpen, Map, MapPin, Search } from 'lucide-react'
import { 
  BookItem, 
  CatalogSearchParams 
} from '@/app/(main)/catalog/page' 

interface CatalogListProps {
  books: BookItem[]
  totalCount: number
  // currentParams utilise l'interface de recherche formelle
  currentParams: CatalogSearchParams 
}


export function CatalogList({ books, totalCount, currentParams }: CatalogListProps) {
  
  const hasFilters: boolean = Object.keys(currentParams).some(key => {
    const value = currentParams[key as keyof CatalogSearchParams] 
    return value !== undefined && value !== '' && key !== 'page'
  })

  const searchTerm = currentParams.search || '';
  const isSearching = !!searchTerm;

  return (
    <section>
      
      {/* 1. Barre de Statut du Catalogue */}
      <div className="flex justify-between items-center mb-6 p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-16 z-10 rounded-t-xl">
        
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          {isSearching ? (
            <>
                Résultats pour : <strong>&quot;{searchTerm}&quot;</strong>
            </>
          ) : (
            <>
                <strong>{totalCount}</strong> {totalCount > 1 ? 'Ouvrages trouvés' : 'Ouvrage trouvé'}
            </>
          )}
        </h2>
        
        {hasFilters && (
          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-slate-700/50 px-3 py-1 rounded-full">
            Filtres actifs
          </span>
        )}
      </div>

      {/* 2. Affichage des Livres (Cartes) */}
      <div className="space-y-4">
        {books.length > 0 ? (
          books.map((book: BookItem) => (
            <div 
              key={book.id} 
              className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between hover:shadow-xl transition-shadow"
            >
              <div>
                <Link href={`/catalog/${book.id}`} passHref>
                    <h3 className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors mb-2 cursor-pointer">
                      {book.title}
                    </h3>
                </Link>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-3 md:max-w-xl">
                  {book.description}
                </p>
                
                {/* Métadonnées : Utilisation de <strong> pour les valeurs clés */}
                <div className="text-sm space-y-1">
                    <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <BookOpen className="w-4 h-4 text-slate-400" /> Auteur : <strong>{book.authorName}</strong>
                    </p>
                    <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <MapPin className="w-4 h-4 text-slate-400" /> Localisation : {book.location || 'N/A'}
                    </p>
                    <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Map className="w-4 h-4 text-green-500" /> Zones d&apos;étude liées : <strong>{book.studyAreasCount}</strong>
                    </p>
                </div>
              </div>

              {/* Bouton d'action "Voir Détails" inchangé */}
              <div className="mt-4 md:mt-0 flex flex-col justify-center items-start md:items-end">
                <Link href={`/catalog/${book.id}`} passHref>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md text-sm">
                        Voir Détails
                    </button>
                </Link>
              </div>

            </div>
          ))
        ) : (
          /* État : Aucun résultat */
          <div className="text-center p-10 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <Search className="w-10 h-10 text-slate-400 mx-auto mb-4" />
            <p className="text-lg text-slate-600 dark:text-slate-400">
              <strong>Aucun ouvrage</strong> ne correspond à vos critères de recherche ou de filtrage.
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
              Veuillez réinitialiser les filtres pour voir tous les ouvrages.
            </p>
          </div>
        )}
      </div>
      
    </section>
  )
}