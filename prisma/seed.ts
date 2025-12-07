import { PrismaClient } from '@prisma/client';

// Initialisation du client Prisma
const prisma = new PrismaClient();

/**
 * Insère ou met à jour une faculté et ses départements associés dans la base de données.
 *
 * NOTE IMPORTANTE : Les noms de facultés et de départements sont stockés SANS leurs préfixes génériques
 * ("Faculté de", "Département de") pour plus de concision.
 *
 * @param facultyName - Nom concis de la faculté (ex: 'Droit').
 * @param departments - Tableau des noms de départements concis (ex: 'Droit Public').
 * @param description - Description de la faculté.
 * @returns La faculté créée ou mise à jour.
 */
async function upsertFacultyWithDepartments(facultyName: string, departments: string[], description: string = '') {
  // Construction du nom complet pour les logs et la description
  const fullFacultyName = facultyName.includes(' ') ? `Faculté des ${facultyName}` : `Faculté de ${facultyName}`;
  console.log(`\nInsertion de la Faculté : ${facultyName} (${fullFacultyName})`);

  // 1. Upsert (mise à jour ou création) de la Faculté
  const faculty = await prisma.faculty.upsert({
    where: { name: facultyName }, // Le nom stocké est le nom concis (ex: 'Droit')
    update: { description },
    create: {
      name: facultyName,
      description: description, // Utilise la description fournie
    },
  });

  // 2. Upsert (mise à jour ou création) des Départements associés
  for (const deptName of departments) {
    // Le nom stocké est le nom concis (ex: 'Droit Public')
    await prisma.department.upsert({
      where: { name: deptName },
      update: { facultyId: faculty.id },
      create: {
        name: deptName,
        facultyId: faculty.id,
        // La description est ajustée pour inclure les mots "Département" et "Faculté"
        description: `Département de ${deptName} au sein de la faculté de(s) ${fullFacultyName}.`,
      },
    });
    console.log(`   - Département inséré/mis à jour : ${deptName}`);
  }

  return faculty;
}

/**
 * Fonction principale pour insérer uniquement les Facultés et Départements.
 */
async function main() {
  console.log('Démarrage du seeding de la structure académique...');

  // --- Insertion des 13 Facultés et leurs Départements ---
  console.log('\n--- INSERTION DES FACULTÉS ET DÉPARTEMENTS (Noms entièrement concis) ---');

  // 1. Droit
  await upsertFacultyWithDepartments('Droit', [
    'Droit Économique et Social',
    'Droit Privé et Judiciaire',
    'Droit Public',
  ], 'Formation juridique couvrant le droit privé, public et les aspects économiques et sociaux.');

  // 2. Sciences Économiques et de Gestion
  await upsertFacultyWithDepartments('Sciences Économiques et de Gestion', [
    'Économie',
    'Gestion'
  ], 'Études axées sur la théorie économique, l\'analyse quantitative et la gestion des organisations.');

  // 3. Lettres et Sciences Humaines
  await upsertFacultyWithDepartments('Lettres et Sciences Humaines', [
    'Langues et Linguistiques',
    'Histoire',
    'Philosophie',
  ], 'Recherche et enseignement dans les domaines des lettres, des langues, de l\'histoire et de la philosophie.');

  // 4. Médecine
  await upsertFacultyWithDepartments('Médecine', [
    "Anatomie Pathologique (Anapath)",
    "Anesthésie-Réanimation",
    "Biologie Médicale",
    "Chirurgie",
    "Gynécologie et Obstétrique",
    "Médecine Interne",
    "Médecine Physique et Réadaptation",
    "Odonto-stomatologie (transféré à Médecine Dentaire)",
    "Santé Publique / École de Santé Publique de Kinshasa",
    "Sciences de Base",
  ], 'Formation médicale complète, de la médecine générale aux spécialisations cliniques.');

  // 5. Médecine Vétérinaire
  await upsertFacultyWithDepartments('Médecine Vétérinaire', [
    'Clinique Vétérinaire',
    'Hygiène Alimentaire et de Santé Publique Vétérinaire',
  ], 'Études des maladies animales, de la santé publique vétérinaire et de l\'élevage.');

  // 6. Pétrole, Gaz et Énergies Renouvelables
  await upsertFacultyWithDepartments('Pétrole, Gaz et Énergies Renouvelables', [
    'Génie Pétrolier',
    'Énergies Renouvelables',
  ], 'Spécialisation dans l\'exploitation des hydrocarbures et le développement de sources d\'énergie propre.');

  // 7. Polytechnique (Génie)
  await upsertFacultyWithDepartments('Polytechnique (Génie)', [
    'Génie Civil',
    'Génie Électrique',
    'Génie Mécanique',
  ], 'Formation d\'ingénieurs dans diverses disciplines de l\'ingénierie.');

  // 8. Psychologie et des Sciences de l'Éducation (FPSE)
  await upsertFacultyWithDepartments('Psychologie et des Sciences de l\'Éducation (FPSE)', [
    'Gestion des Entreprises et Organisation du Travail',
    'Psychologie Clinique',
    'Sciences de l\'Éducation',
  ], 'Analyse du comportement humain, de l\'apprentissage et de l\'organisation du travail.');

  // 9. Sciences
  await upsertFacultyWithDepartments('Sciences', [
    'Biologie',
    'Chimie',
    "Environnement",
    'Géosciences',
    "Mathématiques et Informatique",
    'Physique',
  ], 'Recherche fondamentale et appliquée dans les sciences exactes et naturelles.');

  // 10. Sciences Agronomiques
  await upsertFacultyWithDepartments('Sciences Agronomiques', [
    'Production Végétale',
    'Zootechnie',
    'Économie Rurale',
  ], 'Études de l\'agriculture, de la production alimentaire et de la gestion des ressources naturelles.');

  // 11. Sciences Pharmaceutiques
  await upsertFacultyWithDepartments('Sciences Pharmaceutiques', [
    'Chimie Pharmaceutique',
    'Pharmacognosie',
  ], 'Formation des professionnels de la santé spécialisés dans les médicaments et la pharmacie.');

  // 12. Sciences Sociales, Administratives et Politiques (FSSAP)
  await upsertFacultyWithDepartments('Sciences Sociales, Administratives et Politiques (FSSAP)', [
    "Anthropologie",
    'Relations Internationales',
    'Sciences Politiques et Administratives',
    'Sciences du Travail',
    'Sociologie',
  ], 'Analyse des structures sociales, des systèmes politiques et de l\'administration publique.');

  // 13. Médecine Dentaire (Odonto-stomatologie)
  await upsertFacultyWithDepartments('Médecine Dentaire (Odonto-stomatologie)', [
    'Chirurgie Dentaire',
    'Prothèse Dentaire',
  ], 'Formation spécialisée dans les soins bucco-dentaires et l\'odontologie.');


  console.log('\nSeeding de la structure académique terminé avec succès.');
}

/**
 * Exécution de la fonction principale et gestion des erreurs.
 */
main()
  .catch((e) => {
    console.error('Erreur lors du seeding de la structure académique :', e);
    process.exit(1);
  })
  .finally(async () => {
    // Ferme la connexion à la base de données à la fin
    await prisma.$disconnect();
  });