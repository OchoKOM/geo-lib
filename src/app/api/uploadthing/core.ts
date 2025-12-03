import { getSession } from "@/lib/auth";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();


export const ourFileRouter = {
  // Votre route existante pour les images
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const {user} = await getSession();
      if (!user) throw new UploadThingError("Unauthorized");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Image uploadée par", metadata.userId);
      return { uploadedBy: metadata.userId, fileUrl: file.ufsUrl };
    }),

  // Route optimisée pour GeoJSON
  geoJsonUploader: f({
    // Nous autorisons JSON et BLOB pour couvrir les extensions .geojson et .json
    "application/json": { maxFileSize: "16MB", maxFileCount: 1 }, 
    "application/geo+json": { maxFileSize: "16MB", maxFileCount: 1 }
  })
    .middleware(async ({ req }) => {
      const {user} = await getSession();
      if (!user) throw new UploadThingError("Unauthorized for GeoJSON");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("GeoJSON uploadé:", file.name);
      return { 
        uploadedBy: metadata.userId, 
        fileName: file.name, 
        fileKey: file.key,
        fileUrl: file.ufsUrl 
      };
    }),

  // NOUVEAU : Route pour les documents académiques (PDF)
  documentUploader: f({
    "application/pdf": { maxFileSize: "32MB", maxFileCount: 1 }
  })
    .middleware(async ({ req }) => {
      const {user} = await getSession();
      // Vérification de sécurité supplémentaire recommandée ici (ex: rôle ADMIN/AUTHOR)
      if (!user) throw new UploadThingError("Unauthorized for Documents");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Document uploadé:", file.name);
      return { 
        uploadedBy: metadata.userId, 
        fileUrl: file.ufsUrl,
        fileKey: file.key,
        fileName: file.name
      };
    }),

} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;