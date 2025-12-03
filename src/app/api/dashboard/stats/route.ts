import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const [totalBooks, totalAuthors, totalAreas] = await Promise.all([
      prisma.book.count(),
      prisma.authorProfile.count(),
      prisma.studyArea.count()
    ])

    return NextResponse.json({
      success: true,
      stats: {
        totalBooks,
        totalAuthors,
        totalAreas
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur stats' }, { status: 500 })
  }
}