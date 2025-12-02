import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core"; // Ajustez le chemin selon votre structure

export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();