'use client'

import { useActionState, useEffect, useRef, useState, useMemo, SetStateAction } from 'react'
import { updateStudyArea, createStudyAreaFromLayer, getAvailableStudyAreas } from '../actions'
import {
  MapIcon,
  PenTool,
  Settings2,
  CheckCircle2,
  Maximize2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { showToast } from '@/hooks/useToast'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import { StudyArea } from '@prisma/client'
import { useUploadThing } from '@/lib/uploadthing'

// --- IMPORTS DES SOUS-COMPOSANTS ---
import { 
    SimplifiedBook, 
    LayerConfig, 
    GeometryMode, 
    ExtendedFeature, 
    LayerStyle, 
    DEFAULT_STYLES,
    ImportableStudyArea
} from './map-types'
import LayerManagerDialog from './LayerManagerDialog'
import AttributeTableDialog from './AttributeTableDialog'
import MapSidebar from './MapSidebar'
import SaveLayerDialog from './SaveLayerDialog'
import kyInstance from '@/lib/ky'

// Import Leaflet Draw uniquement côté client
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('leaflet-draw')
}

interface EditMapClientProps {
  studyArea: StudyArea
  initialGeoJson: GeoJSON.FeatureCollection | null
  initialBooks: SimplifiedBook[]
}

export default function EditMapClient({
  studyArea,
  initialGeoJson
}: EditMapClientProps) {
  // --- STATES LEAFLET ---
  const [map, setMap] = useState<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)
  const drawControlRef = useRef<L.Control.Draw | null>(null)
  const layersMapRef = useRef<Map<string | number, L.Layer>>(new Map())

  // --- DATA STATES ---
  const [features, setFeatures] = useState<ExtendedFeature[]>([])
  const [studyAreaName, setStudyAreaName] = useState(studyArea.name)
  const [studyAreaDescription, setStudyAreaDescription] = useState(studyArea.description || '')
  
  // États pour les imports BDD
  const [availableDBLayers, setAvailableDBLayers] = useState<ImportableStudyArea[]>([])
  const [isLoadingDBLayers, setIsLoadingDBLayers] = useState(false)

  // --- UI STATES ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isAttributeTableOpen, setIsAttributeTableOpen] = useState(false)
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | number | null>(null)
  
  // ID de la couche sélectionnée pour l'affichage de la table attributaire
  const [attributeTableLayerId, setAttributeTableLayerId] = useState<string | 'all'>(
      (initialGeoJson && initialGeoJson.features.length > 0) ? 'existing-poly' : 'all'
  )

  // --- GIS LOGIC STATES ---
  const [isLayerDialogOpen, setIsLayerDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState<GeometryMode>('None')
  const [targetLayer, setTargetLayer] = useState<string>('new') 
  const [newLayerType, setNewLayerType] = useState<GeometryMode>('Polygon')
  const [activeLayers, setActiveLayers] = useState<LayerConfig[]>([])
  const [editingStyleLayerId, setEditingStyleLayerId] = useState<string | null>(null)

  // --- SAVE LAYER STATES ---
  const [isSaveLayerDialogOpen, setIsSaveLayerDialogOpen] = useState(false)
  const [layerToSaveId, setLayerToSaveId] = useState<string | null>(null)
  
  // --- UPLOADTHING & ACTIONS ---
  const { startUpload, isUploading } = useUploadThing("geoJsonUploader", {
      onClientUploadComplete: () => {
          console.log("Upload terminé");
      },
      onUploadError: (e) => {
          showToast(`Erreur upload: ${e.message}`, "destructive");
      },
  });

  const [state, formAction] = useActionState(
    updateStudyArea.bind(null, studyArea.id),
    { success: false, message: '' }
  )

  // --- INITIALISATION DATA ---
  useEffect(() => {
    if (initialGeoJson && initialGeoJson.features) {
      const initializedFeatures = initialGeoJson.features.map((f, index) => ({
        ...f,
        id: f.id || `feat-${Date.now()}-${index}`,
        properties: f.properties || {}
      })) as ExtendedFeature[]
      
      setFeatures(initializedFeatures)

      // Initialiser les layers par défaut
      const typesFound = new Set(initializedFeatures.map(f => f.geometry.type))
      const initialLayers: LayerConfig[] = []
      
      // Helper pour init layer
      const addInitLayer = (id: string, name: string, type: GeometryMode, key: GeoJSON.Geometry['type']) => {
          if (typesFound.has(key as GeoJSON.Geometry['type']) || typesFound.has(`Multi${key}` as GeoJSON.Geometry['type'])) {
            const layer = {
                id, name, type, visible: true, showLabels: false,
                count: initializedFeatures.filter(f => f.geometry.type.includes(key)).length,
                style: { ...DEFAULT_STYLES[type] },
                isDatabaseBound: true 
            } as LayerConfig

            // Attacher l'ID de couche aux features initiales
            initializedFeatures.filter(f => f.geometry.type.includes(key)).forEach(f => {
                f.properties._layerId = id;
            });

            initialLayers.push(layer);
          }
      }

      // NOUVEAU: On utilise le vrai nom de la zone d'étude au lieu de "Zones principales"
      addInitLayer('existing-poly', studyArea.name, 'Polygon', 'Polygon')
      addInitLayer('existing-line', 'Lignes principales', 'LineString', 'LineString')
      addInitLayer('existing-point', 'Points principaux', 'Point', 'Point')
      
      setActiveLayers(initialLayers)
      
      if (initialLayers.length > 0) {
          setAttributeTableLayerId(initialLayers[0].id)
      }
    }

    setIsLoadingDBLayers(true)
    getAvailableStudyAreas().then((areas: SetStateAction<ImportableStudyArea[]>) => {
        setAvailableDBLayers(areas)
        setIsLoadingDBLayers(false)
    })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- INITIALISATION MAP ---
  useEffect(() => {
    if (!mapContainerRef.current || map) return

    const mapInstance = L.map(mapContainerRef.current).setView(
      [studyArea.centerLat || -4.4419, studyArea.centerLng || 15.2663],
      12
    )

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM'
    }).addTo(mapInstance)

    const drawnItems = new L.FeatureGroup()
    mapInstance.addLayer(drawnItems)
    featureGroupRef.current = drawnItems

    mapInstance.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
      const layer = e.layer
      
      const geoJson = layer.toGeoJSON()
      const newId = `new-${Date.now()}`
      geoJson.id = newId

      let targetLayerConfig = activeLayers.find(l => l.id === targetLayer)
      if (!targetLayerConfig || targetLayerConfig.id === 'new') {
          const geoType = (geoJson.geometry.type.includes('Polygon') ? 'Polygon' : geoJson.geometry.type.includes('LineString') ? 'LineString' : 'Point') as GeometryMode
          targetLayerConfig = activeLayers.find(l => l.type === geoType && !l.isDatabaseBound) || activeLayers.find(l => l.type === geoType)
      }

      if (!geoJson.properties) geoJson.properties = {}
      geoJson.properties.name = `Nouvel objet`
      
      if (targetLayerConfig) {
          geoJson.properties._layerId = targetLayerConfig.id;
          setActiveLayers(prev => prev.map(l => l.id === targetLayerConfig?.id ? { ...l, count: l.count + 1 } : l))
      }

      setFeatures(prev => [...prev, geoJson as ExtendedFeature])
    })

    setMap(mapInstance)

    return () => {
      mapInstance.remove()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- RENDER LOOP ---
  useEffect(() => {
    if (!map || !featureGroupRef.current) return

    featureGroupRef.current.clearLayers()
    layersMapRef.current.clear()

    features.forEach(feature => {
      const geoType = feature.geometry.type
      let layerConfig: LayerConfig | undefined
      
      const layerId = feature.properties._layerId || 
        (geoType.includes('Polygon') ? activeLayers.find(l => l.type === 'Polygon')?.id :
         geoType.includes('LineString') ? activeLayers.find(l => l.type === 'LineString')?.id :
         geoType.includes('Point') ? activeLayers.find(l => l.type === 'Point')?.id : null)

      if (layerId) {
          layerConfig = activeLayers.find(l => l.id === layerId)
      }

      // Respecter la visibilité de la couche
      if (!layerConfig || !layerConfig.visible) return

      const layer = L.geoJSON(feature, {
        pointToLayer: (feature, latlng) => {
          return L.circleMarker(latlng, {
            radius: 8,
            fillColor: layerConfig?.style.fillColor,
            color: layerConfig?.style.color,
            weight: layerConfig?.style.weight,
            opacity: layerConfig?.style.opacity,
            fillOpacity: layerConfig?.style.fillOpacity
          })
        },
        style: {
          fillColor: layerConfig.style.fillColor,
          color: layerConfig.style.color,
          weight: layerConfig.style.weight,
          opacity: layerConfig.style.opacity,
          fillOpacity: layerConfig.style.fillOpacity
        }
      })

      layer.eachLayer((l) => {
        if (feature.id) layersMapRef.current.set(feature.id, l)

        // --- NOUVEAU: Hover & Étiquetage ---
        // Construction du contenu de l'info-bulle
        const tooltipContent = `
            <div class="font-semibold text-sm">${feature.properties[layerConfig.labelProperty || "id"] || 'Sans nom'}</div>
            <div class="text-xs text-muted-foreground">ID: ${feature.id}</div>
        `;
        
        // On attache toujours le tooltip
        l.bindTooltip(tooltipContent, {
            // Si showLabels est activé, le tooltip est permanent
            // Sinon, c'est le comportement par défaut (au survol)
            permanent: layerConfig?.showLabels || false,
            direction: layerConfig?.showLabels ? 'center' : 'auto',
            className: layerConfig?.showLabels ? 'bg-card border-none shadow-none text-foreground font-bold text-shadow' : 'bg-none shadow px-2 py-1 rounded border',
            opacity: layerConfig?.showLabels ? 1 : 0.9
        });

        // Gestion de la sélection
        l.on('click', () => {
          setSelectedFeatureId(feature.id)
          setAttributeTableLayerId(layerId as string || 'all')
          // Ouvrir le panneau latéral si fermé pour voir les infos
          if (!isSidebarOpen) setIsSidebarOpen(true);
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          L.DomEvent.stopPropagation
        })
        
        // Style de sélection
        if (feature.id === selectedFeatureId) {
            if (l instanceof L.Path) {
                l.setStyle({ color: '#fbbf24', weight: (layerConfig?.style.weight || 2) + 3, dashArray: '5, 5' }) 
                if(l instanceof L.CircleMarker) l.setStyle({ fillColor: '#fbbf24', radius: 10 })
            }
        }
        featureGroupRef.current?.addLayer(l)
      })
    })
    

  }, [features, activeLayers, selectedFeatureId, map, isSidebarOpen])

  // --- DRAW CONTROL ---
  useEffect(() => {
    if (!map || !featureGroupRef.current) return

    if (drawControlRef.current) {
      map.removeControl(drawControlRef.current)
      drawControlRef.current = null
    }

    if (editMode === 'None') return

    const drawOptions: L.Control.DrawConstructorOptions = {
      edit: { featureGroup: featureGroupRef.current, remove: true, edit: false },
      draw: {
        polygon: editMode === 'Polygon' ? { allowIntersection: false, showArea: true } : false,
        rectangle: editMode === 'Polygon' ? { showArea: true } : false,
        polyline: editMode === 'LineString' ? { metric: true } : false,
        marker: editMode === 'Point' ? { repeatMode: true } : false,
        circle: false, circlemarker: false
      }
    }

    const newDrawControl = new L.Control.Draw(drawOptions)
    map.addControl(newDrawControl)
    drawControlRef.current = newDrawControl
  }, [editMode, map])

  // --- FONCTIONS METIER ---

   // --- NOUVEAU: Met à jour la config (ex: propriété d'étiquette) ---
  const updateLayerConfig = (layerId: string, updates: Partial<LayerConfig>) => {
      setActiveLayers(prev => prev.map(l => l.id === layerId ? { ...l, ...updates } : l));
  };

  const handleZoomToLayer = (layerId: string) => {
      if (!map) return;
      
      const layerFeatures = features.filter(f => f.properties._layerId === layerId);

      if (layerFeatures.length === 0) {
          showToast("Aucun objet dans cette couche.", "default");
          return;
      }

      const tempGroup = L.featureGroup();
      layerFeatures.forEach(f => L.geoJSON(f).addTo(tempGroup));
      
      try {
        const bounds = tempGroup.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
      } catch (e) {
          console.error("Erreur zoom:", e);
      }
  };

  // NOUVEAU: Toggle visibilité
  const handleToggleLayerVisibility = (layerId: string) => {
      setActiveLayers(prev => prev.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l));
  };

  // NOUVEAU: Toggle étiquettes
  const handleToggleLayerLabels = (layerId: string) => {
      setActiveLayers(prev => prev.map(l => l.id === layerId ? { ...l, showLabels: !l.showLabels } : l));
  };

  const handlePrepareSaveLayer = (layerId: string) => {
      setLayerToSaveId(layerId);
      setIsSaveLayerDialogOpen(true);
  };

  const handleConfirmSaveLayer = async (name: string, description: string) => {
      if (!layerToSaveId) return;
      
      const layerConfig = activeLayers.find(l => l.id === layerToSaveId);
      if (!layerConfig) return;

      const layerFeatures = features.filter(f => f.properties._layerId === layerToSaveId);

      if (layerFeatures.length === 0) {
          showToast("La couche est vide, impossible de sauvegarder.", "destructive");
          return;
      }

      const featureCollection = { type: 'FeatureCollection', features: layerFeatures };
      const blob = new Blob([JSON.stringify(featureCollection)], { type: "application/geo+json" });
      const file = new File([blob], `${name.replace(/\s+/g, '_')}.geojson`, { type: "application/geo+json" });

      try {
          const uploadRes = await startUpload([file]);
          if (!uploadRes || uploadRes.length === 0) throw new Error("Échec upload");
          
          const uploadedFile = uploadRes[0];
          
          const getMultiType = (type: GeometryMode): "MultiPoint" | "MultiLineString" | "MultiPolygon" => {
            switch (type) {
              case 'Point': return "MultiPoint" as const;
              case 'LineString': return "MultiLineString" as const;
              case 'Polygon': return "MultiPolygon" as const;
              default: return "MultiPolygon" as const; 
            }
          };
          let mainGeometry: GeoJSON.Geometry;
          if (layerFeatures.length === 1) {
            mainGeometry = layerFeatures[0].geometry;
          } else {
            const multiType = getMultiType(layerConfig.type);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let coordinates: any;
            switch (layerConfig.type) {
              case 'Point':
                coordinates = layerFeatures.map(f => (f.geometry as GeoJSON.Point).coordinates);
                break;
              case 'LineString':
                coordinates = layerFeatures.map(f => (f.geometry as GeoJSON.LineString).coordinates);
                break;
              case 'Polygon':
                coordinates = layerFeatures.map(f => (f.geometry as GeoJSON.Polygon).coordinates);
                break;
              default:
                coordinates = layerFeatures.map(f => (f.geometry as GeoJSON.Point).coordinates);
                break;
            }
            mainGeometry = { type: multiType, coordinates } as GeoJSON.Geometry;
          }

          const result = await createStudyAreaFromLayer({
              name,
              description,
              fileId: uploadedFile.serverData.fileId,
              geometry: mainGeometry
          });

          if (result.success) {
              showToast("Couche sauvegardée en base de données !", "success");
              setIsSaveLayerDialogOpen(false);
              setActiveLayers(prev => prev.map(l => l.id === layerToSaveId ? { ...l, isDatabaseBound: true, name: name } : l));
          } else {
              throw new Error(result.error);
          }

      } catch (e) {
          showToast(`Erreur sauvegarde: ${(e as Error).message}`, "destructive");
      }
  };

  const handleImportLayer = async (area: ImportableStudyArea) => {
      try {
          const res = await kyInstance.get(area.url).json<L.GeoJSON>();
          if (!res) throw new Error("Impossible de télécharger le GeoJSON");
          const geoJson = res;
          // @ts-expect-error - An 
          const newFeatures = (geoJson.features || [geoJson]).map((f: GeoJSON.Feature, i: number) => ({
              ...f,
              id: `imp-${area.id}-${i}`,
              properties: { ...f.properties, _layerId: area.id } 
          })).filter((f:ExtendedFeature)=>!!f.geometry);

          setFeatures(prev => [...prev, ...newFeatures]);

          let geoMode: GeometryMode = 'Polygon';
          if (area.type.includes('LINESTRING')) geoMode = 'LineString';
          else if (area.type.includes('POINT')) geoMode = 'Point';

          const newLayerConfig = {
              id: area.id,
              name: area.name,
              type: geoMode,
              visible: true,
              showLabels: false,
              count: newFeatures.length,
              style: { ...DEFAULT_STYLES[geoMode] },
              isDatabaseBound: true
          };

          setActiveLayers(prev => [...prev, newLayerConfig]);
          
          showToast(`Couche "${area.name}" importée.`, "success");
          setIsLayerDialogOpen(false);
          setAttributeTableLayerId(area.id);
          setTimeout(() => handleZoomToLayer(area.id), 500);

      } catch (e) {
        console.log(e);
        
          showToast("Erreur lors de l'import", "destructive");
      }
  };

  // --- ACTIONS UI STANDARD ---
  const handleStartEditing = () => {
    if (targetLayer === 'new') {
      setEditMode(newLayerType)
      let targetLayerConfig = activeLayers.find(l => l.type === newLayerType && !l.isDatabaseBound)

      if (!targetLayerConfig) {
        const newTempLayerId = `layer-${Date.now()}`
        targetLayerConfig = {
            id: newTempLayerId,
            name: `Couche temporaire ${newLayerType}`,
            type: newLayerType,
            visible: true,
            showLabels: false,
            count: 0,
            style: { ...DEFAULT_STYLES[newLayerType] },
            isDatabaseBound: false
        }
        setActiveLayers(prev => [...prev, targetLayerConfig as LayerConfig])
      }
      setTargetLayer(targetLayerConfig.id)
    } else {
      const layer = activeLayers.find(l => l.id === targetLayer)
      if (layer) setEditMode(layer.type)
    }
    setIsLayerDialogOpen(false)
    showToast(`Mode édition activé : ${editMode === 'None' ? newLayerType : 'Couche existante'}`, 'default')
  }

  const handleStopEditing = () => setEditMode('None')

  const handleRowClick = (id: string | number) => {
    setSelectedFeatureId(id)
    const layer = layersMapRef.current.get(id)
    if (layer && map) {
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
            map.flyTo(layer.getLatLng(), 16)
            layer.openPopup()
        } else if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
            map.flyToBounds(layer.getBounds(), { padding: [100, 100], maxZoom: 16 })
        }
    }
  }

  const updateFeatureProperty = (id: string | number, key: string, value: string) => {
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, properties: { ...f.properties, [key]: value } } : f))
  }
  const deleteFeatureProperty = (key: string) => {
    if(!confirm(`Supprimer la colonne ${key} ?`)) return
    setFeatures(prev => prev.map(f => { const p={...f.properties}; delete p[key]; return {...f, properties: p} }))
  }
  const addFeatureProperty = () => {
    const key = prompt("Nom colonne :")
    if (key) setFeatures(prev => prev.map(f => ({ ...f, properties: { ...f.properties, [key]: '' } })))
  }
  const updateLayerStyle = (layerId: string, newStyle: Partial<LayerStyle>) => {
    setActiveLayers(prev => prev.map(l => l.id === layerId ? { ...l, style: { ...l.style, ...newStyle } } : l))
  }
  const deleteFeature = (id: string | number) => {
      if(confirm('Supprimer ?')) { 
        const featureToDelete = features.find(f => f.id === id);
        if (featureToDelete && featureToDelete.properties._layerId) {
            setActiveLayers(prev => prev.map(l => l.id === featureToDelete.properties._layerId ? { ...l, count: l.count - 1 } : l))
        }
        setFeatures(prev => prev.filter(f => f.id !== id)); 
        setSelectedFeatureId(null); 
      }
  }

  const prepareFormData = (formData: FormData) => {
    const geoJsonCollection = { type: 'FeatureCollection', features: features }
    formData.set('geojson', JSON.stringify(geoJsonCollection))
    formData.set('name', studyAreaName)
    formData.set('description', studyAreaDescription)
  }

  useEffect(() => { if (state.message) showToast(state.message, state.success ? 'success' : 'destructive') }, [state])
  
  const allPropertyKeys = useMemo(() => {
    const keys = new Set<string>()
    const filteredFeatures = attributeTableLayerId === 'all' 
        ? features 
        : features.filter(f => f.properties._layerId === attributeTableLayerId);

    filteredFeatures.forEach(f => Object.keys(f.properties).forEach(k => { 
        if(k !== '_layerId' && k !== 'name') keys.add(k) 
    }))
    return ['name', ...Array.from(keys).sort()] 
  }, [features, attributeTableLayerId]) 

  const featuresToList = useMemo(() => {
    if (attributeTableLayerId === 'all') return features.filter(f => f.properties._layerId) 
    return features.filter(f => f.properties._layerId === attributeTableLayerId)
  }, [features, attributeTableLayerId])

  // Feature sélectionnée complète pour le Sidebar
  const selectedFeature = useMemo(() => 
    features.find(f => f.id === selectedFeatureId), 
  [features, selectedFeatureId])

  return (
    <div className='flex flex-col relative h-[calc(100dvh-64px)] bg-slate-50 dark:bg-slate-950'>
      
      {/* --- DIALOGUES --- */}
      <LayerManagerDialog 
        open={isLayerDialogOpen}
        onOpenChange={setIsLayerDialogOpen}
        activeLayers={activeLayers}
        targetLayer={targetLayer}
        setTargetLayer={setTargetLayer}
        newLayerType={newLayerType}
        setNewLayerType={setNewLayerType}
        editingStyleLayerId={editingStyleLayerId}
        setEditingStyleLayerId={setEditingStyleLayerId}
        updateLayerStyle={updateLayerStyle}
        updateLayerConfig={updateLayerConfig} 
        onStartEditing={handleStartEditing}
        onZoomToLayer={handleZoomToLayer}
        onSaveLayerDb={handlePrepareSaveLayer}
        availableDBLayers={availableDBLayers}
        features={features} 
        onImportLayer={handleImportLayer}
        isLoadingDBLayers={isLoadingDBLayers}
      />

      <SaveLayerDialog 
        open={isSaveLayerDialogOpen}
        onOpenChange={setIsSaveLayerDialogOpen}
        layerName={activeLayers.find(l => l.id === layerToSaveId)?.name || ''}
        onConfirm={handleConfirmSaveLayer}
        isUploading={isUploading}
      />

      <AttributeTableDialog 
        open={isAttributeTableOpen}
        onOpenChange={setIsAttributeTableOpen}
        features={featuresToList}
        selectedFeatureId={selectedFeatureId}
        setSelectedFeatureId={setSelectedFeatureId}
        onRowClick={handleRowClick}
        onUpdateProperty={updateFeatureProperty}
        onAddProperty={addFeatureProperty}
        onDeleteProperty={deleteFeatureProperty}
        onDeleteFeature={deleteFeature}
        allPropertyKeys={allPropertyKeys}
        activeLayers={activeLayers}
        selectedLayerId={attributeTableLayerId}
        onLayerSelect={setAttributeTableLayerId}
      />

      {/* --- HEADER --- */}
      <header className='flex-none border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between shadow-sm z-30 max-md:flex-wrap gap-3'>
        <div className='flex items-center gap-3'>
          <h1 className='font-bold text-lg flex items-center gap-2'>
            <MapIcon className='w-5 h-5 text-blue-600' />
            {studyAreaName}
          </h1>
          {editMode !== 'None' && (
            <div className='flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold animate-pulse'>
              <PenTool className='w-3 h-3' />
              Édition : {editMode}
            </div>
          )}
        </div>
        <div className='flex items-center gap-2 w-full justify-end'>
            <Button variant="outline" size="sm" onClick={() => setIsAttributeTableOpen(true)} className="hidden md:flex">
                <Maximize2 className="w-4 h-4 mr-2" /> Table Attributaire
            </Button>
          {editMode === 'None' ? (
            <Button
              variant='outline'
              className='border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
              onClick={() => setIsLayerDialogOpen(true)}
            >
              <PenTool className='w-4 h-4 mr-2' />
              Éditer Couches
            </Button>
          ) : (
            <Button variant='destructive' onClick={handleStopEditing}>
              <CheckCircle2 className='w-4 h-4 mr-2' />
              Terminer
            </Button>
          )}

          <Button
            variant={isSidebarOpen ? 'secondary' : 'default'}
            size='icon'
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Settings2 className='w-5 h-5' />
          </Button>
        </div>
      </header>

      {/* --- CONTENT --- */}
      <div className='flex-1 flex relative overflow-hidden'>
        <div className='flex-1 relative bg-slate-200'>
          <div ref={mapContainerRef} className='absolute inset-0 z-0' />
        </div>

        <MapSidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          studyAreaId={studyArea.id}
          studyAreaName={studyAreaName}
          setStudyAreaName={setStudyAreaName}
          studyAreaDescription={studyAreaDescription}
          setStudyAreaDescription={setStudyAreaDescription}
          features={features}
          activeLayers={activeLayers}
          onOpenLayerDialog={() => setIsLayerDialogOpen(true)}
          onEditLayerStyle={(id) => { setTargetLayer(id); setIsLayerDialogOpen(true); setEditingStyleLayerId(id); }}
          formAction={formAction}
          prepareFormData={prepareFormData}
          selectedFeature={selectedFeature}
          onZoomToLayer={handleZoomToLayer}
          onToggleLayerVisibility={handleToggleLayerVisibility}
          onToggleLayerLabels={handleToggleLayerLabels}
        />
      </div>
    </div>
  )
}