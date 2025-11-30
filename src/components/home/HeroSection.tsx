// components/home/HeroSection.tsx
import { Search, BookOpen, UserCheck } from 'lucide-react'
import Link from 'next/link'

interface HeroSectionProps {
  totalBooks: number
  isAuthenticated: boolean
}

export function HeroSection({ totalBooks, isAuthenticated }: HeroSectionProps) {
  return (
    <section className="text-center py-16">
      <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl mb-4">
        Bienvenue à <span className="text-blue-600">GeoLib</span>
      </h1>
      <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-8">
        La plateforme numérique spécialisée en géographie et sciences minières. Accédez à 
        {totalBooks > 0 ? ` plus de ${totalBooks} ouvrages` : ' notre collection d\'ouvrages'} et explorez nos données géospatiales uniques.
      </p>

      <div className="flex justify-center gap-4 flex-wrap">
        <Link href="/catalog" passHref>
          <button className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-full font-semibold hover:bg-slate-700 transition-colors shadow-lg">
            <Search className="w-5 h-5" /> Démarrer la Recherche
          </button>
        </Link>
        
        {!isAuthenticated && (
          <Link href="/login" passHref>
            <button className="flex items-center gap-2 px-6 py-3 bg-blue-100 text-blue-700 rounded-full font-semibold hover:bg-blue-200 transition-colors">
              <UserCheck className="w-5 h-5" /> Se Connecter
            </button>
          </Link>
        )}
      </div>
    </section>
  )
}