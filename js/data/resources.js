// Ressources et gisements (données pures).
// region : région à partir de laquelle la ressource apparaît.
G.RESOURCES = {
  fourrage:  { name: 'Fourrage',     color: '#93ab4f', region: 0 },
  bois:      { name: 'Bois',         color: '#9c6b3c', region: 0 },
  pierre:    { name: 'Pierre',       color: '#958d82', region: 0 },
  os:        { name: 'Os',           color: '#e6d9bb', region: 0 },
  viande:    { name: 'Viande',       color: '#b4524a', region: 0 },
  vivres:    { name: 'Vivres',       color: '#d8913f', region: 0 },
  cordes:    { name: 'Cordes',       color: '#c5a466', region: 0 },
  peau:      { name: 'Peau',         color: '#ad7c55', region: 0 },
  outils:    { name: "Outils d'os",  color: '#cdbf9c', region: 0 },
  resine:    { name: 'Résine',       color: '#e2a227', region: 1 },
  cuivre:    { name: 'Cuivre',       color: '#3e9f8c', region: 1 },
  lanternes: { name: 'Lanternes',    color: '#f0bd45', region: 1 },
  pointes:   { name: 'Pointes',      color: '#c46e37', region: 1 },
  recits:    { name: 'Récits',       color: '#8b6db5', region: 0, abstract: true }
};
G.RES_ORDER = Object.keys(G.RESOURCES);

// Gisements qui défilent de part et d'autre du Colosse.
// amt : quantité [min, max] · harpoonOnly : seul un harpon peut le prendre · moves : bouge un peu.
G.DEPOSITS = {
  prairie:     { name: 'Prairie',            res: 'fourrage', amt: [45, 85],   region: 0 },
  broussailles:{ name: 'Broussailles',       res: 'bois',     amt: [30, 60],   region: 0 },
  rocher:      { name: 'Rocher',             res: 'pierre',   amt: [30, 60],   region: 0 },
  ossuaire:    { name: 'Ossuaire',           res: 'os',       amt: [25, 50],   region: 0 },
  troupeau:    { name: 'Troupeau',           res: 'viande',   amt: [30, 55],   region: 0, harpoonOnly: true, moves: true },
  carcasse:    { name: 'Carcasse de titan',  res: 'os',       amt: [140, 220], region: 0, big: true },
  ruine:       { name: 'Ruine nomade',       res: 'recits',   amt: [20, 40],   region: 0 },
  arbre:       { name: 'Arbre fossile',      res: 'bois',     amt: [80, 140],  region: 1, big: true },
  resineux:    { name: 'Résineux',           res: 'resine',   amt: [30, 60],   region: 1 },
  affleurement:{ name: 'Affleurement de cuivre', res: 'cuivre', amt: [30, 60], region: 1 }
};
