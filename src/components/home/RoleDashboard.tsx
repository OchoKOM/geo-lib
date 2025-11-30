// components/home/RoleDashboard.tsx
import { LayoutDashboard, BookOpen, LogOut, UserCircle } from 'lucide-react'
import Link from 'next/link'

interface RoleDashboardProps {
  userRole: string
  userId: string
}

const roleLinks: { [key: string]: { label: string, href: string, icon: React.ReactNode, description: string }[] } = {
  ADMIN: [
    { label: 'Tableau de Bord Admin', href: '/admin/dashboard', icon: <LayoutDashboard />, description: "Accédez aux statistiques système et à la gestion des utilisateurs." },
    { label: 'Gérer les Prêts', href: '/admin/loans', icon: <BookOpen />, description: "Supervisez les emprunts et les retours d'ouvrages." },
  ],
  LIBRARIAN: [
    { label: 'Gérer les Prêts', href: '/admin/loans', icon: <BookOpen />, description: "Gérez les enregistrements, les emprunts et les retours d'ouvrages." },
  ],
  AUTHOR: [
    { label: 'Mon Profil d\'Auteur', href: '/profile', icon: <UserCircle />, description: "Mettez à jour votre biographie et vos publications." },
  ],
  READER: [
    { label: 'Mon Compte', href: '/profile', icon: <UserCircle />, description: "Consultez l'historique de vos emprunts et vos favoris." },
  ],
}

export function RoleDashboard({ userRole }: RoleDashboardProps) {
  const links = roleLinks[userRole] || roleLinks['READER'] // Fallback au rôle READER

  return (
    <section>
      <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-6">
        Espace Utilisateur ({userRole})
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {links.map((link, index) => (
          <Link key={index} href={link.href} passHref>
            <div className="flex flex-col items-center justify-center p-6 bg-blue-100/50 dark:bg-slate-700 rounded-xl hover:bg-blue-200/50 dark:hover:bg-slate-600 transition-colors h-full">
              <div className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3">{link.icon}</div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white text-center">
                {link.label}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 text-center">
                {link.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}