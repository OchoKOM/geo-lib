import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { UserRole } from '@/lib/types'; // Assurez-vous d'importer vos types
import { 
    LoanSchema, 
    PaymentSchema, 
    SubscriptionSchema 
} from '@/lib/types';

// --- HELPERS ---
const UNAUTHORIZED = (msg: string) => NextResponse.json({ success: false, message: msg }, { status: 401 });
const FORBIDDEN = (msg: string) => NextResponse.json({ success: false, message: msg }, { status: 403 });
const BAD_REQUEST = (msg: string) => NextResponse.json({ success: false, message: msg }, { status: 400 });
const SUCCESS = <T>(data: T, msg: string) => NextResponse.json({ success: true, data, message: msg }, { status: 200 });

async function checkAdmin(req: NextRequest) {
    const { user, session } = await getSession();
    if (!user) return null;
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.LIBRARIAN) return null; // Admin ou Bibliothécaire
    return user;
}

// --- GET (Lecture) ---
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const user = await checkAdmin(req);

    if (!user) return UNAUTHORIZED('Accès réservé aux administrateurs.');

    try {
        let data;
        switch (type) {
            case 'loans':
                data = await prisma.loan.findMany({
                    include: {
                        user: { select: { id: true, name: true, username: true, email: true } },
                        book: { select: { id: true, title: true } }
                    },
                    orderBy: { loanDate: 'desc' }
                });
                break;
            case 'subscriptions':
                data = await prisma.subscription.findMany({
                    include: {
                        user: { select: { id: true, name: true, username: true, email: true } }
                    },
                    orderBy: { endDate: 'desc' }
                });
                break;
            case 'payments':
                data = await prisma.payment.findMany({
                    include: {
                        user: { select: { id: true, name: true, username: true } },
                        loan: { include: { book: { select: { title: true } } } }
                    },
                    orderBy: { paymentDate: 'desc' }
                });
                break;
            default:
                return BAD_REQUEST('Type invalide.');
        }
        return SUCCESS(data, 'Données chargées.');
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
    }
}

// --- POST (Création) ---
export async function POST(req: NextRequest) {
    const user = await checkAdmin(req);
    if (!user) return UNAUTHORIZED('Non autorisé.');

    const body = await req.json();
    const { type, data } = body;

    try {
        let result;
        switch (type) {
            case 'loans':
                const loanData = data as LoanSchema;
                // Vérifier si le livre est dispo
                const book = await prisma.book.findUnique({ where: { id: loanData.bookId }});
                if (!book?.available) return BAD_REQUEST('Livre non disponible.');

                result = await prisma.$transaction(async (tx) => {
                    const loan = await tx.loan.create({
                        data: {
                            userId: loanData.userId,
                            bookId: loanData.bookId,
                            dueDate: new Date(loanData.dueDate),
                        }
                    });
                    await tx.book.update({
                        where: { id: loanData.bookId },
                        data: { available: false }
                    });
                    return loan;
                });
                break;

            case 'payments':
                const payData = data as PaymentSchema;
                result = await prisma.payment.create({
                    data: {
                        userId: payData.userId,
                        amount: payData.amount,
                        reason: payData.reason,
                        loanId: payData.loanId || undefined
                    }
                });
                break;

            case 'subscriptions':
                const subData = data as SubscriptionSchema;
                // Upsert : Créer ou Mettre à jour si existe déjà pour cet user
                result = await prisma.subscription.upsert({
                    where: { userId: subData.userId },
                    update: {
                        endDate: new Date(subData.endDate),
                        isActive: subData.isActive
                    },
                    create: {
                        userId: subData.userId,
                        endDate: new Date(subData.endDate),
                        isActive: subData.isActive
                    }
                });
                break;

            default:
                return BAD_REQUEST('Action non supportée.');
        }
        return SUCCESS(result, 'Création réussie.');
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, message: 'Erreur lors de la création.' }, { status: 500 });
    }
}

// --- PATCH (Mise à jour - ex: Retourner un livre) ---
export async function PATCH(req: NextRequest) {
    const user = await checkAdmin(req);
    if (!user) return UNAUTHORIZED('Non autorisé.');

    const body = await req.json();
    const { type, id, action } = body;

    try {
        if (type === 'loans' && action === 'return') {
            const loan = await prisma.loan.findUnique({ where: { id } });
            if (!loan) return BAD_REQUEST('Prêt introuvable');

            await prisma.$transaction(async (tx) => {
                await tx.loan.update({
                    where: { id },
                    data: { returnDate: new Date() }
                });
                if (loan.bookId) {
                    await tx.book.update({
                        where: { id: loan.bookId },
                        data: { available: true }
                    });
                }
            });
            return SUCCESS(null, 'Livre retourné avec succès.');
        }
        return BAD_REQUEST('Action inconnue.');
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
    }
}