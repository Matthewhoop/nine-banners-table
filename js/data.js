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
    prologue: {
      id: "prologue", name: "How you got here", art: "art/quay.png",
      ambient: "quay",
      narration: "Pellane. A river city. Nine houses. Banners going up for a three-day truce.",
      beats: [
        "Pellane sits on the fork: a river city, granaries, nine houses and their banners.",
        "The war was hard. Then the houses asked for three quiet days on the water.",
        { speakerId: "pava", text: "House Rell will host. A river truce. Three days. A paper we can nail to the granary door." },
        { speakerId: "sera", text: "I hired you as neutral blades. Keep me breathing. Keep my seal off other people’s wax." },
        { speakerId: "sera", text: "Smile through three days of toasts. You are the reason I can turn my back on a room." },
        "Mara Quell keeps the Low Quay. Aldren Vell is Sera’s uncle — charming, first to buy the next bottle.",
        "Lir clerks the hall. Halden Dreth comes upriver, polite and hard. Ise Calren counts coin. Tolla of Meren wants the barges moving.",
        "Speaker Kell speaks for the river-priests. Ysolde Thane is timber. Adept Corin Ivola catalogues for the scholars. Watch-Captain Durne walks the stones.",
        { speakerId: "mara", text: "Stew first. Politics after you pay for the bottle that comes with it." },
        "You come up the Low Quay the night before the first toast. The lamps are lit."
      ],
      decisions: [
        {
          id: "prologue-arrive",
          kind: "group",
          afterBeat: 9,
          nextScene: "inn",
          choiceNext: {
            "We're here": "inn",
            "Tell it once more": "prologue"
          },
          prompt: "The Low Quay is lit. Sit down and take the contract.",
          choices: ["We're here", "Tell it once more"],
          allowText: true,
          after: {
            "We're here": "The Low Quay takes your names. Stew is already on.",
            "Tell it once more": "You sit with it once more. The river does not mind the telling."
          }
        }
      ],
      present: ["sera", "mara"],
      spawn: { x: 120, y: 100 },
      npcs: [
        { id: "sera", x: 96, y: 86 },
        { id: "mara", x: 150, y: 110 }
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
    inn: {
      id: "inn", name: "The Low Quay", art: "art/inn.png",
      ambient: "inn",
      narration: "Stew and barge-talk. Mara behind the bar. Your badges are new. The first toast is tomorrow night.",
      beats: [
        "Stew and barge-talk. Mara behind the bar.",
        "Your badges are new. The oak already has opinions.",
        "Aldren buys the next bottle before anyone asks.",
        "Lir’s thumb is ink-black. He watches the door more than the bowl.",
        "The first toast is tomorrow night. Tonight is beds and who sits where.",
        "The room is filling. Sera wants you settled before dawn."
      ],
      decisions: [
        {
          id: "inn-settle",
          kind: "group",
          afterBeat: 5,
          nextScene: "quay",
          prompt: "The room is filling. Where does the table settle?",
          choices: ["Sit at the bar", "Take the back table", "Stay on your feet"],
          allowText: true,
          after: {
            "Sit at the bar": "Mara slides stew down the oak and pretends not to count the badges.",
            "Take the back table": "The back table has a lamp, a wall, and a clean view of the door.",
            "Stay on your feet": "You keep your boots. The room fills. Nobody asks you to sit."
          }
        }
      ],
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
      ambient: "quay",
      narration: "The river is high and brown. Banners going up. Dawn on the fork. Sera briefs her blades before the hall opens.",
      beats: [
        "The river is high and brown. Dawn on the fork.",
        "Banners going up on poles that still smell like pitch.",
        "Sera briefs her blades. Keep her seal. Keep her breathing.",
        "Durne counts out-of-town steel and does not smile.",
        "Two barge-hands argue over a crate. The hall can wait a breath — or not."
      ],
      decisions: [
        {
          id: "quay-overhear",
          kind: "solo",
          afterBeat: 4,
          nextScene: "hall",
          prompt: "Two barge-hands are arguing over a crate. Who leans in?",
          choices: ["Listen", "Walk past"],
          allowText: true,
          reacts: ["I watch the door", "I create a distraction"],
          after: {
            "Listen": "You catch two voices over a crate. The hall can wait a breath.",
            "Walk past": "You let the barge-hands keep their crate. The quay goes on."
          }
        }
      ],
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
      ambient: "hall",
      narration: "Day 1. Petitions. Each house reads what they want the treaty to say. The hall is open. The quay is louder.",
      beats: [
        "Day 1. Petitions. Each house reads what they want the treaty to say.",
        "The granary-hall used to hold grain. Now it holds nine banners.",
        "Pava wants three quiet days. Tolla wants the barges moving.",
        "Kell speaks of a hymn. Dreth’s banner hangs like a funeral that learned to stand.",
        "The hall is open. The quay is louder through the doors.",
        "The houses take their places. Someone has to stand near a color."
      ],
      decisions: [
        {
          id: "hall-banner",
          kind: "group",
          afterBeat: 5,
          nextScene: "bridge",
          prompt: "The houses are taking their places. Which banner do we stand near?",
          choices: ["House Vell", "House Dreth", "House Calren", "The host-lord"],
          allowText: true,
          after: {
            "House Vell": "You take a place near Vell’s colors. Familiar cloth.",
            "House Dreth": "Dreth’s banner hangs like a funeral that learned to stand.",
            "House Calren": "Calren’s silk catches the light. Someone is already smiling at you.",
            "The host-lord": "You stand where Pellane can see you. Gold chain, river-cold eyes."
          }
        }
      ],
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
      ambient: "quay",
      narration: "Between the public hours: “accidental” meetings on the stones. The river talks under your boots.",
      beats: [
        "Between the public hours: “accidental” meetings on the stones.",
        "The river talks under your boots.",
        "Ise Calren smiles like a clause. She has an hour to sell.",
        "Aldren mentions a stair the banners never use, as if it were weather.",
        "Ysolde watches the water and does not collect either offer."
      ],
      decisions: [
        {
          id: "bridge-offer",
          kind: "group",
          afterBeat: 4,
          nextScene: "banquet",
          prompt: "Two offers, one pair of boots. What does the table do?",
          choices: ["Walk with Ise", "Hear Aldren’s stair", "Decline both"],
          allowText: true,
          after: {
            "Walk with Ise": "Ise takes the long way along the rail. Warehouses, smiles, nothing that costs yet.",
            "Hear Aldren’s stair": "Aldren points at a door the banners never use. A rumor, not a key.",
            "Decline both": "You keep the stones and your hours. The river does not mind."
          }
        }
      ],
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
      ambient: "hall",
      narration: "Nine toasts. A hymn to the river. Gold, wine, and watching eyes. The draft is still a draft.",
      beats: [
        "Night 1. Gold, wine, and watching eyes.",
        "Nine cups wait. The draft is still a draft.",
        "Pava thanks the room for keeping steel in its sheath.",
        "Kell’s hymn is promised for later. Not yet.",
        "The first toast is raised. Whose cup do you watch?"
      ],
      decisions: [
        {
          id: "banquet-toast",
          kind: "group",
          afterBeat: 4,
          prompt: "The first toast is raised. Whose cup do you watch?",
          choices: ["Sera’s toast", "Pava’s toast", "Dreth’s toast", "Kell’s toast"],
          allowText: true,
          closer: "The hymn is still coming. Night 1 holds.",
          endCard: {
            title: "Night 1 holds",
            line: "The hymn is still coming. Night 1 holds.",
            note: "The table will open again."
          },
          after: {
            "Sera’s toast": "Sera’s cup is brief and exact. She drinks like a woman who still has work.",
            "Pava’s toast": "Pava toasts the city that offered a table. Gold chain, river-cold eyes.",
            "Dreth’s toast": "Dreth drinks without a speech. The glove in his belt does the talking.",
            "Kell’s toast": "Kell names the river and does not rush the hymn."
          }
        }
      ],
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
      ambient: "quay",
      narration: "Barges, blessings, the draft carried toward the ford-shrine. Setup and hymns. After this, people go home and see if the paper holds.",
      beats: [
        "Barges, blessings, the draft carried toward the ford-shrine.",
        "Kell’s voice carries over the water. The poles are already dressed.",
        "Sera keeps her seal on her own finger. The barges wait.",
        "Setup and hymns. After this, people go home and see if the paper holds."
      ],
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
      ambient: "quay",
      narration: "Fork city. Granaries, three bridges, a civic hall that used to be a grain store. Cousins who “just happened to be passing through.”",
      beats: [
        "Fork city. Granaries, three bridges, a civic hall that used to be a grain store.",
        "The watch extra-coin this week. Durne does not pretend otherwise.",
        "Mara’s door is still open if you need stew more than speeches.",
        "Cousins who “just happened to be passing through.”"
      ],
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

  NB.SCENE_ORDER = ["prologue", "inn", "quay", "hall", "bridge", "banquet", "procession", "pellane"];

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

  NB.TALK_REPLIES = [
    "We hear you.",
    "What do you need?",
    "We'll keep it quiet.",
    "Just passing through."
  ];

  NB.TALK_END_REPLIES = [
    "That's enough",
    "I'll look around",
    "I'll leave it"
  ];

  /* Generic, player-safe. No identities, no twists. */
  NB.TALK_SCENE_REPLIES = {
    prologue: [
      { intent: "here", choice: "We're here", keys: ["here", "sit", "contract", "ready", "arrived"] },
      { intent: "again", choice: "Tell it once more", keys: ["again", "once more", "repeat", "tell it"] }
    ],
    inn: [
      "Stew's hot. Sit or don't.",
      "The river brings all kinds. I don't ask.",
      "Keep the badges off the oak if they scratch."
    ],
    quay: [
      "Watch your boots. The stones are slick.",
      "Barges wait for no one.",
      "Dawn's already late for some of these banners."
    ],
    hall: [
      "Keep your voices for the petitions.",
      "The hall hears more than it says.",
      "Doors have names. Yours is not on most of them."
    ]
  };

  NB.TALK_CLOSERS = {
    inn: [
      "Stew's up.",
      "Don't let me keep you.",
      "Go on then."
    ],
    quay: [
      "Don't let me keep you.",
      "The river's not waiting.",
      "Go on. Dawn's moving."
    ],
    hall: [
      "Don't let me keep you.",
      "I've said my piece.",
      "The petitions will not wait."
    ]
  };


  /* Player-safe. Custom text is matched here so the room answers the move. */
  NB.INTENTS = {
    _: [
      { intent: "talk", keys: ["talk", "ask", "tell", "say", "speak", "question"] },
      { intent: "look", keys: ["look", "watch", "scan", "search", "check", "inspect", "study"] },
      { intent: "listen", keys: ["listen", "eaves", "overhear", "hear"] },
      { intent: "help", keys: ["help", "aid", "guard", "protect", "cover"] },
      { intent: "buy", keys: ["buy", "pay", "round", "ale", "drink", "stew", "bottle"] },
      { intent: "wait", keys: ["wait", "hold", "stay", "linger"] },
      { intent: "leave", keys: ["leave", "go", "walk", "out", "away"] },
      { intent: "steel", keys: ["draw", "sword", "steel", "threaten", "stab"] },
      { intent: "argue", keys: ["fight", "argu", "break up", "stop them", "step in", "between", "split them"] }
    ],
    inn: [
      { intent: "bar", choice: "Sit at the bar", keys: ["bar", "stool", "oak", "mara"] },
      { intent: "back", choice: "Take the back table", keys: ["back table", "corner", "wall", "lamp"] },
      { intent: "stand", choice: "Stay on your feet", keys: ["stand", "feet", "boots", "on my feet"] }
    ],
    quay: [
      { intent: "listen", choice: "Listen", keys: ["listen", "lean", "crate", "barge", "overhear"] },
      { intent: "leave", choice: "Walk past", keys: ["walk past", "ignore", "keep walking", "pass"] }
    ],
    hall: [
      { intent: "vell", choice: "House Vell", keys: ["vell", "sera", "our"] },
      { intent: "dreth", choice: "House Dreth", keys: ["dreth"] },
      { intent: "calren", choice: "House Calren", keys: ["calren", "ise", "silk"] },
      { intent: "host", choice: "The host-lord", keys: ["pava", "host", "pellane", "rell"] }
    ],
    bridge: [
      { intent: "ise", choice: "Walk with Ise", keys: ["ise", "calren", "walk with", "warehouse"] },
      { intent: "stair", choice: "Hear Aldren’s stair", keys: ["aldren", "stair", "door", "uncle"] },
      { intent: "decline", choice: "Decline both", keys: ["decline", "neither", "no thanks", "refuse"] }
    ],
    banquet: [
      { intent: "sera", choice: "Sera’s toast", keys: ["sera"] },
      { intent: "pava", choice: "Pava’s toast", keys: ["pava", "host"] },
      { intent: "dreth", choice: "Dreth’s toast", keys: ["dreth"] },
      { intent: "kell", choice: "Kell’s toast", keys: ["kell", "hymn", "priest"] }
    ]
  };

  NB.REACTS = {
    _: {
      talk: "The room hears you. Someone answers. Someone pretends not to.",
      look: "You take the room: hands, exits, who is watching whom.",
      listen: "You catch a scrap and let the rest go by.",
      help: "You put yourself in the way. The table notes it.",
      buy: "Coin hits wood. The room warms a degree.",
      wait: "You hold. The moment does not mind waiting with you.",
      leave: "You give the room your back. It keeps talking.",
      steel: "Steel is a last language. You keep it sheathed. The room still saw the thought.",
      argue: "You step between the two voices. Hands stay off hilts. The argument dies uglier than it started.",
      do: "The room takes that and answers it, not the script."
    },
    prologue: {
      talk: "The river city hears you. The contract does not change.",
      look: "Lamps on the Low Quay. Banners furled for the night. The first toast is still tomorrow.",
      listen: "Water under the piles. A bottle set down. Someone laughing two doors up.",
      help: "You take the job as it was said: keep her breathing, keep the seal hers.",
      buy: "Coin for stew. Mara will remember the badges later.",
      wait: "You hold on the quay. The night does not mind.",
      leave: "You came here for three days. The oak is still waiting.",
      here: "The Low Quay takes your names. Stew is already on.",
      again: "You sit with it once more. The river does not mind the telling.",
      steel: "Steel stays sheathed. Three days of toasts do not start with a draw.",
      argue: "You put yourself between two raised voices. The quay goes quiet. The badges suddenly feel visible.",
      do: "The quay files that under the night and keeps the lamps lit."
    },
    inn: {
      talk: "Mara’s rag pauses. Aldren smiles like he was already listening.",
      look: "Door, badges, Lir’s ink-black thumb. The oak already has opinions.",
      listen: "Barge-talk, a bottle set down too carefully, stew hitting a bowl.",
      buy: "Mara takes the coin without looking up. Stew follows.",
      bar: "Mara slides stew down the oak and pretends not to count the badges.",
      back: "The back table has a lamp, a wall, and a clean view of the door.",
      stand: "You keep your boots. The room fills. Nobody asks you to sit.",
      steel: "Mara does not raise her voice. “Not in my house.” The badges suddenly feel new.",
      argue: "You step between the two voices. Hands stay off hilts. Mara’s rag slaps the oak. “Not in my house.” The argument dies.",
      do: "The Low Quay files that under the night and keeps pouring."
    },
    quay: {
      talk: "Sera’s glance says keep it short. Dawn is already late.",
      look: "Poles, pitch, Durne’s count. The crate is still the loudest thing.",
      listen: "Two voices over a crate. The hall can wait a breath.",
      argue: "You put yourself between the crate and the two voices. Poles still. The barge-hands look at the badges.",
      leave: "You let the barge-hands keep their crate. The quay goes on.",
      steel: "Durne’s eyes find your hand. Extra coin this week. Extra enemies.",
      do: "The river does not pause for it. The banners still go up."
    },
    hall: {
      talk: "Voices drop. Petitions have ears.",
      look: "Nine colors. One clerk who knows which door is which.",
      listen: "A clause, a cough, a hymn promised for later.",
      steel: "Pava’s chain catches the light. “This city offered a table.”",
      do: "The hall files it. The petitions do not stop."
    },
    bridge: {
      talk: "The river talks under your boots. So does everyone else.",
      look: "Ise’s smile, Aldren’s limp, Ysolde watching water.",
      listen: "Warehouses. A stair the banners never use. Nothing that costs yet.",
      do: "The stones keep your hours. The river does not mind."
    },
    banquet: {
      talk: "Gold, wine, watching eyes. A toast is a kind of answer.",
      look: "Nine cups. Who drinks. Who does not.",
      listen: "A hymn promised. Not yet.",
      steel: "Sheaths stay full. The room is grateful and unkind about it.",
      do: "The toast goes on. Your move sits in the cup with the wine."
    }
  };

  NB.TALK_INTENTS = [
    { keys: ["stew", "food", "eat", "hungry", "bowl"], line: "Stew first. Politics after you pay for the bottle that comes with it." },
    { keys: ["drink", "ale", "bottle", "wine", "round"], line: "That I can do. Coin on the oak." },
    { keys: ["door", "back room", "stair", "way out"], line: "Doors have names. Yours is not on most of them." },
    { keys: ["sera", "seal", "badge", "employer"], line: "Keep her breathing. The rest is her ink." },
    { keys: ["treaty", "truce", "petition", "banner"], line: "Three days. A paper. Don’t flip the table." },
    { keys: ["river", "barge", "ford", "quay"], line: "The river brings all kinds. I don’t ask." },
    { keys: ["help", "need", "favor"], line: "Say it plain. I pay favors when I owe them." },
    { keys: ["sorry", "thanks", "please"], line: "Heard. Don’t make a speech of it." }
  ];


  NB.PLAYER_LOOKS = [
    { id: "teal", label: "Teal", skin: "#d2a07a", hair: "#5a3a22", tunic: "#2a6b5a", tunic2: "#1a3a32", pants: "#4a3424", boots: "#2a1c12", accent: "#c9a15b" },
    { id: "brass", label: "Brass", skin: "#e0c0a0", hair: "#3a2418", tunic: "#c9a15b", tunic2: "#8a6d32", pants: "#5a4830", boots: "#2a2014", accent: "#e8d090" },
    { id: "ember", label: "Ember", skin: "#c49870", hair: "#1a1410", tunic: "#8a3a1c", tunic2: "#4a181c", pants: "#2a1c18", boots: "#1a1210", accent: "#d4652f" },
    { id: "ink", label: "Ink", skin: "#d8b090", hair: "#1a1a1c", tunic: "#243a68", tunic2: "#162444", pants: "#1c2a44", boots: "#11110e", accent: "#8aa0b8" },
    { id: "violet", label: "Violet", skin: "#d4b090", hair: "#2a1c28", tunic: "#5a3a78", tunic2: "#3a2450", pants: "#2a1c30", boots: "#161018", accent: "#c0a0e0" },
    { id: "pale", label: "Pale", skin: "#e8d0b8", hair: "#c4b08a", tunic: "#d8e0e6", tunic2: "#3a6a7a", pants: "#c8d0d4", boots: "#2a2a28", accent: "#7ab0c4" },
    { id: "oak", label: "Oak", skin: "#c09068", hair: "#3a2818", tunic: "#3d5a2a", tunic2: "#243818", pants: "#4a3420", boots: "#2a1c10", accent: "#6a4a20" },
    { id: "night", label: "Night", skin: "#b09078", hair: "#1a1a1c", tunic: "#2a2a30", tunic2: "#141416", pants: "#1c1c20", boots: "#0e0e10", accent: "#8a8a96" }
  ];

  NB.PC_COLORS = ["#3d8a82", "#c9a15b", "#8a3a2a", "#4a6aaa", "#7a4a8a", "#4a7a3a"];
})(window.NB = window.NB || {});
