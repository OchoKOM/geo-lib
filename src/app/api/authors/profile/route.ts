import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET: Récupérer le profil auteur de l'utilisateur connecté
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const authorProfile = await prisma.authorProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        biography: true
      }
    })

    if (!authorProfile) {
      return NextResponse.json({ error: 'Profil auteur non trouvé' }, { status: 404 })
    }

    return NextResponse.json(authorProfile)
  } catch (error) {
    console.error('Erreur récupération profil auteur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
