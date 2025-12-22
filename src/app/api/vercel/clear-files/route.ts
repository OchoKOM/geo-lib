import prisma from "@/lib/prisma";
import { UTApi } from "uploadthing/server";

export async function GET(req: Request) {
  const authHeader = req.headers.get("Authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(
      JSON.stringify({ error: "Invalid authorization header" }),
      { status: 401 }
    );
  }
  // Verifier si on est le premier janvier de l'année
  const now = new Date();
  const isJanuaryFirst = now.getUTCMonth() === 0 && now.getUTCDate() === 1;
  if (isJanuaryFirst) {
    console.log(
      "--- DÉCLENCHEMENT DU CRON JOB (1er Janvier) : VÉRIFICATION DE LA PROCHAINE ANNÉE ACADÉMIQUE ---"
    );
    console.log(
      "--- DÉCLENCHEMENT DU CRON JOB (1er Janvier) : VÉRIFICATION DE LA PROCHAINE ANNÉE ACADÉMIQUE ---"
    );

    // L'année civile en cours (ex: 2026 si exécuté le 01/01/2026)
    const nextCalendarYear = new Date().getFullYear();

    // L'année académique à préparer est celle qui va de [Année Civile] à [Année Civile + 1]
    // Ex: Le 01/01/2026, on prépare l'année 2026-2027
    const academicStartYear = nextCalendarYear;
    const academicEndYear = nextCalendarYear + 1;

    const yearString = `${academicStartYear}-${academicEndYear}`;

    // Définition des dates (Octobre N à Septembre N+1)
    const startDate = new Date(academicStartYear, 9, 1); // Mois 9 = Octobre
    const endDate = new Date(academicEndYear, 8, 30); // Mois 8 = Septembre

    try {
      // 1. Vérifier si l'année académique existe déjà
      const existingYear = await prisma.academicYear.findUnique({
        where: { year: yearString },
      });

      if (existingYear) {
        console.log(
          `[SUCCÈS] L'année académique ${yearString} existe déjà. Aucune action nécessaire.`
        );
        return Response.json({
          status: "exists",
          year: yearString,
          message: "Année déjà présente en base de données.",
        });
      }

      // 2. Créer l'année si elle n'existe pas
      const newAcademicYear = await prisma.academicYear.create({
        data: {
          year: yearString,
          startDate: startDate,
          endDate: endDate,
        },
      });

      console.log(
        `[CRÉÉ] Nouvelle année académique insérée : ${yearString} (Du ${startDate.toLocaleDateString()} au ${endDate.toLocaleDateString()})`
      );

      return Response.json({
        status: "created",
        year: yearString,
        id: newAcademicYear.id,
        message: "Nouvelle année académique ajoutée avec succès.",
      });
    } catch (error) {
      console.error(
        `[ERREUR] Impossible de traiter l'année ${yearString}:`,
        error
      );
      throw new Error(
        `Erreur lors de l'ajout de l'année académique: ${yearString}`
      );
    }
  }

  console.log(
    "--- DÉCLENCHEMENT DU CRON JOB : SUPPRESSION DES FICHIERS MARQUÉS COMME SUPPRIMÉS DE PLUS DE 24H DE VIE ---"
  );
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const deletedFiles = await prisma.file.findMany({
      where: {
        isDeleted: true,
        createdAt: { lt: twentyFourHoursAgo },
      },
    });

    deletedFiles.forEach(async (file) => {
      const key = file.url.split("/").pop();
      if (key) {
        new UTApi().deleteFiles(key).catch((error) => {
          console.error(
            `Erreur lors de la suppression du fichier ${file.id} de UploadThing :`,
            error
          );
        });
        await prisma.file.delete({
          where: { id: file.id },
        });
        console.log(
          `[SUPPRIMÉ] Fichier ID ${file.id} supprimé de la base et d'UploadThing.`
        );
      }
    });
    return new Response(
      JSON.stringify({ status: "success", deletedCount: deletedFiles.length }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de la suppression des fichiers :", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
