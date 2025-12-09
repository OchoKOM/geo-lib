'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { updateStudyArea } from '../actions'
import { 
  Save, Layers, Book, TableProperties, AlertCircle, ArrowLeft, 
  Plus, Trash2, Map as MapIcon, Loader2, Settings2, X, MousePointer2, 
  PenTool, Hexagon, Eye, List, MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { showToast } from '@/hooks/useToast'
import { generateReactHelpers } from "@uploadthing/react"

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import { GeoJsonObject } from 'geojson'
import { Prisma } from '@prisma/client'
import { useUploadThing } from '@/lib/uploadthing'

if (typeof window !== 'undefined') {
  require('leaflet-draw')
}

// --- TYPES ---
interface LayerItem {
  id: number
  type: string
  name: string
}

interface EditMapClientProps {
  studyArea: Partial<Prisma.StudyAreaGetPayload<{
    include: {
        geojsonFile: true;
    }
  }>>
  initialGeoJson: GeoJsonObject | GeoJsonObject[] | null
  initialBooks: []
}

export default function EditMapClient({ studyArea, initialGeoJson, initialBooks }: EditMapClientProps) {
  // --- REFERENCES & STATES ---
  const [map, setMap] = useState<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)
  const drawControlRef = useRef<L.Control.Draw | null>(null)
  
  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isGeometryDialogOpen, setIsGeometryDialogOpen] = useState(false)
  const [isAttributeDialogOpen, setIsAttributeDialogOpen] = useState(false)
  const [selectedGeometryType, setSelectedGeometryType] = useState<string>("polygon")
  const [isUploading, setIsUploading] = useState(false)

  // Data Logic States
  const [layerList, setLayerList] = useState<LayerItem[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState<number | null>(null)
  
  // Attributs TEMPORAIRES (pour l'édition de la couche sélectionnée)
  const [currentProperties, setCurrentProperties] = useState<Record<string, string>>({})

  // Server Action
  const [state, formAction] = useActionState(updateStudyArea, { success: false, message: '' })

  // UploadThing
  const { startUpload } = useUploadThing("geoJsonUploader", {
    onClientUploadComplete: (res) => {
      if (res && res.length > 0) {
        const serverData = res[0].serverData
        
        setIsUploading(false)
        showToast("Carte mise à jour avec succès !", "success")
      }
    },
    onUploadError: (error: Error) => {
      setIsUploading(false)
      showToast(`Erreur upload: ${error.message}`, "destructive")
    },
  });

  // --- HELPERS GESTION DES COUCHES ---

  // Rafraîchir la liste des couches affichée dans la sidebar
  const refreshLayerList = () => {
    if (!featureGroupRef.current) return
    const list: LayerItem[] = []
    
    featureGroupRef.current.eachLayer((layer) => {
      // Tenter de trouver un nom ou un ID
      const props = layer.feature?.properties || {}
      const name = props.name || props.nom || props.id || `Entité #${layer._leaflet_id}`
      
      // Déterminer le type
      let type = "Inconnu"
      if (layer instanceof L.Polygon) type = "Polygone"
      else if (layer instanceof L.Polyline) type = "Ligne"
      else if (layer instanceof L.Marker) type = "Point"

      list.push({
        id: layer._leaflet_id,
        type,
        name
      })
    })
    setLayerList(list)
  }

  // Sélectionner une couche (depuis la carte ou la liste)
  const selectLayer = (leafletId: number) => {
    if (!featureGroupRef.current) return
    
    const layer = featureGroupRef.current.getLayer(leafletId)
    if (layer) {
      setSelectedLayerId(leafletId)
      
      // Charger les propriétés existantes de cette couche dans le state d'édition
      const existingProps = layer.feature?.properties || {}
      
      // Convertir en string pour les inputs
      const stringProps: Record<string, string> = {}
      Object.entries(existingProps).forEach(([k, v]) => {
        stringProps[k] = String(v)
      })
      setCurrentProperties(stringProps)

      // Feedback visuel sur la carte (Focus)
      if (layer.setStyle) {
        // Reset styles others (si on voulait faire complexe), ici on se contente d'ouvrir le panneau
        // Optionnel : Zoomer dessus ou changer la couleur de bordure temporairement
      }
      
      // Ouvrir la sidebar sur l'onglet attributs si elle est fermée
      if (!isSidebarOpen) setIsSidebarOpen(true)
    }
  }

  // Mettre à jour les propriétés de la couche sélectionnée (LIVE)
  const updateSelectedLayerProperties = (newProps: Record<string, string>) => {
    if (!featureGroupRef.current || selectedLayerId === null) return
    
    const layer = featureGroupRef.current.getLayer(selectedLayerId)
    if (layer) {
      // On s'assure que la structure feature.properties existe
      if (!layer.feature) layer.feature = { type: 'Feature', properties: {} }
      layer.feature.properties = { ...newProps }
      
      // Mise à jour du state local
      setCurrentProperties(newProps)
      
      // Si le nom a changé, rafraichir la liste
      refreshLayerList()
    }
  }

  // --- INITIALISATION CARTE ---
  useEffect(() => {
    if (!mapContainerRef.current || map) return

    const mapInstance = L.map(mapContainerRef.current).setView([
      studyArea.centerLat || -4.4419, 
      studyArea.centerLng || 15.2663
    ], 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM'
    }).addTo(mapInstance)

    const drawnItems = new L.FeatureGroup()
    mapInstance.addLayer(drawnItems)
    featureGroupRef.current = drawnItems

    // Chargement GeoJSON Initial
    if (initialGeoJson) {
      const layer = L.geoJSON(initialGeoJson, {
        onEachFeature: (feature, l) => {
          // IMPORTANT: Attacher l'event click pour la sélection
          l.on('click', (e) => {
            L.DomEvent.stopPropagation(e) // Empêcher la map de recevoir le click
            selectLayer(e.target._leaflet_id)
          })
        }
      })
      layer.eachLayer((l) => drawnItems.addLayer(l))
      if (layer.getBounds().isValid()) mapInstance.fitBounds(layer.getBounds())
    }
    
    // Initialiser la liste
    refreshLayerList()

    // Events DRAW (Création / Edition / Suppression)
    mapInstance.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer
      // Initialiser feature et propriétés vides pour les nouvelles formes
      if (!layer.feature) {
        layer.feature = { type: 'Feature', properties: {} }
      }
      
      // Attacher le click handler
      layer.on('click', (evt: L.DomEvent.PropagableEvent) => {
        L.DomEvent.stopPropagation(evt)
        selectLayer(evt.target._leaflet_id)
      })

      drawnItems.addLayer(layer)
      refreshLayerList()
      // Sélectionner automatiquement la nouvelle forme
      selectLayer(layer._leaflet_id)
    })

    mapInstance.on(L.Draw.Event.EDITED, () => refreshLayerList())
    mapInstance.on(L.Draw.Event.DELETED, () => {
      setSelectedLayerId(null)
      refreshLayerList()
    })

    // Click sur le fond de carte = Désélectionner
    mapInstance.on('click', () => {
      setSelectedLayerId(null)
      setCurrentProperties({})
    })

    setMap(mapInstance)

    return () => {
      mapInstance.remove()
    }
  }, [])

  // --- OUTILS D'ÉDITION ---
  const startDrawing = () => {
    if (!map || !featureGroupRef.current) return
    if (drawControlRef.current) map.removeControl(drawControlRef.current)

    const drawConfig = {
      edit: { featureGroup: featureGroupRef.current, remove: true },
      draw: {
        polygon: false, polyline: false, rectangle: false, 
        circle: false, marker: false, circlemarker: false
      }
    }
    
    switch (selectedGeometryType) {
      case 'polygon':
      case 'multipolygon':
        drawConfig.draw.polygon = { allowIntersection: false }
        drawConfig.draw.rectangle = true
        break
      case 'line':
      case 'multiline':
        drawConfig.draw.polyline = true
        break
      case 'point':
      case 'multipoint':
        drawConfig.draw.marker = true
        break
    }

    const drawControl = new L.Control.Draw(drawConfig)
    map.addControl(drawControl)
    drawControlRef.current = drawControl
    setIsGeometryDialogOpen(false)
    showToast(`Mode édition activé : ${selectedGeometryType}`)
  }

  // --- SAUVEGARDE ---
  const handleSaveProcess = async (formData: FormData) => {
    if (!featureGroupRef.current) return
    setIsUploading(true)

    // Conversion en GeoJSON (les properties sont déjà stockées dans chaque layer)
    const rawGeoJson = featureGroupRef.current.toGeoJSON()
    const geoJsonString = JSON.stringify(rawGeoJson)
    
    formData.set('geojson', geoJsonString)

    try {
      const blob = new Blob([geoJsonString], { type: "application/geo+json" })
      const file = new File([blob], `map_${studyArea.id}_${Date.now()}.geojson`, { type: "application/geo+json" })

      const res = await startUpload([file])
      if (!res || res.length === 0) throw new Error("Échec de l'upload")

      const uploadedFile = res[0]
      const serverData = uploadedFile.serverData

      formData.set('uploadedFileUrl', uploadedFile.url)
      formData.set('uploadedFileId', serverData.fileId)
      
      formAction(formData)

    } catch (err) {
      console.error(err)
      showToast("Erreur lors de la sauvegarde", "destructive")
      setIsUploading(false)
    }
  }

  // Helpers UI Table Attributaire
  const handlePropChange = (key: string, value: string) => {
    const newProps = { ...currentProperties, [key]: value }
    updateSelectedLayerProperties(newProps)
  }

  const addProperty = () => {
    if (selectedLayerId === null) {
      showToast("Veuillez d'abord sélectionner une couche sur la carte", "destructive")
      return
    }
    const key = prompt("Nom de la nouvelle colonne :")
    if (key) {
      handlePropChange(key, "")
    }
  }

  const removeProperty = (key: string) => {
    const newProps = { ...currentProperties }
    delete newProps[key]
    updateSelectedLayerProperties(newProps)
  }

  // --- RENDER ---
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {/* HEADER */}
      <header className="h-16 flex-none border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-blue-600" />
              {studyArea.name}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            onClick={() => setIsGeometryDialogOpen(true)}
          >
            <PenTool className="w-4 h-4 mr-2" />
            Mode Édition
          </Button>

          <Button 
            variant={isSidebarOpen ? "secondary" : "default"}
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Settings2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* MAP */}
        <div className="flex-1 relative bg-slate-200 z-0">
           <div ref={mapContainerRef} className="absolute inset-0" />
           
           {/* Floating Info if needed */}
           <div className="absolute bottom-4 left-4 z-[500] bg-white/90 p-2 rounded text-xs shadow">
              {layerList.length} élément(s) • {selectedLayerId ? "1 sélectionné" : "Aucune sélection"}
           </div>
        </div>

        {/* SIDEBAR */}
        <div 
          className={`
            absolute top-0 right-0 bottom-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 
            shadow-2xl z-20 transition-transform duration-300 ease-in-out w-96 flex flex-col
            ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-slate-500">Inspecteur</h2>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <form action={handleSaveProcess} className="p-4 space-y-6 h-full flex flex-col">
              <input type="hidden" name="id" value={studyArea.id} />
              
              <Tabs defaultValue="layers" className="w-full">
                <TabsList className="w-full grid grid-cols-3 mb-4">
                  <TabsTrigger value="layers"><Layers className="w-4 h-4 mr-1"/> Couches</TabsTrigger>
                  <TabsTrigger value="attributes"><TableProperties className="w-4 h-4 mr-1"/> Données</TabsTrigger>
                  <TabsTrigger value="info"><Settings2 className="w-4 h-4 mr-1"/> Projet</TabsTrigger>
                </TabsList>

                {/* TAB 1: LISTE DES COUCHES (Visualisation) */}
                <TabsContent value="layers" className="space-y-4">
                  <div className="text-sm font-medium text-slate-500 mb-2">Entités Géographiques ({layerList.length})</div>
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {layerList.length === 0 ? (
                      <p className="text-xs text-slate-400 italic p-4 text-center border border-dashed rounded">
                        Aucune géométrie dessinée.
                      </p>
                    ) : (
                      layerList.map((layer) => (
                        <div 
                          key={layer.id}
                          onClick={() => selectLayer(layer.id)}
                          className={`
                            flex items-center justify-between p-2 rounded border cursor-pointer text-sm transition-colors
                            ${selectedLayerId === layer.id 
                              ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                              : 'bg-white border-slate-100 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700'
                            }
                          `}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {layer.type === 'Polygone' && <Hexagon className="w-3 h-3 text-green-500" />}
                            {layer.type === 'Ligne' && <PenTool className="w-3 h-3 text-orange-500" />}
                            {layer.type === 'Point' && <MousePointer2 className="w-3 h-3 text-red-500" />}
                            <span className="truncate font-medium">{layer.name}</span>
                          </div>
                          {selectedLayerId === layer.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* TAB 2: TABLE ATTRIBUTAIRE (Contextuelle) */}
                <TabsContent value="attributes" className="space-y-4">
                  {selectedLayerId === null ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500 border border-dashed rounded-lg bg-slate-50">
                      <MousePointer2 className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">Sélectionnez une entité sur la carte ou dans la liste pour voir ses données.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase text-slate-500">
                          Attributs de la sélection
                        </h3>
                        <div className="flex gap-1">
                          <Button type="button" size="sm" variant="ghost" onClick={() => setIsAttributeDialogOpen(true)}>
                            <List className="w-4 h-4" />
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={addProperty}>
                            <Plus className="w-3 h-3 mr-1" /> Champ
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {Object.entries(currentProperties).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                             <Label className="w-1/3 truncate text-xs" title={key}>{key}</Label>
                             <Input 
                               value={value} 
                               onChange={(e) => handlePropChange(key, e.target.value)}
                               className="h-7 text-xs flex-1"
                             />
                             <button type="button" onClick={() => removeProperty(key)} className="text-slate-400 hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                             </button>
                          </div>
                        ))}
                        {Object.keys(currentProperties).length === 0 && (
                          <p className="text-xs text-slate-400 italic">Aucun attribut défini.</p>
                        )}
                      </div>

                      <Button 
                        type="button" 
                        variant="secondary" 
                        size="sm" 
                        className="w-full mt-4"
                        onClick={() => setIsAttributeDialogOpen(true)}
                      >
                        <TableProperties className="w-4 h-4 mr-2" />
                        Ouvrir la Table Complète
                      </Button>
                    </>
                  )}
                </TabsContent>

                {/* TAB 3: PROJET (Nom & Description) */}
                <TabsContent value="info" className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nom du projet</label>
                    <Input name="name" defaultValue={studyArea.name} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea name="description" defaultValue={studyArea.description || ''} rows={4} />
                  </div>
                  
                  {/* Liste des livres (Lecture seule) */}
                  <div className="pt-4 border-t">
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Sources liées</h4>
                    <div className="space-y-1">
                        {initialBooks.map(b => (
                            <div key={b.id} className="text-xs p-2 border rounded bg-slate-50 flex items-center gap-2">
                                <Book className="w-3 h-3 text-slate-400" />
                                <span className="truncate">{b.title}</span>
                            </div>
                        ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="pt-4 mt-auto border-t">
                <Button type="submit" disabled={isUploading} className="w-full">
                  {isUploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sauvegarde en cours...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Enregistrer Tout</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* DIALOG 1 : CHOIX GÉOMÉTRIE */}
      <Dialog open={isGeometryDialogOpen} onOpenChange={setIsGeometryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Outil de Dessin</DialogTitle>
            <DialogDescription>Choisissez le type de forme à ajouter.</DialogDescription>
          </DialogHeader>
          <RadioGroup value={selectedGeometryType} onValueChange={setSelectedGeometryType} className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 text-xs font-bold text-slate-500 uppercase">Zones</div>
            <div>
              <RadioGroupItem value="polygon" id="poly" className="peer sr-only" />
              <Label htmlFor="poly" className="flex flex-col items-center justify-between rounded-md border-2 border-slate-100 bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 cursor-pointer">
                <Hexagon className="mb-2 h-6 w-6 text-slate-600" /> Polygone
              </Label>
            </div>
            <div>
              <RadioGroupItem value="multipolygon" id="mpoly" className="peer sr-only" />
              <Label htmlFor="mpoly" className="flex flex-col items-center justify-between rounded-md border-2 border-slate-100 bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 cursor-pointer">
                <div className="flex mb-2"><Hexagon className="h-6 w-6"/><Hexagon className="h-4 w-4 -ml-2 mt-2"/></div> Multi-Poly
              </Label>
            </div>
            <div className="col-span-2 text-xs font-bold text-slate-500 uppercase mt-2">Tracés & Points</div>
            <div>
              <RadioGroupItem value="line" id="line" className="peer sr-only" />
              <Label htmlFor="line" className="flex flex-col items-center justify-between rounded-md border-2 border-slate-100 bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 cursor-pointer">
                <PenTool className="mb-2 h-6 w-6 text-slate-600" /> Ligne
              </Label>
            </div>
            <div>
              <RadioGroupItem value="point" id="point" className="peer sr-only" />
              <Label htmlFor="point" className="flex flex-col items-center justify-between rounded-md border-2 border-slate-100 bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 cursor-pointer">
                <MousePointer2 className="mb-2 h-6 w-6 text-slate-600" /> Point
              </Label>
            </div>
          </RadioGroup>
          <DialogFooter>
            <Button onClick={startDrawing}>Activer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2 : TABLE ATTRIBUTAIRE LARGE */}
      <Dialog open={isAttributeDialogOpen} onOpenChange={setIsAttributeDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TableProperties className="w-5 h-5 text-blue-600" />
              Table Attributaire
            </DialogTitle>
            <DialogDescription>
              Données pour l&apos;entité : {layerList.find(l => l.id === selectedLayerId)?.name || 'Sélection'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Champ (Clé)</TableHead>
                  <TableHead>Valeur</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(currentProperties).map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium bg-slate-50">{key}</TableCell>
                    <TableCell>
                      <Input 
                        value={value} 
                        onChange={(e) => handlePropChange(key, e.target.value)}
                        className="border-none shadow-none focus-visible:ring-0 h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => removeProperty(key)}>
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {Object.keys(currentProperties).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-slate-500">
                      Aucune donnée associée à cette couche.
                      <Button variant="link" onClick={addProperty}>Ajouter un champ</Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <DialogFooter className="sm:justify-between">
             <Button variant="outline" onClick={addProperty}><Plus className="w-4 h-4 mr-2"/> Ajouter Champ</Button>
             <Button onClick={() => setIsAttributeDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}