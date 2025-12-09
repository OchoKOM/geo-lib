import { getSession } from "@/lib/auth";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import prisma from "@/lib/prisma"; // Assurez-vous que le chemin est correct
import { FileType } from "@prisma/client";

const f = createUploadthing();

// Fonction utilitaire pour déterminer le type de fichier Prisma
const determineFileType = (mimeType: string): FileType => {
  if (mimeType.startsWith("image/")) return FileType.COVER_IMAGE;
  if (mimeType.includes("geo+json") || mimeType.includes("json")) return FileType.GEOJSON_DATA;
  return FileType.DOCUMENT_PDF; // Par défaut pour les docs (PDF, Word, etc.)
};

function slugifyFilename(name:string) {
  // remove all special characters except for dots, hyphens, and underscores
  const cleanedName = name.replace(/[^a-zA-Z0-9.\-_]/g, '-');
  // replace multiple hyphens with a single hyphen
  return cleanedName.replace(/-+/g, '-').toLowerCase();
  
}

export const ourFileRouter = {
  // 1. Route Image (Couvertures)
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const { user } = await getSession();
      if (!user) throw new UploadThingError("Unauthorized");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Création de l'entrée en DB
      const dbFile = await prisma.file.create({
        data: {
            url: file.ufsUrl,
            name: slugifyFilename(file.name),
            mimeType: "image/jpeg", // UploadThing normalise souvent, ajustez si besoin
            size: file.size,
            type: FileType.COVER_IMAGE
        }
      });
      // On retourne l'ID pour que le frontend puisse lier ce fichier
      return { uploadedBy: metadata.userId, fileId: dbFile.id, fileUrl: file.url };
    }),

  // 2. Route GeoJSON
  geoJsonUploader: f({
    "application/json": { maxFileSize: "16MB", maxFileCount: 1 },
    "application/geo+json": { maxFileSize: "16MB", maxFileCount: 1 }
  })
    .middleware(async ({ req }) => {
      const { user } = await getSession();
      if (!user) throw new UploadThingError("Unauthorized for GeoJSON");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const dbFile = await prisma.file.create({
        data: {
            url: file.ufsUrl,
            name: slugifyFilename(file.name),
            mimeType: "application/geo+json",
            size: file.size,
            type: FileType.GEOJSON_DATA
        }
      });
      return { uploadedBy: metadata.userId, fileId: dbFile.id, fileName: slugifyFilename(file.name) };
    }),

  // 3. Route Documents Académiques (PDF, Word, Texte)
  documentUploader: f({
    "application/pdf": { maxFileSize: "32MB", maxFileCount: 1 },
    "application/msword": { maxFileSize: "16MB", maxFileCount: 1 }, // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "16MB", maxFileCount: 1 }, // .docx
    "text/plain": { maxFileSize: "4MB", maxFileCount: 1 }, // .txt
    "application/rtf": { maxFileSize: "16MB", maxFileCount: 1 }, // .rtf
    "application/vnd.oasis.opendocument.text": { maxFileSize: "16MB", maxFileCount: 1 } // .odt
  })
    .middleware(async ({ req }) => {
      const { user } = await getSession();
      // Sécurité : Seuls les Auteurs, Bibliothécaires et Admins peuvent uploader des thèses/livres
      if (!user || user.role === "READER") throw new UploadThingError("Unauthorized: Vous devez être auteur ou bibliothécaire.");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {;
      
      // Enregistrement automatique dans Prisma
      const dbFile = await prisma.file.create({
          data: {
              url: file.ufsUrl,
              name: slugifyFilename(file.name),
              mimeType: "application/document", // Vous pouvez affiner si vous recevez le mime exact
              size: file.size,
              type: FileType.DOCUMENT_PDF // On utilise ce type enum générique pour tous les docs texte
          }
      });

      // Retourne l'ID prisma au client
      return { 
        uploadedBy: metadata.userId, 
        fileId: dbFile.id,
        fileUrl: file.ufsUrl,
        fileName: slugifyFilename(file.name)
      };
    }),

} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;