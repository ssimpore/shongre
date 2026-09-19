# SHONGRE. - Charte graphique / Brand Guidelines

Version 1.1.0 - 19 septembre 2026

## 1. Identite de marque

La signature officielle est **SHONGRE.** en capitales. Le point final orange
est un element distinctif et ne doit pas etre supprime dans la signature
complete. Le monogramme associe les lettres S et H dans un symbole compact,
convivial et immediatement reconnaissable.

## 2. Systeme de logos

- **Logo horizontal principal**: choix par defaut pour le site, les interfaces,
  les documents et les partenariats.
- **Logo empile**: pour les compositions carrees ou verticales.
- **Wordmark**: pour les espaces tres horizontaux ou le monogramme est deja
  present.
- **Icone**: pour les applications, favicons, avatars et petits formats.
- **Version inversee**: sur fonds sombres ou photographiques.
- **Monochrome**: quand une seule couleur d'impression est disponible.

## 3. Couleurs

| Role | HEX | RGB | CMYK approximatif |
| --- | --- | --- | --- |
| Shongre Orange | `#A54200` | 165, 66, 0 | 0, 60, 100, 35 |
| Shongre Ink | `#172033` | 23, 32, 51 | 55, 37, 0, 80 |
| White | `#FFFFFF` | 255, 255, 255 | 0, 0, 0, 0 |
| Mist | `#F7F8FA` | 247, 248, 250 | 1, 1, 0, 2 |

Les valeurs CMYK sont indicatives. Utiliser le profil ICC fourni par
l'imprimeur et valider un BAT pour toute production physique.

## 4. Typographie

- Titres et communication: Manrope ExtraBold ou Bold.
- Interfaces et textes: Inter Regular, Medium et SemiBold.
- Replis systeme: Arial, puis sans-serif.
- Pour une signature typographique recreee exceptionnellement: capitales,
  graisse 800 et approche proche de `0.08em`.

Ne jamais retaper le logo quand un fichier maitre est disponible.

## 5. Zone de protection et taille minimale

Conserver autour du logo une zone libre au moins egale au quart de la hauteur
du monogramme. Taille minimale recommandee: 120 px pour le logo horizontal,
24 px pour l'icone et 30 mm pour le logo horizontal imprime.

## 6. Fonds et contraste

- Sur fond blanc ou tres clair: logo principal.
- Sur fond Shongre Ink ou photographie sombre: version inversee.
- Sur fond orange: utiliser une version monochrome blanche uniquement si le
  symbole reste parfaitement lisible.
- Eviter les fonds charges et toujours maintenir un contraste accessible.

## 7. Usages interdits

Ne pas deformer, incliner, recadrer, recolorer arbitrairement, ajouter une
ombre, modifier l'espacement, separer le point orange du mot, changer la casse,
placer le logo dans une forme supplementaire ou l'utiliser sur un fond peu
contraste.

## 8. Web

Le dossier `03_Web` contient favicon ICO/PNG, icones PWA, Apple touch icon,
logos d'en-tete et images Open Graph. Utiliser le SVG de compatibilite ou le
PNG transparent pour le logo; WebP est recommande pour les contenus web
statiques quand la pile technique le permet.

## 9. iOS

Copier `04_iOS/AppIcon.appiconset` dans `Assets.xcassets`. L'icone principale
est opaque et plein cadre; iOS applique son propre masque. Ne pas ajouter de
coins arrondis ou d'ombre dans Xcode.

## 10. Android

Le dossier `05_Android` contient les icones legacy par densite, les calques
adaptatifs, la couleur de fond, le calque monochrome et les fichiers XML. Le
monogramme critique reste dans la zone sure centrale recommandee par Android.

## 11. Reseaux sociaux

Utiliser les avatars et couvertures deja dimensionnes dans `06_Social`.
Verifier la zone de recadrage dans l'interface de publication, en particulier
sur mobile. Ne pas ajouter de texte essentiel hors de la zone centrale.

## 12. Controle avant publication

Verifier le fichier, la variante de fond, la taille minimale, la zone libre,
le contraste, l'absence de deformation, l'orthographe exacte **SHONGRE.** et
la couleur orange du point final. Confirmer egalement les specifications de la
plateforme au moment de la publication.

