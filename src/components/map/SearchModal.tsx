import { useEffect, useRef, useState } from "react"
import { SearchResult } from "../editor/GeoMap"
import L from "leaflet"
import { showToast } from "@/hooks/useToast"
import kyInstance from "@/lib/ky"
import { Check, Loader2, MapIcon, MapPin, Search, X } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"

export default function SearchModal({
  open,
  onClose,
  onLoadResult,
  loadingResults,
  isDarkMode
}: {
  open: boolean
  onClose: () => void
  onLoadResult: (result: SearchResult) => void
  loadingResults: Record<string, boolean>
  isDarkMode: boolean
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchBounds, setSearchBounds] = useState<L.LatLngBounds | null>(null)
  
  const miniMapContainerRef = useRef<HTMLDivElement>(null)
  const miniMapRef = useRef<L.Map | null>(null)
  const drawLayerRef = useRef<L.FeatureGroup | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)

  // Initialisation Mini Map
  useEffect(() => {
    if (open && miniMapContainerRef.current && !miniMapRef.current) {
      const map = L.map(miniMapContainerRef.current, {
        zoomControl: true, attributionControl: false, center: [-4.4419, 15.2663], zoom: 10
      })
      
      const searchGroup = new L.FeatureGroup().addTo(map)
      drawLayerRef.current = searchGroup

      const drawControl = new L.Control.Draw({
        edit: { featureGroup: searchGroup, remove: true },
        draw: {
          polygon: false, polyline: false, circle: false, marker: false, circlemarker: false,
          rectangle: { shapeOptions: { color: '#3b82f6', weight: 2 } }
        }
      })
      map.addControl(drawControl)

      map.on(L.Draw.Event.CREATED, (e) => {
        searchGroup.clearLayers()
        searchGroup.addLayer(e.layer)
        setSearchBounds(e.layer.getBounds())
      })
      
      map.on(L.Draw.Event.DELETED, () => setSearchBounds(null))
      miniMapRef.current = map

      setTimeout(() => map.invalidateSize(), 100)
    }

    return () => {
      if (!open && miniMapRef.current) {
        miniMapRef.current.remove()
        miniMapRef.current = null
        drawLayerRef.current = null
        setSearchBounds(null)
        setResults([])
        setQuery('')
      }
    }
  }, [open])

  // Gestion Tuiles Mini Map
  useEffect(() => {
    if (!miniMapRef.current) return
    if (tileLayerRef.current) miniMapRef.current.removeLayer(tileLayerRef.current)
    
    const lightUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    
    tileLayerRef.current = L.tileLayer(lightUrl, { maxZoom: 19 }).addTo(miniMapRef.current)
    tileLayerRef.current.bringToBack()
  }, [isDarkMode, open])

  const handleSearch = async () => {
    if (!query.trim() && !searchBounds) {
      showToast('Veuillez entrer un terme ou sélectionner une zone.', 'warning')
      return
    }
    setIsSearching(true)
    try {
      let url = `/api/study-areas?q=${encodeURIComponent(query)}`
      if (searchBounds) {
        const sw = searchBounds.getSouthWest()
        const ne = searchBounds.getNorthEast()
        url += `&minLat=${sw.lat}&maxLat=${ne.lat}&minLng=${sw.lng}&maxLng=${ne.lng}`
      }
      const data = await kyInstance.get(url).json<{ results: SearchResult[] }>()
      setResults(data.results || [])
      if (!data.results?.length) showToast('Aucun résultat trouvé.')
    } catch (error) {
  console.log(error);
  
      showToast('Erreur réseau.', 'destructive')
    } finally {
      setIsSearching(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" /> Recherche Géospatiale
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-0 flex flex-col md:flex-row h-[500px]">
          <div className="w-full md:w-1/3 p-4 border-r border-slate-200 dark:border-slate-800 flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mots-clés</label>
              <div className="relative">
                <Input
                  placeholder="Nom, description..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground max-md:hidden" />
                <div className="md:hidden absolute right-1 top-[50%] translate-y-[-50%] p-1 text-muted-foreground cursor-pointer" onClick={handleSearch}><Search className="size-5" /></div>
              </div>
            </div>

            <div className="max-md:hidden p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
              <p className="flex items-start gap-2">
                <MapIcon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Utilisez la carte pour dessiner une zone de recherche.</span>
              </p>
            </div>

            <Button onClick={handleSearch} disabled={isSearching} className="w-full max-md:hidden">
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              Rechercher
            </Button>

            <div className="flex-1 overflow-y-auto border-t border-slate-100 dark:border-slate-800 pt-2">
              <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase">Résultats ({results.length})</h4>
              <div className="space-y-1">
                {results.map(result => (
                  <div
                    key={result.id}
                    onClick={() => onLoadResult(result)}
                    className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    {loadingResults[result.id] ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                    ) : (
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{result.name}</div>
                      <div className="text-xs text-slate-500 truncate">{result.geometryType}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full md:w-2/3 bg-slate-100 dark:bg-slate-950 relative max-md:hidden">
            <div ref={miniMapContainerRef} className="absolute inset-0 z-0" />
            <div className="absolute top-2 right-2 z-1000 bg-white dark:bg-slate-900 p-2 rounded shadow-md border border-slate-200 text-xs">
              {searchBounds ? (
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <Check className="w-3 h-3" /> Zone définie
                  <button onClick={() => { drawLayerRef.current?.clearLayers(); setSearchBounds(null) }} className="text-red-500 hover:underline ml-2">Effacer</button>
                </div>
              ) : (
                <div className="text-slate-500">Dessinez un rectangle pour filtrer</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
};
