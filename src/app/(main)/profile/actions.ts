'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma' // Assurez-vous que ce chemin est correct
import { getSession } from '@/lib/auth' // Basé sur votre route.ts
import { UserRole } from '@prisma/client'
import { z } from 'zod'

// Schéma de validation aligné avec votre Prisma schema
const ProfileSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  bio: z.string().optional(),
  dateOfBirth: z.string().optional().nullable(),
  avatarUrl: z.string().optional(),
  // Champs spécifiques aux auteurs
  authorBiography: z.string().optional(), 
  dateOfDeath: z.string().optional().nullable() // Juste au cas où, même si c'est une page profil perso
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
  // 1. Authentification
  const { user } = await getSession()
  
  if (!user) {
    return { success: false, message: "Non authentifié" }
  }

  // 2. Extraction et Validation des données
  const rawData = {
    name: formData.get('name') as string,
    bio: formData.get('bio') as string,
    dateOfBirth: formData.get('dateOfBirth') as string,
    avatarUrl: formData.get('avatarUrl') as string,
    authorBiography: formData.get('authorBiography') as string,
  }

  const validatedFields = ProfileSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Erreur de validation",
      errors: validatedFields.error.flatten().fieldErrors
    }
  }

  const data = validatedFields.data

  try {
    // 3. Mise à jour transactionnelle (User + AuthorProfile si nécessaire)
    await prisma.$transaction(async (tx) => {
      
      // Mise à jour de base (User)
      await tx.user.update({
        where: { id: user.id },
        data: {
          name: data.name,
          bio: data.bio,
          avatarUrl: data.avatarUrl,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        }
      })

      // Si l'utilisateur est un AUTEUR, on met à jour son profil auteur étendu
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

    revalidatePath('/profile')
    return { success: true, message: "Profil mis à jour avec succès !" }

  } catch (error) {
    console.error("Erreur update profile:", error)
    return { success: false, message: "Une erreur serveur est survenue." }
  }
}