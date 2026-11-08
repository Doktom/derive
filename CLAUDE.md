# Dérive : consignes pour Claude

Jeu de gestion idle / roguelite en HTML, CSS et JavaScript, sans dépendance ni compilation (scripts classiques, objet global `G`). Version actuelle : **V0.3**. Dérivé de `../Lignees`. Deux pages, un seul moteur : `index.html` (2D, `js/ui/render.js`) et `3d.html` (Three.js r128, `js/ui/render3d.js`). Tout nouveau script doit être ajouté **aux deux pages**, et tout ce qui se voit sur la carte aux **deux rendus**.

Lire `DESIGN.md` (décisions) avant de modifier le jeu.

## Essentiel
- Tout est en **français** : interface, commentaires, documents, échanges.
- Lancer : `python tools/serve.py 8780`, ou la configuration `derive` du `.claude/launch.json` du dossier parent (`Desktop/CLAUDE`), puis http://localhost:8780.
- Données pures dans `js/data/`, moteur dans `js/core/`, affichage dans `js/ui/`.
- Coordonnées : case (x, y) = centre (x + 0,5 ; y + 0,5). La tête est en y < 0, la queue en y = L. Les gisements ont des coordonnées de centre.
- Boutons : `data-action="nom:arg"`, traités dans `act()` (`js/ui/ui.js`). Vérifier qu'un `case` du même nom n'existe pas déjà.
- Jamais `confirm()` ni `alert()` : utiliser `confirmModal()`.
- Toute modification de `run.buildings` passe par `G.economy.rebuildGrid()`.
- Tout changement du format de sauvegarde demande une migration (`main.js` → `boot`, `G.SAVE_V`).
- Équilibrer avec `BOT(secondes, { rig })` en console : la sauvegarde du joueur est restaurée après la simulation.
- Test dans le navigateur intégré : la sauvegarde du joueur est dans `localStorage` (`derive_save_v1`). La copier avant de tester, la restaurer après en remettant `savedAt` à `Date.now()`. Le volet limite parfois `requestAnimationFrame` à 2 images par seconde : avancer le jeu à la main (`G.economy.tick`) et mesurer la 3D avec `gl.readPixels`, pas au compteur d'images.
- Mettre à jour `DESIGN.md` à chaque version.
- Tout chiffre affiché au joueur passe par `js/ui/info.js`, qui lit le moteur (`G.economy`, `G.logic`, `G.defense`). Ne jamais y recopier une formule : l'exposer depuis le moteur.
- Infobulles : `data-tip` pour un texte simple, `data-tipx="clé:arg"` pour une fiche calculée (`G.info.tip`).
- Textes de la saga : `js/data/saga.js` (ton onirique, sobre). L'état est dans `meta.saga` (`G.saga.ensure`).
- Une nouvelle `kind` dans `run.pending` doit être traitée dans `G.logic.choosePending`, `G.ui.pendingModal` et `G.bot.decide`.
