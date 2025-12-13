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
 */
type AuthActionState = {
    fields: { name: string; email: string; username: string };
    error: string | null;
    success?: boolean;
};

type LoginActionState = {
    fields: { name: string; identifier: string };
    error: string | null;
    success?: boolean;
};


// -----------------------------------------------------------------------------
// 1. ACTION D'INSCRIPTION (REGISTER)
// -----------------------------------------------------------------------------

export async function registerAction(
    prevState: AuthActionState,
    formData: FormData
): Promise<AuthActionState> {
    
    // 1. Récupération des données
    const name = formData.get('name');
    const email = formData.get('email');
    const username = formData.get('username');
    const password = formData.get('password');
    // Récupération de l'URL de continuation depuis le champ caché
    const continueUrl = formData.get('continue') as string | null;

    // 2. Validation Zod
    const validatedFields = RegisterSchema.safeParse({
        name,
        email,
        password,
        username
    });

    if (!validatedFields.success) {
        const firstError = validatedFields.error.issues[0].message;
        return { 
            error: firstError, 
            fields: { name: String(name), email: String(email), username: String(username) } 
        };
    }
    
    const { name: validatedName, email: validatedEmail, password: validatedPassword, username: validatedUsername } = validatedFields.data;

    // 3. Logique métier
    const result = await registerUser({
        name: validatedName,
        email: validatedEmail,
        password: validatedPassword,
        username: validatedUsername
    });

    // 4. Redirection
    if (result.success) {
        // Si une URL de continuation valide existe et commence par '/' (sécurité), on l'utilise
        if (continueUrl && continueUrl.startsWith('/')) {
            redirect(continueUrl);
        } else {
            redirect('/profile'); // Redirection par défaut
        }
    }

    return { 
        error: result.error, 
        fields: { name: String(name), email: String(email), username: String(username) } 
    };
}


// -----------------------------------------------------------------------------
// 2. ACTION DE CONNEXION (LOGIN)
// -----------------------------------------------------------------------------

export async function loginAction(
    prevState: LoginActionState,
    formData: FormData
): Promise<LoginActionState> {
    
    // 1. Récupération des données
    const identifier = formData.get('identifier');
    const password = formData.get('password');
    // Récupération de l'URL de continuation (prioritaire sur callbackUrl)
    const continueUrl = formData.get('continue') as string | null;
    const callbackUrl = formData.get('callbackUrl') as string | null;

    // 2. Validation Zod
    const validatedFields = LoginSchema.safeParse({
        identifier,
        password,
    });

    if (!validatedFields.success) {
        const firstError = validatedFields.error.issues[0].message;
        return { 
            error: `Erreur de validation: ${firstError}`, 
            fields: { name: '', identifier: String(identifier) } 
        };
    }
    
    const { identifier: validatedIdentifier, password: validatedPassword } = validatedFields.data;

    // 3. Logique métier
    const result = await loginUser({
        identifier: validatedIdentifier,
        password: validatedPassword
    });

    // 4. Redirection
    if (result.success) {
        // Logique de priorité pour la redirection :
        // 1. 'continue' (notre nouveau système explicite)
        // 2. 'callbackUrl' (système legacy ou OAuth)
        // 3. '/profile' (défaut)
        
        let finalRedirectUrl = '/profile';

        if (continueUrl && continueUrl.startsWith('/')) {
            finalRedirectUrl = continueUrl;
        } else if (callbackUrl && callbackUrl.startsWith('/')) {
            finalRedirectUrl = callbackUrl;
        }

        redirect(finalRedirectUrl);
    }

    return { 
        error: result.error, 
        fields: { name: '', identifier: String(identifier) } 
    };
}


// -----------------------------------------------------------------------------
// 3. ACTION DE DÉCONNEXION (LOGOUT)
// -----------------------------------------------------------------------------

export async function logoutAction(continueUrl?: string): Promise<void> {
    await logoutUser(continueUrl);
}