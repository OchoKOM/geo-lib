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
import { Palette, Tag, Focus, CloudUpload, Database, DownloadCloud } from 'lucide-react'
import { GeometryMode, LayerConfig, LayerStyle, ImportableStudyArea, ExtendedFeature } from './map-types'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  updateLayerConfig: (layerId: string, updates: Partial<LayerConfig>) => void // Nouveau prop
  features: ExtendedFeature[] // Pour extraire les colonnes disponibles
  onStartEditing: () => void
  onZoomToLayer: (layerId: string) => void
  onImportFromDatabase: (area: ImportableStudyArea) => Promise<void>
  availableStudyAreas: ImportableStudyArea[]
}

export default function LayerManagerDialog({
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
  onImportFromDatabase,
  availableStudyAreas
}: LayerManagerDialogProps) {

  // Extraire les propriétés uniques pour la couche en cours d'édition
  const availableProperties = useMemo(() => {
    if (!editingStyleLayerId) return [];
    
    // On prend les features qui appartiennent à cette couche
    const layerFeatures = features.filter(f => {
        const type = f.geometry.type;
        const layer = activeLayers.find(l => l.id === editingStyleLayerId);
        if (!layer) return false;
        
        // Match le type de feature avec le type de layer
        if (layer.properties?._layerId) {
             return f.properties._layerId === layer.id;
        }
        
        // Fallback sur le type géométrique si pas d'ID explicite
        if (f.properties._layerId === layer.id) return true;
        
        // Si features n'ont pas encore d'ID de layer associé (compatibilité), on filtre par type
        if (!f.properties._layerId) {
            if (layer.type === 'Polygon') return type.includes('Polygon');
            if (layer.type === 'LineString') return type.includes('LineString');
            if (layer.type === 'Point') return type.includes('Point');
        }
        return false;
    });

    const keys = new Set<string>();
    layerFeatures.forEach(f => {
        Object.keys(f.properties || {}).forEach(k => {
            if (k !== '_layerId' && k !== '_leaflet_id') keys.add(k);
        });
    });
    return Array.from(keys).sort();
  }, [editingStyleLayerId, features, activeLayers]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden'>
        <DialogHeader className='p-6 pb-0'>
          <DialogTitle>Gestionnaire de Couches</DialogTitle>
          <DialogDescription>
            Configurez vos couches de données et leurs styles d'affichage.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-hidden flex flex-col md:flex-row'>
          {/* Liste des couches à gauche */}
          <div className='w-full md:w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900/50'>
            <div className='p-4 border-b'>
                <h3 className='text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2'>
                    <Database className='w-3 h-3' /> Couches Actives
                </h3>
            </div>
            <ScrollArea className='flex-1'>
                <div className='p-2 space-y-1'>
                    {activeLayers.map(layer => (
                        <div 
                            key={layer.id}
                            onClick={() => setEditingStyleLayerId(layer.id)}
                            className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${
                                editingStyleLayerId === layer.id 
                                ? 'bg-white shadow-sm border-primary/50' 
                                : 'hover:bg-white border-transparent'
                            }`}
                        >
                            <div className='flex items-center gap-3 overflow-hidden'>
                                <div 
                                    className='w-3 h-3 rounded-full border border-white shadow-sm flex-none' 
                                    style={{ backgroundColor: layer.style.color }}
                                />
                                <div className='flex flex-col truncate'>
                                    <span className='text-sm font-medium truncate'>{layer.name}</span>
                                    <span className='text-[10px] text-muted-foreground uppercase tracking-wider'>{layer.type} • {layer.count} objets</span>
                                </div>
                            </div>
                            <Button 
                                variant='ghost' 
                                size='icon' 
                                className='opacity-0 group-hover:opacity-100 h-6 w-6'
                                onClick={(e) => { e.stopPropagation(); onZoomToLayer(layer.id); }}
                            >
                                <Focus className='w-3 h-3' />
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>
          </div>

          {/* Éditeur de style à droite */}
          <div className='flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-y-auto'>
             {!editingStyleLayerId ? (
                 <div className='flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground'>
                     <Palette className='w-12 h-12 mb-4 opacity-20' />
                     <p className='text-sm'>Sélectionnez une couche à gauche pour modifier son style ou ses options d'étiquetage.</p>
                 </div>
             ) : (
                 <div className='flex-1 flex flex-col'>
                     {(() => {
                        const layer = activeLayers.find(l => l.id === editingStyleLayerId);
                        if (!layer) return null;
                        return (
                            <div className='p-6 space-y-8'>
                                <div className='flex items-center gap-2 pb-4 border-b'>
                                    <Palette className='w-4 h-4 text-primary' />
                                    <h3 className='font-semibold'>Propriétés : {layer.name}</h3>
                                </div>

                                <div className='space-y-6'>
                                    {/* Section Étiquettes */}
                                    <div className='space-y-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border'>
                                        <div className='flex items-center gap-2 mb-1'>
                                            <Tag className='w-4 h-4 text-blue-500' />
                                            <Label className='text-xs font-bold uppercase text-slate-500'>Étiquetage</Label>
                                        </div>
                                        
                                        <div className='space-y-2'>
                                            <Label className='text-xs'>Champ à afficher comme étiquette</Label>
                                            <Select 
                                                value={layer.labelProperty || 'none_hidden'} 
                                                onValueChange={(val) => updateLayerConfig(layer.id, { labelProperty: val })}
                                            >
                                                <SelectTrigger className="h-9 bg-white dark:bg-slate-950">
                                                    <SelectValue placeholder="Choisir une colonne..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none_hidden">-- Par défaut (Nom/ID) --</SelectItem>
                                                    {availableProperties.map(prop => (
                                                        <SelectItem key={prop} value={prop}>{prop}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className='text-[10px] text-muted-foreground'>
                                                Sélectionnez la colonne de données à afficher au survol ou sur la carte.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Section Couleurs */}
                                    <div>
                                        <Label className='text-xs font-bold uppercase text-slate-500 mb-4 block'>Apparence</Label>
                                        <div className='grid grid-cols-2 gap-6'>
                                            <div className='space-y-3'>
                                                <Label className='text-xs'>Couleur de trait</Label>
                                                <div className='flex items-center gap-2'>
                                                    <input 
                                                        type="color" 
                                                        value={layer.style.color}
                                                        onChange={(e) => updateLayerStyle(layer.id, { color: e.target.value })}
                                                        className="w-10 h-10 rounded cursor-pointer border p-0.5"
                                                    />
                                                    <span className='text-xs font-mono bg-slate-100 px-2 py-1 rounded'>{layer.style.color}</span>
                                                </div>
                                            </div>
                                            <div className='space-y-3'>
                                                <Label className='text-xs flex justify-between'>Épaisseur {layer.style.weight}px</Label>
                                                <Slider 
                                                    min={1} max={10} step={1}
                                                    value={[layer.style.weight]}
                                                    onValueChange={([v]) => updateLayerStyle(layer.id, { weight: v })}
                                                />
                                            </div>
                                        </div>

                                        {layer.type === 'Polygon' && (
                                            <div className='mt-4 pt-4 border-t border-dashed'>
                                                <div className='space-y-3'>
                                                    <Label className='text-xs'>Couleur de remplissage</Label>
                                                    <div className='flex items-center gap-2'>
                                                        <input 
                                                            type="color" 
                                                            value={layer.style.fillColor}
                                                            onChange={(e) => updateLayerStyle(layer.id, { fillColor: e.target.value })}
                                                            className="w-10 h-10 rounded cursor-pointer border p-0.5"
                                                        />
                                                        <span className='text-xs font-mono bg-slate-100 px-2 py-1 rounded'>{layer.style.fillColor}</span>
                                                    </div>
                                                </div>
                                                <div className='space-y-3 mt-4'>
                                                    <Label className='text-xs flex justify-between'>Opacité {Math.round(layer.style.fillOpacity * 100)}%</Label>
                                                    <Slider 
                                                        min={0} max={1} step={0.1}
                                                        value={[layer.style.fillOpacity]}
                                                        onValueChange={([v]) => updateLayerStyle(layer.id, { fillOpacity: v })}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                     })()}
                 </div>
             )}
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-slate-50 dark:bg-slate-900">
          <Button variant='outline' onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}