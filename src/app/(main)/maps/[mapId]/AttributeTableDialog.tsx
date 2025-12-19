import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Edit, Save, X, RotateCcw, Ban } from 'lucide-react'
import { ExtendedFeature, LayerConfig } from './map-types'
import { useState, useMemo, useEffect } from 'react'
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

  // Gestion de la touche Echap pour fermer la modale
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onOpenChange])

  // --- NOUVEAU : Auto-scroll vers la sélection ---
  // On utilise un useEffect pour surveiller l'ouverture et l'ID sélectionné
  useEffect(() => {
    if (open && selectedFeatureId) {
      // Petit délai (300ms) pour attendre la fin de l'animation d'ouverture de la modale
      const timer = setTimeout(() => {
        const rowElement = document.getElementById(`feature-row-${selectedFeatureId}`)
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [open, selectedFeatureId])

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

  // Si la modale n'est pas ouverte, ne rien rendre (ou utiliser CSS pour masquer)
  if (!open) return null

  return (
    // --- OVERLAY / FOND SOMBRE ---
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-card/80 backdrop-blur-sm p-4 transition-all duration-200">
      
      {/* --- CONTENEUR DE LA MODALE --- */}
      <div className="bg-card w-[95vw] h-[90vh] max-w-[1800px] rounded-xl shadow-2xl border border-border flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* --- HEADER PERSONNALISÉ --- */}
        <div className="flex flex-col p-6 pb-2 border-b flex-none">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold leading-none tracking-tight">
              Table Attributaire
            </h2>
            {/* Bouton de fermeture manuel */}
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
                <X className="h-5 w-5" />
                <span className="sr-only">Fermer</span>
            </Button>
          </div>

          <div className="flex items-center gap-4 pt-2 flex-wrap">
            {/* SÉLECTEUR DE COUCHE */}
            <div className="flex items-center gap-2">
                <Label htmlFor="layer-select" className="text-sm font-normal whitespace-nowrap">Afficher la couche :</Label>
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
                      {activeLayers.map(layer => (
                          <SelectItem key={layer.id} value={layer.id}>
                              {layer.name} ({layer.count} objets - {layer.type})
                          </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
            </div>
            
            <span className="text-sm text-muted-foreground ml-2">
                {features.length} objet(s) affiché(s) {currentLayerConfig && `pour la couche "${currentLayerConfig.name}"`}.
            </span>

            {/* --- NOUVEAU : Bouton de désélection --- */}
            {selectedFeatureId && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedFeatureId(null)}
                    className="ml-auto border-dashed text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="Effacer la sélection actuelle"
                >
                    <Ban className="w-4 h-4 mr-2" />
                    Désélectionner ({selectedFeatureId})
                </Button>
            )}
          </div>
        </div>

        {/* --- CORPS DE LA MODALE (Scrollable) --- */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col min-h-0">
          <div className="flex-none flex justify-between items-center pb-4">
            <h3 className="font-semibold text-base">
                Propriétés de : {currentLayerConfig ? currentLayerConfig.name : "Sélectionnez une couche"}
            </h3>
            <Button size="sm" onClick={onAddProperty} disabled={!currentLayerConfig}>
              <Plus className="w-4 h-4 mr-2" /> Ajouter Colonne
            </Button>
          </div>

          {/* Conteneur de la table avec scroll interne */}
          <div className="flex-1 overflow-auto border rounded-lg bg-card">
            <Table className='relative w-full caption-bottom text-sm'>
              <TableHeader className='sticky top-0 bg-secondary/90 backdrop-blur supports-backdrop-filter:bg-background/60 z-10 shadow-sm'>
                <TableRow>
                  <TableHead className="w-[50px] sticky left-0 z-20 bg-background border-r">ID</TableHead>
                  {columns.map(key => (
                    <TableHead key={key} className="min-w-[150px] border-r last:border-r-0">
                      <div className='flex items-center justify-between'>
                        <span className="font-bold text-foreground">{key}</span>
                        {key !== 'name' && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => onDeleteProperty(key)}>
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        )}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-[100px] text-center sticky right-0 z-20 bg-background border-l shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.map(feature => (
                  <TableRow
                    key={feature.id}
                    id={`feature-row-${feature.id}`} // --- NOUVEAU : ID pour le ciblage du scroll ---
                    className={`
                        cursor-pointer transition-colors border-b 
                        ${selectedFeatureId === feature.id 
                            ? 'bg-primary/10 hover:bg-primary/15' 
                            : 'hover:bg-muted/50'}
                    `}
                    onClick={() => onRowClick(feature.id)}
                  >
                    <TableCell className="font-medium sticky left-0 z-10 bg-inherit border-r font-mono text-xs">{feature.id}</TableCell>
                    {columns.map(key => {
                      const value = feature.properties[key] ? String(feature.properties[key]) : ''
                      const isEditing = editingCell?.featureId === feature.id && editingCell.key === key

                      return (
                        <TableCell key={key} className="border-r last:border-r-0 p-2">
                          {isEditing ? (
                            <div className='flex items-center gap-1 animate-in fade-in zoom-in-95 duration-100'>
                              <Input
                                value={currentEditValue}
                                onChange={(e) => setCurrentEditValue(e.target.value)}
                                onKeyDown={(e) => { 
                                    if(e.key === 'Enter') handleSave();
                                    if(e.key === 'Escape') handleCancel();
                                }}
                                autoFocus
                                className="h-8 text-sm px-2"
                              />
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30" onClick={handleSave} title="Sauvegarder">
                                <Save className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30" onClick={handleCancel} title="Annuler">
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center min-h-7 group">
                                <span className='text-sm truncate pr-2 max-w-[200px] block' title={value}>{value}</span>
                                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); handleEdit(feature.id, key, value); }}>
                                    <Edit className="w-3 h-3" />
                                </Button>
                            </div>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center sticky right-0 z-10 bg-inherit border-l shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); onDeleteFeature(feature.id); }} title="Supprimer l'objet">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {features.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={columns.length + 2} className="text-center text-muted-foreground h-32">
                            <div className="flex flex-col items-center justify-center gap-2">
                                <span className="text-lg font-medium">Aucune donnée</span>
                                <span className="text-sm">Aucun objet trouvé dans la couche sélectionnée.</span>
                            </div>
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}