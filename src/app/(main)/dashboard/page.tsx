import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth' // Assurez-vous d'avoir votre fonction d'auth Lucia
import prisma from '@/lib/prisma' // Votre instance Prisma
import { UserRole } from '@prisma/client'
import { RoleDashboard } from '@/components/dashboard/RoleDashboard'

// Type pour les données géo brutes (PostGIS)
type RawGeoRow = {
  id: string
  name: string
  book_count: number // BigInt via SQL
  color: string | null
  geojson: string
}

// Fonction utilitaire pour déterminer les permissions d'édition
const getStudyAreaPermissions = (role: UserRole) => {
  return {
    canEdit: ["ADMIN", "LIBRARIAN"].includes(role),
    canDelete: role === UserRole.ADMIN,
    // On pourrait ajouter d'autres permissions ici (ex: canUploadGeoJSON)
  }
}

export default async function DashboardPage() {
  // 1. Authentification
  const { user } = await getSession()
  if (!user) notFound()

  // 2. Préparation des données (KPIs)
  let stats = {
    totalBooks: 0,
    activeLoans: 0,
    overdueLoans: 0,
    myPublications: 0,
    totalUsers: 0
  }

  // 3. Récupération des données selon le rôle
  switch (user.role) {
    case UserRole.ADMIN:
      const [totalBooks, activeLoans, overdueLoans, totalUsers] = await Promise.all([
        prisma.book.count(),
        prisma.loan.count({ where: { returnDate: null } }),
        prisma.loan.count({ where: { returnDate: null, dueDate: { lt: new Date() } } }),
        prisma.user.count({ where: { role: { not: UserRole.ADMIN } } }),
      ])
      stats = { totalBooks, activeLoans, overdueLoans, totalUsers, myPublications: 0 }
      break

    case UserRole.LIBRARIAN:
      const [libBooks, libLoans, libOverdue] = await Promise.all([
        prisma.book.count(),
        prisma.loan.count({ where: { returnDate: null } }),
        prisma.loan.count({ where: { returnDate: null, dueDate: { lt: new Date() } } }),
      ])
      stats = { totalBooks: libBooks, activeLoans: libLoans, overdueLoans: libOverdue, myPublications: 0, totalUsers: 0 }
      break

    case UserRole.AUTHOR:
      const [myBooks, myReads] = await Promise.all([
        prisma.book.count({ where: { authorId: user.id } }),
        prisma.loan.count({
          where: { book: { authorId: user.id } } 
        })
      ])
      stats = { ...stats, myPublications: myBooks, totalBooks: myReads } // On réutilise totalBooks pour "lectures" ici
      break
  }

  // 4. Récupération des Zones d'étude (Carte)
  // Nous utilisons queryRaw pour obtenir le GeoJSON directement depuis PostGIS
  // Note: Assurez-vous que l'extension postgis est active
  const rawAreas = await prisma.$queryRaw<RawGeoRow[]>`
    SELECT 
      sa.id, 
      sa.name, 
      COUNT(bsa."bookId") as book_count,
      ST_AsGeoJSON(sa.geometry) as geojson
    FROM "StudyArea" sa
    LEFT JOIN "BookStudyArea" bsa ON sa.id = bsa."studyAreaId"
    GROUP BY sa.id
    ORDER BY sa.name ASC
  `

  // Détermination des permissions pour l'interface
  const permissions = getStudyAreaPermissions(user.role)

  // Formatage pour le composant carte - AJOUT DES PERMISSIONS
  const studyAreas = rawAreas.map(area => ({
    id: area.id,
    name: area.name,
    bookCount: Number(area.book_count), // BigInt -> Number
    color: '#3b82f6', // Bleu par défaut, ou logique dynamique
    // Parsing du GeoJSON string retourné par PostGIS
    geometry: JSON.parse(area.geojson),
    // AJOUT DES PERMISSIONS : Les permissions globales sont appliquées à chaque zone
    canEdit: permissions.canEdit,
    canDelete: permissions.canDelete,
  }))


  return (
    <RoleDashboard
      userRole={user.role}
      userId={user.id}
      userName={user.name || 'Utilisateur'}
      stats={stats}
      studyAreas={studyAreas} // Passer les zones d'étude enrichies
    />
  )
}