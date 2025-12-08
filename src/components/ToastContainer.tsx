"use client"
// src/components/ToastContainer.tsx
import { ToastMessage, useToast } from '../hooks/useToast';
import { Toast } from './Toast';

/**
 * Conteneur principal des toasts.
 * Doit être placé une seule fois au niveau racine de votre application (e.g., App.tsx).
 */
export function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) {
    return null; // N'affiche rien si la liste est vide pour nettoyer le DOM
  }

  return (
    // Configuration du conteneur répliquant votre CSS d'origine
    <div
      id="toast-container-list"
      className="fixed top-4 right-4 flex flex-col space-y-2 z-99999999 max-w-sm"
    >
      {/* Utilisation de la méthode map pour afficher chaque toast */}
      {toasts.map((toast: ToastMessage & { isExiting?: boolean }) => (
        <Toast
          key={toast.id}
          msg={toast.msg}
          variant={toast.variant}
          isExiting={toast.isExiting || false}
        />
      ))}
    </div>
  );
}