/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from "@/lib/prisma"
import { SearchSection } from "@/components/home/SearchSection"
import { 
  FileText, BookOpen, GraduationCap, Map as MapIcon, 
  Sparkles, List, LayoutGrid, Calendar, MapPin, 
  Eye, Download, Bookmark, Compass,
  Search
} from 'lucide-react'
import Link from "next/link"
import { BookType, Prisma } from "@prisma/client" 

// Interface pour les props de la page
interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// Configuration visuelle des badges
const getTypeConfig = (type: BookType) => {
  switch (type) {
    case 'TFC': return { label: 'TFC', colorClass: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', borderColor: 'bg-green-500' }
    case 'MEMOIRE': return { label: 'Mémoire', colorClass: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800', borderColor: 'bg-purple-500' }
    case 'THESE': return { label: 'Thèse', colorClass: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800', borderColor: 'bg-orange-500' }
    case 'OUVRAGE': return { label: 'Ouvrage', colorClass: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800', borderColor: 'bg-blue-500' }
    default: return { label: 'Autre', colorClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', borderColor: 'bg-slate-500' }
  }
}

// Composant pour la carte d'un livre en mode Liste
const BookListItem = ({ book, style }: any) => (
    <Link href={`/book/${book.id}`} key={book.id}>
      <div className="search-card bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 relative overflow-hidden group hover:shadow-lg transition-shadow">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.borderColor}`}></div>
        
        <div className="flex-grow space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex gap-2 items-center mb-1">
              <span className={`badge border text-xs font-semibold px-2 py-0.5 rounded-full ${style.colorClass}`}>
                {style.label}
              </span>
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" /> 
                {new Date(book.createdAt).getFullYear()}
              </span>
            </div>
          </div>
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {book.title}
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
            {book.description}
          </p>
          
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                {book.author?.user?.name ? book.author.user.name.substring(0,2).toUpperCase() : 'UK'}
              </div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {book.author?.user?.name || "Auteur inconnu"}
              </span>
            </div>
            {book.studyAreas[0] && (
              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">
                <MapPin className="w-3 h-3" />
                <span>{book.studyAreas[0].studyArea.name}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex md:flex-col items-center justify-center gap-2 border-l border-slate-100 dark:border-slate-800 pl-0 md:pl-4">
          <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Voir">
            <Eye className="w-5 h-5" />
          </button>
          <button className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Télécharger">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>
    </Link>
);

// Composant pour la carte d'un livre en mode Grille
const BookGridItem = ({ book, style }: {book: any, style: any}) => (
    <Link href={`/book/${book.id}`} key={book.id}>
        <div className="grid-card bg-white dark:bg-slate-900 p-4 rounded-xl shadow-md border border-slate-100 dark:border-slate-800 flex flex-col items-start space-y-3 relative group hover:shadow-lg transition-shadow h-full">
            <div className={`w-full h-32 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2`}
                 style={{ borderBottom: `4px solid ${style.borderColor === 'bg-green-500' ? '#10B981' : style.borderColor === 'bg-purple-500' ? '#8B5CF6' : style.borderColor === 'bg-orange-500' ? '#F97316' : '#3B82F6'}` }}>
                {/* Placeholder d'image / icône */}
                {style.label === 'TFC' && <FileText className="w-8 h-8 text-green-500 opacity-60" />}
                {style.label === 'Mémoire' && <BookOpen className="w-8 h-8 text-purple-500 opacity-60" />}
                {style.label === 'Thèse' && <GraduationCap className="w-8 h-8 text-orange-500 opacity-60" />}
                {style.label === 'Ouvrage' && <BookOpen className="w-8 h-8 text-blue-500 opacity-60" />}
                {style.label === 'Autre' && <Sparkles className="w-8 h-8 text-slate-500 opacity-60" />}
            </div>
            
            <span className={`badge border text-xs font-semibold px-2 py-0.5 rounded-full ${style.colorClass}`}>
                {style.label}
            </span>
            
            <h4 className="text-md font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 w-full">
                {book.title}
            </h4>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 flex-grow">
                {book.description}
            </p>
            
            <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-3 h-3 text-blue-500" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                        {book.studyAreas[0] ? book.studyAreas[0].studyArea.name : 'Non localisé'}
                    </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>{new Date(book.createdAt).getFullYear()}</span>
                    <button className="p-1 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Voir">
                        <Eye className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    </Link>
);


export default async function HomePage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  
  // --- 1. Extraction des filtres de l'URL ---
  const query = typeof resolvedParams.q === 'string' ? resolvedParams.q : undefined
  const typeParam = typeof resolvedParams.type === 'string' ? resolvedParams.type.split(',') as BookType[] : undefined
  
  const yearStart = typeof resolvedParams.yearStart === 'string' ? parseInt(resolvedParams.yearStart) : undefined
  const yearEnd = typeof resolvedParams.yearEnd === 'string' ? parseInt(resolvedParams.yearEnd) : undefined
  const zone = typeof resolvedParams.zone === 'string' ? resolvedParams.zone : undefined
  const domain = typeof resolvedParams.domain === 'string' ? resolvedParams.domain : undefined

  // NOUVEAU: Extraction du paramètre de vue
  const viewParam = typeof resolvedParams.view === 'string' ? resolvedParams.view : 'list'
  const isGridView = viewParam === 'grid'


  // --- 2. Construction de la clause WHERE ---
  const whereClause: Prisma.BookWhereInput = {
    AND: [
        // Recherche textuelle (Titre ou Description)
        query ? {
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } }
            ]
        } : {},
        
        // Filtre par Type (plusieurs choix possibles)
        typeParam ? { type: { in: typeParam } } : {},

        // Filtre par Année (sur createdAt ou academicYear si disponible)
        yearStart ? { createdAt: { gte: new Date(`${yearStart}-01-01`) } } : {},
        yearEnd ? { createdAt: { lte: new Date(`${yearEnd}-12-31`) } } : {},

        // Filtre par Zone Géographique (via relation StudyArea)
        zone ? {
            studyAreas: {
                some: {
                    studyArea: {
                        name: { contains: zone, mode: 'insensitive' }
                    }
                }
            }
        } : {},
        
        // Filtre par Domaine (via relation Department)
        domain ? {
            department: {
                name: { contains: domain, mode: 'insensitive' }
            }
        } : {}
    ]
  }

  // --- 3. Exécution des requêtes ---
  const books = await prisma.book.findMany({
    where: whereClause,
    take: 20, // Pagination à implémenter plus tard
    orderBy: { createdAt: 'desc' },
    include: {
      author: { include: { user: true } },
      studyAreas: { include: { studyArea: true } }
    }
  })

  // Récupération des stats (globales, non filtrées pour le menu de gauche)
  const statsGrouped = await prisma.book.groupBy({
    by: ['type'],
    _count: { type: true }
  })

  const getCount = (type: BookType) => statsGrouped.find(g => g.type === type)?._count.type || 0

  const stats = {
    tfc: getCount('TFC'),
    memoires: getCount('MEMOIRE'),
    theses: getCount('THESE'),
    cartes: await prisma.studyArea.count()
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Composant Client (Recherche & Filtres, inclut les boutons de vue) */}
      <SearchSection />

      {/* Contenu Principal */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
            
          {/* MENU GAUCHE (Stats statiques) */}
          <div className="lg:w-1/4 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Par Type de Document</h3>
              <div className="space-y-2">
                <Link href="/?type=TFC" className="group flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">TFC / TFE</span>
                  </div>
                  <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded">{stats.tfc}</span>
                </Link>

                <Link href="/?type=MEMOIRE" className="group flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500 cursor-pointer transition-all shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Mémoires</span>
                  </div>
                  <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded">{stats.memoires}</span>
                </Link>

                <Link href="/?type=THESE" className="group flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-400 dark:hover:border-orange-500 cursor-pointer transition-all shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Thèses</span>
                  </div>
                  <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded">{stats.theses}</span>
                </Link>

                <Link href="/map" className="group flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-500 cursor-pointer transition-all shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400">
                      <MapIcon className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Cartes & Atlas</span>
                  </div>
                  <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded">{stats.cartes}</span>
                </Link>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="font-bold text-lg mb-1">Besoin d&apos;aide ?</h4>
                <p className="text-blue-100 text-sm mb-3">Consultez le guide de recherche spatiale pour optimiser vos résultats.</p>
                <button className="text-xs font-bold bg-white text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition">Voir le Guide</button>
              </div>
              <Compass className="absolute -bottom-4 -right-4 w-24 h-24 text-white opacity-10" />
            </div>
          </div>

          {/* LISTE RÉSULTATS */}
          <div className="lg:w-3/4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" /> 
                {books.length} Résultat{books.length > 1 ? 's' : ''} {query && `pour "${query}"`}
              </h3>
              
              {/* BOUTONS DE VUE DÉPLACÉS vers SearchSection mais conservés ici pour mobile */}
              <div className="lg:hidden flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <button className={`p-1.5 rounded-md transition-colors ${
                  viewParam === 'list' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-400'
                }`}>
                  <List className="w-4 h-4" />
                </button>
                <button className={`p-1.5 rounded-md transition-colors ${
                  viewParam === 'grid' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-400'
                }`}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className={`${isGridView ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4' : 'grid grid-cols-1 gap-4'}`}>
              {books.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Aucun résultat trouvé</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xs text-center">
                      Essayez de modifier vos filtres ou utilisez des mots-clés plus généraux.
                  </p>
                  <Link href="/">
                     <button className="mt-4 text-blue-600 font-medium text-sm hover:underline">Réinitialiser la recherche</button>
                  </Link>
                </div>
              ) : (
                books.map((book) => {
                  const style = getTypeConfig(book.type)
                  
                  return isGridView ? (
                    <BookGridItem key={book.id} book={book} style={style} />
                  ) : (
                    <BookListItem key={book.id} book={book} style={style} />
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}