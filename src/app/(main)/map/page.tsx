import MapEditorWrapper from '@/components/editor/MapEditorWrapper'
import { Loader2 } from 'lucide-react'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Éditeur Spatial - GeoLib',
  description: 'Outil de création et édition de données géospatiales',
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400">
      <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
      <p>Chargement...</p>
    </div>}>
                <MapEditorWrapper />
            </Suspense>
  )
}