import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, CloudUpload } from 'lucide-react'
import { useState } from 'react'

interface SaveLayerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    layerName: string
    onConfirm: (name: string, description: string) => Promise<void>
    isUploading: boolean
}

export default function SaveLayerDialog({
    open,
    onOpenChange,
    layerName,
    onConfirm,
    isUploading
}: SaveLayerDialogProps) {
    const [name, setName] = useState(layerName)
    const [description, setDescription] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onConfirm(name, description)
        // Reset après succès géré par le parent
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Enregistrer la couche en base de données</DialogTitle>
                    <DialogDescription>
                        Cette action va créer une nouvelle &quot;Zone d&apos;étude&quot; accessible publiquement.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="layer-name">Nom de la zone</Label>
                        <Input 
                            id="layer-name" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            placeholder="Ex: Campus Universitaire"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="layer-desc">Description (Optionnelle)</Label>
                        <Textarea 
                            id="layer-desc" 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)} 
                            placeholder="Détails sur la source, l'année, etc."
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={isUploading}>
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Téléversement...
                                </>
                            ) : (
                                <>
                                    <CloudUpload className="mr-2 h-4 w-4" />
                                    Sauvegarder
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}