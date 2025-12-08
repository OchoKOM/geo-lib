import { Loader2, Database, Check, FileInput } from "lucide-react"
import { ImportCandidate } from "../editor/GeoMap"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog"
import { Button } from "../ui/button"

export default function ImportModal({
  open,
  candidates,
  isProcessing,
  onOpenChange,
  onToggleCandidate,
  onToggleAll,
  onConfirm
}: {
  open: boolean
  candidates: ImportCandidate[]
  isProcessing: boolean
  onOpenChange: (open: boolean) => void
  onToggleCandidate: (id: string) => void
  onToggleAll: (selected: boolean) => void
  onConfirm: () => void
}) {
  const allSelected = candidates.length > 0 && candidates.every(c => c.selected)
  const noneSelected = candidates.every(c => !c.selected)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className='max-w-xl'>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center gap-2'>
            {isProcessing ? <Loader2 className='w-5 h-5 animate-spin' /> : <Database className='w-5 h-5' />}
            {isProcessing ? 'Analyse en cours...' : 'Sélectionnez les couches à importer'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isProcessing ? 'Traitement des fichiers...' : `${candidates.length} couche(s) identifiée(s).`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {candidates.length > 0 && !isProcessing && (
          <div
            className='flex items-center gap-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700'
            onClick={() => onToggleAll(!allSelected)}
          >
            <div
              className='flex items-center justify-center h-5 w-5 rounded-md border-2 border-slate-400 flex-shrink-0 transition-colors'
              style={{ backgroundColor: allSelected ? '#3b82f6' : 'transparent', borderColor: allSelected ? '#3b82f6' : 'currentColor' }}
            >
              {allSelected && <Check className='w-3.5 h-3.5 text-white' />}
            </div>
            <span className='font-bold text-sm'>Tout {allSelected ? 'Désélectionner' : 'Sélectionner'}</span>
          </div>
        )}

        <div className='max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-3'>
          {!isProcessing && candidates.map(candidate => (
            <div
              key={candidate.id}
              className='flex items-start gap-4 p-3 mb-2 rounded-lg transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800'
              onClick={() => onToggleCandidate(candidate.id)}
            >
              <div
                className='mt-1 flex items-center justify-center h-5 w-5 rounded-md border-2 border-slate-300 dark:border-slate-600 flex-shrink-0'
                style={{ backgroundColor: candidate.selected ? '#3b82f6' : 'transparent' }}
              >
                {candidate.selected && <Check className='w-3.5 h-3.5 text-white' />}
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex justify-between items-center'>
                  <span className='font-semibold text-sm truncate'>{candidate.name}</span>
                  <span className='text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-mono flex-shrink-0 ml-2'>
                    {candidate.geometryType}
                  </span>
                </div>
                <div className='text-xs text-slate-500 mt-1'>
                  Source: {candidate.originalName} ({candidate.featureCount} obj)
                </div>
              </div>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <Button onClick={onConfirm} disabled={isProcessing || noneSelected}>
            <FileInput className='w-4 h-4 mr-2' /> Importer
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
