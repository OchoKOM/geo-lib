import React from 'react'
import { 
  Book, 
  Users, 
  GraduationCap, 
  Layers, 
  TrendingUp, 
  ArrowRight,
  Clock,
  FileText
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EntityType, DashboardStats } from '@/lib/types'
import { cn } from '@/lib/utils'

interface DashboardOverviewProps {
  stats: DashboardStats | null
  loading: boolean
  onNavigate: (tab: EntityType | 'overview') => void
}

export function DashboardOverview({ stats, loading, onNavigate }: DashboardOverviewProps) {
  if (loading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 p-1 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: "Documents",
      value: stats.counts.books,
      icon: Book,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      desc: "Travaux académiques",
      nav: 'books'
    },
    {
      title: "Utilisateurs",
      value: stats.counts.users,
      icon: Users,
      color: "text-rose-600",
      bg: "bg-rose-50 dark:bg-rose-900/20",
      desc: "Inscrits sur la plateforme",
      nav: 'users'
    },
    {
      title: "Facultés",
      value: stats.counts.faculties,
      icon: GraduationCap,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-900/20",
      desc: "Départements actifs",
      nav: 'faculties'
    },
    {
      title: "Zones Cartographiées",
      value: stats.counts.studyAreas,
      icon: Layers,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      desc: "Zones d'études géospatiales",
      nav: 'studyareas'
    }
  ]

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. SECTION KPI CARDS */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, idx) => (
          <Card 
            key={idx} 
            className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group px-1"
            onClick={() => onNavigate(card.nav as EntityType)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {card.title}
              </CardTitle>
              <div className={cn("p-2 rounded-full transition-colors group-hover:bg-white dark:group-hover:bg-slate-800", card.bg)}>
                <card.icon className={cn("h-4 w-4", card.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{card.value}</div>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                {card.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        
        {/* 2. DERNIERS DOCUMENTS (Liste enrichie) */}
        <Card className="md:col-span-4 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-slate-500" />
              Derniers Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {stats.recentActivity.books.length === 0 ? (
                <p className="text-sm text-slate-500 italic">Aucun document récent.</p>
              ) : (
                stats.recentActivity.books.map((book) => (
                  <div key={book.id} className="flex items-start justify-between group">
                    <div className="flex gap-3">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Book className="h-5 w-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors cursor-pointer">
                          {book.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          par <span className="font-semibold">{book.author?.user?.username || 'Inconnu'}</span>
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-slate-500 dark:border-slate-700">
                      {new Date(book.postedAt).toLocaleDateString()}
                    </Badge>
                  </div>
                ))
              )}
            </div>
            <Button 
              variant="ghost" 
              className="w-full mt-6 text-xs text-slate-500 hover:text-blue-600"
              onClick={() => onNavigate('books')}
            >
              Voir tout le catalogue <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* 3. NOUVEAUX UTILISATEURS (Sidebar widget) */}
        <Card className="md:col-span-3 border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50/50 dark:bg-slate-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-slate-500" />
              Nouveaux Inscrits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.users.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="h-9 w-9 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate dark:text-slate-200">{user.username}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    2j
                  </div>
                </div>
              ))}
              {stats.recentActivity.users.length === 0 && (
                 <p className="text-sm text-slate-500 italic">Aucun nouvel inscrit.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}