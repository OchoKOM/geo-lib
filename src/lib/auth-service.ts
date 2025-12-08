// FILE PATH: lib/auth-service.ts
// ROLE: Fonctions de logique métier pour l'authentification (Register, Login, Logout).
// Utilise Zod pour la validation, Argon2 pour le hachage, et Lucia pour la gestion des sessions.

import { z } from 'zod';
import { lucia, getSession } from './auth'; 
import { hash, verify } from '@node-rs/argon2'; 
import { PrismaClient, UserRole } from '@prisma/client';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers'; 

// --- Initialisation du client Prisma (réutilisation de l'instance globale) ---
declare global {
    var prisma: PrismaClient | undefined;
}
const prisma = global.prisma || new PrismaClient();


// -----------------------------------------------------------------------------
// SCHÉMAS DE VALIDATION ZOD
// -----------------------------------------------------------------------------

/**
 * @const LoginSchema
 * @description Schéma Zod pour la validation des données du formulaire de connexion.
 */
export const LoginSchema = z.object({
    email: z.string().email({ message: "L'adresse e-mail n'est pas valide." }).trim().toLowerCase(),
    password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." }),
});

/**
 * @const RegisterSchema
 * @description Schéma Zod pour la validation des données du formulaire d'inscription.
 */
export const RegisterSchema = z.object({
    name: z.string()
        .min(2, { message: "Le nom doit contenir au moins 2 caractères." })
        .max(50),

    email: z.string()
        .email({ message: "L'adresse e-mail n'est pas valide." })
        .trim()
        .toLowerCase(),

    password: z.string()
        .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." }),

    username: z.string()
        .regex(
            /^[a-zA-Z][a-zA-Z0-9-_]{2,19}$/,
            {
                message: "Le username doit commencer par une lettre et contenir uniquement lettres, chiffres, - ou _ (3 à 20 caractères)."
            }
        )
});


// -----------------------------------------------------------------------------
// FONCTIONS UTILITAIRES DE SESSION
// -----------------------------------------------------------------------------

/**
 * @function createSessionWithData
 * @description Crée une nouvelle session Lucia, un cookie, et enregistre 
 * les informations de l'appareil (IP, User-Agent) dans la base de données.
 * @param {string} userId L'ID de l'utilisateur pour la session.
 * @param {string | null} ipAddress L'adresse IP de l'utilisateur.
 * @param {string | null} userAgent La chaîne User-Agent de l'appareil.
 */
export async function createSessionWithData(
    userId: string,
    ipAddress: string | null,
    userAgent: string | null
): Promise<void> {
    try {
        // 1. Création de la session Lucia standard
        const session = await lucia.createSession(userId, {});

        // 2. Mise à jour de la session dans la base de données avec les données de l'appareil
        await prisma.session.update({
            where: { id: session.id },
            data: {
                ipAddress: ipAddress,
                userAgent: userAgent,
            },
        });

        // 3. Création et envoi du cookie de session côté client
        const sessionCookie = lucia.createSessionCookie(session.id);
        
        // Utilisation de await cookies() pour la cohérence de l'environnement
        const cookieStore = await cookies();

        cookieStore.set(
            sessionCookie.name,
            sessionCookie.value,
            sessionCookie.attributes
        );

    } catch (e) {
        console.error("Erreur lors de la création de la session:", e);
        throw new Error("Échec de la création de la session."); 
    }
}


// -----------------------------------------------------------------------------
// FONCTIONS DE LOGIQUE MÉTIER
// -----------------------------------------------------------------------------

/**
 * @function registerUser
 * @description Gère l'inscription d'un nouvel utilisateur.
 * @param {z.infer<typeof RegisterSchema>} credentials Les informations d'inscription.
 * @returns {Promise<{ success: boolean; error: string | null }>}
 */
export async function registerUser(
    credentials: z.infer<typeof RegisterSchema>
): Promise<{ success: boolean; error: string | null }> {
    try {
        // 1. Validation des données
        const validatedFields = RegisterSchema.safeParse(credentials);
        if (!validatedFields.success) {
            return { success: false, error: "Validation des données échouée." };
        }
        const { email, password, name, username } = validatedFields.data;

        // 2. Vérification de l'existence de l'utilisateur
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return { success: false, error: "Cet e-mail est déjà utilisé." };
        }

        // 3. Hachage du mot de passe
        const hashedPassword = await hash(password);
        
        // 4. Création de l'utilisateur et de la clé (dans une transaction implicite)
        await prisma.user.create({
            data: {
                name,
                email,
                username,
                passwordHash: '', 
                role: UserRole.READER, 
                
                // Clé Lucia pour la connexion par e-mail/mot de passe
                keys: {
                    create: {
                        id: `email:${email}`, 
                        hashedValue: hashedPassword,
                    },
                },
            },
        });

        // L'inscription réussit.
        return { success: true, error: null };

    } catch (error) {
        console.error("Erreur lors de l'inscription de l'utilisateur:", error);
        return { success: false, error: "Une erreur interne est survenue lors de l'inscription." };
    }
}

/**
 * @function loginUser
 * @description Gère la connexion d'un utilisateur existant.
 * @param {z.infer<typeof LoginSchema>} credentials Les informations d'identification de l'utilisateur.
 * @returns {Promise<{ success: boolean; error: string | null; redirectUrl: string | null }>}
 */
export async function loginUser(
    credentials: z.infer<typeof LoginSchema>
): Promise<{ success: boolean; error: string | null; redirectUrl: string | null }> {
    try {
        // 1. Validation des données
        const validatedFields = LoginSchema.safeParse(credentials);
        if (!validatedFields.success) {
            return { success: false, error: "Validation des données échouée.", redirectUrl: null };
        }
        const { email, password } = validatedFields.data;

        // 2. Récupération des informations d'environnement pour l'audit de session
        const requestHeaders = await headers();
        const ipAddress = requestHeaders.get('x-forwarded-for') ?? requestHeaders.get('x-real-ip') ?? null;
        const userAgent = requestHeaders.get('user-agent') ?? null;

        // 3. Récupération de l'utilisateur et de sa clé
        const existingUser = await prisma.user.findUnique({
            where: { email: email },
            include: { keys: true } 
        });

        if (!existingUser) {
            return { success: false, error: "E-mail ou mot de passe invalide.", redirectUrl: null };
        }

        // 4. Vérification du mot de passe (via la clé 'email')
        const userKey = existingUser.keys.find(k => k.id === `email:${email}`);
        
        // CORRECTION : Vérifie si la clé ET la valeur hachée existent (traitement du 'string | null')
        if (!userKey || !userKey.hashedValue) {
             // L'utilisateur existe, mais la méthode de connexion (mot de passe) est invalide ou manquante
             return { success: false, error: "E-mail ou mot de passe invalide.", redirectUrl: null };
        }

        // 5. Vérification du hachage du mot de passe (maintenant userKey.hashedValue est garanti 'string')
        const isValidPassword = await verify(userKey.hashedValue, password);

        if (!isValidPassword) {
            return { success: false, error: "E-mail ou mot de passe invalide.", redirectUrl: null };
        }

        // 6. Création de la session avec données d'appareil
        await createSessionWithData(existingUser.id, ipAddress, userAgent);


        return { success: true, error: null, redirectUrl: null };

    } catch (error) {
        console.error("Erreur lors de la connexion de l'utilisateur:", error);
        return { success: false, error: "Une erreur interne est survenue lors de la connexion.", redirectUrl: null };
    }
}


/**
 * @function logoutUser
 * @description Invalide la session actuelle et efface le cookie.
 */
export async function logoutUser(): Promise<void> {
    // 1. Valide la requête pour obtenir la session actuelle
    const { session } = await getSession();
    
    // 2. Si aucune session n'est trouvée, l'utilisateur est déjà déconnecté, on redirige.
    if (!session) {
        redirect('/login'); 
    }

    // 3. Invalide la session dans la base de données (supprime l'entrée)
    await lucia.invalidateSession(session.id);

    // 4. Crée un cookie vide pour effacer le cookie existant dans le navigateur
    const sessionCookie = lucia.createBlankSessionCookie();
    
    const cookieStore = await cookies();

    cookieStore.set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
    );
    
    // 5. Redirection finale après déconnexion
    redirect('/login');
}