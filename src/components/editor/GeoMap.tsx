/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client'

import { useEffect, useRef, useState, useMemo, JSXElementConstructor, ReactElement, ReactNode, ReactPortal } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import shp from 'shpjs'
import JSZip from 'jszip'
import shpwrite from '@mapbox/shp-write'
import {
    Layers, TableIcon, Download, Eye, EyeOff, Trash2, Settings, Check,
    Database, Loader2, FolderOpen, FileBox, Maximize2, Minimize2,
    ChevronLeft, ZoomIn, Save, Search, Copy, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/components/AuthProvider'
import { Input } from '@/components/ui/input'
import { showToast } from '@/hooks/useToast'
import { useUploadThing } from '@/lib/uploadthing'
import kyInstance from '@/lib/ky'
// Assurez-vous que ces imports existent ou remplacez-les par les versions locales si vous n'avez pas encore séparé les fichiers
import ImportModal from '../map/ImportModal'
import SearchModal from '../map/SearchModal'

// --- TYPES PARTAGÉS ---

type GeometryType = 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon' | 'GeometryCollection'

export interface LayerData {
    id: string
    name: string
    type: 'geojson' | 'shapefile' | 'draw' | 'database'
    geometryType: GeometryType | string
    visible: boolean
    color: string
    opacity: number
    data: unknown
    featureCount: number
    generatedId: boolean
    generatedGeom: boolean
}

export interface ImportCandidate {
    id: string
    name: string
    originalName: string
    data: unknown
    type: 'geojson' | 'shapefile'
    featureCount: number
    geometryType: string
    selected: boolean
}

export interface SearchResult {
    id: string
    name: string
    description: string | null
    geometryType: string
    centerLat: number
    centerLng: number
    geojsonFile?: { url: string }
}

// --- UTILITAIRES ---

const PALETTE = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#6366f1']
const getRandomColor = () => PALETTE[Math.floor(Math.random() * PALETTE.length)]

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
        {...props}
        className={`flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300 ${props.className}`}
    />
)

// --- SOUS-COMPOSANTS ---

// 3. Modal de Sauvegarde (Mise à jour avec ID et Copie)
const SaveModal = ({
    open,
    onClose,
    isSaving,
    formData,
    setFormData,
    onSave,
    savedId
}: {
    open: boolean
    onClose: (open: boolean) => void
    isSaving: boolean
    formData: { name: string, description: string }
    setFormData: (val: unknown) => void
    onSave: () => void
    savedId: string | null
}) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        if (savedId) {
            navigator.clipboard.writeText(savedId)
            setCopied(true)
            showToast('ID copié dans le presse-papier', 'success')
            setTimeout(() => setCopied(false), 2000)
        }
    }

    // Réinitialiser l'état de copie quand la modale s'ouvre/ferme
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!open) setCopied(false)
    }, [open])

    return (
        <AlertDialog open={open} onOpenChange={onClose}>
            <AlertDialogContent className='sm:max-w-[425px]'>
                {!savedId ? (
                    // ÉTAT 1 : Formulaire d'enregistrement
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle className='flex items-center gap-2 text-blue-600 dark:text-blue-400'>
                                <Database className='w-5 h-5' /> Sauvegarder la Zone d&apos;Étude
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Définissez les propriétés de cette couche pour l&apos;enregistrer en base de données.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className='grid gap-4 py-4'>
                            <div className='grid gap-2'>
                                <label htmlFor='layer-name' className='text-sm font-medium'>Nom de la zone</label>
                                <Input
                                    id='layer-name'
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder='Ex: Parcelle Agricole B2'
                                />
                            </div>
                            <div className='grid gap-2'>
                                <label htmlFor='layer-desc' className='text-sm font-medium'>Description (Optionnel)</label>
                                <Textarea
                                    id='layer-desc'
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder='Détails...'
                                />
                            </div>
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isSaving}>Annuler</AlertDialogCancel>
                            <Button onClick={onSave} disabled={isSaving || !formData.name}>
                                {isSaving ? <><Loader2 className='w-4 h-4 mr-2 animate-spin' /> Enregistrement...</> : <><Save className='w-4 h-4 mr-2' /> Enregistrer</>}
                            </Button>
                        </AlertDialogFooter>
                    </>
                ) : (
                    // ÉTAT 2 : Succès et Copie de l'ID
                    <>
                        <AlertDialogHeader>
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-4">
                                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <AlertDialogTitle className='text-center text-green-600 dark:text-green-400'>
                                Sauvegarde Réussie !
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-center">
                                La zone a été ajoutée à la base de données. Voici son identifiant unique.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className='py-6'>
                            <label className='text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block'>
                                ID de la Zone (UUID)
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    value={savedId}
                                    readOnly
                                    className="font-mono text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                />
                                <Button variant="outline" size="icon" onClick={handleCopy} className="flex-shrink-0">
                                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                                Copiez cet ID pour l&apos;utiliser dans vos configurations ou API.
                            </p>
                        </div>

                        <AlertDialogFooter>
                            <Button onClick={() => onClose(false)} className="w-full sm:w-auto">
                                Terminer
                            </Button>
                        </AlertDialogFooter>
                    </>
                )}
            </AlertDialogContent>
        </AlertDialog>
    )
}

// 4. Paramètres de Couche
const LayerSettings = ({
    layer,
    role,
    isAuthenticated,
    onUpdateStyle,
    onSaveToDB,
    onExport
}: {
    layer: LayerData | undefined
    role: string
    isAuthenticated: boolean
    onUpdateStyle: (id: string, color: string, opacity: number) => void
    onSaveToDB: () => void
    onExport: (format: 'geojson' | 'zip') => void
}) => {
    if (!layer) return null
    return (
        <div className='p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50 dark:bg-slate-900/50'>
            <h3 className='font-semibold text-sm uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2'>
                <Settings className='w-4 h-4' /> Style de {layer.name}
            </h3>
            <div className='flex items-center justify-between text-sm'>
                <label className='text-slate-600 dark:text-slate-400'>Couleur:</label>
                <Input
                    type='color'
                    value={layer.color}
                    onChange={e => onUpdateStyle(layer.id, e.target.value, layer.opacity)}
                    className='w-8 h-8 p-0 border-0 cursor-pointer rounded-md overflow-hidden'
                />
            </div>
            <div>
                <label className='text-sm text-slate-600 dark:text-slate-400 flex justify-between items-center'>
                    Opacité: <span className='font-mono text-xs'>{(layer.opacity * 100).toFixed(0)}%</span>
                </label>
                <Input
                    type='range' min='0.1' max='1' step='0.05'
                    value={layer.opacity}
                    onChange={e => onUpdateStyle(layer.id, layer.color, parseFloat(e.target.value))}
                    className='w-full h-2 bg-slate-200 rounded-lg cursor-pointer dark:bg-slate-700'
                />
            </div>
            <div className='flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-slate-700'>
                <Button
                    variant='default' size='sm'
                    onClick={onSaveToDB}
                    className='bg-blue-600 hover:bg-blue-700 text-white'
                    disabled={!isAuthenticated || !['ADMIN', 'LIBRARIAN', 'AUTHOR'].includes(role)}
                >
                    <Database className='w-4 h-4 mr-2' /> Enregistrer en BDD
                </Button>
                <div className='flex gap-2 flex-wrap'>
                    <Button variant='outline' size='sm' className='flex-1' onClick={() => onExport('geojson')}>
                        <Download className='w-4 h-4 mr-2' /> GeoJSON
                    </Button>
                    <Button variant='outline' size='sm' className='flex-1' onClick={() => onExport('zip')}>
                        <Download className='w-4 h-4 mr-2' /> SHP (Zip)
                    </Button>
                </div>
            </div>
        </div>
    )
}

// 5. Liste des Couches (Sidebar)
const LayerList = ({
    layers,
    selectedLayerId,
    sidebarOpen,
    setSidebarOpen,
    onSelectLayer,
    onToggleVisibility,
    onDeleteLayer,
    onZoomToLayer,
    onOpenSearch,
    fileInputRef,
    folderInputRef,
    onFileImport,
    onFolderImport
}: {
    layers: LayerData[],
    selectedLayerId: string | null,
    sidebarOpen: boolean,
    setSidebarOpen: (open: boolean) => void,
    onSelectLayer: (layer: LayerData) => void,
    onToggleVisibility: (id: string) => void,
    onDeleteLayer: (id: string) => void,
    onZoomToLayer: (id: string) => void,
    onOpenSearch: () => void,
    fileInputRef: React.RefObject<HTMLInputElement>,
    folderInputRef: React.RefObject<HTMLInputElement>,
    onFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onFolderImport: (e: React.ChangeEvent<HTMLInputElement>) => void
}) => {
    return (
        <div className={`flex flex-1 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 z-20 shadow-xl ${sidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'}`}>
            <div className='p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 bg-slate-50 dark:bg-slate-900'>
                <h2 className='font-bold flex items-center justify-between gap-2 text-sm uppercase tracking-wider text-slate-600 dark:text-slate-400'>
                    <span className='flex items-center gap-2'><Layers className='w-4 h-4' /> Couches ({layers.length})</span>
                    <Button size='sm' variant='ghost' className='h-8 w-8 p-0' onClick={() => setSidebarOpen(false)}>
                        <ChevronLeft className='w-4 h-4' />
                    </Button>
                </h2>

                <Button variant="outline" className="w-full justify-start text-slate-600 dark:text-slate-300 border-dashed" onClick={onOpenSearch}>
                    <Search className="w-4 h-4 mr-2" /> Rechercher dans la BDD...
                </Button>

                <div className='flex gap-2 cursor-pointer flex-wrap'>
                    <div className='relative flex-1'>
                        <Input type='file' multiple accept='.zip,.geojson,.json,.shp,.dbf,.shx,.prj' className='absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10' onChange={onFileImport} ref={fileInputRef} />
                        <Button variant='secondary' size='sm' className='w-full text-xs justify-center cursor-pointer hover:bg-blue-600 hover:text-white' onClick={() => fileInputRef.current?.click()}>
                            <FileBox className='w-4 h-4 mr-1' /> Fichiers
                        </Button>
                    </div>
                    <div className='relative flex-1 cursor-pointer'>
                        <Input type='file'
                            // @ts-ignore
                            webkitdirectory='' directory=''
                            className='absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10' onChange={onFolderImport} ref={folderInputRef} />
                        <Button variant='secondary' size='sm' className='w-full text-xs justify-center cursor-pointer hover:bg-green-600 hover:text-white' onClick={() => folderInputRef.current?.click()}>
                            <FolderOpen className='w-4 h-4 mr-1' /> Dossier
                        </Button>
                    </div>
                </div>
            </div>

            <div className='p-2 space-y-2 overflow-y-auto flex-1'>
                {layers.map((layer: LayerData) => (
                    <div
                        key={layer.id}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer border-2 ${selectedLayerId === layer.id ? 'bg-blue-50/70 dark:bg-blue-900/50 border-blue-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent'}`}
                        onClick={() => onSelectLayer(layer)}
                    >
                        <div className='flex flex-col items-center flex-shrink-0 w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700' style={{ backgroundColor: layer.color }}>
                            <button onClick={e => { e.stopPropagation(); onToggleVisibility(layer.id) }} className='p-1 hover:text-white transition-colors'>
                                {layer.visible ? <Eye className='w-4 h-4 text-white drop-shadow-sm' /> : <EyeOff className='w-4 h-4 text-slate-300/80 drop-shadow-sm' />}
                            </button>
                        </div>
                        <div className='flex-1 min-w-0'>
                            <p className='text-sm font-medium truncate'>{layer.name}</p>
                            <p className='text-xs text-slate-500 truncate'>{layer.geometryType} ({layer.featureCount})</p>
                        </div>
                        <div className='flex gap-1 flex-shrink-0'>
                            <button onClick={e => { e.stopPropagation(); onZoomToLayer(layer.id) }} className='p-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-500 transition-colors'>
                                <ZoomIn className='w-4 h-4' />
                            </button>
                            <button onClick={e => { e.stopPropagation(); onDeleteLayer(layer.id) }} className='p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 transition-colors'>
                                <Trash2 className='w-4 h-4' />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// 6. Tableau Attributaire
const AttributeTable = ({ data, columns, expanded, setExpanded, layerName }: { data: { [key: string]: unknown }[], columns: string[], expanded: boolean, setExpanded: (value: boolean) => void, layerName?: string }) => {
    return (
        <div className={`absolute bottom-0 left-0 w-full bg-white dark:bg-slate-900 shadow-2xl border-t border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out z-30 ${expanded ? 'h-[90%] md:h-[60%]' : 'h-10'}`}>
            <div className='flex items-center justify-between p-2 cursor-pointer bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700' onClick={() => setExpanded(!expanded)}>
                <h2 className='font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-slate-600 dark:text-slate-400'>
                    <TableIcon className='w-4 h-4' /> Table des Attributs {layerName ? `(${layerName})` : ''}
                </h2>
                <Button size='sm' variant='ghost' className='h-6 w-6 p-0'>
                    {expanded ? <Minimize2 className='w-4 h-4' /> : <Maximize2 className='w-4 h-4' />}
                </Button>
            </div>
            <div className={`h-[calc(100%-40px)] transition-opacity duration-200 ${expanded ? 'opacity-100 visible' : 'opacity-0 hidden'}`}>
                <div className='flex-1 p-4 overflow-auto h-full'>
                    {data.length > 0 ? (
                        <div className='w-full overflow-x-auto'>
                            <table className='min-w-full divide-y divide-slate-200 dark:divide-slate-700'>
                                <thead className='bg-slate-50 dark:bg-slate-800 sticky top-0 z-10'>
                                    <tr>{columns.map((col: string) => <th key={col} className='px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap'>{col}</th>)}</tr>
                                </thead>
                                <tbody className='bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800'>
                                    {data.map((row, i) => (
                                        <tr key={i} className='hover:bg-slate-50 dark:hover:bg-slate-800'>
                                            {columns.map((col: string) => (
                                                <td key={col} className='px-4 py-2 whitespace-nowrap text-sm text-slate-900 dark:text-slate-300'>
                                                    {col === '_fid' ? String(row._fid) : row[col] !== undefined ? String(row[col]) : 'N/A'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Database className="w-8 h-8 mb-2 opacity-20" />
                            <p>Aucune donnée attributaire disponible.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// --- COMPOSANT PRINCIPAL ---

export default function GeoMap() {
    const { role, isAuthenticated } = useAuth()
    const { startUpload } = useUploadThing('geoJsonUploader', {
        onClientUploadComplete: () => showToast('Fichier GeoJSON téléversé avec succès', 'success'),
        onUploadError: (error: Error) => showToast(`Erreur d'upload: ${error.message}`, 'destructive')
    })

    // State principal
    const [isMounted, setIsMounted] = useState(false)
    const [isDarkMode, setIsDarkMode] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [tableExpanded, setTableExpanded] = useState(false)
    const [layers, setLayers] = useState<LayerData[]>([])
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)

    // State Dialogues
    const [importDialogOpen, setImportDialogOpen] = useState(false)
    const [importCandidates, setImportCandidates] = useState<ImportCandidate[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)
    const [loadingResults, setLoadingResults] = useState<Record<string, boolean>>({})

    // State Sauvegarde
    const [saveDialogOpen, setSaveDialogOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [saveFormData, setSaveFormData] = useState({ name: '', description: '' })
    const [savedLayerDBId, setSavedLayerDBId] = useState<string | null>(null)

    // State Données Table
    const [tableData, setTableData] = useState<{
        [key: string]: unknown
    }[]>([])
    const [tableColumns, setTableColumns] = useState<string[]>([])

    // Refs
    const mapRef = useRef<L.Map | null>(null)
    const mapContainerRef = useRef<HTMLDivElement>(null)
    const drawnItemsRef = useRef<L.FeatureGroup | null>(null)
    const layerInstancesRef = useRef<{ [key: string]: L.Layer }>({})
    const tileLayerRef = useRef<L.TileLayer | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const folderInputRef = useRef<HTMLInputElement>(null)

    // Initialisation Environnement
    useEffect(() => {
        setIsMounted(true)
        const checkTheme = () => setIsDarkMode(document.documentElement.classList.contains('dark'))
        checkTheme()
        const observer = new MutationObserver(checkTheme)
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        drawnItemsRef.current = new L.FeatureGroup()
        return () => observer.disconnect()
    }, [])

    // Initialisation Leaflet Main Map
    useEffect(() => {
        if (!isMounted || !mapContainerRef.current || mapRef.current) return

        const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([-4.4419, 15.2663], 11)
        L.control.zoom({ position: 'topright' }).addTo(map)

        if (drawnItemsRef.current) {
            map.addLayer(drawnItemsRef.current)
            const drawControl = new L.Control.Draw({
                edit: { featureGroup: drawnItemsRef.current },
                draw: { polygon: { allowIntersection: false, showArea: true }, polyline: {}, rectangle: {}, circle: {}, marker: {}, circlemarker: false }
            })
            map.addControl(drawControl)
        }

        map.on(L.Draw.Event.CREATED, (e) => {
            const feature = e.layer.toGeoJSON()
            feature.properties = { id: crypto.randomUUID(), nom: 'Nouvelle Géométrie', creation: new Date().toLocaleDateString() }
            const newLayer: LayerData = {
                id: crypto.randomUUID(), name: `Dessin ${new Date().toLocaleTimeString()}`, type: 'draw', geometryType: feature.geometry.type,
                visible: true, color: '#3b82f6', opacity: 1, data: { type: 'FeatureCollection', features: [feature] }, featureCount: 1, generatedId: true, generatedGeom: true
            }
            addLayerToMap(newLayer)
        })
        mapRef.current = map
        return () => { map.remove(); mapRef.current = null }
    }, [isMounted])

    // Gestion Fond de carte
    useEffect(() => {
        if (!mapRef.current) return
        if (tileLayerRef.current) mapRef.current.removeLayer(tileLayerRef.current)
        const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        const lightUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        tileLayerRef.current = L.tileLayer(lightUrl, { maxZoom: 19, attribution: isDarkMode ? '&copy; CartoDB' : '&copy; OSM' }).addTo(mapRef.current)
        tileLayerRef.current.bringToBack()
    }, [isDarkMode, isMounted])

    // --- LOGIQUE METIER ---

    const getFileBaseName = (file: File) => {
        // @ts-ignore
        const fullPath = file.webkitRelativePath || file.name
        return fullPath.split('/').pop()?.replace(/\.[^/.]+$/, "") || null
    }

    const processFiles = async (files: FileList | File[]) => {
        if (!files || files.length === 0) { showToast('Aucun fichier sélectionné.', 'warning'); return }
        setIsProcessing(true); setImportCandidates([]); setImportDialogOpen(true)

        const candidates: ImportCandidate[] = []

        const shapefileGroup: {
            [base: string]: {
                files: File[]
                shp?: File
                dbf?: File
                shx?: File
                prj?: File
            }
        } = {}
        const geojsonFiles: File[] = [], zipFiles: File[] = []

        Array.from(files).forEach(file => {
            const ext = file.name.split('.').pop()?.toLowerCase()
            const base = getFileBaseName(file)
            if (!ext || !base || file.size === 0) return
            if (['shp', 'dbf', 'shx', 'prj'].includes(ext)) {
                if (!shapefileGroup[base]) shapefileGroup[base] = { files: [] }
                shapefileGroup[base].files.push(file)
                shapefileGroup[base][ext as 'shp' | 'dbf' | 'shx' | 'prj'] = file
            } else if (['geojson', 'json'].includes(ext)) geojsonFiles.push(file)
            else if (ext === 'zip') zipFiles.push(file)
        })

        try {
            // Traitement Shapefiles
            for (const base in shapefileGroup) {
                const group = shapefileGroup[base]
                if (group.shp && group.dbf) {
                    const zip = new JSZip()
                    group.files.forEach((f: File) => zip.file(f.name, f))
                    const content = await zip.generateAsync({ type: 'arraybuffer' })
                    const results = await shp(content).then(r => Array.isArray(r) ? r : [r])
                    results.forEach(fc => candidates.push({
                        id: crypto.randomUUID(), name: fc.fileName || base, originalName: base, data: fc,
                        type: 'shapefile', featureCount: fc.features?.length || 0, geometryType: fc.features?.[0]?.geometry?.type || 'Unknown', selected: true
                    }))
                }
            }
            // Traitement GeoJSON
            for (const file of geojsonFiles) {
                const json = JSON.parse(await file.text())
                candidates.push({
                    id: crypto.randomUUID(), name: file.name.replace(/\.[^/.]+$/, ""), originalName: file.name, data: json,
                    type: 'geojson', featureCount: json.features?.length || 0, geometryType: json.features?.[0]?.geometry?.type || 'Unknown', selected: true
                })
            }
            // Traitement ZIP
            for (const file of zipFiles) {
                const results = await shp(await file.arrayBuffer()).then(r => Array.isArray(r) ? r : [r])
                results.forEach((fc, idx) => candidates.push({
                    id: crypto.randomUUID(), name: fc.fileName || `Couche ${idx + 1}`, originalName: file.name, data: fc,
                    type: 'shapefile', featureCount: fc.features?.length || 0, geometryType: fc.features?.[0]?.geometry?.type || 'Unknown', selected: true
                }))
            }
            setImportCandidates(candidates)
            if (candidates.length === 0) { setImportDialogOpen(false); showToast('Aucune donnée valide.', 'warning') }
        } catch (e) {
            showToast("Erreur d'import.", 'destructive'); setImportDialogOpen(false)
        } finally { setIsProcessing(false) }
    }

    const confirmImport = () => {
        importCandidates.filter(c => c.selected).forEach(c => addLayerToMap({
            id: c.id, name: c.name, type: c.type, geometryType: c.geometryType, visible: true,
            color: getRandomColor(), opacity: 1, data: c.data, featureCount: c.featureCount, generatedId: false, generatedGeom: false
        }))
        setImportDialogOpen(false); setImportCandidates([])
    }

    const loadSearchResult = async (result: SearchResult) => {
        if (layerInstancesRef.current[result.id]) {
            zoomToLayer(result.id); setIsSearchDialogOpen(false); return
        }
        setLoadingResults(p => ({ ...p, [result.id]: true }))
        try {
            const data = result.geojsonFile?.url ? await kyInstance.get(result.geojsonFile.url).json<{
                type: 'FeatureCollection', features: {
                    type: 'Feature', properties: { 
                        name: string, description: string | null,
                     }, geometry: { type: string, coordinates: number[] | number[][] | number[][][] | number[][][][]
                }[]
            }
            }>() : {
                type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: result.name, description: result.description }, geometry: { type: 'Point', coordinates: [result.centerLng, result.centerLat] } }]
            }
            addLayerToMap({
                id: result.id, name: result.name, type: 'database', geometryType: result.geometryType, visible: true,
                color: getRandomColor(), opacity: 1, data, featureCount: Array.isArray(data.features) ? data.features.length : 1, generatedId: false, generatedGeom: false
            })
            setIsSearchDialogOpen(false)
        } catch (e) {  console.log(e) 
            showToast("Impossible de charger la géométrie.", 'destructive') }
        finally { setLoadingResults(p => ({ ...p, [result.id]: false })) }
    }

    const addLayerToMap = (layerData: LayerData) => {
        if (!mapRef.current) return
        if (layerInstancesRef.current[layerData.id]) { zoomToLayer(layerData.id); return }

        const layer = L.geoJSON(layerData.data as GeoJSON.GeoJsonObject, {
            style: () => ({ color: layerData.color, weight: 2, opacity: 1, fillColor: layerData.color, fillOpacity: 0.2 }),
            pointToLayer: (_, latlng) => L.circleMarker(latlng, { radius: 6, fillColor: layerData.color, color: '#fff', weight: 1, opacity: 1, fillOpacity: 0.8 }),
            onEachFeature: (feature, l) => {
                l.on('click', e => {
                    L.DomEvent.stopPropagation(e)
                    setSelectedLayerId(layerData.id); loadAttributes(layerData)
                    L.popup({ maxWidth: 300 }).setLatLng(e.latlng)
                        .setContent(`<div class="font-bold text-sm mb-1">${layerData.name}</div><div class="text-xs text-slate-700">${Object.entries(feature.properties || {}).slice(0, 3).map(([k, v]) => `<div><b>${k}:</b> ${v}</div>`).join('')}</div>`)
                        .openOn(mapRef.current!)
                })
            }
        }).addTo(mapRef.current)

        // Auto zoom
        try { const b = layer.getBounds(); if (b.isValid()) mapRef.current.fitBounds(b, { padding: [50, 50] }) } catch (e) { }

        layerInstancesRef.current[layerData.id] = layer
        setLayers(p => [...p, layerData])
        setSelectedLayerId(layerData.id); loadAttributes(layerData)
    }

    const zoomToLayer = (id: string) => {
        const l = layerInstancesRef.current[id] as L.GeoJSON
        if (l && mapRef.current) try { mapRef.current.fitBounds(l.getBounds(), { padding: [50, 50], maxZoom: 16 }) } catch (e) {
            showToast("Impossible de zoomer sur cette couche.", 'destructive')
         }
    }

    const updateLayerStyle = (id: string, color: string, opacity: number) => {
        const l = layerInstancesRef.current[id] as L.GeoJSON
        if (!l) return
        l.setStyle({ color, fillColor: color, fillOpacity: opacity * 0.2, opacity })
        l.eachLayer((x) => {
            if ('setStyle' in x && typeof x.setStyle === 'function') {
                x.setStyle({ fillColor: color, fillOpacity: opacity * 0.8, opacity });
            }
        })
        setLayers(p => p.map(x => x.id === id ? { ...x, color, opacity } : x))
    }

    const deleteLayer = (id: string) => {
        if (layerInstancesRef.current[id] && mapRef.current) mapRef.current.removeLayer(layerInstancesRef.current[id])
        delete layerInstancesRef.current[id]
        setLayers(p => p.filter(l => l.id !== id))
        if (selectedLayerId === id) { setSelectedLayerId(null); setTableData([]) }
    }

    const loadAttributes = (layer: LayerData) => {
        const feats = (layer.data as { features: { [key: string]: unknown }[] }).features || []
        if (!feats.length) { setTableData([]); setTableColumns([]); return }
        const cols = new Set<string>(); feats.forEach((f) => {
            if (f && typeof f === 'object' && 'properties' in f && f.properties && typeof f.properties === 'object') {
                Object.keys(f.properties).forEach(k => cols.add(k));
            }
        });
        setTableColumns(Array.from(cols))
        setTableData(feats.map((f: { [key: string]: unknown }, i: number) => ({ _fid: i, ...(f.properties || {}) })))
    }

    const executeSaveToDB = async () => {
        const layer = layers.find(l => l.id === selectedLayerId)
        if (!layer || !saveFormData.name.trim()) return
        setIsSaving(true)
        try {
            const blob = new Blob([JSON.stringify(layer.data)], { type: 'application/json' })
            const file = new File([blob], `${saveFormData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.geojson`, { type: 'application/json' })
            const [uploaded] = await startUpload([file]) || []
            if (!uploaded) throw new Error("Upload failed")

            const bounds = L.geoJSON(layer.data as GeoJSON.GeoJsonObject).getBounds()
            const center = bounds.isValid() ? bounds.getCenter() : { lat: 0, lng: 0 }

            const res = await kyInstance.post('/api/study-areas', {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: saveFormData.name, description: saveFormData.description, geometryType: layer.geometryType.toUpperCase(),
                    geojson: layer.data, centerLat: center.lat, centerLng: center.lng, fileUrl: uploaded.url, fileKey: uploaded.key
                })
            }).json<{ success: boolean; studyArea: { id?: string } }>()

            if (res.success) {
                showToast(`Zone sauvegardée avec succès.`, 'success')
                // Au lieu de fermer, on stocke l'ID pour l'afficher
                setSavedLayerDBId(res.studyArea.id || "")
            } else {
                setSaveDialogOpen(false)
            }
        } catch (e) {
            showToast("Erreur sauvegarde.", 'destructive')
            setSaveDialogOpen(false)
        }
        finally { setIsSaving(false) }
    }

    const handleExport = async (format: 'geojson' | 'zip') => {
        const layer = layers.find(l => l.id === selectedLayerId)
        if (!layer) return
        if (format === 'geojson') {
            const blob = new Blob([JSON.stringify(layer.data)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = `${layer.name}.geojson`; a.click(); URL.revokeObjectURL(url)
        } else {
            try {
                const zip = await shpwrite.zip({ type: 'FeatureCollection', features: (layer.data as { features: [] }).features }, {
                    folder: layer.name, outputType: 'blob',
                    compression: 'STORE'
                })
                const url = URL.createObjectURL(zip as Blob)
                const a = document.createElement('a'); a.href = url; a.download = `${layer.name}.zip`; a.click(); URL.revokeObjectURL(url)
                showToast('Export réussi.', 'success')
            } catch (e) { showToast('Erreur export SHP.', 'destructive') }
        }
    }

    const selectedLayer = useMemo(() => layers.find(l => l.id === selectedLayerId), [layers, selectedLayerId])

    if (!isMounted) return <div className='h-[calc(100vh-64px)] w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950'><Loader2 className='w-10 h-10 animate-spin text-blue-600' /></div>

    return (
        <div className='flex h-[calc(100vh-64px)] w-full overflow-hidden relative bg-slate-100 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200'>

            {/* SIDEBAR & SETTINGS */}
            <div className="flex flex-col z-20">
                <LayerList
                    layers={layers}
                    selectedLayerId={selectedLayerId}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    onSelectLayer={(l: LayerData) => { setSelectedLayerId(l.id); loadAttributes(l) }}
                    onToggleVisibility={(id: string) => {
                        const l = layerInstancesRef.current[id]; if (l) { if (mapRef.current?.hasLayer(l)) mapRef.current.removeLayer(l); else mapRef.current?.addLayer(l) }
                        setLayers(p => p.map(x => x.id === id ? { ...x, visible: !x.visible } : x))
                    }}
                    onDeleteLayer={deleteLayer}
                    onZoomToLayer={zoomToLayer}
                    onOpenSearch={() => setIsSearchDialogOpen(true)}
                    // @ts-expect-error
                    folderInputRef={fileInputRef}
                    // @ts-expect-error
                    fileInputRef={folderInputRef}
                    onFileImport={(e) => { if (e.target.files) processFiles(e.target.files); e.target.value = '' }}
                    onFolderImport={(e) => { if (e.target.files) processFiles(e.target.files); e.target.value = '' }}
                />
                {selectedLayer && sidebarOpen && (
                    <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <LayerSettings
                            layer={selectedLayer}
                            role={role}
                            isAuthenticated={isAuthenticated}
                            onUpdateStyle={updateLayerStyle}
                            onSaveToDB={() => {
                                setSaveFormData({ name: selectedLayer.name, description: `Importé le ${new Date().toLocaleDateString()}` })
                                setSavedLayerDBId(null) // Reset previous ID
                                setSaveDialogOpen(true)
                            }}
                            onExport={handleExport}
                        />
                    </div>
                )}
            </div>

            {/* MAP & ATTRIBUTES */}
            <div className='flex-1 relative'>
                <div ref={mapContainerRef} className='absolute inset-0 z-10' />

                {!sidebarOpen && (
                    <Button size='sm' className='absolute md:top-4 max-md:bottom-16 left-4 z-20 shadow-lg' onClick={() => setSidebarOpen(true)}>
                        <Layers className='w-4 h-4 mr-2' /> Ouvrir Couches
                    </Button>
                )}

                <AttributeTable
                    data={tableData}
                    columns={tableColumns}
                    expanded={tableExpanded}
                    setExpanded={setTableExpanded}
                    layerName={selectedLayer?.name}
                />
            </div>

            {/* MODALS */}
            <ImportModal
                open={importDialogOpen}
                candidates={importCandidates}
                isProcessing={isProcessing}
                onOpenChange={setImportDialogOpen}
                onToggleCandidate={(id) => setImportCandidates(p => p.map(c => c.id === id ? { ...c, selected: !c.selected } : c))}
                onToggleAll={(sel) => setImportCandidates(p => p.map(c => ({ ...c, selected: sel })))}
                onConfirm={confirmImport}
            />

            <SearchModal
                open={isSearchDialogOpen}
                onClose={() => setIsSearchDialogOpen(false)}
                onLoadResult={loadSearchResult}
                loadingResults={loadingResults}
                isDarkMode={isDarkMode}
            />

            <SaveModal
                open={saveDialogOpen}
                onClose={(val) => { setSaveDialogOpen(val); if (!val) setSavedLayerDBId(null); }}
                isSaving={isSaving}
                formData={saveFormData}
                // @ts-expect-error
                setFormData={setSaveFormData}
                onSave={executeSaveToDB}
                savedId={savedLayerDBId}
            />
        </div>
    )
}