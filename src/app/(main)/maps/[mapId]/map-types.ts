import { Book } from '@prisma/client'

// --- TYPES DE DONNÉES ---

export type SimplifiedBook = {
  id: string
  title: string
  type: Book['type']
  authorName: string
  department: string | undefined
  year: number
}

// Définition du style d'une couche
export interface LayerStyle {
  fillColor: string
  color: string // Stroke color
  weight: number // Stroke width
  opacity: number // Stroke opacity
  fillOpacity: number
}

// Configuration d'une couche avec son style
export type GeometryMode = 'Polygon' | 'LineString' | 'Point' | 'None'

export interface LayerConfig {
  id: string
  name: string
  type: GeometryMode
  showLabels?: boolean 
  labelProperty?: string 
  visible: boolean
  count: number
  style: LayerStyle
  isDatabaseBound?: boolean // Nouveau : Indique si la couche est liée à la BDD
}

// Pour l'import depuis la BDD
export interface ImportableStudyArea {
    id: string
    name: string
    type: string
    url: string
    description: string | null
}

// Extension du type Feature GeoJSON pour inclure un ID interne unique
export interface ExtendedFeature extends GeoJSON.Feature {
  id: string | number
  properties: Record<string, unknown>
}

// --- CONSTANTES ---

export const DEFAULT_STYLES: Record<GeometryMode, LayerStyle> = {
  Polygon: {
    fillColor: '#3b82f6', // blue-500
    color: '#1d4ed8', // blue-700
    weight: 2,
    opacity: 1,
    fillOpacity: 0.2
  },
  LineString: {
    fillColor: 'none',
    color: '#22c55e', // green-500
    weight: 4,
    opacity: 1,
    fillOpacity: 0
  },
  Point: {
    fillColor: '#ef4444', // red-500
    color: '#ffffff',
    weight: 1,
    opacity: 1,
    fillOpacity: 1
  },
  None: {
    fillColor: '#000',
    color: '#000',
    weight: 1,
    opacity: 0,
    fillOpacity: 0
  }
}