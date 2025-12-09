/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useUploadThing } from '@/lib/uploadthing'
import { showToast } from '@/hooks/useToast'
import { Loader2, Image, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'

// NOTE: Ce composant suppose que vous avez un composant Dropzone (ex: from UploadThing) 
// et/ou un moyen de sélectionner le fichier à uploader.
// Pour l'exemple, nous allons utiliser une approche simple de dialogue.

interface CoverImageUploaderProps {
  currentFileId: string | null
  currentFileUrl: string | null
  onFileChange: (fileId: string | null, url: string | null) => void
  isEditable: boolean
}

export default function CoverImageUploader({ currentFileId, currentFileUrl, onFileChange, isEditable }: CoverImageUploaderProps) {
  const [open, setOpen] = useState(false)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Hook UploadThing configuré pour l'endpoint 'imageUploader'
  const { startUpload } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res) => {
      setUploading(false)
      if (res && res[0]) {
        // Renvoie l'ID et l'URL au parent
        onFileChange(res[0].serverData.fileId, res[0].url)
        showToast("Couverture mise à jour", "success")
        setOpen(false)
        resetState()
      }
    },
    onUploadError: (err) => {
      setUploading(false)
      showToast(`Erreur upload: ${err.message}`, "destructive")
    }
  })

  useEffect(() => {
    if (fileToUpload) {
      setPreviewUrl(URL.createObjectURL(fileToUpload))
    } else {
      setPreviewUrl(null)
    }
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [fileToUpload])

  function resetState() {
    setFileToUpload(null)
    setPreviewUrl(null)
  }

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
    onFileChange(null, null); // Supprimer la relation côté client
    showToast("Couverture retirée. Enregistrez pour finaliser.", "warning");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className='relative w-full aspect-[2/3] max-w-[200px] mx-auto rounded-lg overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 group cursor-pointer'>
            {currentFileUrl ? (
                <img
                    src={currentFileUrl}
                    alt='Couverture du livre'
                    className='w-full h-full object-cover'
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-800 p-4 text-center">
                    <Image className="w-8 h-8 mb-2" />
                    <span className='text-sm font-medium'>Ajouter une couverture</span>
                </div>
            )}
            {isEditable && (
                <div className='absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium'>
                    <Image className="mr-2 h-4 w-4" /> Modifier
                </div>
            )}
        </div>
      </DialogTrigger>
      
      {isEditable && (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Mettre à jour la Couverture</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
                {previewUrl ? (
                    <div className='flex flex-col items-center space-y-4'>
                        <img src={previewUrl} alt="Aperçu" className='max-h-64 object-contain rounded-md border p-2' />
                        <Button variant="outline" onClick={resetState} disabled={uploading}>
                            Changer l&apos;image
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center w-full">
                        <label htmlFor="cover-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:hover:border-slate-500">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Image className="w-10 h-10 mb-3 text-slate-400" />
                                <p className="mb-2 text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold">Cliquez pour uploader</span></p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">JPG, PNG ou WebP (Max 4MB)</p>
                            </div>
                            <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                        </label>
                    </div>
                )}

                {currentFileId && (
                    <div className='pt-4 border-t dark:border-slate-700 flex justify-center'>
                        <Button variant="destructive" size="sm" onClick={handleRemove}>
                            <Trash2 className="mr-2 h-4 w-4" /> Retirer la couverture actuelle
                        </Button>
                    </div>
                )}
            </div>

            <DialogFooter className="sm:justify-between">
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={uploading}>Annuler</Button>
                {fileToUpload && (
                    <Button onClick={handleSave} disabled={uploading}>
                        {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi...</> : "Uploader et Sauvegarder"}
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}