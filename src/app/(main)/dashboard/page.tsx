/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import {
  BookOpen,
  Search,
  Map as MapIcon,
  Plus,
  FileText,
  Users,
  BarChart3,
  Loader2,
  X,
  Check,
  Landmark,
  Calendar,
  Lock,
  Pencil,     
  Upload,     
  Trash,      
  Link as LinkIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/components/AuthProvider'
import { showToast } from '@/hooks/useToast'
import { Label } from '@/components/ui/label'
// NOUVEAU : Import du hook d'upload réel
import { useUploadThing } from '@/lib/uploadthing'

// --- TYPES ---

type BookType = 'TFC' | 'MEMOIRE' | 'THESE' | 'ARTICLE' | 'OUVRAGE' | 'RAPPORT' | 'AUTRE'

interface StudyAreaSimple {
  id: string
  name: string
  geometryType: string
}

interface FileData {
    id: string
    url: string
    name: string
}

interface Book {
  id: string
  title: string
  description: string
  type: BookType
  author: { name: string; id?: string } | null
  academicYear: { year: string } | null
  department: { name: string } | null
  studyAreas: { studyArea: StudyAreaSimple }[]
  documentFile?: FileData | null
  createdAt: string
}

interface Stats {
  totalBooks: number
  totalAuthors: number
  totalAreas: number
}

// --- CONFIGURATION LEAFLET ---
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
  })
}

export default function Dashboard() {
  const { role, isAuthenticated } = useAuth()
  const isAuthorized = ['ADMIN', 'LIBRARIAN', 'AUTHOR'].includes(role)
  
  // NOUVEAU : Hook UploadThing configuré sur la route 'documentUploader'
  const { startUpload, isUploading: isUploadThingUploading } = useUploadThing("documentUploader", {
    onUploadError: (error: Error) => {
        showToast(`Erreur téléversement: ${error.message}`, "destructive")
    }
  })

  // UI State
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [activeTab, setActiveTab] = useState('library')
  
  // Data State
  const [books, setBooks] = useState<Book[]>([])
  const [stats, setStats] = useState<Stats>({ totalBooks: 0, totalAuthors: 0, totalAreas: 0 })
  const [isLoading, setIsLoading] = useState(false)
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchAlertDialogOpen, setIsSearchAlertDialogOpen] = useState(false)
  const [searchBounds, setSearchBounds] = useState<L.LatLngBounds | null>(null)
  
  // Map Refs
  const miniMapRef = useRef<L.Map | null>(null)
  const miniMapContainerRef = useRef<HTMLDivElement>(null)
  const searchDrawLayerRef = useRef<L.FeatureGroup | null>(null)
  const miniMapTileLayerRef = useRef<L.TileLayer | null>(null)

  // Publication State
  const [isPublishAlertDialogOpen, setIsPublishAlertDialogOpen] = useState(false)
  const [studyAreaSearch, setStudyAreaSearch] = useState('')
  const [foundAreas, setFoundAreas] = useState<StudyAreaSimple[]>([])
  const [newBook, setNewBook] = useState({
    title: '',
    description: '',
    type: 'TFC' as BookType,
    studyAreaId: ''
  })
  const [isPublishing, setIsPublishing] = useState(false)

  // Edit State
  const [isEditAlertDialogOpen, setIsEditAlertDialogOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Partial<Book> & { 
      newStudyAreaId?: string, 
      fileToUpload?: File | null 
  }>({})
  const [isUpdating, setIsUpdating] = useState(false)

  // --- INITIALISATION ---

  useEffect(() => {
    const checkTheme = () => setIsDarkMode(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    
    fetchStats()
    fetchBooks() 

    return () => observer.disconnect()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats')
      const data = await res.json()
      if (data.success) setStats(data.stats)
    } catch (e) {
      console.error("Erreur stats", e)
    }
  }

  // --- RECHERCHE ET LISTING ---

  const fetchBooks = async () => {
    setIsLoading(true)
    try {
      let url = `/api/books?q=${encodeURIComponent(searchQuery)}`
      
      if (searchBounds) {
        const sw = searchBounds.getSouthWest()
        const ne = searchBounds.getNorthEast()
        url += `&minLat=${sw.lat}&maxLat=${ne.lat}&minLng=${sw.lng}&maxLng=${ne.lng}`
      }

      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setBooks(data.data)
        if (searchBounds) {
          showToast(`${data.data.length} document(s) trouvé(s) dans la zone.`, 'success')
          setIsSearchAlertDialogOpen(false) 
        }
      }
    } catch (e) {
      showToast("Erreur lors de la récupération des livres", "destructive")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSpatialSearch = () => {
    if (!searchBounds) {
        showToast("Veuillez dessiner une zone sur la carte", "warning")
        return
    }
    fetchBooks()
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSearchBounds(null)
    setTimeout(() => {
        const url = `/api/books`
        fetch(url).then(r => r.json()).then(d => setBooks(d.data))
    }, 100)
  }

  // --- LOGIQUE MINI MAP ---
  useEffect(() => {
    if (isSearchAlertDialogOpen && miniMapContainerRef.current && !miniMapRef.current) {
      const miniMap = L.map(miniMapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
        center: [-4.4419, 15.2663],
        zoom: 10
      })

      const searchGroup = new L.FeatureGroup()
      miniMap.addLayer(searchGroup)
      searchDrawLayerRef.current = searchGroup

      const drawControl = new L.Control.Draw({
        edit: { featureGroup: searchGroup, remove: true },
        draw: {
          polygon: false, polyline: false, circle: false, marker: false, circlemarker: false,
          rectangle: { shapeOptions: { color: '#3b82f6', weight: 2 } }
        }
      })
      miniMap.addControl(drawControl)

      miniMap.on(L.Draw.Event.CREATED, (e: any) => {
        searchGroup.clearLayers()
        searchGroup.addLayer(e.layer)
        setSearchBounds(e.layer.getBounds())
      })

      miniMap.on(L.Draw.Event.DELETED, () => setSearchBounds(null))
      miniMapRef.current = miniMap
      
      setTimeout(() => miniMap.invalidateSize(), 100)
    }

    if (miniMapRef.current) {
        if (miniMapTileLayerRef.current) miniMapRef.current.removeLayer(miniMapTileLayerRef.current)
        const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        const lightUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        
        miniMapTileLayerRef.current = L.tileLayer(isDarkMode ? darkUrl : lightUrl, {
            maxZoom: 19, attribution: '&copy; OSM/CartoDB'
        }).addTo(miniMapRef.current)
        miniMapTileLayerRef.current.bringToBack()
    }
  }, [isSearchAlertDialogOpen, isDarkMode])


  // --- PUBLICATION DE LIVRE ---

  const searchStudyAreas = async (query: string) => {
    if (query.length < 2) return
    const res = await fetch(`/api/study-areas?q=${query}`)
    const data = await res.json()
    if (data.success) setFoundAreas(data.results)
  }

  const handlePublish = async () => {
    if (!newBook.title || !newBook.studyAreaId) {
        showToast("Titre et Zone d'étude requis", "warning")
        return
    }

    setIsPublishing(true)
    try {
        const res = await fetch('/api/books', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(newBook)
        })
        const data = await res.json()
        
        if (data.success) {
            showToast("Document publié avec succès", "success")
            setIsPublishAlertDialogOpen(false)
            setNewBook({ title: '', description: '', type: 'TFC', studyAreaId: '' })
            fetchStats() 
            fetchBooks() 
        } else {
            showToast(data.error || "Erreur de publication", "destructive")
        }
    } catch (e) {
        showToast("Erreur serveur", "destructive")
    } finally {
        setIsPublishing(false)
    }
  }

  // --- GESTION DE LA MODIFICATION AVEC UPLOAD RÉEL ---

  const openEditAlertDialog = (book: Book) => {
      setEditingBook({
          ...book,
          newStudyAreaId: '',
          fileToUpload: null // Reset file
      })
      setIsEditAlertDialogOpen(true)
  }

  const handleUpdate = async () => {
      if (!editingBook.id || !editingBook.title) return

      setIsUpdating(true)
      try {
          let uploadedFileUrl = ''
          let uploadedFileName = ''
          let uploadedFileSize = 0
          
          // 1. TÉLÉVERSEMENT DU FICHIER (SI PRÉSENT)
          if (editingBook.fileToUpload) {
              const uploadResult = await startUpload([editingBook.fileToUpload])
              
              if (!uploadResult || uploadResult.length === 0) {
                  throw new Error("Échec du téléversement vers UploadThing")
              }

              // Succès de l'upload
              const fileData = uploadResult[0]
              uploadedFileUrl = fileData.url
              uploadedFileName = fileData.name
              uploadedFileSize = fileData.size
              showToast("Fichier PDF téléversé avec succès", "success")
          }

          // 2. MISE À JOUR EN BASE DE DONNÉES
          const res = await fetch('/api/books', {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                  id: editingBook.id,
                  title: editingBook.title,
                  description: editingBook.description,
                  type: editingBook.type,
                  newStudyAreaId: editingBook.newStudyAreaId,
                  // On envoie les infos du fichier seulement si un upload a eu lieu
                  fileUrl: uploadedFileUrl || undefined,
                  fileName: uploadedFileName || undefined,
                  fileSize: uploadedFileSize || undefined
              })
          })

          const data = await res.json()
          if (data.success) {
              showToast("Document mis à jour avec succès", "success")
              setIsEditAlertDialogOpen(false)
              setEditingBook({})
              fetchBooks() // Rafraîchir la liste pour voir le nouveau fichier
          } else {
              showToast(data.error || "Erreur de mise à jour", "destructive")
          }

      } catch (e: any) {
          showToast(`Erreur: ${e.message || "Erreur inconnue"}`, "destructive")
          console.error(e)
      } finally {
          setIsUpdating(false)
      }
  }

  // --- RENDU UI ---

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 font-sans text-slate-900 dark:text-slate-100">
      
      {/* HEADER & STATS */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
           <BarChart3 className="w-8 h-8 text-blue-600" />
           Tableau de Bord Académique
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600"><BookOpen className="w-6 h-6"/></div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Documents</p>
                    <p className="text-2xl font-bold">{stats.totalBooks}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600"><Users className="w-6 h-6"/></div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Auteurs</p>
                    <p className="text-2xl font-bold">{stats.totalAuthors}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600"><MapIcon className="w-6 h-6"/></div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Zones Couvertes</p>
                    <p className="text-2xl font-bold">{stats.totalAreas}</p>
                </div>
            </div>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-between items-center mb-4">
                <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <TabsTrigger value="library" className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> Bibliothèque
                    </TabsTrigger>
                    {isAuthorized && (
                        <TabsTrigger value="admin" className="flex items-center gap-2">
                            <Lock className="w-4 h-4" /> Administration
                        </TabsTrigger>
                    )}
                </TabsList>

                {isAuthorized && (
                    <Button onClick={() => setIsPublishAlertDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="w-4 h-4 mr-2" /> Publier un Document
                    </Button>
                )}
            </div>

            {/* ONGLET BIBLIOTHÈQUE / RECHERCHE */}
            <TabsContent value="library" className="space-y-4">
                
                <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Input 
                            placeholder="Rechercher par titre, auteur, résumé..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchBooks()}
                            className="pl-10"
                        />
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    </div>
                    
                    <Button 
                        variant={searchBounds ? "default" : "outline"}
                        onClick={() => setIsSearchAlertDialogOpen(true)}
                        className={searchBounds ? "bg-green-600 hover:bg-green-700 text-white border-green-600" : ""}
                    >
                        <MapIcon className="w-4 h-4 mr-2" />
                        {searchBounds ? "Zone Définie (Modifier)" : "Recherche Spatiale"}
                    </Button>
                    
                    {(searchQuery || searchBounds) && (
                         <Button variant="ghost" onClick={clearFilters} className="text-slate-500">
                             <X className="w-4 h-4 mr-2" /> Effacer
                         </Button>
                    )}
                    
                    <Button onClick={fetchBooks} disabled={isLoading}>
                         {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Filtrer"}
                    </Button>
                </div>

                {/* RÉSULTATS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {books.map(book => (
                        <div key={book.id} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                            <div className="p-4 flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                                        {book.type}
                                    </span>
                                    {isAuthorized && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600"
                                            onClick={() => openEditAlertDialog(book)}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                </div>
                                <h3 className="font-bold text-lg mb-1 line-clamp-2" title={book.title}>{book.title}</h3>
                                <p className="text-sm text-slate-500 mb-3 flex items-center gap-2">
                                    <Users className="w-3 h-3" /> {book.author?.name || 'Auteur Inconnu'}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                                    {book.description}
                                </p>
                                
                                {book.documentFile && (
                                    <div className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-blue-900">
                                        <LinkIcon className="w-3 h-3" /> Fichier joint
                                    </div>
                                )}
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-slate-950 p-3 border-t border-slate-200 dark:border-slate-800">
                                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                                    <MapIcon className="w-3 h-3" /> Zones concernées :
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {book.studyAreas.length > 0 ? book.studyAreas.map(link => (
                                        <span key={link.studyArea.id} className="text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
                                            {link.studyArea.name}
                                        </span>
                                    )) : (
                                        <span className="text-[10px] text-slate-400 italic">Aucune zone liée</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {!isLoading && books.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Aucun document trouvé avec ces critères.</p>
                        </div>
                    )}
                </div>
            </TabsContent>

            <TabsContent value="admin">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
                    <Lock className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-bold mb-2">Espace de Gestion</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Utilisez le bouton &quot;Publier un Document&quot; pour ajouter du contenu ou l&apos;icône crayon sur les cartes pour modifier.
                    </p>
                </div>
            </TabsContent>
        </Tabs>
      </div>

      {isSearchAlertDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl h-[600px] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                    <div>
                        <h3 className="font-bold flex items-center gap-2">
                            <MapIcon className="w-5 h-5 text-blue-600"/> Filtre Géographique
                        </h3>
                        <p className="text-xs text-slate-500">Dessinez un rectangle pour voir les livres liés aux zones dans cette région.</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setIsSearchAlertDialogOpen(false)}>
                        <X className="w-5 h-5"/>
                    </Button>
                </div>
                
                <div className="flex-1 relative bg-slate-100 dark:bg-slate-950">
                    <div ref={miniMapContainerRef} className="absolute inset-0 z-0" />
                    
                    <div className="absolute top-4 right-4 z-[1000] bg-white dark:bg-slate-900 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-sm max-w-xs">
                        {searchBounds ? (
                            <div className="text-green-600 font-medium flex flex-col gap-2">
                                <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Zone active</span>
                                <Button size="sm" onClick={handleSpatialSearch} className="w-full bg-green-600 hover:bg-green-700 text-white">
                                    Valider et Rechercher
                                </Button>
                                <button onClick={() => {
                                    searchDrawLayerRef.current?.clearLayers()
                                    setSearchBounds(null)
                                }} className="text-xs text-red-500 hover:underline text-center">Effacer la zone</button>
                            </div>
                        ) : (
                            <div className="text-slate-500 flex items-center gap-2">
                                <div className="w-8 h-8 border-2 border-dashed border-slate-300 rounded flex items-center justify-center">
                                    <div className="w-4 h-4 border-2 border-blue-500"></div>
                                </div>
                                Utiliser l&apos;outil rectangle à gauche pour dessiner.
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
      )}

      {/* --- MODALE DE PUBLICATION --- */}
      <AlertDialog open={isPublishAlertDialogOpen} onOpenChange={setIsPublishAlertDialogOpen}>
        <AlertDialogContent className="sm:max-w-[600px]">
            <AlertDialogHeader>
                <AlertDialogTitle>Publier un document</AlertDialogTitle>
                <AlertDialogDescription>Ajoutez un nouveau document à la bibliothèque.</AlertDialogDescription>
            </AlertDialogHeader>
             <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Titre</label>
                    <Input value={newBook.title} onChange={(e) => setNewBook({...newBook, title: e.target.value})} placeholder="Titre..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Type</label>
                         <Select 
                            value={newBook.type} 
                            onValueChange={(val: BookType) => setNewBook({...newBook, type: val})}
                        >
                            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TFC">TFC</SelectItem>
                                <SelectItem value="MEMOIRE">Mémoire</SelectItem>
                                <SelectItem value="THESE">Thèse</SelectItem>
                                <SelectItem value="ARTICLE">Article</SelectItem>
                                <SelectItem value="OUVRAGE">Ouvrage</SelectItem>
                                <SelectItem value="RAPPORT">Rapport</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid gap-2 relative">
                        <label className="text-sm font-medium">Zone d&apos;étude</label>
                        <Input 
                            placeholder="Recherche zone..."
                            value={studyAreaSearch}
                            onChange={(e) => {
                                setStudyAreaSearch(e.target.value)
                                searchStudyAreas(e.target.value)
                            }}
                        />
                        {foundAreas.length > 0 && !newBook.studyAreaId && (
                            <div className="absolute top-[70px] left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                                {foundAreas.map(area => (
                                    <div 
                                        key={area.id}
                                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/50 cursor-pointer text-sm"
                                        onClick={() => {
                                            setNewBook({...newBook, studyAreaId: area.id})
                                            setStudyAreaSearch(area.name)
                                            setFoundAreas([])
                                        }}
                                    >
                                        <div className="font-bold">{area.name}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {newBook.studyAreaId && <div className="text-xs text-green-600">Zone sélectionnée !</div>}
                    </div>
                </div>
                 <div className="grid gap-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input value={newBook.description} onChange={(e) => setNewBook({...newBook, description: e.target.value})} placeholder="Résumé..." />
                </div>
            </div>
            <AlertDialogFooter>
                <Button variant="outline" onClick={() => setIsPublishAlertDialogOpen(false)}>Annuler</Button>
                <Button onClick={handlePublish} disabled={isPublishing}>Publier</Button>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- DIALOGUE DE MODIFICATION AVEC UPLOAD RÉEL --- */}
      <AlertDialog open={isEditAlertDialogOpen} onOpenChange={setIsEditAlertDialogOpen}>
        <AlertDialogContent className="sm:max-w-[700px]">
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-blue-600"/> Modifier le Document
                </AlertDialogTitle>
                <AlertDialogDescription>
                    Mettez à jour les informations, liez de nouvelles zones géographiques et ajoutez des fichiers.
                </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="grid gap-6 py-4 overflow-y-auto max-h-[70vh] pr-2">
                {/* 1. INFO DE BASE */}
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Informations Générales</h4>
                    <div className="grid gap-2">
                        <Label>Titre du document</Label>
                        <Input 
                            value={editingBook.title || ''}
                            onChange={(e) => setEditingBook({...editingBook, title: e.target.value})}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Type</Label>
                        <Select 
                            value={editingBook.type} 
                            onValueChange={(val: any) => setEditingBook({...editingBook, type: val})}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TFC">TFC</SelectItem>
                                <SelectItem value="MEMOIRE">Mémoire</SelectItem>
                                <SelectItem value="THESE">Thèse</SelectItem>
                                <SelectItem value="ARTICLE">Article</SelectItem>
                                <SelectItem value="OUVRAGE">Ouvrage</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Description / Résumé</Label>
                        <textarea 
                            className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-slate-950 dark:border-slate-800"
                            value={editingBook.description || ''}
                            onChange={(e) => setEditingBook({...editingBook, description: e.target.value})}
                        />
                    </div>
                </div>

                {/* 2. ZONES & AUTEURS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                         <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4"/> Auteur
                         </h4>
                         <div className="grid gap-2">
                            <Label>Nom de l&apos;auteur</Label>
                            <Input 
                                disabled 
                                value={editingBook.author?.name || 'Non défini'} 
                                placeholder="Nom de l'auteur..."
                            />
                            <p className="text-[10px] text-slate-400">Pour changer l&apos;auteur, veuillez contacter un administrateur.</p>
                         </div>
                    </div>

                    <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                         <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <MapIcon className="w-4 h-4"/> Zones d&apos;étude
                         </h4>
                         
                         <div className="flex flex-wrap gap-2 mb-2">
                             {editingBook.studyAreas?.map((sa, idx) => (
                                 <div key={idx} className="bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-1 shadow-sm">
                                     {sa.studyArea.name}
                                 </div>
                             ))}
                             {(!editingBook.studyAreas || editingBook.studyAreas.length === 0) && (
                                 <span className="text-xs text-slate-400 italic">Aucune zone liée</span>
                             )}
                         </div>

                         <div className="grid gap-2">
                            <Label className="text-xs">Ajouter une zone par Code (ID)</Label>
                            <div className="flex gap-2">
                                <Input 
                                    className="font-mono text-xs"
                                    placeholder="Ex: cl8..."
                                    value={editingBook.newStudyAreaId || ''}
                                    onChange={(e) => setEditingBook({...editingBook, newStudyAreaId: e.target.value})}
                                />
                            </div>
                            <p className="text-[10px] text-slate-500">Collez l&apos;identifiant unique (UUID) de la zone géographique ici.</p>
                         </div>
                    </div>
                </div>

                {/* 3. FICHIERS AVEC UPLOAD RÉEL */}
                <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900">
                    <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4"/> Fichiers Électroniques
                    </h4>
                    
                    {editingBook.documentFile ? (
                        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{editingBook.documentFile.name}</p>
                                    <a href={editingBook.documentFile.url} target="_blank" className="text-xs text-blue-500 hover:underline">Télécharger / Voir</a>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50">
                                <Trash className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center p-4 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-lg bg-white/50 dark:bg-slate-900/50">
                            <p className="text-sm text-slate-500 mb-2">Aucun fichier joint.</p>
                        </div>
                    )}

                    <div className="grid gap-2 mt-2">
                        <Label>Téléverser un nouveau PDF (Max 32MB)</Label>
                        <div className="flex gap-2">
                            <Input 
                                type="file" 
                                accept="application/pdf"
                                onChange={(e) => {
                                    if(e.target.files?.[0]) {
                                        setEditingBook({...editingBook, fileToUpload: e.target.files[0]})
                                    }
                                }}
                            />
                        </div>
                        {editingBook.fileToUpload && (
                            <p className="text-xs text-green-600 font-medium">
                                Prêt à envoyer : {editingBook.fileToUpload.name}
                            </p>
                        )}
                    </div>
                </div>

            </div>

            <AlertDialogFooter>
                <Button variant="outline" onClick={() => setIsEditAlertDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleUpdate} disabled={isUpdating || isUploadThingUploading} className="bg-blue-600 hover:bg-blue-700">
                    {isUpdating || isUploadThingUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
                    {isUploadThingUploading ? "Téléversement..." : "Enregistrer"}
                </Button>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}