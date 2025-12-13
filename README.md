# GeoLib Documentation

## Vue d'ensemble

GeoLib est une plateforme web moderne conçue pour la gestion et l'accès à des documents académiques géolocalisés. Elle permet aux utilisateurs de rechercher, consulter et emprunter des travaux académiques (TFC, mémoires, thèses, articles, etc.) associés à des zones géographiques spécifiques.

La plateforme intègre des fonctionnalités avancées de cartographie, d'authentification sécurisée et de gestion documentaire, facilitant l'accès aux ressources académiques dans le domaine des sciences de la terre et de la géographie.

## Fonctionnalités principales

### 🔍 Recherche et filtrage avancé
- Recherche textuelle dans les titres et descriptions
- Filtrage par type de document (TFC, Mémoire, Thèse, Article, etc.)
- Filtrage par année académique
- Filtrage par zone géographique
- Filtrage par faculté et département

### 🗺️ Géolocalisation et cartographie
- Intégration de cartes interactives avec Leaflet
- Support des géométries PostGIS (Point, Polygon, LineString, etc.)
- Visualisation des zones d'étude associées aux documents
- Éditeur de cartes intégré pour la création de zones d'étude

### 👥 Gestion des utilisateurs et rôles
- Système d'authentification sécurisé avec Lucia
- Quatre rôles utilisateur : Lecteur, Auteur, Bibliothécaire, Administrateur
- Profils d'auteur avec biographies
- Gestion des avatars utilisateur

### 📚 Gestion documentaire
- Catalogue de documents académiques
- Gestion des prêts et retours
- Système de fichiers avec UploadThing
- Support de différents types de fichiers (PDF, GeoJSON, images)

### 💰 Gestion financière
- Système d'abonnements
- Gestion des paiements
- Suivi des prêts en retard

## Pile technologique

### Frontend
- **Next.js 16** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS utilitaire
- **Radix UI** - Composants d'interface accessibles
- **Leaflet** - Bibliothèque de cartographie
- **React Leaflet** - Intégration React pour Leaflet

### Backend
- **Next.js API Routes** - API RESTful
- **Prisma** - ORM de base de données
- **PostgreSQL** - Base de données principale
- **PostGIS** - Extension géospatiale pour PostgreSQL

### Authentification et sécurité
- **Lucia** - Bibliothèque d'authentification
- **Argon2** - Hachage des mots de passe

### Outils de développement
- **ESLint** - Linting du code
- **TypeScript** - Compilation et vérification de types
- **Prisma Studio** - Interface graphique pour la base de données

### Déploiement et stockage
- **Vercel** - Plateforme de déploiement
- **UploadThing** - Service de stockage de fichiers

## Installation et configuration

### Prérequis
- Node.js 18+
- PostgreSQL 13+ avec extension PostGIS
- npm ou yarn

### Installation

1. **Cloner le repository**
```bash
git clone https://github.com/OchoKOM/geo-lib
cd geo-lib
```

2. **Installer les dépendances**
```bash
npm install --legacy-peer-deps
```

3. **Configuration de la base de données**
   - Créer une base de données PostgreSQL
   - Activer l'extension PostGIS :
```sql
CREATE EXTENSION postgis;
```

4. **Configuration des variables d'environnement**
   Créer un fichier `.env.local` à la racine du projet :
```env
DATABASE_URL="postgresql://username:password@localhost:5432/geolib"
NEXTAUTH_SECRET="your-secret-key"
UPLOADTHING_SECRET="your-uploadthing-secret"
UPLOADTHING_APP_ID="your-uploadthing-app-id"
```

5. **Migration de la base de données**
```bash
npm run db:push
```

6. **Seeding de la base de données (optionnel)**
```bash
npm run db:seed
```

7. **Lancer le serveur de développement**
```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000).

## Structure du projet

```
geo-lib/
├── prisma/
│   ├── schema.prisma          # Schéma de base de données
│   ├── seed.ts               # Données de test
│   └── migrations/           # Migrations Prisma
├── public/                   # Assets statiques
├── src/
│   ├── app/                  # Pages Next.js (App Router)
│   │   ├── api/              # Routes API
│   │   ├── (auth)/           # Pages d'authentification
│   │   └── (main)/           # Pages principales
│   ├── components/           # Composants React
│   │   ├── ui/               # Composants UI réutilisables
│   │   ├── home/             # Composants de la page d'accueil
│   │   ├── dashboard/        # Composants du tableau de bord
│   │   └── map/              # Composants cartographiques
│   ├── lib/                  # Utilitaires et configurations
│   ├── types/                # Définitions TypeScript
│   └── context/              # Contextes React
├── package.json
├── tailwind.config.ts
├── next.config.ts
└── tsconfig.json
```

## Schéma de base de données

### Modèles principaux

#### Utilisateurs et authentification
- **User** : Utilisateurs avec rôles (READER, AUTHOR, LIBRARIAN, ADMIN)
- **Session** : Sessions d'authentification
- **Key** : Clés d'authentification Lucia
- **AuthorProfile** : Profils d'auteurs

#### Documents académiques
- **Book** : Documents (TFC, mémoires, thèses, etc.)
- **BookType** : Énumération des types de documents
- **AcademicYear** : Années académiques
- **Faculty** : Facultés universitaires
- **Department** : Départements

#### Géospatial
- **StudyArea** : Zones d'étude géographiques
- **GeometryType** : Types de géométries (POINT, POLYGON, etc.)
- **BookStudyArea** : Relation documents-zones

#### Gestion
- **Loan** : Prêts de documents
- **Payment** : Paiements
- **Subscription** : Abonnements
- **File** : Fichiers uploadés

## API Routes

### Authentification
- `POST /api/auth` - Authentification utilisateur

### Documents
- `GET /api/books` - Liste des documents
- `POST /api/books` - Créer un document

### Auteurs
- `GET /api/authors` - Liste des auteurs
- `GET /api/authors/profile` - Profil d'auteur

### Zones d'étude
- `GET /api/study-areas` - Liste des zones
- `GET /api/study-areas/search` - Recherche de zones

### Tableau de bord
- `GET /api/dashboard` - Données du tableau de bord
- `GET /api/dashboard/stats` - Statistiques

## Utilisation

### Pour les utilisateurs
1. **Inscription/Connexion** : Créer un compte ou se connecter
2. **Recherche** : Utiliser la barre de recherche et les filtres
3. **Consultation** : Parcourir les documents et visualiser sur la carte
4. **Emprunt** : Réserver des documents disponibles

### Pour les auteurs
- Publier de nouveaux documents
- Gérer leur profil et biographie
- Associer des zones géographiques à leurs travaux

### Pour les bibliothécaires
- Gérer le catalogue documentaire
- Valider les emprunts et retours
- Gérer les utilisateurs

### Pour les administrateurs
- Accès complet à toutes les fonctionnalités
- Gestion des utilisateurs et rôles
- Configuration système

## Développement

### Scripts disponibles
```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run start        # Serveur de production
npm run lint         # Linting du code
npm run db:push      # Push du schéma Prisma
npm run db:seed      # Seeding de la base de données
```

### Conventions de code
- Utilisation de TypeScript strict
- Composants fonctionnels avec hooks
- Nommage en camelCase pour les variables, PascalCase pour les composants
- Utilisation des types Prisma générés

### Tests
*(À implémenter)*

## Déploiement

### Sur Vercel
1. Connecter le repository GitHub à Vercel
2. Configurer les variables d'environnement
3. Déployer automatiquement à chaque push

### Configuration de production
- Variables d'environnement sécurisées
- Base de données PostgreSQL managée
- CDN pour les fichiers statiques

## Contribution

1. Forker le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commiter les changements (`git commit -am 'Ajout de nouvelle fonctionnalité'`)
4. Pousser vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créer une Pull Request

### Guidelines
- Respecter les conventions de code
- Écrire des commits descriptifs
- Tester les changements
- Mettre à jour la documentation si nécessaire

## Support et contact

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Contacter l'équipe de développement

## Licence

*(À définir)*

---

*Documentation générée pour GeoLib - Plateforme de documents académiques géolocalisés*
