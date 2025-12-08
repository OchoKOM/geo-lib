import { Database, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EntityType, DashboardUser, UserRole } from '@/lib/types'
import { NAV_ITEMS } from '@/lib/dashboard-config'
import React from 'react'

interface DashboardSidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  currentUser: DashboardUser
  activeTab: EntityType
  setActiveTab: (tab: EntityType) => void
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
      className={`flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 z-20 shadow-xl ${
        sidebarOpen
          ? 'w-72 translate-x-0'
          : 'w-0 -translate-x-full opacity-0 overflow-hidden'
      }`}
    >
      {/* Header Sidebar */}
      <div className='p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 bg-slate-50 dark:bg-slate-900'>
        <h2 className='font-bold flex items-center justify-between gap-2 text-sm uppercase tracking-wider text-slate-600 dark:text-slate-400'>
          <span className='flex items-center gap-2'>
            <Database className='w-4 h-4 text-blue-600' /> Administration
          </span>
          <Button
            size='sm'
            variant='ghost'
            className='h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            onClick={() => setSidebarOpen(false)}
          >
            <ChevronLeft className='w-4 h-4' />
          </Button>
        </h2>
        {/* User Info Mini Card */}
        <div className='flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm'>
          <div className='h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold'>
            {currentUser.username?.charAt(0).toUpperCase()}
          </div>
          <div className='overflow-hidden'>
            <p className='text-xs font-bold truncate text-slate-800 dark:text-slate-100'>
              {currentUser.username}
            </p>
            <Badge
              variant='outline'
              className='text-[10px] h-4 px-1 py-0 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'
            >
              {currentUser.role}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className='flex-1 overflow-y-auto p-2 space-y-2 bg-white dark:bg-slate-900'>
        {NAV_ITEMS.map(item => {
          if (item.type === 'users' && !isAuthorized(UserRole.LIBRARIAN))
            return null
          const isActive = activeTab === item.type
          return (
            <div
              key={item.type}
              onClick={() => setActiveTab(item.type)}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer border-2 group ${
                isActive
                  ? 'bg-blue-50/70 dark:bg-blue-900/20 border-blue-500 shadow-sm'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                }`}
              >
                {React.createElement(item.icon)}
              </div>
              <div className='flex-1'>
                <p
                  className={`text-sm font-medium ${
                    isActive
                      ? 'text-blue-900 dark:text-blue-300'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {item.label}
                </p>
                <p className='text-[10px] text-slate-400 dark:text-slate-500'>
                  Gérer les {item.label.toLowerCase()}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Sidebar */}
      <div className='p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center'>
        <p className='text-xs text-slate-400 dark:text-slate-600'>
          GeoLibrary Admin v1.0
        </p>
      </div>
    </div>
  )
}