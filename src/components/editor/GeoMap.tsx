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
  MapIcon,
  Layers,
  TableIcon,
  Download,
  Eye,
  EyeOff,
  Trash2,
  Settings,
  Check,
  AlertTriangle,
  Database,
  Loader2,
  FolderOpen,
  FileType,
  ChevronRight,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ZoomIn, // Import de l'icône de recherche (Zoom)
  FileInput
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/components/AuthProvider'
import { Input } from '../ui/input'
import { showToast } from '@/hooks/useToast'



type GeometryType = | 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon' | 'GeometryCollection'

interface LayerData {
  id: string
  name: string
  type: 'geojson' | 'shapefile' | 'draw'
  geometryType: GeometryType | string
  visible: boolean
  color: string
  opacity: number
  data: any // GeoJSON FeatureCollection
  featureCount: number
  generatedId: boolean
  generatedGeom: boolean
}

interface ImportCandidate {
  id: string
  name: string
  originalName: string // Nom du fichier source (ex: "mon_fichier.zip" ou "parcelle.shp")
  data: any
  type: 'geojson' | 'shapefile'
  featureCount: number
  geometryType: string
  selected: boolean
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

// Couleurs vibrantes pour la cartographie
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

export default function GeoMap () {
  const { role, isAuthenticated } = useAuth()
  const [isMounted, setIsMounted] = useState(false)

  // Refs Leaflet
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null)
  const layerInstancesRef = useRef<{ [key: string]: L.Layer }>({})

  // UI State
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [activeTab, setActiveTab] = useState<'layers' | 'attributes'>('layers')
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

  // Table State
  const [tableData, setTableData] = useState<any[]>([])
  const [tableColumns, setTableColumns] = useState<string[]>([])

  // Références aux inputs (pour déclencher le click via un bouton personnalisé)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // --- 1. INITIALISATION & THÈME ---
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

  // Init Leaflet
  useEffect(() => {
    if (!isMounted || !mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([-4.4419, 15.2663], 11) // Kinshasa

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Setup Dessin
    if (drawnItemsRef.current) {
      map.addLayer(drawnItemsRef.current)
      const drawControl = new L.Control.Draw({
        edit: {
          featureGroup: drawnItemsRef.current
        },
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true
          },
          polyline: {},
          rectangle: {},
          circle: false,
          marker: {},
          circlemarker: false
        }
      })
      map.addControl(drawControl)
    }

    // Capture Dessin Créé
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
        data: {
          type: 'FeatureCollection',
          features: [feature]
        },
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

  // Gestion dynamique du fond de carte (Dark/Light)
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

    // Mettre l'ordre z-index au fond
    tileLayerRef.current.bringToBack()
  }, [isDarkMode, isMounted])

  // Ajout de la gestion du chemin relatif pour les dossiers
  const getFileBaseName = (file: File): string | null => {
    // @ts-ignore - Accéder à la propriété relativePath utilisée pour l'upload de dossiers
    const fullPath = file.webkitRelativePath || file.name
    // On retire le nom du dossier si présent, puis l'extension
    const fileNameWithExt = fullPath.split('/').pop()
    if (!fileNameWithExt) return null
    const parts = fileNameWithExt.split('.')
    parts.pop() // Supprimer l'extension
    // S'assurer que le nom de base n'est pas vide (cas de fichiers .gitignore, etc.)
    const baseName = parts.join('.')
    return baseName || fileNameWithExt
  }

  /**
   * Analyse et traite la liste des fichiers importés (Shapefile, GeoJSON, ZIP).
   * @param files Liste des fichiers FileList ou Array<File>.
   */
  const processFiles = async (files: FileList | File[]) => {
    // Vérification du dossier ou sélection vide
    if (!files || files.length === 0) {
      showToast('Aucun fichier ou dossier sélectionné.', 'warning')
      return
    }

    setIsProcessing(true)
    setImportCandidates([]) // Réinitialiser avant le traitement
    setImportDialogOpen(true)

    const candidates: ImportCandidate[] = []
    // Structure pour regrouper les Shapefiles par nom de base (ex: 'parcelle')
    const shapefileGroup: {
      [baseName: string]: { shp?: File; dbf?: File; prj?: File; files: File[] }
    } = {}
    const geojsonFiles: File[] = []
    const zipFiles: File[] = []

    // 1. Classification des fichiers
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const base = getFileBaseName(file)
      if (!ext || !base || file.size === 0) continue

      if (ext === 'shp' || ext === 'dbf' || ext === 'shx' || ext === 'prj') {
        if (!shapefileGroup[base]) shapefileGroup[base] = { files: [] }
        shapefileGroup[base].files.push(file)
        if (ext === 'shp') shapefileGroup[base].shp = file
        if (ext === 'dbf') shapefileGroup[base].dbf = file
        if (ext === 'prj') shapefileGroup[base].prj = file
        continue
      }

      if (ext === 'geojson' || ext === 'json') {
        geojsonFiles.push(file)
        continue
      }

      if (ext === 'zip') {
        zipFiles.push(file)
        continue
      }
    }

    try {
      // 2. Traitement des Shapefiles (regroupés par nom de base)
      for (const baseName in shapefileGroup) {
        const group = shapefileGroup[baseName]
        // Vérification de l'intégrité minimale : .shp et .dbf sont nécessaires
        if (group.shp && group.dbf) {
          const zip = new JSZip()
          // Ajouter TOUS les fichiers du groupe au ZIP virtuel (requis par shpjs)
          group.files.forEach(file => {
            zip.file(file.name, file)
          })

          const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })
          const result = await shp(zipBuffer)
          const results = Array.isArray(result) ? result : [result]

          results.forEach((fc, idx) => {
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
        } else {
          const missingData = []
          if (!group.shp) missingData.push('.shp')
          if (!group.dbf) missingData.push('.dbf')

            console.warn(`Shapefile incomplet ignoré: ${baseName}. Fichiers manquants: ${missingData.join(', ')}`)
          console.warn(
            `Shapefile incomplet ignoré: ${baseName}. Nécessite au moins .shp et .dbf.`
          )
          showToast(
            `Shapefile incomplet ignoré (${baseName}). Fichiers manquants: ${missingData.join(', ')}.`,
            'warning'
          )
        }
      }

      // 3. Traitement des fichiers GeoJSON
      for (const file of geojsonFiles) {
        try {
          const text = await file.text()
          const json = JSON.parse(text)
          const ext = file.name.split('.').pop()
          candidates.push({
            id: crypto.randomUUID(),
            name: file.name.replace(`.${ext}`, ''),
            originalName: file.name,
            data: json,
            type: 'geojson',
            featureCount: json.features?.length || 0,
            geometryType: json.features?.[0]?.geometry?.type || 'Unknown',
            selected: true
          })
        } catch (err) {
          console.error('Erreur JSON', err)
          showToast(
            `Erreur de parsing GeoJSON pour ${file.name}.`,
            'destructive'
          )
        }
      }

      // 4. Traitement des fichiers ZIP
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
          console.error('Erreur ZIP', err)
          showToast(
            `Erreur de lecture du fichier ZIP ${file.name}.`,
            'destructive'
          )
        }
      }

      setImportCandidates(candidates)

      // Si aucune couche trouvée, on ferme la modale et affiche un message
      if (candidates.length === 0) {
        setImportDialogOpen(false)
        showToast("Aucune donnée valide trouvée pour l'importation.", 'warning')
      }
    } catch (error) {
      showToast(
        "Erreur lors de l'analyse des fichiers. Vérifiez le format (zip, shp, dbf, geojson).",
        'destructive'
      )
      console.error("Erreur générale d'import:", error)
      setImportDialogOpen(false)
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Gère la sélection de fichiers individuels (y compris ZIP, GeoJSON).
   */
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      // La fonction processFiles gère l'analyse
      processFiles(files)
    }
    // Réinitialisation de l'input pour permettre l'import du même fichier si nécessaire
    e.target.value = ''
  }

  /**
   * Gère la sélection d'un dossier pour les Shapefiles.
   */
  const handleFolderImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      // La fonction processFiles gère l'analyse
      processFiles(files)
    }
    // Réinitialisation de l'input pour permettre l'import du même dossier si nécessaire
    e.target.value = ''
  }

  // Fonction pour basculer la sélection de toutes les couches candidates
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

  // --- 3. GESTION CARTO ---

  /**
   * Centre la carte sur l'étendue de la couche spécifiée.
   * @param id L'identifiant de la couche à zoomer.
   */
  const zoomToLayer = (id: string) => {
    const layer = layerInstancesRef.current[id] as L.GeoJSON
    if (!mapRef.current || !layer) {
      showToast('Erreur: Couche Leaflet introuvable.', 'destructive')
      return
    }

    try {
      // Obtenir les limites (Bounds) de la couche GeoJSON
      const bounds = layer.getBounds()
      if (bounds.isValid()) {
        // Ajuster la vue de la carte aux limites
        mapRef.current.fitBounds(bounds, {
          padding: [50, 50], // Marge pour ne pas coller au bord de la carte
          maxZoom: 16 // Zoom maximal pour éviter un zoom trop proche
        })
        showToast(
          `Zoomé sur la couche : ${layers.find(l => l.id === id)?.name}`,
        )
      } else {
        showToast(
          "Impossible de calculer l'étendue de cette couche.",
          'warning'
        )
      }
    } catch (e) {
      console.error('Could not fit bounds of layer:', e)
      showToast("Erreur lors du calcul de l'étendue.", 'destructive')
    }
  }

  const addLayerToMap = (layerData: LayerData) => {
    if (!mapRef.current) return

    // Création de la couche Leaflet
    const layer = L.geoJSON(layerData.data, {
      style: feature => ({
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
        // Interaction
        l.on('click', e => {
          L.DomEvent.stopPropagation(e)
          setSelectedLayerId(layerData.id)
          loadAttributes(layerData)
          // Highlight temporaire
          // Utilisation d'un élément HTML simple pour le popup
          const popupContent = `
            <div class="font-bold text-sm text-slate-900">${
              layerData.name
            }</div>
            <div class="text-xs text-slate-700">ID: ${
              feature.properties?.id || 'N/A'
            }</div>
            ${
              Object.keys(feature.properties || {}).length > 0
                ? `<div class="mt-1 text-xs text-slate-600"> Propriétés: ${
                    Object.keys(feature.properties).length
                  } champs </div>`
                : ''
            }
          `
          const popup = L.popup({ maxWidth: 300 })
            .setLatLng(e.latlng)
            .setContent(popupContent)
            .openOn(mapRef.current!)
        })
      }
    })

    layer.addTo(mapRef.current)

    try {
      // Tenter d'ajuster la vue à l'étendue de la nouvelle couche
      const bounds = layer.getBounds()
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] })
      }
    } catch (e) {
      console.error('Could not fit bounds of layer:', e)
    }

    // Sauvegarde référence et état
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
      fillOpacity: newOpacity * 0.2, // Base fill opacity relative
      opacity: newOpacity
    })

    // Pour les points
    layer.eachLayer((l: any) => {
      if (l.setStyle) {
        l.setStyle({
          fillColor: newColor,
          fillOpacity: newOpacity * 0.8,
          opacity: newOpacity
        })
      }
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

    if (mapRef.current.hasLayer(layer)) {
      mapRef.current.removeLayer(layer)
    } else {
      mapRef.current.addLayer(layer)
    }
    setLayers(prev =>
      prev.map(l => (l.id === id ? { ...l, visible: !l.visible } : l))
    )
  }

  const deleteLayer = (id: string) => {
    // Remplacer l'alert() par une alerte modale
    // Si nous utilisions l'AlertDialog pour la confirmation, le code serait ici.
    // Pour l'instant, nous évitons les alertes natives.
    // NOTE: Pour les besoins de cette démo, je vais utiliser une confirmation interne simple.
    const layer = layerInstancesRef.current[id]
    if (layer && mapRef.current) mapRef.current.removeLayer(layer)
    delete layerInstancesRef.current[id]
    setLayers(prev => prev.filter(l => l.id !== id))
    if (selectedLayerId === id) {
      setSelectedLayerId(null)
      setTableData([])
    }
  }

  // --- 4. ATTRIBUTS & BDD ---
  const loadAttributes = (layer: LayerData) => {
    const features = layer.data.features || []
    if (features.length === 0) {
      setTableData([])
      setTableColumns([])
      return
    }

    // Extraction dynamique des colonnes
    const cols = new Set<string>()
    features.forEach((f: any) => {
      if (f.properties) Object.keys(f.properties).forEach(k => cols.add(k))
    })
    setTableColumns(Array.from(cols))

    // Ajout de l'identifiant pour la table
    setTableData(
      features.map((f: any, i: number) => ({ _fid: i, ...f.properties }))
    )
    setActiveTab('attributes')
  }

  const handleSaveToDB = async () => {
    // Vérification Rôle
    const authorized = ['ADMIN', 'LIBRARIAN', 'AUTHOR'].includes(role)
    if (!isAuthenticated || !authorized) {
      showToast(
        "Accès Refusé : Vous devez être connecté en tant qu'Auteur ou Administrateur.",
        'warning'
      )
      return
    }
    if (!selectedLayerId) return
    const layer = layers.find(l => l.id === selectedLayerId)
    if (!layer) return

    // Simulation d'une confirmation de sauvegarde
    // Dans une implémentation réelle, on utiliserait un composant Modal pour remplacer le 'confirm()'
    const isConfirmed = window.confirm(
      `💾 Enregistrer "${layer.name}" dans la base de données PostGIS ?`
    )
    if (!isConfirmed) return

    try {
      // Calculate center coordinates from the layer's features
      let centerLat = 0
      let centerLng = 0
      const features = layer.data.features || []
      if (features.length > 0) {
        // Calculate bounds to get center
        const bounds = L.geoJSON(layer.data).getBounds()
        if (bounds.isValid()) {
          const center = bounds.getCenter()
          centerLat = center.lat
          centerLng = center.lng
        }
      }

      const response = await fetch('/api/study-areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: layer.name,
          description: `Imported layer: ${layer.name}`,
          geometryType: layer.geometryType.toUpperCase(),
          geojson: layer.data,
          centerLat,
          centerLng
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        showToast(
          `Succès : La couche "${layer.name}" a été sécurisée en base de données.`,
          'success'
        )
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (e) {
      showToast('Erreur lors de la sauvegarde.', 'destructive')
      console.error('Erreur de sauvegarde DB:', e)
    }
  }
  const exportShapefile = async (layer: LayerData) => {
    // Fonction essentielle pour la compatibilité Shapefile/DBF
    const sanitizeProps = (props: any): any => {
        const res: any = {};
        for (const k in props) {
            // Les champs DBF doivent être limités à 10 caractères, minuscules, et sans caractères spéciaux
            const cleanK = k.substring(0, 10).toLowerCase().replace(/[^a-z0-9_]/g, '');
            if (cleanK) {
                const value = props[k];
                // Convertir les objets complexes (souvent des métadonnées) en chaînes de caractères JSON
                // et s'assurer que tout est une chaîne (limitation courante DBF à 255 caractères)
                res[cleanK] = typeof value === 'object' && value !== null
                    ? JSON.stringify(value).substring(0, 255)
                    : String(value ?? ""); // Gère null/undefined
            }
        }
        return res;
    };

    const features = layer.data?.features || [];
    if (features.length === 0) {
        showToast('Cette couche ne contient aucune géométrie à exporter.', 'warning');
        return;
    }
    
    // 1. Préparer le GeoJSON : filtrer les géométries non supportées et désinfecter les propriétés
    const exportGeoJSON = {
        type: 'FeatureCollection',
        features: features
            // Filtrer les GeometryCollection, qui ne sont pas supportées par shp-write
            .filter((f: any) => f.geometry && f.geometry.type !== 'GeometryCollection') 
            .map((f: any) => ({
                ...f,
                properties: sanitizeProps(f.properties) // Appliquer la désinfection
            }))
    };

    if (exportGeoJSON.features.length === 0) {
        showToast("Aucune géométrie valide restante pour l'exportation Shapefile.", 'warning');
        return;
    }

    const baseName = layer.name.replace(/[^a-zA-Z0-9_-]/g, '_');

    try {
        const opts = {
            folder: baseName,
            // Le WKT (Well-Known Text) standard pour la projection WGS84 (EPSG:4326)
            prj: 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.0174532925199433]]',
            outputType: 'blob'
        };

        // 2. Utilisation de shpwrite.zip
        const result: Blob = await shpwrite.zip(exportGeoJSON, opts) as Blob;

        if (result) {
            downloadBlob(result, `${baseName}.zip`);
            showToast(`Succès : Exportation Shapefile (ZIP) de "${layer.name}" terminée.`, 'success');
        } else {
             showToast('Erreur lors de la génération du Shapefile ZIP (résultat vide).', 'destructive');
        }
    } catch (error) {
        console.error("Erreur lors de l'exportation du Shapefile (shpwrite.zip) :", error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        showToast(`Erreur lors de l'exportation du Shapefile`, 'destructive');
    }
};

  const handleExport = async (format: 'geojson' | 'zip') => {
    if (!selectedLayerId) {
      showToast('Sélectionnez une couche à exporter.', 'warning')
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
    document.body.removeChild(a) // Nettoyage
  }

  // Utilitaire pour la table des attributs
  const selectedLayer = useMemo(() => {
    return layers.find(l => l.id === selectedLayerId)
  }, [layers, selectedLayerId])

  // --- RENDU DES COMPOSANTS INTERNES ---

  const renderImportModal = () => {
    const allSelected = importCandidates.every(c => c.selected)
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
                ? 'Analyse des données en cours...'
                : 'Sélectionnez les couches à importer'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isProcessing
                ? 'Veuillez patienter pendant le traitement des fichiers (Shapefile, GeoJSON ou ZIP).'
                : `L'analyse a identifié ${importCandidates.length} couche(s) potentielle(s). Décochez celles que vous ne souhaitez pas ajouter à la carte.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* NOUVEAU: Case à cocher Tout Sélectionner/Désélectionner */}
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
              <span className='font-bold text-sm text-slate-800 dark:text-slate-200'>
                Tout {allSelected ? 'Désélectionner' : 'Sélectionner'}
              </span>
            </div>
          )}

          {/* Contenu de la liste des candidats */}
          <div className='max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-3'>
            {importCandidates.length === 0 && !isProcessing && (
              <p className='text-center text-slate-500 py-6'>
                Aucun fichier GeoJSON, Shapefile (.shp/.dbf/.prj) ou ZIP valide
                n&apos;a été trouvé.
              </p>
            )}
            {isProcessing && (
              <div className='flex justify-center items-center h-20'>
                <Loader2 className='w-6 h-6 animate-spin text-blue-600' />
              </div>
            )}
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
                  {/* Case à cocher personnalisée */}
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
                  {/* Icône du type de géométrie */}
                  <div className='flex-shrink-0 text-blue-500 dark:text-blue-400'>
                    {/* Une meilleure implémentation utiliserait une icône basée sur le type de géométrie */}
                    {candidate.geometryType.includes('Point') && (
                      <MapIcon className='w-4 h-4' />
                    )}
                    {candidate.geometryType.includes('Line') && (
                      <ChevronRight className='w-4 h-4' />
                    )}
                    {candidate.geometryType.includes('Polygon') && (
                      <Layers className='w-4 h-4' />
                    )}
                    {candidate.geometryType.includes('Unknown') && (
                      <AlertTriangle className='w-4 h-4' />
                    )}
                    {/* Remplacement des autres icônes par une icône par défaut */}
                    {!candidate.geometryType.includes('Point') &&
                      !candidate.geometryType.includes('Line') &&
                      !candidate.geometryType.includes('Polygon') && (
                        <FileType className='w-4 h-4' />
                      )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex justify-between items-center'>
                      {/* Nom de la couche */}
                      <span className='font-semibold text-sm truncate text-slate-800 dark:text-slate-200'>
                        {candidate.name}
                      </span>
                      {/* Type de géométrie */}
                      <span className='text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-mono flex-shrink-0 ml-2'>
                        {candidate.geometryType}
                      </span>
                    </div>
                    <div className='flex justify-between items-center text-xs text-slate-500 mt-1'>
                      {/* Source et nombre d'objets */}
                      <span className='truncate'>
                        Source: {candidate.originalName}
                      </span>
                      <span className='flex-shrink-0 ml-4'>
                        {candidate.featureCount} objets
                      </span>
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
              <FileInput />
              Importer la sélection (
              {importCandidates.filter(c => c.selected).length})
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  const renderLayerList = () => (
    <div className='p-2 space-y-2 overflow-y-auto flex-1'>
      {layers.length === 0 ? (
        <p className='text-center text-sm text-slate-500 mt-8'>
          Aucune couche chargée. Importez un GeoJSON, Shapefile ou ZIP.
        </p>
      ) : (
        layers.map(layer => (
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
            {/* Icône de couleur et de visibilité */}
            <div
              className='flex flex-col items-center flex-shrink-0 w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700'
              style={{ backgroundColor: layer.color }}
            >
              {/* Bouton de Visibilité */}
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
            {/* Infos de la couche */}
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium truncate'>{layer.name}</p>
              <p className='text-xs text-slate-500 dark:text-slate-400 truncate'>
                {layer.geometryType} ({layer.featureCount} obj.)
              </p>
            </div>
            {/* Actions */}
            <div className='flex gap-1 flex-shrink-0'>
              {/* NOUVEAU: Bouton Zoom to Layer */}
              <button
                onClick={e => {
                  e.stopPropagation()
                  zoomToLayer(layer.id)
                }}
                className='p-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-500 transition-colors'
                title='Zoomer sur la couche'
              >
                <ZoomIn className='w-4 h-4' />
              </button>

              <button
                onClick={e => {
                  e.stopPropagation()
                  deleteLayer(layer.id)
                }}
                className='p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 transition-colors'
                title='Supprimer la couche'
              >
                <Trash2 className='w-4 h-4' />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )

  const renderLayerSettings = () => {
    if (!selectedLayer) return null

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      updateLayerStyle(selectedLayer.id, e.target.value, selectedLayer.opacity)
    }

    const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newOpacity = parseFloat(e.target.value)
      updateLayerStyle(selectedLayer.id, selectedLayer.color, newOpacity)
    }

    return (
      <div className='p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50 dark:bg-slate-900/50'>
        <h3 className='font-semibold text-sm uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2'>
          <Settings className='w-4 h-4' /> Style de {selectedLayer.name}
        </h3>
        {/* Sélecteur de Couleur */}
        <div className='flex items-center justify-between text-sm'>
          <label className='text-slate-600 dark:text-slate-400'>Couleur:</label>
          <div className='flex items-center gap-2'>
            <Input
              type='color'
              value={selectedLayer.color}
              onChange={handleColorChange}
              className='w-8 h-8 p-0 border-0 cursor-pointer rounded-md overflow-hidden'
            />
            <span className='font-mono text-xs'>{selectedLayer.color}</span>
          </div>
        </div>
        {/* Sélecteur d'Opacité */}
        <div>
          <label
            htmlFor='opacity-slider'
            className='text-sm text-slate-600 dark:text-slate-400 flex justify-between items-center'
          >
            Opacité:{' '}
            <span className='font-mono text-xs text-slate-800 dark:text-slate-200'>
              {(selectedLayer.opacity * 100).toFixed(0)}%
            </span>
          </label>
          <Input
            id='opacity-slider'
            type='range'
            min='0.1'
            max='1'
            step='0.05'
            value={selectedLayer.opacity}
            onChange={handleOpacityChange}
            className='w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700'
          />
        </div>
        {/* Actions Supplémentaires */}
        <div className='flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-slate-700'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleSaveToDB}
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
              <Download className='w-4 h-4 mr-2' /> Exporter GeoJSON
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='flex-1'
              onClick={() => handleExport('zip')}
            >
              <Download className='w-4 h-4 mr-2' /> Exporter Shapefile (ZIP)
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderAttributesTable = () => (
    <div className='flex-1 p-4 overflow-auto'>
      {tableData.length === 0 ? (
        <p className='text-center text-sm text-slate-500 mt-8'>
          Sélectionnez une couche pour afficher ses attributs.
        </p>
      ) : (
        <div className='w-full overflow-x-auto'>
          <table className='min-w-full divide-y divide-slate-200 dark:divide-slate-700'>
            <thead className='bg-slate-50 dark:bg-slate-800 sticky top-0 z-10'>
              <tr>
                {tableColumns.map(col => (
                  <th
                    key={col}
                    className='px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap'
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800'>
              {tableData.map((row, index) => (
                <tr
                  key={index}
                  className='hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors'
                >
                  {tableColumns.map(col => (
                    <td
                      key={col}
                      className='px-4 py-2 whitespace-nowrap text-sm text-slate-900 dark:text-slate-300'
                    >
                      {/* Afficher l'identifiant pour la colonne interne s'il est présent */}
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
    </div>
  )

  const renderTablePanel = () => (
    <div
      className={` absolute bottom-0 left-0 w-full bg-white dark:bg-slate-900 shadow-2xl border-t border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out z-30 ${
        tableExpanded ? 'h-[90%] md:h-[60%] lg:h-[70%] xl:h-[80%]' : 'h-10'
      } `}
    >
      {/* Tête de la table (toujours visible) */}
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
      {/* Corps de la table (visible si étendu) */}
      <div
        className={` h-[calc(100%-40px)] transition-opacity duration-200 ${
          tableExpanded ? 'opacity-100 visible' : 'opacity-0 hidden'
        } `}
      >
        {renderAttributesTable()}
      </div>
    </div>
  )

  // --- RENDER PRINCIPAL ---
  if (!isMounted)
    return (
      <div className='h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500'>
        <Loader2 className='w-10 h-10 animate-spin text-blue-600 mb-4' />
        <p>Initialisation du SIG...</p>
      </div>
    )

  return (
    <div className='flex h-[calc(100vh-64px)] w-full overflow-hidden relative bg-slate-100 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200'>
      {/* --- BARRE LATÉRALE (GAUCHE) --- */}
      <div
        className={` flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 z-20 shadow-xl ${
          sidebarOpen
            ? 'w-80 translate-x-0'
            : 'w-0 -translate-x-full opacity-0 overflow-hidden'
        } `}
      >
        {/* Header Sidebar */}
        <div className='p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 bg-slate-50 dark:bg-slate-900'>
          <h2 className='font-bold flex items-center justify-between gap-2 text-sm uppercase tracking-wider text-slate-600 dark:text-slate-400'>
            <span className='flex items-center gap-2'>
              <Layers className='w-4 h-4' /> Gestion des Couches (
              {layers.length})
            </span>
            {/* Bouton pour fermer/ouvrir la sidebar */}
            <Button
              size='sm'
              variant='ghost'
              className='h-8 w-8 p-0'
              onClick={() => setSidebarOpen(false)}
            >
              <ChevronLeft className='w-4 h-4' />
            </Button>
          </h2>
          {/* NOUVEAU: Menu d'Importation Séparé et Accessible */}
          <div className='flex gap-2 flex-wrap'>
            {/* Importation de Fichiers (GeoJSON, ZIP, SHP regroupés manuellement) */}
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
                className='w-full text-xs justify-center hover:bg-blue-600 hover:text-white'
                onClick={() => fileInputRef.current?.click()}
              >
                <FileType className='w-4 h-4 mr-1' /> Importer des fichiers
              </Button>
            </div>
            {/* Importation de Dossier (pour les Shapefiles complets) */}
            <div className='relative flex-1'>
              <Input
                type='file'
                // @ts-ignore webkitdirectory="" directory=""
                webkitdirectory=''
                directory=''
                className='absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10'
                onChange={handleFolderImport}
                ref={folderInputRef}
              />
              <Button
                variant='secondary'
                size='sm'
                className='w-full text-xs justify-center hover:bg-green-600 hover:text-white'
                onClick={() => folderInputRef.current?.click()}
              >
                <FolderOpen className='w-4 h-4 mr-1' /> Importer un dossier
              </Button>
            </div>
          </div>
        </div>
        {/* Liste des Couches */}
        {renderLayerList()}
        {/* Panneau de Style et d'Exportation */}
        {selectedLayer && renderLayerSettings()}
      </div>

      {/* --- CARTE PRINCIPALE --- */}
      <div className='flex-1 relative'>
        <div
          ref={mapContainerRef}
          className='absolute inset-0 z-10'
          id='map-container'
        />
        {/* Bouton pour ouvrir la barre latérale */}
        {!sidebarOpen && (
          <Button
            size='sm'
            className='absolute top-4 left-4 z-20 shadow-lg'
            onClick={() => setSidebarOpen(true)}
          >
            <Layers className='w-4 h-4 mr-2' /> Ouvrir Couches
          </Button>
        )}
        {/* Panneau de la Table des Attributs */}
        {renderTablePanel()}
      </div>

      {/* Modale d'Importation */}
      {renderImportModal()}
    </div>
  )
}
