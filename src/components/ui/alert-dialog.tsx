'use client'

import * as React from 'react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'

// NOTE: Ces chemins d'importation devront peut-être être ajustés dans votre environnement
import { cn } from '@/lib/utils'

function AlertDialog ({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot='alert-dialog' {...props} />
}

function AlertDialogTrigger ({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot='alert-dialog-trigger' {...props} />
  )
}

function AlertDialogPortal ({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot='alert-dialog-portal' {...props} />
  )
}

function AlertDialogOverlay ({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot='alert-dialog-overlay'
      className={cn(
        // Rendre l'overlay plus sombre, similaire à la modal de filtre
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-9999999 bg-slate-900/60 backdrop-blur-sm',
        className
      )}
      {...props}
    />
  )
}

function AlertDialogContent ({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot='alert-dialog-content'
        className={cn(
          // Style adapté de SearchSection.tsx : bg-white/dark:bg-slate-900, shadow-2xl, rounded-xl
          'max-h-[calc(100%-64px)] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-9999999 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl p-6 shadow-2xl duration-200 sm:max-w-lg',
          'bg-white dark:bg-slate-900 dark:border dark:border-slate-700', // Couleurs et bordures du style désiré
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}

function AlertDialogHeader ({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='alert-dialog-header'
      // Style adapté pour centrer le contenu (si nécessaire) et ajouter un petit espace
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  )
}

function AlertDialogFooter ({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='alert-dialog-footer'
      // Séparateur de pied de page pour correspondre au style du modal de filtre
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-4 border-t border-slate-100 dark:border-slate-800',
        className
      )}
      {...props}
    />
  )
}

function AlertDialogTitle ({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot='alert-dialog-title'
      // Style adapté au titre (font-bold)
      className={cn(
        'text-lg font-bold text-slate-800 dark:text-slate-100',
        className
      )}
      {...props}
    />
  )
}

function AlertDialogDescription ({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot='alert-dialog-description'
      // Style adapté à la description (text-sm text-slate-500/dark:text-slate-400)
      className={cn('text-sm text-slate-500 dark:text-slate-400', className)}
      {...props}
    />
  )
}

function AlertDialogAction ({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action
      // Utilisation des classes de bouton bleues du modal de filtre
      className={cn(
        'bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md font-medium transition-all text-sm',
        className
      )}
      {...props}
    />
  )
}

function AlertDialogCancel ({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      // Utilisation du style de bouton "Annuler" du modal de filtre
      className={cn(
        'px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium text-sm border-none ring-0 focus:ring-0',
        className
      )}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel
}
