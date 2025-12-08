// FILE PATH: types.ts
// Ce fichier centralise tous les types de données dérivés de Prisma, ainsi que les types
// spécifiques à l'application, pour garantir un typage strict partout.

import { Prisma, UserRole, FileType, BookType } from '@prisma/client';

// ----------------------------------------------------
// 1. TYPES DÉRIVÉS DES MODÈLES PRISMA (POUR LE FRONTEND)
// ----------------------------------------------------

// Définition de types d'inclusion (utiles pour les requêtes API)
// Cette technique permet de définir un type TypeScript complexe basé sur la structure
// de la requête Prisma (SELECT/INCLUDE) en utilisant les utilitaires de Prisma.

/**
 * Type pour un Utilisateur avec ses relations minimales (pour l'affichage du dashboard).
 */
export type DashboardUser = Prisma.UserGetPayload<{
  select: {
    id: true;
    username: true;
    email: true;
    role: true;
    isSuspended: true;
    createdAt: true;
  };
}>;

/**
 * Type pour un Département avec ses relations minimales.
 */
export type DashboardDepartment = Prisma.DepartmentGetPayload<{
  include: {
    faculty: {
      select: {
        id: true;
        name: true;
      };
    };
    studyAreas: {
        select: {
            id: true;
            name: true;
        }
    };
  };
}>;

/**
 * Type pour une Faculté.
 */
export type DashboardFaculty = Prisma.FacultyGetPayload<{
  select: {
    id: true;
    name: true;
    createdAt: true;
  };
}>;

/**
 * Type pour un Domaine d'Étude.
 */
export type DashboardStudyArea = Prisma.StudyAreaGetPayload<{
  select: {
    id: true;
    name: true;
    description: true;
    departmentId: true;
  };
}>;


/**
 * Type pour un Livre avec ses relations minimales.
 */
export type DashboardBook = Prisma.BookGetPayload<{
  include: {
    author: {
      select: {
        id: true;
        username: true;
      };
    };
    department: {
      select: {
        id: true;
        name: true;
      };
    };
    studyAreas: {
      include: {
        studyArea: {
          select: {
            id: true;
            name: true;
          }
        }
      }
    };
  };
}>;

// ----------------------------------------------------
// 2. TYPES ET ENUMS D'UTILITAIRES
// ----------------------------------------------------

// Exportation des Enums de Prisma pour un accès facile
export { UserRole, FileType, BookType };

/**
 * Union des types d'entités manipulables dans le dashboard.
 */
export type EntityType = 'users' | 'books' | 'departments' | 'faculties' | 'studyareas';

/**
 * Type générique pour les données du dashboard
 */
export type EntityData = DashboardUser | DashboardBook | DashboardDepartment | DashboardFaculty | DashboardStudyArea;

/**
 * Structure de réponse générique pour les appels API du dashboard.
 * @template T Le type de données de l'entité (e.g., DashboardBook[]).
 */
export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

/**
 * Structure d'une action et des données associées pour l'édition/création.
 */
export type ActionData = {
  type: EntityType;
  id?: string; // Présent pour l'édition
  data: Partial<DashboardBook | DashboardDepartment | DashboardFaculty | DashboardStudyArea | DashboardUser>;
}

// ----------------------------------------------------
// 3. SCHÉMAS DE REQUÊTES
// ----------------------------------------------------

// Les schémas de données pour les actions POST/PATCH

/**
 * Schéma pour la création/modification d'un Département
 */
export interface DepartmentSchema {
    name: string;
    description: string;
    facultyId: string;
}

/**
 * Schéma pour la création/modification d'une Faculté
 */
export interface FacultySchema {
    name: string;
}

/**
 * Schéma pour la création/modification d'un Domaine d'Étude
 */
export interface StudyAreaSchema {
    name: string;
    description: string;
    departmentId: string;
}

/**
 * Schéma pour la création/modification d'un Livre
 */
export interface BookSchema {
    title: string;
    description: string;
    publicationYear: Date;
    type: BookType;
    departmentId: string;
    authorId: string;
    studyAreaIds: string[]; // IDs des domaines
}

/**
 * Schéma pour la modification de l'Utilisateur (rôle et suspension)
 */
export interface UserUpdateSchema {
    role: UserRole;
    isSuspended: boolean;
}