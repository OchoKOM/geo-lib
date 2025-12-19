'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import {
  EntityType,
  UserRole,
  EntityData,
  DashboardUser,
  DashboardBook,
  DashboardDepartment,
  DashboardFaculty,
  DashboardStudyArea,
  DashBoardAuthorProfile,
  FacultySchema,
  DepartmentSchema,
  GhostAuthorSchema,
  BookSchema,
  UserUpdateSchema
} from '@/lib/types'
import { revalidatePath } from 'next/cache'

// --- TYPE DE RÉPONSE UNIFIÉ ---
export type ActionResponse<T = null> = {
  success: boolean
  message: string
  data?: T
}

// --- VÉRIFICATION DES PERMISSIONS ---
async function checkAuthAndRole(requiredRole: UserRole): Promise<{ user: DashboardUser, success: true } | { success: false, message: string }> {
  const { user } = await getSession()

  if (!user) {
    return { success: false, message: 'Non authentifié. Veuillez vous connecter.' }
  }

  const roles = Object.values(UserRole)
  // On compare les index pour savoir si le rôle utilisateur est suffisant
  // (ex: ADMIN > LIBRARIAN > AUTHOR > READER)
  if (roles.indexOf(user.role) < roles.indexOf(requiredRole)) {
    return { success: false, message: `Accès refusé. Rôle requis: ${requiredRole}` }
  }

  return { user: user as unknown as DashboardUser, success: true }
}

// ----------------------------------------------------
// 1. LECTURE DES DONNÉES (GET)
// ----------------------------------------------------
export async function getDashboardDataAction(entityType: EntityType): Promise<ActionResponse<EntityData[]>> {
  const auth = await checkAuthAndRole(UserRole.READER)
  if (!auth.success) return { success: false, message: auth.message }

  try {
    let data: EntityData[] = []

    switch (entityType) {
      case 'users':
        if (auth.user.role === UserRole.READER) {
          return { success: false, message: "Vous n'avez pas les permissions pour consulter les utilisateurs." }
        }
        data = (await prisma.user.findMany({
          select: {
            id: true, username: true, email: true, role: true, isSuspended: true, createdAt: true, authorProfile: true, avatarUrl: true,
          },
          orderBy: { createdAt: 'desc' }
        })) as unknown as DashboardUser[]
        break

      case 'author_profiles':
      case 'create_ghost_author':
        data = (await prisma.authorProfile.findMany({
          include: { user: { select: { name: true, username: true, dateOfBirth: true } } }
        })) as unknown as DashBoardAuthorProfile[]
        break

      case 'books':
        data = (await prisma.book.findMany({
          include: {
            author: { select: { id: true, user: { select: { username: true } } } },
            department: { select: { id: true, name: true, faculty: { select: { id: true, name: true } } } },
            studyAreas: { include: { studyArea: { select: { id: true, name: true } } } },
            coverImage: true,
            documentFile: true,
          },
          orderBy: { postedAt: 'desc' }
        })) as DashboardBook[]
        break

      case 'departments':
        data = (await prisma.department.findMany({
          include: { faculty: { select: { id: true, name: true } } },
          orderBy: { name: 'asc' }
        })) as DashboardDepartment[]
        break

      case 'faculties':
        data = (await prisma.faculty.findMany({
          select: { id: true, name: true, description: true },
          orderBy: { name: 'asc' }
        })) as unknown as DashboardFaculty[]
        break

      case 'studyareas':
        data = (await prisma.studyArea.findMany({
          include: { books: { select: { bookId: true } } },
          orderBy: { name: 'asc' }
        })) as unknown as DashboardStudyArea[]
        break

      default:
        return { success: false, message: `Type d'entité inconnu: ${entityType}` }
    }

    return { success: true, data, message: `Données ${entityType} chargées.` }
  } catch (error) {
    console.error(`Erreur GET Server Action pour ${entityType}:`, error)
    return { success: false, message: 'Erreur serveur lors du chargement des données.' }
  }
}

// ----------------------------------------------------
// 2. CRÉATION (POST)
// ----------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createEntityAction(type: EntityType, data: any): Promise<ActionResponse<EntityData>> {
  if (!type || !data) return { success: false, message: 'Données manquantes.' }

  let requiredRole = UserRole.LIBRARIAN as UserRole
  if (type === 'books') requiredRole = UserRole.AUTHOR
  if (type === 'users') return { success: false, message: "Utilisez l'inscription publique." }

  const auth = await checkAuthAndRole(requiredRole)
  if (!auth.success) return { success: false, message: auth.message }

  try {
    let newEntity: EntityData

    switch (type) {
      case 'faculties':
        newEntity = (await prisma.faculty.create({ data: data as FacultySchema })) as unknown as DashboardFaculty
        break

      case 'departments':
        newEntity = (await prisma.department.create({ data: data as DepartmentSchema })) as DashboardDepartment
        break

      case 'create_ghost_author':
        const ghostData = data as GhostAuthorSchema
        const fakeEmail = `historical.${Date.now()}@library.system`
        // Transaction pour créer user + profil
        newEntity = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: fakeEmail,
              passwordHash: `SYS_${Date.now()}`,
              username: ghostData.name.replace(/\s+/g, '_').toLowerCase() + '_' + Math.floor(Math.random() * 1000),
              name: ghostData.name,
              role: UserRole.AUTHOR,
              dateOfBirth: ghostData.dateOfBirth ? new Date(ghostData.dateOfBirth) : null,
              bio: "Auteur historique / Compte système",
            }
          })
          await tx.authorProfile.create({
            data: { userId: user.id, biography: ghostData.biography, dateOfDeath: ghostData.dateOfDeath ? new Date(ghostData.dateOfDeath) : null }
          })
          return user as unknown as DashboardUser
        })
        break

      case 'author_profiles':
        const { userId, biography, dateOfDeath } = data
        if (!userId) return { success: false, message: "UserId requis." }
        
        newEntity = (await prisma.authorProfile.create({
          data: {
            userId,
            biography: biography || '',
            dateOfDeath: dateOfDeath ? new Date(dateOfDeath) : null
          }
        })) as DashBoardAuthorProfile
        
        // Upgrade role si nécessaire
        await prisma.user.update({ where: { id: userId }, data: { role: UserRole.AUTHOR } })
        break

      case 'books':
        const bookData = data as BookSchema
        const { studyAreaIds, publicationYear, ...restBookData } = bookData
        const connectStudyAreas = studyAreaIds?.map(id => ({ studyArea: { connect: { id } } })) || []

        newEntity = (await prisma.book.create({
          data: {
            ...restBookData,
            documentFile: undefined,
            description: restBookData.description || '',
            postedAt: publicationYear ? new Date(publicationYear, 0, 1) : undefined,
            studyAreas: {
              create: connectStudyAreas.map(c => ({ studyAreaId: c.studyArea.connect.id }))
            }
          },
          include: {
            department: { select: { id: true, name: true } },
            studyAreas: { include: { studyArea: { select: { id: true, name: true } } } },
          }
        })) as unknown as DashboardBook
        break

      default:
        return { success: false, message: `Création non supportée pour ${type}.` }
    }
    
    revalidatePath('/dashboard')
    return { success: true, data: newEntity, message: 'Élément créé avec succès.' }

  } catch (error) {
    console.error(`Erreur POST Action pour ${type}:`, error)
    return { success: false, message: `Erreur création ${type}.` }
  }
}

// ----------------------------------------------------
// 3. MISE À JOUR (PATCH)
// ----------------------------------------------------
function cleanBookUpdateData(bookData: DashboardBook): BookSchema {
    return {
        title: bookData.title,
        description: bookData.description,
        publicationYear: new Date(bookData.postedAt).getFullYear(), // Correction ici pour s'assurer d'avoir l'année
        type: bookData.type,
        departmentId: bookData.departmentId || "",
        authorId: bookData.authorId || undefined,
        studyAreaIds: bookData.studyAreas.map(sa => sa.studyArea.id),
        documentFileId: bookData.documentFileId || undefined,
        academicYearId: bookData.academicYearId || undefined,
        coverImageId: bookData.coverImageId || undefined,
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateEntityAction(type: EntityType, id: string, data: any): Promise<ActionResponse<EntityData>> {
  let requiredRole = UserRole.LIBRARIAN as UserRole
  if (type === 'users') requiredRole = UserRole.ADMIN
  
  const auth = await checkAuthAndRole(requiredRole)
  if (!auth.success) return { success: false, message: auth.message }

  try {
    let updatedEntity: EntityData

    switch (type) {
      case 'faculties':
        updatedEntity = (await prisma.faculty.update({ where: { id }, data })) as unknown as DashboardFaculty
        break

      case 'departments':
        updatedEntity = (await prisma.department.update({ where: { id }, data })) as DashboardDepartment
        break

      case 'studyareas':
        updatedEntity = (await prisma.studyArea.update({ where: { id }, data })) as unknown as DashboardStudyArea
        break

      case 'users':
        const { role, isSuspended } = data as UserUpdateSchema
        updatedEntity = (await prisma.user.update({
          where: { id },
          data: { role, isSuspended },
          select: { id: true, username: true, email: true, role: true, isSuspended: true, createdAt: true, authorProfile: { select: { id: true } } },
        })) as DashboardUser
        break

      case 'books':
        const cleanData = cleanBookUpdateData(data)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { studyAreaIds, publicationYear, authorId, documentFileId, departmentId, academicYearId, coverImageId, documentFile, ...restBookUpdate } = cleanData
        
        await prisma.book.update({
          where: { id },
          data: {
            ...restBookUpdate,
            ...(publicationYear ? { postedAt: new Date(publicationYear, 0, 1) } : {}),
            ...(authorId ? { authorId } : { authorId: undefined }),
            ...(documentFileId ? { documentFileId } : {}),
            ...(departmentId ? { departmentId } : {}),
            ...(academicYearId ? { academicYearId } : {}),
            ...(coverImageId ? { coverImageId } : {}),
          },
        })

        if (studyAreaIds) {
          await prisma.bookStudyArea.deleteMany({ where: { bookId: id } })
          if (studyAreaIds.length > 0) {
            await prisma.bookStudyArea.createMany({ data: studyAreaIds.map(sid => ({ bookId: id, studyAreaId: sid })) })
          }
        }
        
        updatedEntity = (await prisma.book.findUnique({
          where: { id },
          include: {
            department: { select: { id: true, name: true } },
            author: { select: { id: true, user: { select: { username: true } } } },
            studyAreas: { include: { studyArea: { select: { id: true, name: true } } } },
            documentFile: true,
          }
        })) as unknown as DashboardBook
        break
        
      default: 
        return { success: false, message: `Update non supporté pour ${type}.` }
    }
    
    revalidatePath('/dashboard')
    return { success: true, data: updatedEntity, message: 'Mise à jour réussie.' }
  } catch (error) {
    console.error(`Erreur PATCH Action pour ${type}:`, error)
    return { success: false, message: `Erreur serveur update.` }
  }
}

// ----------------------------------------------------
// 4. SUPPRESSION (DELETE)
// ----------------------------------------------------
export async function deleteEntityAction(type: EntityType, id: string): Promise<ActionResponse<null>> {
  const auth = await checkAuthAndRole(UserRole.ADMIN)
  if (!auth.success) return { success: false, message: auth.message }

  try {
    if (type === 'users' && id === auth.user.id) return { success: false, message: 'Auto-suppression interdite.' }

    switch (type) {
      case 'faculties': await prisma.faculty.delete({ where: { id } }); break
      case 'departments': await prisma.department.delete({ where: { id } }); break
      case 'studyareas': await prisma.studyArea.delete({ where: { id } }); break
      case 'books': await prisma.book.delete({ where: { id } }); break
      case 'author_profiles':
      case 'create_ghost_author': await prisma.authorProfile.delete({ where: { id } }); break
      case 'users': await prisma.user.delete({ where: { id } }); break
      default: return { success: false, message: 'Suppression non supportée.' }
    }

    revalidatePath('/dashboard')
    return { success: true, message: `${type} supprimé avec succès.` }
  } catch (error) {
    console.error(`Erreur DELETE Action pour ${type}:`, error)
    return { success: false, message: "Erreur serveur suppression." }
  }
}