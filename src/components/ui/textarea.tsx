// textarea.tsx (Version mise à jour)
import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Style unifié : rounded-xl, shadow-xs, field-sizing, min-h
        "placeholder:text-muted-foreground flex field-sizing-content min-h-16 w-full rounded-xl border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        
        // Couleurs de fond/bordure unifiées avec le style AlertDialog/Input
        "border-slate-200 dark:border-slate-700 bg-background",
        
        // Focus et validation restent cohérents
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }