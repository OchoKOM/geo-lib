/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useMemo, useCallback, JSX } from 'react'
import {
    Book, Users, Building2, GraduationCap, Plus, Edit, Trash2, Search, RefreshCw,
    Loader2, Layers, Database, ChevronLeft, Menu,
    AlertCircle, Ban
} from 'lucide-react'

// --- 1. IMPORTS DES COMPOSANTS UI ---
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { showToast } from '@/hooks/useToast'
import { useAuth } from '@/components/AuthProvider'

// --- 2. LOGIQUE API & TYPES ---
import kyInstance from '@/lib/ky'
import {
    EntityType, EntityData, ApiResponse, UserRole, BookType,
    DashboardBook, DashboardDepartment, DashboardFaculty, DashboardStudyArea, DashboardUser,
    FacultySchema, DepartmentSchema, StudyAreaSchema, BookSchema, UserUpdateSchema
} from '@/lib/types'
import { Session } from 'lucia'

// --- 3. TYPES LOCAUX ---

type CurrentEntity = {
    type: EntityType
    data: Partial<DashboardBook | DashboardDepartment | DashboardFaculty | DashboardStudyArea | DashboardUser>
    isEditing: boolean
    id?: string
}

type DeleteTarget = {
    type: EntityType
    id: string
}

// Configuration de la navigation
const NAV_ITEMS: { type: EntityType; label: string; icon: JSX.Element; role?: UserRole }[] = [
    { type: 'books', label: 'Travaux & Livres', icon: <Book className="w-4 h-4" />, role: UserRole.READER },
    { type: 'faculties', label: 'Facultés', icon: <GraduationCap className="w-4 h-4" />, role: UserRole.READER },
    { type: 'departments', label: 'Départements', icon: <Building2 className="w-4 h-4" />, role: UserRole.READER },
    { type: 'studyareas', label: 'Zones d\'Étude', icon: <Layers className="w-4 h-4" />, role: UserRole.READER },
    { type: 'users', label: 'Utilisateurs', icon: <Users className="w-4 h-4" />, role: UserRole.LIBRARIAN },
]

export default function DashboardPage() {
    // --- STATE UI ---
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [activeTab, setActiveTab] = useState<EntityType>('books')
    const [searchTerm, setSearchTerm] = useState('')

    // --- STATE DATA ---
    const [data, setData] = useState<Record<EntityType, EntityData[]>>({
        books: [], users: [], departments: [], faculties: [], studyareas: [],
    })
    const { user } = useAuth()
    const dashboardUser = user as (DashboardUser | null)
    const [currentUser, setCurrentUser] = useState<DashboardUser | null>(dashboardUser)
    const [isAuthLoading, setIsAuthLoading] = useState(true)
    const [loading, setLoading] = useState(false)
    

    // --- STATE ACTIONS ---
    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
    const [currentEntity, setCurrentEntity] = useState<CurrentEntity | null>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

    const faculties = data.faculties as DashboardFaculty[]
    const departments = data.departments as DashboardDepartment[]
    const studyAreas = data.studyareas as DashboardStudyArea[]
    // const users = data.users as DashboardUser[] // Décommenter si besoin de liste users pour Select Auteur

    // --- HELPERS AUTORISATIONS ---
    const userRoleIndex = useMemo(() => currentUser ? Object.values(UserRole).indexOf(currentUser.role) : -1, [currentUser])

    const isAuthorized = useCallback((requiredRole: UserRole) => {
        if (!currentUser) return false
        return userRoleIndex >= Object.values(UserRole).indexOf(requiredRole)
    }, [currentUser, userRoleIndex])

    // --- API CALLS ---
    const fetchAuthStatus = useCallback(async () => {
        try {
            const response = await kyInstance.get('/api/auth').json<{ user: DashboardUser | null, session: Session }>()
            console.log(response.user);
            setCurrentUser(response.user)
        } catch (err) {
            console.error("Auth check failed", err)
            setCurrentUser(null)
        } finally {
            setIsAuthLoading(false)
        }
    }, [])

    const fetchData = useCallback(async (entity: EntityType) => {
        setLoading(true)
        try {
            const response: ApiResponse<EntityData[]> = await kyInstance.get(`/api/dashboard?type=${entity}`).json()
            if (response.success) {
                setData(prev => ({ ...prev, [entity]: response.data as EntityData[] }))
            } else {
                showToast(response.message || "Erreur de chargement", 'destructive')
            }
        } catch (err) {
            showToast(`Erreur réseau: ${(err as Error).message}`, 'destructive')
        } finally {
            setLoading(false)
        }
    }, [])

    const handleAction = useCallback(async () => {
        if (!currentEntity) return
        setLoading(true)

        const method = currentEntity.isEditing ? 'PATCH' : 'POST'
        const payload = {
            type: currentEntity.type,
            id: currentEntity.isEditing ? currentEntity.id : undefined,
            data: currentEntity.data,
        }

        try {
            const response: ApiResponse<EntityData> = await kyInstance(`/api/dashboard`, { method, json: payload }).json()
            if (response.success) {
                await fetchData(currentEntity.type)
                setIsFormDialogOpen(false)
                showToast(response.message || "Opération réussie", 'default')
                if (['faculties', 'departments', 'studyareas'].includes(currentEntity.type)) {
                    fetchData('faculties'); fetchData('departments'); fetchData('studyareas');
                }
            } else {
                showToast(response.message || "Erreur lors de l'opération", 'destructive')
            }
        } catch (err) {
            showToast(`Erreur technique: ${(err as Error).message}`, 'destructive')
        } finally {
            setLoading(false)
        }
    }, [currentEntity, fetchData])

    const handleDelete = useCallback(async () => {
        if (!deleteTarget) return
        setLoading(true)
        setIsDeleteDialogOpen(false)

        try {
            const response: ApiResponse<null> = await kyInstance(`/api/dashboard`, {
                method: 'DELETE',
                json: { type: deleteTarget.type, id: deleteTarget.id },
            }).json()

            if (response.success) {
                await fetchData(deleteTarget.type)
                showToast(response.message || "Suppression réussie", 'default')
                if (['faculties', 'departments', 'studyareas'].includes(deleteTarget.type)) {
                    fetchData('faculties'); fetchData('departments'); fetchData('studyareas');
                }
            } else {
                showToast(response.message || "Erreur de suppression", 'destructive')
            }
        } catch (err) {
            showToast(`Erreur: ${(err as Error).message}`, 'destructive')
        } finally {
            setLoading(false)
            setDeleteTarget(null)
        }
    }, [deleteTarget, fetchData])

    // --- EFFECTS ---
    useEffect(() => { fetchAuthStatus() }, [fetchAuthStatus])

    useEffect(() => {
        if (!isAuthLoading && currentUser) {
            fetchData(activeTab)
            if (activeTab === 'books' || activeTab === 'departments') {
                fetchData('faculties'); fetchData('departments'); fetchData('studyareas'); 
                if(isAuthorized(UserRole.LIBRARIAN)) fetchData('users');
            }
        }
    }, [activeTab, fetchData, isAuthLoading, currentUser, isAuthorized])


    // --- RENDU DES FORMULAIRES ---
    const renderFormContent = () => {
        if (!currentEntity) return null
        const { type, data, isEditing } = currentEntity
        const updateData = (k: string, v: any) => setCurrentEntity(prev => prev ? { ...prev, data: { ...prev.data, [k]: v } } : null)

        switch (type) {
            case 'faculties':
                const fac = data as Partial<FacultySchema>
                return <Input className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Nom de la Faculté" value={fac.name || ''} onChange={e => updateData('name', e.target.value)} />
            case 'departments':
                const dep = data as Partial<DepartmentSchema>
                return (
                    <div className="space-y-4">
                        <Input className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Nom du Département" value={dep.name || ''} onChange={e => updateData('name', e.target.value)} />
                        <Select value={dep.facultyId || ''} onValueChange={v => updateData('facultyId', v)}>
                            <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"><SelectValue placeholder="Faculté parente" /></SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">{faculties.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                )
            case 'studyareas':
                const sa = data as Partial<StudyAreaSchema>
                return (
                    <div className="space-y-4">
                        <Input className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Nom de la Zone" value={sa.name || ''} onChange={e => updateData('name', e.target.value)} />
                        <Input className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Description" value={sa.description || ''} onChange={e => updateData('description', e.target.value)} />
                        {/* Note: Geometry creation usually requires a map interface, simplified here */}
                    </div>
                )
            case 'books':
                const bk = data as Partial<BookSchema>
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Input className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Titre du document" value={bk.title || ''} onChange={e => updateData('title', e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                            <textarea
                                className="flex min-h-[80px] w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                placeholder="Description courte..." value={bk.description || ''} onChange={e => updateData('description', e.target.value)}
                            />
                        </div>
                        <Input className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" type="number" placeholder="Année" value={bk.publicationYear ? new Date(bk.publicationYear).getFullYear() : ''} onChange={e => updateData('publicationYear', Number(e.target.value))} />
                        
                        <Select value={bk.bookType || ''} onValueChange={v => updateData('bookType', v as BookType)}>
                            <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"><SelectValue placeholder="Type de document" /></SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">{Object.values(BookType).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                        
                        <Select value={bk.departmentId || ''} onValueChange={v => updateData('departmentId', v)}>
                            <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"><SelectValue placeholder="Département" /></SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                        
                        {/* Relation Many-to-Many simplifiée pour 1 Zone, extensible à Multiselect */}
                        <div className="md:col-span-2">
                            <Select value={bk.studyAreaIds?.[0] || ''} onValueChange={v => updateData('studyAreaIds', [v])}>
                                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"><SelectValue placeholder="Zone d'étude principale" /></SelectTrigger>
                                <SelectContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">{studyAreas.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                )
            case 'users':
                const usr = data as Partial<UserUpdateSchema>
                const userEntity = data as unknown as DashboardUser
                if (!isEditing) return <p className="text-red-500">Création interdite ici.</p>
                return (
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded text-sm dark:text-slate-200">
                            <span className="font-semibold">Utilisateur :</span> {userEntity.username}
                        </div>
                        <Select value={usr.role || userEntity.role} onValueChange={v => updateData('role', v as UserRole)} disabled={!isAuthorized(UserRole.ADMIN)}>
                            <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"><SelectValue placeholder="Rôle" /></SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">{Object.values(UserRole).map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                        <div className="flex items-center space-x-2 dark:text-slate-200">
                            <input type="checkbox" id="susp" checked={usr.isSuspended ?? userEntity.isSuspended} onChange={e => updateData('isSuspended', e.target.checked)} className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 dark:bg-slate-800" disabled={!isAuthorized(UserRole.ADMIN)} />
                            <label htmlFor="susp" className="text-sm">Compte suspendu</label>
                        </div>
                    </div>
                )
            default: return null
        }
    }

    // --- RENDU PRINCIPAL ---

    if (isAuthLoading) return <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
    if (!currentUser) return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-lg shadow-xl text-center max-w-md border border-slate-200 dark:border-slate-800">
                <Ban className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Accès Refusé</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Vous devez être connecté pour accéder au tableau de bord administratif.</p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Se connecter</Button>
            </div>
        </div>
    )

    const activeNavLabel = NAV_ITEMS.find(n => n.type === activeTab)?.label || 'Dashboard'

    return (
        <div className="flex h-screen w-full overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200">

            {/* 1. SIDEBAR */}
            <div className={`flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 z-20 shadow-xl ${sidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'}`}>
                {/* Header Sidebar */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 bg-slate-50 dark:bg-slate-900">
                    <h2 className="font-bold flex items-center justify-between gap-2 text-sm uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-2"><Database className="w-4 h-4 text-blue-600" /> Administration</span>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800" onClick={() => setSidebarOpen(false)}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                    </h2>
                    {/* User Info Mini Card */}
                    <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
                            {currentUser.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-100">{currentUser.username}</p>
                            <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400">{currentUser.role}</Badge>
                        </div>
                    </div>
                </div>

                {/* Navigation Items */}           
                <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-white dark:bg-slate-900">
                    {NAV_ITEMS.map((item) => {
                        if (item.type === 'users' && !isAuthorized(UserRole.LIBRARIAN)) return null
                        const isActive = activeTab === item.type
                        return (
                            <div
                                key={item.type}
                                onClick={() => setActiveTab(item.type)}
                                className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer border-2 group ${isActive
                                    ? 'bg-blue-50/70 dark:bg-blue-900/20 border-blue-500 shadow-sm'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                                    }`}
                            >
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>
                                    {item.icon}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm font-medium ${isActive ? 'text-blue-900 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>{item.label}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Gérer les {item.label.toLowerCase()}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Footer Sidebar */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-600">GeoLibrary Admin v1.0</p>
                </div>
            </div>

            {/* 2. MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col relative h-full overflow-hidden">

                {/* Top Bar */}
                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        {!sidebarOpen && (
                            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                                <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                            </Button>
                        )}
                        <h1 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wide flex items-center gap-2">
                            {NAV_ITEMS.find(n => n.type === activeTab)?.icon}
                            {activeNavLabel}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative hidden md:block">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                            <Input
                                placeholder="Rechercher..."
                                className="pl-9 w-64 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500 dark:text-white dark:placeholder:text-slate-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => fetchData(activeTab)} disabled={loading} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Actualiser</span>
                        </Button>

                        {((activeTab === 'books' && isAuthorized(UserRole.AUTHOR)) ||
                            (['faculties', 'departments', 'studyareas'].includes(activeTab) && isAuthorized(UserRole.LIBRARIAN))) && (
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
                                    setCurrentEntity({ type: activeTab, data: {}, isEditing: false })
                                    setIsFormDialogOpen(true)
                                }}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    <span className="hidden sm:inline">Nouveau</span>
                                </Button>
                            )}
                    </div>
                </header>

                {/* Data Content */}
                <main className="flex-1 overflow-auto p-4 bg-slate-100 dark:bg-slate-950 relative">
                    {(() => {
                        const filteredData = (data[activeTab] || []).filter((item: any) =>
                            JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
                        )

                        return (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden transition-colors">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID / Nom</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Détails</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Relations</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredData.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                                                        {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /> : "Aucune donnée trouvée."}
                                                    </td>
                                                </tr>
                                            ) : filteredData.map((item: any) => (
                                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                    {/* Cellule 1 : Identité */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                            {item.title || item.name || item.username}
                                                        </div>
                                                        <div className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate max-w-[100px]">
                                                            {item.id}
                                                        </div>
                                                    </td>

                                                    {/* Cellule 2 : Détails */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                                        {activeTab === 'users' && <Badge variant={item.role === 'ADMIN' ? 'destructive' : 'secondary'}>{item.role}</Badge>}
                                                        {activeTab === 'books' && <span className="flex items-center gap-2"><Badge variant="outline" className="dark:border-slate-600 dark:text-slate-300">{item.type}</Badge> {new Date(item.postedAt).getFullYear()}</span>}
                                                        {activeTab === 'studyareas' && <span className="truncate block max-w-xs text-xs">{item.description}</span>}
                                                        {activeTab === 'departments' && <span className="text-xs text-slate-500 dark:text-slate-400">Dép. Académique</span>}
                                                    </td>

                                                    {/* Cellule 3 : Relations */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                        {item.department && <Badge variant="secondary" className="mr-1 dark:bg-slate-800 dark:text-slate-300">{item.department.name}</Badge>}
                                                        {item.faculty && <Badge variant="outline" className="dark:border-slate-600 dark:text-slate-400">{item.faculty.name}</Badge>}
                                                        {item.author && <span className="text-xs">Par: {item.author.user?.username || 'Inconnu'}</span>}
                                                        {item.studyAreas && item.studyAreas.length > 0 && (
                                                            <div className="flex -space-x-1 overflow-hidden mt-1">
                                                                {item.studyAreas.map((sa: any, i: number) => (
                                                                    <div key={i} className="inline-block h-4 w-4 rounded-full bg-blue-400 ring-2 ring-white dark:ring-slate-900" title={sa.studyArea?.name} />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Cellule 4 : Actions */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {isAuthorized(UserRole.LIBRARIAN) && (activeTab !== 'users' || isAuthorized(UserRole.ADMIN)) && (
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800"
                                                                    onClick={() => {
                                                                        const entityToEdit = { ...item }
                                                                        if (activeTab === 'books') {
                                                                            entityToEdit.studyAreaIds = item.studyAreas?.map((s: any) => s.studyArea.id) || []
                                                                            entityToEdit.publicationYear = new Date(item.postedAt)
                                                                            entityToEdit.bookType = item.type
                                                                        }
                                                                        setCurrentEntity({ type: activeTab, data: entityToEdit, isEditing: true, id: item.id })
                                                                        setIsFormDialogOpen(true)
                                                                    }}
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                            {isAuthorized(UserRole.ADMIN) && (
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-slate-800"
                                                                    onClick={() => { setDeleteTarget({ type: activeTab, id: item.id }); setIsDeleteDialogOpen(true) }}
                                                                    disabled={activeTab === 'users' && item.id === currentUser?.id}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                                    <span>Affichage de {filteredData.length} élément(s)</span>
                                    <span>Base de données connectée</span>
                                </div>
                            </div>
                        )
                    })()}
                </main>
            </div>

            {/* --- DIALOGUES --- */}

            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            {currentEntity?.isEditing ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            {currentEntity?.isEditing ? 'Modifier' : 'Ajouter'} {NAV_ITEMS.find(n => n.type === currentEntity?.type)?.label.slice(0, -1)}
                        </DialogTitle>
                        <DialogDescription className="dark:text-slate-400">
                            Remplissez les informations ci-dessous pour mettre à jour la base de données.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {renderFormContent()}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFormDialogOpen(false)} disabled={loading} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">Annuler</Button>
                        <Button onClick={handleAction} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" /> Suppression Critique
                        </DialogTitle>
                        <DialogDescription className="pt-2 dark:text-slate-400">
                            Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:justify-center">
                        <Button variant="outline" className="w-full dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300" onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button>
                        <Button variant="destructive" className="w-full bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={loading}>
                            {loading ? 'Suppression...' : 'Confirmer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}