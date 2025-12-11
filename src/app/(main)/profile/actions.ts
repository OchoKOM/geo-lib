'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

// Schéma de validation mis à jour
const ProfileSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  bio: z.string().optional(),
  dateOfBirth: z.string().optional().nullable(),
  avatarId: z.string().optional().nullable(),
  dateOfDeath: z.string().optional().nullable()
})

export type ProfileFormState = {
  success?: boolean
  message?: string
  errors?: {
    [K in keyof z.infer<typeof ProfileSchema>]?: string[]
  }
}

export async function updateUserProfile(
  prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const { user } = await getSession()

  if (!user) {
    return { success: false, message: "Non authentifié" }
  }

  // Extraction des données
  const rawData = {
    name: formData.get('name') as string,
    bio: formData.get('bio') as string,
    dateOfBirth: formData.get('dateOfBirth') as string,
    avatarId: formData.get('avatarId') as string || null, // On récupère l'ID caché
  }

  const validatedFields = ProfileSchema.safeParse(rawData)

  console.log(validatedFields);
  

  if (!validatedFields.success) {
    const message = Object.values(validatedFields.error.flatten().fieldErrors).flat().join(' ')
    return {
      success: false,
      message: message || "Erreur de validation",
      errors: validatedFields.error.flatten().fieldErrors
    }
  }

  const data = validatedFields.data

  try {
    await prisma.$transaction(async (tx) => {
      // Mise à jour User avec la relation avatar
      await tx.user.update({
        where: { id: user.id },
        data: {
          name: data.name,
          bio: data.bio,
          // Connexion de la relation File si un avatarId est fourni
          // Si avatarId est null, on ne déconnecte pas forcément, ou on peut utiliser disconnect
          avatar: data.avatarId
            ? { connect: { id: data.avatarId } }
            : undefined,
          avatarUrl: data.avatarId ? await tx.file.findUnique({ where: { id: data.avatarId } }).then(f => f?.url) : null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        }
      })

      if (user.role === UserRole.AUTHOR) {
        await tx.authorProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            biography: data.authorBiography || ""
          },
          update: {
            biography: data.authorBiography || ""
          }
        })
      }
    })

    
    return { success: true, message: "Profil mis à jour avec succès !" }

  } catch (error) {
    console.error("Erreur update profile:", error)
    return { success: false, message: "Une erreur serveur est survenue." }
  }
}

export async function deleteAvatar(userId: string) {
  try {
    const {user} = await getSession();
    if (!user) {
      return { success: false, message: "Non authentifié" };
    }
    if (user.id !== userId) {
      return { success: false, message: "Accès refusé." };
    }
    const avatar = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarId: true }
    });
    await prisma.user.update({
      where: { id: userId },
      data: {
        avatar: { disconnect: true },
        avatarUrl: null
      }
    });

    if (avatar?.avatarId) {
      await prisma.file.update({
        where: { id: avatar.avatarId },
        data: { isDeleted: true }
      });
    }

    return { success: true, message: "Avatar supprimé avec succès." };
  }catch (error) {
    console.error("Erreur suppression avatar:", error);
    return { success: false, message: "Une erreur serveur est survenue." };
  }
}