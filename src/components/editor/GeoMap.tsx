/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import shp from 'shpjs'
import JSZip from 'jszip'
import shpwrite from '@mapbox/shp-write'
import {
  Layers,
  TableIcon,
  Download,
  Eye,
  EyeOff,
  Trash2,
  Settings,
  Check,
  Database,
  Loader2,
  FolderOpen,
  FileBox,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ZoomIn,
  FileInput,
  Save,
  Search,
  MapPin,
  Plus,
  X,
  Map as MapIcon,
  Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/components/AuthProvider'
import { Input } from '../ui/input'
import { showToast } from '@/hooks/useToast'
import { useUploadThing } from '@/lib/uploadthing'
import kyInstance from '@/lib/ky'

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={`flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300 ${props.className}`}
  />
)

type GeometryType =
  | 'Point'
  | 'MultiPoint'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon'
  | 'GeometryCollection'

interface LayerData {
  id: string
  name: string
  type: 'geojson' | 'shapefile' | 'draw' | 'database'
  geometryType: GeometryType | string
  visible: boolean
  color: string
  opacity: number
  data: any
  featureCount: number
  generatedId: boolean
  generatedGeom: boolean
}

interface ImportCandidate {
  id: string
  name: string
  originalName: string
  data: any
  type: 'geojson' | 'shapefile'
  featureCount: number
  geometryType: string
  selected: boolean
}

interface SearchResult {
  id: string
  name: string
  description: string | null
  geometryType: string
  centerLat: number
  centerLng: number
  geojsonFile?: {
    url: string
  }
}

// --- CONFIGURATION LEAFLET ---
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
  })
}

const PALETTE = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#6366f1'
]

const getRandomColor = () => PALETTE[Math.floor(Math.random() * PALETTE.length)]

export default function GeoMap() {
  const { role, isAuthenticated } = useAuth()
  const { startUpload } = useUploadThing('geoJsonUploader', {
    onClientUploadComplete: () => {
      showToast('Fichier GeoJSON téléversé avec succès', 'success')
    },
    onUploadError: (error: Error) => {
      showToast(`Erreur d'upload: ${error.message}`, 'destructive')
    }
  })
  const [isMounted, setIsMounted] = useState(false)

  // Refs Leaflet Principale
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null)
  const layerInstancesRef = useRef<{ [key: string]: L.Layer }>({})

  // UI State
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tableExpanded, setTableExpanded] = useState(false)

  // Data State
  const [layers, setLayers] = useState<LayerData[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)

  // Import State
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importCandidates, setImportCandidates] = useState<ImportCandidate[]>(
    []
  )
  const [isProcessing, setIsProcessing] = useState(false)

  // --- Search State (REFACTORISÉ POUR DIALOGUE + SPATIAL) ---
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [loadingResults, setLoadingResults] = useState<Record<string, boolean>>({})
  
  // Refs pour la Mini Map de recherche
  const miniMapRef = useRef<L.Map | null>(null)
  const miniMapContainerRef = useRef<HTMLDivElement>(null)
  const searchDrawLayerRef = useRef<L.FeatureGroup | null>(null)
  // Ajout de la ref pour la couche de tuiles de la mini-map
  const miniMapTileLayerRef = useRef<L.TileLayer | null>(null)
  const [searchBounds, setSearchBounds] = useState<L.LatLngBounds | null>(null)

  // DB Save State
  const [studyAreaId, setStudyAreaId] = useState<string | null>(null)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveFormData, setSaveFormData] = useState({
    name: '',
    description: ''
  })

  // Table State
  const [tableData, setTableData] = useState<any[]>([])
  const [tableColumns, setTableColumns] = useState<string[]>([])

  // Refs Inputs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // --- 1. INITIALISATION ---
  useEffect(() => {
    setIsMounted(true)
    const checkTheme = () =>
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    drawnItemsRef.current = new L.FeatureGroup()
    return () => observer.disconnect()
  }, [])

  // Initialisation Carte Principale
  useEffect(() => {
    if (!isMounted || !mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([-4.4419, 15.2663], 11)

    L.control.zoom({ position: 'topright' }).addTo(map)

    if (drawnItemsRef.current) {
      map.addLayer(drawnItemsRef.current)
      const drawControl = new L.Control.Draw({
        edit: { featureGroup: drawnItemsRef.current },
        draw: {
          polygon: { allowIntersection: false, showArea: true },
          polyline: {},
          rectangle: {},
          circle: {},
          marker: {},
          circlemarker: false
        }
      })
      map.addControl(drawControl)
    }

    map.on(L.Draw.Event.CREATED, (e: any) => {
      const feature = e.layer.toGeoJSON()
      feature.properties = {
        id: crypto.randomUUID(),
        nom: 'Nouvelle Géométrie',
        creation: new Date().toLocaleDateString()
      }
      const newId = crypto.randomUUID()
      const newLayer: LayerData = {
        id: newId,
        name: `Dessin ${new Date().toLocaleTimeString()}`,
        type: 'draw',
        geometryType: feature.geometry.type,
        visible: true,
        color: '#3b82f6',
        opacity: 1,
        data: { type: 'FeatureCollection', features: [feature] },
        featureCount: 1,
        generatedId: true,
        generatedGeom: true
      }
      addLayerToMap(newLayer)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [isMounted])

  // Gestion du fond de carte (Principale)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  useEffect(() => {
    if (!mapRef.current) return
    if (tileLayerRef.current) mapRef.current.removeLayer(tileLayerRef.current)

    const darkUrl =
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    const lightUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

    tileLayerRef.current = L.tileLayer(isDarkMode ? darkUrl : lightUrl, {
      maxZoom: 19,
      attribution: isDarkMode ? '&copy; CartoDB' : '&copy; OSM'
    }).addTo(mapRef.current)

    tileLayerRef.current.bringToBack()
  }, [isDarkMode, isMounted])

  // --- INITIALISATION MINI-MAP DE RECHERCHE ---
  useEffect(() => {
    // N'initialiser la mini map que si la dialog est ouverte et le conteneur prêt
    if (isSearchDialogOpen && miniMapContainerRef.current && !miniMapRef.current) {
      const miniMap = L.map(miniMapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
        center: [-4.4419, 15.2663], // Kinshasa par défaut
        zoom: 10
      })

      // Fond de carte géré dynamiquement par l'effet suivant (SUPPRESSION de la ligne statique)
      // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(miniMap)

      // Groupe pour dessiner la zone de recherche
      const searchGroup = new L.FeatureGroup()
      miniMap.addLayer(searchGroup)
      searchDrawLayerRef.current = searchGroup

      // Contrôles de dessin (Rectangle uniquement pour la recherche simple)
      const drawControl = new L.Control.Draw({
        edit: { 
          featureGroup: searchGroup,
          remove: true
        },
        draw: {
          polygon: false,
          polyline: false,
          circle: false,
          marker: false,
          circlemarker: false,
          rectangle: {
            shapeOptions: {
              color: '#3b82f6',
              weight: 2
            }
          }
        }
      })
      miniMap.addControl(drawControl)

      // Événements
      miniMap.on(L.Draw.Event.CREATED, (e: any) => {
        // Nettoyer les anciennes zones (une seule zone de recherche à la fois)
        searchGroup.clearLayers()
        const layer = e.layer
        searchGroup.addLayer(layer)
        setSearchBounds(layer.getBounds())
      })

      miniMap.on(L.Draw.Event.DELETED, () => {
        setSearchBounds(null)
      })

      miniMapRef.current = miniMap
      
      // Petit hack pour forcer le redimensionnement correct une fois la modale affichée
      setTimeout(() => {
        miniMap.invalidateSize()
      }, 100)
    }

    // Cleanup lors de la fermeture de la dialog
    if (!isSearchDialogOpen && miniMapRef.current) {
      miniMapRef.current.remove()
      miniMapRef.current = null
      searchDrawLayerRef.current = null
      miniMapTileLayerRef.current = null
      setSearchBounds(null)
    }
  }, [isSearchDialogOpen])

  // --- GESTION DU FOND DE CARTE (MINI MAP) ---
  useEffect(() => {
    // Si la mini-map n'est pas initialisée, on ne fait rien
    if (!miniMapRef.current) return

    // Si une couche existe déjà, on la retire pour éviter les superpositions
    if (miniMapTileLayerRef.current) {
      miniMapRef.current.removeLayer(miniMapTileLayerRef.current)
    }

    const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    const lightUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

    // Création de la nouvelle couche selon le mode
    miniMapTileLayerRef.current = L.tileLayer(isDarkMode ? darkUrl : lightUrl, {
      maxZoom: 19,
      attribution: isDarkMode ? '&copy; CartoDB' : '&copy; OSM'
    }).addTo(miniMapRef.current)

    // On s'assure que le fond de carte reste en arrière-plan (derrière le dessin)
    miniMapTileLayerRef.current.bringToBack()
  }, [isDarkMode, isSearchDialogOpen]) // Se déclenche au changement de thème ou à l'ouverture de la modale


  const getFileBaseName = (file: File): string | null => {
    // @ts-ignore
    const fullPath = file.webkitRelativePath || file.name
    const fileNameWithExt = fullPath.split('/').pop()
    if (!fileNameWithExt) return null
    const parts = fileNameWithExt.split('.')
    parts.pop()
    const baseName = parts.join('.')
    return baseName || fileNameWithExt
  }

  // --- 2. IMPORTATION ---
  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) {
      showToast('Aucun fichier ou dossier sélectionné.', 'warning')
      return
    }

    setIsProcessing(true)
    setImportCandidates([])
    setImportDialogOpen(true)

    const candidates: ImportCandidate[] = []
    const shapefileGroup: {
      [baseName: string]: { shp?: File; dbf?: File; prj?: File; files: File[] }
    } = {}
    const geojsonFiles: File[] = []
    const zipFiles: File[] = []

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const base = getFileBaseName(file)
      if (!ext || !base || file.size === 0) continue

      if (['shp', 'dbf', 'shx', 'prj'].includes(ext)) {
        if (!shapefileGroup[base]) shapefileGroup[base] = { files: [] }
        shapefileGroup[base].files.push(file)
        if (ext === 'shp') shapefileGroup[base].shp = file
        if (ext === 'dbf') shapefileGroup[base].dbf = file
        if (ext === 'prj') shapefileGroup[base].prj = file
        continue
      }
      if (['geojson', 'json'].includes(ext)) {
        geojsonFiles.push(file)
        continue
      }
      if (ext === 'zip') {
        zipFiles.push(file)
        continue
      }
    }

    try {
      // Shapefiles
      for (const baseName in shapefileGroup) {
        const group = shapefileGroup[baseName]
        if (group.shp && group.dbf) {
          const zip = new JSZip()
          group.files.forEach(file => zip.file(file.name, file))
          const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })
          const result = await shp(zipBuffer)
          const results = Array.isArray(result) ? result : [result]

          results.forEach(fc => {
            candidates.push({
              id: crypto.randomUUID(),
              name: fc.fileName?.replace('.shp', '') || baseName,
              originalName: group.shp?.name || baseName,
              data: fc,
              type: 'shapefile',
              featureCount: fc.features?.length || 0,
              geometryType: fc.features?.[0]?.geometry?.type || 'Unknown',
              selected: true
            })
          })
        }
      }

      // GeoJSON
      for (const file of geojsonFiles) {
        try {
          const text = await file.text()
          const json = JSON.parse(text)
          candidates.push({
            id: crypto.randomUUID(),
            name: file.name.replace(`.${file.name.split('.').pop()}`, ''),
            originalName: file.name,
            data: json,
            type: 'geojson',
            featureCount: json.features?.length || 0,
            geometryType: json.features?.[0]?.geometry?.type || 'Unknown',
            selected: true
          })
        } catch (err) {
          console.error(err)
        }
      }

      // ZIP
      for (const file of zipFiles) {
        const buffer = await file.arrayBuffer()
        try {
          const result = await shp(buffer)
          const resultsArray = Array.isArray(result) ? result : [result]
          resultsArray.forEach((geojson: any, idx) => {
            const cleanName =
              (geojson.fileName || file.name)
                .split('/')
                .pop()
                ?.replace('.shp', '') || `Couche ${idx + 1}`
            candidates.push({
              id: crypto.randomUUID(),
              name: cleanName,
              originalName: file.name,
              data: geojson,
              type: 'shapefile',
              featureCount: geojson.features?.length || 0,
              geometryType: geojson.features?.[0]?.geometry?.type || 'Unknown',
              selected: true
            })
          })
        } catch (err) {
          console.error(err)
        }
      }

      setImportCandidates(candidates)
      if (candidates.length === 0) {
        setImportDialogOpen(false)
        showToast('Aucune donnée valide trouvée.', 'warning')
      }
    } catch (error) {
      showToast("Erreur d'import.", 'destructive')
      setImportDialogOpen(false)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files)
    e.target.value = ''
  }
  const handleFolderImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files)
    e.target.value = ''
  }

  const toggleAllCandidates = (checked: boolean) => {
    setImportCandidates(prev => prev.map(c => ({ ...c, selected: checked })))
  }

  const confirmImport = () => {
    const toImport = importCandidates.filter(c => c.selected)
    toImport.forEach(c => {
      addLayerToMap({
        id: c.id,
        name: c.name,
        type: c.type,
        geometryType: c.geometryType,
        visible: true,
        color: getRandomColor(),
        opacity: 1,
        data: c.data,
        featureCount: c.featureCount,
        generatedId: false,
        generatedGeom: false
      })
    })
    setImportDialogOpen(false)
    setImportCandidates([])
  }

  // --- 2bis. GESTION DE LA RECHERCHE (Modifiée avec BoundingBox) ---

  const handleSearch = async () => {
    if (!searchQuery.trim() && !searchBounds) {
      showToast('Veuillez entrer un terme ou sélectionner une zone.', 'warning')
      return
    }

    setIsSearching(true)
    setSearchResults([])

    try {
      let url = `/api/study-areas?q=${encodeURIComponent(searchQuery)}`
      
      // Ajout des paramètres spatiaux si une boîte est dessinée
      if (searchBounds) {
        const sw = searchBounds.getSouthWest()
        const ne = searchBounds.getNorthEast()
        url += `&minLat=${sw.lat}&maxLat=${ne.lat}&minLng=${sw.lng}&maxLng=${ne.lng}`
      }

      const data = await kyInstance.get(url).json<{results: any}>();
      
      if (data.results) {
        setSearchResults(data.results)
        if (data.results.length === 0) {
          showToast('Aucun résultat trouvé.')
        }
      } else {
        showToast('Erreur lors de la recherche.', 'destructive')
      }
    } catch (error) {
      console.error(error)
      showToast('Erreur réseau.', 'destructive')
    } finally {
      setIsSearching(false)
    }
  }

  const loadSearchResult = async (result: SearchResult) => {
    if (layerInstancesRef.current[result.id]) {
      showToast(`La zone "${result.name}" est déjà sur la carte`)
      zoomToLayer(result.id)
      setIsSearchDialogOpen(false) // Fermer la dialog
      return
    }

    setLoadingResults(prev => ({ ...prev, [result.id]: true }))

    try {
      let geojsonData = null

      if (result.geojsonFile?.url) {
        const response = await kyInstance.get(result.geojsonFile.url).json()
        geojsonData = response
      } else {
        // Fallback minimaliste
        geojsonData = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {
                name: result.name,
                description: result.description,
                db_id: result.id
              },
              geometry: {
                type: 'Point',
                coordinates: [result.centerLng, result.centerLat]
              }
            }
          ]
        }
      }

      if (geojsonData) {
        addLayerToMap({
          id: result.id,
          name: result.name,
          type: 'database',
          geometryType: result.geometryType,
          visible: true,
          color: getRandomColor(),
          opacity: 1,
          data: geojsonData,
          featureCount: geojsonData.features?.length || 1,
          generatedId: false,
          generatedGeom: false
        })
        
        // Fermer la dialog après chargement réussi
        setIsSearchDialogOpen(false)
      }
    } catch (error) {
      console.error(error)
      showToast("Impossible de charger la géométrie.", 'destructive')
    } finally {
      setLoadingResults(prev => ({ ...prev, [result.id]: false }))
    }
  }

  // --- 3. GESTION CARTO ---

  const zoomToLayer = (id: string) => {
    const layer = layerInstancesRef.current[id] as L.GeoJSON
    if (!mapRef.current || !layer) return
    try {
      const bounds = layer.getBounds()
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
      }
    } catch (e) {
      console.error(e)
    }
  }

  const addLayerToMap = (layerData: LayerData) => {
    if (!mapRef.current) return

    if (layerInstancesRef.current[layerData.id]) {
      zoomToLayer(layerData.id)
      return
    }

    const layer = L.geoJSON(layerData.data, {
      style: () => ({
        color: layerData.color,
        weight: 2,
        opacity: 1,
        fillColor: layerData.color,
        fillOpacity: 0.2
      }),
      pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 6,
          fillColor: layerData.color,
          color: '#fff',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        })
      },
      onEachFeature: (feature, l) => {
        l.on('click', e => {
          L.DomEvent.stopPropagation(e)
          setSelectedLayerId(layerData.id)
          loadAttributes(layerData)

          // Popup simplifié
          const props = feature.properties || {}
          const entries = Object.entries(props).slice(0, 3)
          const propsHtml = entries.map(([k, v]) => `<div><b>${k}:</b> ${v}</div>`).join('')

          const popupContent = `
              <div class="font-bold text-sm text-slate-900 mb-1">${layerData.name}</div>
              <div class="text-xs text-slate-700">${propsHtml}</div>
            `
          L.popup({ maxWidth: 300 })
            .setLatLng(e.latlng)
            .setContent(popupContent)
            .openOn(mapRef.current!)
        })
      }
    })

    layer.addTo(mapRef.current)
    try {
      const bounds = layer.getBounds()
      if (bounds.isValid())
        mapRef.current.fitBounds(bounds, { padding: [50, 50] })
    } catch (e) {
      console.error(e)
    }

    layerInstancesRef.current[layerData.id] = layer
    setLayers(prev => [...prev, layerData])
    setSelectedLayerId(layerData.id)
    loadAttributes(layerData)
  }

  const updateLayerStyle = (
    id: string,
    newColor: string,
    newOpacity: number
  ) => {
    const layer = layerInstancesRef.current[id] as L.GeoJSON
    if (!layer) return
    layer.setStyle({
      color: newColor,
      fillColor: newColor,
      fillOpacity: newOpacity * 0.2,
      opacity: newOpacity
    })
    layer.eachLayer((l: any) => {
      if (l.setStyle)
        l.setStyle({
          fillColor: newColor,
          fillOpacity: newOpacity * 0.8,
          opacity: newOpacity
        })
    })
    setLayers(prev =>
      prev.map(l =>
        l.id === id ? { ...l, color: newColor, opacity: newOpacity } : l
      )
    )
  }

  const toggleVisibility = (id: string) => {
    const layer = layerInstancesRef.current[id]
    if (!layer || !mapRef.current) return
    if (mapRef.current.hasLayer(layer)) mapRef.current.removeLayer(layer)
    else mapRef.current.addLayer(layer)
    setLayers(prev =>
      prev.map(l => (l.id === id ? { ...l, visible: !l.visible } : l))
    )
  }

  const deleteLayer = (id: string) => {
    const layer = layerInstancesRef.current[id]
    if (layer && mapRef.current) mapRef.current.removeLayer(layer)
    delete layerInstancesRef.current[id]
    setLayers(prev => prev.filter(l => l.id !== id))
    if (selectedLayerId === id) {
      setSelectedLayerId(null)
      setTableData([])
    }
  }

  // --- 4. ATTRIBUTS ---
  const loadAttributes = (layer: LayerData) => {
    const features = layer.data.features || []
    if (features.length === 0) {
      setTableData([])
      setTableColumns([])
      return
    }
    const cols = new Set<string>()
    features.forEach((f: any) => {
      if (f.properties) Object.keys(f.properties).forEach(k => cols.add(k))
    })
    setTableColumns(Array.from(cols))
    setTableData(
      features.map((f: any, i: number) => ({ _fid: i, ...f.properties }))
    )
  }

  // --- 5. SAUVEGARDE EN BDD ---
  const initiateSaveToDB = () => {
    const authorized = ['ADMIN', 'LIBRARIAN', 'AUTHOR'].includes(role)
    if (!isAuthenticated || !authorized) {
      showToast('Accès Refusé : Droits insuffisants.', 'warning')
      return
    }
    if (!selectedLayerId) return
    const layer = layers.find(l => l.id === selectedLayerId)
    if (!layer) return

    setSaveFormData({
      name: layer.name,
      description: `Zone d'étude importée le ${new Date().toLocaleDateString()}`
    })
    setSaveDialogOpen(true)
  }

  const executeSaveToDB = async () => {
    if (!selectedLayerId) return
    const layer = layers.find(l => l.id === selectedLayerId)
    if (!layer) return

    if (!saveFormData.name.trim()) {
      showToast('Le nom de la zone est requis.', 'warning')
      return
    }

    setIsSaving(true)
    try {
      const geoJsonString = JSON.stringify(layer.data)
      const blob = new Blob([geoJsonString], { type: 'application/json' })

      const fileName = `${saveFormData.name
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()}.geojson`
      const fileToUpload = new File([blob], fileName, {
        type: 'application/json'
      })

      const uploadResult = await startUpload([fileToUpload])

      if (!uploadResult || uploadResult.length === 0) {
        throw new Error('Échec du téléversement du fichier GeoJSON')
      }

      const uploadedFile = uploadResult[0]
      let centerLat = 0
      let centerLng = 0
      const features = layer.data.features || []

      if (features.length > 0) {
        const bounds = L.geoJSON(layer.data).getBounds()
        if (bounds.isValid()) {
          const center = bounds.getCenter()
          centerLat = center.lat
          centerLng = center.lng
        }
      }

      const response = await kyInstance.post('/api/study-areas', {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveFormData.name,
          description: saveFormData.description,
          geometryType: layer.geometryType.toUpperCase(),
          geojson: layer.data,
          centerLat,
          centerLng,
          fileUrl: uploadedFile.url,
          fileKey: uploadedFile.key
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        showToast(
          `La zone "${saveFormData.name}" a été enregistrée avec succès.`,
          'success'
        )
        setStudyAreaId(result.studyArea.id)
      } else {
        throw new Error(result.error || 'Erreur inconnue')
      }
    } catch (e: any) {
      console.error('Erreur :', e)
      showToast("Erreur lors de l'enregistrement.", 'destructive')
    } finally {
      setIsSaving(false)
    }
  }

  // --- 6. EXPORTATION ---
  const exportShapefile = async (layer: LayerData) => {
    const sanitizeProps = (props: any): any => {
      const res: any = {}
      for (const k in props) {
        const cleanK = k
          .substring(0, 10)
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '')
        if (cleanK) {
          const value = props[k]
          res[cleanK] =
            typeof value === 'object' && value !== null
              ? JSON.stringify(value).substring(0, 255)
              : String(value ?? '')
        }
      }
      return res
    }

    const features = layer.data?.features || []
    if (features.length === 0) {
      showToast('Aucune géométrie à exporter.', 'warning')
      return
    }

    const exportGeoJSON = {
      type: 'FeatureCollection',
      features: features
        .filter(
          (f: any) => f.geometry && f.geometry.type !== 'GeometryCollection'
        )
        .map((f: any) => ({ ...f, properties: sanitizeProps(f.properties) }))
    }

    if (exportGeoJSON.features.length === 0) {
      showToast('Aucune géométrie valide pour Shapefile.', 'warning')
      return
    }

    const baseName = layer.name.replace(/[^a-zA-Z0-9_-]/g, '_')
    try {
      const opts = {
        folder: baseName,
        prj: 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.0174532925199433]]',
        outputType: 'blob'
      }
      // @ts-ignore
      const result: Blob = (await shpwrite.zip(exportGeoJSON, opts)) as Blob
      if (result) {
        downloadBlob(result, `${baseName}.zip`)
        showToast(`Exportation Shapefile réussie.`, 'success')
      }
    } catch (error) {
      showToast(`Erreur lors de l'exportation Shapefile`, 'destructive')
    }
  }

  const handleExport = async (format: 'geojson' | 'zip') => {
    if (!selectedLayerId) {
      showToast('Sélectionnez une couche.', 'warning')
      return
    }
    const layer = layers.find(l => l.id === selectedLayerId)
    if (!layer) return

    if (format === 'geojson') {
      const blob = new Blob([JSON.stringify(layer.data)], {
        type: 'application/json'
      })
      downloadBlob(blob, `${layer.name}.geojson`)
      return
    }
    exportShapefile(layer)
  }

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const selectedLayer = useMemo(
    () => layers.find(l => l.id === selectedLayerId),
    [layers, selectedLayerId]
  )

  // --- RENDU MODALES ET LISTES ---
  const renderImportModal = () => {
    const allSelected =
      importCandidates.length > 0 && importCandidates.every(c => c.selected)
    const noneSelected = importCandidates.every(c => !c.selected)

    return (
      <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent className='max-w-xl'>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'>
              {isProcessing ? (
                <Loader2 className='w-5 h-5 animate-spin' />
              ) : (
                <Database className='w-5 h-5' />
              )}
              {isProcessing
                ? 'Analyse en cours...'
                : 'Sélectionnez les couches à importer'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isProcessing
                ? 'Traitement des fichiers...'
                : `${importCandidates.length} couche(s) identifiée(s).`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {importCandidates.length > 0 && !isProcessing && (
            <div
              className='flex items-center gap-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700'
              onClick={() => toggleAllCandidates(!allSelected)}
            >
              <div
                className='flex items-center justify-center h-5 w-5 rounded-md border-2 border-slate-400 flex-shrink-0 transition-colors'
                style={{
                  backgroundColor: allSelected ? '#3b82f6' : 'transparent',
                  borderColor: allSelected ? '#3b82f6' : 'currentColor'
                }}
              >
                {allSelected && <Check className='w-3.5 h-3.5 text-white' />}
              </div>
              <span className='font-bold text-sm'>
                Tout {allSelected ? 'Désélectionner' : 'Sélectionner'}
              </span>
            </div>
          )}

          <div className='max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-3'>
            {!isProcessing &&
              importCandidates.map(candidate => (
                <div
                  key={candidate.id}
                  className='flex items-start gap-4 p-3 mb-2 rounded-lg transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800'
                  onClick={() =>
                    setImportCandidates(prev =>
                      prev.map(c =>
                        c.id === candidate.id
                          ? { ...c, selected: !c.selected }
                          : c
                      )
                    )
                  }
                >
                  <div
                    className='mt-1 flex items-center justify-center h-5 w-5 rounded-md border-2 border-slate-300 dark:border-slate-600 flex-shrink-0'
                    style={{
                      backgroundColor: candidate.selected
                        ? '#3b82f6'
                        : 'transparent'
                    }}
                  >
                    {candidate.selected && (
                      <Check className='w-3.5 h-3.5 text-white' />
                    )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex justify-between items-center'>
                      <span className='font-semibold text-sm truncate'>
                        {candidate.name}
                      </span>
                      <span className='text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-mono flex-shrink-0 ml-2'>
                        {candidate.geometryType}
                      </span>
                    </div>
                    <div className='text-xs text-slate-500 mt-1'>
                      Source: {candidate.originalName} ({candidate.featureCount}{' '}
                      obj)
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <Button
              onClick={confirmImport}
              disabled={isProcessing || noneSelected}
            >
              <FileInput className='w-4 h-4 mr-2' /> Importer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  // --- NOUVEAU : DIALOGUE DE RECHERCHE AVANCEE ---
  const renderSearchDialog = () => {
    if (!isSearchDialogOpen) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Recherche Géospatiale
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setIsSearchDialogOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-0 flex flex-col md:flex-row h-[500px]">
            {/* Colonne de Gauche : Formulaire et Résultats */}
            <div className="w-full md:w-1/3 p-4 border-r border-slate-200 dark:border-slate-800 flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Mots-clés</label>
                <div className="relative">
                  <Input 
                    placeholder="Nom, description..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                  <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                <p className="flex items-start gap-2">
                  <MapIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Utilisez la carte ci-contre pour dessiner une zone de recherche (carré) et filtrer les résultats géographiquement.</span>
                </p>
              </div>

              <Button onClick={handleSearch} disabled={isSearching} className="w-full">
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Rechercher
              </Button>

              <div className="flex-1 overflow-y-auto border-t border-slate-100 dark:border-slate-800 pt-2">
                <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase">Résultats ({searchResults.length})</h4>
                {searchResults.length === 0 && !isSearching && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Aucun résultat.
                  </div>
                )}
                <div className="space-y-1">
                  {searchResults.map(result => (
                    <div 
                      key={result.id}
                      onClick={() => loadSearchResult(result)}
                      className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                    >
                      {loadingResults[result.id] ? (
                          <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                        ) : (
                          <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
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

            {/* Colonne de Droite : Mini Map */}
            <div className="w-full md:w-2/3 bg-slate-100 dark:bg-slate-950 relative">
               <div ref={miniMapContainerRef} className="absolute inset-0 z-0" />
               
               {/* Overlay d'info pour le dessin */}
               <div className="absolute top-2 right-2 z-[1000] bg-white dark:bg-slate-900 p-2 rounded shadow-md border border-slate-200 text-xs">
                  {searchBounds ? (
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                      <Check className="w-3 h-3" /> Zone définie
                      <button onClick={() => {
                        searchDrawLayerRef.current?.clearLayers()
                        setSearchBounds(null)
                      }} className="text-red-500 hover:underline ml-2">Effacer</button>
                    </div>
                  ) : (
                    <div className="text-slate-500">
                      Dessinez un rectangle pour filtrer
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderSaveDialog = () => {
    return (
      <AlertDialog
        open={saveDialogOpen}
        onOpenChange={open => {
          if (!isSaving) setSaveDialogOpen(open)
          if (!isSaving && !open) setStudyAreaId(null)
        }}
      >
        <AlertDialogContent className='sm:max-w-[425px]'>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2 text-blue-600 dark:text-blue-400'>
              <Database className='w-5 h-5' />
              Sauvegarder la Zone d&apos;Étude
            </AlertDialogTitle>
            <AlertDialogDescription>
              Définissez les propriétés de cette couche avant de
              l&apos;enregistrer dans la base de données PostGIS.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <label
                htmlFor='layer-name'
                className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
              >
                Nom de la zone
              </label>
              <Input
                id='layer-name'
                value={saveFormData.name}
                onChange={e =>
                  setSaveFormData({ ...saveFormData, name: e.target.value })
                }
                placeholder='Ex: Parcelle Agricole B2'
                className='col-span-3'
              />
            </div>
            <div className='grid gap-2'>
              <label
                htmlFor='layer-desc'
                className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
              >
                Description (Optionnel)
              </label>
              <Textarea
                id='layer-desc'
                value={saveFormData.description}
                onChange={e =>
                  setSaveFormData({
                    ...saveFormData,
                    description: e.target.value
                  })
                }
                placeholder='Détails sur la localisation, le propriétaire, etc...'
                className='col-span-3'
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Annuler</AlertDialogCancel>
            <Button
              onClick={executeSaveToDB}
              disabled={isSaving || !saveFormData.name}
            >
              {isSaving ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />{' '}
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className='w-4 h-4 mr-2' /> Enregistrer
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  const renderLayerSettings = () => {
    if (!selectedLayer) return null
    return (
      <div className='p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50 dark:bg-slate-900/50'>
        <h3 className='font-semibold text-sm uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2'>
          <Settings className='w-4 h-4' /> Style de {selectedLayer.name}
        </h3>
        <div className='flex items-center justify-between text-sm'>
          <label className='text-slate-600 dark:text-slate-400'>Couleur:</label>
          <div className='flex items-center gap-2'>
            <Input
              type='color'
              value={selectedLayer.color}
              onChange={e =>
                updateLayerStyle(
                  selectedLayer.id,
                  e.target.value,
                  selectedLayer.opacity
                )
              }
              className='w-8 h-8 p-0 border-0 cursor-pointer rounded-md overflow-hidden'
            />
          </div>
        </div>
        <div>
          <label className='text-sm text-slate-600 dark:text-slate-400 flex justify-between items-center'>
            Opacité:{' '}
            <span className='font-mono text-xs'>
              {(selectedLayer.opacity * 100).toFixed(0)}%
            </span>
          </label>
          <Input
            type='range'
            min='0.1'
            max='1'
            step='0.05'
            value={selectedLayer.opacity}
            onChange={e =>
              updateLayerStyle(
                selectedLayer.id,
                selectedLayer.color,
                parseFloat(e.target.value)
              )
            }
            className='w-full h-2 bg-slate-200 rounded-lg cursor-pointer dark:bg-slate-700'
          />
        </div>
        <div className='flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-slate-700'>
          <Button
            variant='default'
            size='sm'
            onClick={initiateSaveToDB}
            className='bg-blue-600 hover:bg-blue-700 text-white'
            disabled={
              !isAuthenticated ||
              !['ADMIN', 'LIBRARIAN', 'AUTHOR'].includes(role)
            }
          >
            <Database className='w-4 h-4 mr-2' /> Enregistrer en BDD
          </Button>
          <div className='flex gap-2 flex-wrap'>
            <Button
              variant='outline'
              size='sm'
              className='flex-1'
              onClick={() => handleExport('geojson')}
            >
              <Download className='w-4 h-4 mr-2' /> GeoJSON
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='flex-1'
              onClick={() => handleExport('zip')}
            >
              <Download className='w-4 h-4 mr-2' /> SHP (Zip)
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // --- RENDU PRINCIPAL ---
  if (!isMounted)
    return (
      <div className='h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500'>
        <Loader2 className='w-10 h-10 animate-spin text-blue-600 mb-4' />
        <p>Initialisation du SIG...</p>
      </div>
    )

  return (
    <div className='flex h-[calc(100vh-64px)] w-full overflow-hidden relative bg-slate-100 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200'>
      <div
        className={` flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 z-20 shadow-xl ${
          sidebarOpen
            ? 'w-80 translate-x-0'
            : 'w-0 -translate-x-full opacity-0 overflow-hidden'
        } `}
      >
        <div className='p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 bg-slate-50 dark:bg-slate-900'>
          <h2 className='font-bold flex items-center justify-between gap-2 text-sm uppercase tracking-wider text-slate-600 dark:text-slate-400'>
            <span className='flex items-center gap-2'>
              <Layers className='w-4 h-4' /> Gestion ({layers.length})
            </span>
            <Button
              size='sm'
              variant='ghost'
              className='h-8 w-8 p-0'
              onClick={() => setSidebarOpen(false)}
            >
              <ChevronLeft className='w-4 h-4' />
            </Button>
          </h2>

          {/* NOUVEAU BOUTON DE RECHERCHE QUI OUVRE LA MODALE */}
          <Button
            variant="outline"
            className="w-full justify-start text-slate-600 dark:text-slate-300 border-dashed"
            onClick={() => setIsSearchDialogOpen(true)}
          >
            <Search className="w-4 h-4 mr-2" /> Rechercher dans la BDD...
          </Button>

          <div className='flex gap-2 cursor-pointer flex-wrap'>
            <div className='relative flex-1'>
              <Input
                type='file'
                multiple
                accept='.zip,.geojson,.json,.shp,.dbf,.shx,.prj'
                className='absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10'
                onChange={handleFileImport}
                ref={fileInputRef}
              />
              <Button
                variant='secondary'
                size='sm'
                className='w-full text-xs justify-center cursor-pointer hover:bg-blue-600 hover:text-white'
                onClick={() => fileInputRef.current?.click()}
              >
                <FileBox className='w-4 h-4 mr-1' /> Fichiers
              </Button>
            </div>
            <div className='relative flex-1 cursor-pointer'>
              <Input
                type='file'
                // @ts-ignore
                webkitdirectory=''
                directory=''
                className='absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10'
                onChange={handleFolderImport}
                ref={folderInputRef}
              />
              <Button
                variant='secondary'
                size='sm'
                className='w-full text-xs justify-center cursor-pointer hover:bg-green-600 hover:text-white'
                onClick={() => folderInputRef.current?.click()}
              >
                <FolderOpen className='w-4 h-4 mr-1' /> Dossier
              </Button>
            </div>
          </div>
        </div>
        <div className='p-2 space-y-2 overflow-y-auto flex-1'>
          {layers.map(layer => (
            <div
              key={layer.id}
              className={` flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer border-2 ${
                selectedLayerId === layer.id
                  ? 'bg-blue-50/70 dark:bg-blue-900/50 border-blue-500'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent'
              } `}
              onClick={() => {
                setSelectedLayerId(layer.id)
                loadAttributes(layer)
              }}
            >
              <div
                className='flex flex-col items-center flex-shrink-0 w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700'
                style={{ backgroundColor: layer.color }}
              >
                <button
                  onClick={e => {
                    e.stopPropagation()
                    toggleVisibility(layer.id)
                  }}
                  className='p-1 hover:text-white transition-colors'
                >
                  {layer.visible ? (
                    <Eye className='w-4 h-4 text-white drop-shadow-sm' />
                  ) : (
                    <EyeOff className='w-4 h-4 text-slate-300/80 drop-shadow-sm' />
                  )}
                </button>
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium truncate'>{layer.name}</p>
                <p className='text-xs text-slate-500 truncate'>
                  {layer.geometryType} ({layer.featureCount})
                </p>
              </div>
              <div className='flex gap-1 flex-shrink-0'>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    zoomToLayer(layer.id)
                  }}
                  className='p-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-500 transition-colors'
                >
                  <ZoomIn className='w-4 h-4' />
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    deleteLayer(layer.id)
                  }}
                  className='p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 transition-colors'
                >
                  <Trash2 className='w-4 h-4' />
                </button>
              </div>
            </div>
          ))}
        </div>
        {selectedLayer && renderLayerSettings()}
      </div>
      <div className='flex-1 relative'>
        <div
          ref={mapContainerRef}
          className='absolute inset-0 z-10'
          id='map-container'
        />
        {!sidebarOpen && (
          <Button
            size='sm'
            className='absolute md:top-4 max-md:bottom-16 left-4 z-20 shadow-lg'
            onClick={() => setSidebarOpen(true)}
          >
            <Layers className='w-4 h-4 mr-2' /> Ouvrir Couches
          </Button>
        )}

        {/* TABLE DES ATTRIBUTS */}
        <div
          className={` absolute bottom-0 left-0 w-full bg-white dark:bg-slate-900 shadow-2xl border-t border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out z-30 ${
            tableExpanded ? 'h-[90%] md:h-[60%]' : 'h-10'
          } `}
        >
          <div
            className='flex items-center justify-between p-2 cursor-pointer bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700'
            onClick={() => setTableExpanded(prev => !prev)}
          >
            <h2 className='font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-slate-600 dark:text-slate-400'>
              <TableIcon className='w-4 h-4' /> Table des Attributs{' '}
              {selectedLayer ? `(${selectedLayer.name})` : ''}
            </h2>
            <Button size='sm' variant='ghost' className='h-6 w-6 p-0'>
              {tableExpanded ? (
                <Minimize2 className='w-4 h-4' />
              ) : (
                <Maximize2 className='w-4 h-4' />
              )}
            </Button>
          </div>
          <div
            className={` h-[calc(100%-40px)] transition-opacity duration-200 ${
              tableExpanded ? 'opacity-100 visible' : 'opacity-0 hidden'
            } `}
          >
            <div className='flex-1 p-4 overflow-auto h-full'>
              {tableData.length > 0 && (
                <div className='w-full overflow-x-auto'>
                  <table className='min-w-full divide-y divide-slate-200 dark:divide-slate-700'>
                    <thead className='bg-slate-50 dark:bg-slate-800 sticky top-0 z-10'>
                      <tr>
                        {tableColumns.map(col => (
                          <th
                            key={col}
                            className='px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap'
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className='bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800'>
                      {tableData.map((row, i) => (
                        <tr
                          key={i}
                          className='hover:bg-slate-50 dark:hover:bg-slate-800'
                        >
                          {tableColumns.map(col => (
                            <td
                              key={col}
                              className='px-4 py-2 whitespace-nowrap text-sm text-slate-900 dark:text-slate-300'
                            >
                              {col === '_fid'
                                ? row._fid
                                : row[col] !== undefined
                                ? String(row[col])
                                : 'N/A'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {tableData.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Database className="w-8 h-8 mb-2 opacity-20" />
                    <p>Aucune donnée attributaire disponible.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {renderImportModal()}
      {renderSaveDialog()}
      {renderSearchDialog()}
    </div>
  )
}