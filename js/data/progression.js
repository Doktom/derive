// Progression : régions, carte de route, technologies, pactes, héritage, difficulté, menaces.

// Le Colosse (V0 : une seule espèce, la Carapace).
G.BEAST = {
  name: 'Carapace',
  maxHW: 5,            // demi-largeur maximale du dos (largeur 11)
  startLen: 12,        // longueur de départ (rangées)
  maxLen: 30,
  vigueur: 100,
  // Allures : vitesse (cases/s), faim (points de satiété perdus par s)
  paces: {
    halte: { name: 'Halte', speed: 0, drain: 0.18, regen: 0.35 },
    marche: { name: 'Marche', speed: 0.12, drain: 0.45, regen: 0.1 },
    galop: { name: 'Galop', speed: 0.28, drain: 1.15, regen: 0 }
  },
  fourragePts: 2,      // 1 fourrage = 2 points de satiété
  growthBase: 45,      // fourrage « en surplus » pour la première vertèbre
  growthMult: 1.22,
  shakeCd: 150         // s'ébrouer : recharge (s)
};

// Régions (la V0 en compte deux ; le Col des Murmures termine la marche en triomphe).
G.REGIONS = [
  {
    id: 'steppe', name: 'Steppe des Os', age: "Âge de l'Os", maxLevel: 3,
    ground: ['#dcc89d', '#cfb787', '#e6d6b0'], speck: '#b59a68',
    pool: { prairie: 4.5, broussailles: 4.5, rocher: 3, ossuaire: 2.5, troupeau: 2.6, carcasse: 0.25, ruine: 0.4 },
    pass: { name: 'Gué des Os blanchis', tech: 't_pistes', res: { outils: 60, peau: 80, cordes: 90 } }
  },
  {
    id: 'foret', name: 'Forêt fossile', age: 'Âge de la Résine', maxLevel: 4,
    ground: ['#b8ab82', '#a99a6f', '#c7bb93'], speck: '#7d7350',
    pool: { prairie: 4, arbre: 2.5, resineux: 3, affleurement: 3, rocher: 2, ossuaire: 1.5, troupeau: 2, carcasse: 0.25, ruine: 0.5 },
    pass: { name: 'Col des Murmures', tech: 't_col', res: { lanternes: 130, pointes: 150, outils: 160 }, final: true }
  }
];

// Carte de route : nœuds traversés (une « étape » = STEP_LEN cases parcourues).
G.STEP_LEN = 36;
G.ROUTE_LAYERS = 4; // étapes avant la passe
G.NODES = {
  depart:     { name: 'Départ',      icon: 'n_depart',  desc: "Terres ordinaires." },
  paturage:   { name: 'Pâturage',    icon: 'fourrage',  desc: "Prairies abondantes : la bête mange à sa faim.", mult: { prairie: 3 } },
  filon:      { name: 'Filon',       icon: 'pierre',    desc: "Rochers et affleurements.", mult: { rocher: 2.5, affleurement: 3 } },
  ossuaire:   { name: 'Ossuaire',    icon: 'os',        desc: "Un champ d'os, parfois des carcasses de titans.", mult: { ossuaire: 3, carcasse: 4 } },
  troupeaux:  { name: 'Troupeaux',   icon: 'viande',    desc: "Des hardes à harponner.", mult: { troupeau: 3.5 } },
  ruines:     { name: 'Ruines',      icon: 'recits',    desc: "Anciens campements nomades : des récits à récolter.", mult: { ruine: 6 }, enterRecits: 30 },
  bosquets:   { name: 'Bosquets',    icon: 'bois',      desc: "Bois et résine.", mult: { broussailles: 3, arbre: 3, resineux: 2.5 } },
  nid:        { name: 'Nid',         icon: 'n_nid',     desc: "Un nid de parasites. Gisements riches, attaque immédiate d'un chef, offrande à la clé.", dense: 1.6, nest: true },
  oasis:      { name: 'Oasis',       icon: 'n_oasis',   desc: "Repos : la bête guérit 4× plus vite, pas d'attaque, peu de gisements.", dense: 0.6, mult: { prairie: 2 }, oasis: true },
  sanctuaire: { name: 'Sanctuaire',  icon: 'n_pacte',   desc: "Un pacte à choisir (1 parmi 3).", pact: true },
  caravane:   { name: 'Caravane',    icon: 'n_caravane',desc: "Un autre Colosse croise la route : marché ouvert pendant l'étape.", market: true },
  passe:      { name: 'Passe',       icon: 'n_passe',   desc: "La sortie de la région. La bête y piétine jusqu'au passage." }
};
G.NODE_POOL = { paturage: 3, filon: 2, ossuaire: 2, troupeaux: 2, ruines: 1.5, bosquets: 1.5, nid: 1.2, oasis: 1, sanctuaire: 1.2, caravane: 1 };

// Technologies (coût en récits).
G.TECHS = {
  t_depecage:  { name: 'Dépeçage',            region: 0, cost: 20, desc: "Écorcherie ; niveaux des tentes." },
  t_lanceur:   { name: 'Balistique des os',   region: 0, cost: 15, desc: "Lanceurs d'os et palissades." },
  t_outils:    { name: "Taille de l'os",      region: 0, cost: 35, desc: "Atelier d'os : outils." },
  t_vertebres: { name: 'Chant de croissance', region: 0, cost: 40, desc: "Croissance du Colosse +30 %.", mods: { growth: 0.3 } },
  t_bras:      { name: 'Longs bras',          region: 0, cost: 55, req: ['t_outils'], desc: "Grues et harpons : portée +1.", mods: { reach: 1 } },
  t_epouilleurs:{ name: 'Épouillage',         region: 0, cost: 50, req: ['t_lanceur', 't_depecage'], desc: "Escouades d'épouilleurs." },
  t_porteurs:  { name: 'Sangles de portage',  region: 0, cost: 45, desc: "Charge des porteurs +50 %.", mods: { charge: 0.5 } },
  t_pistes:    { name: 'Lecture des pistes',  region: 0, cost: 90, req: ['t_outils'], key: true, desc: "⭐ Permet de franchir le gué vers la Forêt fossile." },
  t_resine:    { name: 'Résine et flamme',    region: 1, cost: 70, desc: "Lanternier : lanternes." },
  t_cuivre:    { name: 'Cuivre martelé',      region: 1, cost: 80, desc: "Forge de cuivre : pointes." },
  t_baliste:   { name: 'Balistes',            region: 1, cost: 100, req: ['t_cuivre'], desc: "Balistes à pointes de cuivre." },
  t_galop:     { name: 'Souffle long',        region: 1, cost: 90, desc: "Le galop affame 30 % moins.", mods: { gallopDrain: -0.3 } },
  t_maitres:   { name: "Maîtres d'œuvre",     region: 1, cost: 110, desc: "Niveau maximal des bâtiments +1.", mods: { maxLevel: 1 } },
  t_moisson:   { name: 'Moisson au vol',      region: 1, cost: 120, req: ['t_resine'], desc: "Récolte des grues +25 %.", mods: { harvest: 0.25 } },
  t_col:       { name: 'Chant du Col',        region: 1, cost: 220, req: ['t_resine', 't_cuivre'], key: true, desc: "⭐ Permet de franchir le Col des Murmures : fin de la marche en triomphe." }
};

// Pactes (choix majeur : au départ et dans les sanctuaires). risky : effet double tranchant.
G.PACTS = {
  p_paslourd: { name: 'Pacte du Pas lourd',  desc: "Faim de la bête −25 %, vitesse −15 %.", mods: { drain: -0.25, speed: -0.15 } },
  p_bras:     { name: 'Pacte des Longs bras', desc: "Portée des grues et harpons +1.", mods: { reach: 1 } },
  p_festin:   { name: 'Pacte du Festin',     desc: "Tentes : +1 habitant, mais vivres consommés +20 %.", mods: { tentPop: 1, vivresUse: 0.2 } },
  p_contes:   { name: 'Pacte des Conteurs',  desc: "Récits +40 %.", mods: { recits: 0.4 } },
  p_corne:    { name: 'Pacte de la Corne',   desc: "Dégâts des défenses +35 %.", mods: { dmg: 0.35 } },
  p_vent:     { name: 'Pacte du Vent',       desc: "Vitesse +25 %, mais faim +15 %.", risky: true, mods: { speed: 0.25, drain: 0.15 } },
  p_os:       { name: "Pacte de l'Os",       desc: "Ossuaires et carcasses deux fois plus fréquents.", mods: { dens_ossuaire: 1, dens_carcasse: 1 } },
  p_porteurs: { name: 'Pacte des Porteurs',  desc: "+1 porteur par bâtiment.", mods: { porters: 1 } },
  p_mue:      { name: 'Pacte de la Mue',     desc: "Croissance +50 %, mais vigueur maximale −20 %.", risky: true, mods: { growth: 0.5, vigMax: -20 } },
  p_moisson:  { name: 'Pacte de la Moisson', desc: "Récolte +20 %, mais fabrication −10 %.", risky: true, mods: { harvest: 0.2, craft: -0.1 } }
};

// Offrandes (choix mineur, cumulables) : après un nid.
G.OFFERINGS = {
  o_recolte: { name: 'Gerbe tressée',    desc: "Récolte +10 %.", mods: { harvest: 0.1 } },
  o_vivres:  { name: 'Sel du nid',       desc: "Vivres produits +15 %.", mods: { vivres: 0.15 } },
  o_vigueur: { name: 'Sève de titan',    desc: "Vigueur maximale +15 et soins complets.", mods: { vigMax: 15 }, heal: true },
  o_recits:  { name: 'Carnet de route',  desc: "+40 récits immédiatement.", recits: 40 },
  o_pas:     { name: 'Semelles de corne',desc: "Porteurs 10 % plus rapides.", mods: { porterSpeed: 0.1 } },
  o_croit:   { name: 'Moelle épaisse',   desc: "Croissance +20 %.", mods: { growth: 0.2 } },
  o_dmg:     { name: 'Venin retourné',   desc: "Dégâts des défenses +15 %.", mods: { dmg: 0.15 } }
};

// Mémoire du troupeau (méta-progression, coûts en points de mémoire).
G.HERITAGE = {
  h_grues:    { name: 'Grues ancestrales', max: 5, cost: 4, grow: 1.6, desc: "Récolte +10 % par niveau.", mods: { harvest: 0.1 } },
  h_porteurs: { name: 'Porteurs agiles',   max: 5, cost: 4, grow: 1.6, desc: "Porteurs +10 % de vitesse par niveau.", mods: { porterSpeed: 0.1 } },
  h_panse:    { name: 'Panse profonde',    max: 4, cost: 6, grow: 1.7, desc: "Faim de la bête −8 % par niveau.", mods: { drain: -0.08 } },
  h_contes:   { name: 'Contes anciens',    max: 4, cost: 5, grow: 1.6, desc: "+25 récits au départ par niveau.", start: { recits: 25 } },
  h_reserves: { name: 'Bâts garnis',       max: 3, cost: 6, grow: 1.8, desc: "Réserve de départ +40 % par niveau.", startMult: 0.4 },
  h_echine:   { name: 'Échine longue',     max: 3, cost: 8, grow: 1.9, desc: "Le Colosse naît avec 1 vertèbre de plus par niveau.", startLen: 1 },
  h_augure:   { name: 'Augure',            max: 1, cost: 15, grow: 1, desc: "Un 4ᵉ pacte proposé à chaque choix.", pactChoices: 1 }
};

// Difficulté. waves : attaques de parasites. mem : multiplicateur de mémoire gagnée.
G.RIGUEUR = [
  { name: 'Paisible', waves: false, mem: 0.75, desc: "Aucune attaque. Les bâtiments militaires sont masqués." },
  { name: 'Rude', waves: true, mem: 1.25, desc: "Des parasites grimpent sur la bête." },
  { name: 'Sauvage', waves: true, mem: 1.7, hpMult: 1.8, desc: "Parasites plus nombreux et plus robustes." }
];

// Menaces.
G.WAVES = { first: 420, interval: 170, warn: 30, flee: 75 };
G.ENEMIES = {
  tique:  { name: 'Tique géante', hp: 14, dmg: 3, speed: 0.6, drain: 0.03, size: 0.32 },
  chef:   { name: 'Reine-tique',  hp: 120, dmg: 9, speed: 0.45, drain: 0.15, size: 0.6, boss: true }
};
G.SOLDIER = { hp: 30, dmg: 4, speed: 1.4, aggro: 4, respawn: 20 };

// Marché des caravanes : valeur indicative de chaque ressource.
G.VALUES = { fourrage: 1, bois: 1.2, pierre: 1.2, os: 1.5, viande: 2, vivres: 2, cordes: 3, peau: 4, outils: 6, resine: 3, cuivre: 3, lanternes: 9, pointes: 9 };
