import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, MapPin, Building2, User as UserIcon, Calendar, Book } from 'lucide-react'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getPublicBookDetails } from '@/lib/public-actions'
import { BookActions } from '@/components/books/BookActions'
import { Badge } from '@/components/ui/badge'

interface PageProps {
  params: { bookId: string }
}

export default async function BookDetailsPage({ params }: PageProps) {
  const { bookId } = await params
  
  // 1. Chargement des données du livre
  const book = await getPublicBookDetails(bookId)
  if (!book) return notFound()

  // 2. Contexte Utilisateur (Session + Abonnement + Status Demande)
  const { user } = await getSession()
  let userData = null
  let requestStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null = null

  if (user) {
    // Vérifier l'abonnement
    const sub = await prisma.subscription.findUnique({
      where: { userId: user.id }
    })
    
    // Vérifier s'il y a une demande de prêt existante
    const loanRequest = await prisma.loanRequest.findUnique({
      where: {
        userId_bookId: {
          userId: user.id,
          bookId: bookId
        }
      }
    })

    userData = {
      ...user,
      hasActiveSubscription: (sub && sub.isActive && new Date(sub.endDate) > new Date()) || false,
    }
    
    if (loanRequest) requestStatus = loanRequest.status
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      
      {/* HEADER / NAVIGATION */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/books" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au catalogue
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLONNE GAUCHE : IMAGE & DETAILS CLEFS */}
          <div className="space-y-6">
            <div className="aspect-2/3 relative rounded-lg overflow-hidden shadow-md bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {book.coverImage ? (
                <Image 
                  src={book.coverImage.url} 
                  alt={book.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <Book className="w-16 h-16 mb-4 opacity-20" />
                  <span className="text-sm">Aucune couverture</span>
                </div>
              )}
            </div>

            {/* Infos académiques */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <span className="block font-medium text-slate-900 dark:text-slate-100">Département</span>
                  <span className="text-slate-500">{book.department?.name || 'Non spécifié'}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <span className="block font-medium text-slate-900 dark:text-slate-100">Faculté</span>
                  <span className="text-slate-500">{book.department?.faculty?.name || 'Non spécifié'}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <span className="block font-medium text-slate-900 dark:text-slate-100">Année de publication</span>
                  <span className="text-slate-500">{new Date(book.postedAt).getFullYear()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLONNE CENTRALE : CONTENU */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Titre et Auteur */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-100">
                  {book.type}
                </Badge>
                {book.studyAreas.map((area, i) => (
                  <Badge key={i} variant="outline" className="text-slate-600 dark:text-slate-400">
                    {area.studyArea.name}
                  </Badge>
                ))}
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                {book.title}
              </h1>
              
              <div className="flex items-center gap-3 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {book.author?.user.name || 'Auteur Inconnu'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {book.author?.user.username}
                  </p>
                </div>
              </div>
            </div>

            {/* Resume / Abstract */}
            <div className="prose dark:prose-invert max-w-none">
              <h3 className="text-xl font-semibold mb-2 text-slate-800 dark:text-slate-200">Résumé</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {book.description}
              </p>
            </div>

            {/* Biographie auteur si dispo */}
            {book.author?.biography && (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-lg border border-slate-100 dark:border-slate-800">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">À propos de l&apos;auteur</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                  {book.author.biography}
                </p>
              </div>
            )}

            {/* Zone d'action Mobile (visible seulement sur petit écran, en bas du contenu) */}
            <div className="lg:hidden">
              <BookActions 
                bookId={book.id}
                isAvailable={book.available}
                hasDigitalFile={!!book.documentFileId}
                user={userData}
                existingRequestStatus={requestStatus}
              />
            </div>
          </div>
        </div>
      </main>

      {/* SIDEBAR FLOTTANTE (Desktop uniquement) */}
      <div className="hidden lg:block fixed right-8 top-32 w-80">
         <BookActions 
            bookId={book.id}
            isAvailable={book.available}
            hasDigitalFile={!!book.documentFileId}
            user={userData}
            existingRequestStatus={requestStatus}
         />
      </div>

    </div>
  )
}