"use server"
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen,
  Map,
  MapPin,
  Calendar,
  User,
  FileText,
  Download,
  Library,
  ArrowLeft,
  CalendarCheck,
  ArrowRight,
} from 'lucide-react'
import { Prisma } from '@prisma/client'

// =================================================================
// 1. Définitions des Types (pour la clarté)
// =================================================================

interface BookDetailsProps {
  params: { bookId: string }
}

const bookDetailsInclude = {
  author: {
    select: {
      id: true,
      user: {
        select: { id: true, name: true, bio: true, email: true },
      },
      biography: true,
    },
  },
  department: { select: { name: true } },
  coverImage: { select: { url: true, name: true, mimeType: true, size: true, type: true } },
  academicYear: { select: { year: true } },
  documentFile: { select: { url: true, name: true, mimeType: true, size: true, type: true } },
  studyAreas: {
    select: {
      studyArea: { select: { id: true, name: true, geometryType: true, centerLat: true, centerLng: true } },
    },
  },
  _count: { select: { loans: true } }
} as const

type BookDetailsType = Prisma.BookGetPayload<{
  include: typeof bookDetailsInclude
}>

// =================================================================
// 2. Fonction de Récupération des Données (Côté Serveur)
// =================================================================

async function getBookDetails(bookId: string): Promise<BookDetailsType> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
    author: {
        select: {
          id: true,
            user: {
                select: { id: true, name: true, bio: true, email: true },
            },
          biography: true,
        },
    },
    department: { select: { name: true } },
    coverImage: { select: { url: true, name: true, mimeType: true, size: true, type: true } },
    academicYear: { select: { year: true } },
    documentFile: { select: { url: true, name: true, mimeType: true, size: true, type: true } },
    studyAreas: {
        select: {   
        studyArea: { select: { id: true, name: true, geometryType: true, centerLat: true, centerLng: true } },
        },
    },
    loans: true,
    _count: { select: { loans: true }}
  },
})

  // Gérer le cas où le livre n'est pas trouvé
  if (!book) {
    return notFound()
  }
  return book
}

// =================================================================
// 3. Composant Principal de la Page
// =================================================================

export default async function BookDetailsPage({ params }: BookDetailsProps) {
    const {bookId} = await params
  const book = await getBookDetails(bookId)
  
  // Utiliser les données du livre, garanties non nulles par notFound()
  const authorName = book?.author?.user?.name ?? 'Auteur Inconnu'
  const departmentName = book?.department?.name ?? 'N/A'
  const year = book?.academicYear?.year ?? 'Inconnue'
  const documentFile = book?.documentFile

  return (
    <div className="container mx-auto p-4 lg:p-8">
      
      {/* Retour au Catalogue */}
      <Link href="/catalog" className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-6 font-medium">
        <ArrowLeft className="w-4 h-4 mr-2" /> Retour au Catalogue
      </Link>
      
      {/* En-tête du Livre */}
      <header className="mb-8 pb-4 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2 leading-tight">
          {book.title}
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400">
          Publié par <strong>{authorName}</strong>, {departmentName} ({year})
        </p>
      </header>

      {/* Disposition en Grille : Informations + Actions */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-10">
        
        {/* Colonne Principale (8/12) : Description et Zones d'Étude */}
        <section className="lg:col-span-8 space-y-8">
          
          {/* A. Description Détaillée */}
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3 border-b border-blue-600 pb-1">
              Résumé de l&apos;Ouvrage
            </h2>
            <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
              {book.description}
            </p>
          </div>

          <hr className="border-t border-slate-200 dark:border-slate-700" />
          
          {/* B. Zones d'Étude Associées */}
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Map className="w-6 h-6 text-green-600" /> Zones d&apos;Étude (<strong>{book.studyAreas.length}</strong>)
            </h2>
            
            {book.studyAreas.length > 0 ? (
                <ul className="space-y-3">
                    {book.studyAreas.map(({ studyArea }) => (
                        <li key={studyArea.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg shadow-sm flex justify-between items-center">
                            <div className='flex items-center gap-2'>
                                <span className='text-sm text-blue-600 font-semibold'>{studyArea.geometryType}</span>
                                <span className='text-lg font-medium dark:text-white'>{studyArea.name}</span>
                            </div>
                            <Link 
                                href={`/map?areaId=${studyArea.id}`} 
                                className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                            >
                                Voir sur la Carte <ArrowRight className="w-4 h-4" />
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-slate-600 dark:text-slate-400">
                    Aucune zone géospatiale spécifique n&apos;est associée directement à cet ouvrage.
                </p>
            )}
          </div>
        </section>

        {/* Colonne Latérale (4/12) : Métadonnées et Actions */}
        <aside className="lg:col-span-4 mt-8 lg:mt-0 space-y-8">
          
          {/* C. Métadonnées du Livre */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
              Détails Clés
            </h3>
            <div className="space-y-3 text-slate-700 dark:text-slate-300 text-sm">
              <p className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-500" /> Année Académique : <strong>{year}</strong>
              </p>
              <p className="flex items-center gap-3">
                <Library className="w-5 h-5 text-slate-500" /> Département : <strong>{departmentName}</strong>
              </p>
              <p className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-slate-500" /> Localisation Physique : <strong>{book.location || 'N/A'}</strong>
              </p>
              <p className="flex items-center gap-3">
                <CalendarCheck className="w-5 h-5 text-slate-500" /> Date d&apos;Ajout : <strong>{new Date(book.createdAt).toLocaleDateString()}</strong>
              </p>
              <p className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-slate-500" /> Nombre de Prêts : <strong>{book._count.loans}</strong>
              </p>
            </div>
          </div>
          
          {/* D. Actions et Fichier */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
              Consultation et Prêt
            </h3>
            
            {/* Action Prêt (Simulée) */}
            <div className='mb-4'>
                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md" disabled>
                    <Library className="w-5 h-5" /> Demander un Prêt (Bientôt)
                </button>
                <p className='text-xs text-center text-slate-500 dark:text-slate-400 mt-1'>
                    La gestion des prêts sera accessible après authentification.
                </p>
            </div>
            
            {/* Fichier Document (si présent) */}
            {documentFile ? (
                <div className='mt-6 border-t pt-4 border-slate-200 dark:border-slate-700'>
                    <p className="flex items-center gap-2 text-slate-800 dark:text-white mb-2 font-medium">
                        <FileText className="w-5 h-5 text-red-600" /> Document Numérique :
                    </p>
                    <a 
                        href={documentFile.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        // Laisser le bouton de téléchargement en bleu
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
                    >
                        <Download className="w-5 h-5" /> 
                        Télécharger ({documentFile.name})
                    </a>
                    <p className='text-xs text-center text-slate-500 dark:text-slate-400 mt-1'>
                        Taille : <strong>{(documentFile.size / 1048576).toFixed(2)} Mo</strong> | Type : <strong>{documentFile.mimeType}</strong>
                    </p>
                </div>
            ) : (
                <div className="text-sm text-center p-3 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg">
                    Aucun document numérique PDF/Web associé directement à cet ouvrage.
                </div>
            )}
          </div>

          {/* E. Profil Auteur */}
          {book.author && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" /> À propos de l&apos;Auteur
              </h3>
              <p className="font-semibold dark:text-white mb-1">{book.author.user.name}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                {book.author.biography || book.author.user.bio}
              </p>
              <Link 
                href={`/users/${book.author.user.id}`} 
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Voir le profil complet →
              </Link>
            </div>
          )}

        </aside>
      </div>
    </div>
  )
}