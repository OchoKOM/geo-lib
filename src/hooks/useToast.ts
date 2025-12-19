/* eslint-disable @typescript-eslint/no-unused-expressions */
"use client"
// src/hooks/useToast.ts
import { useState, useCallback, useEffect } from 'react';

// src/hooks/useToast.ts ou src/types/toast.ts

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning';

export interface ToastMessage {
  id: string;
  msg: string;
  variant: ToastVariant;
}

// Durée des animations et de l'affichage
const DURATION = 5000;
const ANIMATION_FADE_OUT = 500;

// Utilisation d'un pattern de Singleton simple pour stocker l'état
// afin que le toast puisse être appelé de n'importe où dans l'application.
let setToastsState: React.Dispatch<React.SetStateAction<ToastMessage[]>> | null = null;

/**
 * Hook qui gère l'état et la logique des toasts.
 */
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Enregistre la fonction de mise à jour pour l'accès global
  useEffect(() => {
    setToastsState = setToasts;
    return () => {
      setToastsState = null;
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) =>
      prevToasts.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );

    // Supprimer complètement l'élément après l'animation de sortie
    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
    }, ANIMATION_FADE_OUT);
  }, []);

  return { toasts, removeToast };
};

/**
 * Fonction globale pour afficher un toast, utilisable n'importe où.
 * @param msg Le message à afficher.
 * @param variant La variante de couleur (succès, avertissement, etc.).
 */
export function showToast(
  msg: string,
  variant: ToastVariant = 'default'
) {
  if (!setToastsState) {
    console.error('ToastContainer non monté. Assurez-vous d\'ajouter <ToastContainer /> à votre application.');
    return;
  }

  const newToast: ToastMessage = {
    id: Math.random().toString(36).substr(2, 9),
    msg,
    variant,
  };

  // Ajoute le nouveau toast en haut de la liste (prepend)
  setToastsState((prevToasts) => [newToast, ...prevToasts]);

  // Démarre le timer pour la disparition
  setTimeout(() => {
    // Utilise la fonction de suppression globale
    setToastsState && setToastsState((prevToasts) => {
      // Marque le toast comme étant en sortie pour déclencher l'animation
      return prevToasts.map(t => t.id === newToast.id ? { ...t, isExiting: true } : t);
    });
    
    // Supprime complètement l'élément après l'animation de sortie
    setTimeout(() => {
        setToastsState && setToastsState((prevToasts) => prevToasts.filter(t => t.id !== newToast.id));
    }, ANIMATION_FADE_OUT);
    
  }, DURATION);
}