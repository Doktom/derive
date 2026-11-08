# Dérive — V0.3

Jeu de gestion idle / roguelite dans le navigateur. Votre peuple vit sur le dos d'un **Colosse**, une bête grande comme une ville qui marche à travers le Monde Ocre. **Elle marche, vous construisez.**

Les gisements défilent le long de ses flancs : des grues et des harpons les attrapent au passage, des porteurs font circuler les ressources, le fourrage livré à la Nuque nourrit la bête qui grandit d'une vertèbre à l'autre. On choisit l'allure, la route, des pactes, on répond aux rencontres de la route, et l'on franchit les passes jusqu'au Col des Murmures. La Mémoire du troupeau survit d'une bête à l'autre.

La nuit, le Colosse rêve. Chaque songe est un choix qui nourrit trois Voix, recrute des compagnons et fait avancer une histoire qui continue d'une bête à l'autre, jusqu'à ce qu'il faudra dire au Col.

Inspiré des mécaniques de [Lignées](https://github.com/Doktom/lignees) (logistique physique, niveaux, héritage, bot d'équilibrage), avec un univers, des graphismes et plusieurs mécaniques entièrement nouveaux.

## Deux versions, une seule partie
| Page | Rendu |
|---|---|
| `index.html` | 2D aquarelle (Canvas) |
| `3d.html` | 3D axonométrique low poly (Three.js r128, chargé depuis cdnjs) |

Seul le rendu de la carte change : le moteur et la sauvegarde sont communs. Réglages → « Passer à la version 3D / 2D » bascule en gardant la partie.

## Lancer le jeu
```bash
python tools/serve.py 8780
```
puis ouvrir http://localhost:8780 (2D) ou http://localhost:8780/3d.html (3D). Sans internet ou sans WebGL, la page 3D renvoie vers la 2D.

## Contrôles
- Clic sur une carte de bâtiment, puis sur une case du dos. Clic droit ou Échap : annuler.
- Clic sur un bâtiment : panneau de détail (niveaux, « Monter les N », pause, priorité, cible des grues et des harpons, démolition). Les liens montrent ses fournisseurs (bleu) et ses clients (orange).
- Glisser : déplacer la vue · molette : zoom · C : recadrer · Espace : pause · 1, 2, 3 : halte, marche, galop.
- En 3D : clic droit (ou molette enfoncée) et glisser pour tourner autour de la bête, Q ou A et E par crans, flèches haut et bas pour incliner. Boutons en bas à droite de la carte.
- Survoler une carte de bâtiment, une ressource ou un indicateur ouvre sa fiche complète. Le bouton ? ouvre le guide.

## Structure
```
index.html, 3d.html page 2D, page 3D
css/style.css       style (papier, sable, ocre)
js/data/            contenu : ressources et gisements, bâtiments, régions, route, technologies, pactes,
                    héritage, répliques, rencontres, mutations, savoirs sans fin, saga (songes, Voix, compagnons, fins)
js/core/            moteur : bête, monde qui défile, route, économie, logistique, défense, règles,
                    chronique (rencontres, effets temporaires), saga, bot, sauvegarde
js/ui/              icônes SVG, render.js (2D), render3d.js (3D), interface, fiches d'information (info.js), bulle de Tic
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
