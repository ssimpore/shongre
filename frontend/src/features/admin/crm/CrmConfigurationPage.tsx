import React from "react";
import { Bot, Boxes, Braces, Cable, ChartNoAxesCombined, ChevronRight, GitBranch, Settings2, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../../../hooks/usePageMeta";

const entries = [
  { to: "/admin/crm/configuration/pipelines", title: "Pipelines & étapes", description: "Cycles de vente, probabilités et règles de clôture.", icon: GitBranch },
  { to: "/admin/crm/configuration/champs", title: "Champs personnalisés", description: "Modèle de données extensible par entité.", icon: Braces },
  { to: "/admin/crm/produits", title: "Produits & tarifs", description: "Catalogue commercial et grilles de prix par marché.", icon: Boxes },
  { to: "/admin/crm/configuration/providers", title: "Connexions fournisseurs", description: "Messagerie, email, calendrier, SMS et téléphonie.", icon: Cable },
  { to: "/admin/crm/configuration/ai", title: "IA & modèles", description: "BYOK, routage de modèles, permissions et usage.", icon: Bot },
  { to: "/admin/crm/automations", title: "Automatisations", description: "Workflows et séquences commerciales sécurisés.", icon: Workflow },
  { to: "/admin/crm/rapports", title: "Rapports", description: "Prévision, performance et exécution commerciale.", icon: ChartNoAxesCombined },
];

export const CrmConfigurationPage: React.FC = () => { usePageMeta({ title: "Configuration CRM | Shongre", description: "Configuration du tenant CRM.", canonicalPath: "/admin/crm/configuration", noIndex: true }); return <div className="space-y-4 pb-8"><section className="rounded-2xl border border-stone-800 bg-stone-950 p-5 text-white sm:p-6"><div className="flex items-center gap-3"><span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-stone-900"><Settings2 className="h-5 w-5 text-violet-300" /></span><div><p className="text-micro font-bold uppercase tracking-[0.2em] text-violet-300">CRM · Administration</p><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Configuration</h1></div></div><p className="mt-3 max-w-2xl text-xs leading-relaxed text-stone-400">Paramètres propres au tenant. Les secrets fournisseurs restent dans le backend et ne sont jamais exposés à cette interface.</p></section><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{entries.map(({to,title,description,icon:Icon}) => <Link key={to} to={to} className="group flex min-h-36 flex-col rounded-2xl border border-border-base bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-sm"><span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light text-primary"><Icon className="h-4 w-4" /></span><h2 className="mt-4 text-sm font-black">{title}</h2><p className="mt-1 flex-1 text-xs leading-relaxed text-stone-500">{description}</p><span className="mt-3 inline-flex items-center gap-1 text-micro font-bold text-primary">Configurer <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span></Link>)}</section></div>; };
