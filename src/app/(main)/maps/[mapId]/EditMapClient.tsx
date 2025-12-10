'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { updateStudyArea } from '../actions'
import {
  Save,
  Layers,
  BookIcon,
  TableProperties,
  Plus,
  Trash2,
  MapIcon,
  Loader2,
  PenTool,
  Settings2,
  X,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { showToast } from '@/hooks/useToast'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import { Book, StudyArea } from '@prisma/client'

// Import Leaflet Draw uniquement côté client
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('leaflet-draw')
}

// Type for simplified book objects used in EditMapClient
type SimplifiedBook = {
  id: string
  title: string
  type: Book['type'] // Using the BookType enum from Prisma
  authorName: string
  department: string | undefined
  year: number
}

function SubmitButton () {
  const { pending } = useFormStatus()
  return (
    <Button type='submit' disabled={pending} className='w-full '>
      {pending ? (
        <>
          <Loader2 className='w-4 h-4 mr-2 animate-spin' /> Sauvegarde...
        </>
      ) : (
        <>
          <Save className='w-4 h-4 mr-2' /> Enregistrer les modifications
        </>
      )}
    </Button>
  )
}

interface EditMapClientProps {
  studyArea: StudyArea
  initialGeoJson: GeoJSON.FeatureCollection | null
  initialBooks: SimplifiedBook[]
}

// Types pour la gestion SIG
type GeometryMode = 'Polygon' | 'LineString' | 'Point' | 'None'
interface LayerConfig {
  id: string
  name: string
  type: GeometryMode
  visible: boolean
  count: number
}

export default function EditMapClient ({
  studyArea,
  initialGeoJson,
  initialBooks
}: EditMapClientProps) {
  // --- STATES ---
  const [map, setMap] = useState<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)
  const drawControlRef = useRef<L.Control.Draw | null>(null)

  // UI States
  const [properties, setProperties] = useState<Record<string, string>>({})
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // NOUVEAUX ÉTATS pour garantir la transmission de Name/Description
  const [studyAreaName, setStudyAreaName] = useState(studyArea.name)
  const [studyAreaDescription, setStudyAreaDescription] = useState(
    studyArea.description || ''
  )

  // GIS Logic States
  const [isLayerDialogOpen, setIsLayerDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState<GeometryMode>('None')
  const [targetLayer, setTargetLayer] = useState<string>('new') // 'new' ou existing ID
  const [newLayerType, setNewLayerType] = useState<GeometryMode>('Polygon')
  const [activeLayers, setActiveLayers] = useState<LayerConfig[]>([])

  const [state, formAction] = useActionState(
    updateStudyArea.bind(null, studyArea.id),
    { success: false, message: '' }
  )

  // --- INITIALISATION CARTE ---
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

    function updateLayerCount (type: string, delta: number) {
      setActiveLayers(prev => {
        const exists = prev.find(l => l.type === type)
        if (exists) {
          return prev.map(l =>
            l.type === type ? { ...l, count: l.count + delta } : l
          )
        } else {
          // Création d'une nouvelle entrée dans la légende si elle n'existe pas
          const name =
            type === 'Polygon'
              ? 'Nouveaux Polygones'
              : type === 'LineString'
              ? 'Nouvelles Lignes'
              : 'Nouveaux Points'
          return [
            ...prev,
            {
              id: `new-${type.toLowerCase()}`,
              name,
              type: type as GeometryMode,
              visible: true,
              count: 1
            }
          ]
        }
      })
    }

    // Chargement du GeoJSON et analyse des "couches" virtuelles
    if (initialGeoJson) {
      const layerCounts: Record<string, number> = {
        Polygon: 0,
        LineString: 0,
        Point: 0
      }

      const layer = L.geoJSON(initialGeoJson, {
        onEachFeature: (feature, l) => {
          if (feature.properties) {
            const stringProps: Record<string, string> = {}
            Object.entries(feature.properties).forEach(([k, v]) => {
              stringProps[k] = String(v)
            })
            setProperties(prev => ({ ...prev, ...stringProps }))
          }

          // Compter les types pour le gestionnaire de couches
          const type = feature.geometry.type
          if (type === 'Polygon' || type === 'MultiPolygon')
            layerCounts.Polygon++
          if (type === 'LineString' || type === 'MultiLineString')
            layerCounts.LineString++
          if (type === 'Point' || type === 'MultiPoint') layerCounts.Point++
        },
        style: {
          color: '#3388ff'
        }
      })

      layer.eachLayer(l => {
        drawnItems.addLayer(l)
      })

      if (layer.getBounds().isValid()) {
        mapInstance.fitBounds(layer.getBounds())
      }

      // Initialiser la liste des couches basées sur ce qui existe
      const detectedLayers: LayerConfig[] = []
      if (layerCounts.Polygon > 0)
        detectedLayers.push({
          id: 'existing-poly',
          name: 'Polygones (Existants)',
          type: 'Polygon',
          visible: true,
          count: layerCounts.Polygon
        })
      if (layerCounts.LineString > 0)
        detectedLayers.push({
          id: 'existing-line',
          name: 'Lignes (Existantes)',
          type: 'LineString',
          visible: true,
          count: layerCounts.LineString
        })
      if (layerCounts.Point > 0)
        detectedLayers.push({
          id: 'existing-point',
          name: 'Points (Existants)',
          type: 'Point',
          visible: true,
          count: layerCounts.Point
        })

      setActiveLayers(detectedLayers)
    }

    // Event de création Leaflet Draw
    mapInstance.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
      const layer = e.layer
      drawnItems.addLayer(layer)

      // Mettre à jour les compteurs de couches
      // Note: Dans une vraie app SIG, on créerait un LayerGroup distinct
      const type =
        e.type === 'marker'
          ? 'Point'
          : e.type === 'polyline'
          ? 'LineString'
          : 'Polygon'
      updateLayerCount(type, 1)
    })

    /* mapInstance.on(L.Draw.Event.DELETED, e => {
      const layers = e.layer
      layers.eachLayer((layer: number | L.Layer) => {
        drawnItems.removeLayer(layer)
        // Mettre à jour les compteurs de couches
        const geoType = layer.toGeoJSON().geometry.type
        const type = geoType === 'Point' ? 'Point' : geoType === 'LineString' ? 'LineString' : 'Polygon'
        updateLayerCount(type, -1)
      })
    })*/

    setMap(mapInstance)

    return () => {
      mapInstance.remove()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- GESTION DU DRAW CONTROL DYNAMIQUE ---
  useEffect(() => {
    if (!map || !featureGroupRef.current) return

    // 1. Supprimer l'ancien contrôle s'il existe
    if (drawControlRef.current) {
      map.removeControl(drawControlRef.current)
      drawControlRef.current = null
    }

    // 2. Si on n'est pas en mode édition, on s'arrête là
    if (editMode === 'None') return

    // 3. Configurer les options de dessin selon le mode choisi (SIG-like)
    const drawOptions: L.Control.DrawConstructorOptions = {
      edit: {
        featureGroup: featureGroupRef.current,
        remove: true, // Toujours permettre la suppression en mode édition
        edit: {} // Toujours permettre la modif de sommets
      },
      draw: {
        polygon: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
        polyline: false
      }
    }

    if (!drawOptions.draw) drawOptions.draw = {}

    // Activer seulement l'outil pertinent
    if (editMode === 'Polygon') {
      drawOptions.draw.polygon = { allowIntersection: false, showArea: true }
      drawOptions.draw.rectangle = { showArea: true }
    } else if (editMode === 'LineString') {
      drawOptions.draw.polyline = {
        metric: true
      }
    } else if (editMode === 'Point') {
      drawOptions.draw.marker = {
        repeatMode: true
      }
    }

    // 4. Ajouter le nouveau contrôle
    const newDrawControl = new L.Control.Draw(drawOptions)
    map.addControl(newDrawControl)
    drawControlRef.current = newDrawControl
  }, [editMode, map]) // Se déclenche quand le mode change

  const handleStartEditing = () => {
    if (targetLayer === 'new') {
      setEditMode(newLayerType)
    } else {
      // Trouver le type de la couche existante sélectionnée
      const layer = activeLayers.find(l => l.id === targetLayer)
      if (layer) setEditMode(layer.type)
    }
    setIsLayerDialogOpen(false)
    showToast(
      `Mode édition activé : ${
        targetLayer === 'new' ? newLayerType : 'Couche existante'
      }`,
      'default'
    )
  }

  const handleStopEditing = () => {
    setEditMode('None')
  }

  // --- LOGIQUE FORMULAIRE & ATTRIBUTS ---
  const prepareFormData = (formData: FormData) => {
    if (!featureGroupRef.current) return
    const rawGeoJson = featureGroupRef.current.toGeoJSON()
    // @ts-expect-error Ajouter les propriétés aux features
    if (rawGeoJson.features) {
      // Assurez-vous que les propriétés sont incluses dans chaque feature si nécessaire
      // @ts-expect-error Ajouter les propriétés aux features
      rawGeoJson.features = rawGeoJson.features.map(f => ({
        ...f,
        properties: { ...properties }
      }))
    }

    // CORRECTION ICI : Ajout manuel des champs Name et Description
    // Cela garantit que même s'ils sont dans un onglet non-actif, ils sont envoyés.
    formData.set('geojson', JSON.stringify(rawGeoJson))
    formData.set('name', studyAreaName)
    formData.set('description', studyAreaDescription)
  }

  // Feedback Toast
  useEffect(() => {
    if (state.message) {
      showToast(state.message, state.success ? 'success' : 'destructive')
    }
  }, [state])

  const handlePropChange = (key: string, value: string) =>
    setProperties(prev => ({ ...prev, [key]: value }))
  const addProperty = () => {
    const key = prompt('Nom de la colonne :')
    if (key) setProperties(prev => ({ ...prev, [key]: '' }))
  }
  const removeProperty = (key: string) => {
    if (confirm(`Supprimer "${key}" ?`)) {
      const newProps = { ...properties }
      delete newProps[key]
      setProperties(newProps)
    }
  }

  return (
    <div className='flex flex-col relative h-[calc(100dvh-64px)] bg-slate-50 dark:bg-slate-950'>
      {/* DIALOGUE DE SELECTION DE COUCHE (SIG) */}
      <Dialog open={isLayerDialogOpen} onOpenChange={setIsLayerDialogOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Gestionnaire de Couches</DialogTitle>
            <DialogDescription>
              Sélectionnez la couche à modifier ou définissez un nouveau type de
              géométrie à ajouter.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-4'>
            <div className='space-y-2'>
              <Label>Action</Label>
              <RadioGroup
                value={targetLayer}
                onValueChange={setTargetLayer}
                className='flex flex-col space-y-1'
              >
                <div className='flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted-foreground/30'>
                  <RadioGroupItem value='new' id='r-new' />
                  <Label htmlFor='r-new' className='cursor-pointer font-medium'>
                    Créer une nouvelle couche
                  </Label>
                </div>
                {activeLayers.map(layer => (
                  <div
                    key={layer.id}
                    className='flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted-foreground/30'
                  >
                    <RadioGroupItem value={layer.id} id={`r-${layer.id}`} />
                    <Label
                      htmlFor={`r-${layer.id}`}
                      className='cursor-pointer flex items-center gap-2'
                    >
                      {layer.type === 'Polygon' && (
                        <Layers className='w-3 h-3 text-blue-500' />
                      )}
                      {layer.type === 'LineString' && (
                        <Layers className='w-3 h-3 text-green-500' />
                      )}
                      {layer.type === 'Point' && (
                        <Layers className='w-3 h-3 text-red-500' />
                      )}
                      Modifier {layer.name}{' '}
                      <span className='text-xs text-slate-400'>
                        ({layer.count} objets)
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {targetLayer === 'new' && (
              <div className='space-y-2 animate-in fade-in slide-in-from-top-2'>
                <Label>Type de géométrie</Label>
                <Select
                  value={newLayerType}
                  onValueChange={(v: GeometryMode) => setNewLayerType(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='Polygon'>
                      Polygone / Multipolygone (Zones)
                    </SelectItem>
                    <SelectItem value='LineString'>
                      Ligne / Multiligne (Routes, Rivières)
                    </SelectItem>
                    <SelectItem value='Point'>
                      Point / Multipoint (Sites)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsLayerDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleStartEditing}
              className='bg-blue-600 hover:bg-blue-700'
            >
              <PenTool className='w-4 h-4 mr-2' />
              Activer l&apos;édition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HEADER */}
      <header className='flex-none border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between shadow-sm z-30 max-md:flex-wrap gap-3'>
        <div className='flex items-center gap-3'>
          <h1 className='font-bold text-lg flex items-center gap-2'>
            <MapIcon className='w-5 h-5 text-blue-600' />
            {studyAreaName}
          </h1>
          {editMode !== 'None' && (
            <div className='flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold animate-pulse'>
              <PenTool className='w-3 h-3' />
              Édition :{' '}
              {editMode === 'Polygon'
                ? 'Polygones'
                : editMode === 'LineString'
                ? 'Lignes'
                : 'Points'}
            </div>
          )}
        </div>

        <div className='flex items-center gap-2 w-full justify-end'>
          {editMode === 'None' ? (
            <Button
              variant='outline'
              className='border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
              onClick={() => setIsLayerDialogOpen(true)}
            >
              <PenTool className='w-4 h-4 mr-2' />
              Mode Édition
            </Button>
          ) : (
            <Button variant='destructive' onClick={handleStopEditing}>
              <CheckCircle2 className='w-4 h-4 mr-2' />
              Terminer l&apos;édition
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

      {/* CONTENT */}
      <div className='flex-1 flex relative overflow-hidden'>
        {/* CARTE */}
        <div className='flex-1 relative bg-slate-200'>
          <div ref={mapContainerRef} className='absolute inset-0 z-0' />
        </div>

        {/* SIDEBAR */}
        <div
          className={`
            absolute top-0 right-0 bottom-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 
            shadow-2xl z-20 transition-transform duration-300 ease-in-out w-96 flex flex-col max-w-full max-h-full overflow-hidden
            ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          <div className='flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800'>
            <h2 className='font-semibold text-sm uppercase tracking-wide text-slate-500'>
              Inspecteur SIG
            </h2>
            <Button
              variant='ghost'
              size='sm'
              className='h-6 w-6 p-0'
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className='w-4 h-4' />
            </Button>
          </div>

          {/* Le formulaire n'a plus besoin des champs 'name' et 'description' comme enfants directs */}
          <form
            action={formData => {
              prepareFormData(formData)
              formAction(formData)
            }}
            className='flex-1 flex flex-col overflow-hidden'
          >
            <input type='hidden' name='id' value={studyArea.id} />

            <Tabs defaultValue='layers' className='flex-1 flex flex-col h-full'>
              <div className='px-4 pt-4'>
                <TabsList className='w-full grid grid-cols-3'>
                  <TabsTrigger value='layers'>
                    <Layers className='w-4 h-4 mr-2' />
                    Couches
                  </TabsTrigger>
                  <TabsTrigger value='attributes'>
                    <TableProperties className='w-4 h-4 mr-2' />
                    Données
                  </TabsTrigger>
                  <TabsTrigger value='info'>
                    <BookIcon className='w-4 h-4 mr-2' />
                    Infos
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className='flex-1 overflow-y-auto p-4 h-full'>
                {/* ONGLET 1 : COUCHES (Style SIG) */}
                <TabsContent value='layers' className='space-y-4 m-0 h-full'>
                  <div className='space-y-3'>
                    <p className='text-xs text-slate-500 font-medium uppercase mb-2'>
                      Structure de la carte
                    </p>

                    {activeLayers.length === 0 && (
                      <div className='text-center p-4 border border-dashed rounded text-sm text-slate-500'>
                        Aucune géométrie. Cliquez sur &quot;Mode Édition&quot;
                        pour commencer.
                      </div>
                    )}

                    {activeLayers.map(layer => (
                      <div
                        key={layer.id}
                        className='flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700'
                      >
                        <div className='flex items-center gap-3'>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-6 w-6 p-0 text-slate-400'
                          >
                            {layer.visible ? (
                              <Eye className='w-4 h-4' />
                            ) : (
                              <EyeOff className='w-4 h-4' />
                            )}
                          </Button>
                          <div className='flex flex-col'>
                            <span className='text-sm font-medium'>
                              {layer.name}
                            </span>
                            <span className='text-[10px] text-slate-500'>
                              {layer.count} objets • {layer.type}
                            </span>
                          </div>
                        </div>
                        {editMode === layer.type && (
                          <div
                            className='w-2 h-2 rounded-full bg-green-500 animate-pulse'
                            title='Couche active'
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {editMode !== 'None' && (
                    <div className='mt-6 p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800'>
                      <p className='font-semibold mb-1'>
                        Aide à l&apos;édition :
                      </p>
                      <ul className='list-disc pl-4 space-y-1'>
                        <li>
                          Utilisez la barre d&apos;outils sur la carte pour
                          dessiner.
                        </li>
                        <li>
                          Vous ne pouvez dessiner que des{' '}
                          <b>
                            {editMode === 'Polygon' ? 'Polygones' : editMode}
                          </b>{' '}
                          actuellement.
                        </li>
                        <li>
                          Cliquez sur &quot;Terminer l&apos;édition&quot; pour
                          changer de couche.
                        </li>
                      </ul>
                    </div>
                  )}
                </TabsContent>

                {/* ONGLET 2 : ATTRIBUTS */}
                <TabsContent value='attributes' className='space-y-4 m-0'>
                  <div className='flex items-center justify-between mb-2'>
                    <h3 className='text-sm font-semibold'>
                      Table Attributaire
                    </h3>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      onClick={addProperty}
                    >
                      <Plus className='w-3 h-3 mr-1' /> Colonne
                    </Button>
                  </div>
                  <div className='space-y-3'>
                    {Object.entries(properties).map(([key, value]) => (
                      <div
                        key={key}
                        className='space-y-1 p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700'
                      >
                        <div className='flex items-center justify-between'>
                          <label className='text-xs font-bold text-slate-600 uppercase'>
                            {key}
                          </label>
                          <button
                            type='button'
                            onClick={() => removeProperty(key)}
                            className='text-slate-400 hover:text-red-500'
                          >
                            <Trash2 className='w-3 h-3' />
                          </button>
                        </div>
                        {/* Note: Pas besoin de 'name' ici, c'est géré via l'état 'properties' */}
                        <Input
                          value={value}
                          onChange={e => handlePropChange(key, e.target.value)}
                          className='h-8 text-sm'
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* ONGLET 3 : INFOS GENERALES */}
                <TabsContent value='info' className='space-y-4 m-0'>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium'>
                      Nom de la Zone
                    </label>
                    {/* UTILISATION DE L'ÉTAT LOCAL (studyAreaName) */}
                    <Input
                      value={studyAreaName}
                      onChange={e => setStudyAreaName(e.target.value)}
                      required
                      // Retire l'attribut 'name' pour éviter la double lecture
                      // et forcer l'utilisation de l'état local dans prepareFormData
                    />
                  </div>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium'>Description</label>
                    {/* UTILISATION DE L'ÉTAT LOCAL (studyAreaDescription) */}
                    <Textarea
                      value={studyAreaDescription}
                      onChange={e => setStudyAreaDescription(e.target.value)}
                      rows={4}
                      // Retire l'attribut 'name'
                    />
                  </div>
                  <div className='mt-4'>
                    <h3 className='text-sm font-semibold mb-2'>
                      Livres associés
                    </h3>
                    {initialBooks.map(book => (
                      <div
                        key={book.id}
                        className='text-xs p-2 border mb-1 rounded'
                      >
                        {book.title}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </div>

              <div className='p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 mt-auto'>
                <SubmitButton />
              </div>
            </Tabs>
          </form>
        </div>
      </div>
    </div>
  )
}
