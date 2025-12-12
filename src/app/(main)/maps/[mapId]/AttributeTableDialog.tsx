import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Edit, Save, X, RotateCcw } from 'lucide-react'
import { ExtendedFeature, LayerConfig } from './map-types'
import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface AttributeTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  features: ExtendedFeature[]
  selectedFeatureId: string | number | null
  setSelectedFeatureId: (id: string | number | null) => void
  onRowClick: (id: string | number) => void
  onUpdateProperty: (
    id: string | number,
    key: string,
    value: string
  ) => void
  onAddProperty: () => void
  onDeleteProperty: (key: string) => void
  onDeleteFeature: (id: string | number) => void
  allPropertyKeys: string[]
  // Nouveaux Props
  activeLayers: LayerConfig[]
  selectedLayerId: string | 'all'
  onLayerSelect: (layerId: string | 'all') => void
}

export default function AttributeTableDialog({
  open,
  onOpenChange,
  features,
  selectedFeatureId,
  setSelectedFeatureId,
  onRowClick,
  onUpdateProperty,
  onAddProperty,
  onDeleteProperty,
  onDeleteFeature,
  allPropertyKeys,
  activeLayers,
  selectedLayerId,
  onLayerSelect
}: AttributeTableDialogProps) {
  const [editingCell, setEditingCell] = useState<{
    featureId: string | number
    key: string
    originalValue: string
  } | null>(null)
  
  const [currentEditValue, setCurrentEditValue] = useState('')

  // Créer une liste de colonnes ordonnée et nettoyer
  const columns = useMemo(() => {
    // Exclure les clés internes de Leaflet/GeoJSON
    return allPropertyKeys.filter(key => !['_leaflet_id', '_layerId'].includes(key))
  }, [allPropertyKeys])

  const handleEdit = (
    featureId: string | number,
    key: string,
    value: string
  ) => {
    setEditingCell({ featureId, key, originalValue: value })
    setCurrentEditValue(value)
  }

  const handleSave = () => {
    if (editingCell) {
      onUpdateProperty(
        editingCell.featureId,
        editingCell.key,
        currentEditValue
      )
      setEditingCell(null)
    }
  }

  const handleCancel = () => {
    setEditingCell(null)
  }

  // Obtenir la configuration de la couche actuelle pour le titre
  const currentLayerConfig = useMemo(() => {
      return activeLayers.find(l => l.id === selectedLayerId)
  }, [activeLayers, selectedLayerId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-6xl w-full h-[90vh] flex flex-col p-0'>
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="text-xl">
              Table Attributaire
          </DialogTitle>
          <div className="flex items-center gap-4 pt-2">
            {/* SÉLECTEUR DE COUCHE */}
            <div className="flex items-center gap-2">
                <Label htmlFor="layer-select" className="text-sm font-normal">Afficher la couche :</Label>
                <Select
                    value={selectedLayerId as string}
                    onValueChange={(val) => {
                        onLayerSelect(val);
                        setSelectedFeatureId(null); // Réinitialiser la sélection d'objet
                    }}
                >
                    <SelectTrigger id="layer-select" className="w-[280px]">
                        <SelectValue placeholder="Sélectionnez une couche" />
                    </SelectTrigger>
                    <SelectContent>
                        {/* Option pour toutes les couches si nécessaire, mais on privilégie le filtre */}
                        {/* <SelectItem value="all">Toutes les couches ({features.length} objets)</SelectItem> */}
                        {activeLayers.map(layer => (
                            <SelectItem key={layer.id} value={layer.id}>
                                {layer.name} ({layer.count} objets - {layer.type})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            <span className="text-sm text-muted-foreground ml-4">
                {features.length} objet(s) affiché(s) {currentLayerConfig && `pour la couche "${currentLayerConfig.name}"`}.
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 flex flex-col">
          <div className="flex-none flex justify-between items-center pb-4">
            <h3 className="font-semibold text-base">
                Propriétés de : {currentLayerConfig ? currentLayerConfig.name : "Sélectionnez une couche"}
            </h3>
            <Button size="sm" onClick={onAddProperty} disabled={!currentLayerConfig}>
              <Plus className="w-4 h-4 mr-2" /> Ajouter Colonne
            </Button>
          </div>

          <div className="flex-1 overflow-auto border rounded-lg">
            <Table className='relative'>
              <TableHeader className='sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-sm'>
                <TableRow>
                  <TableHead className="w-[50px] sticky left-0 z-20 bg-white dark:bg-slate-900">ID</TableHead>
                  {columns.map(key => (
                    <TableHead key={key} className="min-w-[150px]">
                      <div className='flex items-center justify-between'>
                        <span className="font-bold">{key}</span>
                        {key !== 'name' && ( // Empêcher la suppression de 'name'
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => onDeleteProperty(key)}>
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        )}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-[100px] text-center sticky right-0 z-20 bg-white dark:bg-slate-900">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.map(feature => (
                  <TableRow
                    key={feature.id}
                    className={`cursor-pointer transition-colors ${selectedFeatureId === feature.id ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    onClick={() => onRowClick(feature.id)}
                  >
                    <TableCell className="font-medium sticky left-0 z-5 bg-inherit">{feature.id}</TableCell>
                    {columns.map(key => {
                      const value = feature.properties[key] ? String(feature.properties[key]) : ''
                      const isEditing = editingCell?.featureId === feature.id && editingCell.key === key

                      return (
                        <TableCell key={key}>
                          {isEditing ? (
                            <div className='flex items-center gap-1'>
                              <Input
                                value={currentEditValue}
                                onChange={(e) => setCurrentEditValue(e.target.value)}
                                onKeyDown={(e) => { if(e.key === 'Enter') handleSave() }}
                                autoFocus
                                className="h-8 text-sm p-1"
                              />
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" onClick={handleSave} title="Sauvegarder">
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={handleCancel} title="Annuler">
                                <RotateCcw className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center min-h-[32px] group">
                                <span className='text-sm truncate pr-2'>{value}</span>
                                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleEdit(feature.id, key, value)}>
                                    <Edit className="w-3 h-3" />
                                </Button>
                            </div>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center sticky right-0 z-5 bg-inherit">
                      <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => onDeleteFeature(feature.id)} title="Supprimer l'objet">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {features.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={columns.length + 2} className="text-center text-muted-foreground h-20">
                            Aucun objet trouvé dans cette couche.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}