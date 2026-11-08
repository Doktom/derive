// La saga : ce que le Colosse rêve pendant qu'il marche. Données pures (texte et bonus).
// Elle continue d'une bête à l'autre : les songes vus, les Voix et les compagnons sont gardés dans la méta.
// cond : time (s de cette marche), L, region, runs (marches achevées), endings (fins déjà vues), after (songe vu).
// voix : la Voix qui grandit avec ce choix · recruit : compagnon qui rejoint le Veilleur · comp : compagnon qui gagne un niveau.

G.VOIX = {
  os: { name: "La Voix d'Os", short: 'Os', motto: 'Ce qui se souvient', icon: 'os_v', color: '#b8a67c',
    per: { craft: 0.02, dmg: 0.02 }, perText: 'Fabrication +2 %, dégâts +2 %',
    dons: [
      { at: 3, name: 'Ossature', desc: 'Vigueur maximale +15.', mods: { vigMax: 15 } },
      { at: 6, name: 'La patience des morts', desc: 'Cadence maximale +10 %.', mods: { cadence: 0.1 } },
      { at: 9, name: 'Reliques', desc: 'Niveau maximal des bâtiments +1.', mods: { maxLevel: 1 } }
    ] },
  chair: { name: 'La Voix de Chair', short: 'Chair', motto: 'Ce qui a faim', icon: 'chair_v', color: '#c0533f',
    per: { harvest: 0.02, growth: 0.03 }, perText: 'Récolte +2 %, croissance +3 %',
    dons: [
      { at: 3, name: 'Panse des anciens', desc: 'Faim de la bête −10 %.', mods: { drain: -0.1 } },
      { at: 6, name: 'Bras tendus', desc: 'Portée des grues et harpons +0,5.', mods: { reach: 0.5 } },
      { at: 9, name: 'La faim sacrée', desc: 'Vitesse de la bête +15 %.', mods: { speed: 0.15 } }
    ] },
  brume: { name: 'La Voix de Brume', short: 'Brume', motto: 'Ce qui invente', icon: 'brume_v', color: '#8b6db5',
    per: { recits: 0.03, porterSpeed: 0.02 }, perText: 'Récits +3 %, vitesse des porteurs +2 %',
    dons: [
      { at: 3, name: 'Sentiers de fumée', desc: 'Charge des porteurs +25 %.', mods: { charge: 0.25 } },
      { at: 6, name: "Porteurs d'ombre", desc: '+1 porteur par bâtiment.', mods: { porters: 1 } },
      { at: 9, name: 'Maisons de brume', desc: 'Tentes : +1 habitant.', mods: { tentPop: 1 } }
    ] }
};

G.COMPANIONS = {
  hesper: { name: "Hesper l'Aveugle", cls: 'Conteur', perText: 'Récits +6 % par niveau', per: { recits: 0.06 },
    lore: "Il raconte la même histoire depuis avant le premier pas. Il dit qu'elle n'est pas finie. Il dit aussi qu'elle n'a pas commencé." },
  oriane: { name: 'Oriane Sans-Ombre', cls: 'Porteuse', perText: 'Vitesse et charge des porteurs +5 % par niveau', per: { porterSpeed: 0.05, charge: 0.05 },
    lore: "Elle porte un paquet qu'elle n'a jamais posé. Son ombre, elle l'a laissée en gage quelque part, contre un chemin." },
  ioun: { name: "Ioun l'Enfant-Os", cls: 'Artisan', perText: 'Fabrication +4 %, cadence maximale +2 % par niveau', per: { craft: 0.04, cadence: 0.02 },
    lore: "Il taille dans les côtes les noms de ceux qui ne sont pas encore nés. Il ne s'est encore jamais trompé d'orthographe." },
  ambre: { name: 'Sœur Ambre', cls: 'Guérisseuse', perText: 'Vigueur maximale +6, faim −2 % par niveau', per: { vigMax: 6, drain: -0.02 },
    lore: "Elle verse de la résine sur les plaies et sur les mourants. « Je ne soigne pas, dit-elle. Je retarde. »" },
  kae: { name: 'Kaë Lune-Basse', cls: 'Harponneuse', perText: 'Récolte +5 % par niveau', per: { harvest: 0.05 },
    lore: "Une nuit, elle a harponné la lune. Elle tient toujours la corde. Elle dit que quelque chose, là-haut, tire encore." },
  noye: { name: 'Le Noyé', cls: 'Revenant', perText: 'Dégâts +8 %, drain des parasites −5 % par niveau', per: { dmg: 0.08, tickDrain: -0.05 },
    lore: "Il s'est noyé dans le sable sec, de l'autre côté du Col, et il en est revenu. Il goutte encore, un peu, quand il croit qu'on ne regarde pas." }
};

G.SAGA_BOOKS = ['Livre I · La bête qui dort', 'Livre II · Les morts du dos', 'Livre III · La Brume', 'Livre IV · Le Col', 'Livre V · Ceux qui reviennent'];

G.SONGES = [
  // ---- Livre I ----
  { id: 's01', book: 0, title: 'Le dos respire', cond: { time: 100 }, text: [
    "Tu t'endors sur les plaques tièdes, l'oreille contre la corne. Personne ne t'a dit que c'était ta nuit de veille. Personne ne le dit jamais.",
    "Dans le rêve, tu marches sur un dos sans bête dessous : une longue échine posée sur rien, qui ondule jusqu'à l'horizon. Une voix compte. Elle en est à un nombre qui n'a pas encore de nom."
  ], choices: [
    { label: 'Compter avec elle', voix: 'os', desc: 'Tu apprends le nombre.', after: "Tu comptes. Au matin tes lèvres sont sèches, et tu sais sans savoir comment combien de pas ont fait les morts." },
    { label: 'Chercher ce qui a faim', voix: 'chair', desc: 'Tu poses la main sur le dos.', after: "Sous ta paume, quelque chose avale, lentement, à l'échelle d'un siècle. Tu te réveilles avec un goût d'herbe." },
    { label: 'Regarder où va le dos', voix: 'brume', desc: "Tu marches jusqu'au bord.", after: "Il n'y a pas de bord. Il y a seulement l'endroit où tu cesses d'y croire. Tu t'y arrêtes, et le jour se lève." }
  ] },
  { id: 's02', book: 0, title: 'Ce que Tic ne dit pas', cond: { after: 's01', time: 300 }, text: [
    "Tic est perché sur ta poitrine. Il est grand comme une tente, et ses yeux sont des lanternes éteintes depuis longtemps.",
    "« Trois Colosses, j'ai dit. Tu m'as cru. C'est gentil. » Il lisse une plume de la longueur d'un harpon. « Pose-moi une question, Veilleur. Une seule. Je mentirai moins que d'habitude. »"
  ], choices: [
    { label: 'Combien de Colosses, vraiment ?', voix: 'os', desc: 'Le compte exact.', after: "« Neuf, je les ai enterrés. Enfin : je les ai regardés se coucher, et le monde s'est refermé dessus. Le dixième, tu es dessus. Ne le répète pas, il dort mal. »" },
    { label: 'Que manges-tu vraiment ?', voix: 'chair', desc: 'Il vit de tiques, dit-il.', after: "Il rit, et son rire sent la fumée. « Ce qu'elle oublie. Il faut bien que quelqu'un le mange. »" },
    { label: 'Qui t\'a envoyé ?', voix: 'brume', desc: 'On ne devient pas Tic par hasard.', after: "Il penche la tête d'un côté, puis de l'autre, puis d'un troisième. « Bonne question. Reviens quand tu auras oublié pourquoi tu l'as posée. »" }
  ] },
  { id: 's03', book: 0, title: "L'homme qui racontait avant le premier pas", cond: { after: 's02', time: 550 }, comp: 'hesper', text: [
    "Il y a un feu dans le rêve, et un vieillard aux yeux cousus qui parle à des gens qui ne sont pas là.",
    "« …et la bête se leva, parce que quelqu'un avait dit son nom. Assieds-toi, tu arrives au bon moment : tu arrives toujours au bon moment, c'est ton défaut. » Il tend une écuelle vide. « Je m'appelle Hesper. Je n'ai plus d'auditoire. Mais j'ai encore la fin. »"
  ], choices: [
    { label: "L'écouter jusqu'à l'aube", voix: 'os', recruit: 'hesper', desc: 'Il vient avec toi.', after: "Quand tu te réveilles, un vieil homme que personne ne connaît est assis près du feu des conteurs. Tout le monde jure qu'il a toujours été là." },
    { label: "Remplir son écuelle", voix: 'chair', recruit: 'hesper', desc: 'Les histoires ont faim aussi.', after: "Tu y verses ce que tu as : un souvenir de pain. Il le mange lentement. Au matin, il est parmi vous, et il a l'air d'avoir bien dîné." },
    { label: 'Lui demander la fin', voix: 'brume', recruit: 'hesper', desc: 'Il a dit qu\'il l\'avait.', after: "« La fin ? Mais tu me l'as racontée toi-même. » Il sourit dans ta direction exacte. Au réveil, il est là, et il refuse d'en dire plus." }
  ] },
  { id: 's04', book: 0, title: 'La tique blanche', cond: { after: 's03', time: 800 }, text: [
    "Une tique sans couleur traverse ton rêve en silence. Là où elle passe, les mots s'effacent : le nom de ta mère, l'odeur de la première tente, le mot qui voulait dire « demain ».",
    "Tu comprends d'un coup ce que grimpent les parasites sur les flancs. Ils ne viennent pas boire le sang de la bête. Ils viennent boire ce qu'elle se rappelle."
  ], choices: [
    { label: 'L\'écraser', voix: 'chair', desc: 'Peu importe ce qu\'elle a déjà bu.', after: "Elle éclate sans bruit. Il en sort, en bruine, un paysage que personne ne reverra. Tu t'essuies la main sur ta tunique et, au réveil, la tache est encore là." },
    { label: 'Répéter tes noms à voix haute', voix: 'os', desc: 'Pour qu\'il en reste.', after: "Tu les dis tous, un par un, jusqu'à ce qu'ils ne veuillent plus rien dire. Mais ils restent. C'est peut-être ça, se souvenir." },
    { label: 'La suivre', voix: 'brume', desc: 'Elle sait où est l\'oubli.', after: "Elle te mène à un endroit très doux, et tu ne sauras jamais dire lequel. Tu te réveilles soulagé d'une chose dont tu ignores le nom." }
  ] },
  { id: 's05', book: 0, title: 'La porteuse sans ombre', cond: { after: 's04', time: 1100 }, comp: 'oriane', text: [
    "Une femme traverse le rêve, chargée d'un paquet ficelé. Sous le soleil du rêve, elle ne fait pas d'ombre.",
    "« J'ai promis de le livrer. C'était avant que les chemins aient des noms. » Elle ne ralentit pas. « Si tu veux me parler, marche. Tout le monde marche, ici. Certains ne le savent juste pas. »"
  ], choices: [
    { label: 'Porter un coin du paquet', voix: 'chair', recruit: 'oriane', desc: 'Il pèse le poids d\'une maison.', after: "Tes bras tremblent encore au matin. Sur le dos du Colosse, une porteuse inconnue règle ses sangles. Le soleil passe à travers elle." },
    { label: 'Demander ce qu\'il contient', voix: 'brume', recruit: 'oriane', desc: 'Elle ne l\'a jamais ouvert.', after: "« Si je savais, je pourrais le poser. » Au réveil, elle est là, à la Nuque, et les porteurs s'écartent devant elle sans savoir pourquoi." },
    { label: 'Lui rendre son ombre', voix: 'os', recruit: 'oriane', desc: 'Tu en as une de trop, cette nuit.', after: "Tu lui offres la tienne pour une nuit. Elle la rend au matin, soigneusement pliée, un peu plus longue qu'avant." }
  ] },

  // ---- Livre II ----
  { id: 's06', book: 1, title: 'La porte sous les plaques', cond: { after: 's05', L: 15 }, text: [
    "Une plaque du dos se soulève, comme une paupière. Dessous, un escalier taillé dans la chair durcie.",
    "Il y a des maisons là-dessous. Des rues. Des écuelles encore posées. Une ville entière, tassée sous la tienne, bâtie par des gens qui croyaient comme toi être les premiers."
  ], choices: [
    { label: 'Lire les noms sur les portes', voix: 'os', desc: 'Quelqu\'un doit le faire.', after: "Tu en lis quatre mille. Le dernier est le tien, d'une écriture un peu plus ancienne.", fx: { recits: 25 } },
    { label: 'Prendre ce qui peut servir', voix: 'chair', desc: 'Les morts ne construisent plus.', after: "Tu remontes les bras pleins. Au matin, il y a du matériel dans la réserve, et personne n'ose demander d'où il vient.", fx: { res: { os: 30, outils: 6 } } },
    { label: 'Refermer doucement', voix: 'brume', desc: 'Certaines villes dorment aussi.', after: "Tu reposes la plaque. Elle pousse un soupir que tu sens jusque dans tes dents, et tout le dos se détend d'un seul coup.", fx: { vigueur: 15 } }
  ] },
  { id: 's07', book: 1, title: "L'enfant qui grave", cond: { after: 's06', time: 300 }, comp: 'ioun', text: [
    "Un enfant est assis à l'intérieur d'une côte immense et grave, la langue entre les dents. Il ne lève pas les yeux.",
    "« Tu t'écris avec deux L, ou c'est les autres qui se trompent ? » Tu regardes par-dessus son épaule : c'est ton nom. Et, dessous, une date qui n'existe pas encore."
  ], choices: [
    { label: 'Corriger l\'orthographe', voix: 'os', recruit: 'ioun', desc: 'Autant que ce soit juste.', after: "Il hoche la tête, très sérieux, et souffle sur la poussière d'os. Au réveil, il y a un enfant à l'atelier. Il ne mange pas, mais il réclame des ciseaux." },
    { label: 'Lui prendre le ciseau', voix: 'chair', recruit: 'ioun', desc: 'Personne ne décide à ta place.', after: "Il te laisse faire et il regarde, amusé, ta main graver exactement ce qu'il allait graver. Au matin, il est là, et il t'appelle « grand frère »." },
    { label: 'Lire les noms suivants', voix: 'brume', recruit: 'ioun', desc: 'Qui vient après toi ?', after: "La côte s'allonge dans le noir, et les noms continuent. Le dernier est écrit en très petit. L'enfant pose un doigt dessus. « Pas encore. » Il te suit au réveil." }
  ] },
  { id: 's08', book: 1, title: 'La berceuse du cœur', cond: { after: 's07', time: 600 }, text: [
    "Tu descends jusqu'au cœur. Il bat, lent comme une saison. En l'écoutant longtemps, tu découvres qu'il ne bat pas : on le berce.",
    "Il y a une mélodie. Quelqu'un la chante à la bête, depuis si loin que le son met des années à arriver. Quelqu'un veut qu'elle continue à dormir."
  ], choices: [
    { label: 'Chanter avec', voix: 'brume', desc: 'Pour que la nuit tienne.', after: "Ta voix se perd dans l'autre. Le lendemain, tout le monde sur le dos fredonne un air que personne ne se souvient d'avoir appris." },
    { label: 'Couvrir le chant', voix: 'chair', desc: 'Et si elle se réveillait ?', after: "Tu cries. Le cœur manque un battement. Quelque part, très loin, le chant hésite, puis reprend, plus attentif. On t'a entendu." },
    { label: 'Apprendre l\'air par cœur', voix: 'os', desc: 'Tu en auras besoin.', after: "Tu le retiens note après note. Il compte exactement autant de notes que la voix comptait de pas, la première nuit." }
  ] },
  { id: 's09', book: 1, title: "Celle qui retarde", cond: { after: 's08', time: 1000 }, comp: 'ambre', text: [
    "Une femme verse de la résine sur un homme allongé. Il sourit, figé, pris dans l'or. Autour d'elle, ils sont des centaines, debout dans la pénombre, translucides, chacun arrêté une seconde avant la fin.",
    "« Je ne soigne pas, dit-elle sans se retourner. Je retarde. Tu viens pour quelqu'un ? Tout le monde vient pour quelqu'un. »"
  ], choices: [
    { label: 'Nommer quelqu\'un', voix: 'os', recruit: 'ambre', desc: 'Il y a toujours un nom.', after: "Elle le trouve, tout au fond, et elle ne dit rien. Au matin, une sœur aux mains dorées panse les flancs de la bête." },
    { label: 'Briser une statue', voix: 'chair', recruit: 'ambre', desc: 'Les laisser finir.', after: "L'ambre cède, et l'homme termine enfin son souffle. Elle te regarde longtemps. « Bon. Il faudra quelqu'un pour me contredire. » Elle te suit au réveil." },
    { label: 'Te laisser verser un peu d\'ambre', voix: 'brume', recruit: 'ambre', desc: 'Juste sur un instant.', after: "Elle fige pour toi un seul après-midi, que tu pourras garder. Quand tu ouvres les yeux, elle est là, et la résine sent le dimanche." }
  ] },

  // ---- Livre III ----
  { id: 's10', book: 2, title: 'Les doigts de la forêt', cond: { after: 's09', region: 1 }, text: [
    "Les arbres fossiles te regardent passer. En rêve, tu vois ce qu'ils sont : cinq par cinq, recourbés, plantés dans le sol. Pas des arbres.",
    "Une main. Des milliers de mains, sorties de terre, qui se sont arrêtées au moment de saisir quelque chose. Tu lèves les yeux vers ce qu'elles cherchaient à attraper. C'est le dos du Colosse."
  ], choices: [
    { label: 'Compter les doigts', voix: 'os', desc: 'Combien étaient-ils ?', after: "Autant que de morts dans la ville d'en dessous. Tu refais le compte deux fois, en espérant te tromper.", fx: { recits: 30 } },
    { label: 'Leur tendre la main', voix: 'brume', desc: 'Peut-être qu\'ils voulaient monter.', after: "Quelque chose se referme, très doucement, autour de ton poignet, et te lâche. Il y a de la résine sur ta manche au réveil.", fx: { res: { resine: 20 } } },
    { label: 'Les couper', voix: 'chair', desc: 'Du bois, c\'est du bois.', after: "Ils ne saignent pas. Ils soupirent. Les grues ramènent plus de bois que d'habitude et les ouvriers ne chantent pas.", fx: { res: { bois: 60 } } }
  ] },
  { id: 's11', book: 2, title: 'La corde tendue vers la lune', cond: { after: 's10', time: 300 }, comp: 'kae', text: [
    "Sur le plus haut harpon se tient une femme, les talons calés, une corde tendue à se rompre qui monte droit dans le ciel.",
    "« Elle est lourde cette nuit, grogne-t-elle. Attrape, tu seras utile. » Tu saisis la corde. À l'autre bout, très loin, quelque chose cligne."
  ], choices: [
    { label: 'Tirer de toutes tes forces', voix: 'chair', recruit: 'kae', desc: 'On verra bien ce qui descend.', after: "La lune se rapproche d'un doigt, et tous les chiens du monde se taisent. Kaë éclate de rire. Au réveil elle est sur un flanc, et elle a déjà graissé les poulies." },
    { label: 'Couper la corde', voix: 'brume', recruit: 'kae', desc: 'Laisser partir ce qui regarde.', after: "Elle te fixe, furieuse, puis soulagée. « Cent ans que je n'osais pas. » Elle saute du rêve au matin, atterrit sur le dos, et réclame une nouvelle corde." },
    { label: 'Faire un nœud', voix: 'os', recruit: 'kae', desc: 'Que ça tienne, tout simplement.', after: "Un nœud de porteur, tout simple. La corde cesse de vibrer. « Enfin quelqu'un de sérieux », dit-elle, et elle te suit." }
  ] },
  { id: 's12', book: 2, title: 'La couleur du monde', cond: { after: 's11', time: 700 }, text: [
    "Tu prends une poignée de terre ocre et tu la goûtes, parce que dans les rêves on goûte.",
    "C'est du sang. Séché depuis des âges, tamisé par le vent, étalé jusqu'aux montagnes. Le Monde Ocre n'est pas une terre sur laquelle marchent les Colosses. C'est la peau d'une plus grande, qui s'est couchée la première, et qui rêve qu'ils marchent."
  ], choices: [
    { label: 'Lui demander pardon', voix: 'os', desc: 'Pour les grues, les harpons, tout.', after: "Rien ne répond. C'est encore pire que tout ce qu'elle aurait pu dire." },
    { label: 'Mordre plus fort', voix: 'chair', desc: 'Tout ce qui vit mange quelque chose.', after: "Tu avales. Tu n'as jamais eu aussi faim, ni été aussi sûr d'être vivant." },
    { label: 'Te demander qui tu es, alors', voix: 'brume', desc: 'Si tout ceci est rêvé.', after: "Tu poses la question à voix haute. Très loin, sous tes pieds, quelque chose se retourne dans son sommeil." }
  ] },
  { id: 's13', book: 2, title: 'La confession du pique-bœuf', cond: { after: 's12', time: 1100 }, text: [
    "Tic n'est plus un oiseau. Il est une tache de vieille lumière posée sur le front de la bête, qui ne cligne jamais.",
    "« Je ne vis pas sur elle. Je la surveille. Je suis la dernière chose qu'a pensée la Première avant de s'endormir : \"Que quelqu'un reste, et qu'il parle sans arrêt, pour que je n'entende pas le silence.\" Voilà. Maintenant tu sais pourquoi je suis si pénible. »"
  ], choices: [
    { label: 'Le remercier', voix: 'os', desc: 'Neuf bêtes, c\'est long.', after: "Personne ne l'avait jamais fait. Il ne dit rien pendant presque une minute. Au matin, il se plaint du temps, mais moins fort." },
    { label: 'Lui demander de se taire', voix: 'chair', desc: 'Juste pour entendre.', after: "Il se tait. Le silence arrive, immense, et tout ton corps supplie qu'il recommence. Il reprend, et il ne se moque même pas de toi." },
    { label: 'Lui proposer de parler à sa place', voix: 'brume', desc: 'Il doit être fatigué.', after: "« Pas encore, dit-il. Mais retiens ce que tu viens de dire. Tu me le rediras au Col. »" }
  ] },

  // ---- Livre IV ----
  { id: 's14', book: 3, title: 'Le noyé du sable sec', cond: { after: 's13', region: 1, time: 300 }, comp: 'noye', text: [
    "Un homme ruisselant est assis sur la dune la plus sèche du monde. L'eau coule de ses manches et ne touche jamais le sol.",
    "« Je l'ai passé, ton Col. On ne le passe pas. On arrive de l'autre côté, on se retourne, et c'est ici. Tu ne voulais pas le savoir, je suppose. Tu n'aurais pas un peu de sable ? J'ai encore soif. »"
  ], choices: [
    { label: 'Lui donner du sable', voix: 'chair', recruit: 'noye', desc: 'Il a soif, c\'est tout.', after: "Il boit la poignée à petites gorgées. Il a l'air d'aller mieux. Au réveil, il y a une flaque près des épouilleurs, et les tiques la contournent." },
    { label: 'Lui demander ce qu\'il y a vu', voix: 'brume', recruit: 'noye', desc: 'De l\'autre côté.', after: "« Toi. Plusieurs fois. Tu étais très occupé. » Il se lève, trempé, et il te suit sans demander la permission." },
    { label: 'Lui demander son nom', voix: 'os', recruit: 'noye', desc: 'Il a dû en avoir un.', after: "Il réfléchit très longtemps. De l'eau lui monte aux yeux. « Merci », dit-il, et il n'en dit pas plus. Il reste." }
  ] },
  { id: 's15', book: 3, title: 'Les Murmures', cond: { after: 's14', time: 800 }, text: [
    "Le vent du Col arrive jusqu'à toi. Il est fait de voix. Elles disent des choses simples : « Plus de cordes à gauche », « Le fumoir est plein », « Elle a faim. Du fourrage à la Nuque ».",
    "Tu reconnais l'accent. Tu reconnais les hésitations. Chaque Veilleur qui a tenu ce dos avant toi est encore là, à répéter ses derniers ordres dans le vent. Et toutes ces voix sont la tienne."
  ], choices: [
    { label: 'Leur répondre', voix: 'os', desc: 'Ils ont bien travaillé.', after: "Tu leur dis que le fumoir a été vidé, que les cordes sont arrivées. Le vent tombe un peu, comme une épaule qui se relâche." },
    { label: 'Couvrir leurs voix', voix: 'chair', desc: 'Cette fois sera différente.', after: "Tu donnes tes propres ordres, plus fort. Ils ressemblent aux leurs. Tu les donnes quand même." },
    { label: 'Écouter ce qu\'ils taisent', voix: 'brume', desc: 'Entre deux ordres.', after: "Entre deux ordres, il y a un souffle. Dans le souffle, une question. Personne, jamais, n'a osé la poser au Col." }
  ] },
  { id: 's16', book: 3, title: 'La veille du Col', cond: { after: 's15', time: 1400 }, text: [
    "Cette nuit tout le monde rêve la même chose, même les porteurs, même les tiques. Hesper a cessé de raconter. Tic s'est tu.",
    "Devant la bête, le Col ressemble à la commissure d'une bouche entrouverte. Quelque chose attend que tu dises quelque chose, comme toujours, depuis toujours. Tu as encore une nuit pour choisir ta voix."
  ], choices: [
    { label: 'Te rappeler tous les noms', voix: 'os', desc: 'Pour les dire au Col.', after: "Tu les répètes jusqu'à l'aube, et le dernier est celui de la bête. Tu ne savais pas qu'elle en avait un." },
    { label: 'Aiguiser ta faim', voix: 'chair', desc: 'Pour la réveiller.', after: "Tu ne manges rien cette nuit-là, et, sous tes pieds, quelque chose jeûne avec toi." },
    { label: 'Fermer les yeux plus fort', voix: 'brume', desc: 'Pour rêver plus loin.', after: "Derrière tes paupières, il y a un autre dos, un autre matin, et quelqu'un qui te ressemble en train de s'endormir." }
  ] },

  // ---- Livre V (après une première fin) ----
  { id: 's17', book: 4, title: 'Le réveil qui n\'en était pas un', cond: { endings: 1 }, text: [
    "Tu ouvres les yeux sur des plaques tièdes. Une voix compte. Tic te dit, très gaiement, qu'il vit sur cette bête depuis trois Colosses.",
    "Tu te souviens de tout. Tu es le seul. Sur la paroi d'une côte, l'écriture d'un enfant a ajouté une ligne à ton nom : « encore »."
  ], choices: [
    { label: 'Dire à Tic que tu sais', voix: 'os', desc: 'Il hausse une aile.', after: "« Bien sûr que tu sais. Tu me le dis à chaque fois. » Il te regarde avec une tendresse qu'il cache très mal." },
    { label: 'Reprendre le travail', voix: 'chair', desc: 'La bête a faim.', after: "Il y a du fourrage à livrer, et c'est une façon comme une autre de tenir debout." },
    { label: 'Chercher ce qui a changé', voix: 'brume', desc: 'Une chose, au moins.', after: "Une seule : ton ombre est un peu plus longue. Tu n'en parles à personne. Oriane, de loin, te fait un signe de tête." }
  ] },
  { id: 's18', book: 4, title: 'La Première', cond: { after: 's17', time: 900 }, text: [
    "Tu descends plus bas que la ville, plus bas que le cœur, plus bas que la terre ocre. Il y a un très grand œil fermé, et une paupière que soulève, par moments, un rêve.",
    "Dans ce rêve, un peuple minuscule pose des grues sur un dos. Tu vois très bien leurs gestes, leurs erreurs, leurs tentes mal placées. Tu vois aussi l'immense tendresse avec laquelle elle les regarde. Elle ne veut pas se réveiller. Elle veut savoir comment ça finit."
  ], choices: [
    { label: 'Lui raconter la fin', voix: 'os', desc: 'Celle qu\'Hesper gardait.', after: "Tu la lui racontes. La paupière frémit. Quand tu as terminé, elle recommence au début, et elle a l'air heureuse." },
    { label: 'La secouer', voix: 'chair', desc: 'Il est temps.', after: "Tu poses les deux mains sur le monde et tu pousses. Elle ne bouge pas. Elle sourit, peut-être. Tu continueras à pousser." },
    { label: 'Lui demander une place', voix: 'brume', desc: 'À côté d\'elle, dans le noir.', after: "Il y a déjà une place, à ta taille, tiède. Elle a été gardée. Pas encore, dit quelque chose, mais c'est dit très gentiment." }
  ] }
];

// Songes d'errance : quand aucun chapitre n'est disponible cette nuit-là.
G.SONGES_ERRANTS = [
  { id: 'e1', title: 'La maison à marée', text: ["Tu habites une maison qui monte et descend avec une mer que personne ne voit. Par la fenêtre, ta propre tente passe, à l'envers."], choices: [
    { label: 'Fermer les volets', voix: 'os', after: "Il fait noir et il fait bon. On frappe. Tu ne réponds pas." },
    { label: 'Sauter par la fenêtre', voix: 'chair', after: "Tu retombes sur le dos, sur le dos, sur le dos." },
    { label: 'Ouvrir à la marée', voix: 'brume', after: "Elle entre, s'assied, et te demande comment s'est passée ta journée." }
  ] },
  { id: 'e2', title: 'Le marché des heures', text: ["Un marchand sans visage vend des après-midi au poids. Il en a un à toi : il pèse très peu."], choices: [
    { label: 'Le racheter', voix: 'os', after: "Tu le ranges avec les autres. Il sent l'herbe coupée." },
    { label: 'Marchander', voix: 'chair', after: "Tu l'obtiens contre une dent. Tu ne sauras jamais laquelle." },
    { label: 'Vendre un matin', voix: 'brume', after: "Le lendemain commence directement à midi, et personne ne s'en étonne." }
  ] },
  { id: 'e3', title: 'Les poissons de poussière', text: ["Des poissons de poussière nagent entre les pattes de la bête. Ils ont le visage des gens que tu n'as pas assez regardés."], choices: [
    { label: 'En nommer un', voix: 'os', after: "Il se retourne. Il t'a reconnu." },
    { label: 'En attraper un', voix: 'chair', after: "Il ne reste rien dans ta main, sauf le goût de quelqu'un." },
    { label: 'Nager avec eux', voix: 'brume', after: "Tu respires très bien la poussière, à condition de ne pas y penser." }
  ] },
  { id: 'e4', title: 'La lanterne qui marche', text: ["Une lanterne avance seule sur les plaques, à hauteur d'homme. Elle cherche celui qui la portait, et il fait de plus en plus clair autour de toi."], choices: [
    { label: 'La prendre', voix: 'chair', after: "Elle est chaude, et elle te reconnaît à la main." },
    { label: 'La suivre', voix: 'brume', after: "Elle te mène à une porte qui n'était pas là, et qui n'y sera plus." },
    { label: 'L\'éteindre', voix: 'os', after: "Dans le noir, quelqu'un te remercie à voix basse." }
  ] },
  { id: 'e5', title: 'Le chant des porteurs morts', text: ["Une file de porteurs traverse ton sommeil, chacun avec une charge de deux unités. Ils chantent le nombre de pas qu'il reste, et le nombre ne diminue pas."], choices: [
    { label: 'Prendre place dans la file', voix: 'chair', after: "Le chant est facile. Tu le connais déjà." },
    { label: 'Leur montrer un chemin plus court', voix: 'brume', after: "Ils te remercient poliment et continuent par le long." },
    { label: 'Compter avec eux', voix: 'os', after: "Tu arrives à un nombre qui ressemble beaucoup à ton âge." }
  ] }
];

// Ce qui peut être dit au Col des Murmures (fin de la marche en triomphe).
G.FINS = {
  os: { label: 'Dire tous les noms', desc: 'Il faut 3 en Voix d\'Os.', need: 3, title: 'Le Nom', text: [
    "Tu commences par le tien, et tu ne t'arrêtes plus. Les porteurs, les conteurs, les quatre mille portes de la ville d'en dessous, les enfants d'Ioun qui ne sont pas encore nés. Les Murmures se taisent un par un, à mesure qu'on les appelle.",
    "Le dernier nom est celui de la bête. Tu le prononces, et elle s'arrête. Elle se couche sous le Col avec un soupir qui dure une génération. Sur son dos poussent de l'herbe, puis des collines. Ton peuple descend et, pour la première fois, reste quelque part.",
    "Tic se pose sur une pierre. Il ne dit rien. C'est la dernière chose qu'il ne dit pas."
  ] },
  chair: { label: 'La réveiller', desc: 'Il faut 3 en Voix de Chair.', need: 3, title: 'Le Matin', text: [
    "Tu ne parles pas. Tu mords. Tu plantes tes dents dans le monde ocre, de toute ta faim, de la faim de tous ceux qui ont livré du fourrage à une bête qui rêvait.",
    "Quelque chose, tout en bas, ouvre un œil. Le ciel se plisse. Les montagnes rentrent leurs doigts. Il y a une lumière que personne n'avait vue, une lumière sans couleur d'ocre, et un bâillement si vaste qu'il emporte le mot « hier ».",
    "Tu es debout dans l'herbe, tu ne sais pas où. Tu as très faim. C'est le matin, le vrai, le premier. Il faudra tout refaire, et rien n'a jamais été aussi bon."
  ] },
  brume: { label: 'Prendre sa place', desc: 'Il faut 3 en Voix de Brume.', need: 3, title: 'Le Rêveur', text: [
    "« Fatigué ? » demandes-tu à la chose qui écoute au fond du Col. Tu n'as jamais posé une question aussi simple. Le vent s'arrête de parler.",
    "Tu te couches là, sur le seuil, la tête sur le bras. La place est tiède. Elle a été gardée. Tu fermes les yeux, et derrière tes paupières une toute petite bête se lève, s'ébroue, et commence à marcher sur la peau d'un monde couleur d'ocre.",
    "Un oiseau se pose sur ton front. « Tic ! dit-il. Je vis ici depuis toujours. Bon. Par où on commence ? » Elle marche. Tu rêves."
  ] },
  silence: { label: 'Te taire', desc: 'Passer sans rien dire.', need: 0, title: 'Le Passage', text: [
    "Tu ne dis rien. Le Col attend, puis il n'attend plus. La bête passe entre ses lèvres de pierre, de l'autre côté il y a une steppe, des os blanchis, un ciel que tu connais.",
    "Tu te retournes. Derrière toi, le Col est devant toi. Quelque chose rit, sans méchanceté, à l'échelle d'un continent.",
    "Il faudra revenir avec quelque chose à dire."
  ] }
};

// Ce que le Veilleur garde au réveil, à la fin d'une marche.
G.REVEILS = {
  death: [
    "La bête s'est couchée. Le monde s'est refermé dessus, sans bruit, comme une main sur un secret.",
    "Tu l'as sentie s'arrêter dans ton sommeil. Une ville de plus, tassée sous la prochaine.",
    "Quelque part, un enfant ajoute une ligne à une côte."
  ],
  transmit: [
    "Tu t'endors sur un dos, tu te réveilles sur un autre. Personne ne remarque rien, sauf Tic.",
    "Elle continuera sans toi. Elles continuent toujours."
  ]
};

// Répliques courtes affichées en italique dans les fiches.
G.FLAVOR = {
  b: {
    grue: "Ses bras attrapent ce qui passe. Le monde défile ; c'est lui qui vient se faire prendre.",
    harpon: "Kaë dit qu'on vise toujours la lune. Le reste, c'est de la viande.",
    corderie: "On tresse l'herbe parce qu'il faut bien que quelque chose tienne.",
    fumoir: "La fumée monte droit, même au galop. Personne ne sait pourquoi.",
    depeceur: "Ce qui a couru sous le ciel finit sur les tentes. C'est une forme de voyage.",
    atelier: "Chaque outil a d'abord été quelqu'un.",
    lanternier: "On emprisonne une petite nuit jaune dans une cage d'os.",
    forge: "Le cuivre chante quand on le frappe. Les vieux se bouchent les oreilles.",
    tente: "On y dort sur la peau d'une bête, sur le dos d'une autre, dans le rêve d'une troisième.",
    conteur: "Une histoire, c'est ce qui reste quand la tique blanche est passée.",
    grenier: "Plein, il sent l'été. Vide, il sent la veille d'une vague.",
    palissade: "Une clôture sur un monstre : l'idée la plus humaine qui soit.",
    lanceur: "Des morts, lancés sur ce qui veut nous faire oublier.",
    epouilleurs: "Ils ont fini par reconnaître chaque tique. C'est le plus triste.",
    baliste: "Elle ne rate jamais. Elle hésite, parfois.",
    nuque: "La bête mange par ici. Elle rêve juste au-dessus."
  },
  r: {
    fourrage: "L'herbe du Monde Ocre est très verte, quand on y pense.",
    bois: "Il ne faut pas regarder les nœuds trop longtemps.",
    pierre: "Les seules choses, ici, qui ne bougent pas. Ou très lentement.",
    os: "Tout ce qui a marché. Et c'est encore solide.",
    viande: "Les hardes fuient parallèlement à nous. Elles savent aussi.",
    vivres: "Fumé, salé, partagé : c'est ainsi qu'on devient un peuple.",
    cordes: "La moitié de la civilisation. L'autre moitié, ce sont des nœuds.",
    peau: "Une maison qui se souvient d'avoir couru.",
    outils: "Un os qui a appris à se rendre utile.",
    resine: "Le temps, quand il coule très lentement.",
    cuivre: "Il garde la trace de chaque doigt qui l'a touché.",
    lanternes: "Pour voir ce qu'on préférerait deviner.",
    pointes: "L'argument final du cuivre.",
    recits: "La seule monnaie que la tique blanche veut voler."
  }
};
