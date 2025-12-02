'use client'

import { useState } from 'react'
import { 
  Search, CheckCircle, AlertTriangle, Clock, MoreVertical, Calendar 
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

type LoanStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE'

interface LoanRecord {
  id: string
  bookTitle: string
  userName: string
  userEmail: string
  loanDate: string
  dueDate: string
  status: string | LoanStatus
  coverImage?: string
}

interface LoanManagementProps {
  initialLoans: LoanRecord[]
}

export function LoanManagement({ initialLoans }: LoanManagementProps) {
  const [loans, setLoans] = useState(initialLoans)
  const [filter, setFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Filtrage
  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.bookTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          loan.userName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'ALL' || loan.status === filter
    return matchesSearch && matchesFilter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"><Clock className="w-3 h-3 mr-1" /> En cours</span>
      case 'OVERDUE':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"><AlertTriangle className="w-3 h-3 mr-1" /> En retard</span>
      case 'RETURNED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"><CheckCircle className="w-3 h-3 mr-1" /> Retourné</span>
      default: return null
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Barre d'outils */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
                type="text" 
                placeholder="Rechercher..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {['ALL', 'ACTIVE', 'OVERDUE', 'RETURNED'].map((f) => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filter === f ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}
                >
                    {f === 'ALL' ? 'Tout' : f === 'ACTIVE' ? 'En cours' : f === 'OVERDUE' ? 'Retards' : 'Retournés'}
                </button>
            ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-3">Ouvrage</th>
              <th className="px-6 py-3">Emprunteur</th>
              <th className="px-6 py-3">Dates</th>
              <th className="px-6 py-3">Statut</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLoans.map((loan) => (
              <tr key={loan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                  {loan.bookTitle}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-slate-900 dark:text-slate-200 font-medium">{loan.userName}</span>
                    <span className="text-xs text-slate-500">{loan.userEmail}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> Prêt: {loan.loanDate}</span>
                    <span className={`flex items-center gap-1 font-medium ${loan.status === 'OVERDUE' ? 'text-red-600' : 'text-slate-600'}`}>
                      <AlertTriangle className="w-3 h-3"/> Retour: {loan.dueDate}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(loan.status as string)}
                </td>
                <td className="px-6 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                      <MoreVertical className="w-4 h-4 text-slate-500" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="cursor-pointer">Détails</DropdownMenuItem>
                      {loan.status !== 'RETURNED' && (
                          <DropdownMenuItem className="cursor-pointer text-blue-600">Marquer retourné</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLoans.length === 0 && (
            <div className="p-8 text-center text-slate-500">Aucun prêt trouvé.</div>
        )}
      </div>
    </div>
  )
}