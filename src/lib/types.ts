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
    avatarUrl: true;
    createdAt: true;
    authorProfile: true;
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

export type DashboardFile = Prisma.FileGetPayload<{
  select: {
    id: true;
    name: true;
    mimeType: true;
    url: true;
    type: true;
    size: true;
    createdAt: true;
  }
}>

export type DashBoardAuthorProfile = Prisma.AuthorProfileGetPayload<{
  include: {
    user: {
      select: {
        name: true,
        username: true,
        dateOfBirth: true,
      }
    }
  }
}>


/**
 * Type pour un Livre avec ses relations minimales.
 */
export type DashboardBook = Prisma.BookGetPayload<{
  include: {
    author: {
      select: {
        id: true;
        user: {
          select: {
            id: true;
            name: true;
            username: true;
          }
        }
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
    documentFile: {
      select: {
        id: true;
        name: true;
        mimeType: true;
        url: true;
        type: true;
        size: true;
        createdAt: true;
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
export type EntityType = 'users' | 'books' | 'departments' | 'faculties' | 'studyareas' | "author_profiles" | "create_ghost_author";

/**
 * Type générique pour les données du dashboard
 */
export type EntityData = DashboardUser | DashboardBook | DashboardDepartment | DashboardFaculty | DashboardStudyArea | DashBoardAuthorProfile ;

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
export interface FileSchema {
  id: string;
    name: string;
    mimeType: string;
    url: string;
    type: FileType;
    size: number;
}
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
    authorId?: string; // Lien optionnel vers un auteur
    studyAreaIds: string[];
    documentFileId?: string; // ID du fichier uploadé
    academicYearId?: string;
    coverImageId?: string;
    documentFile?: FileSchema; // Fichier uploadé
}

/**
 * Schéma pour la modification de l'Utilisateur (rôle et suspension)
 */
export interface UserUpdateSchema {
    role: UserRole;
    isSuspended: boolean;
}

// Schéma pour la création d'auteur "Fantôme" (Décédé/Historique)
export interface GhostAuthorSchema {
    name: string;
    biography: string;
    dateOfBirth?: string; // ISO String
    dateOfDeath?: string; // ISO String
}

// AJOUTER CECI À VOTRE FICHIER types.ts EXISTANT

/**
 * Type pour un Prêt (Loan) avec relations
 */
export type DashboardLoan = Prisma.LoanGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        username: true;
        email: true;
      };
    };
    book: {
      select: {
        id: true;
        title: true;
      };
    };
  };
}>;

/**
 * Type pour un Abonnement (Subscription)
 */
export type DashboardSubscription = Prisma.SubscriptionGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        username: true;
        email: true;
      };
    };
  };
}>;

/**
 * Type pour un Paiement (Payment)
 */
export type DashboardPayment = Prisma.PaymentGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        username: true;
      };
    };
    loan: {
        select: {
            book: {
                select: {
                    title: true;
                }
            }
        }
    }
  };
}>;

export type FinanceEntityType = 'loans' | 'subscriptions' | 'payments' | 'profile';
export type FinanceEntityData = DashboardLoan | DashboardSubscription | DashboardPayment | DashboardUser;

export interface LoanSchema {
    userId: string;
    bookId: string;
    dueDate: Date;
}

export interface PaymentSchema {
    userId: string;
    amount: number;
    reason: string;
    loanId?: string;
}
export interface SubscriptionSchema {
    userId: string;
    type: 'monthly' | 'yearly';
    startDate: Date;
    endDate: Date;
}