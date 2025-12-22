import prisma from '@/lib/prisma';
import { UTApi } from 'uploadthing/server';


export async function GET(req: Request) {
    const authHeader = req.headers.get("Authorization");

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization header" }),
        { status: 401 },
      );
    }
    console.log('--- DÉCLENCHEMENT DU CRON JOB : SUPPRESSION DES FICHIERS MARQUÉS COMME SUPPRIMÉS DE PLUS DE 24H DE VIE ---');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      const deletedFiles = await prisma.file.findMany({
        where: {
          isDeleted: true,
          createdAt: { lt: twentyFourHoursAgo },
        },
      });
      
      deletedFiles.forEach(async file => {
        const key = file.url.split('/').pop();
        if (key) {
            new UTApi().deleteFiles(key).catch((error) => {
                console.error(`Erreur lors de la suppression du fichier ${file.id} de UploadThing :`, error);
            });
            await prisma.file.delete({
                where: { id: file.id },
            });
            console.log(`[SUPPRIMÉ] Fichier ID ${file.id} supprimé de la base et d'UploadThing.`);
        }
        });
        return new Response(
        JSON.stringify({ status: 'success', deletedCount: deletedFiles.length }),
        { status: 200 },
      );
    } catch (error) {
      console.error('Erreur lors de la suppression des fichiers :', error);
      return new Response(
        JSON.stringify({ error: 'Internal Server Error' }),
        { status: 500 },
      );
    }
}
