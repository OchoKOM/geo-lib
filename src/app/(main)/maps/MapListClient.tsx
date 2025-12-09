'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { 
  Edit, Calendar, BookOpen, MapPin, 
  Loader2, AlertCircle 
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import kyInstance from '@/lib/ky'
import { GeoJsonObject } from 'geojson'

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

// --- SOUS-COMPOSANT : PREVIEW LEAFLET INDIVIDUELLE ---
const MapPreview = ({ mapData }: { mapData: MapItem }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // 1. Initialisation de la carte (si pas déjà fait)
    if (!mapContainerRef.current || mapInstanceRef.current) return

    // Configuration minimaliste (pas de contrôles, pas d'interaction)
    const map = L.map(mapContainerRef.current, {
      center: [mapData.centerLat, mapData.centerLng],
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false
    })

    // Fond de carte léger
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map)

    mapInstanceRef.current = map

    // 2. Chargement du GeoJSON
    const loadGeometry = async () => {
      if (!mapData.geojsonUrl) {
        setIsLoading(false)
        return
      }

      try {
        const geoJson = await kyInstance.get(mapData.geojsonUrl).json<GeoJsonObject[]>()
        
        const layer = L.geoJSON(geoJson, {
          style: {
            color: '#2563eb', // Bleu Tailwind
            weight: 2,
            fillColor: '#3b82f6',
            fillOpacity: 0.2
          },
          pointToLayer: (_feature, latlng) => {
             return L.circleMarker(latlng, { radius: 5, color: '#2563eb', fillColor: '#fff', fillOpacity: 1 })
          }
        }).addTo(map)

        // Ajuster la vue pour englober la géométrie
        if (layer.getBounds().isValid()) {
          map.fitBounds(layer.getBounds(), { padding: [10, 10] })
        }
      } catch (error) {
        console.error("Erreur chargement preview:", error)
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }

    loadGeometry()

    // Cleanup pour éviter les fuites de mémoire Leaflet
    return () => {
      map?.remove()
      mapInstanceRef.current = null
    }
  }, [mapData])

  return (
    <div className="relative w-full h-[200px] bg-slate-100 dark:bg-slate-900 overflow-hidden rounded-t-lg border-b border-slate-200 dark:border-slate-800">
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />
      
      {/* Overlay de chargement */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}

      {/* Overlay d'erreur ou pas de donnée */}
      {(hasError || !mapData.geojsonUrl) && !isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400">
          <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
          <span className="text-xs">Aperçu indisponible</span>
        </div>
      )}

      {/* Badge Type de Géométrie */}
      <div className="absolute top-2 right-2 z-[400]">
        <Badge variant="secondary" className="bg-white/90 dark:bg-black/80 shadow-sm backdrop-blur text-[10px] uppercase tracking-wider">
          {mapData.geometryType}
        </Badge>
      </div>
    </div>
  )
}

// --- COMPOSANT PRINCIPAL ---
export function MapListClient({ maps }: { maps: MapItem[] }) {
  if (maps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
        <MapPin className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Aucune zone d&apos;étude</h3>
        <p className="text-slate-500 mb-6">Commencez par créer votre première carte.</p>
        <Link href="/maps/new">
          <Button variant="outline">Créer une carte</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {maps.map((map) => (
        <Card key={map.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-200 group border-slate-200 dark:border-slate-800">
          {/* Header avec Preview Leaflet */}
          <div className="p-0">
             <MapPreview mapData={map} />
          </div>

          <CardHeader className="p-4 pb-2 space-y-1">
            <div className="flex justify-between items-start">
              <CardTitle className="text-base font-bold line-clamp-1 group-hover:text-blue-600 transition-colors">
                <Link href={`/maps/${map.id}`} className="hover:underline">
                  {map.name}
                </Link>
              </CardTitle>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 h-8 leading-4">
              {map.description || "Aucune description fournie."}
            </p>
          </CardHeader>

          <CardContent className="p-4 py-2 flex-1">
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
              <div className="flex items-center gap-1" title="Date de création">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(map.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1" title="Documents associés">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{map.bookCount} document{map.bookCount > 1 ? 's' : ''}</span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-between">
            <Link href={`/maps/${map.id}`} className="w-full">
              <Button size="sm" variant="default" className="w-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm">
                <Edit className="w-3.5 h-3.5 mr-2 text-blue-500" />
                Modifier / Voir
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}