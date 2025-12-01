// src/components/Toast.tsx
import { ToastVariant } from "@/hooks/useToast";
import { Check, InfoIcon, TriangleAlert, X } from "lucide-react";

interface ToastProps {
  msg: string;
  variant: ToastVariant;
  isExiting: boolean; // État pour l'animation de sortie
}

// Mappage des variantes aux classes CSS
const colors: Record<ToastVariant, string> = {
  default: 'bg-slate-800 text-white',
  success: 'bg-green-600 text-white',
  destructive: 'bg-red-600 text-white',
  warning: 'bg-yellow-500 text-black',
};

// Mappage des variantes aux composants d'icônes Lucide React
const icons: Record<ToastVariant, React.ElementType> = {
  default: InfoIcon,
  success: Check, // J'ai utilisé CheckCircle pour un meilleur look ici
  destructive: X,
  warning: TriangleAlert,
};

/**
 * Affiche un message toast individuel.
 */
export function Toast({ msg, variant, isExiting }: ToastProps) {
  const IconComponent = icons[variant];
  const colorClasses = colors[variant];

  // Classes pour l'animation d'apparition/disparition
  // 'animate-in fade-in slide-in-from-right-2' est remplacé par des classes de transition
  const transitionClasses = `transition-all duration-500 ease-in-out`;

  // Gestion des classes pour l'apparition et la disparition
  const stateClasses = isExiting
    ? 'opacity-0 translate-x-full' // État final de la disparition
    : 'opacity-100 translate-x-0'; // État final de l'apparition

  // État initial (quand le composant est monté)
  // On utilise un 'useEffect' si on voulait une animation contrôlée,
  // mais ici, on peut simplifier en supposant que React gère le montage/démontage.
  // Pour la première apparition, les classes sont appliquées immédiatement.

  return (
    <div
      // Classes du Toast : réplication de la structure et du style d'origine
      className={`relative w-full px-4 py-2 rounded shadow-lg flex items-center space-x-2 
        ${colorClasses} ${transitionClasses} ${stateClasses}`}
      role="alert" // Ajout d'un rôle pour l'accessibilité
    >
      {/* --- Intégration Native de Lucide React --- */}
      {/* On appelle le composant IconComponent directement,
          PAS de innerHTML. React se charge du rendu du SVG. */}
      <IconComponent className="w-5 h-5" aria-hidden="true" />
      
      <span className="flex-1">{msg}</span>
    </div>
  );
}