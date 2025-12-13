// Fichier : components/AuthProvider.tsx
'use client';

import { SessionDatabaseAttributes } from '@/lib/auth';
import * as React from 'react';

// Définition simplifiée pour le rôle public
type PublicRole = 'INVITE' | 'READER' | 'AUTHOR' | 'LIBRARIAN' | 'ADMIN';

/**
 * @typedef AuthContextType
 * @description Structure des données exposées par le contexte.
 */
interface AuthContextType {
  // L'utilisateur est maintenant de type SessionDatabaseAttributes (objet) ou null (déconnecté).
  user: SessionDatabaseAttributes | null;
  isAuthenticated: boolean;
  // Le rôle est toujours défini (soit le rôle réel, soit 'INVITE')
  role: PublicRole;
}

// -----------------------------------------------------------------------------
// 2. Création et Utilisation du Contexte
// -----------------------------------------------------------------------------

// Le contexte est créé avec 'undefined' car l'initialisation dans le Provider est obligatoire.
const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

/**
 * Hook personnalisé pour accéder facilement aux informations d'authentification.
 * @returns {AuthContextType} L'objet contenant user, isAuthenticated et role.
 */
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    // Cette erreur garantit que le hook n'est pas utilisé en dehors du Provider
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
}

// -----------------------------------------------------------------------------
// 3. Composant Provider
// -----------------------------------------------------------------------------

interface AuthProviderProps {
  // L'utilisateur initial est récupéré côté serveur et peut être null
  initialUser: SessionDatabaseAttributes | null;
  children: React.ReactNode;
}

/**
 * Fournit l'état d'authentification et les informations utilisateur à l'arbre de composants.
 */
export function AuthProvider({ initialUser, children }: AuthProviderProps) {
  // On utilise l'état pour permettre une mise à jour future, même si initialUser peut être null.
  const [user] = React.useState<SessionDatabaseAttributes | null>(initialUser);

  // Détermine si l'utilisateur est authentifié.
  const isAuthenticated = !!user;
  
  // Définit le rôle : le rôle de l'utilisateur ou 'INVITE' s'il est déconnecté.
  const userRole: PublicRole = user ? user.role as PublicRole : 'INVITE';

  const value: AuthContextType = {
    user: user,
    isAuthenticated: isAuthenticated,
    role: userRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}