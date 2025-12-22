'use server'

import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { DashboardLoan, DashboardSubscription, DashBoardAuthorProfile, UserRole, DashboardDepartment, DashboardStudyArea } from '@/lib/types'
import { BookType } from '@prisma/client'

export interface UserProfileData {
  id: string
  username: string
  name: string | null
  avatarUrl: string | null
  bio: string | null
  role: UserRole
  createdAt: string
  dateOfBirth?: string | null
  loans: DashboardLoan[]
  subscription: DashboardSubscription | null
  authorProfile: DashBoardAuthorProfile | null
  isOwnProfile: boolean
}

export interface AddBookData {
  title: string
  description: string
  type: BookType
  departmentId: string
  studyAreaIds: string[]
  authorId: string | null
}

export async function getUserProfile(username: string): Promise<UserProfileData | null> {
  try {
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
      return null
    }

    // Get current session to check if viewing own profile
    const { user: currentUser } = await getSession()

    // Remove sensitive data for public view
    const publicUser: UserProfileData = {
      id: user.id,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      loans: user.loans as DashboardLoan[],
      subscription: user.subscription as DashboardSubscription | null,
      authorProfile: user.authorProfile as DashBoardAuthorProfile | null,
      isOwnProfile: currentUser?.id === user.id,
    }

    return publicUser
  } catch (error) {
    console.error('Error fetching user profile:', error)
    throw new Error('Failed to fetch user profile')
  }
}

export async function getAuthorProfile(): Promise<{ biography: string } | null> {
  try {
    const session = await getSession()
    if (!session?.user) {
      throw new Error('Not authenticated')
    }

    const authorProfile = await prisma.authorProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        biography: true
      }
    })

    if (!authorProfile) {
      return null
    }

    return authorProfile
  } catch (error) {
    console.error('Error fetching author profile:', error)
    throw new Error('Failed to fetch author profile')
  }
}

export async function getDepartments(): Promise<DashboardDepartment[]> {
  try {
    const departments = await prisma.department.findMany({
      include: {
        faculty: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' }
    })

    return departments
  } catch (error) {
    console.error('Error fetching departments:', error)
    throw new Error('Failed to fetch departments')
  }
}

export async function getStudyAreas(): Promise<DashboardStudyArea[]> {
  try {
    const studyAreas = await prisma.studyArea.findMany({
      orderBy: { name: 'asc' }
    })

    return studyAreas
  } catch (error) {
    console.error('Error fetching study areas:', error)
    throw new Error('Failed to fetch study areas')
  }
}

export async function addBook(data: AddBookData): Promise<void> {
  try {
    const session = await getSession()
    if (!session?.user) {
      throw new Error('Not authenticated')
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { authorProfile: true }
    })

    if (!user || !["ADMIN", "LIBRARIAN", "AUTHOR"].includes(user.role)) {
      throw new Error('Forbidden')
    }

    const { title, description, type, departmentId, studyAreaIds, authorId } = data

    if (!title.trim() || !description.trim() || !departmentId) {
      throw new Error('Missing required fields')
    }

    // Determine final author ID
    let finalAuthorId = authorId

    // If no author selected but user is an author, assign by default
    if (!finalAuthorId && user.role === 'AUTHOR' && user.authorProfile) {
      finalAuthorId = user.authorProfile.id
    }

    // Create book data
    const bookData: {
      title: string
      description: string
      type: BookType
      departmentId: string
      authorId: string | null
      studyAreas?: {
        create: { studyAreaId: string }[]
      }
    } = {
      title,
      description,
      type,
      departmentId,
      authorId: finalAuthorId || null,
    }

    // Add study areas if provided
    if (studyAreaIds && studyAreaIds.length > 0) {
      bookData.studyAreas = {
        create: studyAreaIds.map(studyAreaId => ({
          studyAreaId
        }))
      }
    }

    await prisma.book.create({
      data: bookData
    })

  } catch (error) {
    console.error('Error adding book:', error)
    throw new Error('Failed to add book')
  }
}

export async function deleteBook(bookId: string): Promise<void> {
  try {
    const session = await getSession()
    if (!session?.user) {
      throw new Error('Not authenticated')
    }

    // Find the book and check ownership
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        author: { include: { user: true } },
        coverImage: true,
        documentFile: true
      }
    })

    if (!book) {
      throw new Error('Book not found')
    }

    // Check if user owns the book (author or admin)
    const isOwner = book.author?.userId === session.user.id
    const isAdmin = session.user.role === 'ADMIN'
    if (!isOwner && !isAdmin) {
      throw new Error('Forbidden')
    }

    // Soft delete associated files
    if (book.coverImageId) {
      await prisma.file.update({
        where: { id: book.coverImageId },
        data: { isDeleted: true }
      })
    }
    if (book.documentFileId) {
      await prisma.file.update({
        where: { id: book.documentFileId },
        data: { isDeleted: true }
      })
    }

    // Hard delete the book
    await prisma.book.delete({
      where: { id: bookId }
    })

  } catch (error) {
    console.error('Error deleting book:', error)
    throw new Error('Failed to delete book')
  }
}

export async function deleteUserProfile(): Promise<void> {
  try {
    const session = await getSession()
    if (!session?.user) {
      throw new Error('Not authenticated')
    }

    // Find the user and check ownership
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { avatar: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Soft delete avatar file if exists
    if (user.avatarId) {
      await prisma.file.update({
        where: { id: user.avatarId },
        data: { isDeleted: true }
      })
    }

    // Hard delete the user (this will cascade delete related data)
    await prisma.user.delete({
      where: { id: session.user.id }
    })

  } catch (error) {
    console.error('Error deleting user profile:', error)
    throw new Error('Failed to delete user profile')
  }
}
