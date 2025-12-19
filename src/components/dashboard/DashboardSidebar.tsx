import { Database, ChevronLeft, LogOut, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EntityType, DashboardUser, UserRole } from '@/lib/types'
import { NAV_ITEMS } from '@/lib/dashboard-config'
import React from 'react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { LogoutDialog } from '../Header'

interface DashboardSidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  currentUser: DashboardUser
  activeTab: EntityType | 'overview'
  setActiveTab: (tab: EntityType | 'overview') => void
  isAuthorized: (role: UserRole) => boolean
}

export function DashboardSidebar({
  sidebarOpen,
  setSidebarOpen,
  currentUser,
  activeTab,
  setActiveTab,
  isAuthorized
}: DashboardSidebarProps) {
  return (
    <div
      className={cn(
        "flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all duration-300 z-20 shadow-2xl max-h-full fixed md:relative",
        sidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'
      )}
    >
      {/* 1. BRAND HEADER */}
      <div className='p-6 flex items-center justify-between bg-white dark:bg-slate-950'>
        <div className='flex items-center gap-2 text-slate-800 dark:text-white font-bold text-xl tracking-tight'>
          <div className='h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white'>
            <Database className='w-5 h-5' />
          </div>
          GeoLib<span className='text-blue-600'>Admin</span>
        </div>
        <Button
          size='sm'
          variant='ghost'
          className='h-8 w-8 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 md:hidden'
          onClick={() => setSidebarOpen(false)}
        >
          <ChevronLeft className='w-5 h-5' />
        </Button>
      </div>

      {/* 2. USER PROFILE CARD */}
      <div className='px-4 pb-6'>
        <div className='flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800'>
          <div className='h-10 w-10 rounded-full bg-linear-to-tr from-blue-500 to-cyan-400 text-white flex items-center justify-center font-bold shadow-sm'>
            {currentUser.avatarUrl ? (()=>(
              <Image src={currentUser.avatarUrl} alt="Avatar" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
            ))() : (
              currentUser.username?.charAt(0).toUpperCase()
            )}
          </div>
          <div className='overflow-hidden flex-1'>
            <p className='text-sm font-bold truncate text-slate-900 dark:text-slate-100'>
              {currentUser.username}
            </p>
            <div className='flex items-center gap-1'>
               <ShieldCheck className='w-3 h-3 text-emerald-500' />
               <span className='text-xs text-slate-500 dark:text-slate-400 capitalize'>{currentUser.role.toLowerCase()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className='px-4 mb-2'>
        <p className='text-xs font-semibold text-slate-400 uppercase tracking-wider pl-2 mb-2'>Menu Principal</p>
      </div>

      {/* 3. NAVIGATION ITEMS */}
      <div className='flex-1 overflow-y-auto px-4 space-y-1'>
        {NAV_ITEMS.map(item => {
          if (item.type === 'users' && !isAuthorized(UserRole.LIBRARIAN))
            return null
          const isActive = activeTab === item.type
          
          return (
            <div
              key={item.type}
              onClick={() => setActiveTab(item.type)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer group relative",
                isActive 
                  ? cn("bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-950")
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
              )}
            >
              {React.createElement(item.icon, { 
                className: cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-blue-400 dark:text-blue-600" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                ) 
              })}
              <span className="font-medium text-sm">{item.label}</span>
              
              {isActive && (
                <div className="absolute right-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
              )}
            </div>
          )
        })}
      </div>

      {/* 4. FOOTER */}
      <div className='p-4 border-t border-slate-100 dark:border-slate-800'>
        <LogoutDialog>
          <Button variant="outline" className="w-full justify-start gap-2 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:border-red-900 hover:border-red-200">
            <LogOut className="w-4 h-4" />
            Déconnexion
        </Button>
        </LogoutDialog>
        
        <p className='text-[10px] text-center text-slate-400 mt-4'>
          v2.0.1 &bull; GeoLib Admin
        </p>
      </div>
    </div>
  )
}