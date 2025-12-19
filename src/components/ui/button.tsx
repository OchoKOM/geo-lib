import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-3xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // STYLE PRIMAIRE (BLUE-600)
        default: 
          "bg-blue-600 text-white shadow-md hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700",
        
        // BOUTON DE DESTRUCTION (ROUGE)
        destructive:
          "bg-red-600 text-white shadow-md hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 focus-visible:ring-red-500/20 dark:focus-visible:ring-red-500/40",
        
        // NOUVEAU : VARIANTE WARNING (ORANGE/AMBRE)
        // Utilise une couleur ambre pour signaler une attention particulière sans être aussi radical que le rouge.
        warning:
          "bg-amber-500 text-white shadow-md hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 focus-visible:ring-amber-500/20 dark:focus-visible:ring-amber-500/40",
        
        // BOUTON SECONDAIRE / OUTLINE (GRIS CLAIR)
        outline:
          "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white",
        
        // VARIANTE SECONDAIRE
        secondary:
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700",
        
        // GHOST (TRANSPARENT)
        ghost:
          "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white",
        
        // LINK
        link: "text-blue-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-3xl gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-3xl px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-full",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }