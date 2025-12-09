'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// --- Types de base pour les props du Combobox ---

// Définition d'un type générique pour les options (value/label)
interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps extends React.ComponentProps<typeof Popover> {
  onValueChange?: (value: string) => void
  value?: string // Pour un composant contrôlé
  defaultValue?: string // Pour la valeur initiale non contrôlée (AJOUTÉ)
  name?: string // AJOUTÉ: Pour la soumission du formulaire
  placeholder?: string
  selectPlaceholder?: string
  disabled?: boolean
  className?: string
  children: React.ReactNode // Nécessaire pour le pattern de composant composé
}

interface ComboboxTriggerProps extends React.ComponentProps<typeof Button> {
  children: React.ReactNode // Le <ComboboxLabel/> ou le placeholder
}

interface ComboboxContentProps extends React.ComponentProps<typeof PopoverContent> {
  className?: string
  children: React.ReactNode // Contient <Command>
}

interface ComboboxItemProps extends React.ComponentProps<typeof CommandItem> {
  value: string
  label?: string // MODIFIÉ: La propriété label est maintenant optionnelle
  children: React.ReactNode
}

// --- Les Composants de base ---

// 1. Composant Racine
function Combobox ({
  value: controlledValue,
  defaultValue, // AJOUTÉ
  name, // AJOUTÉ
  onValueChange,
  placeholder = 'Rechercher...',
  selectPlaceholder = 'Sélectionner une option...',
  disabled = false,
  className,
  children,
  ...props
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  
  // MODIFIÉ: Initialisation avec defaultValue ou controlledValue, sinon chaîne vide.
  const initialValue = controlledValue !== undefined ? controlledValue : (defaultValue || '')

  const [localValue, setLocalValue] = React.useState(initialValue)
  
  // Extraction des options à partir des enfants (ComboboxItem)
  const options = React.useMemo(() => {
    const extractedOptions: ComboboxOption[] = []
    
    // Fonction récursive pour parcourir les enfants et extraire les options
    const extractItems = (children: React.ReactNode) => {
      React.Children.forEach(children, child => {
        if (React.isValidElement(child)) {
          if (child.type === ComboboxGroup) {
             // @ts-expect-error - Si c'est un groupe, on parcourt ses enfants de manière récursive
             extractItems(child.props.children)
          } 
          else if (child.type === ComboboxItem) {
            const itemProps = child.props as ComboboxItemProps
            // MODIFIÉ: Si label n'existe pas, on utilise la value
            const extractedLabel = itemProps.label || itemProps.value 
            extractedOptions.push({ value: itemProps.value, label: extractedLabel })
          }
        }
      })
    }
    
    // On cherche d'abord le ComboboxContent, puis on extrait les items
    React.Children.forEach(children, child => {
      if (React.isValidElement(child) && child.type === ComboboxContent) {
        // @ts-expect-error - Extraction des items à partir des enfants du ComboboxContent
        extractItems(child.props.children)
      }
    })
    
    return extractedOptions
  }, [children]) // Dépend des enfants pour recalculer les options


  // Garder le state local synchronisé avec la prop contrôlée
  React.useEffect(() => {
    if (controlledValue !== undefined) {
      // S'assurer que la valeur est toujours une chaîne (y compris la chaîne vide)
      setLocalValue(controlledValue || '')
    }
  }, [controlledValue])

  // Contexte mis à jour
  const contextValue = React.useMemo(() => ({
    localValue,
    setLocalValue,
    setOpen,
    onValueChange,
    placeholder,
    selectPlaceholder,
    disabled,
    options, // Partage des options extraites via le contexte
  }), [localValue, setLocalValue, setOpen, onValueChange, placeholder, selectPlaceholder, disabled, options])
  
  return (
    <ComboboxContext.Provider value={contextValue}>
      {/* AJOUTÉ: Champ caché pour la soumission du formulaire */}
      {name && <input type='hidden' name={name} value={localValue} />}
      
      <Popover open={open} onOpenChange={setOpen} {...props}>
        {children}
      </Popover>
    </ComboboxContext.Provider>
  )
}

// 2. Contexte
interface ComboboxContextType {
  localValue: string
  setLocalValue: React.Dispatch<React.SetStateAction<string>>
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  onValueChange?: (value: string) => void
  placeholder: string
  selectPlaceholder: string
  disabled: boolean
  options: ComboboxOption[] // Maintenu pour le ComboboxLabel
}

const ComboboxContext = React.createContext<ComboboxContextType | undefined>(undefined)

const useComboboxContext = () => {
  const context = React.useContext(ComboboxContext)
  if (!context) {
    throw new Error('useComboboxContext doit être utilisé à l\'intérieur de <Combobox>')
  }
  return context
}

// 3. Déclencheur (Trigger)
function ComboboxTrigger ({ className, children, ...props }: ComboboxTriggerProps) {
  const { disabled } = useComboboxContext()
  return (
    <PopoverTrigger asChild>
      <Button
        data-slot='combobox-trigger'
        variant='outline'
        role='combobox'
        aria-expanded='false'
        className={cn(
          'w-full justify-between dark:hover:bg-slate-700',
          disabled && 'opacity-50 pointer-events-none',
          className
        )}
        disabled={disabled}
        {...props}
      >
        {children}
        <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
      </Button>
    </PopoverTrigger>
  )
}

// 4. Contenu (Content)
function ComboboxContent ({ className, children, ...props }: ComboboxContentProps) {
  return (
    <PopoverContent data-slot='combobox-content' className={cn('p-0', className)} {...props}>
      <Command>
        <CommandInput placeholder={useComboboxContext().placeholder} />
        <CommandList className='max-h-[300px]'>
          {children}
        </CommandList>
      </Command>
    </PopoverContent>
  )
}

// 5. Contenu vide (Empty)
function ComboboxEmpty (props: React.ComponentProps<typeof CommandEmpty>) {
  return <CommandEmpty data-slot='combobox-empty' {...props} />
}

// 6. Groupe (Group)
function ComboboxGroup (props: React.ComponentProps<typeof CommandGroup>) {
  return <CommandGroup data-slot='combobox-group' {...props} />
}

/**
 * Composant ComboboxLabel
 * Affiche le label de l'option sélectionnée au lieu de sa valeur (ID).
 * Il utilise la prop 'options' COLLECTÉE passée au contexte.
 */
function ComboboxLabel ({ placeholder }: { placeholder?: string }) {
  const { localValue, selectPlaceholder, options } = useComboboxContext()
  const currentPlaceholder = placeholder || selectPlaceholder
  
  // Recherche du label correspondant à la valeur (value/id) sélectionnée
  const selectedOption = options.find(option => option.value === localValue)
  const displayLabel = selectedOption ? selectedOption.label : ''

  return (
    <span data-slot='combobox-label' className={cn(displayLabel ? 'text-current' : 'text-slate-500 dark:text-slate-400')}>
      {displayLabel || currentPlaceholder}
    </span>
  )
}

// 8. Élément (Item)
/**
 * Composant ComboboxItem
 * L'enfant est le contenu affiché. La prop 'value' est l'ID stocké.
 * La prop 'label' est utilisée comme valeur de recherche.
 */
function ComboboxItem ({ className, value, label, children, ...props }: ComboboxItemProps) {
  const { localValue, setLocalValue, setOpen, onValueChange } = useComboboxContext()
  
  // MODIFIÉ: Détermine l'étiquette de recherche. Utilise 'label' s'il existe, sinon 'value'.
  const searchLabel = label || value 

  const handleSelect = React.useCallback(() => {
    // Si la valeur est déjà sélectionnée, on la désélectionne (toggle) en utilisant une chaîne vide (''), 
    // sinon on sélectionne la nouvelle valeur. Cela gère la désélection et permet la valeur vide.
    const newValue = localValue === value ? '' : value
    setLocalValue(newValue)
    if (onValueChange) {
      onValueChange(newValue)
    }
    setOpen(false) // Ferme après sélection
  }, [localValue, value, setLocalValue, onValueChange, setOpen])

  return (
    <CommandItem
      data-slot='combobox-item'
      key={value}
      value={searchLabel} // MODIFIÉ: Utilise searchLabel pour la recherche/le filtrage par cmDK
      onSelect={handleSelect}
      className={cn('cursor-pointer', className)}
      {...props}
    >
      <Check
        className={cn(
          'mr-2 h-4 w-4',
          localValue === value ? 'opacity-100' : 'opacity-0'
        )}
      />
      {children} {/* C'est le contenu affiché dans la liste */}
    </CommandItem>
  )
}

const ComboboxValue = ComboboxLabel 

export {
  Combobox,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxItem,
  ComboboxLabel,
  ComboboxValue,
  ComboboxEmpty,
  ComboboxGroup
}