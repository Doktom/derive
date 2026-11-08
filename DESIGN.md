# Dérive — Document de conception (V0)

> Titre provisoire. Légende : ✅ Validé · 🤖 Décidé par Claude (délégation) · 💡 Proposé · ❓ À définir · 🧪 À tester · 📦 Reporté

## Origine ✅
Nouveau jeu tiré de **Lignées** : on garde l'automatisation, le développement, la scalabilité et le roguelike ; on change l'univers, les graphismes et plusieurs mécaniques. Brief choisi parmi cinq (Dérive, Abysses, Le Grand Œuvre, Surchauffe, Mycélium).

## 1. Vision ✅
| | |
|---|---|
| Pitch | Le peuple vit sur le dos d'un **Colosse** qui marche à travers le Monde Ocre. Elle marche ; vous construisez. |
| Émotion | Émerveillement du voyage ; optimiser une machine vivante. |
| Narrateur | **Tic**, pique-bœuf bavard (`js/data/lore.js`). |
| Direction artistique | Vue de dessus ; papier, sable, ocre ; sol qui défile ; aquarelle + ligne claire ; icônes SVG (`js/ui/icons.js`). |

## 2. Ce qui vient de Lignées (adapté) 🤖
| Lignées | Dérive |
|---|---|
| Grille, territoire acheté | **Dos du Colosse** : la grille, qui grandit par vertèbres (croissance par le fourrage) |
| Gisements fixes sur la carte | **Gisements qui défilent** : grues (portée 4) et harpons (portée 7) sur les flancs |
| Forum | **Nuque** : réserve de départ, reçoit le fourrage qui nourrit la bête |
| Logistique physique (porteurs, stocks dans les bâtiments, entrepôts) | Reprise telle quelle, réécrite (`logistics.js`) ; greniers de bât |
| Électricité (réseaux) | **Veines** du Colosse, procédurales : production ×1,4 sur une veine |
| Ères | **Régions** (Steppe des Os, Forêt fossile) franchies par une **passe** (technologie ⭐ + ressources) |
| Décrets / faveurs | **Pactes** (sanctuaires, départ) / **offrandes** (nids) |
| Héritage | **Mémoire du troupeau** (7 améliorations permanentes) |
| Savoir | **Récits** (conteurs, ruines) |
| Vagues, tours, casernes | **Parasites** qui escaladent la bête ; lanceurs d'os, balistes, épouilleurs, palissades |
| Saisons | Cycle **jour / nuit** (6 min, décoratif en V0) |
| Bot d'équilibrage | Repris : `BOT(secondes, { rig })` et mode Bot |

## 3. Mécaniques nouvelles 🤖
- **Allure** : halte (pas de gisement, faim faible, la bête guérit), marche, galop (beaucoup de gisements qui passent vite, faim ×2,5). Raccourcis 1, 2, 3.
- **Satiété et vigueur** : la bête mange le fourrage livré à la Nuque (1 fourrage = 2 points). Sous 25 % elle ralentit, à 0 elle s'arrête et s'affaiblit. Vigueur 0 = fin de la marche.
- **Croissance** : le fourrage mangé quand la satiété dépasse 70 % fait pousser des vertèbres (coût ×1,22 par vertèbre). Les rangées de queue s'élargissent, aucune case n'est jamais perdue.
- **Carte de route** : 4 étapes de 36 cases par région, puis la passe. Nœuds : pâturage, filon, ossuaire, troupeaux, ruines, bosquets, nid, oasis, sanctuaire, caravane (marché). Sans choix, la bête choisit seule.
- **Anatomie** : flancs (récolte), échine (défense +1 portée), veines (production ×1,4), cœur (inconstructible).
- **S'ébrouer** (recharge 150 s) : 60 dégâts à tous les parasites, les cargaisons en transit tombent, bâtiments −6 %, satiété −8.
- **Grues** : cible automatique (ce qui manque le plus) ou réglée sur une ressource.
- **Parasites** sur le dos : drainent la vigueur tant qu'ils y sont.

## 4. Difficulté 🤖
Paisible (aucune attaque, mémoire ×0,75), Rude (débloquée d'office, ×1,25), Sauvage (débloquée en franchissant une passe en Rude, ×1,7).

## 5. Mesures du bot (V0) 🧪
- Paisible : Forêt fossile à 25 min, Col des Murmures (triomphe) vers 50 min.
- Rude : triomphe vers 55 min dans 2 simulations sur 3 ; la troisième meurt juste avant le Col.
- Sauvage : mort dans la Forêt fossile vers 47 min.

## 6. Technique
HTML/CSS/JS sans dépendance, objet global `G`, données dans `js/data`, moteur dans `js/core`, affichage dans `js/ui`. Sauvegarde automatique (10 s) dans `localStorage` (`derive_save_v1`). Hors ligne : jusqu'à 2 h simulées, en pilote automatique, sans parasites.

## Points ouverts ❓ / pistes 💡
- 🧪 Rythme et lisibilité pour un joueur humain (le bot est naïf).
- 💡 Les récits s'accumulent en fin de région (plus rien à rechercher) : nouvelles dépenses (rituels, cartes de route révélées, relances de pacte).
- 💡 V1 : espèces de Colosse (Carapace, Arpenteur, Baleine des dunes, Bélier), mutations, régions 3 à 5 (Mer de verre, Terres d'orage, Cimetière), Légende ✨ et Totems (maîtrise ×n), pillards volants, passerelles et tyroliennes, Grand Envol, biomes infinis au-delà de la Brume.
- 💡 Nuit qui compte (lanternes), météo (tempête de sable, orage).
- 💡 Export / import de sauvegarde, emplacements multiples.
- ❓ Nom définitif.
