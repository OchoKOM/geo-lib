import { Calendar, BookOpen, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Combobox,
  ComboboxContent,
  ComboboxItem,
  ComboboxTrigger,
  ComboboxValue
} from '@/components/ui/combobox'
import { CurrentEntity } from '@/lib/dashboard-config'
import { DashboardBook, DashboardUser } from '@/lib/types'

interface LoanFormData {
  userId?: string
  bookId?: string
  dueDate?: Date | string
  returnDate?: Date | string
  isReturned?: boolean
}

interface SubscriptionFormData {
  userId?: string
  durationInDays?: string
  isActive?: boolean
  endDate?: Date | string
}

interface FinanceFormProps {
  currentEntity: CurrentEntity
  setCurrentEntity: (entity: CurrentEntity | null) => void
  users: DashboardUser[]
  books: DashboardBook[]
}

export function FinanceForm({
  currentEntity,
  setCurrentEntity,
  users,
  books
}: FinanceFormProps) {
  const { type, data, isEditing } = currentEntity

  // Helper pour mettre à jour les données locales avant envoi
  const updateData = (k: string, v: unknown) => {
    setCurrentEntity({
      ...currentEntity,
      data: { ...currentEntity.data, [k]: v }
    })
  }

  // --- FORMULAIRE PRÊTS (LOANS) ---
  if (type === 'loans') {
    const loanData = data as LoanFormData
    return (
      <div className="space-y-6">
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800 flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-orange-600 mt-0.5" />
          <div className="text-sm text-orange-800 dark:text-orange-200">
            <p className="font-semibold">Gestion des Prêts</p>
            <p className="opacity-90">Enregistrez un nouveau prêt. La date de retour par défaut est fixée manuellement.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Emprunteur</Label>
            <Combobox
              value={loanData.userId || ''}
              onValueChange={(v) => updateData('userId', v)}
              disabled={isEditing} // On ne change pas l'emprunteur d'un prêt en cours
            >
              <ComboboxTrigger className="w-full">
                <ComboboxValue placeholder="Sélectionner un utilisateur..." />
              </ComboboxTrigger>
              <ComboboxContent>
                {users.map((u) => (
                  <ComboboxItem key={u.id} value={u.id} label={u.username}>
                    <div className="flex flex-col">
                      <span className="font-medium">{u.username}</span>
                      <span className="text-xs text-slate-500">{u.email}</span>
                    </div>
                  </ComboboxItem>
                ))}
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="space-y-2">
            <Label>Ouvrage Emprunté</Label>
            <Combobox
              value={loanData.bookId || ''}
              onValueChange={(v) => updateData('bookId', v)}
              disabled={isEditing}
            >
              <ComboboxTrigger className="w-full">
                <ComboboxValue placeholder="Rechercher un livre..." />
              </ComboboxTrigger>
              <ComboboxContent>
                {books.map((b) => (
                  <ComboboxItem key={b.id} value={b.id} label={b.title}>
                    <span className="truncate max-w-[200px]">{b.title}</span>
                  </ComboboxItem>
                ))}
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date d&apos;échéance</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  className="pl-9"
                  value={loanData.dueDate ? new Date(loanData.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => updateData('dueDate', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- FORMULAIRE ABONNEMENTS (SUBSCRIPTIONS) ---
  if (type === 'subscriptions') {
    const subscriptionData = data as SubscriptionFormData
    return (
      <div className="space-y-6">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
          <Clock className="w-5 h-5 text-emerald-600 mt-0.5" />
          <div className="text-sm text-emerald-800 dark:text-emerald-200">
            <p className="font-semibold">Gestion des Abonnements</p>
            <p className="opacity-90">Les abonnements donnent accès aux emprunts. Par défaut : 30 jours.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Utilisateur à abonner</Label>
            <Combobox
              value={subscriptionData.userId || ''}
              onValueChange={(v) => updateData('userId', v)}
              disabled={isEditing}
            >
              <ComboboxTrigger className="w-full">
                <ComboboxValue placeholder="Sélectionner un utilisateur..." />
              </ComboboxTrigger>
              <ComboboxContent>
                {users.map((u) => (
                  <ComboboxItem key={u.id} value={u.id} label={u.username}>
                     <div className="flex flex-col">
                      <span className="font-medium">{u.username}</span>
                      <span className="text-xs text-slate-500">{u.email}</span>
                    </div>
                  </ComboboxItem>
                ))}
              </ComboboxContent>
            </Combobox>
          </div>

          {!isEditing ? (
             <div className="space-y-2">
               <Label>Durée de l&apos;abonnement</Label>
               <Select onValueChange={(v) => updateData('durationInDays', v)} defaultValue="30">
                 <SelectTrigger>
                   <SelectValue placeholder="Choisir une durée" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="30">1 Mois (30 jours)</SelectItem>
                   <SelectItem value="90">1 Trimestre (90 jours)</SelectItem>
                   <SelectItem value="180">1 Semestre (180 jours)</SelectItem>
                   <SelectItem value="365">1 An (365 jours)</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          ) : (
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
               <div className="flex items-center justify-between">
                  <Label>Statut de l&apos;abonnement</Label>
                  <div className={`px-2 py-1 rounded text-xs font-bold ${subscriptionData.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {subscriptionData.isActive ? 'ACTIF' : 'INACTIF'}
                  </div>
               </div>

               <div className="flex items-center gap-2">
                  <Button
                    variant={subscriptionData.isActive ? "destructive" : "default"}
                    size="sm"
                    className="w-full"
                    onClick={() => updateData('isActive', !subscriptionData.isActive)}
                    type="button"
                  >
                    {subscriptionData.isActive ? 'Désactiver / Suspendre' : 'Réactiver'}
                  </Button>
               </div>

               <div className="space-y-2">
                <Label>Modifier la date de fin</Label>
                <Input
                  type="date"
                  value={subscriptionData.endDate ? new Date(subscriptionData.endDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => updateData('endDate', new Date(e.target.value))}
                />
               </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}