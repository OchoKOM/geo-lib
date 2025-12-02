import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

// Fonction d'authentification simulée (à remplacer par votre auth réelle)
// Assurez-vous que cette fonction valide bien la session utilisateur
const auth = (req: Request) => ({ id: "fakeId" }); 

export const ourFileRouter = {
  // Votre route existante pour les images
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const user = await auth(req);
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
      const user = await auth(req);
      if (!user) throw new UploadThingError("Unauthorized for GeoJSON");
      
      // Vous pouvez ajouter des métadonnées ici si nécessaire
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("GeoJSON uploadé:", file.name);
      // Retournez ces infos pour que le client puisse les envoyer à votre API
      return { 
        uploadedBy: metadata.userId, 
        fileName: file.name, 
        fileKey: file.key,
        fileUrl: file.ufsUrl 
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;