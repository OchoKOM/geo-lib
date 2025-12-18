import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { BookIcon, Layers, Settings2, X, Save, Loader2, Eye, EyeOff, Tag, Focus } from 'lucide-react'
import { ExtendedFeature, LayerConfig } from './map-types'
import { useFormStatus } from 'react-dom'
import { ScrollArea } from '@/components/ui/scroll-area'

function SubmitButton() {
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

interface MapSidebarProps {
  isOpen: boolean
  onClose: () => void
  studyAreaId: string
  studyAreaName: string
  setStudyAreaName: (val: string) => void
  studyAreaDescription: string
  setStudyAreaDescription: (val: string) => void
  features: ExtendedFeature[]
  activeLayers: LayerConfig[]
  onOpenLayerDialog: () => void
  onEditLayerStyle: (layerId: string) => void
  formAction: (payload: FormData) => void
  prepareFormData: (formData: FormData) => void
  // Nouveaux props pour les fonctionnalités
  selectedFeature?: ExtendedFeature
  onZoomToLayer: (id: string) => void
  onToggleLayerVisibility: (id: string) => void
  onToggleLayerLabels: (id: string) => void
}

export default function MapSidebar({
  isOpen,
  onClose,
  studyAreaId,
  studyAreaName,
  setStudyAreaName,
  studyAreaDescription,
  setStudyAreaDescription,
  features,
  activeLayers,
  onOpenLayerDialog,
  onEditLayerStyle,
  formAction,
  prepareFormData,
  selectedFeature,
  onZoomToLayer,
  onToggleLayerVisibility,
  onToggleLayerLabels
}: MapSidebarProps) {
  return (
    <div
      className={`
            absolute top-0 right-0 bottom-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 
            shadow-2xl z-20 transition-transform duration-300 ease-in-out w-96 flex flex-col max-w-full max-h-full overflow-hidden
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          `}
    >
      <div className='flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800'>
        <h2 className='font-semibold text-sm uppercase tracking-wide text-slate-500'>Inspecteur</h2>
        <Button variant='ghost' size='sm' className='h-6 w-6 p-0' onClick={onClose}>
          <X className='w-4 h-4' />
        </Button>
      </div>

      <form
        action={formData => {
          prepareFormData(formData)
          formAction(formData)
        }}
        className='flex-1 flex flex-col overflow-hidden'
      >
        <input type='hidden' name='id' value={studyAreaId} />

        <Tabs defaultValue={selectedFeature ? 'info' : 'layers'} className='flex-1 flex flex-col h-full'>
          <div className='px-4 pt-4'>
            <TabsList className='w-full grid grid-cols-2'>
              <TabsTrigger value='layers'>
                <Layers className='w-4 h-4 mr-2' />
                Couches
              </TabsTrigger>
              <TabsTrigger value='info'>
                <BookIcon className='w-4 h-4 mr-2' />
                Projet & Infos
              </TabsTrigger>
            </TabsList>
          </div>

          <div className='flex-1 overflow-hidden h-full flex flex-col'>
            {/* ONGLET COUCHES AMÉLIORÉ */}
            <TabsContent value='layers' className='flex-1 m-0 overflow-hidden flex flex-col'>
              <ScrollArea className='flex-1 p-4'>
                <div className="space-y-3">
                    {activeLayers.map(layer => (
                        <div
                        key={layer.id}
                        className='flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded border group'
                        >
                            {/* En-tête de la couche */}
                            <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-2 overflow-hidden'>
                                    <div
                                        className='w-3 h-3 rounded-full border shadow-sm flex-none'
                                        style={{
                                            backgroundColor: layer.style.fillColor,
                                            borderColor: layer.style.color
                                        }}
                                    />
                                    <span className={`text-sm font-medium truncate ${!layer.visible ? 'text-muted-foreground line-through' : ''}`}>
                                        {layer.name}
                                    </span>
                                </div>
                                <Button
                                    type='button'
                                    variant='ghost'
                                    size='sm'
                                    className="h-6 w-6"
                                    onClick={() => onEditLayerStyle(layer.id)}
                                    title="Propriétés"
                                >
                                    <Settings2 className='w-3.5 h-3.5 text-slate-400' />
                                </Button>
                            </div>

                            {/* Barre d'outils de la couche */}
                            <div className="flex items-center justify-between border-t pt-2 mt-1">
                                <div className="flex items-center gap-1">
                                    <Button
                                        type='button'
                                        variant="ghost"
                                        size="icon"
                                        className={`h-7 w-7 ${layer.visible ? 'text-slate-600' : 'text-slate-400'}`}
                                        onClick={() => onToggleLayerVisibility(layer.id)}
                                        title={layer.visible ? "Masquer la couche" : "Afficher la couche"}
                                    >
                                        {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                    </Button>

                                    <Button
                                        type='button'
                                        variant="ghost"
                                        size="icon"
                                        className={`h-7 w-7 ${layer.showLabels ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}
                                        onClick={() => onToggleLayerLabels(layer.id)}
                                        title={layer.showLabels ? "Masquer les étiquettes" : "Afficher les étiquettes"}
                                    >
                                        <Tag className="w-3.5 h-3.5" />
                                    </Button>
                                    
                                    <Button
                                        type='button'
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-slate-600 hover:text-blue-600"
                                        onClick={() => onZoomToLayer(layer.id)}
                                        title="Zoomer sur la couche"
                                    >
                                        <Focus className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                                <span className="text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                                    {layer.count} objets
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t bg-slate-50 dark:bg-slate-900">
                <Button
                    type='button'
                    variant='outline'
                    className='w-full'
                    onClick={onOpenLayerDialog}
                >
                    Gérer toutes les couches
                </Button>
              </div>
            </TabsContent>

            {/* ONGLET INFO + DÉTAILS SÉLECTION */}
            <TabsContent value='info' className='flex-1 m-0 overflow-auto flex flex-col relative'>
              <ScrollArea className='flex-1 p-4'>
                <div className='space-y-6'>
                    {/* SECTION SÉLECTION */}
                    {selectedFeature ? (
                        <div className="border rounded-lg overflow-hidden bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900">
                            <div className="bg-blue-100/50 dark:bg-blue-900/30 px-3 py-2 border-b border-blue-200 dark:border-blue-800 flex justify-between items-center">
                                <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                    <Focus className="w-3.5 h-3.5" />
                                    Objet Sélectionné
                                </h3>
                                <span className="text-[10px] font-mono bg-white dark:bg-slate-900 px-1 rounded border opacity-70">
                                    ID: {selectedFeature.id}
                                </span>
                            </div>
                            <div className="p-3 space-y-2">
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase text-muted-foreground font-semibold">Nom</span>
                                        <span className="font-medium">{selectedFeature.properties.name as string || "Sans nom"}</span>
                                    </div>
                                    {Object.entries(selectedFeature.properties)
                                        .filter(([key]) => key !== 'name' && key !== '_layerId' && key !== '_leaflet_id')
                                        .map(([key, value]) => (
                                            <div key={key} className="flex flex-col border-t border-blue-200/50 dark:border-blue-800/50 pt-1 mt-1">
                                                <span className="text-[10px] uppercase text-muted-foreground font-semibold">{key}</span>
                                                <span className="break-words text-slate-700 dark:text-slate-300">
                                                    {String(value)}
                                                </span>
                                            </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground italic text-center p-4 border border-dashed rounded bg-slate-50">
                            Sélectionnez un objet sur la carte pour voir ses détails ici.
                        </div>
                    )}

                    {/* SECTION PROJET */}
                    <div className='space-y-4 pt-4 border-t'>
                        <h3 className="font-semibold text-sm">Paramètres du Projet</h3>
                        <div className='space-y-2'>
                            <Label>Nom de la Zone</Label>
                            <Input
                              value={studyAreaName}
                              onChange={e => setStudyAreaName(e.target.value)}
                              required
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>Description</Label>
                            <Textarea
                            value={studyAreaDescription}
                            onChange={e => setStudyAreaDescription(e.target.value)}
                            rows={4}
                            />
                        </div>
                    </div>

                    <div className='p-4 bg-muted/50 rounded-lg border'>
                        <h3 className='text-sm font-semibold mb-2'>Stats Globales</h3>
                        <div className='grid grid-cols-2 gap-2 text-xs'>
                        <div>Objets totaux: {features.length}</div>
                        <div>
                            Polygones: {features.filter(f => f.geometry.type.includes('Polygon')).length}
                        </div>
                        <div>
                            Lignes: {features.filter(f => f.geometry.type.includes('LineString')).length}
                        </div>
                        <div>
                            Points: {features.filter(f => f.geometry.type.includes('Point')).length}
                        </div>
                        </div>
                    </div>
                </div>
              </ScrollArea>
              
              <div className='p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 mt-auto sticky bottom-0'>
                <SubmitButton />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </form>
    </div>
  )
}