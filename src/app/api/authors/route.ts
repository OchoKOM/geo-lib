/* eslint-disable @typescript-eslint/ban-ts-comment */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { hash } from '@node-rs/argon2'

// GET: Récupérer la liste des auteurs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')

    // On cherche les utilisateurs qui ont un profil d'auteur OU le rôle AUTHOR
    const authors = await prisma.authorProfile.findMany({
      where: q
        ? {
            user: {
              name: { contains: q, mode: 'insensitive' }
            }
          }
        : {},
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      take: 50
    })

    // On formate pour le frontend
    const formattedAuthors = authors.map(a => ({
      id: a.id, // ID du profil auteur (celui qu'on lie au livre)
      userId: a.user.id,
      name: a.user.name,
      email: a.user.email
    }))

    return NextResponse.json({ success: true, data: formattedAuthors })
  } catch (error) {
    console.error('Erreur récupération auteurs:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: Créer un nouvel auteur (Admin seulement)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    // @ts-ignore
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, biography } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nom et Email sont requis pour créer un auteur' },
        { status: 400 }
      )
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      // Si l'user existe, on vérifie s'il a déjà un profil auteur
      const existingProfile = await prisma.authorProfile.findUnique({
        where: { userId: existingUser.id }
      })

      if (existingProfile) {
        return NextResponse.json({
          success: true,
          author: {
            id: existingProfile.id,
            name: existingUser.name,
            userId: existingUser.id
          },
          message: 'Cet auteur existait déjà.'
        })
      }

      // Sinon on lui crée juste le profil
      const newProfile = await prisma.authorProfile.create({
        data: {
          userId: existingUser.id,
          biography: biography || ''
        }
      })

      // On met à jour son rôle
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: 'AUTHOR' }
      })

      return NextResponse.json({
        success: true,
        author: {
          id: newProfile.id,
          name: existingUser.name,
          userId: existingUser.id
        }
      })
    }

    // Création complète (User + Profile)
    // Mot de passe par défaut généré (à changer par l'utilisateur)
    const passwordHash = await hash('Author123!', {
      // recommended minimum parameters
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1
    })

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'AUTHOR',
        authorProfile: {
          create: {
            biography: biography || `Biographie de ${name}`
          }
        }
      },
      include: {
        authorProfile: true
      }
    })

    return NextResponse.json({
      success: true,
      author: {
        id: newUser.authorProfile!.id,
        name: newUser.name,
        userId: newUser.id
      },
      message: 'Auteur créé avec succès (Mdp par défaut: Author123!)'
    })
  } catch (error) {
    console.error('Erreur création auteur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}