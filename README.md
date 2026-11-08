# Dérive — V0

Jeu de gestion idle / roguelite dans le navigateur. Votre peuple vit sur le dos d'un **Colosse**, une bête grande comme une ville qui marche à travers le Monde Ocre. **Elle marche, vous construisez.**

Les gisements défilent le long de ses flancs : des grues et des harpons les attrapent au passage, des porteurs font circuler les ressources, le fourrage livré à la Nuque nourrit la bête qui grandit d'une vertèbre à l'autre. On choisit l'allure, la route, des pactes, et l'on franchit les passes jusqu'au Col des Murmures. La Mémoire du troupeau survit d'une bête à l'autre.

Inspiré des mécaniques de [Lignées](https://github.com/Doktom/lignees) (logistique physique, niveaux, héritage, bot d'équilibrage), avec un univers, des graphismes et plusieurs mécaniques entièrement nouveaux.

## Lancer le jeu
```bash
python tools/serve.py 8780
```
puis ouvrir http://localhost:8780. Aucune dépendance ni compilation.

## Contrôles
- Clic sur une carte de bâtiment, puis sur une case du dos (Maj + clic pour en poser plusieurs). Clic droit ou Échap : annuler.
- Clic sur un bâtiment : panneau de détail (niveaux, pause, priorité, cible des grues, démolition).
- Glisser : déplacer la vue · molette : zoom · Espace : pause · 1, 2, 3 : halte, marche, galop.

## Structure
```
index.html          page du jeu
css/style.css       style (papier, sable, ocre)
js/data/            contenu : ressources et gisements, bâtiments, régions, route, technologies, pactes, héritage, répliques
js/core/            moteur : bête, monde qui défile, route, économie, logistique, défense, règles, bot, sauvegarde
js/ui/              icônes SVG, rendu canvas, interface, bulle de Tic
js/main.js          boucle de jeu, hors ligne, sauvegarde automatique
tools/serve.py      serveur de développement sans cache
DESIGN.md           document de conception
CLAUDE.md           consignes pour Claude Code
```

## Équilibrage avec le bot
Dans la console du navigateur :
```js
BOT(4500, { rig: 1 })   // simulation éclair d'une nouvelle bête (0 Paisible, 1 Rude, 2 Sauvage)
```
La simulation ne touche pas à votre sauvegarde. Réglages → Mode Bot : le bot joue la partie en cours.
