/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useState, useEffect } from 'react'
import { Search, SlidersHorizontal, X, Check } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

// Définition des types disponibles (doit correspondre à l'Enum Prisma ou être générique)
const BOOK_TYPES = [
  { id: 'TFC', label: 'TFC / TFE' },
  { id: 'MEMOIRE', label: 'Mémoire' },
  { id: 'THESE', label: 'Thèse' },
  { id: 'ARTICLE', label: 'Article' },
  { id: 'OUVRAGE', label: 'Ouvrage' },
]

export function SearchSection() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // États de l'UI
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')

  // États des Filtres
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [yearStart, setYearStart] = useState('')
  const [yearEnd, setYearEnd] = useState('')
  const [geoZone, setGeoZone] = useState('')
  const [domain, setDomain] = useState('')

  // Initialisation des états à partir de l'URL au chargement
  useEffect(() => {
    const typesParam = searchParams.get('type')
    if (typesParam) setSelectedTypes(typesParam.split(','))
    
    setYearStart(searchParams.get('yearStart') || '')
    setYearEnd(searchParams.get('yearEnd') || '')
    setGeoZone(searchParams.get('zone') || '')
    setDomain(searchParams.get('domain') || '')
    setSearchTerm(searchParams.get('q') || '')
  }, [searchParams])

  // Gestion des Checkboxes Types
  const toggleType = (typeId: string) => {
    setSelectedTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    )
  }

  // Application des filtres (Mise à jour de l'URL)
  const applyFilters = () => {
    const params = new URLSearchParams()
    
    if (searchTerm) params.set('q', searchTerm)
    if (selectedTypes.length > 0) params.set('type', selectedTypes.join(','))
    if (yearStart) params.set('yearStart', yearStart)
    if (yearEnd) params.set('yearEnd', yearEnd)
    if (geoZone) params.set('zone', geoZone)
    if (domain) params.set('domain', domain)

    router.push(`/?${params.toString()}`)
    setIsFilterOpen(false)
  }

  // Réinitialisation
  const resetFilters = () => {
    setSelectedTypes([])
    setYearStart('')
    setYearEnd('')
    setGeoZone('')
    setDomain('')
    setSearchTerm('')
    router.push('/')
    setIsFilterOpen(false)
  }

  return (
    <>
      {/* HERO SECTION */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 hero-pattern relative transition-colors duration-300">
        <div className="container mx-auto px-4 py-16 text-center max-w-4xl relative z-10">
          <span className="inline-block py-1 px-3 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-blue-100 dark:border-blue-800">
            Base de données académique
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            Explorez les travaux <span className="text-blue-600">géospatiaux</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
            Accédez à des milliers de TFC, mémoires, thèses et rapports de stage géolocalisés.
          </p>

          {/* Barre de Recherche Principale */}
          <div className="relative max-w-2xl mx-auto shadow-xl rounded-2xl">
            <div className="flex items-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 focus-within:ring-4 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 transition-all">
              <div className="pl-4 text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                placeholder="Mots-clés, auteur, région, coordonnées..." 
                className="w-full px-4 py-3 bg-transparent border-none focus:outline-none text-slate-800 dark:text-white placeholder-slate-400 text-lg"
              />
              <button 
                onClick={() => setIsFilterOpen(true)} 
                className={`p-3 rounded-xl transition-colors flex items-center gap-2 ${
                    selectedTypes.length > 0 || yearStart || geoZone 
                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                    : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                title="Filtres Avancés"
              >
                <SlidersHorizontal className="w-5 h-5" />
                {(selectedTypes.length > 0 || yearStart || geoZone) && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-3 right-3"></span>
                )}
              </button>
              <button 
                onClick={applyFilters}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors ml-2 shadow-md"
              >
                Rechercher
              </button>
            </div>
          </div>

          {/* Tags Rapides */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {['#Géologie', '#Mines', '#Cartographie', '#Environnement'].map((tag) => (
              <button 
                key={tag} 
                onClick={() => { setSearchTerm(tag); applyFilters(); }}
                className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-transparent hover:border-slate-300"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        
        {/* Dégradé de fond */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent pointer-events-none"></div>
      </div>

      {/* MODAL: Filtres Avancés */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[2000] p-4 animate-in fade-in duration-200" onClick={(e) => e.target === e.currentTarget && setIsFilterOpen(false)}>
          <div className="w-full max-w-2xl p-6 bg-white dark:bg-slate-900 flex flex-col max-h-[90vh] rounded-xl shadow-2xl dark:border dark:border-slate-700 animate-in zoom-in-95 duration-200">
            
            {/* Header Modal */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                  <SlidersHorizontal className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Filtres de Recherche</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Affinez les résultats géospatiaux</p>
                </div>
              </div>
              <button onClick={() => setIsFilterOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X className="w-5 h-5" /></button>
            </div>
            
            {/* Corps Modal (Scrollable) */}
            <div className="space-y-6 overflow-y-auto pr-2 modal-scroll text-left flex-grow">
                
                {/* 1. Type de Document */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Type de Document</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {BOOK_TYPES.map((type) => {
                            const isChecked = selectedTypes.includes(type.id)
                            return (
                                <div 
                                    key={type.id}
                                    onClick={() => toggleType(type.id)}
                                    className={`
                                        cursor-pointer p-2 rounded-lg border text-sm flex items-center justify-between transition-all
                                        ${isChecked 
                                            ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-400' 
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}
                                    `}
                                >
                                    <span>{type.label}</span>
                                    {isChecked && <Check className="w-4 h-4" />}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* 2. Année */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Période de Publication</label>
                    <div className="flex items-center gap-4">
                        <input 
                            type="number" 
                            placeholder="De (ex: 2015)" 
                            value={yearStart}
                            onChange={(e) => setYearStart(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white text-sm"
                        />
                        <span className="text-slate-400">-</span>
                        <input 
                            type="number" 
                            placeholder="À (ex: 2025)" 
                            value={yearEnd}
                            onChange={(e) => setYearEnd(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white text-sm"
                        />
                    </div>
                </div>

                {/* 3. Zone et Domaine */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Zone Géographique</label>
                        <select 
                            value={geoZone}
                            onChange={(e) => setGeoZone(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white text-sm"
                        >
                            <option value="">Toute la RDC</option>
                            <option value="Kinshasa">Kinshasa</option>
                            <option value="Kongo Central">Kongo Central</option>
                            <option value="Katanga">Grand Katanga</option>
                            <option value="Kivu">Kivu (Nord/Sud)</option>
                            <option value="Bandundu">Bandundu</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Domaine Spécifique</label>
                        <select 
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white text-sm"
                        >
                            <option value="">Tous les domaines</option>
                            <option value="Geologie">Géologie</option>
                            <option value="Mines">Mines</option>
                            <option value="Environnement">Environnement</option>
                            <option value="Hydrologie">Hydrologie</option>
                        </select>
                    </div>
                </div>

            </div>

            {/* Footer Modal */}
            <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={resetFilters} 
                className="text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 text-sm font-medium transition-colors"
              >
                Réinitialiser tout
              </button>
              <div className="flex gap-3">
                <button onClick={() => setIsFilterOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium text-sm">Annuler</button>
                <button onClick={applyFilters} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md font-medium transition-all text-sm">
                  Appliquer les filtres
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}