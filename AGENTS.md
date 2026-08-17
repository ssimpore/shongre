# AGENTS.md — Directives & Contrats d'Architecture Shongre

Ce document constitue le **contrat d'implémentation faisant autorité** pour tous les agents IA et développeurs intervenant sur le dépôt Shongre. Tout code produit doit se conformer strictement à ces règles sans exception.

---

## 1. Périmètre & Frontière des Fichiers

1. **Tout le code et la configuration frontend doivent résider sous `/frontend`** :
   - `frontend/src/`
   - `frontend/package.json`
   - `frontend/vite.config.ts`
   - `frontend/tsconfig.json`
   - `frontend/index.html`
   - `frontend/bin/`
2. **Ne jamais créer de fichiers frontend à la racine du dépôt** (pas de `src/`, `public/`, `dist/`, ou `package.json` à la racine).
3. **Commandes autorisées** :
   - Exécuter depuis `frontend/` (ex: `cd frontend && npm test`) ou via les cibles du `Makefile` à la racine (ex: `make check`, `make dev`).

---

## 2. Préservation du Baseline & Discipline Git

1. **Vérifier l'état avant toute intervention** :
   ```bash
   git status
   git diff
   ```
2. **Opérations destructives formellement interdites** :
   - Ne jamais exécuter `git reset --hard` ou `git clean -fd`.
   - Traiter l'arbre de travail existant comme intentionnel et préserver les modifications non validées.

---

## 3. Table des Sources de Vérité Canoniques

| Domaine / Préoccupation | Emplacement Source Faisant Autorité | Règle d'Accès pour les Vues / Features |
| :--- | :--- | :--- |
| **Taxonomie & Attributs** | `frontend/src/domains/taxonomy/taxonomy.data.ts` | Consommer via `taxonomyService` ou `CANONICAL_TAXONOMY` / `ATTRIBUTE_REGISTRY`. Ne jamais recréer de listes de catégories locales. |
| **Design System & Tokens** | `frontend/src/design-system/` et `src/index.css` | Réutiliser les primitives (`Button`, `Modal`, `Badge`, `FormField`, `CategoryIcon`). Utiliser les classes de tokens sémantiques. |
| **Configuration Marchés** | `frontend/src/domains/market/market.resolver.ts` | Consommer via `marketResolver.getEffectiveMarketConfig(code)`. Ne jamais coder en dur de fallbacks manuels `market \|\| FR`. |
| **Sécurité & Permissions** | `frontend/src/security/authorization.service.ts` | Consommer via `authorizationService.can(user, perm)` ou le hook `useAuthorization()`. |
| **Monétisation & Boosts** | `frontend/src/configuration/plans.config.ts` | Consommer `LISTING_BOOSTS`, `PRO_SUBSCRIPTION_PLANS` et `TRANSACTION_COMMISSIONS`. |
| **Calculs de Séquestre** | `frontend/src/domains/transaction/transaction.service.ts` | Utiliser `calculateOrderTotal()` et `transactionService`. |
| **Accès aux Données** | `frontend/src/repositories/` | Passer obligatoirement par `listingRepository`, `userRepository`, `transactionRepository` ou `messagingRepository`. |

---

## 4. Règle Anti-Duplication : "Un Concept = Une Seule Implémentation"

1. **Recherche préalable obligatoire** :
   - Avant de créer un composant, un hook, un service, un type ou un utilitaire, inspecter le codebase pour vérifier s'il existe déjà un équivalent.
2. **Interdiction des suffixes de duplication** :
   - Ne jamais créer de fichiers temporaires ou doublons nommés `ListingCardV2`, `SellerPageNew`, `PublicationFinal`, `NewModal.tsx`.
   - Si une refonte est nécessaire, migrer tous les consommateurs existants, valider, puis supprimer l'ancienne implémentation.

---

## 5. Primitives du Design System & Règles de Style

1. **Primitives Canoniques** (`src/design-system/primitives/`) :
   - `Button`, `IconButton`, `ActionLink`, `BackLink`
   - `Badge`, `Notice`, `StatePanel`
   - `FormField`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`
   - `Modal`, `ConfirmModal`, `Drawer`, `Tabs`
   - `CategoryIcon`
2. **Tokens CSS** :
   - Toujours utiliser les tokens sémantiques définis dans `src/index.css` (`bg-primary`, `text-primary`, `border-border-base`, `bg-bg-subtle`, `shadow-xs`).
   - Ne pas introduire de styles inline arbitraires ou de valeurs hexadécimales non référencées.

---

## 6. Règles Métier Clés

### 6.1 Taxonomie Unique, Publication & Libellés Compacts (`shortLabel`)
- La publication d'annonce est **entièrement pilotée par la taxonomie** (`taxonomy.data.ts`).
- Les formulaires d'attributs s'adaptent dynamiquement selon la catégorie sélectionnée (`attributesSchema`).
- Ne jamais comparer des chaînes françaises de présentation (ex: `if (category === 'Voitures')`) pour orienter la logique métier ; utiliser les slugs canoniques (`categorySlug === 'vehicles'`) ou les capacités de listing.
- **Règle `shortLabel`** : `label` / `name` est le nom canonique complet faisant autorité. `shortLabel` est un alias compact optionnel réservé aux interfaces contraintes (tiroirs mobiles, grilles d'accueil, filtres). Toujours résoudre les libellés via `getTaxonomyLabel(node, 'compact' | 'full')`. Ne jamais dériver d'identifiants, de slugs ou de logique métier à partir de `shortLabel`. Ne jamais créer de tables locales d'alias dans les composants.

### 6.2 Système Multi-Marchés & Héritage France
- La France (`FR`) est le **marché de référence canonique**.
- Pour tout marché étranger (`BE`, `CH`, `LU`, `DE`, `ES`), les paramètres non surchargés héritent automatiquement de la France.
- Ne jamais écrire `market.protectionFee || france.protectionFee`, car une valeur `0` ou `false` peut être une surcharge explicite valide. Utiliser `getEffectiveMarketConfig()`.

### 6.3 Transactions : Achat Direct vs Réservation
- **Achat Direct (`DIRECT_PURCHASE`)** : Séquestre total du montant + frais de livraison $\to$ expédition ou remise avec validation PIN $\to$ déblocage automatique des fonds.
- **Réservation (`RESERVATION`)** : Séquestre d'un acompte $\to$ rendez-vous physique $\to$ paiement du solde de la main à la main.
- Ces deux flux sont distincts et ne doivent pas être confondus.

---

## 7. Responsabilité des Composants & Architecture des Données

1. **Pages = Composition** :
   - Les pages du dossier `features/` composent les composants visuels et les hooks.
   - Les calculs métier lourds, validations d'état et résolutions fiscales doivent résider dans les services de domaine (`domains/`).
2. **Isolation des Données de Démonstration** :
   - Les jeux de données de démonstration (`src/mocks/initialDemoData.ts`) sont la propriété exclusive de la couche `repositories/` et `storageService`.
   - Ne jamais importer directement des tableaux bruts de fixtures dans les composants de page.
3. **Propriété de l'État** :
   - **URL (`searchParams`)** : Source de vérité pour la recherche, les filtres, la pagination et les onglets partageables.
   - **Repositories** : Cache des ressources et état persistant simulé.
   - **Contextes React** : Uniquement pour l'état global authentique (`AuthProvider`, `ToastProvider`, `MarketProvider`).

---

## 8. Responsivité & Accessibilité (a11y)

1. **Multi-écrans obligatoire** :
   - Toute modification d'interface doit être validée sur mobile (375px), tablette (768px) et desktop (1280px).
   - Aucun débordement horizontal (`overflow-x`) non désiré.
2. **Accessibilité** :
   - Utiliser des balises HTML sémantiques (`button`, `main`, `nav`, `header`, `section`).
   - Assurer le focus clavier visible et les labels explicites sur tous les champs de formulaire.

---

## 9. Validation & Définition du "Fini" (Definition of Done)

Avant de considérer une tâche comme terminée, exécuter obligatoirement la suite complète :

```bash
make check
```

Ce script valide séquentiellement les 3 étapes critiques :
1. `npm run lint` (`tsc --noEmit` — **0 erreur de typage**).
2. `npm test` (`vitest run` — **100% des tests unitaires passants**).
3. `npm run build` (`vite build` — **bundle de production optimisé et sans erreur**).

Ne jamais contourner ces vérifications avec des `@ts-ignore`, des `any` abusifs ou en désactivant des tests.
