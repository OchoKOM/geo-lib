'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import {
  EntityType,
  UserRole,
  EntityData,
  DashboardUser,
  DashboardBook,
  FacultySchema,
  DepartmentSchema,
  GhostAuthorSchema,
  BookSchema,
  UserUpdateSchema,
  FinanceEntityData
} from '@/lib/types'
import { revalidatePath } from 'next/cache'

// Extension des types pour inclure les finances
type FinanceEntityType = EntityType | 'loans' | 'subscriptions' | 'payments' | 'profile' | 'author_profiles' | 'create_ghost_author'

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
  if (roles.indexOf(user.role) < roles.indexOf(requiredRole)) {
    return { success: false, message: `Accès refusé. Rôle requis: ${requiredRole}` }
  }

  return { user: user as unknown as DashboardUser, success: true }
}

// ----------------------------------------------------
// 0. STATISTIQUES GLOBALES (DASHBOARD HOME)
// ----------------------------------------------------
export async function getDashboardStatsAction() {
  const auth = await checkAuthAndRole(UserRole.READER)
  if (!auth.success) return { success: false, message: auth.message }

  try {
    const [
      booksCount,
      usersCount,
      facultiesCount,
      studyAreasCount,
      recentBooks,
      recentUsers
    ] = await Promise.all([
      prisma.book.count(),
      prisma.user.count(),
      prisma.faculty.count(),
      prisma.studyArea.count(),
      prisma.book.findMany({
        take: 5,
        orderBy: { postedAt: 'desc' },
        include: { author: { include: { user: true } } }
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: { role: { not: 'ADMIN' } }
      })
    ])

    return {
      success: true,
      data: {
        counts: {
          books: booksCount,
          users: usersCount,
          faculties: facultiesCount,
          studyAreas: studyAreasCount
        },
        recentActivity: {
          books: recentBooks as unknown as DashboardBook[],
          users: recentUsers as unknown as DashboardUser[]
        }
      }
    }
  } catch (error) {
    console.error('Erreur Stats:', error)
    return { success: false, message: 'Impossible de charger les statistiques' }
  }
}

// ----------------------------------------------------
// 1. LECTURE DES DONNÉES (GET)
// ----------------------------------------------------
export async function getDashboardDataAction(entityType: FinanceEntityType): Promise<ActionResponse<EntityData[] | FinanceEntityData[]>> {
  const auth = await checkAuthAndRole(UserRole.READER)
  if (!auth.success) return { success: false, message: auth.message }

  try {
    let data: unknown[] = []

    switch (entityType) {
      // --- SECTION FINANCES ---
      case 'loans':
        // Seuls les bibliothécaires et admins voient les prêts
        if (auth.user.role !== UserRole.LIBRARIAN && auth.user.role !== UserRole.ADMIN) {
           return { success: false, message: "Accès non autorisé aux prêts." }
        }
        data = await prisma.loan.findMany({
          include: {
            user: { select: { id: true, username: true, email: true } },
            book: { select: { id: true, title: true } }
          },
          orderBy: { loanDate: 'desc' }
        })
        break

      case 'subscriptions':
        // Seuls les admins voient les abonnements
        if (auth.user.role !== UserRole.ADMIN) {
           return { success: false, message: "Accès non autorisé aux abonnements." }
        }
        data = await prisma.subscription.findMany({
          include: {
            user: { select: { id: true, username: true, email: true } }
          },
          orderBy: { endDate: 'asc' }
        })
        break

      case 'payments':
        // Seuls les admins voient les paiements
        if (auth.user.role !== UserRole.ADMIN) {
           return { success: false, message: "Accès non autorisé aux paiements." }
        }
        data = await prisma.payment.findMany({
          include: {
            user: { select: { id: true, username: true } },
            loan: {
                select: {
                    book: {
                        select: {
                            title: true
                        }
                    }
                }
            }
          },
          orderBy: { paymentDate: 'desc' }
        })
        break

      case 'profile':
        // Profil de l'utilisateur connecté
        data = await prisma.user.findMany({
          where: { id: auth.user.id },
          select: {
            id: true, username: true, email: true, role: true, isSuspended: true, createdAt: true, authorProfile: true, avatarUrl: true,
          }
        })
        break

      // --- SECTION STANDARD ---
      case 'users':
        if (auth.user.role === UserRole.READER) {
          return { success: false, message: "Vous n'avez pas les permissions pour consulter les utilisateurs." }
        }
        data = await prisma.user.findMany({
          select: {
            id: true, username: true, email: true, role: true, isSuspended: true, createdAt: true, authorProfile: true, avatarUrl: true,
          },
          orderBy: { createdAt: 'desc' }
        })
        break

      case 'author_profiles':
      case 'create_ghost_author':
        data = await prisma.authorProfile.findMany({
          include: { user: { select: { name: true, username: true, dateOfBirth: true } } }
        })
        break

      case 'books':
        data = await prisma.book.findMany({
          include: {
            author: { select: { id: true, user: { select: { username: true } } } },
            department: { select: { id: true, name: true, faculty: { select: { id: true, name: true } } } },
            studyAreas: { include: { studyArea: { select: { id: true, name: true } } } },
            coverImage: true,
            documentFile: true,
          },
          orderBy: { postedAt: 'desc' }
        })
        break

      case 'departments':
        data = await prisma.department.findMany({
          include: { faculty: { select: { id: true, name: true } } },
          orderBy: { name: 'asc' }
        })
        break

      case 'faculties':
        data = await prisma.faculty.findMany({
          select: { id: true, name: true, description: true },
          orderBy: { name: 'asc' }
        })
        break

      case 'studyareas':
        data = await prisma.studyArea.findMany({
          include: { books: { select: { bookId: true } } },
          orderBy: { name: 'asc' }
        })
        break

      default:
        return { success: false, message: `Type d'entité inconnu: ${entityType}` }
    }

    return { success: true, data: data as EntityData[], message: `Données ${entityType} chargées.` }
  } catch (error) {
    console.error(`Erreur GET Server Action pour ${entityType}:`, error)
    return { success: false, message: 'Erreur serveur lors du chargement des données.' }
  }
}

// ----------------------------------------------------
// 2. CRÉATION (POST)
// ----------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createEntityAction(type: FinanceEntityType, data: any): Promise<ActionResponse<EntityData>> {
  if (!type || !data) return { success: false, message: 'Données manquantes.' }

  let requiredRole = UserRole.LIBRARIAN as UserRole
  if (type === 'books') requiredRole = UserRole.AUTHOR
  if (type === 'users') return { success: false, message: "Utilisez l'inscription publique." }
  if (type === 'subscriptions' || type === 'payments') requiredRole = UserRole.ADMIN

  const auth = await checkAuthAndRole(requiredRole)
  if (!auth.success) return { success: false, message: auth.message }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let newEntity: any

    switch (type) {
      case 'loans':
        // Création d'un prêt
        const { userId, bookId, dueDate } = data
        newEntity = await prisma.loan.create({
          data: {
            userId,
            bookId,
            dueDate: new Date(dueDate),
            loanDate: new Date(),
            isOverdue: false
          },
          include: {
            user: { select: { id: true, username: true } },
            book: { select: { id: true, title: true } }
          }
        })
        break

      case 'subscriptions':
        // Création abonnement (par défaut 30 jours ou spécifié)
        const { userId: subUserId, durationInDays } = data
        const startDate = new Date()
        const endDate = new Date()
        endDate.setDate(startDate.getDate() + (parseInt(durationInDays) || 30))

        newEntity = await prisma.subscription.create({
          data: {
            userId: subUserId,
            startDate,
            endDate,
            isActive: true
          },
          include: {
            user: { select: { id: true, username: true } }
          }
        })
        break

      case 'payments':
        // Création d'un paiement
        const { userId: payUserId, amount, reason, loanId } = data
        newEntity = await prisma.payment.create({
          data: {
            userId: payUserId,
            amount: parseFloat(amount),
            reason: reason || '',
            loanId: loanId || null
          },
          include: {
            user: { select: { id: true, username: true } },
            loan: {
                select: {
                    book: {
                        select: {
                            title: true
                        }
                    }
                }
            }
          }
        })
        break

      case 'faculties':
        newEntity = await prisma.faculty.create({ data: data as FacultySchema })
        break

      case 'departments':
        newEntity = await prisma.department.create({ data: data as DepartmentSchema })
        break

      case 'create_ghost_author':
        const ghostData = data as GhostAuthorSchema
        const fakeEmail = `historical.${Date.now()}@library.system`
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
          return user
        })
        break

      case 'author_profiles':
        const { userId: authorUserId, biography, dateOfDeath } = data
        if (!authorUserId) return { success: false, message: "UserId requis." }
        
        newEntity = await prisma.authorProfile.create({
          data: {
            userId: authorUserId,
            biography: biography || '',
            dateOfDeath: dateOfDeath ? new Date(dateOfDeath) : null
          }
        })
        
        await prisma.user.update({ where: { id: authorUserId }, data: { role: UserRole.AUTHOR } })
        break

      case 'books':
        const bookData = data as BookSchema
        const { studyAreaIds, publicationYear, ...restBookData } = bookData
        const connectStudyAreas = studyAreaIds?.map(id => ({ studyArea: { connect: { id } } })) || []

        newEntity = await prisma.book.create({
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
        })
        break

      default:
        return { success: false, message: `Création non supportée pour ${type}.` }
    }
    
    revalidatePath('/dashboard')
    revalidatePath('/finances') // Revalidation pour la nouvelle page
    return { success: true, data: newEntity, message: 'Élément créé avec succès.' }

  } catch (error) {
    console.error(`Erreur POST Action pour ${type}:`, error)
    return { success: false, message: `Erreur création ${type}.` }
  }
}

// ----------------------------------------------------
// 3. MISE À JOUR (PATCH)
// ----------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateEntityAction(type: FinanceEntityType, id: string, data: any): Promise<ActionResponse<EntityData>> {
  let requiredRole = UserRole.LIBRARIAN as UserRole
  if (type === 'users' || type === 'subscriptions' || type === 'payments') requiredRole = UserRole.ADMIN
  
  const auth = await checkAuthAndRole(requiredRole)
  if (!auth.success) return { success: false, message: auth.message }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updatedEntity: any

    switch (type) {
      case 'loans':
        // Mise à jour (ex: retour du livre)
        const { isReturned, ...loanData } = data
        updatedEntity = await prisma.loan.update({
            where: { id },
            data: {
                ...loanData,
                returnDate: isReturned ? new Date() : null,
                isOverdue: false // Si retourné, plus en retard (logique simple)
            },
            include: { user: true, book: true }
        })
        break

      case 'subscriptions':
        updatedEntity = await prisma.subscription.update({
            where: { id },
            data: data, // ex: isActive, endDate
            include: { user: true }
        })
        break

      case 'payments':
        updatedEntity = await prisma.payment.update({
            where: { id },
            data: data, // ex: amount, reason, loanId
            include: { user: true, loan: { select: { book: { select: { title: true } } } } }
        })
        break

      case 'faculties':
        updatedEntity = await prisma.faculty.update({ where: { id }, data })
        break
      case 'departments':
        updatedEntity = await prisma.department.update({ where: { id }, data })
        break
      case 'studyareas':
        updatedEntity = await prisma.studyArea.update({ where: { id }, data })
        break
      case 'users':
        const { role, isSuspended } = data as UserUpdateSchema
        updatedEntity = await prisma.user.update({
          where: { id },
          data: { role, isSuspended },
          select: { id: true, username: true, email: true, role: true, isSuspended: true, createdAt: true, authorProfile: { select: { id: true } } },
        })
        break
      case 'books':
        // Logique livre existante conservée
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { studyAreaIds, publicationYear, authorId, documentFileId, departmentId, academicYearId, coverImageId, documentFile, ...restBookUpdate } = data
        
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
            await prisma.bookStudyArea.createMany({ data: studyAreaIds.map((sid: string) => ({ bookId: id, studyAreaId: sid })) })
          }
        }
        
        updatedEntity = await prisma.book.findUnique({
          where: { id },
          include: {
            department: { select: { id: true, name: true } },
            author: { select: { id: true, user: { select: { username: true } } } },
            studyAreas: { include: { studyArea: { select: { id: true, name: true } } } },
            documentFile: true,
          }
        })
        break
      default: 
        return { success: false, message: `Update non supporté pour ${type}.` }
    }
    
    revalidatePath('/dashboard')
    revalidatePath('/finances')
    return { success: true, data: updatedEntity, message: 'Mise à jour réussie.' }
  } catch (error) {
    console.error(`Erreur PATCH Action pour ${type}:`, error)
    return { success: false, message: `Erreur serveur update.` }
  }
}

// ----------------------------------------------------
// 4. SUPPRESSION (DELETE)
// ----------------------------------------------------
export async function deleteEntityAction(type: FinanceEntityType, id: string): Promise<ActionResponse<null>> {
  const auth = await checkAuthAndRole(UserRole.ADMIN)
  if (!auth.success) return { success: false, message: auth.message }

  try {
    if (type === 'users' && id === auth.user.id) return { success: false, message: 'Auto-suppression interdite.' }

    switch (type) {
      case 'loans': await prisma.loan.delete({ where: { id } }); break
      case 'subscriptions': await prisma.subscription.delete({ where: { id } }); break
      case 'payments': await prisma.payment.delete({ where: { id } }); break
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
    revalidatePath('/finances')
    return { success: true, message: `${type} supprimé avec succès.` }
  } catch (error) {
    console.error(`Erreur DELETE Action pour ${type}:`, error)
    return { success: false, message: "Erreur serveur suppression." }
  }
}