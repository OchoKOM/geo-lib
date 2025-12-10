import Logo from '@/components/ui/logo'
import { Loader2 } from 'lucide-react'

export default function loading () {
  return (
    <div className='h-[calc(100vh-64px)] w-full flex flex-col gap-2 items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400'>
      <Logo size={48} />
      <Loader2 className='w-10 h-10 animate-spin mb-4 text-blue-600' />
      <p>Chargement...</p>
    </div>
  )
}
