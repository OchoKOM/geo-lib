import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma  from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params

    // Fetch user with related data
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      include: {
        avatar: true,
        loans: {
          where: {
            returnDate: null, // Active loans
          },
          include: {
            book: {
              include: {
                coverImage: true,
                author: true,
              },
            },
          },
        },
        subscription: {
          where: {
            isActive: true,
          },
        },
        authorProfile: {
          include: {
            books: {
              include: {
                coverImage: true,
                documentFile: true,
                department: true,
                academicYear: true,
              },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get current session to check if viewing own profile
    const { user: currentUser } = await getSession()

    // Remove sensitive data for public view
    const publicUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      createdAt: user.createdAt,
      loans: user.loans,
      subscription: user.subscription,
      authorProfile: user.authorProfile,
      isOwnProfile: currentUser?.id === user.id,
    }

    return NextResponse.json({ user: publicUser })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
