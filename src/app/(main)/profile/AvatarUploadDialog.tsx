/* eslint-disable @next/next/no-img-element */
'use client'

import React, { useState, useRef } from 'react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Camera, Loader2, UploadCloud, User, UserRound, X } from 'lucide-react'
import { useUploadThing } from '@/lib/uploadthing'
import { showToast } from '@/hooks/useToast'

// --- Helpers pour le crop et le canvas ---

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  )
}

// Fonction pour dessiner l'image croppée et redimensionnée sur un canvas
async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  maxSize: number = 400 // Taille max (downscale)
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2d context')

  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  // Dimensions réelles du crop sur l'image source
  const actualCropWidth = crop.width * scaleX
  const actualCropHeight = crop.height * scaleY

  // Logique de Downscale :
  // Si le crop est plus grand que maxSize, on réduit la taille du canvas final
  let targetWidth = actualCropWidth
  let targetHeight = actualCropHeight

  if (targetWidth > maxSize || targetHeight > maxSize) {
    const ratio = Math.min(maxSize / targetWidth, maxSize / targetHeight)
    targetWidth *= ratio
    targetHeight *= ratio
  }

  canvas.width = targetWidth
  canvas.height = targetHeight

  ctx.imageSmoothingQuality = 'high'

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    actualCropWidth,
    actualCropHeight,
    0,
    0,
    targetWidth,
    targetHeight
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Canvas is empty'))
        resolve(blob)
      },
      'image/webp', // Optimisation WebP
      0.85 // Qualité
    )
  })
}

interface AvatarUploadDialogProps {
  currentAvatarUrl: string | null
  onAvatarChange: (fileId: string, url: string) => void
}

export default function AvatarUploadDialog({ currentAvatarUrl, onAvatarChange }: AvatarUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [imgSrc, setImgSrc] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [uploading, setUploading] = useState(false)
  
  const imgRef = useRef<HTMLImageElement>(null)
  
  // Hook UploadThing configuré pour l'endpoint 'avatarUploader'
  const { startUpload } = useUploadThing("avatarUploader", {
    onClientUploadComplete: (res) => {
      setUploading(false)
      if (res && res[0]) {
        // Renvoie l'ID et l'URL au parent
        onAvatarChange(res[0].serverData.fileId, res[0].url)
        showToast("Avatar mis à jour", "success")
        setOpen(false)
        resetState()
      }
    },
    onUploadError: (err) => {
      setUploading(false)
      showToast(`Erreur upload: ${err.message}`, "destructive")
    }
  })

  function resetState() {
    setImgSrc('')
    setCrop(undefined)
    setCompletedCrop(undefined)
  }

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined) // Reset crop
      const reader = new FileReader()
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''))
      reader.readAsDataURL(e.target.files[0])
    }
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget
    // Centrer le crop carré (aspect 1) par défaut
    setCrop(centerAspectCrop(width, height, 1))
  }

  async function handleSave() {
    if (!imgRef.current || !completedCrop) return

    setUploading(true)
    try {
      // 1. Générer le blob croppé et redimensionné
      const blob = await getCroppedImg(imgRef.current, completedCrop, 400) // Max 400x400px
      
      // 2. Créer un objet File compatible UploadThing
      const file = new File([blob], "avatar.webp", { type: "image/webp" })
      
      // 3. Uploader
      await startUpload([file])
      
    } catch (e) {
      console.error(e)
      setUploading(false)
      showToast("Erreur lors du traitement de l'image", "destructive")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
        setOpen(val)
        if (!val) resetState()
    }}>
      <DialogTrigger asChild>
        <div className='relative group cursor-pointer'>
            <div className='relative w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-700 shadow-sm bg-slate-200 dark:bg-slate-800'>
                {currentAvatarUrl ? (
                    <img
                        src={currentAvatarUrl}
                        alt='Avatar'
                        className='w-full h-full object-cover'
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <UserRound className="w-10 h-10" />
                    </div>
                )}
                <div className='absolute inset-0 bg-slate-950/20 dark:bg-slate-950/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium'>
                    <Camera className="mr-2 h-4 w-4" /> Modifier
                </div>
            </div>
        </div>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier la photo de profil</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!imgSrc ? (
            <div className="flex items-center justify-center w-full">
              <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:hover:border-slate-500">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-10 h-10 mb-3 text-slate-400" />
                      <p className="mb-2 text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold">Cliquez pour uploader</span></p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG ou WEBP</p>
                  </div>
                  <input id="dropzone-file" type="file" accept="image/*" className="hidden" onChange={onSelectFile} />
              </label>
            </div> 
          ) : (
            <div className="flex flex-col items-center space-y-4">
                <div className="relative max-h-[300px] w-full overflow-auto bg-black/5 rounded-md">
                    <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={1} // Force le carré
                        circularCrop
                    >
                        <img
                            ref={imgRef}
                            alt="Crop me"
                            src={imgSrc}
                            onLoad={onImageLoad}
                            className="max-w-full"
                        />
                    </ReactCrop>
                </div>
                <Button variant="outline" size="sm" onClick={() => setImgSrc('')} disabled={uploading}>
                    <X className="mr-2 w-4 h-4" /> Choisir une autre image
                </Button>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={uploading}>Annuler</Button>
          {imgSrc && (
              <Button onClick={handleSave} disabled={uploading || !completedCrop}>
                {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi...</> : "Valider et Sauvegarder"}
              </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}