'use client'

import React, { ComponentType, SVGProps, useState } from 'react'
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
  UserPlus,
  LogIn,
  Upload,
  Library,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  FileText,
  MousePointer2,
  Globe,
  Layers
} from 'lucide-react'

// --- Composants UI Réutilisables ---

const SectionTitle = ({ children, icon: Icon }: { children: React.ReactNode; icon?: ComponentType<SVGProps<SVGSVGElement>>  }) => (
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

// --- Composants Visuels Spécifiques (Diagrammes) ---

const MapSimulation = () => (
  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative border border-slate-300 dark:border-slate-600 aspect-video w-full group">
    {/* Fond de carte simplifié */}
    <div className="absolute inset-0 opacity-30 dark:opacity-20" 
         style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
    </div>
    
    {/* Formes géographiques (Rivières/Zones) */}
    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
       <path d="M0,80 Q50,90 100,50 T200,80 T300,120 T400,100" fill="none" stroke="#60a5fa" strokeWidth="4" className="opacity-60" />
       <path d="M250,0 Q260,50 300,80" fill="none" stroke="#60a5fa" strokeWidth="3" className="opacity-60" />
    </svg>

    {/* Marqueurs interactifs */}
    <div className="absolute top-1/4 left-1/4 animate-bounce duration-2000">
        <div className="relative group/marker cursor-pointer">
            <MapIcon className="w-8 h-8 text-red-500 drop-shadow-lg" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white dark:bg-slate-900 p-2 rounded shadow-xl text-xs hidden group-hover/marker:block z-10 border border-slate-200 dark:border-slate-700">
                <p className="font-bold text-slate-800 dark:text-white">Géologie du Katanga</p>
                <p className="text-slate-500">Thèse - 2023</p>
            </div>
        </div>
    </div>

    <div className="absolute bottom-1/3 right-1/3 animate-bounce duration-2500">
        <div className="relative group/marker cursor-pointer">
            <MapIcon className="w-8 h-8 text-blue-500 drop-shadow-lg" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white dark:bg-slate-900 p-2 rounded shadow-xl text-xs hidden group-hover/marker:block z-10 border border-slate-200 dark:border-slate-700">
                <p className="font-bold text-slate-800 dark:text-white">Hydrologie Fleuve Congo</p>
                <p className="text-slate-500">Mémoire - 2022</p>
            </div>
        </div>
    </div>
    
    {/* Interface de contrôle simulée */}
    <div className="absolute top-2 right-2 bg-white dark:bg-slate-900 p-1 rounded shadow border border-slate-200 dark:border-slate-700 flex flex-col gap-1">
        <div className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center text-slate-500 text-xs font-bold">+</div>
        <div className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center text-slate-500 text-xs font-bold">-</div>
    </div>

    {/* Légende */}
    <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-slate-900/90 p-2 rounded shadow backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-xs">
        <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Mines</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Hydrologie</div>
    </div>
  </div>
)

const WorkflowDiagram = () => (
  <div className="w-full overflow-x-auto pb-4">
    <div className="flex items-center justify-between min-w-[600px] relative">
        {/* Ligne de connexion */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 dark:bg-slate-700 -z-10 transform -translate-y-1/2 rounded-full"></div>
        
        {[
            { title: "Création", icon: FileText, desc: "Saisir métadonnées" },
            { title: "Géolocalisation", icon: Globe, desc: "Définir la zone" },
            { title: "Upload", icon: Upload, desc: "Fichier PDF" },
            { title: "Publication", icon: CheckCircle2, desc: "Validation finale" }
        ].map((step, idx) => (
            <div key={idx} className="flex flex-col items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm w-40 text-center z-10 hover:scale-105 transition-transform">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 
                    ${idx === 3 ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                    <step.icon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">{step.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{step.desc}</p>
            </div>
        ))}
    </div>
  </div>
)

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
                  <Card className="p-4!">
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

          {/* 3. Pour les Lecteurs (AVEC CARTE INTERACTIVE SIMULÉE) */}
          <section id="readers" className="scroll-mt-28">
            <SectionTitle icon={Search}>Pour les Lecteurs</SectionTitle>
            
            <div className="space-y-8">
              {/* Feature Highlight: Recherche & Carte */}
              <div className="bg-linear-to-br from-slate-800 to-slate-900 rounded-2xl p-8 shadow-xl relative overflow-hidden group border border-slate-700">
                <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity" />
                
                <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
                  <div className="text-white">
                    <Badge color="blue">Fonctionnalité Phare</Badge>
                    <h3 className="text-2xl font-bold mt-4 mb-4">Recherche Géospatiale</h3>
                    <p className="text-slate-300 mb-6 leading-relaxed">
                      L&apos;outil de carte interactive est au cœur de GeoLib. Il vous permet d&apos;explorer les documents non pas par mots-clés, mais par zone géographique.
                    </p>
                    <ul className="space-y-3 text-sm text-slate-300">
                      <li className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-400"><MousePointer2 className="w-4 h-4"/></div>
                        <span><strong>Survolez</strong> les marqueurs pour un aperçu rapide</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-400"><Layers className="w-4 h-4"/></div>
                        <span><strong>Filtrez</strong> les résultats visibles sur la carte</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-400"><MapIcon className="w-4 h-4"/></div>
                        <span><strong>Zoomez</strong> pour découvrir des études locales précises</span>
                      </li>
                    </ul>
                  </div>
                  
                  {/* COMPOSANT VISUEL DE CARTE */}
                  <div className="relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-3 rounded-full border border-slate-600 shadow-sm z-20">
                        Aperçu de l&apos;interface
                    </div>
                    <MapSimulation />
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
                    Chaque page de document détaille les auteurs, la faculté et offre un bouton de téléchargement direct.
                  </p>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded text-xs text-slate-500 border border-slate-100 dark:border-slate-700">
                    Les documents sont classés par type : TFC, Mémoire, Thèse, Article.
                  </div>
                </Card>

                <Card>
                  <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <Library className="w-5 h-5 text-blue-600" /> Emprunt Numérique
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Si un document physique est disponible en bibliothèque, vous pouvez réserver votre exemplaire via l&apos;application.
                  </p>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded text-xs text-slate-500 border border-slate-100 dark:border-slate-700">
                    Durée standard d&apos;emprunt : 14 jours (renouvelable).
                  </div>
                </Card>
              </div>
            </div>
          </section>

          {/* 4. Pour les Auteurs (AVEC DIAGRAMME DE WORKFLOW) */}
          <section id="authors" className="scroll-mt-28">
            <SectionTitle icon={UserPlus}>Pour les Auteurs</SectionTitle>
            
            <div className="space-y-8">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
                    <div className="text-center mb-8">
                        <h3 className="text-xl font-bold mb-2">Processus de Publication</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg mx-auto">
                            De la soumission à la validation, GeoLib simplifie le partage de vos connaissances.
                        </p>
                    </div>

                    {/* COMPOSANT VISUEL DE WORKFLOW */}
                    <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <WorkflowDiagram />
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 text-sm">
                        <div>
                            <h4 className="font-bold flex items-center gap-2 mb-2 text-slate-800 dark:text-white">
                                <Globe className="w-4 h-4 text-blue-500" /> Géolocalisation
                            </h4>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                L&apos;étape la plus importante. Vous pouvez dessiner un polygone sur la carte pour délimiter votre zone d&apos;étude (ex: &quot;Province du Lualaba&quot;) ou importer un fichier <code>.geojson</code> si vous avez des données SIG précises.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold flex items-center gap-2 mb-2 text-slate-800 dark:text-white">
                                <FileText className="w-4 h-4 text-blue-500" /> Métadonnées Riches
                            </h4>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                Assurez-vous de bien sélectionner votre Faculté et Département. Ces tags sont cruciaux pour que vos pairs retrouvent votre travail via les filtres académiques.
                            </p>
                        </div>
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
                            <h4 className="font-bold text-purple-700 dark:text-purple-400 mb-2">Catalogue & Validation</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                Votre rôle principal est de garantir la qualité des données.
                            </p>
                            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside bg-purple-50 dark:bg-purple-900/10 p-3 rounded">
                                <li>Vérifier l&apos;exactitude des zones géographiques</li>
                                <li>Valider les soumissions en attente</li>
                                <li>Corriger les catégories mal attribuées</li>
                            </ul>
                        </Card>
                    </div>
                </div>

                {/* Colonne Administrateur */}
                <div id="admins" className="scroll-mt-28">
                    <SectionTitle icon={ShieldCheck}>Administrateurs</SectionTitle>
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-6 border border-amber-100 dark:border-amber-900/30 h-full">
                        <p className="text-sm text-amber-800 dark:text-amber-200 mb-6 italic">
                            Supervision globale et configuration technique.
                        </p>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-start gap-3">
                                <Settings className="w-5 h-5 text-amber-600 mt-1" />
                                <div>
                                    <h5 className="font-bold text-slate-800 dark:text-slate-200">Système</h5>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Maintenance DB, Logs système, Paramètres globaux d&apos;application.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Users className="w-5 h-5 text-amber-600 mt-1" />
                                <div>
                                    <h5 className="font-bold text-slate-800 dark:text-slate-200">Utilisateurs</h5>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Attribution des rôles (Bibliothécaire, Admin), modération des comptes.</p>
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
          <p className="mt-2">Guide mis à jour régulièrement. Dernière mise à jour : Décembre 2024</p>
        </div>
      </footer>
    </div>
  )
}