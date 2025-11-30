declare namespace Lucia {
    // Le type d'utilisateur tel que défini par la base de données (inclut le rôle)
    interface DatabaseUserAttributes {
        id: string;
        email: string;
        role: import('@prisma/client').UserRole; // Utilisation du type UserRole de Prisma
        name: string;
    }
}