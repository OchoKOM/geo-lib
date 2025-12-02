import { Button } from '@/components/ui/button'
import { Cable, HomeIcon } from 'lucide-react'
import Link from 'next/link'

export default function NotFound () {
  return (
    <div className='flex gap-4 flex-col items-center justify-center min-h-screen bg-gradient-to-b from-indigo-50 via-white to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4'>
      {/* Code d'Erreur 404 Massif et Stylisé avec dégradé */}
      <div className='modal-content bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 text-center dark:border dark:border-slate-700'>
        <div className='w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500'>
          <Cable size={32} />
        </div>
        <h3 className='text-xl font-bold text-slate-800 dark:text-white mb-2'>
          404 - Page Non Trouvée
        </h3>
        <p className='text-slate-500 dark:text-slate-400 mb-6'>
          Il semble que la page que vous cherchez ait disparu ou n&apos;ait
          jamais existé. Explorez les options ci-dessous pour continuer votre
          chemin.
        </p>
        <Link href='/' className='flex justify-center'>
          <Button className='flex gap-2 justify-center'>
            {/* Icône de maison SVG */}
            <HomeIcon />
            Retour à l&apos;Accueil
          </Button>
        </Link>
      </div>
    </div>
  )
}
