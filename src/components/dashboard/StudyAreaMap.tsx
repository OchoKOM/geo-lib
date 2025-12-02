/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, Popup, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { showToast } from '@/hooks/useToast'
import { Edit, Trash2, BookOpen } from 'lucide-react'

// Correction icônes Leaflet
// @ts-expect-error
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Area {
  id: string
  name: string
  bookCount: number
  color: string
  geometry: any // Objet GeoJSON
  // AJOUT des permissions d'édition/suppression
  canEdit: boolean
  canDelete: boolean
}

interface StudyAreaMapProps {
  areas: Area[]
}

export default function StudyAreaMap({ areas }: StudyAreaMapProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div className="h-[400px] w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse flex items-center justify-center text-slate-400">
      Chargement de l&apos;interface cartographique...
    </div>
  }
  
  // Style par défaut pour les zones GeoJSON
  const geoJsonStyle = {
    fillColor: '#3b82f6',
    weight: 2,
    opacity: 1,
    color: '#2563eb', // Bordure bleue
    dashArray: '3',
    fillOpacity: 0.4
  }

  // Fonctions de gestion des actions (stubs pour l'exemple)
  const handleEdit = (areaId: string) => {
    showToast(`Fonctionnalité: Modifier la zone ${areaId}`, 'default')
    // TODO: Implémenter la navigation vers la page d'édition ou un modal
  }

  const handleDelete = (areaId: string) => {
    showToast(`Fonctionnalité: Supprimer la zone ${areaId}`, 'destructive')
    // TODO: Implémenter le modal de confirmation et l'appel API
  }

  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm z-0 relative">
      <MapContainer
        center={[-4.0383, 21.7587]} // Centre sur la RDC par défaut
        zoom={5} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {areas && areas.map((area) => (
          <GeoJSON 
            key={area.id} 
            data={area.geometry}
            style={geoJsonStyle}
          >
             {/* Tooltip visible au survol */}
             <Tooltip sticky>
                <div className='font-bold text-sm'>{area.name}</div>
                <div className='text-xs text-slate-500'>({area.bookCount} travaux associés)</div>
             </Tooltip>

             {/* Popup au clic */}
             <Popup>
                <div className="p-1 min-w-[200px]">
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{area.name}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center mb-3">
                        <BookOpen className="w-4 h-4 mr-2 text-blue-500" />
                        {area.bookCount} Travail{area.bookCount > 1 ? 's' : ''} associé{area.bookCount > 1 ? 's' : ''}
                    </p>
                    
                    {/* AFFICHAGE CONDITIONNEL DES OPTIONS D'ÉDITION */}
                    {(area.canEdit || area.canDelete) && (
                        <div className="flex justify-between space-x-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                            {area.canEdit && (
                                <button
                                    onClick={() => handleEdit(area.id)}
                                    className="flex-1 px-3 py-1 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-md shadow-sm transition flex items-center justify-center"
                                >
                                    <Edit className="w-4 h-4 mr-1" /> Modifier
                                </button>
                            )}
                            {area.canDelete && (
                                <button
                                    onClick={() => handleDelete(area.id)}
                                    className="flex-1 px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md shadow-sm transition flex items-center justify-center"
                                >
                                    <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                                </button>
                            )}
                        </div>
                    )}
                </div>
             </Popup>
          </GeoJSON>
        ))}
      </MapContainer>
    </div>
  )
}