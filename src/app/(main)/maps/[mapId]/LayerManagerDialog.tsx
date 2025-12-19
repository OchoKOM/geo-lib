import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import {
  Palette,
  PenTool,
  Focus,
  CloudUpload,
  Database,
  DownloadCloud,
  TagIcon,
  Tag
} from 'lucide-react'
import {
  GeometryMode,
  LayerConfig,
  LayerStyle,
  ImportableStudyArea,
  ExtendedFeature
} from './map-types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMemo } from 'react'

interface LayerManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeLayers: LayerConfig[]
  targetLayer: string
  setTargetLayer: (val: string) => void
  newLayerType: GeometryMode
  setNewLayerType: (val: GeometryMode) => void
  editingStyleLayerId: string | null
  setEditingStyleLayerId: (id: string | null) => void
  updateLayerStyle: (layerId: string, newStyle: Partial<LayerStyle>) => void
  updateLayerConfig: (layerId: string, updates: Partial<LayerConfig>) => void
  features: ExtendedFeature[]
  onStartEditing: () => void
  onZoomToLayer: (layerId: string) => void
  onSaveLayerDb: (layerId: string) => void
  availableDBLayers: ImportableStudyArea[]
  onImportLayer: (area: ImportableStudyArea) => void
  isLoadingDBLayers: boolean
}

export default function LayerManagerDialog ({
  open,
  onOpenChange,
  activeLayers,
  targetLayer,
  setTargetLayer,
  newLayerType,
  setNewLayerType,
  editingStyleLayerId,
  setEditingStyleLayerId,
  updateLayerStyle,
  updateLayerConfig,
  features,
  onStartEditing,
  onZoomToLayer,
  onSaveLayerDb,
  availableDBLayers,
  onImportLayer,
  isLoadingDBLayers
}: LayerManagerDialogProps) {
  // Extraire les propriétés uniques pour la couche en cours d'édition
  const availableProperties = useMemo(() => {
    if (!editingStyleLayerId) return []

    // On prend les features qui appartiennent à cette couche
    const layerFeatures = features.filter(f => {
      const type = f.geometry?.type
      if (!type) return false
      const layer = activeLayers.find(l => l.id === editingStyleLayerId)
      if (!layer) return false

      // Fallback sur le type géométrique si pas d'ID explicite
      if (f.properties._layerId === layer.id) return true

      // Si features n'ont pas encore d'ID de layer associé (compatibilité), on filtre par type
      if (!f.properties._layerId) {
        if (layer.type === 'Polygon') return type.includes('Polygon')
        if (layer.type === 'LineString') return type.includes('LineString')
        if (layer.type === 'Point') return type.includes('Point')
      }
      return false
    })

    const keys = new Set<string>()
    layerFeatures.forEach(f => {
      Object.keys(f.properties || {}).forEach(k => {
        if (k !== '_layerId' && k !== '_leaflet_id') keys.add(k)
      })
    })
    return Array.from(keys).sort()
  }, [editingStyleLayerId, features, activeLayers])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[900px] h-[80vh] flex flex-col p-0 overflow-hidden'>
        <DialogHeader className='p-6 pb-2'>
          <DialogTitle>Gestionnaire de Couches & Styles</DialogTitle>
          <DialogDescription>
            Gérez la visibilité, les styles, les imports BDD et l&apos;édition.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 grid grid-cols-1 md:grid-cols-12 gap-0 overflow-auto h-full'>
          {/* Colonne Gauche : Liste des couches (4 cols) */}
          <div className='md:col-span-4 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col h-full overflow-auto'>
            <div className='p-4 border-b'>
              <Label className='text-xs font-semibold uppercase text-muted-foreground mb-2 block'>
                Couches Actives
              </Label>
              <RadioGroup
                value={targetLayer}
                onValueChange={val => {
                  setTargetLayer(val)
                  if (val !== 'new') setEditingStyleLayerId(val)
                }}
                className='flex flex-col space-y-2'
              >
                {activeLayers.map(layer => (
                  <div
                    key={layer.id}
                    className={`
                                group flex items-center justify-between border p-2 rounded-md transition-all cursor-pointer text-sm
                                ${
                                  targetLayer === layer.id
                                    ? 'bg-white shadow-sm border-blue-400 dark:bg-slate-800'
                                    : 'hover:bg-white dark:hover:bg-slate-800 border-transparent'
                                }
                            `}
                    onClick={() => {
                      setTargetLayer(layer.id)
                      setEditingStyleLayerId(layer.id)
                    }}
                  >
                    <div className='flex items-center space-x-2 overflow-hidden'>
                      <RadioGroupItem value={layer.id} id={`r-${layer.id}`} />
                      <div className='flex flex-col truncate'>
                        <span className='font-medium truncate'>
                          {layer.name}
                        </span>
                        <span className='text-[10px] text-muted-foreground flex items-center gap-1'>
                          {layer.type} • {layer.count} objets
                          {layer.isDatabaseBound && (
                            <Database className='w-3 h-3 text-blue-500' />
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Actions rapides au survol */}
                    <div className='flex items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6'
                        title='Zoomer sur la couche'
                        onClick={e => {
                          e.stopPropagation()
                          onZoomToLayer(layer.id)
                        }}
                      >
                        <Focus className='w-3 h-3' />
                      </Button>
                      {!layer.isDatabaseBound && (
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-6 w-6 text-blue-600'
                          title='Sauvegarder en BDD'
                          onClick={e => {
                            e.stopPropagation()
                            onSaveLayerDb(layer.id)
                          }}
                        >
                          <CloudUpload className='w-3 h-3' />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <div
                  className={`flex items-center space-x-2 border p-2 rounded-md transition-colors cursor-pointer text-sm mt-4
                            ${
                              targetLayer === 'new'
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'hover:bg-slate-100'
                            }
                        `}
                  onClick={() => setTargetLayer('new')}
                >
                  <RadioGroupItem value='new' id='r-new' />
                  <Label
                    htmlFor='r-new'
                    className='cursor-pointer flex-1 font-medium'
                  >
                    + Créer une couche
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Section Imports BDD */}
            <div className='flex-1 flex flex-col'>
              <div className='p-3 bg-slate-100 dark:bg-slate-950 border-b border-t font-semibold text-xs flex items-center gap-2'>
                <Database className='w-3 h-3' />
                Importer depuis la BDD
              </div>
              <ScrollArea className='flex-1 p-2 overflow-auto'>
                {isLoadingDBLayers ? (
                  <div className='text-xs text-center p-4 text-muted-foreground'>
                    Chargement...
                  </div>
                ) : availableDBLayers.length === 0 ? (
                  <div className='text-xs text-center p-4 text-muted-foreground'>
                    Aucune zone disponible.
                  </div>
                ) : (
                  <div className='space-y-2'>
                    {availableDBLayers.map(area => (
                      <div
                        key={area.id}
                        className='flex items-center justify-between p-2 border rounded bg-white dark:bg-slate-900 text-xs'
                      >
                        <div className='truncate pr-2'>
                          <div className='font-medium truncate'>
                            {area.name}
                          </div>
                          <div className='text-muted-foreground'>
                            {area.type}
                          </div>
                        </div>
                        <Button
                          size='icon'
                          variant='ghost'
                          className='h-6 w-6'
                          onClick={() => onImportLayer(area)}
                        >
                          <DownloadCloud className='w-3 h-3' />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Colonne Droite : Éditeur (8 cols) */}
          <div className='md:col-span-8 p-6 flex flex-col h-full overflow-y-auto'>
            {targetLayer === 'new' ? (
              <div className='flex flex-col items-center justify-center h-full space-y-6'>
                <div className='w-full max-w-sm p-6 border rounded-xl bg-slate-50 dark:bg-slate-900'>
                  <Label className='text-sm font-semibold mb-4 block'>
                    Configuration de la nouvelle couche
                  </Label>

                  <div className='space-y-4'>
                    <div className='space-y-2'>
                      <Label className='text-xs text-muted-foreground'>
                        Type de géométrie
                      </Label>
                      <Select
                        value={newLayerType}
                        onValueChange={(v: GeometryMode) => setNewLayerType(v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='Polygon'>
                            Polygone (Zones)
                          </SelectItem>
                          <SelectItem value='LineString'>
                            Ligne (Routes/Rivières)
                          </SelectItem>
                          <SelectItem value='Point'>
                            Point (Lieux d&apos;intérêt)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={onStartEditing}
                      className='w-full bg-blue-600 hover:bg-blue-700'
                    >
                      <PenTool className='w-4 h-4 mr-2' /> Commencer à dessiner
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className='space-y-6 h-full overflow-auto'>
                <Tabs defaultValue='style'>
                  <TabsList className=''>
                    <TabsTrigger value='style'>
                      <Palette className='w-3 h-3 text-slate-500' />
                      Style de la couche
                    </TabsTrigger>
                    <TabsTrigger value='label'>
                      <TagIcon className='w-3 h-3 text-slate-500' />
                      Etiquetage
                    </TabsTrigger>
                  </TabsList>

                  <div className='flex-1 overflow-hidden h-full flex flex-col gap-1'>
                    <TabsContent value='style'>
                      {/* Style Editor Content (Identique à avant, juste nettoyé) */}
                      {(() => {
                        const idToEdit = editingStyleLayerId || targetLayer
                        const layer = activeLayers.find(l => l.id === idToEdit)
                        if (!layer)
                          return (
                            <div className='space-y-6 p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border'>
                              <div className='flex items-center justify-between'>
                                <h3 className='font-semibold text-lg flex items-center gap-2'>
                                  <Palette className='w-5 h-5 text-slate-500' />
                                  Style de la couche
                                </h3>
                              </div>
                              <div>Selectionner d&apos;abord une couche</div>
                            </div>
                          )

                        return (
                          <div className='space-y-6 p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border'>
                            <div className='flex items-center justify-between'>
                              <h3 className='font-semibold text-lg flex items-center gap-2'>
                                <Palette className='w-5 h-5 text-slate-500' />
                                Style de la couche
                              </h3>
                            </div>
                            <div className='grid grid-cols-2 gap-8'>
                              <div>
                                <Label className='text-xs font-semibold uppercase text-muted-foreground mb-3 block'>
                                  Remplissage
                                </Label>
                                <div className='space-y-4'>
                                  <div className='flex items-center gap-3'>
                                    <input
                                      type='color'
                                      value={layer.style.fillColor}
                                      onChange={e =>
                                        updateLayerStyle(layer.id, {
                                          fillColor: e.target.value
                                        })
                                      }
                                      className='w-10 h-10 rounded cursor-pointer border-0 p-0'
                                    />
                                    <span className='text-xs font-mono'>
                                      {layer.style.fillColor}
                                    </span>
                                  </div>
                                  <div className='space-y-2'>
                                    <Label className='text-xs flex justify-between'>
                                      Opacité{' '}
                                      {Math.round(
                                        layer.style.fillOpacity * 100
                                      )}
                                      %
                                    </Label>
                                    <Slider
                                      min={0}
                                      max={1}
                                      step={0.05}
                                      value={[layer.style.fillOpacity]}
                                      onValueChange={([v]) =>
                                        updateLayerStyle(layer.id, {
                                          fillOpacity: v
                                        })
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                              <div>
                                <Label className='text-xs font-semibold uppercase text-muted-foreground mb-3 block'>
                                  Contour
                                </Label>
                                <div className='space-y-4'>
                                  <div className='flex items-center gap-3'>
                                    <input
                                      type='color'
                                      value={layer.style.color}
                                      onChange={e =>
                                        updateLayerStyle(layer.id, {
                                          color: e.target.value
                                        })
                                      }
                                      className='w-10 h-10 rounded cursor-pointer border-0 p-0'
                                    />
                                    <span className='text-xs font-mono'>
                                      {layer.style.color}
                                    </span>
                                  </div>
                                  <div className='space-y-2'>
                                    <Label className='text-xs flex justify-between'>
                                      Épaisseur {layer.style.weight}px
                                    </Label>
                                    <Slider
                                      min={1}
                                      max={10}
                                      step={1}
                                      value={[layer.style.weight]}
                                      onValueChange={([v]) =>
                                        updateLayerStyle(layer.id, {
                                          weight: v
                                        })
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </TabsContent>
                    <TabsContent value='label'>
                      {(() => {
                        const idToEdit = editingStyleLayerId || targetLayer
                        const layer = activeLayers.find(l => l.id === idToEdit)

                        if (!layer)
                          return (
                            <div className='space-y-6 p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border'>
                              Selectionner d&apos;abord une couche
                            </div>
                          )
                        {
                          /* Section Étiquettes */
                        }
                        return (
                          <div className='space-y-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border'>
                            <div className='flex items-center gap-2 mb-1'>
                              <Tag className='w-4 h-4 text-blue-500' />
                              <Label className='text-xs font-bold uppercase text-slate-500'>
                                Étiquetage
                              </Label>
                            </div>

                            <div className='space-y-2'>
                              <Label className='text-xs'>
                                Champ à afficher comme étiquette
                              </Label>
                              <Select
                                value={layer.labelProperty || 'none_hidden'}
                                onValueChange={val =>
                                  updateLayerConfig(layer.id, {
                                    labelProperty: val
                                  })
                                }
                              >
                                <SelectTrigger className='h-9 bg-white dark:bg-slate-950'>
                                  <SelectValue placeholder='Choisir une colonne...' />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value='none_hidden'>
                                    -- Par défaut (Nom/ID) --
                                  </SelectItem>
                                  {availableProperties.map(prop => (
                                    <SelectItem key={prop} value={prop}>
                                      {prop}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className='text-[10px] text-muted-foreground'>
                                Sélectionnez la colonne de données à afficher au
                                survol ou sur la carte.
                              </p>
                            </div>
                          </div>
                        )
                      })()}
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className='p-4 border-t bg-slate-50 dark:bg-slate-900'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          {(() => {
            const idToEdit = editingStyleLayerId || targetLayer
            const layer = activeLayers.find(l => l.id === idToEdit)
            if (!layer) return null
            return (
              <Button onClick={onStartEditing} variant='default' size='sm'>
                <PenTool className='w-4 h-4 mr-2' /> Éditer géométries
              </Button>
            )
          })()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
