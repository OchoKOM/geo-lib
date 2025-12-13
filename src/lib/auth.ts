// FILE PATH: lib/auth.ts
// ROLE: Configuration centrale de la bibliothèque d'authentification Lucia Auth.
// Migration vers Lucia v3 (sans changer les noms de fonctions).

import { cookies } from 'next/headers';
import prisma from './prisma';
import crypto from 'crypto';

// --- DÉFINITION DU TYPE DE BASE DE DONNÉES POUR LUCIA ---
import { User as PrismaUser } from '@prisma/client';
export type SessionDatabaseAttributes = Pick<PrismaUser,
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

// --- 2. Gestion des sessions personnalisées ---
export interface Session {
    id: string;
    userId: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
    location: string | null;
    fresh: boolean;
}

const SESSION_DURATION = 60 * 60 * 24 * 30; // 30 jours

function generateSessionId(): string {
    return crypto.randomBytes(25).toString('base64url');
}

// --- 3. Fonctions principales de Lucia remplacées ---
export const lucia = {
    sessionCookieName: 'session',
    
    async createSession(userId: string) {
        const id = generateSessionId();
        const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);
        await prisma.session.create({
            data: { id, userId, expiresAt },
        });
        return { id, userId, expiresAt, fresh: true };
    },

    async validateSession(sessionId: string) {
        const session = await prisma.session.findUnique({ where: { id: sessionId } });
        if (!session || new Date() > session.expiresAt) {
            if (session) await prisma.session.delete({ where: { id: sessionId } });
            return { user: null, session: null };
        }
        const user = await prisma.user.findUnique({ where: { id: session.userId } });
        if (!user) return { user: null, session: null };
        const userAttributes: SessionDatabaseAttributes = {
            id: user.id,
            email: user.email,
            name: user.name,
            username: user.username,
            role: user.role,
            bio: user.bio,
            createdAt: user.createdAt,
            avatarUrl: user.avatarUrl,
            dateOfBirth: user.dateOfBirth,
        };
        return { user: userAttributes, session: { ...session, fresh: false } };
    },

    async invalidateSession(sessionId: string) {
        await prisma.session.delete({ where: { id: sessionId } });
    },

    getUserAttributes(attributes: SessionDatabaseAttributes) {
        return { ...attributes };
    },
};

// --- 5. Fonction de Validation de Requête (Optimisation et Sécurité) ---
import { cache } from 'react';
export const getSession = cache(
    async (): Promise<
        { user: SessionDatabaseAttributes; session: Session } | { user: null; session: null }
    > => {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get(lucia.sessionCookieName)?.value ?? null;

        if (!sessionId) return { user: null, session: null };

        return await lucia.validateSession(sessionId);
    }
);

// --- Types et exports ---
type DatabaseUserAttributes = SessionDatabaseAttributes;

declare module 'lucia' {
    interface Register {
        Lucia: typeof lucia;
        DatabaseUserAttributes: DatabaseUserAttributes;
        UserId: string;
    }
}

export type DatabaseUser = Awaited<ReturnType<typeof lucia.getUserAttributes>>;
