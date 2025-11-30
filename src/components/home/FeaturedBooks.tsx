// components/home/FeaturedBooks.tsx
import Link from 'next/link'
import { BookOpen, Map, Globe2 } from 'lucide-react'

interface BookData {
  id: string
  title: string
  description: string
  departmentName: string
  authorName: string
  studyAreasCount: number
}

interface FeaturedBooksProps {
  books: BookData[]
}

export function FeaturedBooks({ books }: FeaturedBooksProps) {
  return (
    <section>
      <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-8 border-b pb-2 border-blue-600">
        Livres Récents & Mis en Avant
      </h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {books.map(book => (
          <div 
            key={book.id} 
            className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow"
          >
            <h3 className="text-xl font-bold text-blue-600 mb-2">{book.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-3">
              {book.description}
            </p>
            <div className="text-xs space-y-1 mb-4">
                <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <BookOpen className="w-4 h-4 text-slate-400" /> Auteur : {book.authorName}
                </p>
                <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Globe2 className="w-4 h-4 text-slate-400" /> Département : {book.departmentName}
                </p>
                {book.studyAreasCount > 0 && (
                    <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Map className="w-4 h-4 text-green-500" /> Zones d&apos;étude liées : {book.studyAreasCount}
                    </p>
                )}
            </div>
            <Link href={`/catalog/${book.id}`} passHref>
                <button className="text-blue-600 font-semibold text-sm hover:text-blue-700 transition-colors mt-2">
                    Voir les détails →
                </button>
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}