/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import * as React from 'react'
import { useState, useEffect, createContext, useContext } from 'react'

// -----------------------------------------------------------------------------
// Définitions du Contexte
// -----------------------------------------------------------------------------

/**
 * Définit les types possibles pour le thème.
 * 'system' permet de suivre la préférence de l'OS.
 */
type Theme = 'light' | 'dark' | 'system'

/**
 * Définit la structure des données et des fonctions exposées par le contexte.
 * - theme: Le thème actuel (stocké).
 * - setTheme: Fonction pour changer le thème.
 * - isDark: État booléen indiquant si l'UI est affichée en mode sombre (utile pour les icônes).
 */
interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
}

// Créez le contexte avec des valeurs par défaut pour l'autocomplétion.
// Ces valeurs seront écrasées par le Provider.
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// -----------------------------------------------------------------------------
// 1. Fonctions Utilitaires et Logique de localStorage
// -----------------------------------------------------------------------------

/**
 * Récupère le thème initial depuis le localStorage.
 */
function getInitialTheme(): Theme {
  // ✅ OK: Retourne 'system' sur le serveur pour éviter la divergence
  if (typeof window === 'undefined') {
    return 'system' 
  }

  // 1. Essayer de récupérer la valeur stockée
  const storedTheme = localStorage.getItem('theme') as Theme | null

  if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
    return storedTheme
  }

  // 2. Si pas de valeur stockée, on part de 'system'
  return 'system'
}

/**
 * Met à jour les classes du document HTML pour appliquer le thème.
 * @param theme - Le thème réel à appliquer ('light' ou 'dark').
 */
function applyTheme(theme: 'light' | 'dark') {
  const htmlEl = document.documentElement
  if (theme === 'dark') {
    htmlEl.classList.add('dark')
  } else {
    htmlEl.classList.remove('dark')
  }
}

// -----------------------------------------------------------------------------
// 2. Composant Fournisseur de Thème (ThemeProvider)
// -----------------------------------------------------------------------------

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Le thème stocké, initialisé par getInitialTheme.
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  
  // ✅ CORRIGÉ : Initialiser effectiveTheme avec une valeur par défaut simple et sûre.
  // Le premier useEffect mettra à jour cette valeur avec la bonne préférence utilisateur.
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light') 

  const isDark = effectiveTheme === 'dark'

  /**
   * Effectue la mise à jour réelle du thème (classes CSS et localStorage)
   * à chaque fois que `theme` change ou après l'hydratation initiale.
   */
  useEffect(() => {
    // Si window n'est pas défini (SSR), on ne fait rien.
    if (typeof window === 'undefined') {
        return; 
    }
    
    // Logique d'exécution unique après le premier rendu côté client pour synchroniser l'UI
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    let newEffectiveTheme: 'light' | 'dark'

    // Détermine le thème effectif
    if (theme === 'system') {
      newEffectiveTheme = isSystemDark ? 'dark' : 'light'
    } else {
      newEffectiveTheme = theme
    }

    // Applique la classe CSS
    applyTheme(newEffectiveTheme)

    // Met à jour le localStorage (pour persistance)
    localStorage.setItem('theme', theme)
    
    // Met à jour l'état du thème effectif
    setEffectiveTheme(newEffectiveTheme)
    
  }, [theme]) // Dépend de 'theme' pour réagir aux changements utilisateurs

  // Ajoute un écouteur pour le mode 'system'
  useEffect(() => {
    if (typeof window === 'undefined') {
        return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handler = (e: MediaQueryListEvent) => {
      // Si l'utilisateur est en mode 'system', on met à jour l'UI quand la préférence système change.
      setThemeState(prevTheme => {
        if (prevTheme === 'system') {
          const newEffectiveTheme = e.matches ? 'dark' : 'light'
          applyTheme(newEffectiveTheme)
          setEffectiveTheme(newEffectiveTheme)
          return 'system' // L'état 'theme' reste 'system'
        }
        return prevTheme // Ne rien faire si ce n'est pas 'system'
      })
    }

    mediaQuery.addEventListener('change', handler)
    
    // Nettoyage
    return () => mediaQuery.removeEventListener('change', handler)
  }, []) // S'exécute une seule fois au montage


  /**
   * Fonction exposée pour changer le thème.
   * Elle met simplement à jour l'état `theme`, le `useEffect` s'occupera du reste.
   */
  const handleSetTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const contextValue: ThemeContextType = {
    theme,
    setTheme: handleSetTheme,
    isDark
  }

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
}

// -----------------------------------------------------------------------------
// 3. Hook Personnalisé pour l'Utilisation
// -----------------------------------------------------------------------------

/**
 * Hook personnalisé pour accéder facilement aux valeurs du contexte du thème.
 */
export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme doit être utilisé à l\'intérieur d\'un ThemeProvider')
  }
  return context
}