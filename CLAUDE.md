# Dérive : consignes pour Claude

Jeu de gestion idle / roguelite en HTML, CSS et JavaScript, sans dépendance ni compilation (scripts classiques, objet global `G`). Version actuelle : **V0**. Dérivé de `../Lignees`.

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
- Mettre à jour `DESIGN.md` à chaque version.
