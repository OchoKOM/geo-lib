'use client'

import React, { ComponentType, ReactNode, SVGProps, useState } from 'react'
import { 
  BookOpen, 
  Map as MapIcon, 
  Users, 
  ShieldCheck, 
  Search, 
  Settings, 
  HelpCircle, 
  ChevronDown, 
  ChevronRight, 
  Menu,
  UserPlus,
  LogIn,
  Upload,
  Library,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'

// --- Composants UI Réutilisables ---

const SectionTitle = ({ children, icon: Icon }: { children: React.ReactNode; icon?: ComponentType<SVGProps<SVGSVGElement>> }) => (
  <h2 className="flex items-center gap-3 text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-8 pb-4 border-b border-slate-200 dark:border-slate-700">
    {Icon && <Icon className="w-8 h-8 text-blue-600" />}
    {children}
  </h2>
)

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-6 ${className}`}>
    {children}
  </div>
)

const Badge = ({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'green' | 'purple' | 'amber' }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${colors[color]}`}>
      {children}
    </span>
  )
}

const AccordionItem = ({ question, children }: { question: string; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden mb-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
      >
        <span className="font-semibold text-slate-700 dark:text-slate-200">{question}</span>
        {isOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
      </button>
      {isOpen && (
        <div className="p-4 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-sm leading-relaxed border-t border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  )
}

// --- Page Principale ---

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState('intro')

  const scrollTo = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(id)
    }
  }

  const navItems = [
    { id: 'intro', label: 'Introduction', icon: BookOpen },
    { id: 'start', label: 'Premiers pas', icon: LogIn },
    { id: 'readers', label: 'Lecteurs', icon: Search },
    { id: 'authors', label: 'Auteurs', icon: UserPlus },
    { id: 'librarians', label: 'Bibliothécaires', icon: Library },
    { id: 'admins', label: 'Administrateurs', icon: ShieldCheck },
    { id: 'faq', label: 'Dépannage', icon: HelpCircle },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200">
      
      {/* Hero Header du Guide */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/10 opacity-50 hero-pattern pointer-events-none" />
        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10 text-center">
          <Badge color="blue">Documentation</Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white mt-4 mb-6 tracking-tight">
            Guide Utilisateur <span className="text-blue-600">GeoLib</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Maîtrisez la plateforme moderne pour accéder aux documents académiques géolocalisés.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 flex flex-col lg:flex-row gap-12">
        
        {/* Navigation Latérale (Sticky) */}
        <aside className="lg:w-1/4 hidden lg:block">
          <div className="sticky top-24 space-y-1">
            <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 px-3 tracking-wider">Table des matières</h3>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${activeSection === item.id 
                    ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
            
            {/* Version Mobile du menu (affichée en haut sur mobile via CSS si besoin, mais ici simple sidebar desktop) */}
          </div>
        </aside>

        {/* Contenu Principal */}
        <main className="lg:w-3/4 space-y-24">

          {/* 1. Introduction & Rôles */}
          <section id="intro" className="scroll-mt-28">
            <div className="mb-10">
              <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">Bienvenue sur GeoLib</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                GeoLib est une plateforme web qui facilite l&apos;accès aux travaux académiques (TFC, mémoires, thèses, articles) 
                associés à des zones géographiques spécifiques. Grâce à notre système de cartographie intégré, découvrez 
                le savoir lié à chaque région.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: 'Lecteur', desc: 'Accès en lecture, recherche et emprunt', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { title: 'Auteur', desc: 'Publication de documents et gestion de profil', icon: UserPlus, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
                { title: 'Bibliothécaire', desc: 'Gestion du catalogue et des emprunts', icon: Library, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                { title: 'Administrateur', desc: 'Accès complet et configuration système', icon: ShieldCheck, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
              ].map((role, idx) => (
                <div key={idx} className={`${role.bg} p-6 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all`}>
                  <role.icon className={`w-8 h-8 ${role.color} mb-4`} />
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-2">{role.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{role.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Premiers Pas (Design Timeline) */}
          <section id="start" className="scroll-mt-28">
            <SectionTitle icon={LogIn}>Premiers pas</SectionTitle>
            
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-12 py-4">
              {[
                { 
                  title: 'Inscription', 
                  steps: ['Cliquez sur "S\'inscrire" dans le menu principal', 'Remplissez le formulaire (Nom, Email, Mot de passe)', 'Sélectionnez votre rôle', 'Validez la création du compte'] 
                },
                { 
                  title: 'Connexion', 
                  steps: ['Cliquez sur "Se connecter"', 'Entrez vos identifiants', 'Accédez à votre tableau de bord personnel'] 
                },
                { 
                  title: 'Mot de passe oublié ?', 
                  steps: ['Cliquez sur le lien dédié', 'Entrez votre email', 'Suivez les instructions de réinitialisation'] 
                }
              ].map((item, index) => (
                <div key={index} className="relative pl-8">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-600 border-4 border-white dark:border-slate-950 shadow-sm" />
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{item.title}</h3>
                  <Card className="!p-4">
                    <ul className="space-y-3">
                      {item.steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Pour les Lecteurs */}
          <section id="readers" className="scroll-mt-28">
            <SectionTitle icon={Search}>Pour les Lecteurs</SectionTitle>
            
            <div className="space-y-8">
              {/* Feature Highlight: Recherche & Carte */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity" />
                
                <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <Badge color="blue">Fonctionnalité Phare</Badge>
                    <h3 className="text-2xl font-bold mt-4 mb-4">Recherche Géospatiale</h3>
                    <p className="text-slate-300 mb-6">
                      Ne cherchez pas seulement par titre. Visualisez les documents sur une carte interactive pour découvrir les recherches effectuées dans votre région d&apos;intérêt.
                    </p>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-center gap-2"><MapIcon className="w-4 h-4 text-blue-400" /> Marqueurs interactifs sur la carte</li>
                      <li className="flex items-center gap-2"><Settings className="w-4 h-4 text-blue-400" /> Filtres par Année, Type et Faculté</li>
                    </ul>
                  </div>
                  
                  {/* Mockup visuel de la carte */}
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                    <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"/>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"/>
                        <div className="w-3 h-3 rounded-full bg-green-500"/>
                    </div>
                    <div className="space-y-2">
                        <div className="h-24 bg-blue-500/20 rounded w-full flex items-center justify-center border border-blue-500/30">
                            <MapIcon className="w-8 h-8 text-blue-300" />
                        </div>
                        <div className="h-4 bg-slate-400/20 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-400/20 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Autres fonctionnalités lecteur */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" /> Consultation
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Cliquez sur un résultat pour voir le résumé, les métadonnées et télécharger le PDF si disponible.
                  </p>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded text-xs text-slate-500">
                    Astuce : Vérifiez les informations géographiques pour voir les coordonnées exactes.
                  </div>
                </Card>

                <Card>
                  <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <Library className="w-5 h-5 text-blue-600" /> Emprunt & Compte
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Vérifiez la disponibilité et cliquez sur &quot;Emprunter&quot;. Suivez vos emprunts et gérez vos alertes dans votre profil.
                  </p>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded text-xs text-slate-500">
                    Astuce : Configurez vos préférences de notification pour ne jamais rater un retour.
                  </div>
                </Card>
              </div>
            </div>
          </section>

          {/* 4. Pour les Auteurs */}
          <section id="authors" className="scroll-mt-28">
            <SectionTitle icon={UserPlus}>Pour les Auteurs</SectionTitle>
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="grid md:grid-cols-2">
                    <div className="p-8 space-y-6">
                        <h3 className="text-xl font-bold">Processus de Publication</h3>
                        <div className="space-y-4">
                            {[
                                { num: 1, text: "Accédez au tableau de bord auteur" },
                                { num: 2, text: "Remplissez les métadonnées (Titre, Résumé, Faculté)" },
                                { num: 3, text: "Dessinez la zone d'étude sur la carte ou importez un GeoJSON" },
                                { num: 4, text: "Téléversez le fichier PDF et validez" }
                            ].map((step) => (
                                <div key={step.num} className="flex items-center gap-4">
                                    <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                                        {step.num}
                                    </span>
                                    <p className="text-slate-700 dark:text-slate-300 font-medium">{step.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-8 flex flex-col justify-center items-center text-center">
                        <Upload className="w-16 h-16 text-slate-300 mb-4" />
                        <h4 className="font-bold text-slate-700 dark:text-slate-200">Gestion de Profil</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs">
                            Ajoutez une biographie, une photo et gérez vos publications existantes pour maintenir votre portfolio académique à jour.
                        </p>
                    </div>
                </div>
            </div>
          </section>

          {/* 5. Bibliothécaires & Admin */}
          <section id="librarians" className="scroll-mt-28">
            <div className="grid lg:grid-cols-2 gap-8">
                
                {/* Colonne Bibliothécaire */}
                <div>
                    <SectionTitle icon={Library}>Bibliothécaires</SectionTitle>
                    <div className="space-y-4">
                        <Card className="border-l-4 border-l-purple-500">
                            <h4 className="font-bold text-purple-700 dark:text-purple-400 mb-2">Catalogue</h4>
                            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                                <li>Importation en masse de documents</li>
                                <li>Validation des soumissions d&apos;auteurs</li>
                                <li>Correction des métadonnées et catégories</li>
                            </ul>
                        </Card>
                        <Card className="border-l-4 border-l-purple-500">
                            <h4 className="font-bold text-purple-700 dark:text-purple-400 mb-2">Gestion des Emprunts</h4>
                            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                                <li>Validation des demandes</li>
                                <li>Marquage des retours</li>
                                <li>Gestion des pénalités et retards</li>
                            </ul>
                        </Card>
                    </div>
                </div>

                {/* Colonne Administrateur */}
                <div id="admins" className="scroll-mt-28">
                    <SectionTitle icon={ShieldCheck}>Administrateurs</SectionTitle>
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-6 border border-amber-100 dark:border-amber-900/30 h-full">
                        <p className="text-sm text-amber-800 dark:text-amber-200 mb-6 italic">
                            Les administrateurs possèdent tous les droits des autres rôles, plus :
                        </p>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-start gap-3">
                                <Settings className="w-5 h-5 text-amber-600 mt-1" />
                                <div>
                                    <h5 className="font-bold text-slate-800 dark:text-slate-200">Configuration Système</h5>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Limites d&apos;emprunt, délais, maintenance DB, mises à jour.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Users className="w-5 h-5 text-amber-600 mt-1" />
                                <div>
                                    <h5 className="font-bold text-slate-800 dark:text-slate-200">Gestion Utilisateurs & Paiements</h5>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Rôles, blocage de comptes, configuration des tarifs d&apos;abonnement.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </section>

          {/* 6. Dépannage (Accordion) */}
          <section id="faq" className="scroll-mt-28">
            <SectionTitle icon={AlertCircle}>Dépannage & Support</SectionTitle>
            
            <div className="max-w-3xl">
              <AccordionItem question="Je ne peux pas me connecter">
                <ul className="list-disc list-inside space-y-1">
                  <li>Vérifiez que votre adresse email et votre mot de passe sont corrects.</li>
                  <li>Assurez-vous que votre compte a bien été activé via l&apos;email de confirmation.</li>
                  <li>Utilisez la fonction &quot;Mot de passe oublié&quot; si nécessaire.</li>
                </ul>
              </AccordionItem>
              
              <AccordionItem question="La recherche ne donne aucun résultat">
                <p>Essayez d&apos;utiliser des termes plus généraux ou vérifiez l&apos;orthographe. Assurez-vous également qu&apos;aucun filtre restrictif (comme une année spécifique ou une zone trop petite) n&apos;est actif dans le panneau de filtres.</p>
              </AccordionItem>
              
              <AccordionItem question="La carte ne s'affiche pas correctement">
                <p>Cela peut être dû à une connexion internet instable. Essayez d&apos;actualiser la page (F5). Si le problème persiste, essayez un autre navigateur (Chrome, Firefox, Edge) pour vérifier s&apos;il s&apos;agit d&apos;un problème de compatibilité.</p>
              </AccordionItem>
              
              <AccordionItem question="Je reçois une erreur lors du téléversement">
                <p>Vérifiez le format de votre fichier (PDF, DOCX acceptés). Assurez-vous que la taille du fichier ne dépasse pas la limite autorisée (indiquée dans les paramètres). Essayez de compresser votre fichier PDF s&apos;il est trop volumineux.</p>
              </AccordionItem>
            </div>

            <div className="mt-8 p-6 bg-slate-100 dark:bg-slate-800 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">Problème non résolu ?</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Notre équipe de support est là pour vous aider.</p>
                </div>
                <button className="px-6 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-full font-medium transition-colors text-sm flex items-center gap-2">
                    Contacter le support <ArrowRight className="w-4 h-4" />
                </button>
            </div>
          </section>

        </main>
      </div>

      {/* Footer Simple */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-slate-500 dark:text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} GeoLib. Tous droits réservés.</p>
          <p className="mt-2">Guide mis à jour régulièrement. Dernière mise à jour : Décembre 2025</p>
        </div>
      </footer>
    </div>
  )
}