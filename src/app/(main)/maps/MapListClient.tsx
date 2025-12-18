'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
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
  const [isLoading, setIsLoading] = useState(true)

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

    // 3. Création de l'icône personnalisée pour les marqueurs
    // On utilise une divIcon pour pouvoir styliser en CSS si besoin, ou on reste sur le défaut
    // Ici on va corriger le problème fréquent des icônes Leaflet par défaut dans Next.js
    const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = DefaultIcon;

    // 4. Ajout des marqueurs pour chaque zone
    const markers = L.featureGroup()
      const books = renderToStaticMarkup(
        <BookOpen size={16} color="blue" />
      );
      const mapHtml = renderToStaticMarkup(
        <Map size={16} color='slate' />
      )
      // Création du contenu HTML de la popup
      const styles = buttonVariants({variant: "outline"})

    maps.forEach((area) => {
      const link = renderToStaticMarkup(
        (<Link href={`/maps/${area.id}`} className={styles}  >Voir la zone</Link>)
      );
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
              <span class="text-orange-500">${mapHtml}</span> ${area.geometryType}
            </span>
          </div>
          ${link}
        </div>
      `

      const marker = L.marker([area.centerLat, area.centerLng])
        .bindPopup(popupContent)
        .addTo(markers)
    })

    // 5. Ajouter le groupe de marqueurs à la carte
    markers.addTo(map)

    // 6. Ajuster la vue pour englober tous les marqueurs (si on a des zones)
    if (maps.length > 0) {
      map.fitBounds(markers.getBounds(), { padding: [50, 50] })
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(false)

  }, [maps])

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
              Cliquez sur un marqueur bleu pour voir les détails de la zone et accéder aux documents associés.
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