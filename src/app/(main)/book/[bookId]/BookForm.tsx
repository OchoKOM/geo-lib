"use client"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/hooks/useToast";
import { SelectTrigger, SelectValue, SelectContent, SelectItem, Select } from "@/components/ui/select";
import { Loader2, Save, BookOpen, User, Calendar, HashIcon } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { getBookData, getSelectOptions, BookFormState, updateBook } from "../actions";
import CoverImageUploader from "./CoverImageUploader";
import DocumentFileUploader from "./DocumentFileUploader";
import { Combobox, ComboboxContent, ComboboxItem, ComboboxTrigger, ComboboxValue } from "@/components/ui/combobox";
import Image from "next/image";
import { BookType } from "@/lib/types";

// Mappage pour l'affichage des types
export const BookTypeLabels: Record<BookType, string> = {
  TFC: 'TFC (Travail de Fin de Cycle)',
  MEMOIRE: 'Mémoire (Master/DEA)',
  THESE: 'Thèse de Doctorat',
  ARTICLE: 'Article Scientifique',
  OUVRAGE: 'Ouvrage / Livre',
  RAPPORT: 'Rapport de Stage',
  AUTRE: 'Autre Document Académique'
}

// Client Component pour le formulaire (utilise les hooks React DOM)
export default function BookForm({ initialBook, options, isEditable }: { initialBook: Awaited<ReturnType<typeof getBookData>>, options: Awaited<ReturnType<typeof getSelectOptions>>, isEditable: boolean }) {
    
    // État pour les fichiers qui sont modifiés indépendamment du formulaire principal
    const [coverId, setCoverId] = useState(initialBook?.coverImage?.id || null);
    const [coverUrl, setCoverUrl] = useState(initialBook?.coverImage?.url || null);
    const [documentId, setDocumentId] = useState(initialBook?.documentFile?.id || null);
    const [documentUrl, setDocumentUrl] = useState(initialBook?.documentFile?.url || null);
    const [documentName, setDocumentName] = useState(initialBook?.documentFile?.name || null);

    const [state, formAction] = useActionState<BookFormState, FormData>(updateBook, {
        message: '',
        success: false
    });

    useEffect(() => {
        if (state.message) {
            if (state.success) {
                showToast(state.message, 'success');
            } else {
                showToast(state.message, 'destructive');
            }
        }
    }, [state]);

    // Bouton de soumission
    function SubmitButton() {
        const { pending } = useFormStatus();
        return (
            <Button type='submit' disabled={pending || !isEditable} className='w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white'>
                {pending ? (
                    <><Loader2 className='mr-2 h-4 w-4 animate-spin' /> Enregistrement...</>
                ) : (
                    <><Save className='mr-2 h-4 w-4' /> {isEditable ? 'Enregistrer les modifications' : 'Mode Lecture'}</>
                )}
            </Button>
        );
    }
    
    if (!initialBook) return <div>Erreur de chargement du livre.</div>

    return (
        <div className='mx-auto p-6 space-y-8'>
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-6'>
                <div>
                    <h1 className='text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3'>
                        <BookOpen className='h-8 w-8 text-blue-600' />
                        {isEditable ? 'Édition' : 'Détails'} de l&apos;Ouvrage
                    </h1>
                    <p className='text-slate-500 dark:text-slate-400 mt-2'>
                        {initialBook.title}
                    </p>
                </div>
            </div>

            <form action={formAction} className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
                {/* Inputs cachés pour les relations de fichiers */}
                <input type="hidden" name="bookId" defaultValue={initialBook.id} />
                <input type="hidden" name="coverImageId" value={coverId || ''} />
                <input type="hidden" name="documentFileId" value={documentId || ''} />

                {/* COLONNE GAUCHE : Couverture et Fichier Principal */}
                <div className='lg:col-span-1 space-y-6'>
                    <div className='bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-center'>
                        <h3 className='text-lg font-medium mb-4'>Couverture</h3>
                        {
                            isEditable ? (
                                <CoverImageUploader 
                            currentFileId={coverId}
                            currentFileUrl={coverUrl}
                            onFileChange={(id, url) => { setCoverId(id); setCoverUrl(url); }}
                            isEditable={isEditable}
                        />) : (
                                coverUrl ? (<Image src={coverUrl} alt="Cover Image" className="mx-auto rounded-md shadow-md max-h-60 object-contain" />) : (<div className="mx-auto rounded-md shadow-md max-h-60 w-40 h-60 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">Aucune image</div>
                            ))
                        }
                        

                        <h3 className='text-lg font-medium pt-6 border-t dark:border-slate-700 mb-4'>Document Fichier</h3>
                        <DocumentFileUploader
                            currentFileId={documentId}
                            currentFileUrl={documentUrl}
                            currentFileName={documentName}
                            onFileChange={(id, url, name) => { setDocumentId(id); setDocumentUrl(url); setDocumentName(name); }}
                            isEditable={isEditable}
                        />
                        
                        <div className='pt-4 text-left space-y-2'>
                            <p className='text-xs text-slate-500 dark:text-slate-400'>
                                <User className='inline h-3 w-3 mr-1' /> Auteur : {initialBook.author?.user.name || 'Inconnu'}
                            </p>
                            <p className='text-xs text-slate-500 dark:text-slate-400'>
                                <Calendar className='inline h-3 w-3 mr-1' /> Posté le : {new Date(initialBook.postedAt).toLocaleDateString()}
                            </p>
                            <p className='text-xs text-slate-500 dark:text-slate-400'>
                                <HashIcon className='inline h-3 w-3 mr-1' /> ID : {initialBook.id}
                            </p>
                        </div>
                    </div>
                </div>

                {/* COLONNE DROITE : Métadonnées */}
                <div className='lg:col-span-3 space-y-6'>
                    <div className='bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4'>
                        <h2 className='text-xl font-semibold mb-4'>Informations Principales</h2>

                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-slate-700 dark:text-slate-300'>Titre</label>
                            <Input name='title' defaultValue={initialBook.title} disabled={!isEditable} />
                        </div>

                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-slate-700 dark:text-slate-300'>Description / Résumé</label>
                            <Textarea name='description' defaultValue={initialBook.description} disabled={!isEditable} className='min-h-[150px]' />
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                            <div className='space-y-2'>
                                <label className='text-sm font-medium text-slate-700 dark:text-slate-300'>Type de Document</label>
                                <Select name="type" defaultValue={initialBook.type} disabled={!isEditable}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner le type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(BookTypeLabels).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className='space-y-2'>
                                <label className='text-sm font-medium text-slate-700 dark:text-slate-300'>Département</label>
                                <Combobox name="departmentId" defaultValue={initialBook.departmentId || ''} disabled={!isEditable}>
                                    <ComboboxTrigger>
                                        <ComboboxValue placeholder="Sélectionner le département" />
                                    </ComboboxTrigger>
                                    <ComboboxContent>
                                        <ComboboxItem value="">Aucun</ComboboxItem>
                                        {options.departments.map(d => (
                                            <ComboboxItem key={d.id} value={d.id} label={d.name}>{d.name}</ComboboxItem>
                                        ))}
                                    </ComboboxContent>
                                </Combobox>
                            </div>

                            <div className='space-y-2'>
                                <label className='text-sm font-medium text-slate-700 dark:text-slate-300'>Année Académique</label>
                                <Combobox name="academicYearId" defaultValue={initialBook.academicYearId || ''} disabled={!isEditable}>
                                    <ComboboxTrigger>
                                        <ComboboxValue placeholder="Sélectionner l'année" />
                                    </ComboboxTrigger>
                                    <ComboboxContent>
                                        <ComboboxItem value="">Aucune</ComboboxItem>
                                        {options.academicYears.map(y => (
                                            <ComboboxItem key={y.id} value={y.id} label={y.year}>{y.year}</ComboboxItem>
                                        ))}
                                    </ComboboxContent>
                                </Combobox>
                            </div>
                        </div>

                    </div>
                    
                    {/* Bouton de sauvegarde */}
                    <div className='flex justify-end pt-4'>
                        <SubmitButton />
                    </div>
                </div>
            </form>
        </div>
    );
}