import { generateUploadButton, generateUploadDropzone, generateUploader } from "@uploadthing/react";
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core"; // Ajustez le chemin selon votre structure

// Export des hooks (déjà présents)
export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();

// Export des composants UI (Nouveau)
export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
export const Uploader = generateUploader<OurFileRouter>();