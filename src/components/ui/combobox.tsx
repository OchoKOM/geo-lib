'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// --------------------------------------------------
// Types
// --------------------------------------------------

interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps extends React.ComponentProps<typeof Popover> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  name?: string
  placeholder?: string
  selectPlaceholder?: string
  disabled?: boolean
  children: React.ReactNode
}

interface ComboboxTriggerProps extends React.ComponentProps<typeof Button> {
  children: React.ReactNode
}

interface ComboboxContentProps extends React.ComponentProps<typeof PopoverContent> {
  children: React.ReactNode
}

interface ComboboxItemProps extends React.ComponentProps<typeof CommandItem> {
  value: string
  label?: string
  children?: React.ReactNode
}

// --------------------------------------------------
// Contexte
// --------------------------------------------------

interface ComboboxContextType {
  localValue: string
  setLocalValue: React.Dispatch<React.SetStateAction<string>>
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  onValueChange?: (value: string) => void
  placeholder: string
  selectPlaceholder: string
  disabled: boolean
  options: ComboboxOption[]
}

const ComboboxContext = React.createContext<ComboboxContextType | undefined>(undefined)

const useComboboxContext = () => {
  const ctx = React.useContext(ComboboxContext)
  if (!ctx) throw new Error('Combobox components must be used inside <Combobox>')
  return ctx
}

// --------------------------------------------------
// Racine
// --------------------------------------------------

function Combobox({
  value,
  defaultValue = '',
  onValueChange,
  name,
  placeholder = 'Rechercher...',
  selectPlaceholder = 'Sélectionner une option...',
  disabled = false,
  children,
  ...props
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [localValue, setLocalValue] = React.useState(value ?? defaultValue)

  React.useEffect(() => {
    if (value !== undefined) setLocalValue(value)
  }, [value])

  const options = React.useMemo<ComboboxOption[]>(() => {
    const acc: ComboboxOption[] = []

    const walk = (nodes: React.ReactNode) => {
      React.Children.forEach(nodes, child => {
        if (!React.isValidElement(child)) return

        if (child.type === ComboboxGroup) {
          // @ts-expect-error children
          walk(child.props.children)
        }

        if (child.type === ComboboxItem) {
          const { value, label } = child.props as ComboboxItemProps
          acc.push({ value, label: label ?? value })
        }
      })
    }

    React.Children.forEach(children, child => {
      if (React.isValidElement(child) && child.type === ComboboxContent) {
        // @ts-expect-error children
        walk(child.props.children)
      }
    })

    return acc
  }, [children])

  const ctx = React.useMemo(
    () => ({
      localValue,
      setLocalValue,
      open,
      setOpen,
      onValueChange,
      placeholder,
      selectPlaceholder,
      disabled,
      options
    }),
    [localValue, open, onValueChange, placeholder, selectPlaceholder, disabled, options]
  )

  return (
    <ComboboxContext.Provider value={ctx}>
      {name && <input type="hidden" name={name} value={localValue} />}
      <Popover open={open} onOpenChange={setOpen} {...props}>
        {children}
      </Popover>
    </ComboboxContext.Provider>
  )
}

// --------------------------------------------------
// Trigger (CORRIGÉ truncate)
// --------------------------------------------------

function ComboboxTrigger({ className, children, ...props }: ComboboxTriggerProps) {
  const { disabled, open } = useComboboxContext()

  return (
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          // IMPORTANT: grid garantit une largeur bornée au label
          'w-full grid grid-cols-[1fr_auto] items-center',
          disabled && 'opacity-50',
          className
        )}
        {...props}
      >
        {/* Zone texte CONTRAINTE */}
        <span className="min-w-0 overflow-hidden text-left">
          <span className="block truncate">
            {children}
          </span>
        </span>

        {/* Icône largeur fixe */}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
  )
}

// --------------------------------------------------
// Content
// --------------------------------------------------

function ComboboxContent({ children, ...props }: ComboboxContentProps) {
  const { placeholder, disabled } = useComboboxContext()

  return (
    <PopoverContent className="p-0" {...props}>
      <Command>
        <CommandInput placeholder={placeholder} disabled={disabled} />
        <CommandList className="max-h-[300px]">{children}</CommandList>
      </Command>
    </PopoverContent>
  )
}

function ComboboxEmpty(props: React.ComponentProps<typeof CommandEmpty>) {
  return <CommandEmpty {...props} />
}

function ComboboxGroup(props: React.ComponentProps<typeof CommandGroup>) {
  return <CommandGroup {...props} />
}

// --------------------------------------------------
// Label
// --------------------------------------------------

function ComboboxLabel({ placeholder }: { placeholder?: string }) {
  const { localValue, selectPlaceholder, options } = useComboboxContext()

  const selected = options.find(o => o.value === localValue)

  return (
    <span
      className={cn(
        'block max-w-full truncate',
        !selected && 'text-muted-foreground'
      )}
      title={selected?.label}
    >
      {selected?.label ?? placeholder ?? selectPlaceholder}
    </span>
  )
}

// --------------------------------------------------
// Item
// --------------------------------------------------

function ComboboxItem({ value, label, children, className, ...props }: ComboboxItemProps) {
  const { localValue, setLocalValue, setOpen, onValueChange } = useComboboxContext()

  const handleSelect = () => {
    // IMPORTANT: utiliser la vraie value métier, pas la value cmdk
    setLocalValue(value)
    onValueChange?.(value)
    setOpen(false)
  }

  return (
    <CommandItem
      value={label ?? value}
      onSelect={handleSelect}
      className={cn('cursor-pointer truncate', className)}
      {...props}
    >
      <Check
        className={cn(
          'mr-2 h-4 w-4',
          localValue === value ? 'opacity-100' : 'opacity-0'
        )}
      />
      {children ?? label ?? value}
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
