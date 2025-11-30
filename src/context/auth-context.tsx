import { Session, User } from "lucia";
import { createContext, ReactNode, useContext, useState } from "react";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    /** Indique si une opération de rafraîchissement des données est en cours. */
    loading: boolean; 
    /** Fonction pour rafraîchir manuellement l'état d'authentification après une action (login, logout, update). */
    refetchAuthStatus: () => Promise<void>; 
    /** Fonction pour vider l'état local du contexte (souvent appelée après une déconnexion). */
    clearAuthStatus: () => void;
}

// ==============================================================================
// 2. CONTEXTE ET HOOK
// ==============================================================================

// Initialisation du Contexte avec les valeurs par défaut
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hook personnalisé pour accéder à l'état d'authentification dans les Client Components.
 * @returns {AuthContextType} L'état d'authentification et les fonctions associées.
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
    }
    return context;
};

// ==============================================================================
// 3. COMPOSANT FOURNISSEUR (PROVIDER)
// ==============================================================================

/**
 * Props attendues par l'AuthProvider, fournies par un Server Component parent.
 */
interface AuthProviderProps {
    initialUser: User | null;
    initialSession: Session | null;
    children: ReactNode;
    /** * Cette prop est essentielle. Elle doit être la Server Action réelle pour 
     * valider la requête et obtenir l'état mis à jour depuis le serveur.
     * Définie dans un fichier séparé (ex: lib/auth-actions.ts).
     */
    getAuthStatusAction: () => Promise<{ user: User | null, session: Session | null }>;
}

/**
 * Fournit l'état d'authentification (Session et User) aux composants enfants.
 * Il est un Client Component et reçoit les données initiales du Server Component.
 * * @component AuthProvider
 * @description Fournit l'état d'authentification à l'ensemble de l'application.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ 
    initialUser, 
    initialSession, 
    children, 
    getAuthStatusAction 
}) => {
    // État local du contexte
    const [user, setUser] = useState<User | null>(initialUser);
    const [session, setSession] = useState<Session | null>(initialSession);
    // Initialisé à false car l'état initial est déjà chargé via les props.
    const [loading, setLoading] = useState(false); 

    /**
     * Appelle la Server Action pour rafraîchir l'état d'authentification 
     * après une interaction (login, update, etc.).
     */
    const refetchAuthStatus = async () => {
        setLoading(true);
        try {
            // Appel de la Server Action passée en prop
            const { user: newUser, session: newSession } = await getAuthStatusAction();
            
            setUser(newUser);
            setSession(newSession);

        } catch (error) {
            console.error("Erreur lors du rafraîchissement du statut d'authentification:", error);
            // En cas d'échec ou d'expiration de session non gérée par l'action, on efface l'état local.
            setUser(null);
            setSession(null);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Nettoie l'état local. Utile pour les mises à jour immédiates de l'UI.
     */
    const clearAuthStatus = () => {
        setUser(null);
        setSession(null);
    };
    
    // Fournit les valeurs du contexte
    const value: AuthContextType = {
        user,
        session,
        loading,
        refetchAuthStatus,
        clearAuthStatus,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};