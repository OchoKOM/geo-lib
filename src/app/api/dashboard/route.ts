// FILE PATH: app/api/dashboard/route.ts
// Ce Route Handler gère toutes les opérations CRUD du dashboard.
// Mises à jour : Adaptation au schema.prisma (BookStudyArea simple) et typage strict.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth'; // Assumé exister

// Import types
import {
    EntityType, DashboardBook, DashboardDepartment,
    DashboardFaculty, DashboardStudyArea, DashboardUser,
    UserRole, BookSchema, DepartmentSchema, FacultySchema, UserUpdateSchema,
    EntityData,
    DashBoardAuthorProfile,
    GhostAuthorSchema
} from '@/lib/types';
import { Session } from 'lucia';
import { AuthorProfile } from '@prisma/client';

// --- CONFIGURATION DE LA RÉPONSE ET DES RÔLES ---

const UNAUTHORIZED = (message: string) => NextResponse.json({ success: false, message }, { status: 401 });
const FORBIDDEN = (message: string) => NextResponse.json({ success: false, message }, { status: 403 });
const BAD_REQUEST = (message: string) => NextResponse.json({ success: false, message }, { status: 400 });
const SUCCESS = <T>(data: T, message: string = 'Opération réussie') => NextResponse.json({ success: true, data, message }, { status: 200 });

/**
 * Vérifie si l'utilisateur est authentifié et possède le rôle requis.
 */
async function checkAuthAndRole(req: NextRequest, requiredRole: UserRole): Promise<{ user: DashboardUser; session: Session } | NextResponse> {
    const { user, session } = await getSession();

    if (!user) {
        return UNAUTHORIZED('Non authentifié. Veuillez vous connecter.');
    }

    const roles = Object.values(UserRole);
    if (roles.indexOf(user.role) < roles.indexOf(requiredRole)) {
        return FORBIDDEN(`Accès refusé. Rôle requis: ${requiredRole}`);
    }

    return { user: user as unknown as DashboardUser, session };
}

// ----------------------------------------------------
// 1. GESTION DES REQUÊTES GET (Lecture)
// ----------------------------------------------------

export async function GET(req: NextRequest) {
    const authCheck = await checkAuthAndRole(req, UserRole.READER);
    if (authCheck instanceof NextResponse) return authCheck;

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('type') as EntityType | null;

    if (!entityType) return BAD_REQUEST('Paramètre "type" manquant.');

    try {
        let data: EntityData[] = [];

        switch (entityType) {
            case 'users':
                if (authCheck.user.role === UserRole.READER) {
                    return FORBIDDEN("Vous n'avez pas les permissions pour consulter les utilisateurs.");
                }
                data = (await prisma.user.findMany({
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        role: true,
                        isSuspended: true,
                        createdAt: true,
                        authorProfile: true,
                        avatarUrl: true,
                    },
                    orderBy: { createdAt: 'desc' }
                })) as unknown as DashboardUser[];
                break;
            case 'author_profiles':
                data = (await prisma.authorProfile.findMany({
                    include: { user: { select: { name: true, username: true, dateOfBirth: true } } }
                })) as unknown as DashBoardAuthorProfile[];
                break;
            case 'books':
                data = (await prisma.book.findMany({
                    include: {
                        author: { select: { id: true, user: { select: { username: true } } } }, // Adaptation relation author -> user
                        department: { select: { id: true, name: true, faculty: { select: { id: true, name: true } }, } },
                        studyAreas: {
                            include: { studyArea: { select: { id: true, name: true } } }
                        },
                        // coverImage et documentFile selon votre schema
                        coverImage: true, 
                        documentFile: true, 
                    },
                    orderBy: { postedAt: 'desc' }
                })) as DashboardBook[];
                
                break;

            case 'departments':
                data = (await prisma.department.findMany({
                    include: {
                        faculty: { select: { id: true, name: true } },
                    },
                    orderBy: { name: 'asc' }
                })) as DashboardDepartment[];
                break;

            case 'faculties':
                data = (await prisma.faculty.findMany({
                    select: { id: true, name: true, description: true },
                    orderBy: { name: 'asc' }
                })) as unknown as DashboardFaculty[];
                break;

            case 'studyareas':
                data = (await prisma.studyArea.findMany({
                    include: {
                        // Inclus pour voir à quels livres c'est lié si besoin
                        books: { select: { bookId: true } }
                    },
                    orderBy: { name: 'asc' }
                })) as unknown as DashboardStudyArea[];
                break;

            default:
                return BAD_REQUEST(`Type d'entité inconnu: ${entityType}`);
        }

        return SUCCESS(data, `Données ${entityType} chargées.`);

    } catch (error) {
        console.error(`Erreur GET pour ${entityType}:`, error);
        return NextResponse.json({ success: false, message: `Erreur serveur.` }, { status: 500 });
    }
}

// ----------------------------------------------------
// 2. GESTION DES REQUÊTES POST (Création)
// ----------------------------------------------------

export async function POST(req: NextRequest) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { type, data } = await req.json() as { type: EntityType, data: any };

    if (!type || !data) return BAD_REQUEST('Données manquantes.');

    let requiredRole: UserRole;
    switch (type) {
        case 'users': return BAD_REQUEST('Utilisez l\'inscription publique.');
        case 'books': requiredRole = UserRole.AUTHOR; break;
        default: requiredRole = UserRole.LIBRARIAN; break;
    }

    const authCheck = await checkAuthAndRole(req, requiredRole);
    if (authCheck instanceof NextResponse) return authCheck;

    try {
        let newEntity: EntityData;

        switch (type) {
            case 'faculties':
                newEntity = (await prisma.faculty.create({ data: data as FacultySchema })) as unknown as DashboardFaculty;
                return SUCCESS(newEntity, 'Faculté créée.');

            case 'departments':
                newEntity = (await prisma.department.create({ data: data as DepartmentSchema })) as DashboardDepartment;
                return SUCCESS(newEntity, 'Département créé.');
             case 'create_ghost_author':
                const ghostData = data as GhostAuthorSchema;
                const fakeEmail = `historical.${Date.now()}@library.system`;
                const ghostUser = await prisma.$transaction(async (tx) => {
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
                    });
                    await tx.authorProfile.create({
                        data: { userId: user.id, biography: ghostData.biography, dateOfDeath: ghostData.dateOfDeath ? new Date(ghostData.dateOfDeath) : null }
                    });
                    return user;
                });
                return SUCCESS(ghostUser, `Auteur ${ghostData.name} créé.`);
           case 'author_profiles':
                const { userId, biography, dateOfDeath } = data;
                if (!userId) return BAD_REQUEST("UserId et Biographie requis.");
                
                newEntity = (await prisma.authorProfile.create({
                    data: {
                        userId,
                        biography: biography || '',
                        dateOfDeath: dateOfDeath ? new Date(dateOfDeath) : null
                    }
                })) as DashBoardAuthorProfile;
                
                // Optionnel: Mettre à jour le rôle de l'utilisateur en AUTHOR s'il est READER
                await prisma.user.update({ where: { id: userId }, data: { role: UserRole.AUTHOR } });
                
                return SUCCESS(newEntity, 'Profil auteur créé.');
            case 'books':
                const bookData = data as BookSchema;
                const { studyAreaIds, publicationYear, ...restBookData } = bookData;

                console.log(data);
                

                // 1. Préparer la connexion many-to-many explicite pour BookStudyArea
                // NOTE: Votre schema BookStudyArea n'a QUE bookId et studyAreaId. 
                // Pas de assignedBy ni assignedAt.
                const connectStudyAreas = studyAreaIds?.map(id => ({
                    studyArea: { connect: { id } }
                })) || [];

                // 2. Création
                newEntity = (await prisma.book.create({
                    data: {
                        ...restBookData,
                        postedAt: publicationYear, // Conversion Année -> Date
                        // Gestion de la relation explicite via nested write
                        studyAreas: {
                            create: connectStudyAreas.map(c => ({
                                studyAreaId: c.studyArea.connect.id
                            }))
                        }
                    },
                    include: {
                        department: { select: { id: true, name: true } },
                        studyAreas: {
                            include: { studyArea: { select: { id: true, name: true } } }
                        },
                    }
                })) as unknown as DashboardBook;
                return SUCCESS(newEntity, 'Livre créé avec succès.');

            default:
                return BAD_REQUEST(`Création non supportée pour ${type}.`);
        }
    } catch (error) {
        console.error(`Erreur POST pour ${type}:`, error);
        return NextResponse.json({ success: false, message: `Erreur création ${type}.` }, { status: 500 });
    }
}


function cleanBookUpdateData(bookData: DashboardBook): BookSchema {
    const cleanData: BookSchema = {
        title: bookData.title,
        description: bookData.description,
        publicationYear: bookData.postedAt,
        type: bookData.type,
        departmentId: bookData.departmentId || "",
        authorId: bookData.authorId || undefined,
        studyAreaIds: bookData.studyAreas.map(sa => sa.studyArea.id),
        documentFileId: bookData.documentFileId || undefined,
        academicYearId: bookData.academicYearId || undefined,
        coverImageId: bookData.coverImageId || undefined,
    };


    return cleanData;
}

// ----------------------------------------------------
// 3. GESTION DES REQUÊTES PATCH (Mise à jour)
// ----------------------------------------------------

export async function PATCH(req: NextRequest) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { type, id, data } = await req.json() as { type: EntityType, id: string, data: any };

    if (!type || !id || !data) return BAD_REQUEST('Paramètres manquants.');

    let requiredRole: UserRole;
    switch (type) {
        case 'users': requiredRole = UserRole.ADMIN; break;
        case 'books': requiredRole = UserRole.LIBRARIAN; break;
        default: requiredRole = UserRole.LIBRARIAN; break;
    }

    const authCheck = await checkAuthAndRole(req, requiredRole);
    if (authCheck instanceof NextResponse) return authCheck;

    try {
        let updatedEntity: EntityData;

        switch (type) {
            case 'faculties':
                updatedEntity = (await prisma.faculty.update({ where: { id }, data })) as unknown as DashboardFaculty;
                return SUCCESS(updatedEntity, 'Faculté mise à jour.');

            case 'departments':
                updatedEntity = (await prisma.department.update({ where: { id }, data })) as DashboardDepartment;
                return SUCCESS(updatedEntity, 'Département mis à jour.');

            case 'studyareas':
                updatedEntity = (await prisma.studyArea.update({ where: { id }, data })) as unknown as DashboardStudyArea;
                return SUCCESS(updatedEntity, 'Zone mise à jour.');

            case 'users':
                updatedEntity = (await prisma.user.update({
                    where: { id },
                    data: data as UserUpdateSchema,
                    select: { 
                        id: true, username: true, email: true, role: true, isSuspended: true, createdAt: true,
                        authorProfile: { select: { id: true } }
                    },
                })) as DashboardUser;
                return SUCCESS(updatedEntity, 'Utilisateur mis à jour.');

            case 'books':
                const cleanData = cleanBookUpdateData(data);
                
                const { studyAreaIds, publicationYear, authorId, documentFileId, departmentId, academicYearId, coverImageId, ...restBookUpdate } = cleanData;
                await prisma.book.update({
                    where: { id },
                    data: {
                        ...restBookUpdate,
                        ...(publicationYear ? { postedAt: publicationYear} : {}),
                        ...(authorId ? { authorId } : {}),
                        ...(documentFileId ? { documentFileId } : {}),
                        ...(departmentId ? {departmentId} : {}),
                        ...(academicYearId ? {academicYearId} : {}),
                        ...(coverImageId ? {coverImageId} : {}),
                        postedAt: undefined
                    },
                });
                if (studyAreaIds) {
                    await prisma.bookStudyArea.deleteMany({ where: { bookId: id } });
                    if (studyAreaIds.length > 0) {
                        await prisma.bookStudyArea.createMany({ data: studyAreaIds.map(sid => ({ bookId: id, studyAreaId: sid })) });
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
                })) as unknown as DashboardBook;
                return SUCCESS(updatedEntity, 'Livre mis à jour.');
            default: return BAD_REQUEST(`Update non supporté pour ${type}.`);
        }
    } catch (error) {
        console.error(`Erreur PATCH pour ${type}:`, error);
        return NextResponse.json({ success: false, message: `Erreur serveur update.` });
    }
}

// ----------------------------------------------------
// 4. GESTION DES REQUÊTES DELETE
// ----------------------------------------------------

export async function DELETE(req: NextRequest) {
    const { type, id } = await req.json() as { type: EntityType, id: string };

    const authCheck = await checkAuthAndRole(req, UserRole.ADMIN);
    if (authCheck instanceof NextResponse) return authCheck;

    try {
        if (type === 'users' && id === authCheck.user.id) return BAD_REQUEST('Auto-suppression interdite.');

        switch (type) {
            case 'faculties': await prisma.faculty.delete({ where: { id } }); break;
            case 'departments': await prisma.department.delete({ where: { id } }); break;
            case 'studyareas': await prisma.studyArea.delete({ where: { id } }); break;
            case 'books': await prisma.book.delete({ where: { id } }); break;
            case 'author_profiles': await prisma.authorProfile.delete({ where: { id } });
                break;
            case 'users': await prisma.user.delete({ where: { id } }); break;
            default: return BAD_REQUEST('Suppression non supportée.');
        }

        return SUCCESS(null, `${type} supprimé.`);
    } catch (error) {
        console.error(`Erreur DELETE pour ${type}:`, error);
        return NextResponse.json({ success: false, message: "Erreur serveur suppression." }, { status: 500 });
    }
}