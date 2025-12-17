import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { BookIcon, Layers, Settings2, X, Save, Loader2 } from 'lucide-react'
import { ExtendedFeature, LayerConfig } from './map-types'
import { useFormStatus } from 'react-dom'

// Sous-composant pour le bouton de soumission
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
  prepareFormData
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

        <Tabs defaultValue='info' className='flex-1 flex flex-col h-full'>
          <div className='px-4 pt-4'>
            <TabsList className='w-full grid grid-cols-2'>
              <TabsTrigger value='layers'>
                <Layers className='w-4 h-4 mr-2' />
                Couches
              </TabsTrigger>
              <TabsTrigger value='info'>
                <BookIcon className='w-4 h-4 mr-2' />
                Projet
              </TabsTrigger>
            </TabsList>
          </div>

          <div className='flex-1 overflow-y-auto p-4 h-full'>
            {/* ONGLET COUCHES SIMPLE */}
            <TabsContent value='layers' className='space-y-4 m-0'>
              {activeLayers.map(layer => (
                <div
                  key={layer.id}
                  className='flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded border'
                >
                  <div className='flex items-center gap-2'>
                    <div
                      className='w-3 h-3 rounded-full border shadow-sm'
                      style={{
                        backgroundColor: layer.style.fillColor,
                        borderColor: layer.style.color
                      }}
                    />
                    <span className='text-sm font-medium'>{layer.name}</span>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => onEditLayerStyle(layer.id)}
                  >
                    <Settings2 className='w-4 h-4 text-slate-400' />
                  </Button>
                </div>
              ))}
              <Button
                type='button'
                variant='outline'
                className='w-full mt-4'
                onClick={onOpenLayerDialog}
              >
                Gérer les couches
              </Button>
            </TabsContent>
            {/* ONGLET INFO */}
            <TabsContent value='info' className='space-y-4 m-0'>
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
              <div className='mt-4 p-4 bg-muted/50 rounded-lg border'>
                <h3 className='text-sm font-semibold mb-2'>Stats Rapides</h3>
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
            </TabsContent>
          </div>
          <div className='p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 mt-auto'>
            <SubmitButton />
          </div>
        </Tabs>
      </form>
    </div>
  )
}