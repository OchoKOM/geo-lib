"use server"
import { BookType } from '@/lib/types'
import { notFound } from 'next/navigation'
import { getBookData, getSelectOptions } from '../actions'
import BookForm from './BookForm'



interface PageProps {
  params: { bookId: string }
}

// Generer les metadata dynamiquement
export async function generateMetadata ({ params }: PageProps) {
  const book = await getBookData(params.bookId)
  if (!book) {
    return {
      title: 'Ouvrage non trouvé'
    }
  }
  return {
    title: book.title,
    description: book.description || "Détails de l'ouvrage académique"
  }
}

// Server Component pour le chargement des données
export default async function BookDetailsPage ({ params }: PageProps) {
  const { bookId } = await params

  const bookData = await getBookData(bookId)

  if (!bookData) {
    return notFound()
  }

  // Chargement des options de sélection (Départements, Années)
  const selectOptions = await getSelectOptions()

  // On passe les données du serveur au Client Component
  return (
    <BookForm
      initialBook={bookData}
      options={selectOptions}
      isEditable={!!bookData.isEditable}
    />
  )
}
