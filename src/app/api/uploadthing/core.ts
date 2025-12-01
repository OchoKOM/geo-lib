import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

// Fonction d'authentification simulée (à remplacer par votre logique d'auth réelle)
const auth = (req: Request) => ({ id: "fakeId" }); 

// FileRouter pour votre application, peut contenir plusieurs routes
export const ourFileRouter = {
  // 1. Route pour le téléversement d'images
  imageUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      // Ce code s'exécute sur votre serveur avant le téléversement
      const user = await auth(req);

      // Si l'utilisateur n'est pas autorisé, l'upload échoue
      if (!user) throw new UploadThingError("Unauthorized");

      // Les données retournées sont accessibles dans onUploadComplete
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Ce code s'exécute sur votre serveur après le téléversement
      console.log("Upload d'image terminé pour l'utilisateur:", metadata.userId);
      console.log("URL du fichier:", file.url);
      
      // Ici, vous pourriez enregistrer l'URL du fichier dans votre base de données
      
      // Ce qui est retourné est envoyé au client
      return { uploadedBy: metadata.userId, fileName: file.name, fileUrl: file.url };
    }),

  // 2. Nouvelle route pour les fichiers de données (ex: GeoJSON, PDF, etc.)
  dataUploader: f({
    // Permettre les fichiers JSON (GeoJSON), Texte et PDF
    json: { maxFileSize: "10MB", maxFileCount: 5 },
    text: { maxFileSize: "10MB", maxFileCount: 5 },
    pdf: { maxFileSize: "10MB", maxFileCount: 2 },
  })
    .middleware(async ({ req }) => {
      // Vous pouvez ici implémenter une logique d'autorisation plus stricte si nécessaire
      const user = await auth(req);
      if (!user) throw new UploadThingError("Unauthorized for data upload");
      
      // Vous pouvez aussi extraire d'autres informations du header ou de la session
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload de données terminé pour l'utilisateur:", metadata.userId);
      console.log("Nom du fichier:", file.name);
      console.log("URL du fichier:", file.url);

      // IMPORTANT : Pour GeoJSON, l'URL de ce fichier est l'URL que vous devriez
      // enregistrer dans la base de données via votre route 'route1.ts'
      
      return { uploadedBy: metadata.userId, fileName: file.name, fileUrl: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;