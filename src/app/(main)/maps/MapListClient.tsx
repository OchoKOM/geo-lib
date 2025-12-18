'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { 
  MapPin, 
  Loader2, 
  BookOpen,
  Plus,
  Map
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
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

export function MapListClient({ maps }: { maps: MapItem[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.FeatureGroup | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Nettoyage au démontage
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    // 1. Initialisation de la carte (centrée par défaut sur la RDC/Kinshasa)
    const map = L.map(mapContainerRef.current, {
      center: [-4.4419, 15.2663],
      zoom: 6,
      zoomControl: true,
    })

    // 2. Ajout du fond de carte (CartoDB Light pour un look propre)
    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
      }
    ).addTo(map)

    mapInstanceRef.current = map

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(false)

  }, [])

  // Separate useEffect for updating markers when maps data changes
  useEffect(() => {
    if (!mapInstanceRef.current) return

    const map = mapInstanceRef.current

    // 3. Création d'un tableau de couleurs pour randomiser
    const colors = ['orange', 'red', 'green', 'yellow', 'purple', 'pink', 'brown'];

    // Fonction pour obtenir une couleur aléatoire
    const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

    // 4. Ajout des marqueurs pour chaque zone
    // Clear existing markers if any
    if (markersRef.current) {
      map.removeLayer(markersRef.current)
    }

    const markers = L.featureGroup()
    markersRef.current = markers

    const books = renderToStaticMarkup(
      <BookOpen size={16} color="currentColor" />
    );
    const mapHtml = renderToStaticMarkup(
      <Map size={16} color='currentColor' />
    )
    // Création du contenu HTML de la popup
    const styles = buttonVariants({variant: "outline"})

    maps.forEach((area) => {
      // Création d'une icône personnalisée avec couleur aléatoire pour chaque marqueur
      const randomColor = getRandomColor();
      const customIconHtml = renderToStaticMarkup(
        <MapPinIcon size="32px" color={randomColor} pinColor="#155dfc" />
      );
      const customIcon = L.divIcon({
        html: customIconHtml,
        className: 'custom-map-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 16], // Centre de l'icône sur la coordonnée
        popupAnchor: [0, -16],
      });

      const popupContent = `
        <div class="p-1 min-w-[200px]">
          <h3 class="font-bold text-sm mb-1 text-slate-900 dark:text-white">${area.name}</h3>
          <p class="text-xs text-slate-500 mb-2 line-clamp-2">
            ${area.description || "Pas de description"}
          </p>
          <div class="flex items-center gap-2 text-xs text-muted-foreground mb-3 bg-background dark: p-1 rounded">
            <span style="display:flex; align-items:center; gap:4px;">
              <span class="text-primary">${books}</span> <strong>${area.bookCount}</strong> doc${area.bookCount > 1 ? 's' : ''}
            </span>
            <span style="display:flex; align-items:center; gap:4px;">
              <span class="text-green-500">${mapHtml}</span> ${area.geometryType}
            </span>
          </div>
          <button class="popup-link ${styles}">Voir la zone</button>
        </div>
      `;


      const marker = L.marker([area.centerLat, area.centerLng], { icon: customIcon })
        .bindPopup(popupContent)
        .addTo(markers)

      marker.on('popupopen', () => {
        const popupElement = marker.getPopup()?.getElement()
        if (popupElement) {
          const linkElement = popupElement.querySelector('.popup-link')
          if (linkElement) {
            linkElement.addEventListener('click', () => {
              router.push(`/maps/${area.id}`)
            })
          }
        }
      })
    })

    // 5. Ajouter le groupe de marqueurs à la carte
    markers.addTo(map)

    // 6. Ajuster la vue pour englober tous les marqueurs (si on a des zones)
    if (maps.length > 0) {
      try {
        map.fitBounds(markers.getBounds(), { padding: [50, 50] })
      } catch (error) {
        console.warn('Could not fit bounds, possibly due to invalid marker positions:', error)
      }
    }

  }, [maps, router])

  // --- RENDU : Gestion du cas vide ---
  if (maps.length === 0) {
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

  // --- RENDU : Carte Unique ---
  return (
    <>
      <div className="relative w-full flex-1 bg-slate-100 dark:bg-slate-900">
        {/* Conteneur de la carte */}
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />
        
        {/* Overlay de chargement */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-sm font-medium text-slate-600 dark:text-slate-300">Chargement de la carte globale...</span>
          </div>
        )}

        {/* Légende flottante (Optionnelle) */}
        {!isLoading && (
          <div className="absolute bottom-6 left-6 z-[400] bg-white dark:bg-slate-900 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 max-w-xs hidden md:block">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-sm">Explorateur Géographique</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Cliquez sur un marqueur pour voir les détails de la zone et accéder aux documents associés.
            </p>
            <div className="mt-3 text-xs font-medium text-slate-400">
              {maps.length} zones répertoriées
            </div>
          </div>
        )}
      </div>
    </>
  )
}