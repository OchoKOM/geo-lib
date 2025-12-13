// FILE PATH: lib/auth-service.ts
// ROLE: Fonctions de logique métier pour l'authentification (Register, Login, Logout).

import { z } from "zod";
import { lucia, getSession } from "./auth";
import { hash, verify } from "@node-rs/argon2";
import { UserRole } from "@prisma/client";
import prisma from "./prisma"; // Singleton PrismaClient
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";

// -----------------------------------------------------------------------------
// SCHÉMAS DE VALIDATION ZOD
// -----------------------------------------------------------------------------
export const LoginSchema = z.object({
  identifier: z
    .string()
    .min(3, {
      message: "L'identifiant (e-mail ou nom d'utilisateur) doit contenir au moins 3 caractères.",
    })
    .trim()
    .toLowerCase(),

  password: z.string().min(8, {
    message: "Le mot de passe doit contenir au moins 8 caractères.",
  }),
});

export const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères." })
    .max(50),

  email: z
    .string()
    .email({ message: "L'adresse e-mail n'est pas valide." })
    .trim()
    .toLowerCase(),

  password: z
    .string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." }),

  username: z.string().regex(/^[a-zA-Z][a-zA-Z0-9-_]{2,19}$/, {
    message: "Le username doit commencer par une lettre et contenir uniquement lettres, chiffres, - ou _ (3 à 20 caractères).",
  }),
});

// -----------------------------------------------------------------------------
// FONCTIONS UTILITAIRES DE SESSION (Lucia v3)
// -----------------------------------------------------------------------------
export async function createSessionWithData(
  userId: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<void> {
  try {
    // 1. Création de la session personnalisée
    const session = await lucia.createSession(userId);

    // 2. Mise à jour des informations de l'appareil dans la base de données
    await prisma.session.update({
      where: { id: session.id },
      data: {
        ipAddress,
        userAgent,
      },
    });

    // 3. Création et envoi du cookie côté client
    const cookieStore = await cookies();
    cookieStore.set(lucia.sessionCookieName, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      sameSite: "lax",
    });
  } catch (e) {
    console.error("Erreur lors de la création de la session:", e);
    throw new Error("Échec de la création de la session.");
  }
}

// -----------------------------------------------------------------------------
// FONCTIONS DE LOGIQUE MÉTIER
// -----------------------------------------------------------------------------
export async function registerUser(
  credentials: z.infer<typeof RegisterSchema>,
): Promise<{ success: boolean; error: string | null; session?: { id: string; userId: string } }> {
  try {
    const validatedFields = RegisterSchema.safeParse(credentials);
    if (!validatedFields.success) {
      return { success: false, error: "Validation des données échouée." };
    }
    const { email, password, name, username } = validatedFields.data;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: "insensitive" } },
          { username: { equals: username, mode: "insensitive" } },
        ],
      },
    });

    if (existingUser) {
      return { success: false, error: "Un utilisateur avec cet e-mail ou nom d'utilisateur existe déjà." };
    }

    const hashedPassword = await hash(password);

    // 1. Création de l'utilisateur
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        username,
        passwordHash: "",
        role: UserRole.READER,
        keys: {
          create: {
            id: `email:${email}`,
            hashedValue: hashedPassword,
          },
        },
      },
    });

    // 2. Création de la session immédiatement après l'inscription
    const session = await lucia.createSession(newUser.id);

    // 3. Création du cookie pour la session
    const cookieStore = await cookies();
    cookieStore.set(lucia.sessionCookieName, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      sameSite: "lax",
    });

    // 4. Retourne success + session pour permettre la connexion automatique
    return { success: true, error: null, session: { id: session.id, userId: newUser.id } };
  } catch (error) {
    console.error("Erreur lors de l'inscription de l'utilisateur:", error);
    return { success: false, error: "Une erreur interne est survenue lors de l'inscription." };
  }
}


export async function loginUser(
  credentials: z.infer<typeof LoginSchema>
): Promise<{ success: boolean; error: string | null; redirectUrl: string | null }> {
  try {
    const validatedFields = LoginSchema.safeParse(credentials);
    if (!validatedFields.success) {
      return { success: false, error: "Validation des données échouée.", redirectUrl: null };
    }
    const { identifier, password } = validatedFields.data;

    const requestHeaders = await headers();
    const ipAddress = requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip") ?? null;
    const userAgent = requestHeaders.get("user-agent") ?? null;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: "insensitive" } },
          { username: { equals: identifier, mode: "insensitive" } },
        ],
      },
      include: { keys: true },
    });

    if (!existingUser || existingUser.isSuspended) {
      return {
        success: false,
        error: existingUser?.isSuspended
          ? "Ce compte a été suspendu. Veuillez contacter le support."
          : "Identifiants ou mot de passe invalide.",
        redirectUrl: null,
      };
    }

    const email = existingUser.email;
    const userKey = existingUser.keys.find((k) => k.id === `email:${email}`);

    if (!userKey || !userKey.hashedValue) {
      return { success: false, error: "Identifiants ou mot de passe invalide.", redirectUrl: null };
    }

    const isValidPassword = await verify(userKey.hashedValue, password);
    if (!isValidPassword) {
      return { success: false, error: "Identifiants ou mot de passe invalide.", redirectUrl: null };
    }

    await createSessionWithData(existingUser.id, ipAddress, userAgent);

    return { success: true, error: null, redirectUrl: null };
  } catch (error) {
    console.error("Erreur lors de la connexion de l'utilisateur:", error);
    return { success: false, error: "Une erreur interne est survenue lors de la connexion.", redirectUrl: null };
  }
}

export async function logoutUser(continueUrl?: string): Promise<void> {
  const { session } = await getSession();
  if (!session) {
    const url = new URL(continueUrl ? `/login?continue=${encodeURIComponent(continueUrl || '/')}` : '/login');
    redirect(url.toString());
  }

  await lucia.invalidateSession(session.id);

  const cookieStore = await cookies();
  cookieStore.set(lucia.sessionCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });

  redirect("/login");
}
