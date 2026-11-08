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

## V0.2 — améliorations et version 3D 🤖
**Corrections**
- Clics perdus : l'interface se réécrivait 4 fois par seconde et pouvait remplacer le bouton entre l'appui et le relâchement. Le DOM est figé tant qu'un bouton de souris est enfoncé (`pointerHeld`, `ui.js`).
- La bête de démonstration de l'écran de départ n'est plus sauvegardée (`state.save`).
- `_grid` n'est plus écrite dans la sauvegarde. Migration souple dans `state.migrate`.
- Infobulles : plus d'infobulle fantôme quand l'élément survolé est remplacé.

**Profondeur**
- **Rencontres** (`js/data/events.js`, `chronicle.js`) : 12 décisions à choix toutes les 4 à 6 min, jamais pendant une vague. Effets temporaires affichés à gauche (`run.timed`).
- **Mutations** : chaque Colosse naît avec un caractère parmi 8 (bosse, cicatrices = cases mortes, sang épais, longues pattes…).
- **Savoirs sans fin** (`G.INFINITE`) : 5 recherches répétables (coût ×1,45), ouvertes par la première technologie ⭐. Elles donnent un débouché aux récits.
- Les bâtiments abîmés se réparent lentement hors des vagues (1 % par seconde).

**Confort** : cible réglable aussi sur les harpons, « Monter les N », liens fournisseurs (bleu) / clients (orange) du bâtiment sélectionné, conseils sur le fourrage et la première vague.

**Version 3D** (`3d.html`, `js/ui/render3d.js`) : second moteur de rendu au même contrat que `render.js` (`init, resize, fit, draw, screenToTile, screenToWorld, shake, pan, zoomAt, cam, dayDark`). Caméra orthographique (azimut 0,56 rad, élévation 0,66 rad), facettes à couleurs par sommet, carapace bombée (`surface()`), ombres portées, jour et nuit par la lumière. Modèles assemblés par `Kit` (primitives fusionnées) ; unités, cargaisons et câbles en `InstancedMesh`. Mesure : 9 ms par image, 27 000 à 32 000 triangles, 110 à 140 appels de dessin (Radeon RX 6700 XT).

**Mesures du bot (V0.2, petit échantillon)** 🧪 : Paisible 2 triomphes sur 2 (51 à 54 min) ; Rude 3 triomphes sur 5 (51 à 55 min) ; Sauvage 1 sur 2. Sauvage est peut-être devenu trop accessible : à vérifier.

## V0.3 — caméra libre, optimisation, information, saga 🤖
**Caméra 3D** : rotation complète et inclinaison (clic droit ou molette + glisser, Q ou A / E, flèches, boutons sur la carte, boussole qui indique la tête). Les angles sont gardés dans `meta.settings`. Sol élargi pour couvrir toutes les vues. Clic droit corrigé : il ne pose plus de bâtiment avant d'annuler.

**Optimisation** ✅ (demande du joueur)
- **Niveaux entiers** : `G.LEVELS.prod = 1`, un niveau N vaut N bâtiments, entrées et sorties ensemble (harpons compris : ils tirent ×N de cordes). Les ratios d'une chaîne ne bougent jamais. Tentes : logent ×N et mangent ×N. Emplois +50 % par niveau seulement : monter économise des bras. Coût ×2 à chaque niveau.
- **Ratios nets** : recettes arrondies à des valeurs lisibles par minute (corderie 18 → 9, fumoir 12 + 6 → 30, conteur 6 → 12, grue 30, harpon 15 par 10 s).
- **Cadence** : un bâtiment sans famine ni engorgement gagne jusqu'à +30 % de sorties en 45 s et perd tout en 12 s (`b.cad`). Les entrées n'augmentent pas : c'est la récompense directe de l'équilibre.
- **Onglet Flux** : rendement global, offre et demande par ressource, ce qu'il manque (« 0,6 × Grue »), liste cliquable des goulots.
- Production réelle par bâtiment (`b._m`, non sauvegardée) comparée au nominal.

**Information** : cartes avec entrées → sorties visibles ; fiches au survol (`js/ui/info.js`, `data-tipx`) pour bâtiments, ressources, satiété, vigueur, croissance, main-d'œuvre, vagues, allures, étapes, technologies ; aperçu de l'emplacement pendant la pose ; aperçu du niveau suivant ; bonus actifs à gauche ; Guide (commandes, bâtiments, ressources, règles).

**Saga** (`js/data/saga.js`, `js/core/saga.js`) : un songe par nuit (cycle de 6 min, jamais pendant une vague). 18 chapitres en 5 livres, 5 songes d'errance, 4 fins au Col. Tout est gardé d'une bête à l'autre dans `meta.saga`.
- **Le secret** : le Monde Ocre est la peau de la Première, couchée, qui rêve que les Colosses marchent. Les parasites boivent ce qu'elle se rappelle. Tic est sa dernière pensée. Les Murmures sont les Veilleurs d'avant.
- **RPG** : Éveil (niveaux, éclats à placer), trois Voix (Os, Chair, Brume) avec bonus par point et dons à 3, 6 et 9, six compagnons recrutés en songe (trois à vos côtés, niveaux 1 à 5, « Veiller » coûte des récits).
- **Fins** : Le Nom (Os), Le Matin (Chair), Le Rêveur (Brume), toutes à 3 points, ou Le Passage (silence). Le Livre V s'ouvre après une première fin.

**Rééquilibrage** : passes relevées (Gué : 60 outils, 80 peaux, 90 cordes ; Col : 130 lanternes, 150 pointes, 160 outils), vagues plus fortes (taille 3 + 1,5 n, PV ×1,14 par vague, Sauvage ×1,8).

**Mesures du bot (V0.3, petit échantillon)** 🧪 : Paisible 2 triomphes sur 2 (52 à 72 min) ; Rude 2 sur 4 (53 à 56 min, 2 morts à 29 et 49 min) ; Sauvage 0 sur 3 (morts vers 39 min). Le bot choisit toujours la première option des songes et n'optimise pas ses chaînes.

## Points ouverts ❓ / pistes 💡
- 🧪 Rythme et lisibilité pour un joueur humain (le bot est naïf).
- 💡 V1 : espèces de Colosse (Carapace, Arpenteur, Baleine des dunes, Bélier), régions 3 à 5 (Mer de verre, Terres d'orage, Cimetière), Légende ✨ et Totems (maîtrise ×n), pillards volants, passerelles et tyroliennes, Grand Envol, biomes infinis au-delà de la Brume.
- 💡 Nuit qui compte (lanternes), météo (tempête de sable, orage).
- 💡 Export / import de sauvegarde, emplacements multiples.
- ❓ Nom définitif.
