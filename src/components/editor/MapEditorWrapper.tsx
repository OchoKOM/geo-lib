'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { Suspense } from 'react'
import GeoMap from './GeoMap'


export default function MapEditorWrapper() {
  return <Suspense fallback={<div className="h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400">
      <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
      <p>Chargement de l&apos;éditeur spatial...</p>
    </div>}>
    <GeoMap />
  </Suspense>
}