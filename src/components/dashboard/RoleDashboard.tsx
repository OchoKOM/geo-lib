'use client'

import { 
  LayoutDashboard, 
  BookOpen, 
  UserCircle, 
  Users, 
  FileText, 
  TrendingUp,
  AlertCircle,
  Download,
  PlusCircle,
  Settings,
  Map as MapIcon
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Import dynamique de la carte pour éviter les erreurs SSR (window not defined)
const StudyAreaMap = dynamic(() => import('../dashboard/StudyAreaMap'), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse flex items-center justify-center text-slate-400">Chargement de la carte...</div>
})

interface DashboardStats {
  totalBooks?: number
  activeLoans?: number
  overdueLoans?: number
  myPublications?: number
  totalUsers?: number
}

interface RoleDashboardProps {
  userRole: string
  userId: string
  userName?: string
  stats: DashboardStats
  studyAreas: any[] // Le type geojson formaté
}

// Carte KPI réutilisable
const StatCard = ({ title, value, icon, color }: any) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
        {icon}
      </div>
    </div>
    <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{value}</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
  </div>
)

export function RoleDashboard({ userRole, userId, userName, stats, studyAreas }: RoleDashboardProps) {

  const renderContent = () => {
    switch (userRole) {
      case 'ADMIN':
        return (
          <div className="space-y-8">
            {/* KPIs ADMIN */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Utilisateurs" value={stats.totalUsers} icon={<Users className="w-6 h-6 text-blue-600" />} color="bg-blue-100" />
              <StatCard title="Catalogue Total" value={stats.totalBooks} icon={<FileText className="w-6 h-6 text-purple-600" />} color="bg-purple-100" />
              <StatCard title="Prêts en cours" value={stats.activeLoans} icon={<BookOpen className="w-6 h-6 text-amber-600" />} color="bg-amber-100" />
              <StatCard title="Retards" value={stats.overdueLoans} icon={<AlertCircle className="w-6 h-6 text-red-600" />} color="bg-red-100" />
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* CARTE */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-blue-600" /> Répartition des Zones d'Étude
                </h3>
                <StudyAreaMap areas={studyAreas} />
              </div>

              {/* ACTIONS */}
              <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg h-fit">
                <h3 className="font-bold text-lg mb-4">Administration</h3>
                <div className="space-y-3">
                  <Link href="/admin/users" className="flex items-center gap-3 p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                    <UserCircle className="w-5 h-5" /> Utilisateurs
                  </Link>
                  <Link href="/admin/loans" className="flex items-center gap-3 p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                    <BookOpen className="w-5 h-5" /> Gestion des Prêts
                  </Link>
                  <Link href="/catalog/add" className="flex items-center gap-3 p-3 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors font-semibold">
                    <PlusCircle className="w-5 h-5" /> Ajouter un Ouvrage
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )

      case 'LIBRARIAN':
        return (
          <div className="space-y-8">
            <div className="grid gap-6 sm:grid-cols-3">
              <StatCard title="Prêts Actifs" value={stats.activeLoans} icon={<BookOpen className="w-6 h-6 text-blue-600" />} color="bg-blue-100" />
              <StatCard title="Retards" value={stats.overdueLoans} icon={<AlertCircle className="w-6 h-6 text-red-600" />} color="bg-red-100" />
              <StatCard title="Retours du jour" value="-" icon={<TrendingUp className="w-6 h-6 text-green-600" />} color="bg-green-100" />
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
               <h3 className="text-lg font-bold mb-4 dark:text-white">Carte du Catalogue</h3>
               <StudyAreaMap areas={studyAreas} />
            </div>
            
            <div className="flex justify-center mt-6">
                <Link href="/admin/loans" passHref>
                    <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg">
                        Accéder à l'interface de Gestion des Prêts
                    </button>
                </Link>
            </div>
          </div>
        )

      case 'AUTHOR':
        return (
          <div className="space-y-8">
            <div className="grid gap-6 sm:grid-cols-3">
              <StatCard title="Mes Publications" value={stats.myPublications} icon={<FileText className="w-6 h-6 text-purple-600" />} color="bg-purple-100" />
              <StatCard title="Lectures / Emprunts" value={stats.totalBooks} icon={<Users className="w-6 h-6 text-blue-600" />} color="bg-blue-100" />
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold mb-4 dark:text-white">Couverture géographique de mes travaux</h3>
                {/* Idéalement, on filtrerait studyAreas pour ne montrer que celles liées à l'auteur */}
                <StudyAreaMap areas={studyAreas} />
            </div>
          </div>
        )

      default:
        return <div>Accès Lecteur</div>
    }
  }

  return (
    <section>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
          Tableau de Bord {userRole.charAt(0) + userRole.slice(1).toLowerCase()}
        </h2>
        <p className="text-slate-500">Bienvenue, {userName || 'Utilisateur'}.</p>
      </div>
      {renderContent()}
    </section>
  )
}