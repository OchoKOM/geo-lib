// FILE PATH: lib/auth.ts
// ROLE: Configuration centrale de la bibliothèque d'authentification Lucia Auth.
// Ceci initialise l'adaptateur Prisma, et inclut la fonction de validation de requête.
// La déclaration des types globaux a été déplacée vers types/auth.d.ts.

import { Lucia, Session } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
// Importe le modèle User de Prisma avec un alias, plus le client
import { User as PrismaUser } from '@prisma/client';
import prisma from './prisma'; // Use the singleton PrismaClient
import { cache } from 'react'; // Utiliser 'cache' pour optimiser la validation par requête
import { cookies } from 'next/headers'; // Nécessaire pour accéder aux cookies

// --- DÉFINITION DU TYPE DE BASE DE DONNÉES POUR LUCIA ---
/**
 * @type SessionDatabaseAttributes
 * @description Définit les attributs de l'utilisateur stockés dans la base de données 
 * que nous voulons exposer dans l'objet de session de Lucia. 
 * Utilise 'Pick' pour inclure uniquement les champs nécessaires de PrismaUser.
 */
type SessionDatabaseAttributes = Pick<PrismaUser,
    | 'id'
    | 'email'
    | 'name'
    | 'username'
    | 'role'
    | 'bio'
    | 'createdAt'
    | 'avatarUrl'
    | 'dateOfBirth'
>;


// --- 2. Configuration de l'Adaptateur Lucia/Prisma ---
// L'adaptateur relie Lucia à nos tables 'user' et 'session' dans la base de données.
const adapter = new PrismaAdapter(prisma.session, prisma.user);

// --- 3. Initialisation de Lucia ---
// On crée l'instance centrale de Lucia.
export const lucia = new Lucia(adapter, {
    // Options de session
    sessionCookie: {
        // Durée de vie maximale du cookie de session
        expires: false,
        // Conservation de la résolution utilisateur pour l'attribut 'secure'
        attributes: {
            secure: process.env.NODE_ENV === 'production',
        }
    },

    // Options pour définir le contenu de la session (session.user)
    // On utilise le type précis SessionDatabaseAttributes
    getUserAttributes: (attributes: SessionDatabaseAttributes) => {
        return {
            id: attributes.id, // L'ID de l'utilisateur est crucial
            email: attributes.email,
            name: attributes.name,
            username: attributes.username,
            role: attributes.role,
            bio: attributes.bio,
            createdAt: attributes.createdAt,
            avatarUrl: attributes.avatarUrl,
            dateOfBirth: attributes.dateOfBirth,
        };
    },
});

// --- 4. Déclaration des Types Locaux (pour l'export) ---
// Cette interface est maintenant un alias du type SessionDatabaseAttributes.
type DatabaseUserAttributes = SessionDatabaseAttributes

declare module 'lucia' {
    interface Register {
        Lucia: typeof lucia;
        DatabaseUserAttributes: DatabaseUserAttributes;
        UserId: string;
    }
}

// Nous ré-exportons le type pour l'utiliser dans d'autres modules si nécessaire.
export type DatabaseUser = Awaited<ReturnType<typeof lucia["getUserAttributes"]>>;


// --- 5. Fonction de Validation de Requête (Optimisation et Sécurité) ---
/**
 * @function validateRequest
 * @description Fonction centrale pour valider la session à partir des cookies.
 * Elle est mise en cache pour ne s'exécuter qu'une seule fois par requête.
 * @returns {Promise<{ user: import("lucia").User; session: Session } | { user: null; session: null }>}
 */
export const getSession = cache(
    async (): Promise<
        { user: import("lucia").User; session: Session } | { user: null; session: null }
    > => {
        // cookies() peut être async dans certains contextes Next.js
        const cookieStore = await cookies();
        const sessionId = cookieStore.get(lucia.sessionCookieName)?.value ?? null;

        if (!sessionId) {
            return { user: null, session: null };
        }

        // Valide la session auprès de Lucia et de la base de données
        const result = await lucia.validateSession(sessionId);

        // Note: Cookie setting should be handled by the caller or Lucia middleware
        // In server components, cookies cannot be set directly

        return result;
    }
);
