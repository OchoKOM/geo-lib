'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { 
  MapPin, 
  Loader2,
  Plus,
  Map as MapIcon,
  Search,
  Navigation,
  ChevronLeft,
  ChevronRight,
  Circle,
  Book,
  ListFilter,
  X
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { renderToStaticMarkup } from 'react-dom/server'
import { MapPinIcon } from '@/components/MapPinIcon'

// --- TYPES ---
interface MapItem {
  id: string
  name: string
  description: string | null
  geometryType: string
  centerLat: number
  centerLng: number
  geojsonUrl: string | null
  bookCount: number
  createdAt: string
}

interface MapListClientProps {
  maps: MapItem[]
  totalPages: number
  currentPage: number
  totalCount: number
  initialSearchQuery: string
}

// --- UTILITAIRE DE COULEUR DÉTERMINISTE ---
// Génère toujours la même couleur pour un ID donné
const MAP_COLORS = ['#f97316', '#ef4444', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e']

const getColorForId = (id: string) => {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % MAP_COLORS.length
  return MAP_COLORS[index]
}

export function MapListClient({ 
  maps, 
  totalPages, 
  currentPage, 
  totalCount,
  initialSearchQuery 
}: MapListClientProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.FeatureGroup | null>(null)
  // Ref pour stocker le timer du debounce
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const [isMapLoading, setIsMapLoading] = useState(true)
  const [isNavigating, setIsNavigating] = useState(false) // Nouvel état pour la navigation vers détail
  const [isMobileListOpen, setIsMobileListOpen] = useState(false) // État pour plier/déplier sur mobile
 

  // Hooks pour la navigation et l'URL
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  // --- GESTION DE LA NAVIGATION VERS DÉTAIL ---
  // Cette fonction centralise la navigation pour gérer le loader
  const handleNavigateToDetail = (id: string) => {
    setIsNavigating(true)
    router.push(`/maps/${id}`)
  }

  // --- GESTION DE LA RECHERCHE (DEBOUNCE NATIF) ---
  const handleSearch = (term: string) => {
    // 1. Si un timer est déjà en cours, on l'annule
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // 2. On démarre un nouveau timer de 300ms
    searchTimeoutRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams)
        if (term) {
          params.set('q', term)
        } else {
          params.delete('q')
        }
        params.set('page', '1') // Reset page on search
        router.replace(`${pathname}?${params.toString()}`)
      })
  }

  // --- GESTION DE LA PAGINATION ---
  const handlePageChange = (newPage: number) => {
      const params = new URLSearchParams(searchParams)
      params.set('page', newPage.toString())
      router.push(`${pathname}?${params.toString()}`)
  }

  // --- NETTOYAGE ---
  useEffect(() => {
    // Nettoyage du timer au démontage du composant
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // --- INITIALISATION DE LA CARTE ---
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [-4.4419, 15.2663],
      zoom: 6,
      zoomControl: false,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19
      }
    ).addTo(map)

    mapInstanceRef.current = map
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMapLoading(false)
  }, [])

  // --- GESTION DES MARQUEURS ---
  // Se déclenche à chaque changement de `maps` (nouvelle page ou recherche)
  useEffect(() => {
    if (!mapInstanceRef.current) return

    const map = mapInstanceRef.current

    if (markersRef.current) {
      map.removeLayer(markersRef.current)
    }

    const markers = L.featureGroup()
    markersRef.current = markers

    const booksIconHtml = renderToStaticMarkup(<Book size={16} color="currentColor" />)
    const mapTypeIconHtml = renderToStaticMarkup(<MapIcon size={16} color='currentColor' />)
    const btnClass = buttonVariants({variant: "outline", size: "sm"})

    // Map to track if popup was opened by click
    const openedByClickMap = new Map<L.Marker, boolean>()

    maps.forEach((area) => {
      // 1. Couleur consistante
      const color = getColorForId(area.id)

      // 2. Icône personnalisée
      const customIconHtml = renderToStaticMarkup(
        <MapPinIcon size="32px" color={color} pinColor="#ffffff" />
      )

      const customIcon = L.divIcon({
        html: customIconHtml,
        className: 'custom-map-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      })

      const popupDiv = document.createElement('div')
      popupDiv.innerHTML = `
        <div class="p-1 min-w-[200px] flex flex-col gap-2">
          <h3 class="font-bold text-sm mb-1 text-slate-900" style="border-left: 3px solid ${color}; padding-left: 6px;">${area.name}</h3>
          <p class="text-xs text-muted-foreground mb-2 line-clamp-2">
            ${area.description || "Pas de description"}
          </p>
          <div class="flex items-center gap-2 text-xs text-muted-foreground bg-background p-1 rounded">
            <span style="display:flex; align-items:center; gap:4px;">
              <span class="text-blue-600">${booksIconHtml}</span> <strong>${area.bookCount}</strong>
            </span>
            <span style="display:flex; align-items:center; gap:4px;">
              <span class="text-green-600">${mapTypeIconHtml}</span> ${area.geometryType}
            </span>
          </div>
          <button class="popup-link w-full ${btnClass}">Accéder à la zone</button>
        </div>
      `

      const linkElement = popupDiv.querySelector('.popup-link')
      if (linkElement) {
        linkElement.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          setIsNavigating(true)
          router.push(`/maps/${area.id}`);
        })
      }

      const marker = L.marker([area.centerLat, area.centerLng], { icon: customIcon })
        .bindPopup(popupDiv)
        .addTo(markers)

      openedByClickMap.set(marker, false)

      let closeTimeout: NodeJS.Timeout | null = null;
      let isClicking = false;

      marker.on('mouseenter', () => {
        if (!openedByClickMap.get(marker)) {
          marker.openPopup();
        }
        if (closeTimeout) {
          clearTimeout(closeTimeout);
          closeTimeout = null;
        }
      });

      marker.on('mousedown', () => {
        isClicking = true;
      });

      marker.on('mouseout', () => {
        if (!openedByClickMap.get(marker) && !isClicking) {
          closeTimeout = setTimeout(() => {
            marker.closePopup();
          }, 300); // 300ms delay before closing
        }
      });

      marker.on('click', () => {
        isClicking = false;
        if (closeTimeout) {
          clearTimeout(closeTimeout);
          closeTimeout = null;
        }
        openedByClickMap.set(marker, true);
        marker.openPopup();
      });

      marker.on('popupclose', () => {
        openedByClickMap.set(marker, false);
        if (closeTimeout) {
          clearTimeout(closeTimeout);
          closeTimeout = null;
        }
      });
    })

    markers.addTo(map)

    if (maps.length > 0) {
      try {
        map.fitBounds(markers.getBounds(), { padding: [50, 50], maxZoom: 14 })
      } catch (error) {
        console.warn('Erreur fitBounds:', error)
      }
    }

  }, [maps, router])

  const handleFlyTo = (lat: number, lng: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1.5 })
      setIsMobileListOpen(false)
    }
  }

  // Si vide et pas de recherche, on propose de créer (géré par page.tsx normalement, mais cas limite)
  if (maps.length === 0 && !initialSearchQuery && totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
        <MapPin className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Aucune zone d&apos;étude</h3>
        <p className="text-slate-500 mb-6">Commencez par créer votre première zone géographique.</p>
        <Link href="/maps/new">
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" /> Créer une zone
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-slate-100 dark:bg-slate-900 overflow-hidden flex flex-col md:flex-row">
      
      {/* --- PANEL DE RECHERCHE RESPONSIVE --- 
        Mobile: Largeur presque totale, flottant en haut. Liste pliable.
        Desktop: Largeur fixe (w-80), hauteur max limitée mais fixe.
      */}
      <div className={`
        absolute z-400 transition-all duration-300 ease-in-out bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-xl rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col
        /* Styles Mobile par défaut */
        left-2 right-2 top-2 
        ${isMobileListOpen ? 'max-h-[70vh]' : 'max-h-auto'}
        
        /* Styles Desktop (md) */
        md:left-4 md:right-auto md:top-4 md:bottom-4 md:w-80 md:max-h-[calc(100%-2rem)] md:h-auto
      `}>
        
        {/* En-tête recherche */}
        <div className="p-3 md:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Rechercher une zone..."
                className="pl-9 h-9 text-sm bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-1"
                defaultValue={initialSearchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                // Focus sur l'input ouvre la liste sur mobile
                onFocus={() => setIsMobileListOpen(true)}
              />
            </div>
            {/* Bouton Toggle uniquement visible sur Mobile */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden h-9 w-9 shrink-0"
              onClick={() => setIsMobileListOpen(!isMobileListOpen)}
            >
              {isMobileListOpen ? <X className="h-4 w-4" /> : <ListFilter className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Liste des résultats - Masquée sur mobile si fermée, toujours visible sur desktop */}
        <div className={`
          flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700
          ${!isMobileListOpen ? 'hidden md:block' : 'block'} 
        `}>
          <div className="p-2 space-y-2">
            {maps.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Aucun résultat.
              </div>
            ) : (
              maps.map((area) => {
                const color = getColorForId(area.id)
                return (
                  <div 
                    key={area.id}
                    onClick={() => handleFlyTo(area.centerLat, area.centerLng)}
                    className="group flex flex-col gap-1 p-3 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-blue-100 dark:hover:border-blue-900 transition-all cursor-pointer bg-white dark:bg-slate-950 md:bg-transparent"
                  >
                    <div className="flex items-start gap-2">
                      <Circle className="w-3 h-3 mt-1 shrink-0" fill={color} color={color} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 transition-colors">
                            {area.name}
                          </h4>
                          <Navigation className="w-3 h-3 text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0" />
                        </div>
                        {area.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                            {area.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1 pl-5">
                      <div className="flex items-center gap-2">
                         <span className="inline-flex items-center text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 rounded">
                          {area.geometryType}
                        </span>
                        {area.bookCount > 0 && (
                          <span className="inline-flex items-center text-[10px] text-slate-500">
                            <Book className="w-3 h-3 mr-1" /> {area.bookCount}
                          </span>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-[10px] px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleNavigateToDetail(area.id)
                        }}
                      >
                        Détails &rarr;
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Pied de page Pagination - Conditionnel sur mobile */}
        {totalPages > 1 && (
           <div className={`
             p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 rounded-b-lg shrink-0
             ${!isMobileListOpen ? 'hidden md:flex' : 'flex'}
           `}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {currentPage} / {totalPages}
            </span>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Conteneur Carte */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0 h-full w-full" />
      
      {/* --- LOADER NAVIGATION (GLOBAL) --- 
        S'affiche quand on clique sur "Détails" ou qu'on change de page
      */}
      {(isNavigating) && (
        <div className="absolute inset-0 z-500 flex flex-col items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-2xl mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-white bg-white/80 dark:bg-slate-900/80 px-4 py-2 rounded-full shadow-sm">
            Chargement de la zone...
          </span>
        </div>
      )}

      {/* Loader Initialisation Carte */}
      {isMapLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      )}
    </div>
  )
}