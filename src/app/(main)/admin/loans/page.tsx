import prisma from '@/lib/prisma'
import { LoanManagement } from '@/components/admin/LoanManagement'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { UserRole } from '@prisma/client'

// Empêche le cache pour avoir les données en temps réel
export const dynamic = 'force-dynamic'

export default async function LoansPage() {
  const { user } = await getSession()
  
  // Sécurité : Seuls Admin et Bibliothécaire accèdent
  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.LIBRARIAN)) {
    redirect('/')
  }

  // Récupération des prêts avec les relations
  const loans = await prisma.loan.findMany({
    orderBy: { loanDate: 'desc' },
    include: {
      user: {
        select: { name: true, email: true }
      },
      book: {
        select: { title: true, coverImage: { select: { url: true } } }
      }
    }
  })

  // Formatage pour le composant client
  const formattedLoans = loans.map(loan => ({
    id: loan.id,
    bookTitle: loan.book?.title || "Sans Titre",
    userName: loan.user.name,
    userEmail: loan.user.email,
    loanDate: loan.loanDate.toISOString().split('T')[0],
    dueDate: loan.dueDate.toISOString().split('T')[0],
    // Logique de statut
    status: loan.returnDate 
      ? 'RETURNED' 
      : (loan.isOverdue || new Date() > loan.dueDate) 
        ? 'OVERDUE' 
        : 'ACTIVE',
    coverImage: loan.book?.coverImage?.url
  }))

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestion des Prêts</h1>
        <p className="text-slate-500">Espace {user.role === 'ADMIN' ? 'Administrateur' : 'Bibliothécaire'}</p>
      </div>
      
      <LoanManagement initialLoans={formattedLoans} />
    </div>
  )
}