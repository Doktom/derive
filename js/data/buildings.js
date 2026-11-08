// Bâtiments (données pures). Débits exprimés par seconde au niveau 1.
// flank : uniquement sur une case de flanc (bord du dos) · tech : technologie requise · region : région minimale.
G.BUILD_CATEGORIES = [
  { id: 'recolte', name: 'Récolte' },
  { id: 'atelier', name: 'Ateliers' },
  { id: 'vie', name: 'Vie du dos' },
  { id: 'defense', name: 'Défense' }
];

G.BUILDINGS = {
  nuque: {
    name: 'Nuque', cat: 'base', unique: true, hp: 500, housing: 6,
    consume: { fourrage: 0.6 }, inCap: 40, porters: 3, charge: 3, store: true,
    desc: "Le cœur du village, posé sur la nuque du Colosse. On y apporte le fourrage qui nourrit la bête. Garde la réserve de départ et le butin."
  },
  grue: {
    name: 'Grue', cat: 'recolte', cost: { bois: 12, cordes: 4 }, jobs: 2, flank: true, hp: 120,
    harvest: { rate: 0.5, reach: 4 },
    desc: "Sur un flanc. Récolte en continu les gisements qui passent à portée (sauf les troupeaux)."
  },
  harpon: {
    name: 'Harpon', cat: 'recolte', cost: { bois: 15, os: 8, cordes: 6 }, jobs: 2, flank: true, hp: 120,
    harpoon: { reach: 7, cd: 9, take: 14, ammo: { cordes: 0.5 } },
    desc: "Sur un flanc. Longue portée : arrache un gros morceau toutes les 9 s. Seul moyen de chasser les troupeaux. Consomme des cordes."
  },
  corderie: {
    name: 'Corderie', cat: 'atelier', cost: { bois: 12, pierre: 6 }, jobs: 1, hp: 100,
    recipe: { in: { fourrage: 0.3 }, out: { cordes: 0.15 } },
    desc: "Tresse le fourrage en cordes."
  },
  fumoir: {
    name: 'Fumoir', cat: 'atelier', cost: { bois: 15, pierre: 10 }, jobs: 2, hp: 100,
    recipe: { in: { viande: 0.2, bois: 0.08 }, out: { vivres: 0.45 } },
    desc: "Fume la viande en vivres pour les habitants."
  },
  depeceur: {
    name: 'Écorcherie', cat: 'atelier', cost: { bois: 15, os: 10 }, jobs: 2, hp: 100, tech: 't_depecage',
    recipe: { in: { viande: 0.2 }, out: { peau: 0.12, vivres: 0.1 } },
    desc: "Tire des peaux (et un peu de vivres) de la viande."
  },
  atelier: {
    name: "Atelier d'os", cat: 'atelier', cost: { bois: 15, pierre: 15 }, jobs: 2, hp: 100, tech: 't_outils',
    recipe: { in: { os: 0.3, cordes: 0.08 }, out: { outils: 0.12 } },
    desc: "Taille les os en outils."
  },
  lanternier: {
    name: 'Lanternier', cat: 'atelier', cost: { bois: 20, pierre: 15, outils: 4 }, jobs: 2, hp: 100, tech: 't_resine', region: 1,
    recipe: { in: { resine: 0.2, os: 0.1 }, out: { lanternes: 0.1 } },
    desc: "Coule la résine dans des cages d'os : des lanternes."
  },
  forge: {
    name: 'Forge de cuivre', cat: 'atelier', cost: { pierre: 25, outils: 6 }, jobs: 2, hp: 140, tech: 't_cuivre', region: 1,
    recipe: { in: { cuivre: 0.25, bois: 0.15 }, out: { pointes: 0.12 } },
    desc: "Martèle le cuivre en pointes (munitions des balistes, passage du Col)."
  },
  tente: {
    name: 'Tente de peau', cat: 'vie', cost: { bois: 12, os: 4 }, hp: 90, housing: 4,
    consume: { vivres: 0.035 },
    desc: "Loge 4 habitants s'ils ont des vivres. Les niveaux demandent de la peau."
  },
  conteur: {
    name: 'Cercle des conteurs', cat: 'vie', cost: { bois: 10, os: 10 }, jobs: 2, hp: 90,
    recipe: { in: { vivres: 0.12 }, out: { recits: 0.18 } },
    desc: "Les anciens racontent : produit des récits, la monnaie de la recherche."
  },
  grenier: {
    name: 'Grenier de bât', cat: 'vie', cost: { bois: 20, pierre: 15 }, jobs: 1, hp: 150,
    store: true, storage: 150, porters: 4, charge: 4,
    desc: "Reçoit le surplus des bâtiments proches et ravitaille les alentours."
  },
  palissade: {
    name: 'Palissade', cat: 'defense', cost: { bois: 10, pierre: 10 }, hp: 320, tech: 't_lanceur', military: true, wall: true,
    desc: "Robuste : les parasites qui grimpent s'y attaquent en premier."
  },
  lanceur: {
    name: "Lanceur d'os", cat: 'defense', cost: { bois: 15, os: 10, cordes: 5 }, jobs: 1, hp: 120, tech: 't_lanceur', military: true,
    tower: { range: 3.5, dmg: 5, cd: 1.1, ammo: { os: 0.15 } },
    desc: "Projette des esquilles d'os sur les parasites. Consomme des os. +1 de portée sur l'échine."
  },
  epouilleurs: {
    name: 'Épouilleurs', cat: 'defense', cost: { bois: 20, peau: 10, outils: 5 }, jobs: 2, hp: 150, tech: 't_epouilleurs', military: true,
    consume: { vivres: 0.08 }, squad: 2,
    desc: "Une escouade qui chasse les parasites au corps à corps (2 + 1 par niveau)."
  },
  baliste: {
    name: 'Baliste', cat: 'defense', cost: { bois: 25, cuivre: 10, cordes: 10 }, jobs: 1, hp: 160, tech: 't_baliste', region: 1, military: true,
    tower: { range: 5.5, dmg: 16, cd: 2.2, ammo: { pointes: 0.2 } },
    desc: "Lourde et précise. Consomme des pointes de cuivre."
  }
};

// Logistique : porteurs et charge par défaut, vitesse en cases par seconde.
G.LOGI = { porters: 2, charge: 2, speed: 1.5, outSec: 40, inSec: 20, minOut: 12, minIn: 4, surplus: 0.4 };

// Niveaux : multiplicateurs par niveau au-delà du premier.
G.LEVELS = { prod: 0.75, jobs: 0.5, housing: 0.5, dmg: 0.4, hp: 0.25, storage: 0.75, costBase: 1.5, costGrow: 1.9 };
