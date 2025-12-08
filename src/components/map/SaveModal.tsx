import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from "@radix-ui/react-alert-dialog"
import { Database, Loader2, Save } from "lucide-react"
import { AlertDialogHeader, AlertDialogFooter } from "../ui/alert-dialog"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"

export default function SaveModal({
  open,
  onClose,
  isSaving,
  formData,
  setFormData,
  onSave
}: {
  open: boolean
  onClose: (open: boolean) => void
  isSaving: boolean
  formData: { name: string, description: string }
  setFormData: (val: any) => void
  onSave: () => void
}) {
     <AlertDialog open={open} onOpenChange={onClose}>
    <AlertDialogContent className='sm:max-w-[425px]'>
      <AlertDialogHeader>
        <AlertDialogTitle className='flex items-center gap-2 text-blue-600 dark:text-blue-400'>
          <Database className='w-5 h-5' /> Sauvegarder la Zone d&apos;Étude
        </AlertDialogTitle>
        <AlertDialogDescription>
          Définissez les propriétés de cette couche avant de l&apos;enregistrer.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className='grid gap-4 py-4'>
        <div className='grid gap-2'>
          <label htmlFor='layer-name' className='text-sm font-medium'>Nom de la zone</label>
          <Input
            id='layer-name'
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder='Ex: Parcelle Agricole B2'
          />
        </div>
        <div className='grid gap-2'>
          <label htmlFor='layer-desc' className='text-sm font-medium'>Description (Optionnel)</label>
          <Textarea
            id='layer-desc'
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder='Détails...'
          />
        </div>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isSaving}>Annuler</AlertDialogCancel>
        <Button onClick={onSave} disabled={isSaving || !formData.name}>
          {isSaving ? <><Loader2 className='w-4 h-4 mr-2 animate-spin' /> Enregistrement...</> : <><Save className='w-4 h-4 mr-2' /> Enregistrer</>}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
};
