// FILE PATH: lib/auth.ts
// ROLE: Configuration centrale de la bibliothèque d'authentification Lucia Auth.
// Ceci initialise l'adaptateur Prisma, et inclut la fonction de validation de requête.
// La déclaration des types globaux a été déplacée vers types/auth.d.ts.

import { Lucia, Session } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
// Importe le modèle User de Prisma avec un alias, plus le client
import { PrismaClient, User as PrismaUser } from '@prisma/client'; 
import { cache } from 'react'; // Utiliser 'cache' pour optimiser la validation par requête
import { cookies } from 'next/headers'; // Nécessaire pour accéder aux cookies

// --- 1. Initialisation Optimisée du Client Prisma ---
// Nous utilisons une technique pour nous assurer qu'une seule instance de PrismaClient 
// est créée, en particulier dans un environnement Node.js/Next.js (où le Hot Module 
// Reloading peut entraîner la création de multiples instances).
declare global {
    // Cette déclaration permet de typer l'objet global avec notre client Prisma
    var prisma: PrismaClient | undefined;
}

// Assurez-vous d'avoir une seule instance de PrismaClient pour éviter les avertissements/erreurs.
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

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
    | 'role' 
    | 'bio' 
    | 'createdAt'
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
            role: attributes.role,
            bio: attributes.bio,
            createdAt: attributes.createdAt,
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
        // CORRECTION APPLIQUÉE : Await sur cookies() et stockage dans une variable
        // pour résoudre l'erreur de typage liée à la Promise.
        const cookieStore = await cookies(); // Retiré l'await pour la version la plus à jour de Next.js
        const sessionId = cookieStore.get(lucia.sessionCookieName)?.value ?? null; // Utilisez le store

        if (!sessionId) {
            return { user: null, session: null };
        }

        // Valide la session auprès de Lucia et de la base de données
        const result = await lucia.validateSession(sessionId);

        try {
            // NOTE: Si le type cookies() est réellement Promise, vous devrez décommenter ceci
            // et utiliser await:
            // const cookieStore = await cookies();

            if (result.session && result.session.fresh) {
                const sessionCookie = lucia.createSessionCookie(result.session.id);
                cookieStore.set( // Utilisation de cookieStore.set
                    sessionCookie.name,
                    sessionCookie.value,
                    sessionCookie.attributes
                );
            }
            if (!result.session) {
                const sessionCookie = lucia.createBlankSessionCookie();
                cookieStore.set( // Utilisation de cookieStore.set
                    sessionCookie.name,
                    sessionCookie.value,
                    sessionCookie.attributes
                );
            }
        } catch (error) {
            console.error("Erreur lors de la manipulation des cookies de session:", error);
        }

        return result;
    }
);