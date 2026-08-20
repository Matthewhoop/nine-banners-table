/* global window */
(function (NB) {
  NB.TABLE_CODE = "9B-PELLANE";
  NB.DEFAULT_PIN = "9BANNERS";
  NB.STATE_KEY = "nb-table-state";
  NB.SESSION_KEY = "nb-session";
  NB.CHANNEL = "nb-table";

  NB.SKILLS = [
    "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception",
    "History", "Insight", "Intimidation", "Investigation", "Medicine",
    "Nature", "Perception", "Performance", "Persuasion", "Religion",
    "Sleight of Hand", "Stealth", "Survival"
  ];

  NB.CONDITIONS = [
    "Concentration", "Blinded", "Charmed", "Deafened", "Exhaustion",
    "Frightened", "Grappled", "Incapacitated", "Invisible", "Paralyzed",
    "Petrified", "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious"
  ];

  NB.CLASSES = [
    "Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk",
    "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard"
  ];

  NB.BANNER_COLORS = [
    "#6b2a28", "#1f4d4a", "#c9a15b", "#2f4a2a", "#3a2a58",
    "#8a3a1c", "#d4b46a", "#2a3a58", "#5a2a3a"
  ];

  NB.NPCS = {
    sera: {
      id: "sera", name: "Sera Vell", house: "House Vell · your employer",
      sprite: "sera", color: "#2c4a7a",
      bio: "Thirty-two, ink-stained cuffs, a seal-ring she never takes off. Second daughter until the war made her the one who could still talk to both banks. Tired in a precise way. She hired you because the last honor guard was her cousin’s drinking friends and someone swapped a petition page.",
      lines: [
        "Keep me breathing. Keep my seal off other people’s wax. Smile through three days of toasts.",
        "You are not my diplomats. You are the reason I can turn my back on a room.",
        "If the seal goes missing I will not shout. I will go very still. Do not make me go still."
      ]
    },
    aldren: {
      id: "aldren", name: "Aldren Vell", house: "House Vell · her uncle",
      sprite: "aldren", color: "#7a2a32",
      bio: "Gray, charming, always first to buy the next bottle. Fought in the opening month, came home with a limp and a lot of stories. Knows every back stair in the granary-hall. Calls Sera “the clever one” like a compliment that might also be a warning.",
      lines: [
        "The clever one hired steel this time. Sensible. The last lot could not keep a page on a desk.",
        "I know a stair the banners never use. Useful, if the hall gets loud.",
        "Sit. Drink. Tomorrow the petitions start and nobody’s stories get shorter."
      ]
    },
    dreth: {
      id: "dreth", name: "Halden Dreth", house: "House Dreth · upriver steel",
      sprite: "dreth", color: "#2a2a30",
      bio: "Looks like a funeral that learned to walk. Three sons on the casualty lists; a fourth’s glove in his belt. Wants the treaty to hurt someone. Polite until he is not. Will test whether you are Vell’s dogs or actual neutrals.",
      lines: [
        "Neutral blades. That is the phrase. We will see if it is the fact.",
        "Upriver buried more sons than the hall will say out loud. Write that into the paper or the paper is a joke.",
        "I am polite. Do not confuse that with soft."
      ]
    },
    ise: {
      id: "ise", name: "Ise Calren", house: "House Calren · coin and warehouses",
      sprite: null, color: "#c4a86a",
      bio: "Silk over a warehouse mind. Laughs at the right jokes and remembers every favor. Wants a tariff clause that looks like peace and spends like victory. Will try to hire you out from under Sera “just for an hour, after the petitions.”",
      lines: [
        "A smile costs nothing. A clause costs a river.",
        "After petitions I need an hour of discreet walking. Sera can spare you. Ask her. Or don’t.",
        "Calren warehouses keep this city fed. Remember who stacked the sacks."
      ]
    },
    brann: {
      id: "brann", name: "Brann Orswick", house: "House Orswick · cavalry",
      sprite: null, color: "#3d5a2a",
      bio: "Mud on good boots. Hates cities, hates waiting, hates priests who talk about fords they have never held. Respects you if you look like you’ve stood in a line. Will not respect a smile that doesn’t have a sword behind it.",
      lines: [
        "Horses hate these stones. I hate the waiting. The fords do not care about either.",
        "You stood in a line before, or you learned to fake it. I’ll know by dusk.",
        "Priests sing about fords. I have held them. Different hymns."
      ]
    },
    tolla: {
      id: "tolla", name: "Tolla of Meren", house: "House Meren · grain",
      sprite: null, color: "#c4a45a",
      bio: "Short, flour-dust on her sleeves no matter the dress. Here so the barges move. Easiest person in the hall to like, hardest to get a secret from — she genuinely does not collect them.",
      lines: [
        "If the barges move, people eat. That is the whole of my treaty.",
        "I do not keep secrets. I keep tallies. Tallies do not lie as well.",
        "Truce-cakes taste like last year’s flour. Eat them anyway. It is polite."
      ]
    },
    kell: {
      id: "kell", name: "Speaker Kell", house: "House Kesh · river-priests",
      sprite: null, color: "#d8e0e6",
      bio: "River-priest, voice made for hymns. Wants the old ford-shrine reopened and the hymn sung the old way. Offers blessings freely. Asks where you sleep, “in case the river needs to find you.”",
      lines: [
        "The shrine has been shut like a mouth. Open it and the city remembers how to swallow peace.",
        "A blessing costs nothing. Where do you sleep, in case the river needs to find you?",
        "Nine banners. One hymn. That is not a small ask, whatever they tell you."
      ]
    },
    ysolde: {
      id: "ysolde", name: "Ysolde Thane", house: "House Thane · timber",
      sprite: null, color: "#6a4020",
      bio: "Timber and patience. Will tell you both sides were fools and her mills kept the world standing. Gifts small carved tokens. Knows the warehouse keys better than the watch does.",
      lines: [
        "Both banks burned the same villages twice. My mills sold lumber to both. The world stayed standing.",
        "A token. Oak. Keep it in a pocket that is not your sword-hand.",
        "I am neutral the way a bridge is neutral. People still walk over me."
      ]
    },
    corin: {
      id: "corin", name: "Adept Corin Ivola", house: "House Ivola · scholars",
      sprite: null, color: "#5a3a78",
      bio: "Younger than the title. Ink, relics, a satchel that clinks. Wants access to the hall’s lower rooms “to record what the war left in the stone.” Very earnest. Very hard to shake once they have asked twice.",
      lines: [
        "The war left things in the stone. I only want to write them down.",
        "Lower rooms. A lamp. An hour. I will ask again if I must.",
        "Ivola catalogues relics the way other houses catalogue wine. That is not a threat. It is a method."
      ]
    },
    pava: {
      id: "pava", name: "Pava Rell", house: "House Rell · host-lord of Pellane",
      sprite: null, color: "#b08a2a",
      bio: "Pellane’s civic face. Gold chain, river-cold eyes. Wants three quiet days and a signed paper she can nail to the granary door. Will thank you in public and have you followed in private if you make a scene.",
      lines: [
        "Three quiet days. A paper on the granary door. That is the whole of my hospitality.",
        "Thank you for keeping your steel in its sheath. The watch has enough opinions this week.",
        "This city offered a table. Do not flip it."
      ]
    },
    durne: {
      id: "durne", name: "Watch-Captain Durne", house: "Pellane watch · Rell’s sword",
      sprite: null, color: "#3a4a68",
      bio: "Rell’s sword on the street. Extra coin this week, extra enemies. Does not like out-of-town blades with badges. Will still drink with you if you pay.",
      lines: [
        "Badges. I see them. Out-of-town steel still looks like trouble from this side of the quay.",
        "Extra coin this week. Extra enemies. Do not add a third column.",
        "If you pay, I will drink. If you draw, I will remember."
      ]
    },
    lir: {
      id: "lir", name: "Lir", house: "Clerk of the hall",
      sprite: null, color: "#5a4a38",
      bio: "The person who actually knows which door is which. Ink on the thumb, voice that drops when a banner walks in. Lost a petition case yesterday and is pretending it turned up. Will trade gossip for anyone who finds a missing page — or a missing person.",
      lines: [
        "That door is for Dreth. That one is for nobody, including you.",
        "A petition case walked off yesterday. If it walks back, I will owe a favor. I pay favors.",
        "I know the hall. The hall does not know half of what I know."
      ]
    },
    mara: {
      id: "mara", name: "Mara Quell", house: "The Low Quay · innkeep",
      sprite: null, color: "#8a5a30",
      bio: "Ex-barge, current stew. No politics at the bar unless you pay for the bottle that comes with it. Has a back room and a worse memory if you ask nicely.",
      lines: [
        "Stew first. Politics after you pay for the bottle that comes with it.",
        "Back room’s for people I like, or people who pay like I like them.",
        "Your badges are new. The river does not care. Eat."
      ]
    }
  };
  // fix ise color if I typo'd

  NB.SCENES = {
    inn: {
      id: "inn", name: "The Low Quay", art: "art/inn.png",
      narration: "Stew and barge-talk. Mara behind the bar. Your badges are new. The first toast is tomorrow night.",
      present: ["mara", "aldren", "lir"],
      spawn: { x: 118, y: 108 },
      npcs: [
        { id: "mara", x: 42, y: 88 },
        { id: "aldren", x: 128, y: 78 },
        { id: "lir", x: 188, y: 100 }
      ],
      // 15x10, # blocked . walk
      map: [
        "###############",
        "#####....######",
        "###.........###",
        "##...........##",
        "#.............#",
        "#.............#",
        "#.............#",
        "##...........##",
        "###.........###",
        "###############"
      ]
    },
    quay: {
      id: "quay", name: "Pellane Quay", art: "art/quay.png",
      narration: "The river is high and brown. Banners going up. Dawn on the fork. Sera briefs her blades before the hall opens.",
      present: ["sera", "durne", "brann"],
      spawn: { x: 120, y: 100 },
      npcs: [
        { id: "sera", x: 96, y: 86 },
        { id: "durne", x: 168, y: 92 },
        { id: "brann", x: 150, y: 120 }
      ],
      map: [
        "###############",
        "####.......####",
        "###.........###",
        "##...........##",
        "#.............#",
        "#.............#",
        "##...........##",
        "###.........###",
        "####.......####",
        "###############"
      ]
    },
    hall: {
      id: "hall", name: "Granary-Hall", art: "art/hall.png",
      narration: "Day 1. Petitions. Each house reads what they want the treaty to say. The hall is open. The quay is louder.",
      present: ["pava", "sera", "lir", "kell", "tolla", "ise", "dreth", "ysolde", "corin"],
      spawn: { x: 120, y: 118 },
      npcs: [
        { id: "pava", x: 120, y: 70 },
        { id: "sera", x: 72, y: 100 },
        { id: "dreth", x: 168, y: 98 },
        { id: "lir", x: 48, y: 88 },
        { id: "tolla", x: 200, y: 110 }
      ],
      map: [
        "###############",
        "###############",
        "####.......####",
        "###.........###",
        "##...........##",
        "#.............#",
        "#.............#",
        "#.............#",
        "##...........##",
        "###############"
      ]
    },
    bridge: {
      id: "bridge", name: "The Side-Deal Bridge", art: null,
      narration: "Between the public hours: “accidental” meetings on the stones. The river talks under your boots.",
      present: ["ise", "aldren", "ysolde"],
      spawn: { x: 120, y: 100 },
      npcs: [
        { id: "ise", x: 88, y: 90 },
        { id: "aldren", x: 150, y: 88 },
        { id: "ysolde", x: 120, y: 70 }
      ],
      map: [
        "###############",
        "#####....######",
        "####......#####",
        "###.........###",
        "##...........##",
        "##...........##",
        "###.........###",
        "####......#####",
        "#####....######",
        "###############"
      ]
    },
    banquet: {
      id: "banquet", name: "The Closing Banquet", art: "art/faceoff.png",
      narration: "Nine toasts. A hymn to the river. Gold, wine, and watching eyes. The draft is still a draft.",
      present: ["pava", "sera", "aldren", "dreth", "ise", "kell", "tolla", "ysolde"],
      spawn: { x: 120, y: 118 },
      npcs: [
        { id: "sera", x: 70, y: 105 },
        { id: "pava", x: 120, y: 78 },
        { id: "dreth", x: 176, y: 102 },
        { id: "kell", x: 150, y: 80 }
      ],
      map: [
        "###############",
        "####.......####",
        "###.........###",
        "##...........##",
        "#.............#",
        "#.............#",
        "#.............#",
        "##...........##",
        "###.........###",
        "###############"
      ]
    },
    procession: {
      id: "procession", name: "River Procession", art: "art/quay.png",
      narration: "Barges, blessings, the draft carried toward the ford-shrine. Setup and hymns. After this, people go home and see if the paper holds.",
      present: ["kell", "pava", "sera", "tolla"],
      spawn: { x: 110, y: 108 },
      npcs: [
        { id: "kell", x: 90, y: 84 },
        { id: "sera", x: 140, y: 90 },
        { id: "tolla", x: 170, y: 114 }
      ],
      map: [
        "###############",
        "####.......####",
        "###.........###",
        "##...........##",
        "#.............#",
        "#.............#",
        "##...........##",
        "###.........###",
        "####.......####",
        "###############"
      ]
    },
    pellane: {
      id: "pellane", name: "Pellane", art: "art/quay.png",
      narration: "Fork city. Granaries, three bridges, a civic hall that used to be a grain store. Cousins who “just happened to be passing through.”",
      present: ["durne", "mara"],
      spawn: { x: 120, y: 104 },
      npcs: [
        { id: "durne", x: 150, y: 92 },
        { id: "mara", x: 80, y: 110 }
      ],
      map: [
        "###############",
        "###.........###",
        "##...........##",
        "#.............#",
        "#.............#",
        "#.............#",
        "##...........##",
        "###.........###",
        "####.......####",
        "###############"
      ]
    }
  };

  NB.SCENE_ORDER = ["inn", "quay", "hall", "bridge", "banquet", "procession", "pellane"];

  NB.FACEOFF_KINDS = [
    { id: "talk", label: "Confrontation", sub: "Someone is waiting across the stones. Keep your voice even." },
    { id: "task", label: "A tense task", sub: "Hands, breath, timing. The room is watching whether you fumble." },
    { id: "toast", label: "The raised cup", sub: "Nine toasts. Watch who drinks. Watch who does not." },
    { id: "chase", label: "A crowded stair", sub: "Boots on wet stone. Do not lose the cloak ahead." },
    { id: "lock", label: "A locked latch", sub: "A quiet tool. A quieter room. Do not scratch the brass." },
    { id: "combat", label: "Steel", sub: "Steel is a last language. Say if you mean it." }
  ];

  NB.LOOKS = {
    player: { skin: "#d2a07a", hair: "#5a3a22", tunic: "#2a6b5a", tunic2: "#1a3a32", pants: "#4a3424", boots: "#2a1c12", accent: "#c9a15b" },
    sera: { skin: "#d8b090", hair: "#1a1410", tunic: "#243a68", tunic2: "#162444", pants: "#1c2a44", boots: "#11110e", accent: "#c9a15b" },
    aldren: { skin: "#c4a080", hair: "#9a9a92", tunic: "#7a2a32", tunic2: "#4a181c", pants: "#2a1c18", boots: "#1a1210", accent: "#c9a15b" },
    dreth: { skin: "#b09078", hair: "#1a1a1c", tunic: "#2a2a30", tunic2: "#141416", pants: "#1c1c20", boots: "#0e0e10", accent: "#8a8a96" },
    ise: { skin: "#e0c0a0", hair: "#3a2418", tunic: "#d4c08a", tunic2: "#8a7040", pants: "#5a4830", boots: "#2a2014", accent: "#e8d090" },
    brann: { skin: "#c09068", hair: "#3a2818", tunic: "#3d5a2a", tunic2: "#243818", pants: "#4a3420", boots: "#2a1c10", accent: "#6a4a20" },
    tolla: { skin: "#d8b898", hair: "#6a4a28", tunic: "#e8d8b0", tunic2: "#c4a45a", pants: "#8a6a40", boots: "#3a2a18", accent: "#f0e0b8" },
    kell: { skin: "#d2b090", hair: "#e8e8e0", tunic: "#d8e0e6", tunic2: "#3a6a7a", pants: "#c8d0d4", boots: "#2a2a28", accent: "#7ab0c4" },
    ysolde: { skin: "#c8a888", hair: "#4a3020", tunic: "#6a4020", tunic2: "#3a2414", pants: "#4a301c", boots: "#2a1810", accent: "#c4a06a" },
    corin: { skin: "#d4b090", hair: "#2a1c28", tunic: "#5a3a78", tunic2: "#3a2450", pants: "#2a1c30", boots: "#161018", accent: "#c0a0e0" },
    pava: { skin: "#d0b090", hair: "#2a1c14", tunic: "#b08a2a", tunic2: "#6a5018", pants: "#3a2a14", boots: "#1a140c", accent: "#e8c85a" },
    durne: { skin: "#c4a080", hair: "#2a2418", tunic: "#3a4a68", tunic2: "#243044", pants: "#2a3038", boots: "#141418", accent: "#8aa0b8" },
    lir: { skin: "#d0b090", hair: "#3a2a20", tunic: "#5a4a38", tunic2: "#3a2e24", pants: "#3a3024", boots: "#1c1610", accent: "#2a2a28" },
    mara: { skin: "#c49870", hair: "#4a2418", tunic: "#8a5a30", tunic2: "#5a3818", pants: "#4a3424", boots: "#2a1c12", accent: "#c4b08a" }
  };

  NB.PC_COLORS = ["#3d8a82", "#c9a15b", "#8a3a2a", "#4a6aaa", "#7a4a8a", "#4a7a3a"];
})(window.NB = window.NB || {});
