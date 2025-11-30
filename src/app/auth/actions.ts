// FILEPATH: app/auth/actions.ts
"use server";

import { redirect } from 'next/navigation';
import { 
    registerUser, 
    loginUser, 
    logoutUser, 
    LoginSchema,
    RegisterSchema
} from '@/lib/auth-service';

// --- TYPES DE RETOUR ---

/**
 * @typedef AuthActionState
 * @description Structure de l'état de retour d'une action d'authentification.
 * Utilisée pour communiquer les erreurs ou le succès au composant client.
 */
type AuthActionState = {
    fields: { name: string; email: string; };
    error: string | null;
    success?: boolean;
};


// -----------------------------------------------------------------------------
// 1. ACTION D'INSCRIPTION (REGISTER)
// -----------------------------------------------------------------------------

/**
 * @action registerAction
 * @description Traite la soumission du formulaire d'inscription.
 * @param {AuthActionState} prevState L'état précédent du formulaire (utilisé par useFormState).
 * @param {FormData} formData Les données soumises par le formulaire.
 * @returns {Promise<AuthActionState>} Un objet contenant un message d'erreur ou un drapeau de succès.
 */
export async function registerAction(
    state: AuthActionState,
    formData: FormData
): Promise<AuthActionState> {
    
    // 1. Récupération des données brutes
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');

    // 2. Validation Zod côté Server Action (Double-vérification sécurisée)
    const validatedFields = RegisterSchema.safeParse({
        name,
        email,
        password,
    });

    if (!validatedFields.success) {
        // Retourne la première erreur de validation trouvée
        const firstError = validatedFields.error.issues[0].message;
        return { error: firstError, fields: { name: String(name), email: String(email) } };
    }
    
    const { name: validatedName, email: validatedEmail, password: validatedPassword } = validatedFields.data;

    // 3. Appel à la logique métier
    const result = await registerUser({
        name: validatedName,
        email: validatedEmail,
        password: validatedPassword
    });

    // 4. Gestion de la réponse et des erreurs
    if (result.success) {
        // En cas de succès, on redirige l'utilisateur vers la page de connexion
        // pour qu'il puisse finaliser la création de sa session.
        redirect('/login?success=true');
    }

    // Si registerUser renvoie une erreur (ex: email déjà utilisé)
    return { error: result.error, fields: { name: String(name), email: String(email) } };
}


// -----------------------------------------------------------------------------
// 2. ACTION DE CONNEXION (LOGIN)
// -----------------------------------------------------------------------------

/**
 * @action loginAction
 * @description Traite la soumission du formulaire de connexion.
 * Inclut la gestion d'une URL de retour optionnelle (callbackUrl).
 * @param {AuthActionState} prevState L'état précédent du formulaire.
 * @param {FormData} formData Les données soumises par le formulaire (inclut email, password et callbackUrl).
 * @returns {Promise<AuthActionState>} Un objet contenant un message d'erreur.
 */
export async function loginAction(
    prevState: AuthActionState,
    formData: FormData
): Promise<AuthActionState> {
    
    // 1. Récupération des données brutes
    const email = formData.get('email');
    const password = formData.get('password');
    // NOUVEAU : Récupération de l'URL de retour (souvent masquée dans le formulaire)
    const callbackUrl = formData.get('callbackUrl');

    // 2. Validation Zod côté Server Action
    const validatedFields = LoginSchema.safeParse({
        email,
        password,
    });

    if (!validatedFields.success) {
        const firstError = validatedFields.error.issues[0].message;
        return { error: `Erreur de validation: ${firstError}`, fields: { name: '', email: String(email) } };
    }
    
    const { email: validatedEmail, password: validatedPassword } = validatedFields.data;


    // 3. Appel à la logique métier
    // Note: Le service loginUser gère l'authentification et retourne l'URL par défaut.
    const result = await loginUser({
        email: validatedEmail,
        password: validatedPassword
    });

    // 4. Gestion de la réponse et des erreurs
    if (result.success) {
        let finalRedirectUrl = result.redirectUrl;

        // VÉRIFICATION DE LA REDIRECTION :
        if (callbackUrl && typeof callbackUrl === 'string') {
            // Sécurité: Valider que l'URL est relative pour prévenir les attaques de phishing.
            // Si l'URL commence par un slash ('/'), on la priorise.
            if (callbackUrl.startsWith('/')) {
                finalRedirectUrl = callbackUrl;
            }
        }

        if (finalRedirectUrl) {
            // Redirection vers l'URL de retour ou l'URL par défaut basée sur le rôle.
            redirect(finalRedirectUrl);
        }
    }

    // Si loginUser renvoie une erreur (ex: email/mdp invalide)
    return { error: result.error, fields: { name: '', email: String(email) } };
}


// -----------------------------------------------------------------------------
// 3. ACTION DE DÉCONNEXION (LOGOUT)
// -----------------------------------------------------------------------------

/**
 * @action logoutAction
 * @description Traite la déconnexion de l'utilisateur.
 * Elle appelle logoutUser qui invalide la session et redirige vers /login.
 */
export async function logoutAction(): Promise<void> {
    // Le service s'occupe de l'invalidation de session, de la suppression du cookie, et de la redirection finale.
    await logoutUser();
}