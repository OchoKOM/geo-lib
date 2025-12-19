import {
  MapPin,
  Edit,
  Trash2,
  UserPlus,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EntityType, EntityData, UserRole, DashboardUser } from '@/lib/types'
import { DeleteTarget, ColorTheme } from '@/lib/dashboard-config'
import { cn } from '@/lib/utils'

interface DashboardTableProps {
  data: EntityData[]
  activeTab: EntityType
  activeTheme: ColorTheme
  searchTerm: string
  loading: boolean
  currentUser: DashboardUser | null
  isAuthorized: (role: UserRole) => boolean
  onEdit: (item: EntityData) => void
  onDelete: (item: DeleteTarget) => void
  onCreateAuthor: (userId: string) => void
}

export function DashboardTable({
  data,
  activeTab,
  activeTheme,
  searchTerm,
  loading,
  currentUser,
  isAuthorized,
  onEdit,
  onDelete,
  onCreateAuthor
}: DashboardTableProps) {
  
  const filteredData = data.filter(item =>
    JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden transition-colors h-full flex flex-col'>
      <div className='overflow-x-auto flex-1'>
        <table className='relative min-w-full divide-y divide-slate-100 dark:divide-slate-800'>
          <thead className='bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10'>
            <tr>
              <th className='px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
                ID / Nom
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
                Détails
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
                Relations
              </th>
              <th className='px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className='bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 max-h-full h-full overflow-y-auto'>
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className='px-6 py-10 text-center text-slate-500 dark:text-slate-400'
                >
                  {loading ? (
                    <Loader2 className={cn("w-6 h-6 animate-spin mx-auto", activeTheme.primary)} />
                  ) : (
                    'Aucune donnée trouvée.'
                  )}
                </td>
              </tr>
            ) : (
              filteredData.map(item => {
                return (
                  <tr
                    key={item.id}
                    className='hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group relative'
                  >
                    {/* Cellule 1 : Identité */}
                    <td className='px-6 py-4 whitespace-nowrap truncate max-w-3xs'>
                      <div className='text-sm font-medium text-slate-900 dark:text-slate-100 truncate'>
                        {/* @ts-expect-error dynamic handling */}
                        {item.title || item.name || item.username || item.user?.name || item.user?.username}
                      </div>
                      <div className='text-xs text-slate-400 dark:text-slate-500 font-mono truncate'>
                        {item.id}
                      </div>
                    </td>

                    {/* Cellule 2 : Détails */}
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 truncate max-w-3xs'>
                      {activeTab === 'users' && (
                        <Badge
                          className={cn(
                            /* @ts-expect-error dynamic */
                            item.role === 'ADMIN' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-slate-100 text-slate-800 border-slate-200'
                          )}
                          variant="outline"
                        >
                          {/* @ts-expect-error dynamic */
                          item.role}
                        </Badge>
                      )}
                      {activeTab === 'books' && (
                        <span className='flex items-center gap-2'>
                          <Badge
                            variant='outline'
                            className={cn('dark:border-slate-600 dark:text-slate-300', activeTheme.badge)}
                          >
                            {/* @ts-expect-error dynamic */}
                            {item.type}
                          </Badge>{' '}
                          {/* @ts-expect-error dynamic */}
                          {new Date(item.postedAt).getFullYear()}
                        </span>
                      )}
                      {activeTab === 'studyareas' && (
                        <span className='truncate block max-w-xs text-xs'>
                          {/* @ts-expect-error dynamic */}
                          {item.description}
                        </span>
                      )}
                      {activeTab === 'departments' && (
                        <span className='text-xs text-slate-500 dark:text-slate-400 truncate'>
                          {/* @ts-expect-error dynamic */}
                          {item.description || ''}
                        </span>
                      )}
                    </td>

                    {/* Cellule 3 : Relations */}
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400'>
                      {/* @ts-expect-error dynamic */}
                      {item.department && (
                        <Badge
                          variant='secondary'
                          className='mr-1 dark:bg-slate-800 dark:text-slate-300'
                        >
                          {/* @ts-expect-error dynamic */}
                          {item.department.name}
                        </Badge>
                      )}
                      {/* @ts-expect-error dynamic */}
                      {item.faculty && (
                        <Badge
                          variant='outline'
                          className='dark:border-slate-600 dark:text-slate-400'
                        >
                          {/* @ts-expect-error dynamic */}
                          {item.faculty.name}
                        </Badge>
                      )}
                      {/* @ts-expect-error dynamic */}
                      {item.author && (
                        <span className='text-xs'>
                          Par: {/* @ts-expect-error dynamic */}
                          {item.author.user?.name || item.author.user?.username || 'Inconnu'}
                        </span>
                      )}
                      {/* @ts-expect-error dynamic */}
                      {item.studyAreas && item.studyAreas.length > 0 && (
                        <div className='flex -space-x-1 overflow-hidden mt-1'>
                          {/* @ts-expect-error dynamic */}
                          {item.studyAreas.map((sa, i: number) => (
                            <div
                              key={i}
                              className={cn(
                                'flex items-center gap-1 text-xs px-2 py-1 rounded-md',
                                activeTheme.bg,
                                activeTheme.primary
                              )}
                            >
                              <MapPin className='w-3 h-3' />
                              <span className='truncate'>{sa.studyArea?.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Cellule 4 : Actions */}
                    <td className='sticky right-0 px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <div className='flex justify-end gap-2 opacity-0 max-md:opacity-100 group-hover:opacity-100 transition-opacity'>
                        {/* BOUTON CRÉER PROFIL AUTEUR */}
                        {activeTab === 'users' &&
                          isAuthorized(UserRole.LIBRARIAN) &&
                          /* @ts-expect-error dynamic */
                          !item.authorProfile && (
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-slate-800 max-md:text-green-700 max-md:bg-green-50 dark:max-md:bg-slate-800'
                              title='Créer profil auteur'
                              onClick={() => onCreateAuthor(item.id)}
                            >
                              <UserPlus className='w-4 h-4' />
                            </Button>
                          )}
                        
                        {isAuthorized(UserRole.LIBRARIAN) &&
                          (activeTab !== 'users' || isAuthorized(UserRole.ADMIN)) && (
                            <Button
                              variant='ghost'
                              size='icon'
                              className={cn(
                                'h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800',
                                activeTheme.primary
                              )}
                              onClick={() => onEdit(item)}
                            >
                              <Edit className='w-4 h-4' />
                            </Button>
                          )}
                        
                        {isAuthorized(UserRole.ADMIN) && (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-slate-800 max-md:text-red-700 max-md:bg-red-50 dark:max-md:bg-slate-800'
                            onClick={() => onDelete({ type: activeTab, id: item.id })}
                            disabled={activeTab === 'users' && item.id === currentUser?.id}
                          >
                            <Trash2 className='w-4 h-4' />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <div className='bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex justify-between'>
        <span>Affichage de {filteredData.length} élément(s)</span>
        <span>Base de données connectée</span>
      </div>
    </div>
  )
}