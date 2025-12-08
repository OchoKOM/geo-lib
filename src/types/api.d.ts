// FILE PATH: types/api.d.ts
// Rôle: Définit les types TypeScript pour les modèles Prisma utilisés dans l'API et les composants.

import { UserRole, BookType } from '@prisma/client';

// --- Types de Modèles Basiques (déduits de Prisma mais simplifiés pour le client) ---

export interface IAcademicYear {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDepartment {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  facultyId: string;
  // Relation (optionnelle pour le client)
  faculty?: IFaculty; 
}

export interface IFaculty {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  // Relation
  departments?: IDepartment[];
}

export interface IUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  // Statut de prêt
  activeLoansCount?: number;
}

export interface IAuthor {
  id: string;
  firstName: string;
  lastName: string;
  // etc. (selon votre schéma)
}

export interface IBook {
  id: string;
  title: string;
  isbn: string | null;
  type: BookType;
  publishedYear: number | null;
  departmentId: string | null;
  // Relations incluses dans les requêtes API
  department?: IDepartment;
  authors: IAuthor[];
}

export interface ILoan {
  id: string;
  loanDate: Date;
  dueDate: Date;
  returnDate: Date | null;
  isOverdue: boolean;
  userId: string;
  bookId: string | null;
}

// --- Types de Réponse API pour le Dashboard ---

export interface IDashboardStats {
  totalBooks: number;
  totalUsers: number;
  activeLoans: number;
  overdueLoans: number;
}

export interface IDashboardData {
  stats: IDashboardStats;
  books: IBook[];
  users: IUser[];
  faculties: IFaculty[];
  departments: IDepartment[];
  academicYears: IAcademicYear[];
  loans: ILoan[];
}

export interface IApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: string;
}

export interface IApiError {
  success: false;
  error: string;
}