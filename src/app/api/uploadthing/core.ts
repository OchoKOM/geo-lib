import { getSession } from "@/lib/auth";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import prisma from "@/lib/prisma";
import { FileType } from "@prisma/client";

const f = createUploadthing();

function slugifyFilename(name: string) {
  const cleanedName = name.replace(/[^a-zA-Z0-9.\-_]/g, '-');
  return cleanedName.replace(/-+/g, '-').toLowerCase();
}

export const ourFileRouter = {
  // 1. Route Image (Couvertures)
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const { user } = await getSession();
      if (!user) throw new UploadThingError("Unauthorized");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const dbFile = await prisma.file.create({
        data: {
          url: file.ufsUrl,
          name: slugifyFilename(file.name),
          mimeType: "image/jpeg",
          size: file.size,
          type: FileType.COVER_IMAGE
        }
      });
      return { uploadedBy: metadata.userId, fileId: dbFile.id, fileUrl: file.url };
    }),

  // 2. NOUVEAU: Route Spécifique Avatar (Crop et Downscale gérés côté client, mais type sécurisé ici)
  avatarUploader: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async () => {
      const { user } = await getSession();
      if (!user) throw new UploadThingError("Unauthorized");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const dbFile = await prisma.file.create({
        data: {
          url: file.ufsUrl, // Utilisation de ufsUrl (UploadThing URL)
          name: `avatar-${slugifyFilename(file.name)}`,
          mimeType: "image/webp", // On suppose que le crop client envoie du webp ou jpeg
          size: file.size,
          type: FileType.AVATAR // Type spécifique
        }
      });
      return { uploadedBy: metadata.userId, fileId: dbFile.id, fileUrl: file.ufsUrl };
    }),

  // 3. Route GeoJSON
  geoJsonUploader: f({
    "application/json": { maxFileSize: "16MB", maxFileCount: 1 },
    "application/geo+json": { maxFileSize: "16MB", maxFileCount: 1 }
  })
    .middleware(async () => {
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

  // 4. Route Documents Académiques
  documentUploader: f({
    "application/pdf": { maxFileSize: "32MB", maxFileCount: 1 },
    "application/msword": { maxFileSize: "16MB", maxFileCount: 1 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "16MB", maxFileCount: 1 },
    "text/plain": { maxFileSize: "4MB", maxFileCount: 1 },
    "application/rtf": { maxFileSize: "16MB", maxFileCount: 1 },
    "application/vnd.oasis.opendocument.text": { maxFileSize: "16MB", maxFileCount: 1 }
  })
    .middleware(async () => {
      const { user } = await getSession();
      if (!user || user.role === "READER") throw new UploadThingError("Unauthorized: Vous devez être auteur ou bibliothécaire.");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const dbFile = await prisma.file.create({
        data: {
          url: file.ufsUrl,
          name: slugifyFilename(file.name),
          mimeType: "application/document",
          size: file.size,
          type: FileType.DOCUMENT_PDF
        }
      });
      return {
        uploadedBy: metadata.userId,
        fileId: dbFile.id,
        fileUrl: file.ufsUrl,
        fileName: slugifyFilename(file.name)
      };
    }),

} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;