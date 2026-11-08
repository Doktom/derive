// Rencontres de la route : petites décisions toutes les 4 à 6 minutes.
// cost et res sont multipliés par l'avancée (région) · fx : satiete, vigueur, growth, recits, res, timed, pact, offering, gamble.
// timed : { name, dur (secondes de jeu), mods } · gamble : { p, win: fx, lose: fx, winMsg, loseMsg }.
G.EVENTS = [
  { id: 'caravane', name: 'Une caravane accrochée au flanc', text: "Des nomades sans monture demandent à voyager quelques lieues sur le dos de la bête. Ils paient en histoires.", choices: [
    { label: 'Les nourrir', desc: 'Ils racontent tout ce qu\'ils savent.', cost: { vivres: 20 }, fx: { recits: 35 } },
    { label: 'Leur prendre leurs bâts', desc: 'Du bois et des cordes, et une mauvaise réputation.', fx: { res: { bois: 30, cordes: 12 }, timed: { name: 'Mauvaise réputation', dur: 200, mods: { recits: -0.3 } } } },
    { label: 'Passer son chemin', desc: 'Il y a déjà assez de monde ici.', fx: {} }
  ] },
  { id: 'sauterelles', name: 'Un nuage de sauterelles', text: "Le ciel grésille. L'essaim descend sur les prairies que la bête allait brouter.", choices: [
    { label: 'Charger à travers', desc: 'La bête se gave de sauterelles. Elle en est un peu malade.', fx: { satiete: 30, vigueur: -8 } },
    { label: 'Protéger les récoltes', desc: 'Toiles et fumée : on tient, mais on récolte moins.', cost: { cordes: 10 }, fx: { timed: { name: 'Toiles tendues', dur: 90, mods: { harvest: -0.15 } } } },
    { label: 'Laisser passer', desc: 'La bête a faim, et rien à manger pour un temps.', fx: { satiete: -25 } }
  ] },
  { id: 'mue', name: 'La mue', text: "Une plaque de vieille corne se détache du dos dans un craquement. C'est du bon matériau, mais la chair dessous est à vif.", choices: [
    { label: 'Tout ramasser', desc: 'Une aubaine pour les ateliers.', fx: { res: { os: 45, peau: 12 }, vigueur: -8 } },
    { label: 'Laisser repousser', desc: 'La bête met son énergie à grandir.', fx: { growth: 20 } }
  ] },
  { id: 'orage', name: 'Orage sec', text: "Des éclairs sans pluie courent à l'horizon. La bête hésite et piétine.", choices: [
    { label: 'La calmer', desc: 'Les conteurs chantent pour elle. Elle marche plus lentement.', fx: { timed: { name: 'Pas prudent', dur: 80, mods: { speed: -0.35 } } } },
    { label: 'La pousser', desc: 'Elle fonce, affolée, et s\'épuise.', fx: { vigueur: -6, timed: { name: 'Bête affolée', dur: 70, mods: { speed: 0.4, drain: 0.4 } } } }
  ] },
  { id: 'ancien', name: 'Le vieux conteur', text: "Un ancien prétend connaître la route jusqu'au bout. Il demande à manger, et un auditoire.", choices: [
    { label: 'Un banquet', desc: 'Toute la cité l\'écoute : les récits affluent.', cost: { vivres: 30 }, fx: { timed: { name: 'Veillées', dur: 200, mods: { recits: 0.6 } } } },
    { label: 'Une écuelle', desc: 'Il livre l\'essentiel.', cost: { vivres: 8 }, fx: { recits: 15 } },
    { label: 'Le faire taire', desc: 'Du travail attend tout le monde.', fx: {} }
  ] },
  { id: 'source', name: 'Une source chaude', text: "De l'eau fumante affleure sous les pattes. La bête s'arrête d'elle-même, les yeux mi-clos.", choices: [
    { label: 'La laisser boire', desc: 'Elle reprend des forces, mais repart lentement.', fx: { satiete: 20, vigueur: 15, timed: { name: 'Digestion', dur: 50, mods: { speed: -0.45 } } } },
    { label: 'Remplir les outres', desc: 'On emporte ce qu\'on peut.', fx: { res: { vivres: 25 } } }
  ] },
  { id: 'reve', name: 'Le rêve de la bête', text: "La nuit dernière, tout le dos a frémi au même rythme. Les anciens disent qu'il faut répondre au rêve.", choices: [
    { label: 'Rêve de croissance', desc: 'Croissance +60 %.', fx: { timed: { name: 'Rêve de croissance', dur: 200, mods: { growth: 0.6 } } } },
    { label: 'Rêve de moisson', desc: 'Récolte +25 %.', fx: { timed: { name: 'Rêve de moisson', dur: 200, mods: { harvest: 0.25 } } } },
    { label: 'Rêve de route', desc: 'Vitesse +25 % sans faim supplémentaire.', fx: { timed: { name: 'Rêve de route', dur: 140, mods: { speed: 0.25 } } } }
  ] },
  { id: 'fievre', name: 'La fièvre des porteurs', text: "Une toux court de tente en tente. Les porteurs traînent les pieds.", choices: [
    { label: 'Soigner', desc: 'Des vivres chauds pour tous.', cost: { vivres: 25 }, fx: {} },
    { label: 'Attendre que ça passe', desc: 'Porteurs 35 % plus lents un moment.', fx: { timed: { name: 'Fièvre', dur: 120, mods: { porterSpeed: -0.35 } } } }
  ] },
  { id: 'cavite', name: 'Une cavité dans la carcasse', text: "Les harponneurs ont percé une vieille côte de titan. Quelque chose brille au fond, et quelque chose grouille aussi.", choices: [
    { label: 'Y descendre', desc: 'Une chance sur deux : un trésor, ou une morsure.', fx: { gamble: { p: 0.55, win: { res: { outils: 22, peau: 15 } }, lose: { vigueur: -14 }, winMsg: 'Des outils anciens, intacts !', loseMsg: 'Ça mordait. La bête a tressailli.' } } },
    { label: 'Prendre ce qui dépasse', desc: 'Sans risque.', fx: { res: { os: 28 } } }
  ] },
  { id: 'oiseaux', name: 'Les pique-bœufs migrateurs', text: "Une nuée de cousins de Tic se pose sur la bête. Ils ont l'œil vif et l'appétit franc.", waves: true, choices: [
    { label: 'Les inviter', desc: 'Du fourrage contre leur aide : dégâts des défenses +35 %.', cost: { fourrage: 20 }, fx: { timed: { name: 'Nuée alliée', dur: 260, mods: { dmg: 0.35 } } } },
    { label: 'Les chasser', desc: 'Tic ne vous parle plus pendant une heure.', fx: {} }
  ] },
  { id: 'cartographe', name: 'La cartographe', text: "Une femme tatouée de routes propose un pacte qu'elle seule connaît. Son prix : tout ce que vous savez raconter.", choices: [
    { label: 'Payer en récits', desc: 'Un pacte de plus pour cette marche.', cost: { recits: 90 }, fx: { pact: true } },
    { label: 'Décliner', desc: 'Les récits se gardent.', fx: {} }
  ] },
  { id: 'offrande', name: 'Un autel de bord de route', text: "Trois pierres levées, une coupelle vide. La route attend quelque chose.", choices: [
    { label: 'Déposer du bronze de bête', desc: 'Des outils contre une offrande.', cost: { outils: 12 }, fx: { offering: true } },
    { label: 'Déposer des vivres', desc: 'Un geste modeste : la bête se sent mieux.', cost: { vivres: 12 }, fx: { vigueur: 8 } },
    { label: 'Ne rien déposer', desc: 'Les pierres ne disent rien.', fx: {} }
  ] }
];
G.EVENTS_BY = {};
for (const e of G.EVENTS) G.EVENTS_BY[e.id] = e;
G.EVENT_GAP = [240, 360];

// Mutations : chaque Colosse naît avec un caractère, tiré au sort.
G.MUTATIONS = {
  m_bosse:     { name: 'Bosse dorsale',    desc: "+2 vertèbres de naissance, mais faim +10 %.", startLen: 2, mods: { drain: 0.1 } },
  m_cicatrices:{ name: 'Vieilles cicatrices', desc: "6 cases mortes sur le dos, vigueur maximale +25.", scars: 6, mods: { vigMax: 25 } },
  m_veines:    { name: 'Sang épais',       desc: "Deux fois plus de veines sur le dos.", richVeins: true },
  m_pattes:    { name: 'Longues pattes',   desc: "Vitesse +15 %, mais portée des grues −0,5.", mods: { speed: 0.15, reach: -0.5 } },
  m_panse:     { name: 'Panse double',     desc: "Faim −15 %, mais croissance −15 %.", mods: { drain: -0.15, growth: -0.15 } },
  m_cuir:      { name: 'Cuir épais',       desc: "Les parasites drainent 40 % moins la vigueur.", mods: { tickDrain: -0.4 } },
  m_goulue:    { name: 'Goulue',           desc: "Croissance +40 %, mais faim +20 %.", mods: { growth: 0.4, drain: 0.2 } },
  m_calme:     { name: 'Tempérament calme', desc: "Porteurs 15 % plus rapides sur ce dos paisible.", mods: { porterSpeed: 0.15 } }
};

// Savoirs sans fin : recherches répétables, ouvertes par la technologie clé de chaque région.
G.INFINITE = {
  i_moisson:  { name: 'Mémoire des gestes',   cost: 70, desc: "Récolte +6 % par niveau.", mods: { harvest: 0.06 } },
  i_mue:      { name: 'Chant des vertèbres',  cost: 70, desc: "Croissance +8 % par niveau.", mods: { growth: 0.08 } },
  i_porteurs: { name: 'Pas de portage',       cost: 70, desc: "Porteurs +5 % de vitesse par niveau.", mods: { porterSpeed: 0.05 } },
  i_ateliers: { name: 'Tours de main',        cost: 80, desc: "Fabrication +5 % par niveau.", mods: { craft: 0.05 } },
  i_defense:  { name: 'Science des tiques',   cost: 80, desc: "Dégâts des défenses +6 % par niveau.", mods: { dmg: 0.06 }, waves: true }
};
G.INFINITE_GROW = 1.45;
