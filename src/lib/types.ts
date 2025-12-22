// FILE PATH: types.ts
// Ce fichier centralise tous les types de données dérivés de Prisma, ainsi que les types
// spécifiques à l'application, pour garantir un typage strict partout.

import { Prisma, UserRole, FileType, BookType, SubscriptionType } from '@prisma/client';

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
    name: true;
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
    books: {
      include: {
        coverImage: true,
        documentFile: true,
        department: true,
        academicYear: true,
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
export { UserRole, FileType, BookType, SubscriptionType };

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
    publicationYear: number | null;
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
      include: {
        coverImage: true,
      };
      select: {
        id: true;
        title: true;
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

/**
 * Type pour une demande de prêt (LoanRequest)
 */
export type DashboardLoanRequest = Prisma.LoanRequestGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        username: true;
        email: true;
        avatarUrl: true;
      };
    };
    book: {
      select: {
        id: true;
        title: true;
        available: true;
      };
    };
  };
}>;

/**
 * Type pour un abonnement (Subscription)
 */
export type DashboardSubscription = Prisma.SubscriptionGetPayload<{
  select: {
    id: true;
    startDate: true;
    endDate: true;
    isActive: true;
    remainingDaysAtSuspension: true;
    type: true;
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
 * Type pour une demande d'abonnement (SubscriptionRequest)
 */
export type DashboardSubscriptionRequest = Prisma.SubscriptionRequestGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        username: true;
        email: true;
        avatarUrl: true;
      };
    };
  };
}>;

// Mise à jour des types d'entités financières
export type FinanceEntityType = 'loans' | 'history' | 'requests' | 'subscriptions' | 'payments' | 'loans';

// Import RequestStatus for use in filtering
export { RequestStatus } from '@prisma/client';

// Union des données possibles pour la table
export type FinanceEntityData = DashboardLoan | DashboardSubscription | DashboardPayment | DashboardUser | DashboardLoanRequest | DashboardSubscriptionRequest;


/**
 * Interface pour les props de la table de finance
 */
export interface FinanceTableProps {
  data: FinanceEntityData[];
  activeTab: FinanceEntityType;
  onEdit: (item: FinanceEntityData) => void; // À affiner selon le besoin d'édition
  onDelete: (item: { type: string; id: string }) => void;
  isAuthorized: (role: UserRole) => boolean;
  isLoading?: boolean;
}
/**
 * Type for dashboard statistics
 */
export interface DashboardStats {
  counts: {
    books: number
    users: number
    faculties: number
    studyAreas: number
  }
  recentActivity: {
    books: DashboardBook[]
    users: DashboardUser[]
  }
}

export interface LoanSchema {
    id: string;
    user: {
        name: string;
        email: string;
    };
    book?: {
        title: string;
        coverImage: {
            url: string;
        };
    };
    loanDate: Date;
    dueDate: Date;
    returnDate?: Date;
    isOverdue: boolean;
}

export interface PaymentSchema {
    userId: string;
    amount: number;
    reason: string;
    loanId?: string;
}
export interface SubscriptionSchema {
    userId: string;
    type: SubscriptionType;
    startDate: Date;
    endDate: Date;
}

// Types for dashboard actions data parameters
export interface LoanCreateData {
    userId: string;
    bookId: string;
    dueDate: string;
}

export interface SubscriptionCreateData {
    userId: string;
    type: SubscriptionType;
}

export interface PaymentCreateData {
    userId: string;
    amount: number;
    reason: string;
    loanId?: string;
}

export interface AuthorProfileCreateData {
    userId: string;
    biography: string;
    dateOfDeath?: string;
}

export interface LoanUpdateData {
    isReturned?: boolean;
    returnDate?: Date;
    dueDate?: Date;
}

export interface SubscriptionUpdateData {
    isActive?: boolean;
    endDate?: Date;
    remainingDaysAtSuspension?: number | null;
}

export interface PaymentUpdateData {
    amount?: number;
    reason?: string;
    loanId?: string;
}

// Union types for create and update actions
export type CreateEntityData =
    | FacultySchema
    | DepartmentSchema
    | StudyAreaSchema
    | BookSchema
    | LoanCreateData
    | SubscriptionCreateData
    | PaymentCreateData
    | GhostAuthorSchema
    | AuthorProfileCreateData;

export type UpdateEntityData =
    | Partial<FacultySchema>
    | Partial<DepartmentSchema>
    | Partial<StudyAreaSchema>
    | Partial<BookSchema>
    | LoanUpdateData
    | SubscriptionUpdateData
    | PaymentUpdateData
    | UserUpdateSchema;
