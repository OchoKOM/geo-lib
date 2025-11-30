import { PrismaClient, UserRole, GeometryType, FileType } from '@prisma/client';
// Importation de la librairie de hachage des mots de passe
import * as argon2 from '@node-rs/argon2'; 

// Initialisation du client Prisma
const prisma = new PrismaClient();

/**
 * Fonction principale pour insérer les données de test.
 */
async function main() {
  console.log('Début du processus de seeding...');

  // --- 1. Hachage du mot de passe de base ---
  const defaultPassword = 'Password123!';
  const passwordHash = await argon2.hash(defaultPassword);
  console.log(`Mot de passe par défaut haché pour tous les utilisateurs : ${defaultPassword}`);

  // --- 2. Création des Utilisateurs (Rôles variés) ---
  console.log('Création des utilisateurs (ADMIN, AUTHOR, LIBRARIAN, READER)...');
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@geolib.edu' },
    update: {},
    create: {
      email: 'admin@geolib.edu',
      passwordHash: passwordHash,
      name: 'Dr. Jean Dupont (Admin)',
      role: UserRole.ADMIN,
      bio: 'Administrateur système et gestionnaire de la plateforme GeoLib.',
    },
  });

  const authorUser = await prisma.user.upsert({
    where: { email: 'auteur@geolib.edu' },
    update: {},
    create: {
      email: 'auteur@geolib.edu',
      passwordHash: passwordHash,
      name: 'Prof. Marie Curie (Auteur)',
      role: UserRole.AUTHOR,
      bio: 'Professeur en hydrologie et auteur de plusieurs études publiées.',
    },
  });

  const librarianUser = await prisma.user.upsert({
    where: { email: 'biblio@geolib.edu' },
    update: {},
    create: {
      email: 'biblio@geolib.edu',
      passwordHash: passwordHash,
      name: 'Mme. Sophie Moreau (Bibliothécaire)',
      role: UserRole.LIBRARIAN,
      bio: 'Responsable du catalogage et des prêts physiques.',
    },
  });
  
  // Création du profil d'auteur lié à l'utilisateur 'auteur@geolib.edu'
  const authorProfile = await prisma.authorProfile.upsert({
    where: { userId: authorUser.id },
    update: {},
    create: {
      userId: authorUser.id,
      biography: "Professeure Marie Curie est reconnue pour ses travaux pionniers sur l'impact du changement climatique sur les bassins fluviaux africains.",
    },
  });


  // --- 3. Création des Départements et Années Académiques ---
  console.log('Création des départements et années académiques...');

  const geoDept = await prisma.department.upsert({
    where: { name: 'Département de Géographie' },
    update: {},
    create: { name: 'Département de Géographie', description: 'Études géospatiales et aménagement du territoire.' },
  });

  const miningDept = await prisma.department.upsert({
    where: { name: 'Mines et Métallurgie' },
    update: {},
    create: { name: 'Mines et Métallurgie', description: 'Recherche et exploitation des ressources minérales.' },
  });

  const currentYear = await prisma.academicYear.upsert({
    where: { year: '2024-2025' },
    update: {},
    create: {
      year: '2024-2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-06-30'),
    },
  });
  
  // --- 4. Création des Fichiers Factices (Simulés) ---
  console.log('Création des entrées de fichiers factices...');
  
  // Fichier GeoJSON pour un Point (Station)
  const stationFile = await prisma.file.create({
    data: {
      url: '/assets/geojson/station_kinkole.json',
      name: 'Station_Kinkole.geojson',
      mimeType: 'application/geo+json',
      size: 1024,
      type: FileType.GEOJSON_DATA,
    },
  });
  
  // Fichier GeoJSON pour un Polygone (Bassin Versant)
  const bassinFile = await prisma.file.create({
    data: {
      url: '/assets/geojson/bassin_versant_ndjili.json',
      name: 'Bassin_Ndjili.geojson',
      mimeType: 'application/geo+json',
      size: 51200,
      type: FileType.GEOJSON_DATA,
    },
  });

  // Fichier PDF (Document du Livre)
  const bookPdfFile = await prisma.file.create({
    data: {
      url: '/assets/documents/geologie_kivu.pdf',
      name: 'Géologie_Kivu_Rapport.pdf',
      mimeType: 'application/pdf',
      size: 2048000,
      type: FileType.DOCUMENT_PDF,
    },
  });

  // --- 5. Création des Zones d'Étude ---
  console.log('Création des zones d\'étude...');
  
  const pointArea = await prisma.studyArea.create({
    data: {
      name: 'Station Météo Kinkole',
      description: 'Point de prélèvement et station météorologique principale.',
      geometryType: GeometryType.POINT,
      centerLat: -4.4093, // Coordonnées simulées pour Kinshasa
      centerLng: 15.3905,
      geojsonFileId: stationFile.id,
    },
  });

  const polyArea = await prisma.studyArea.create({
    data: {
      name: 'Bassin Versant de la N\'djili',
      description: 'Zone d\'étude hydrologique majeure près de Kinshasa.',
      geometryType: GeometryType.POLYGON,
      centerLat: -4.38,
      centerLng: 15.42,
      geojsonFileId: bassinFile.id,
    },
  });
  
  // --- 6. Création des Livres et Liens ---
  console.log('Création des livres et établissement des relations...');

  const book1 = await prisma.book.create({
    data: {
      title: 'Monographie Géologique du Kivu',
      description: 'Analyse détaillée des formations rocheuses et des ressources minérales de la région du Kivu.',
      location: 'RAYON G-14',
      authorId: authorProfile.id,
      departmentId: miningDept.id,
      academicYearId: currentYear.id,
      documentFileId: bookPdfFile.id, // Lien vers le PDF
      
      // Liaison avec la zone d'étude Polygon
      studyAreas: {
        create: [
          { studyAreaId: polyArea.id },
          { studyAreaId: pointArea.id }, // Un livre peut couvrir plusieurs zones
        ],
      },
    },
  });

  // Livre factice sans zone d'étude pour le catalogue général
  const book2 = await prisma.book.create({
    data: {
      title: 'Introduction aux Systèmes d\'Information Géographique (SIG)',
      description: 'Manuel fondamental pour la maîtrise des outils SIG, première édition.',
      location: 'RAYON SIG-01',
      departmentId: geoDept.id,
      academicYearId: currentYear.id,
    },
  });


  // --- 7. Création des Données de Prêt (Exemple) ---
  console.log('Création d\'un prêt factice...');

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14); // Échéance dans 14 jours

  await prisma.loan.create({
    data: {
      userId: adminUser.id, // L'admin emprunte le livre 1
      bookId: book1.id,
      dueDate: dueDate,
      // Le champ `isOverdue` sera calculé ou mis à jour par une tâche
    },
  });

  console.log('Processus de seeding terminé avec succès !');
}

/**
 * Exécution de la fonction principale et gestion des erreurs.
 */
main()
  .catch((e) => {
    console.error('Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    // Ferme la connexion à la base de données à la fin
    await prisma.$disconnect();
  });