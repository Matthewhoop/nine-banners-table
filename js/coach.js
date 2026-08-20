/* global window */
(function (NB) {
  var HIT = {
    Barbarian: 12, Bard: 8, Cleric: 8, Druid: 8, Fighter: 10, Monk: 8,
    Paladin: 10, Ranger: 10, Rogue: 8, Sorcerer: 6, Warlock: 8, Wizard: 6
  };

  var SUBCLASS_AT = {
    Cleric: 1, Sorcerer: 1, Warlock: 1,
    Wizard: 2, Druid: 2,
    Fighter: 3, Rogue: 3, Paladin: 3, Ranger: 3, Bard: 3,
    Barbarian: 3, Monk: 3
  };

  function prof(level) {
    return Math.floor((level - 1) / 4) + 2;
  }

  function asiLevels(cls) {
    var lv = [4, 8, 12, 16, 19];
    if (cls === "Fighter") lv = [4, 6, 8, 12, 14, 16, 19];
    if (cls === "Rogue") lv = [4, 8, 10, 12, 16, 19];
    return lv;
  }

  function hd(cls) { return HIT[cls] || 8; }
  function avg(die) { return Math.floor(die / 2) + 1; }

  var FEATURES = {
    Barbarian: {
      1: ["Rage", "Unarmored Defense"],
      2: ["Reckless Attack", "Danger Sense"],
      3: ["Primal Path (subclass)"],
      5: ["Extra Attack", "Fast Movement"],
      7: ["Feral Instinct"],
      9: ["Brutal Critical"],
      11: ["Relentless Rage"],
      15: ["Persistent Rage"],
      20: ["Primal Champion"]
    },
    Bard: {
      1: ["Spellcasting", "Bardic Inspiration"],
      2: ["Jack of All Trades", "Song of Rest"],
      3: ["Bard College (subclass)", "Expertise"],
      5: ["Font of Inspiration", "3rd-level spells"],
      6: ["Countercharm"],
      10: ["Magical Secrets"],
      14: ["Magical Secrets"],
      20: ["Superior Inspiration"]
    },
    Cleric: {
      1: ["Spellcasting", "Divine Domain (subclass)"],
      2: ["Channel Divinity", "Domain feature"],
      5: ["Destroy Undead", "3rd-level spells"],
      8: ["Domain feature (Divine Strike or Potent Spellcasting)"],
      10: ["Divine Intervention"]
    },
    Druid: {
      1: ["Spellcasting", "Druidic"],
      2: ["Wild Shape", "Druid Circle (subclass)"],
      4: ["Wild Shape improvement"],
      5: ["3rd-level spells"],
      18: ["Timeless Body", "Beast Spells"],
      20: ["Archdruid"]
    },
    Fighter: {
      1: ["Fighting Style", "Second Wind"],
      2: ["Action Surge"],
      3: ["Martial Archetype (subclass)"],
      5: ["Extra Attack"],
      9: ["Indomitable"],
      11: ["Extra Attack (2)"],
      13: ["Indomitable (2)"],
      17: ["Action Surge (2)", "Indomitable (3)"],
      20: ["Extra Attack (3)"]
    },
    Monk: {
      1: ["Unarmored Defense", "Martial Arts"],
      2: ["Ki", "Unarmored Movement"],
      3: ["Monastic Tradition (subclass)"],
      5: ["Extra Attack", "Stunning Strike"],
      6: ["Ki-Empowered Strikes"],
      7: ["Evasion", "Stillness of Mind"],
      10: ["Purity of Body"],
      13: ["Tongue of the Sun and Moon"],
      14: ["Diamond Soul"],
      18: ["Empty Body"],
      20: ["Perfect Self"]
    },
    Paladin: {
      1: ["Divine Sense", "Lay on Hands"],
      2: ["Fighting Style", "Spellcasting", "Divine Smite"],
      3: ["Sacred Oath (subclass)", "Divine Health"],
      5: ["Extra Attack"],
      6: ["Aura of Protection"],
      10: ["Aura of Courage"],
      11: ["Improved Divine Smite"],
      14: ["Cleansing Touch"]
    },
    Ranger: {
      1: ["Favored Enemy", "Natural Explorer"],
      2: ["Fighting Style", "Spellcasting"],
      3: ["Ranger Archetype (subclass)"],
      5: ["Extra Attack"],
      8: ["Land's Stride"],
      10: ["Hide in Plain Sight"],
      14: ["Vanish"],
      20: ["Foe Slayer"]
    },
    Rogue: {
      1: ["Expertise", "Sneak Attack", "Thieves' Cant"],
      2: ["Cunning Action"],
      3: ["Roguish Archetype (subclass)"],
      5: ["Uncanny Dodge"],
      6: ["Expertise"],
      7: ["Evasion"],
      11: ["Reliable Talent"],
      14: ["Blindsense"],
      15: ["Slippery Mind"],
      18: ["Elusive"],
      20: ["Stroke of Luck"]
    },
    Sorcerer: {
      1: ["Spellcasting", "Sorcerous Origin (subclass)"],
      2: ["Font of Magic"],
      3: ["Metamagic", "2nd-level spells"],
      5: ["3rd-level spells"],
      20: ["Sorcerous Restoration"]
    },
    Warlock: {
      1: ["Otherworldly Patron (subclass)", "Pact Magic"],
      2: ["Eldritch Invocations"],
      3: ["Pact Boon"],
      5: ["3rd-level pact slots"],
      11: ["Mystic Arcanum (6th)"],
      20: ["Eldritch Master"]
    },
    Wizard: {
      1: ["Spellcasting", "Arcane Recovery"],
      2: ["Arcane Tradition (subclass)"],
      5: ["3rd-level spells"],
      18: ["Spell Mastery"],
      20: ["Signature Spells"]
    }
  };

  function spellNote(cls, level) {
    var full = ["Bard", "Cleric", "Druid", "Sorcerer", "Wizard"];
    var half = ["Paladin", "Ranger"];
    if (full.indexOf(cls) >= 0) {
      if (level === 3) return "2nd-level slots just opened. Prepare or learn actual 2nd-level spells — the list grew.";
      if (level === 5) return "3rd-level slots. Fireball, revivify, counterspell territory. Pick them or you are still a 2nd-level caster with a bigger number.";
      if (level === 7) return "4th-level slots. Banished, blighted, or walled — write the new spells down.";
      if (level === 9) return "5th-level slots. This is the jump people forget to prepare for.";
      if (level === 11) return "6th-level slot (one). A daily hammer. Name it.";
      if (level === 13) return "7th-level slot.";
      if (level === 15) return "8th-level slot.";
      if (level === 17) return "9th-level slot. The top of the list.";
    }
    if (half.indexOf(cls) >= 0) {
      if (level === 2) return "Spellcasting starts. 1st-level slots. Write two prepared spells or you will forget you have them.";
      if (level === 5) return "2nd-level slots for a half-caster.";
      if (level === 9) return "3rd-level slots.";
      if (level === 13) return "4th-level slots.";
      if (level === 17) return "5th-level slots.";
    }
    if (cls === "Warlock") {
      if (level === 3) return "Pact slots become 2nd-level. Short-rest reload. Update the card.";
      if (level === 5) return "Pact slots become 3rd-level.";
      if (level === 7) return "Pact slots become 4th-level.";
      if (level === 9) return "Pact slots become 5th-level.";
    }
    return "";
  }

  function why(title) {
    var t = title.toLowerCase();
    if (t.indexOf("extra attack") >= 0) return "Read aloud: you swing twice when you take the Attack action. If you only raised the level, you are still fighting like last session.";
    if (t.indexOf("unarmored") >= 0) return "Read aloud: your AC is 10 + Dex + Con (or Wis, monk). Write the number or you will use leather you no longer need.";
    if (t.indexOf("rage") >= 0) return "Read aloud: bonus action, resist physical, extra rage damage. Mark uses. Sitting angry is not raging.";
    if (t.indexOf("subclass") >= 0 || t.indexOf("path") >= 0 || t.indexOf("college") >= 0 || t.indexOf("domain") >= 0 || t.indexOf("oath") >= 0 || t.indexOf("tradition") >= 0 || t.indexOf("origin") >= 0 || t.indexOf("patron") >= 0 || t.indexOf("archetype") >= 0 || t.indexOf("circle") >= 0) {
      return "Read aloud: this is the fork. Champion or Battlemaster, Life or Trickery, Fiend or Archfey. If the field is blank you leveled up and skipped the character.";
    }
    if (t.indexOf("asi") >= 0 || t.indexOf("feat") >= 0) return "Read aloud: +2 to a score, or a feat. Fighters get extra ones at 6 and 14. Rogues at 10. If nothing is written, those points are on the floor.";
    if (t.indexOf("sneak") >= 0) return "Read aloud: sneak attack dice are ceil(level/2) d6. Update the line or you are leaving damage in the book.";
    if (t.indexOf("action surge") >= 0) return "Read aloud: once per short rest, a whole extra action. Mark it.";
    if (t.indexOf("cunning") >= 0) return "Read aloud: bonus action Dash, Disengage, or Hide. This is why rogues feel fast.";
    if (t.indexOf("spell") >= 0) return "Read aloud: new slot level means new spells prepared or learned. A bigger slot with last month’s list is a waste.";
    if (t.indexOf("proficiency") >= 0) return "Read aloud: attacks, saves, and skills you are trained in all tick up. Recalc the sheet.";
    if (t.indexOf("hit point") >= 0) return "Read aloud: roll the hit die or take the average, plus CON. Level is not HP.";
    return "Read aloud: this landed at this level in the 2014 PHB. Mark it claimed when the player actually picks or writes it.";
  }

  NB.coachItems = function (pc) {
    var cls = pc.className;
    var level = Math.max(1, Math.min(20, pc.level | 0));
    var claimed = pc.claimed || {};
    var items = [];
    var die = hd(cls);
    var known = !!HIT[cls];

    if (!known) {
      items.push({
        id: "need-class",
        kind: "warn",
        title: "No class on this blade",
        body: "Pick a 2014 PHB class so the coach can tell you what they should have gained.",
        why: "Without a class, a level is just a number.",
        level: level
      });
      return items.filter(function (it) { return !claimed[it.id]; });
    }

    items.push({
      id: "hp-" + level,
      kind: "hp",
      title: "Hit points at level " + level,
      body: level === 1
        ? ("Level 1: take " + die + " + CON modifier, not a roll.")
        : ("Roll 1d" + die + " or take " + avg(die) + ", then add CON. If you only changed the level, the meat is still last session’s meat."),
      why: why("hit points"),
      level: level
    });

    var pNow = prof(level);
    var pPrev = level > 1 ? prof(level - 1) : 1;
    if (level === 1 || pNow > pPrev) {
      items.push({
        id: "prof-" + pNow,
        kind: "prof",
        title: "Proficiency bonus is +" + pNow,
        body: "It ticks at 1, 5, 9, 13, 17. Attacks, trained skills, and spell DCs move with it.",
        why: why("proficiency"),
        level: level
      });
    }

    var L, feats, i, name, id, note;
    for (L = 1; L <= level; L++) {
      feats = (FEATURES[cls] && FEATURES[cls][L]) || [];
      for (i = 0; i < feats.length; i++) {
        name = feats[i];
        id = (cls + "-" + L + "-" + name).toLowerCase().replace(/[^a-z0-9]+/g, "-");
        items.push({
          id: id,
          kind: "feature",
          title: name + " (level " + L + ")",
          body: name + " comes online at " + cls + " " + L + ".",
          why: why(name),
          level: L
        });
      }
      note = spellNote(cls, L);
      if (note) {
        items.push({
          id: cls.toLowerCase() + "-slots-" + L,
          kind: "slots",
          title: "Spell slots jumped at " + L,
          body: note,
          why: why("spell"),
          level: L
        });
      }
    }

    if (cls === "Rogue") {
      items.push({
        id: "rogue-sneak-" + level,
        kind: "feature",
        title: "Sneak Attack is " + Math.ceil(level / 2) + "d6",
        body: "Write the current dice. Advantage or an ally within 5 feet of the target, once per turn.",
        why: why("sneak"),
        level: level
      });
    }

    var subAt = SUBCLASS_AT[cls];
    if (subAt && level >= subAt && !(pc.subclass && String(pc.subclass).trim())) {
      items.push({
        id: "subclass-missing",
        kind: "warn",
        title: "You haven’t marked a subclass yet",
        body: cls + " chooses at level " + subAt + ". The sheet is still the generic class. Name the path, college, domain, oath, or patron.",
        why: why("subclass"),
        level: subAt
      });
    }

    var asis = asiLevels(cls);
    var rec = pc.asiAt || {};
    for (i = 0; i < asis.length; i++) {
      L = asis[i];
      if (level >= L && !rec[String(L)]) {
        items.push({
          id: "asi-" + L,
          kind: "warn",
          title: "No ASI / feat recorded for level " + L,
          body: cls + " gets an Ability Score Improvement or a feat at " + L + ". Put +2, +1/+1, or the feat name on the card.",
          why: why("asi feat"),
          level: L
        });
      }
    }

    return items.filter(function (it) { return !claimed[it.id]; });
  };

  NB.profBonus = prof;
  NB.hitDie = hd;
  NB.subclassLevel = function (cls) { return SUBCLASS_AT[cls] || 3; };
  NB.asiLevels = asiLevels;
})(window.NB = window.NB || {});
