'use client'

import React, { useState } from 'react'
import { useUploadThing } from '@/lib/uploadthing'
import { showToast } from '@/hooks/useToast'
import { Loader2, FileText, Trash2, UploadCloud, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'

interface DocumentFileUploaderProps {
  currentFileId: string | null
  currentFileUrl: string | null
  currentFileName: string | null
  onFileChange: (fileId: string | null, url: string | null, name: string | null) => void
  isEditable: boolean
}

export default function DocumentFileUploader({ currentFileId, currentFileUrl, currentFileName, onFileChange, isEditable }: DocumentFileUploaderProps) {
  const [open, setOpen] = useState(false)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const filename = currentFileName || (currentFileUrl ? currentFileUrl.split('/').pop() : 'Document Académique');

  // Hook UploadThing configuré pour l'endpoint 'documentUploader'
  const { startUpload } = useUploadThing("documentUploader", {
    onClientUploadComplete: (res) => {
      setUploading(false)
      if (res && res[0]) {
        // Renvoie l'ID, l'URL et le nom du fichier au parent
        onFileChange(res[0].serverData.fileId, res[0].url, res[0].serverData.fileName)
        showToast("Document mis à jour", "success")
        setOpen(false)
        setFileToUpload(null)
      }
    },
    onUploadError: (err) => {
      setUploading(false)
      showToast(`Erreur upload: ${err.message}`, "destructive")
    }
  })

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setFileToUpload(e.target.files[0])
    }
  }

  async function handleSave() {
    if (!fileToUpload) return
    setUploading(true)
    await startUpload([fileToUpload])
  }

  function handleRemove() {
    if (!isEditable) return;
    onFileChange(null, null, null); // Supprimer la relation côté client
    showToast("Document retiré. Enregistrez pour finaliser.", "warning");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button variant="outline" className='w-full justify-start h-auto p-4' disabled={!isEditable && !currentFileUrl}>
                <FileText className='mr-3 h-5 w-5 text-blue-500' />
                <div className='flex flex-col items-start'>
                    <span className='font-medium text-sm truncate max-w-[200px] md:max-w-full line-clamp-2 '>
                        {currentFileId ? filename : (isEditable ? 'Ajouter le document principal' : "Aucun document disponible")}
                    </span>
                    {currentFileId && <span className='text-xs text-slate-500 dark:text-slate-400'>Cliquez pour {isEditable ? 'modifier' : 'télécharger'}</span>}
                </div>
            </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{currentFileId ? 'Mettre à jour' : 'Uploader'} le Document Principal</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
                {currentFileUrl && (
                    <div className='flex items-center justify-between p-3 border rounded-lg dark:border-slate-700 bg-slate-50 dark:bg-slate-800'>
                        <div className='flex items-center'>
                            <FileText className='mr-3 h-5 w-5 text-green-500' />
                            <span className='text-sm font-medium truncate max-w-xs'>{filename}</span>
                        </div>
                        <a href={currentFileUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="secondary"><Download className='h-4 w-4' /></Button>
                        </a>
                    </div>
                )}

                {isEditable && (
                    <div className="flex flex-col items-center justify-center w-full">
                        <label htmlFor="document-upload" className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:hover:border-slate-500">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <UploadCloud className="w-8 h-8 mb-3 text-slate-400" />
                                <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                                    {fileToUpload ? `Fichier sélectionné: ${fileToUpload.name}` : <span className="font-semibold">Cliquez pour choisir un nouveau document</span>}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">PDF, Word, TXT (Max 32MB)</p>
                            </div>
                            <input id="document-upload" type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.odt" className="hidden" onChange={handleFileSelect} />
                        </label>
                    </div>
                )}

                {isEditable && currentFileId && (
                    <div className='pt-4 border-t dark:border-slate-700 flex justify-center'>
                        <Button variant="destructive" size="sm" onClick={handleRemove}>
                            <Trash2 className="mr-2 h-4 w-4" /> Retirer le document actuel
                        </Button>
                    </div>
                )}
            </div>

            {isEditable && (
                <DialogFooter className="sm:justify-between">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={uploading}>Annuler</Button>
                    {fileToUpload && (
                        <Button onClick={handleSave} disabled={uploading}>
                            {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi...</> : "Uploader et Sauvegarder"}
                        </Button>
                    )}
                </DialogFooter>
            )}
        </DialogContent>
    </Dialog>
  )
}