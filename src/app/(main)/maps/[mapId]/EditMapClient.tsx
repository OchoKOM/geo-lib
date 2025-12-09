'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
// Imports dynamiques pour Leaflet (SSR fix)
import dynamic from 'next/dynamic'
import { useFormState, useFormStatus } from 'react-dom'
import { updateStudyArea } from '../actions'
import { 
  Save, Layers, Book, TableProperties, AlertCircle, ArrowLeft, 
  Plus, Trash2, Map as MapIcon, Loader2, 
  PenTool,
  Settings2,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { showToast } from '@/hooks/useToast'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'

// On doit importer Leaflet Draw côté client uniquement
if (typeof window !== 'undefined') {
  require('leaflet-draw')
}

// Bouton de soumission connecté au status du formulaire
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full bg-blue-600 hover:bg-blue-700">
      {pending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sauvegarde...</> : <><Save className="w-4 h-4 mr-2" /> Enregistrer les modifications</>}
    </Button>
  )
}

interface EditMapClientProps {
  studyArea: any
  initialGeoJson: any
  initialBooks: any[]
}

export default function EditMapClient({ studyArea, initialGeoJson, initialBooks }: EditMapClientProps) {
  // --- STATES ---
  const [map, setMap] = useState<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)
  
  // State pour les propriétés (Table attributaire)
  // On prend les properties de la première feature par défaut
  const [properties, setProperties] = useState<Record<string, string>>({})
const [isGeometryDialogOpen, setIsGeometryDialogOpen] = useState(false)
const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  
  // Server Action State
  const [state, formAction] = useActionState(updateStudyArea.bind(null, studyArea.id), { success: false, message: '' })

  // Initialisation de la carte
  useEffect(() => {
    if (!mapContainerRef.current || map) return

    const mapInstance = L.map(mapContainerRef.current).setView([
      studyArea.centerLat || -4.4419, 
      studyArea.centerLng || 15.2663
    ], 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM'
    }).addTo(mapInstance)

    // Groupe pour dessiner/éditer
    const drawnItems = new L.FeatureGroup()
    mapInstance.addLayer(drawnItems)
    featureGroupRef.current = drawnItems

    // Chargement du GeoJSON existant
    if (initialGeoJson) {
      const layer = L.geoJSON(initialGeoJson, {
        onEachFeature: (feature, l) => {
          // Charger les propriétés attributaires
          if (feature.properties) {
            // Convertir tout en string pour l'édition simple
            const stringProps: Record<string, string> = {}
            Object.entries(feature.properties).forEach(([k, v]) => {
              stringProps[k] = String(v)
            })
            setProperties(prev => ({ ...prev, ...stringProps }))
          }
        }
      })
      
      // Ajouter chaque couche individuellement au FeatureGroup éditable
      layer.eachLayer((l) => {
        drawnItems.addLayer(l)
      })

      if (layer.getBounds().isValid()) {
        mapInstance.fitBounds(layer.getBounds())
      }
    }

    // Contrôles d'édition (Support Multi via l'ajout multiple)
    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems,
        remove: true
      },
      draw: {
        polygon: {},
        polyline: {},
        rectangle: {},
        circle: false,
        marker: {},
        circlemarker: false
      }
    })
    mapInstance.addControl(drawControl)

    // Events
    mapInstance.on(L.Draw.Event.CREATED, (e: any) => {
      drawnItems.addLayer(e.layer)
    })

    setMap(mapInstance)

    return () => {
      mapInstance.remove()
    }
  }, [])

  // Feedback Server Action
  useEffect(() => {
    if (state.message) {
      if (state.success) showToast(state.message, 'success')
      else showToast(state.message, 'destructive')
    }
  }, [state])

  // --- LOGIQUE ATTRIBUTAIRE ---
  const handlePropChange = (key: string, value: string) => {
    setProperties(prev => ({ ...prev, [key]: value }))
  }

  const addProperty = () => {
    const key = prompt("Nom de la nouvelle propriété (colonne) :")
    if (key) {
      setProperties(prev => ({ ...prev, [key]: "" }))
    }
  }

  const removeProperty = (key: string) => {
    if (confirm(`Supprimer la propriété "${key}" ?`)) {
      const newProps = { ...properties }
      delete newProps[key]
      setProperties(newProps)
    }
  }

  // --- PRÉPARATION DU FORMULAIRE ---
  // Avant de soumettre, on doit capturer le GeoJSON actuel de la carte
  // et y injecter les propriétés attributaires mises à jour
  const prepareFormData = (formData: FormData) => {
    if (!featureGroupRef.current) return

    // Convertir le FeatureGroup en GeoJSON
    // Cela crée automatiquement une FeatureCollection
    const rawGeoJson = featureGroupRef.current.toGeoJSON() as any

    // Injecter les propriétés dans CHAQUE feature
    if (rawGeoJson.features) {
      rawGeoJson.features = rawGeoJson.features.map((f: any) => ({
        ...f,
        properties: { ...properties } // Appliquer la table attributaire à toutes les géométries
      }))
    }

    formData.set('geojson', JSON.stringify(rawGeoJson))
    // L'ID est passé via le bind dans le server action ou via un champ caché, 
    // mais ici on utilise le bind(null, id) dans le hook useFormState qui gère l'ID via la closure updateStudyArea(id, ...)
    // Note: Dans l'implémentation ci-dessus, j'ai utilisé une signature simple, on va passer l'ID via un hidden input pour simplifier
  }

  return (
    <div className="flex flex-col relative h-[calc(100dvh-64px)] bg-slate-50 dark:bg-slate-950">
      
      {/* HEADER */}
      <header className="h-16 flex-none border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-blue-600" />
              {studyArea.name}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            onClick={() => setIsGeometryDialogOpen(true)}
          >
            <PenTool className="w-4 h-4 mr-2" />
            Mode Édition
          </Button>

          <Button 
            variant={isSidebarOpen ? "secondary" : "default"}
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Settings2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* CARTE (Centre) */}
        <div className="flex-1 relative bg-slate-200">
           <div ref={mapContainerRef} className="absolute inset-0 z-0" />
        </div>

        {/* SIDEBAR (Droite) */}
        <div 
          className={`
            absolute top-0 right-0 bottom-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 
            shadow-2xl z-20 transition-transform duration-300 ease-in-out w-96 flex flex-col max-w-full
            ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-slate-500">Inspecteur</h2>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <form action={(formData) => { prepareFormData(formData); formAction(formData); }} className="p-4 space-y-6">
            <input type="hidden" name="id" value={studyArea.id} />
            
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-4">
                <TabsTrigger value="general"><Layers className="w-4 h-4"/>Couches</TabsTrigger>
                <TabsTrigger value="attributes"><TableProperties className="w-4 h-4"/>Data</TabsTrigger>
                <TabsTrigger value="books"><Book className="w-4 h-4"/>Livres</TabsTrigger>
              </TabsList>

              {/* ONGLET 1 : GÉNÉRAL */}
              <TabsContent value="general" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom de la Zone</label>
                  <Input name="name" defaultValue={studyArea.name} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea name="description" defaultValue={studyArea.description || ''} rows={4} />
                </div>
                
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-xs rounded-md border border-blue-100 dark:border-blue-900 flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>
                    Utilisez les outils de dessin sur la carte pour ajouter des polygones. 
                    Si vous dessinez plusieurs formes, elles seront automatiquement groupées (MultiPolygon/MultiLine).
                  </p>
                </div>
              </TabsContent>

              {/* ONGLET 2 : TABLE ATTRIBUTAIRE */}
              <TabsContent value="attributes" className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Attributs (GeoJSON)</h3>
                  <Button type="button" size="sm" variant="outline" onClick={addProperty}>
                    <Plus className="w-3 h-3 mr-1" /> Colonne
                  </Button>
                </div>
                
                {Object.keys(properties).length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm border border-dashed rounded-lg">
                    Aucune propriété définie.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(properties).map(([key, value]) => (
                      <div key={key} className="space-y-1 p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-600 uppercase">{key}</label>
                          <button type="button" onClick={() => removeProperty(key)} className="text-slate-400 hover:text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <Input 
                          value={value} 
                          onChange={(e) => handlePropChange(key, e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ONGLET 3 : LIVRES ASSOCIÉS */}
              <TabsContent value="books" className="space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-sm font-semibold">Travaux académiques ({initialBooks.length})</h3>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {initialBooks.map((book) => (
                    <Card key={book.id} className="shadow-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <CardHeader className="p-3 pb-0">
                        <CardTitle className="text-sm font-medium leading-tight hover:text-blue-600 cursor-pointer">
                          {book.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-1">
                        <div className="flex flex-wrap gap-1 mb-2">
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">
                            {book.type}
                          </span>
                          <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                            {book.year}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {book.authorName} • {book.department}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                  {initialBooks.length === 0 && (
                    <p className="text-sm text-slate-500 italic">Aucun livre associé à cette zone pour le moment.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
              <SubmitButton />
              <p className="text-xs text-center text-slate-400 mt-2">
                Les modifications affecteront la base de données et le fichier GeoJSON.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}