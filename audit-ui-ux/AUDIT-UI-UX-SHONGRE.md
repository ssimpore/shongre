# Audit UI / UX / Accessibilité / Responsive — Shongre

**Date** : 20 août 2026
**Périmètre** : 54 routes applicatives parcourues sur `localhost:3000` (mode démo), en desktop 1440 px et en viewport réduit 500 px, complétées par une analyse statique du code source.
**Méthode** : navigation réelle via automatisation Chrome + sonde DOM injectée sur chaque écran (cibles tactiles, noms accessibles, contrastes calculés en sRGB, hiérarchie de titres, débordements, troncatures, échelles typo/rayons/hauteurs de contrôle), plus `grep`/`tsc` sur le dépôt.

---

## 0. Ce qui est déjà bon (à préserver)

Avant les correctifs, il faut dire ce qui tient. Le socle est meilleur que la moyenne :

- **Le design system est réellement documenté.** `frontend/src/index.css` définit une échelle de rayons sémantique (`--radius-xl` = contrôle, `--radius-2xl` = panneau, `--radius-card` = 20 px), une échelle de hauteurs de contrôle (32/40/44/48), des durées et courbes de motion centralisées, et une règle typographique explicite : *« micro (11 px) … jamais pour du corps de texte »*. Les commentaires expliquent le pourquoi de chaque valeur. C'est rare et c'est un actif.
- **Le primitif `Button` est correct** : `h-control-touch` (44 px) par défaut, `focus-visible:outline-2`, gestion du conflit d'utilitaires `display`, `active:scale-95`, états `disabled`/`aria-disabled`.
- **Focus global** : `*:focus-visible { outline: 2px solid var(--color-primary) }` dans `index.css`, plus `prefers-reduced-motion` respecté globalement.
- **Contraste globalement conforme.** Sur 20+ écrans mesurés (calcul WCAG réel après conversion oklch→sRGB), **une seule** famille d'échecs (§ P1-4). Les badges de rôle admin, les tableaux, les cartes passent AA.
- **Zéro erreur TypeScript** (`tsc --noEmit` propre), `check-design-tokens.mjs` au vert, aucune image sans `alt` sur l'ensemble des écrans parcourus, `loading="lazy"` sur 100 % des images.
- **Code splitting propre** : 92 chunks, Leaflet isolé (42 KB gzip, chargé seulement sur la vue carte), React isolé, taxonomie et fixtures démo isolées. Payload initial home ≈ **311 KB gzip**.
- **Secrets masqués** : sur `/admin/fournisseurs/stripe`, les clés secrètes sont rendues en `••••••` ; seule la clé publique `pk_live_…` est en clair, ce qui est correct.
- **Le wizard de publication est soigné** : 3 étapes lisibles, brouillon auto-sauvegardé annoncé, barre d'action collante, états vides écrits en français naturel.

Le problème n'est donc pas la conception du système. **C'est son application** : une grande partie du produit contourne les primitives.

---

## 1. Synthèse — les 5 chiffres qui résument l'audit

| Mesure | Valeur | Conséquence |
|---|---|---|
| Pages sans `<title>` / meta | **37 / 54** | SEO, onglets, partage, lecteurs d'écran |
| `<button>` bruts vs `<Button>` | **308 vs 315** | 9 hauteurs de contrôle hors échelle, 4 graisses |
| Tableaux bruts vs `DataTable` | **9 fichiers vs 1** | 0 `th[scope]` sur tout l'admin |
| CLS mesuré sur la home | **0,129** | au-dessus du seuil « bon » (0,1) |
| Chaînes non traduites | **1 032 / 86 fichiers** | blocage de l'ouverture EN |

---

## 2. P0 — à corriger avant toute mise en production

### P0-1. 37 pages sur 54 n'ont ni titre ni meta description

`usePageMeta` n'est appelé que dans 17 fichiers de page. Toute la zone `/compte`, tout `/admin`, tout le CRM, la messagerie, les favoris, les notifications, le wizard de publication et les pages newsletter conservent le titre par défaut **« Shongre - Petites Annonces Particuliers & Pros »**.

**Vérifié en navigation** : `/compte`, `/compte/annonces`, `/compte/favoris`, `/compte/recherches`, `/compte/messages`, `/compte/achats`, `/compte/verification`, `/compte/pro/tableau-de-bord`, `/deposer`, `/admin`, `/admin/utilisateurs`, `/admin/crm/*` — tous rendent le titre générique. Sur `/deposer`, l'onglet affichait encore « Mot de passe oublié | Shongre » hérité de la navigation précédente.

**Impact** : un utilisateur avec 5 onglets Shongre ouverts ne peut pas les distinguer ; les lecteurs d'écran annoncent le même titre à chaque changement de route ; les pages publiques concernées (messagerie, favoris) n'ont pas de `canonical`.

**Fichiers** :
```
features/admin/*.tsx (10)         features/admin/crm/*.tsx (8)
features/admin/providers/*.tsx (2) features/seller-workspace/*.tsx (4)
features/messaging/MessagingPage.tsx      features/favorites/FavoritesPage.tsx
features/notifications/*.tsx (2)          features/newsletter/*.tsx (3)
features/publishing/PublishWizard.tsx     features/saved-searches/SavedSearchesPage.tsx
features/support/*.tsx (2)                features/transactions/TransactionsPage.tsx
features/verification/VerificationCenterPage.tsx
```

**Correctif** : appeler `usePageMeta` dans chaque page ; pour l'admin, ajouter un `noindex` explicite. Ajouter un test de non-régression qui parcourt le router et échoue si une route rend le titre par défaut.

---

### P0-2. Des comptes internes Shongre sont publiés dans l'annuaire Pro public

Sur **`/professionnels`** (page publique, non authentifiée), l'annuaire liste :

```
/profil/lea-bertin      → « Léa Bertin (Commercial & Partenariats) »
/profil/antoine-fabre   → « Antoine Fabre (Administrateur) »
```

aux côtés des vraies boutiques. Le rôle interne est affiché dans le nom public, et la même liste alimente la home (`HomePage.tsx:125` appelle aussi `getAllProSellers()`).

**Cause racine** — `domains/user/user.domain.ts:2` :
```ts
export function isProSeller(user: any): boolean {
  if (!user) return false;
  return user.sellerType === 'pro' || user.accountType === 'professional' || user.role === 'pro_seller';
}
```
Les personas internes portent `sellerType: 'pro'` (vérifié sur `super_admin_alex`, `admin_antoine`, `commercial_lea`), donc `isProSeller()` renvoie `true`. `repositories/user.repository.ts:293` filtre sur cette seule fonction, sans exclure `accountType === 'internal'`.

**Impact** : fuite de l'organigramme interne et du périmètre de rôle sur une surface publique et indexable. Viole la règle produit « ne jamais exposer … de données vendeur privées » et la distinction Pro / Particulier.

**Correctif** : `getAllProSellers()` doit exclure `accountType === 'internal'` et les rôles plateforme internes, et exiger un statut de publication vendeur explicite (`isVerified` + `status === 'active'` + présence d'une vitrine), pas une simple correspondance de type. Ajouter un test qui échoue si un `accountType: 'internal'` apparaît dans l'annuaire.

---

### P0-3. Les toasts ne sont pas annoncés aux technologies d'assistance

`app/providers/ToastProvider.tsx:46` — le conteneur est un `div` sans `role`, sans `aria-live`, sans `aria-atomic` :
```tsx
<div className="fixed inset-x-0 bottom-[var(--mobile-nav-total-h)] md:bottom-4 … z-50 …">
```
Grep sur tout le dossier `app/providers/` : **aucun** `aria-live`, **aucun** `role="status"`.

Or les toasts portent des messages critiques : « Vos préférences ont été enregistrées », « Cette alerte est obligatoire… ». Un utilisateur de lecteur d'écran effectue l'action et n'obtient **aucun retour**.

Sur l'ensemble du code : `aria-live` dans 3 fichiers, `role="status"` dans 1, `role="alert"` dans **0**. Échec WCAG 2.1 **4.1.3 Messages d'état (AA)**.

**Correctif** : deux régions live sur le conteneur — `role="status" aria-live="polite"` pour succès/info, `role="alert" aria-live="assertive"` pour erreurs — avec `aria-atomic="true"`.

---

### P0-4. Champs de formulaire sans étiquette sur les parcours critiques

Détecté via `input.labels`, `aria-label`, `aria-labelledby` — le `placeholder` **n'est pas** une étiquette (il disparaît à la saisie et n'est pas annoncé de façon fiable).

| Écran | Champs concernés |
|---|---|
| `/inscription/professionnel` | nom (`ex: Sophie Marchand`), email, téléphone — **3 / 4 champs** |
| `/inscription/particulier` | département (`<select>`), code postal (`75001`), ville (`ex: Paris`) |
| `/admin/fournisseurs/:id` | **7 champs**, dont priorité de routage, environnement, clé publique Stripe |
| `/admin/roles` | filtre de permissions |
| `/admin/crm/contacts`, `/entreprises`, `/prospection`, `/admin/crm` | recherches |
| `/categories`, `/collections`, `/profil/:slug`, `/boutique/:slug` | filtres/recherches internes |
| `/compte/messages` | recherche de conversation **et le `textarea` de rédaction du message** |
| `/deposer` | recherche de catégorie |

*Correction apportée en cours d'audit* : une première passe avait aussi signalé des cases à cocher « sans nom accessible » sur `/inscription/particulier`, `/connexion` et `/newsletter`. Vérification faite, elles sont correctement étiquetées par un `<label>` englobant (« J'ai lu et j'accepte les Conditions Générales », « Rester connecté sur cet appareil »). La sonde lisait le `textContent` de l'`<input>` lui-même, toujours vide. Ces cases restent trop petites (§ P1-3) mais elles sont nommées.

**Impact** : le tunnel d'inscription Pro — la conversion la plus rentable — est inutilisable au lecteur d'écran. Échec WCAG **1.3.1**, **3.3.2**, **4.1.2**.

**Correctif** : passer ces champs par `FormField` (le primitif existe déjà, `design-system/primitives/FormField.tsx`) ou ajouter `aria-label`. Ajouter une règle ESLint `jsx-a11y/label-has-associated-control`.

---

### P0-5. ~110 boutons icône dont le nom ne distingue pas leur cible *(requalifié — voir §11)*

Une première passe les annonçait « sans nom accessible ». Vérification faite, **tous portent un `title`** — le défaut réel est plus étroit mais reste sérieux : le nom est **générique et répété** (« Monter d'un rang » ×26, « Ajouter une sous-rubrique » ×31), et `title` n'est ni surfacé au doigt ni annoncé de façon fiable. Sur **`/admin/taxonomie`**, **100 boutons 24×24 px** sont dans ce cas. Signatures :
```
button.p-1 rounded-md text-stone-500 hover:text-stone-700 …
button.p-1 rounded      text-stone-500 hover:text-primary  …
```
Même défaut, à plus petite échelle : `/admin/audit` (4 boutons 24×24 anonymes), `/admin/crm/pipeline` (6 flèches de changement d'étape anonymes).

Ces boutons pilotent des opérations destructives (déplacer, dupliquer, supprimer un nœud de taxonomie). Au clavier, l'utilisateur entend vingt-six fois la même chose sans savoir sur quelle catégorie il agit.

**Impact** : échec WCAG **2.4.6** (libellés descriptifs) et fragilité **4.1.2**, sur l'écran le plus risqué du back-office.

**Correctif** : `aria-label` explicite incluant la cible (« Supprimer la sous-catégorie Voitures d'occasion »), et passage par le primitif `IconButton` (`design-system/primitives/IconButton.tsx`) qui devrait rendre le nom obligatoire par typage.

---

## 3. P1 — impact fort sur l'usage

### P1-1. La messagerie s'ouvre déjà défilée, header coupé

`/compte/messages` charge avec `window.scrollY = 615` sur un document de 1 703 px (viewport 610 px). L'utilisateur atterrit sur le champ de saisie avec le pied de page en dessous ; il doit remonter pour voir la conversation et l'en-tête.

Cause probable : le « défilement vers le dernier message » cible la fenêtre au lieu du conteneur de la liste de messages.

**Correctif** : `messagesEndRef.current.scrollIntoView({ block: 'nearest' })` sur le conteneur, ou `container.scrollTop = container.scrollHeight`, jamais `window.scrollTo`. Vérifier aussi l'interaction avec `AppScrollRestoration`.

**Second point sur le même écran** : la messagerie est encastrée dans le gabarit marketing (pied de page complet en dessous). Un fil de discussion dans une page qui défile est un anti-pattern — la colonne conversations et le fil devraient occuper la hauteur du viewport (`h-[calc(100dvh-var(--header-h))]`) et défiler indépendamment.

**Troisième point** : la barre de filtres (`Tous / Non lus / Achats / Ventes / Commandes`) est coupée au bord droit de la colonne, sans indicateur de défilement.

---

### P1-2. Aucun lien d'évitement

`skipLink: false` sur **toutes** les pages testées. Le header contient 12 contrôles focusables (logo, langue, catégories, recherche, localisation, bouton recherche, dépôt, favoris, messagerie, notifications, compte, menu). Un utilisateur clavier les traverse à chaque changement de page.

Échec WCAG **2.4.1 Contournement des blocs (A)**.

**Correctif** : `<a href="#main" class="sr-only focus:not-sr-only …">Aller au contenu principal</a>` en première position dans `MainLayout`, `AccountLayout`, `AdminLayout`, `FocusedLayout`, et `id="main"` sur le `<main>` existant.

---

### P1-3. Cibles tactiles sous le minimum

WCAG 2.5.8 (AA, 2.2) impose 24×24 px. Relevé sur les écrans réels :

| Taille | Élément | Écran |
|---|---|---|
| **16×16** | « Retirer le filtre *velo* » | `/recherche?query=…` |
| **16×16** | cases CGU et newsletter (correctement étiquetées) | `/inscription/particulier` |
| **16×16** | case « Rester connecté sur cet appareil » | `/connexion` |
| **16×16 ×9** | cases de configuration des forfaits | `/admin/monetisation` |
| **20×20 ×2** | cases « marquer comme terminée » | `/admin/crm/taches` |
| **14 px de haut** | badge « Pro », nom du vendeur (cliquables) | `/bons-plans`, `/annonce/:id` |
| **15 px de haut ×8** | liens de fournisseurs | `/admin/fournisseurs` |
| **16 px de haut** | « Effacer tout », fil d'Ariane, « Voir tout », liens de pied de page | transversal |
| **23–30 px** | puces de recherche populaires, chips de catégorie, onglets | home, `/recherche`, `/aide` |

**Le bouton favori n'est pas dans cette liste, et c'est une correction de l'audit.** Une première passe l'avait signalé (24×24 sur la home contre 36×36 sur `/annonce/:id`). Lecture faite de `FavoriteButton.tsx` : 24 px est exactement le plancher WCAG 2.5.8, la différence de taille est une prop `size` documentée par contexte, et le composant ajoute une cible de 44 px via un `::after` centré sous `@media (pointer: coarse)` — présence de la règle vérifiée dans le CSS compilé (`dist/assets/index-*.css`). La sonde tournait avec un pointeur fin, donc la variante ne s'appliquait pas. **Le composant est conforme ; aucune modification n'a été faite.**

**Correctif** : plancher de 24×24 px pour toute cible, 44×44 sur les surfaces tactiles (le token `--spacing-control-touch` existe). Pour les petites icônes, agrandir la zone cliquable sans agrandir le glyphe (`::before` en position absolue, ou `p-2.5` + `-m-2.5`). Uniformiser `FavoriteButton` sur une seule taille par contexte, déclarée en prop.

---

### P1-4. Contraste insuffisant sur les compteurs de catégories (home)

Seule famille d'échecs de contraste mesurée sur l'ensemble du produit :

```
2,44 : 1   (minimum 4,5)   12 px, poids 600
couleur oklch(0.709 0.01 56.259)  sur  rgb(250, 248, 245)
textes : « 18 400+ annonces », « 12 800+ biens », « Annonces disponibles »
```

C'est du `stone-400` sur le fond crème `bg-base`. Échec WCAG **1.4.3 (AA)**.

**Correctif** : `stone-500` (`oklch(0.553 …)`) donne ≈ 4,6:1 sur ce fond. À corriger dans le token de texte secondaire plutôt que sur le composant, pour couvrir toutes les occurrences.

---

### P1-5. Tableaux d'administration : le primitif `DataTable` est contourné

`design-system/primitives/DataTable.tsx` gère correctement `th[scope]`. Il est importé par **un seul** fichier de fonctionnalité (`MyListingsPage.tsx`).

Neuf écrans rendent un `<table>` brut :
```
AdminRolesMatrixPage · AdminUsersPage · AdminAuditLogsPage · AdminMarketsPage
AdminModerationPage  · providers/ProviderCatalogTable · providers/ProviderMarketMatrix
taxonomy/TaxonomyAuditTab · taxonomy/TaxonomyDraftPublishTab
```
Mesures : `/admin/utilisateurs` → 5 `th`, **0 `scope`**. `/admin/roles` → 14 `th`, **0 `scope`**. `/admin/audit` → 6 `th`, **0 `scope`**.

Conséquences au-delà de l'accessibilité : pas de tri partagé, pas d'état vide partagé, pas de squelette de chargement partagé, pas de pagination (l'annuaire utilisateurs rend les 19 lignes d'un bloc — cela ne tiendra pas à 10 000 comptes).

---

### P1-6. Débordements horizontaux sans affordance

| Écran | Constat |
|---|---|
| ~~`/admin/roles`~~ | **Retiré** : la table est déjà dans un `overflow-x-auto` avec `role="region"`, `tabIndex={0}` et `aria-label`. Elle défile correctement — voir §11 |
| `/admin/crm/pipeline` | 4ᵉ colonne kanban tranchée au bord droit, sans ombre, dégradé ni barre de défilement visible (confirmé en capture) |
| `/admin/taxonomie` | rail d'onglets de 1 127 px débordant |
| `/compte/messages` | rail de filtres coupé au bord de la colonne |
| `/collections`, `/recherche` | rails de catégories débordants — ceux-ci ont un bouton de défilement, les autres non |

**Correctif** : conteneur `overflow-x-auto` explicite + masque de fondu au bord + boutons de défilement, sur un composant unique (`ScrollRail` existe déjà dans les primitives — l'appliquer partout).

---

### P1-7. Structure de titres

| Écran | Constat |
|---|---|
| `/admin/fournisseurs/:id` | **saut H1 → H4** (aucun H2/H3) |
| `/boutique/:slug` inconnu | **aucun H1** — l'état « Profil introuvable » n'est qu'un H2 |
| `/compte/messages` (compte sans conversation) | **aucun H1**, l'état vide « Aucun message pour le moment » n'est pas un titre |
| `/annonce/:id` inconnu | H1 correct mais `<title>` reste le titre générique |

Les autres écrans sont propres : un seul H1, pas d'autre saut de niveau détecté sur 30+ pages.

---

### P1-8. Retours de formulaire non transmis aux technologies d'assistance

- `aria-invalid` : **1 fichier** sur tout le produit.
- `aria-describedby` : **2 fichiers** — les messages d'erreur ne sont donc pas rattachés à leur champ.
- ~~`aria-current`~~ : **retiré**. Compté par `grep` sur la chaîne littérale, mais `NavLink` de React Router le pose automatiquement — les barres latérales étaient déjà conformes. Restaient le fil d'Ariane et les onglets, corrigés.
- Le compteur de résultats de recherche (« 19 utilisateur(s) trouvé(s) », « Mes favoris (0) ») n'est dans aucune région live : filtrer ne produit aucune annonce.

---

## 4. P2 — cohérence du design system

### P2-1. 308 `<button>` bruts contournent le primitif `Button`

Répartition (top) : `GlobalSearchBar` 24, `PublishWizard` 13, `SellerCatalog` 8, `ListingMediaGallery` 8, `TransactionsPage` 7, `ExploreMapView` 7, `SellerProfileHeader` 7, `MyListingsPage` 6, `SearchPage` 6, `AdminMarketsPage` 6, `DropdownMenu` 6, `CategoryFilterRail` 6, `Header` 6.

Effet mesuré sur les écrans : **hauteurs de bouton 16, 20, 23, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 47, 52, 59, 70 px**, alors que l'échelle documentée n'a que 32 / 36 / 40 / 44 / 48. **Graisses 400, 500, 600, 700** sur la même page (sur la home, 45 boutons en 400 et 17 en 700).

**Correctif** : n'accepter `<button>` brut que dans les primitives ; ajouter une règle de lint interdisant `<button>` hors `design-system/`. Ajouter les variantes manquantes à `Button` (`icon`, `xs`) plutôt que de les réinventer sur place.

### P2-2. 45 tailles de police arbitraires, dont 19 sous le plancher documenté

```
text-[11px] ×22   text-[10px] ×17   text-[9px] ×2
text-[15px] ×2    text-[13px] ×1    text-[44px] ×1
```
Fichiers : `HeroBoostedScroll` (9), `MobileBottomNav` (6), `ListingCard` (4), `HomeCollectionsSection` (3), `HomeCategoryExplorer` (3), `HomePage` (3), `ViewModeToggle` (3), `SearchPage` (2), `CollectionsPage` (2), `CategoriesPage` (2).

`index.css` documente pourtant : *« micro (11 px) est la plus petite taille autorisée … jamais pour du corps de texte »*. `text-[10px]` et `text-[9px]` violent directement cette règle, dans les composants les plus vus du produit (carte d'annonce, navigation mobile, hero).

Mesure sur la home en viewport réduit : **53 éléments à 10 px, 17 à 9 px, 125 à 11 px**. Sur `/recherche` en desktop : 83 éléments à 11 px.

**Correctif** : remplacer par `text-micro` / `text-xs` ; étendre `check-design-tokens.mjs` pour échouer sur tout `text-[…px]`.

### P2-3. 55 valeurs de dimension arbitraires → 15+ troncatures observées

```
max-w-[130px] ×6   max-w-[200px] ×5   max-w-[120px] ×4   max-w-[240px] ×2
w-[22px] ×4        h-[22px] ×4        w-[560px] w-[360px] w-[290px] w-[280px] w-[250px]
```
Troncatures constatées en navigation :
- `/professionnels` — fil d'Ariane « Annuaire des Boutiques Professionnelles » coupé (`max-w-[240px]`)
- `/annonce/:id` — titre d'annonce coupé dans le fil d'Ariane
- `/admin/fournisseurs` — 5 noms de fournisseurs coupés (« MangoPay Escrow & Marketplace Pa… »)
- `/admin/taxonomie` — 5 noms de catégories coupés
- `/admin/roles` — 5 libellés de rôle coupés
- `/admin/audit` — 4 descriptions coupées (`max-w-xs`)
- `/admin/marches` — « CHF (CHF) • fr-CH », « Luxembourg » coupés
- `/compte/*` — le nom de l'utilisateur coupé dans la barre latérale sur **toutes** les pages du compte
- home — « Répond en attente de validation », « Répond en moins d'une heure »

**Correctif** : largeurs fluides + `title`/`tooltip` sur le texte tronqué, ou passage à `line-clamp-2`. Une troncature sans moyen de lire la valeur complète est une perte d'information, pas une décision de mise en page.

### P2-4. Couleurs en dur hors du système de tokens

`design-system/primitives/CategoryIcon.tsx` contient **66 valeurs hexadécimales** (`#6366F1`, `#0284C7`, `#DB2777`, `#059669`…), `domains/taxonomy/taxonomy.data.ts` en contient 18, `app/layouts/Footer.tsx` 4, plus des occurrences isolées dans `HomePage`, `CollectionsPage`, `CategoriesPage`, `HeroBoostedScroll`, `TaxonomyNodeEditor`.

Les hex de `tokens/colors.ts` (75) et `tokens/theme.ts` (31) sont légitimes — c'est leur rôle. Ceux des composants et des données ne le sont pas : ils échappent au thème, ne sont pas testés en contraste et ne suivront pas un futur mode sombre.

**Correctif** : déplacer la palette catégorielle dans `tokens/colors.ts` sous des noms sémantiques (`--color-category-vehicles`…), et faire lire `CategoryIcon` depuis les tokens.

### P2-5. Rayons de carte incohérents d'une page à l'autre

`--radius-card` (20 px) existe et est documenté comme « la coquille de carte annonce/catégorie ». Mesures réelles sur les cartes :

| Écran | Rayons dominants |
|---|---|
| home | 10 px ×38, 20 px ×25, 14 px ×25, 18 px ×11 |
| `/collections` | 18 px ×30, 6 px ×16, 10 px ×14 |
| `/recherche` | 20 px ×20, 14 px ×19, 10 px ×8 |
| `/annonce/:id` | 14 px ×11, 10 px ×10, 18 px ×7, 20 px ×4 |
| `/compte/*` | 8 px ×15 dominant |
| `/admin/*` | 8 px dominant |

Les valeurs sont sur l'échelle — le problème est sémantique : quatre rayons différents cohabitent pour le même rôle visuel sur un même écran.

**Correctif** : figer un composant `Card` avec des variantes `shell | panel | inline` mappées sur `--radius-card` / `--radius-2xl` / `--radius-lg`, et interdire `rounded-*` ad hoc sur les conteneurs de carte.

### P2-6. Cases à cocher natives non stylées côté utilisateur

`/compte/notifications/preferences` rend une grille de cases à cocher **bleu système**, alors que `/admin/fournisseurs/:id` utilise un interrupteur stylé aux couleurs de la marque.

**Cause racine trouvée pendant l'implémentation** : `@tailwindcss/forms` n'est pas installé. Les classes `text-primary`, `rounded-md` et `border-border-base` posées sur une case native — y compris dans le primitif `Checkbox`, qui existe bel et bien, exporté depuis `FormField.tsx` — n'ont donc **aucun effet**. C'est pourquoi *toutes* les cases du produit étaient bleues, pas seulement celles de cet écran.

C'est l'écran de préférences le plus visible côté utilisateur, et c'est le seul qui n'a pas l'apparence du produit.

**Correctif** : une règle `accent-color: var(--color-primary)` sur `input[type=checkbox], input[type=radio]` dans `index.css` — une déclaration, tous les contrôles, aucune dépendance de plugin. Reste ensuite à faire adopter le primitif `Checkbox` par l'écran de préférences.

### P2-7. Emoji utilisés comme icônes

`/admin/marches` — onglets « ⚙️ Éditeur d'Héritage & Surcharges », « 📊 Matrice Comparative Multi-Pays », alors que tout le reste du produit utilise `lucide-react`. Rendu variable selon l'OS, non colorable, mal annoncé par les lecteurs d'écran.

### P2-8. Le sélecteur de rôle démo affiche un rôle faux

`app/layouts/DemoRoleSwitcher.tsx` ne liste que 6 rôles. Connecté en `super_admin`, la barre affiche **« 1. Visiteur non connecté (Alexandre Meyer (Super Admin)) »** — `roles.find(...)` échoue et retombe sur `roles[0]`. Idem pour `support`, `operations`, `finance`, `commercial`, `content_manager`, `market_manager`. Le commentaire du fichier documente précisément ce bug comme corrigé ; il ne l'est que pour les 6 rôles listés.

**Correctif** : si aucune correspondance, afficher le rôle réel plutôt que l'entrée 0. C'est un outil de démo, mais il ment sur l'état d'authentification pendant les démonstrations.

### P2-9. Le tableau de bord Pro affiche des indicateurs contradictoires

`/compte/pro/tableau-de-bord` : « **Vues totales catalogue : 0** » accompagné de « **+18,4 % cette semaine** », tandis que le graphique juste en dessous annonce « Total : 3 320 vues uniques ». « Taux de conversion 5,8 % » et « Volume de ventes estimé 14 250 € » sur un compte à 0 annonce.

Ce sont des valeurs de démonstration codées en dur présentées comme des mesures réelles. Sur une page vendue comme du suivi de performance, c'est un problème de confiance, pas seulement de données de test.

**Correctif** : brancher les KPI sur la même source que le graphique ; masquer les variations quand la base est nulle ; état vide explicite « pas encore de données » pour un catalogue vide.

### P2-10. Clé technique brute affichée dans l'interface

`/admin/fournisseurs/stripe` affiche `STRIPE_CONNECT` en badge monospace et les capacités `payment.card`, `payment.wallet`, `payment.refund`, `invoicing.subscription` en clair. Idem `/admin/utilisateurs` où le type de compte brut `individual` s'affiche sous le badge de rôle traduit.

Sur un écran d'intégration technique, montrer l'identifiant de fournisseur se défend. Le doublon `Acheteur Particulier` + `individual` dans l'annuaire utilisateurs, non : le libellé traduit est juste au-dessus.

---

## 5. Internationalisation

`check-i18n-coverage.mjs` : **1 032 chaînes non traduites réparties sur 86 fichiers**.

```
112  domains/providers/provider-capabilities.ts
109  security/permissions.ts
 93  domains/taxonomy/attribute.registry.ts
 85  domains/collection/collection.data.ts
 49  domains/support/support.categories.ts
 38  domains/market/market.defaults.ts
 37  domains/providers/provider.registry.ts
 28  domains/auth/auth.service.ts
 27  domains/verification/verification.service.ts
 27  security/components/RequirePermission.tsx
```

Le script confirme que *« toute surface déjà migrée reste exempte de texte codé en dur »* — la discipline tient sur ce qui a été traité. Le reste est concentré dans les couches domaine/configuration, qui alimentent pourtant des libellés visibles (capacités de fournisseur, attributs de taxonomie, catégories de support, noms de collections).

S'y ajoutent des chaînes en dur dans des composants déjà migrés — par exemple `features/pro/ProDirectoryPage.tsx` : « Ouvrir ma boutique Pro », « Accueil », « Annuaire des Boutiques Professionnelles », et une pluralisation faite à la main (`boutique{s} disponible{s}`) au lieu d'`Intl.PluralRules`.

---

## 6. Performance

Mesures réelles (`PerformanceObserver`, serveur de développement local, home) :

| Métrique | Valeur | Seuil « bon » |
|---|---|---|
| LCP | 1 036 ms | < 2 500 ms ✅ (mais local, non représentatif du réseau réel) |
| **CLS** | **0,129** | **< 0,1 ❌** |
| `domInteractive` | 223 ms | ✅ |
| Requêtes | 180 | — |

**Attribution retirée.** J'avais imputé ce CLS aux « 49 images sans dimensions ». Vérification structurelle faite, **47 des 48 images sont dans des boîtes de dimensions réservées par leur parent** — le motif correct — et la 48ᵉ est un avatar de 28 px dont le parent est en `w-7 h-7`. Sur les chargements suivants, le CLS mesuré est de **0**.

La mesure de 0,129 était réelle mais je n'ai pas su la reproduire à cache chaud, et je n'ai donc rien modifié ici. **À rejouer sur un chargement à froid en production** avant d'agir : les 22 images viennent d'un CDN tiers, ce qui reste la piste la plus probable.

**Bundle de production** (`frontend/dist`, mesuré, gzip) :

| Chunk | Brut | Gzip |
|---|---|---|
| `index` (coquille app) | 659 KB | **178 KB** |
| `vendor-react` | 284 KB | 91 KB |
| `data-taxonomy` | 87 KB | 20 KB |
| `index.css` | 149 KB | 22 KB |
| `vendor-leaflet` (carte seulement) | 146 KB | 42 KB |
| `AdminTaxonomyPage` | 112 KB | — |

Payload initial home ≈ **311 KB gzip**. Le découpage est bien fait (92 chunks, Leaflet et la taxonomie isolés). Le levier restant est le chunk `index` à 178 KB : il contient la coquille applicative chargée sur chaque route, y compris pour un visiteur qui n'ouvre qu'une annonce.

Les 22 images de la home viennent d'un CDN tiers (Unsplash) sans `Timing-Allow-Origin` — pas de mesure de poids possible, et pas d'optimisation locale (pas d'AVIF/WebP négocié, pas de `srcset` dimensionné par point de rupture au-delà de ce que fait `responsiveImage.ts`).

---

## 7. Contenu des pages légales

Volumes de texte mesurés dans `<main>` :

| Page | Caractères |
|---|---|
| `/mentions-legales` | **294** |
| `/securite` | 296 |
| `/accessibilite` | 437 |
| `/conditions-utilisation` | **855** |
| `/aide` | 876 |
| 404 | 120 |

Pour une place de marché française opérant des paiements, du séquestre, de la livraison et des comptes professionnels, ce sont des gabarits, pas des documents. `/accessibilite` s'intitule « Déclaration d'Accessibilité (WCAG 2.2 AA) » en 437 caractères — or l'audit ci-dessus montre que la conformité AA n'est pas atteinte ; publier cette déclaration en l'état est un risque juridique en soi (obligation de déclaration sincère).

La page 404 (120 caractères) n'offre ni recherche, ni catégories populaires, ni annonces récentes — trois occasions manquées de rattraper le visiteur.

---

## 8. Plan de correction proposé

### Lot 1 — Conformité et fuite de données (1 à 2 jours)
1. `usePageMeta` sur les 37 pages manquantes + test de non-régression sur le router. *(P0-1)*
2. Exclure les comptes internes de `getAllProSellers()` + test. *(P0-2)*
3. `role="status"` / `role="alert"` + `aria-live` sur `ToastProvider`. *(P0-3)*
4. Étiqueter les champs des tunnels d'inscription, de la messagerie et de la configuration fournisseur. *(P0-4)*
5. `aria-label` sur les boutons icône de `/admin/taxonomie`, `/admin/audit`, `/admin/crm/pipeline`. *(P0-5)*
6. Lien d'évitement dans les 4 gabarits. *(P1-2)*

### Lot 2 — Accessibilité et interaction (2 à 3 jours)
7. Plancher de 24 px (44 px tactile) sur les cibles listées ; unifier `FavoriteButton`. *(P1-3)*
8. Corriger le contraste du texte secondaire au niveau du token. *(P1-4)*
9. Corriger le défilement automatique de la messagerie + hauteur de viewport du fil. *(P1-1)*
10. `aria-current` sur les navigations, `aria-invalid` + `aria-describedby` sur les erreurs, région live sur les compteurs de résultats. *(P1-8)*
11. Corriger le saut H1→H4 et les états « introuvable » sans H1. *(P1-7)*

### Lot 3 — Performance (1 jour)
12. `aspect-ratio` sur toutes les images via le primitif `Image` → viser CLS < 0,1. *(§ 6)*
13. `fetchpriority="high"` + `eager` sur les 2 cartes vedettes.
14. Analyser le chunk `index` (178 KB gzip) et sortir ce qui n'est pas nécessaire au premier rendu.

### Lot 4 — Design system (3 à 5 jours, incrémental)
15. Créer `Switch` / `Checkbox` ; les appliquer aux préférences de notification. *(P2-6)*
16. Migrer les 9 tableaux admin vers `DataTable` (+ pagination). *(P1-5)*
17. Remplacer les 45 `text-[Npx]` ; étendre `check-design-tokens.mjs` pour les interdire. *(P2-2)*
18. Migrer les `<button>` bruts par vagues, en commençant par `GlobalSearchBar`, `Header`, `ListingCard`, `MobileBottomNav`. *(P2-1)*
19. Déplacer la palette catégorielle de `CategoryIcon` vers les tokens. *(P2-4)*
20. Composant `Card` à variantes ; supprimer les rayons ad hoc. *(P2-5)*
21. `ScrollRail` sur tous les rails débordants + masque de fondu. *(P1-6)*

### Lot 5 — Contenu et i18n (à cadrer avec le juridique / le contenu)
22. Rédiger les mentions légales, les CGU et la déclaration d'accessibilité — **la déclaration d'accessibilité doit suivre les correctifs, pas les précéder**.
23. Enrichir la 404 (recherche, catégories, annonces récentes).
24. Migrer les 1 032 chaînes restantes, en commençant par les couches domaine qui alimentent des libellés visibles.
25. Réconcilier les KPI du tableau de bord Pro avec leur source. *(P2-9)*

---

## 9. Limites de cet audit — à ne pas surinterpréter

Honnêteté sur ce qui n'a **pas** été vérifié :

- **Mobile réel non testé.** Chrome refuse un viewport sous 500 px ; la passe « mobile » a été faite à 500 px. Les points de rupture 360–390 px (iPhone SE / 13 mini, une part significative du trafic français) n'ont pas été observés. À rejouer en émulation d'appareil ou sur matériel.
- **Aucun test au lecteur d'écran.** Les manques d'accessibilité listés sont détectés par inspection du DOM (noms accessibles, rôles, relations). Le comportement réel sous NVDA / VoiceOver n'a pas été observé.
- **Aucun test au clavier seul.** L'ordre de tabulation, les pièges de focus dans les modales, le retour de focus à la fermeture n'ont pas été parcourus. Signal positif : `role="dialog"` dans 11 fichiers, `aria-modal` dans 10 — la couverture semble bonne, non confirmée.
- **Contraste** calculé sur des fonds unis. Les éléments posés sur un dégradé ou une image (flèches de galerie, hero) sont exclus du calcul et doivent être vérifiés à l'œil.
- **Le backend n'a pas été audité.** Le dépôt est un monorepo Node/Supabase (`backend/` en TypeScript, `backend/supabase/`), et non la pile Django/PostgreSQL/Celery décrite dans les consignes de session. Aucune conclusion serveur n'est tirée ici.
- **Mesures de performance en développement.** LCP et le nombre de requêtes viennent du serveur Vite local, non d'un build de production servi sur un réseau réaliste. Le CLS (0,129) et les tailles de bundle, eux, sont fiables.
- **Trois faux positifs corrigés en cours d'audit**, listés par honnêteté sur la méthode :
  1. une alerte de contraste 1,09:1 sur la carte « Prospection IA » de `/admin/crm` — la sonde ne détectait pas un fond en `background-image` (dégradé). La carte est correcte ;
  2. des cases à cocher « sans nom accessible » sur les écrans d'inscription et de connexion — elles sont étiquetées par un `<label>` englobant, que la sonde ne lisait pas ;
  3. le `FavoriteButton` signalé comme sous-dimensionné et incohérent — il est conforme, avec une expansion tactile de 44 px vérifiée dans le CSS compilé.
  Chacun a été vérifié dans le code source avant d'être retiré. Aucune autre alerte de ce type ne subsiste.

---

## 10. Correctifs appliqués — branche `fix/audit-ui-ux-lot1`

Livrés sur une branche dédiée, **sans commit** : `git diff` sur `fix/audit-ui-ux-lot1` montre l'intégralité des changements.

**85 fichiers modifiés, 3 créés, 1 410 insertions, 316 suppressions.**

### 10.1 P0 — tous fermés

| Réf. | Correctif | Portée |
|---|---|---|
| **P0-1** | `usePageMeta` sur les **37 pages** qui rendaient le titre par défaut : titre, description, `canonicalPath`, `noIndex` pour tout ce qui est derrière authentification. Les 74 chaînes passent par le catalogue i18n FR **et** EN | 37 fichiers + 2 catalogues |
| **P0-2** | `isInternalAccount()` et `isPubliclyListableProSeller()` ajoutés au domaine ; `getAllProSellers()` filtre sur la *publicité*, plus sur le type de compte | `user.domain.ts`, `user.repository.ts` |
| **P0-3** | Région live persistante sur les toasts (`role="region"`, `aria-live="polite"`, `aria-relevant="additions"`, `aria-atomic="false"`), `role="alert"` sur les erreurs, nom accessible et cible 24 px sur la fermeture | `ToastProvider.tsx` |
| **P0-4** | **31 champs** étiquetés : 14 sur les tunnels d'inscription (`htmlFor`/`id`), 9 sur la fiche fournisseur (labels promus depuis des `<span>`), 8 recherches et filtres (`aria-label`) | 12 fichiers |
| **P0-5** | Les **110 boutons icône** de la taxonomie, du pipeline et de l'audit passent d'un `title` générique à un `aria-label` **nommant leur cible** (« Descendre Véhicules d'un rang »), plus `aria-expanded` sur les nœuds pliables | 4 fichiers |

### 10.2 P1 — tous traités sauf la consolidation `DataTable`

| Réf. | Correctif |
|---|---|
| **P1-1** | La messagerie ne défile plus la page. `scrollIntoView()` remonte tous les ancêtres scrollables ; remplacé par `scrollTo` sur le conteneur de la liste. **`scrollY` au chargement : 615 → 0** |
| **P1-2** | Primitif `SkipLink` créé, posé dans les 3 coquilles, `id="main-content"` + `tabIndex={-1}` sur les `<main>` |
| **P1-3** | **Cibles sous 24 px sur l'accueil : 46 → 0.** `FilterChip` (16→24 px), cases natives (plancher CSS 18 px, 24 px au doigt), liens vendeur et badges de `ListingCard`, fil d'Ariane, sous-catégories, `SellerCard` |
| **P1-4** | Compteurs de catégories `stone-400` (2,44:1) → `stone-500`. **Échecs de contraste sur l'accueil : 3 → 0** |
| **P1-5** | **39 `th` reçoivent `scope="col"`** sur les 9 tableaux. Vérifié : utilisateurs 5/5, audit 6/6, matrice des rôles 14/14. *La consolidation vers `DataTable` n'est pas faite — voir 10.5* |
| **P1-6** | `ScrollRail` appliqué au kanban CRM et aux filtres de la messagerie ; le primitif devient focusable et nommé quand il déborde, et ses libellés passent par i18n |
| **P1-7** | Saut H1→H4 corrigé sur la fiche fournisseur ; les états « profil introuvable », « profil suspendu » et « aucun message » portent désormais un H1 |
| **P1-8** | Compteurs de résultats en `role="status" aria-live="polite"` sur `/recherche`, `/admin/utilisateurs` et `/professionnels`, avec pluralisation `Intl.PluralRules` à la place de `> 1 ? 's' : ''` |

### 10.3 P2 — design system

| Réf. | Correctif |
|---|---|
| **P2-2** | **45 `text-[Npx]` éliminés, 0 restant.** 41 ramenés sur `text-micro` (dont les 19 sous le plancher documenté), 1 sur `text-sm`, et 2 promus en tokens nommés (`--text-card-title`, `--text-hero`) parce qu'ils étaient des décisions de design délibérées. **Sur l'accueil : plus aucun texte à 9 ou 10 px** |
| **P2-2 bis** | `check-design-tokens.mjs` **interdit désormais tout `text-[…px]`** — règle vérifiée en la déclenchant volontairement |
| **P2-3** | `title` restauré sur le fil d'Ariane, le nom et l'email de la barre latérale du compte ; `aria-current="page"` sur le dernier fil |
| **P2-4** | **Les 66 hex de `CategoryIcon` déplacés** vers `colors.category` sous des noms sémantiques (`vehicles`, `realEstate`…). Fichier à 0 hex |
| **P2-6** | Cause trouvée : `@tailwindcss/forms` n'est pas installé, donc `text-primary` sur une case native n'a jamais rien fait. Une règle `accent-color: var(--color-primary)` dans `index.css` corrige **toutes** les cases et radios du produit d'un coup. Les 24 cases des préférences reçoivent aussi un nom accessible |
| **P2-7** | Le sélecteur démo n'invente plus un rôle : sans correspondance dans les 6 personas, il affiche le rôle réel via `roleLabel()` au lieu de « Visiteur non connecté » |
| **P2-8** | KPI Pro réconciliés : le total du graphique est **sommé depuis ses propres barres**, et les indicateurs fixes s'effacent au profit de « Pas encore de données » quand le catalogue est vide. `TODO(analytics)` posé sur la source réelle |
| **P2-9** | La clé brute `individual` disparaît de l'annuaire utilisateurs au profit d'un libellé traduit |
| **P2-10** | Les 13 emoji-icônes de `/admin/marches` remplacés par des icônes `lucide`, plus `aria-current` sur l'onglet actif. Le seul emoji restant est une **valeur de drapeau de marché** — de la donnée, pas une icône |

### 10.4 Contenu

- **Page 404** enrichie : 8 liens de catégories issus du service de taxonomie (donc jamais désynchronisés du catalogue), en plus des deux actions d'origine. **120 → 321 caractères.**

### 10.5 Non fait, et pourquoi

- **P1-5, consolidation `DataTable`.** Le défaut d'accessibilité est corrigé partout. Fusionner les 9 tableaux dans le primitif — chacun avec son rendu de cellules, ses colonnes collantes, ses actions de ligne — plus ajouter la pagination, est une refonte à part entière qui mérite sa propre branche et sa propre revue.
- **P2-1, les 308 `<button>` bruts.** Même raison, à plus grande échelle : `GlobalSearchBar` (24), `PublishWizard` (13), `Header` (6)… Les symptômes visibles (cibles trop petites, tailles hors échelle) sont traités là où ils se manifestaient ; la migration structurelle reste à planifier.
- **P2-5, composant `Card`.** Uniformiser les rayons change l'apparence de tous les écrans à la fois. C'est une décision de design, pas un correctif.
- **Lot 5 légal.** Je n'ai pas rédigé les mentions légales, les CGU ni la déclaration d'accessibilité : ce sont des documents juridiques engageant la société. **La déclaration d'accessibilité en particulier doit être réécrite après un audit de conformité formel, pas avant.**
- **Les 1 032 chaînes i18n restantes.** Concentrées dans les couches domaine et configuration ; migration mécanique mais volumineuse, à faire par lots.

### 10.6 Vérifications

| Contrôle | Résultat |
|---|---|
| `tsc --noEmit` | ✅ 0 erreur |
| `vitest run` | ✅ **375 tests, 50 fichiers, 0 échec** |
| `check-design-tokens.mjs` | ✅ au vert, **avec la nouvelle règle anti-`text-[…px]`** |
| `check-i18n-coverage.mjs` | ✅ 1 033 chaînes (contre 1 032 avant les correctifs — **+1**, la valeur de drapeau `🌐`) |
| Navigation réelle | ✅ 28/28 routes titrées · annuaire Pro sans compte interne · 0 échec de contraste sur l'accueil · 0 champ sans étiquette · 0 cible sous 24 px sur l'accueil et `/professionnels` · `scrollY = 0` sur la messagerie · `th[scope]` à 100 % · 0 taille de police hors échelle |

### 10.7 Décision laissée au produit

`isPubliclyListableProSeller()` **n'exige pas** `isVerified`. L'ajouter rendrait vraie l'accroche de l'annuaire mais retirerait les boutiques en attente de KBIS — dans les fixtures, *Boutique Déco Sophie EIRL*. Arbitrage commercial, pas de sécurité : marqué `TODO(product)` dans le code.

---

## 11. Corrections de méthode — cinq constats retirés

Ma sonde DOM a produit cinq faux positifs. Ils sont listés ici parce qu'un rapport d'audit qui ne dit pas où il s'est trompé n'est pas vérifiable.

| Constat initial | Réalité | Cause de l'erreur |
|---|---|---|
| Contraste 1,09:1 sur la carte « Prospection IA » | Carte correcte (texte blanc sur dégradé sombre) | La sonde ne remontait que les `background-color`, pas les `background-image` |
| Cases à cocher « sans nom accessible » sur inscription et connexion | Correctement étiquetées par un `<label>` englobant | La sonde lisait le `textContent` de l'`<input>`, toujours vide |
| `FavoriteButton` sous-dimensionné et incohérent | Conforme : 24 px est le plancher exact, avec expansion à 44 px sous `@media (pointer: coarse)` vérifiée dans le CSS compilé | La sonde tournait avec un pointeur fin |
| « ~100 boutons **sans nom** » sur la taxonomie | Tous portaient un `title`. Le défaut réel était plus étroit : nom **générique et répété** (« Monter d'un rang » ×26), et `title` n'est pas surfacé au doigt | La sonde ne lisait pas l'attribut `title` |
| Matrice des rôles « coupée, pas défilable » | Déjà dans un `overflow-x-auto` avec `role="region"`, `tabIndex={0}` et `aria-label` | La sonde ne vérifiait pas si un ancêtre était scrollable |

Deux autres points ont été **requalifiés** plutôt que retirés :

- **`aria-current`** : je l'avais compté par `grep` sur la chaîne littérale et conclu « 2 fichiers seulement ». `NavLink` de React Router le pose automatiquement, donc les barres latérales étaient déjà conformes. Ce qui manquait réellement — les compteurs de résultats en région live — a été corrigé.
- **`Switch` / `Checkbox` « absents du design system »** : ils existent, exportés depuis `FormField.tsx`. Le vrai défaut était double — ils ne sont pas adoptés par l'écran de préférences, et le primitif lui-même s'appuyait sur `text-primary`, inopérant sans `@tailwindcss/forms`. C'est cette seconde cause qui rendait **toutes** les cases du produit bleues, et c'est elle qui a été corrigée.

Enfin, **le CLS de 0,129 reste mesuré mais son explication était fausse.** Je l'attribuais aux « 49 images sans dimensions ». Vérification structurelle faite, **47 des 48 images sont dans des boîtes de dimensions réservées** par leur parent — le motif correct. Sur les chargements suivants, le CLS mesuré est de **0**. Je n'ai pas su reproduire la mesure initiale à cache chaud, et je n'ai donc **rien « corrigé »** ici : la cause reste à identifier sur un chargement à froid réel, en production.
