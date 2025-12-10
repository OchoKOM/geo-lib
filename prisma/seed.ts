import { PrismaClient } from '@prisma/client';

// Initialisation du client Prisma
const prisma = new PrismaClient();

/**
 * Génère et insère un historique d'années académiques dans la base de données.
 * Les années académiques sont définies du 1er octobre de l'année N au 30 septembre de l'année N+1.
 *
 * @param startYear - L'année de début (ex: 1950 pour l'année 1950-1951).
 */
async function seedAcademicYears(startYear: number) {
  // Déterminer l'année de début pour le cycle académique en cours.
  // Si nous sommes avant octobre, le cycle N/N+1 a commencé l'année N-1.
  // Si nous sommes en octobre ou après, le cycle N/N+1 a commencé l'année N.
  const now = new Date();
  const currentCalendarYear = now.getFullYear();
  
  let currentAcademicStartYear = currentCalendarYear;

  // Si le mois est Janvier (0) à Septembre (8), l'année académique actuelle
  // a commencé l'année précédente (N-1).
  if (now.getMonth() < 9) { 
    currentAcademicStartYear -= 1;
  }
  
  const endYear = currentAcademicStartYear + 1; // Ex: si on est en 2025, l'année académique courante est 2025-2026
  
  const count = endYear - startYear;

  console.log(`\n--- INSERTION DES ANNÉES ACADÉMIQUES (${startYear}-${startYear + 1} à ${currentAcademicStartYear}-${currentAcademicStartYear + 1}) ---`);
  
  const yearsToInsert = [];

  for (let i = 0; i < count; i++) {
    const currentStartYear = startYear + i;
    const currentEndYear = currentStartYear + 1;

    // Format de l'année : "2024-2025"
    const yearString = `${currentStartYear}-${currentEndYear}`;
    
    // Convention: Début au 1er octobre (année N)
    const startDate = new Date(currentStartYear, 9, 1); // Mois 9 = Octobre
    
    // Convention: Fin au 30 septembre (année N+1)
    const endDate = new Date(currentEndYear, 8, 30); // Mois 8 = Septembre

    yearsToInsert.push({
      year: yearString,
      startDate: startDate,
      endDate: endDate,
    });
  }

  // Utilisation de upsert séquentiel pour insérer ou mettre à jour
  for (const data of yearsToInsert) {
    await prisma.academicYear.upsert({
      where: { year: data.year },
      update: {}, // Pas de mise à jour nécessaire si l'année existe déjà
      create: data,
    });
    // console.log(`   - Année académique insérée/mise à jour : ${data.year}`); // Décommenter si besoin de plus de logs
  }
  
  console.log(`   - ${yearsToInsert.length} années académiques traitées.`);
}

/**
 * Fonction principale pour exécuter le seeding.
 */
async function main() {
  console.log('Démarrage du seeding des années académiques...');
  
  // Insérer l'historique complet depuis 1950
  await seedAcademicYears(1950);

  console.log('\nSeeding des années académiques terminé avec succès.');
}

/**
 * Exécution de la fonction principale et gestion des erreurs.
 */
main()
  .catch((e) => {
    console.error('Erreur lors du seeding des années académiques :', e);
    process.exit(1);
  })
  .finally(async () => {
    // Ferme la connexion à la base de données à la fin
    await prisma.$disconnect();
  });