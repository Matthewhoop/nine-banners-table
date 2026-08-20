/* global window, document, NB */
(function () {
  var S = NB.loadState();
  var sess = NB.loadSession() || { role: null, name: "", pin: "" };
  var panel = "stage";
  var t = 0;
  var localShown = 0;
  var typeAcc = 0;
  var lastBeatSig = "";
  var canvas, ctx;
  var lastTs = 0;
  var viewW = 240, viewH = 160, dpr = 1;
  var reduceMotion = false;
  try {
    reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) { reduceMotion = false; }

  function $(id) { return document.getElementById(id); }
  function scene() { return NB.SCENES[S.sceneId] || NB.SCENES.inn; }
  function isDM() { return sess.role === "dm"; }
  function persist() { NB.saveState(S, true); }
  function isFaceoff() { return S.stageMode === "faceoff"; }

  function myPc() {
    if (!sess.name) return S.party[0] || null;
    var n = sess.name.toLowerCase();
    return S.party.find(function (p) { return p.name.toLowerCase() === n; }) || (isDM() ? null : S.party[0]) || null;
  }

  function visibleParty() {
    if (isDM()) return S.party;
    var me = myPc();
    return me ? [me] : [];
  }

  function sceneBeats(sc) {
    if (sc && sc.beats && sc.beats.length) return sc.beats.slice();
    return [(sc && sc.narration) || ""];
  }

  function beatSig(b) {
    b = b || S.beat || {};
    return String(b.speakerId || "") + "|" + (b.index || 0) + "|" + ((b.lines || []).join("\n"));
  }

  function setBeat(beat, resetType) {
    S.beat = beat;
    lastBeatSig = beatSig(beat);
    if (resetType !== false) {
      localShown = reduceMotion ? 9999 : 0;
      typeAcc = 0;
    }
  }

  function ensureBeat() {
    if (!S.beat || !S.beat.lines || !S.beat.lines.length) {
      setBeat({ speakerId: null, lines: sceneBeats(scene()), index: 0 }, true);
    }
  }

  function currentLine() {
    ensureBeat();
    var lines = S.beat.lines || [];
    var i = Math.max(0, Math.min(lines.length - 1, S.beat.index | 0));
    return lines[i] || "";
  }

  /* ——— Join ——— */
  function paintJoinBanners() {
    var el = $("join-banners");
    el.innerHTML = "";
    NB.BANNER_COLORS.forEach(function (c, i) {
      var b = document.createElement("i");
      b.style.background = c;
      b.style.animationDelay = (i * 0.18) + "s";
      el.appendChild(b);
    });
  }

  function showJoin() {
    $("view-join").classList.remove("hidden");
    $("view-table").classList.add("hidden");
  }

  function enterTable() {
    $("view-join").classList.add("hidden");
    $("view-table").classList.remove("hidden");
    NB.saveSession(sess);
    if (S.party.length === 0 && sess.role === "player") {
      S.party.push(NB.newPc(sess.name, NB.PC_COLORS[0]));
      persist();
    } else if (sess.role === "player" && sess.name) {
      var exists = S.party.some(function (p) { return p.name.toLowerCase() === sess.name.toLowerCase(); });
      if (!exists) {
        S.party.push(NB.newPc(sess.name, NB.PC_COLORS[S.party.length % NB.PC_COLORS.length]));
        persist();
      }
    }
    if (S.stageMode === "overworld") S.stageMode = "story";
    ensureBeat();
    lastBeatSig = beatSig();
    renderChrome();
    renderPanel();
    fitCanvas();
  }

  function parseQuery() {
    var q = new URLSearchParams(location.search);
    if (q.get("dm") === "1" || q.get("role") === "dm") {
      sess.role = "dm";
      sess.pin = q.get("pin") || S.pin || NB.DEFAULT_PIN;
      S.pin = sess.pin;
    }
    if (q.get("name")) {
      sess.role = sess.role || "player";
      sess.name = q.get("name");
    }
    if (q.get("scene") && NB.SCENES[q.get("scene")] && sess.role === "dm") {
      S.sceneId = q.get("scene");
      S.stageMode = "story";
      S.faceoff = null;
      setBeat({ speakerId: null, lines: sceneBeats(scene()), index: 0 }, true);
    }
  }

  /* ——— Chrome / panels ——— */
  function renderChrome() {
    var sc = scene();
    $("top-scene").textContent = sc.name;
    $("top-code").textContent = S.tableCode;
    $("top-role").textContent = isDM() ? "DM" : (sess.name || "player");
    $("btn-role").textContent = isDM() ? "DM" : "Player";
    $("dm-stage-tools").classList.toggle("hidden", !isDM());
    $("btn-add-pc").classList.toggle("hidden", !isDM());
    $("party-lede").textContent = isDM() ? "Every blade at the table. Thumbs on the HP." : "Your contract. Your blood.";
    $("story-page").classList.toggle("faceoff", isFaceoff());
    $("faceoff-ui").classList.toggle("hidden", !isFaceoff());
    $("cast-strip").classList.toggle("hidden", isFaceoff());
    $("btn-faceoff").textContent = isFaceoff() ? "End face-off" : "Face-off";
    renderCast();
    renderCaption();
    if (isFaceoff()) renderFaceoffUI();
    fitCanvas();
  }

  function renderCast() {
    var row = $("cast-strip");
    row.innerHTML = "";
    if (isFaceoff()) return;
    var speaker = S.beat && S.beat.speakerId;
    (scene().present || []).forEach(function (id) {
      var n = NB.NPCS[id];
      if (!n) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cast-card" + (speaker === id ? " on" : "");
      b.setAttribute("data-npc", id);
      b.setAttribute("role", "listitem");
      b.title = "Hear " + n.name;
      var cv = document.createElement("canvas");
      cv.width = 52;
      cv.height = 52;
      cv.setAttribute("aria-hidden", "true");
      var lab = document.createElement("span");
      lab.textContent = n.name.split(" ")[0];
      b.appendChild(cv);
      b.appendChild(lab);
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        hearNpc(id);
      });
      row.appendChild(b);
      NB.paintPortrait(cv, n.sprite || id);
    });
  }

  function renderCaption() {
    ensureBeat();
    var sc = scene();
    var n = S.beat.speakerId && NB.NPCS[S.beat.speakerId];
    var loc = $("cap-loc");
    var spk = $("cap-speaker");
    var bust = $("cap-bust");
    loc.textContent = sc.name;
    if (n) {
      spk.textContent = n.name;
      spk.classList.remove("hidden");
      bust.classList.remove("hidden");
      NB.paintPortrait(bust, n.sprite || n.id);
    } else {
      spk.textContent = "";
      spk.classList.add("hidden");
      bust.classList.add("hidden");
    }
    var full = currentLine();
    if (localShown > full.length) localShown = full.length;
    $("cap-nar").textContent = full.slice(0, localShown);
    var more = localShown < full.length || (S.beat.index | 0) < (S.beat.lines.length - 1);
    $("cap-hint").classList.toggle("hidden", !more);
    $("cap-hint").textContent = localShown < full.length ? "tap to finish" : "tap to continue";
  }

  function hearNpc(id) {
    var n = NB.NPCS[id];
    if (!n || !n.lines || !n.lines.length) return;
    var pick = n.lines[Math.floor(Math.random() * n.lines.length)];
    setBeat({ speakerId: id, lines: [pick], index: 0 }, true);
    persist();
    renderChrome();
  }

  function tapCaption() {
    ensureBeat();
    var full = currentLine();
    if (localShown < full.length) {
      localShown = full.length;
      renderCaption();
      return;
    }
    if ((S.beat.index | 0) < S.beat.lines.length - 1) {
      S.beat.index = (S.beat.index | 0) + 1;
      lastBeatSig = beatSig();
      localShown = reduceMotion ? 9999 : 0;
      typeAcc = 0;
      persist();
      renderCaption();
    }
  }

  function setPanel(name) {
    panel = name;
    ["stage", "party", "people", "dice"].forEach(function (p) {
      $("panel-" + p).classList.toggle("hidden", p !== name);
    });
    document.querySelectorAll(".dock-btn").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-panel") === name);
    });
    if (name !== "stage") renderPanel();
    if (name === "stage") fitCanvas();
  }

  function renderPanel() {
    if (panel === "party") renderParty();
    if (panel === "people") renderPeople();
    if (panel === "dice") renderDice();
  }

  /* ——— Party + coach ——— */
  function renderParty() {
    var mount = $("coach-mount");
    mount.innerHTML = "";
    var list = $("party-list");
    list.innerHTML = "";
    var pcs = visibleParty();
    if (!pcs.length) {
      list.innerHTML = "<p class='sheet-lede'>No blades yet. " + (isDM() ? "Add one." : "Join with a name.") + "</p>";
    }
    pcs.forEach(function (pc) {
      var items = NB.coachItems(pc);
      if (items.length) {
        items.slice(0, 6).forEach(function (it) {
          var c = document.createElement("div");
          c.className = "coach-card";
          c.innerHTML = "<h3>Coach · " + escapeHtml(pc.name) + "</h3>" +
            "<p><b>" + escapeHtml(it.title) + "</b></p>" +
            "<p>" + escapeHtml(it.body) + "</p>" +
            "<p class='coach-why'>" + escapeHtml(it.why) + "</p>" +
            "<div class='coach-actions'><button type='button' data-claim='" + it.id + "' data-pc='" + pc.id + "'>Claimed</button></div>";
          mount.appendChild(c);
        });
      }
      list.appendChild(pcCard(pc));
    });
    mount.querySelectorAll("[data-claim]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var pc = S.party.find(function (p) { return p.id === btn.getAttribute("data-pc"); });
        if (!pc) return;
        pc.claimed = pc.claimed || {};
        pc.claimed[btn.getAttribute("data-claim")] = true;
        if (btn.getAttribute("data-claim").indexOf("asi-") === 0) {
          pc.asiAt = pc.asiAt || {};
          pc.asiAt[btn.getAttribute("data-claim").slice(4)] = "claimed";
        }
        persist();
        renderParty();
      });
    });
  }

  function pcCard(pc) {
    var el = document.createElement("div");
    el.className = "pc-card";
    var cond = (pc.conditions || []).map(function (c) {
      return "<span class='tag on'>" + escapeHtml(c) + "</span>";
    }).join("");
    el.innerHTML =
      "<div class='pc-head'><div><p class='pc-name'>" + escapeHtml(pc.name) + "</p>" +
      "<p class='pc-meta'>" + escapeHtml(pc.className) + " " + pc.level +
      (pc.subclass ? " · " + escapeHtml(pc.subclass) : "") +
      " · AC " + pc.ac + " · +" + NB.profBonus(pc.level) + "</p></div></div>" +
      "<div class='hp-row'>" +
      "<button type='button' class='hp-big' data-hp='-1' data-pc='" + pc.id + "'>−</button>" +
      "<div class='hp-read'><b>" + pc.hp + "</b> / " + pc.maxHp + "</div>" +
      "<button type='button' class='hp-big' data-hp='1' data-pc='" + pc.id + "'>+</button>" +
      "</div>" +
      "<div class='tags'>" + cond + "</div>" +
      "<div class='coach-actions' style='margin-top:10px'>" +
      "<button type='button' data-edit='" + pc.id + "'>Edit</button>" +
      "<button type='button' data-cond='" + pc.id + "'>Conditions</button>" +
      "</div>";
    el.querySelectorAll("[data-hp]").forEach(function (b) {
      b.addEventListener("click", function () {
        bumpHp(b.getAttribute("data-pc"), parseInt(b.getAttribute("data-hp"), 10));
      });
    });
    el.querySelector("[data-edit]").addEventListener("click", function () { openPcEditor(pc.id); });
    el.querySelector("[data-cond]").addEventListener("click", function () { openConditions(pc.id); });
    return el;
  }

  function bumpHp(id, d) {
    var pc = S.party.find(function (p) { return p.id === id; });
    if (!pc) return;
    pc.hp = Math.max(0, Math.min(pc.maxHp, (pc.hp | 0) + d));
    persist();
    renderParty();
    if (isFaceoff()) renderFaceoffUI();
  }

  /* ——— People ——— */
  function renderPeople() {
    var box = $("npc-list");
    box.innerHTML = "";
    Object.keys(NB.NPCS).forEach(function (id) {
      var n = NB.NPCS[id];
      var card = document.createElement("button");
      card.type = "button";
      card.className = "npc-card";
      card.innerHTML = "<h3>" + escapeHtml(n.name) + "</h3><p class='house'>" + escapeHtml(n.house) + "</p>" +
        "<p class='npc-bio'>" + escapeHtml(n.bio) + "</p>";
      card.addEventListener("click", function () { card.classList.toggle("open"); });
      box.appendChild(card);
    });
  }

  /* ——— Dice ——— */
  function renderDice() {
    var g = $("dice-grid");
    if (!g.childElementCount) {
      [4, 6, 8, 10, 12, 20].forEach(function (sides) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = "d" + sides;
        b.addEventListener("click", function () { roll(sides); });
        g.appendChild(b);
      });
    }
    var lr = S.lastRoll;
    $("last-roll").textContent = lr ? (lr.value + " / d" + lr.sides) : "—";
  }

  function roll(sides) {
    var value = 1 + Math.floor(Math.random() * sides);
    S.lastRoll = { sides: sides, value: value, who: sess.name || sess.role, at: Date.now() };
    persist();
    $("last-roll").textContent = value + " / d" + sides;
  }

  /* ——— Face-off ——— */
  function renderFaceoffUI() {
    var fo = S.faceoff || {};
    var me = myPc();
    $("fo-pc-name").textContent = me ? me.name : "You";
    var pct = me ? Math.max(0, Math.min(100, (me.hp / Math.max(1, me.maxHp)) * 100)) : 70;
    $("fo-pc-hp").style.width = pct + "%";
    var opp = fo.opponentId && NB.NPCS[fo.opponentId];
    $("fo-op-name").textContent = fo.title || (opp ? opp.name : "Across the stones");
    $("fo-op-hp").style.width = (fo.kind === "combat" ? "80%" : "100%");
    $("fo-bar-op").style.visibility = fo.kind === "task" || fo.kind === "lock" || fo.kind === "toast" ? "hidden" : "visible";
    $("fo-sub").textContent = S.lastAction || fo.sub || "The table is looking at this.";
    var act = $("fo-cmds").querySelector("[data-cmd='act']");
    if (act) act.textContent = fo.kind === "combat" ? "Fight" : "Act";
  }

  function endFaceoff() {
    S.stageMode = "story";
    S.faceoff = null;
    S.lastAction = "";
    setBeat({ speakerId: null, lines: sceneBeats(scene()), index: 0 }, true);
    persist();
    renderChrome();
  }

  function faceoffCmd(cmd) {
    var lines = {
      speak: "You keep your voice even. The room listens — or pretends not to.",
      look: "Hands, exits, cups, and who is watching Sera.",
      act: "You do the thing. The table will say how it lands.",
      fight: "Steel clears its throat. Say the target.",
      leave: ""
    };
    if (cmd === "leave") {
      endFaceoff();
      return;
    }
    if (cmd === "act" && S.faceoff && S.faceoff.kind === "combat") cmd = "fight";
    S.lastAction = lines[cmd] || lines.act;
    setBeat({ speakerId: null, lines: [S.lastAction], index: 0 }, true);
    persist();
    renderCaption();
    renderFaceoffUI();
  }

  /* ——— Draw ——— */
  function fitCanvas() {
    if (!canvas) return;
    var wrap = $("story-art");
    if (!wrap) return;
    var r = wrap.getBoundingClientRect();
    viewW = Math.max(1, Math.round(r.width));
    viewH = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var bw = Math.max(1, Math.round(viewW * dpr));
    var bh = Math.max(1, Math.round(viewH * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    canvas.style.width = viewW + "px";
    canvas.style.height = viewH + "px";
  }

  function draw() {
    if (!ctx || panel !== "stage") return;
    if (viewW < 8 || viewH < 8) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    var sc = scene();
    NB.drawSceneCover(ctx, sc, isFaceoff() ? "faceoff" : "story", viewW, viewH);
    if (!isFaceoff()) return;
    var me = myPc();
    var figH = Math.max(72, Math.round(viewH * 0.48));
    var ground = Math.round(viewH * 0.86);
    NB.drawActor(ctx, "player", Math.round(viewW * 0.30), ground, {
      t: t, h: figH, facing: "right", label: me ? me.name : "You"
    });
    var oid = (S.faceoff && S.faceoff.opponentId) || "dreth";
    var n = NB.NPCS[oid];
    NB.drawActor(ctx, (n && n.sprite) || oid, Math.round(viewW * 0.70), ground, {
      t: t, h: figH, facing: "left", label: n ? n.name.split(" ")[0] : ""
    });
  }

  function loop(ts) {
    var dt = lastTs ? Math.min(48, ts - lastTs) : 16;
    lastTs = ts;
    t += 1;
    if (S.beat) {
      var full = currentLine();
      if (localShown < full.length) {
        typeAcc += dt;
        var delay = reduceMotion ? 0 : 22;
        if (delay === 0) {
          localShown = full.length;
        } else {
          while (typeAcc > delay && localShown < full.length) {
            localShown += 1;
            typeAcc -= delay;
          }
        }
        var el = $("cap-nar");
        if (el) el.textContent = full.slice(0, localShown);
        var more = localShown < full.length || (S.beat.index | 0) < (S.beat.lines.length - 1);
        var hint = $("cap-hint");
        if (hint) {
          hint.classList.toggle("hidden", !more);
          hint.textContent = localShown < full.length ? "tap to finish" : "tap to continue";
        }
      }
    }
    draw();
    requestAnimationFrame(loop);
  }

  /* ——— Modals ——— */
  function openModal(html) {
    $("modal-card").innerHTML = html;
    $("modal").classList.remove("hidden");
  }
  function closeModal() { $("modal").classList.add("hidden"); }

  function applyScene(id) {
    S.sceneId = id;
    var sc = scene();
    S.px = sc.spawn.x;
    S.py = sc.spawn.y;
    S.stageMode = "story";
    S.faceoff = null;
    S.lastAction = "";
    setBeat({ speakerId: null, lines: sceneBeats(sc), index: 0 }, true);
    persist();
    renderChrome();
  }

  function openScenes() {
    var html = "<h3>Change the room</h3><p class='sheet-lede'>Everyone at the table sees the same page.</p><div class='choice-list'>";
    NB.SCENE_ORDER.forEach(function (id) {
      var sc = NB.SCENES[id];
      html += "<button type='button' data-scene='" + id + "'>" + escapeHtml(sc.name) + "</button>";
    });
    html += "</div><div class='modal-actions'><button type='button' class='btn ink' data-close>Back</button></div>";
    openModal(html);
    $("modal-card").querySelectorAll("[data-scene]").forEach(function (b) {
      b.addEventListener("click", function () {
        applyScene(b.getAttribute("data-scene"));
        closeModal();
      });
    });
    $("modal-card").querySelector("[data-close]").addEventListener("click", closeModal);
  }

  function openFaceoffPick() {
    if (isFaceoff()) {
      endFaceoff();
      return;
    }
    var html = "<h3>Face-off</h3><p class='sheet-lede'>A tense beat. The table looks at the confrontation — Speak / Look / Act / Leave.</p><div class='choice-list'>";
    NB.FACEOFF_KINDS.forEach(function (k) {
      html += "<button type='button' data-kind='" + k.id + "'>" + escapeHtml(k.label) + "</button>";
    });
    html += "</div><label style='display:block;margin-top:10px'>Across from them";
    html += "<select id='fo-opp'>";
    Object.keys(NB.NPCS).forEach(function (id) {
      html += "<option value='" + id + "'>" + escapeHtml(NB.NPCS[id].name) + "</option>";
    });
    html += "</select></label>";
    html += "<div class='modal-actions'><button type='button' class='btn ink' data-close>Back</button></div>";
    openModal(html);
    $("modal-card").querySelectorAll("[data-kind]").forEach(function (b) {
      b.addEventListener("click", function () {
        var kind = b.getAttribute("data-kind");
        var meta = NB.FACEOFF_KINDS.find(function (k) { return k.id === kind; });
        S.stageMode = "faceoff";
        S.faceoff = { kind: kind, opponentId: $("fo-opp").value, title: meta.label, sub: meta.sub };
        S.lastAction = meta.sub;
        setBeat({ speakerId: S.faceoff.opponentId, lines: [meta.sub], index: 0 }, true);
        persist();
        closeModal();
        renderChrome();
      });
    });
    $("modal-card").querySelector("[data-close]").addEventListener("click", closeModal);
  }

  function openPcEditor(id) {
    var pc = id ? S.party.find(function (p) { return p.id === id; }) : NB.newPc("New blade", NB.PC_COLORS[S.party.length % NB.PC_COLORS.length]);
    var isNew = !id;
    var skillBoxes = NB.SKILLS.map(function (sk) {
      var on = (pc.skills || []).indexOf(sk) >= 0;
      return "<label><input type='checkbox' value='" + sk + "'" + (on ? " checked" : "") + "> " + sk + "</label>";
    }).join("");
    var classOpts = NB.CLASSES.map(function (c) {
      return "<option" + (c === pc.className ? " selected" : "") + ">" + c + "</option>";
    }).join("");
    openModal(
      "<h3>" + (isNew ? "Add a blade" : "Edit " + escapeHtml(pc.name)) + "</h3>" +
      "<div class='form-grid'>" +
      "<label>Name<input id='e-name' value='" + escapeAttr(pc.name) + "'></label>" +
      "<label>Class<select id='e-class'>" + classOpts + "</select></label>" +
      "<label>Level (1–20)<input id='e-level' type='number' min='1' max='20' value='" + pc.level + "'></label>" +
      "<label>HP current<input id='e-hp' type='number' value='" + pc.hp + "'></label>" +
      "<label>HP max<input id='e-max' type='number' value='" + pc.maxHp + "'></label>" +
      "<label>AC<input id='e-ac' type='number' value='" + pc.ac + "'></label>" +
      "<label>Subclass<input id='e-sub' value='" + escapeAttr(pc.subclass || "") + "' placeholder='e.g. Champion'></label>" +
      "<label>Notes<textarea id='e-notes'>" + escapeHtml(pc.notes || "") + "</textarea></label>" +
      "</div><p class='sheet-lede'>Proficient skills</p><div class='skill-grid' id='e-skills'>" + skillBoxes + "</div>" +
      "<div class='modal-actions'><button type='button' class='btn brass' id='e-save'>Save</button>" +
      "<button type='button' class='btn ink' data-close>Back</button></div>" +
      (isNew || !isDM() ? "" : "<button type='button' class='btn ink' id='e-del' style='width:100%;margin-top:8px'>Remove</button>")
    );
    $("e-save").addEventListener("click", function () {
      var next = {
        name: $("e-name").value.trim() || pc.name,
        className: $("e-class").value,
        level: clamp($("e-level").value, 1, 20),
        hp: +$("e-hp").value || 0,
        maxHp: Math.max(1, +$("e-max").value || 1),
        ac: +$("e-ac").value || 10,
        subclass: $("e-sub").value.trim(),
        notes: $("e-notes").value,
        skills: Array.prototype.map.call($("e-skills").querySelectorAll("input:checked"), function (i) { return i.value; })
      };
      if (isNew) {
        var np = NB.newPc(next.name, NB.PC_COLORS[S.party.length % NB.PC_COLORS.length]);
        Object.assign(np, next);
        S.party.push(np);
      } else {
        Object.assign(pc, next);
        if (pc.hp > pc.maxHp) pc.hp = pc.maxHp;
      }
      persist();
      closeModal();
      renderParty();
    });
    $("modal-card").querySelector("[data-close]").addEventListener("click", closeModal);
    var del = $("e-del");
    if (del) del.addEventListener("click", function () {
      S.party = S.party.filter(function (p) { return p.id !== pc.id; });
      persist();
      closeModal();
      renderParty();
    });
  }

  function openConditions(id) {
    var pc = S.party.find(function (p) { return p.id === id; });
    if (!pc) return;
    var html = "<h3>Conditions · " + escapeHtml(pc.name) + "</h3><div class='tags' id='cond-tags'>";
    NB.CONDITIONS.forEach(function (c) {
      var on = (pc.conditions || []).indexOf(c) >= 0;
      html += "<button type='button' class='tag" + (on ? " on" : "") + "' data-c='" + c + "'>" + c + "</button>";
    });
    html += "</div><div class='modal-actions'><button type='button' class='btn brass' data-close>Done</button></div>";
    openModal(html);
    $("cond-tags").addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-c]");
      if (!b) return;
      var c = b.getAttribute("data-c");
      pc.conditions = pc.conditions || [];
      var i = pc.conditions.indexOf(c);
      if (i >= 0) pc.conditions.splice(i, 1);
      else pc.conditions.push(c);
      b.classList.toggle("on");
      persist();
      renderParty();
    });
    $("modal-card").querySelector("[data-close]").addEventListener("click", closeModal);
  }

  function openRole() {
    if (isDM()) {
      sess.role = "player";
      if (!sess.name) sess.name = "Blade";
      NB.saveSession(sess);
      renderChrome();
      renderPanel();
      return;
    }
    openModal(
      "<h3>Open as DM</h3><div class='form-grid'><label>Table PIN<input id='role-pin' value='' placeholder='PIN' autocapitalize='characters'></label></div>" +
      "<div class='modal-actions'><button type='button' class='btn brass' id='role-go'>Enter</button>" +
      "<button type='button' class='btn ink' data-close>Back</button></div>"
    );
    $("role-go").addEventListener("click", function () {
      var pin = ($("role-pin").value || "").trim().toUpperCase();
      if (pin !== String(S.pin || NB.DEFAULT_PIN).toUpperCase()) {
        $("role-pin").style.borderColor = "#9a2f2a";
        return;
      }
      sess.role = "dm";
      sess.pin = pin;
      NB.saveSession(sess);
      closeModal();
      renderChrome();
      renderPanel();
    });
    $("modal-card").querySelector("[data-close]").addEventListener("click", closeModal);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/`/g, ""); }
  function clamp(v, a, b) { v = parseInt(v, 10); if (isNaN(v)) v = a; return Math.max(a, Math.min(b, v)); }

  /* ——— Bind ——— */
  function bind() {
    paintJoinBanners();
    $("join-code").textContent = S.tableCode;
    $("btn-open-dm").addEventListener("click", function () {
      $("form-dm").classList.remove("hidden");
      $("form-player").classList.add("hidden");
    });
    $("btn-show-player").addEventListener("click", function () {
      $("form-player").classList.remove("hidden");
      $("form-dm").classList.add("hidden");
    });
    $("form-dm").addEventListener("submit", function (e) {
      e.preventDefault();
      sess.role = "dm";
      sess.pin = ($("input-pin").value || NB.DEFAULT_PIN).trim().toUpperCase() || NB.DEFAULT_PIN;
      S.pin = sess.pin;
      persist();
      enterTable();
    });
    $("form-player").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = ($("input-name").value || "").trim();
      if (!name) { $("input-name").focus(); return; }
      sess.role = "player";
      sess.name = name;
      enterTable();
    });

    document.querySelectorAll(".dock-btn").forEach(function (b) {
      b.addEventListener("click", function () { setPanel(b.getAttribute("data-panel")); });
    });
    $("btn-role").addEventListener("click", openRole);
    $("btn-scenes").addEventListener("click", openScenes);
    $("btn-faceoff").addEventListener("click", openFaceoffPick);
    $("btn-add-pc").addEventListener("click", function () { openPcEditor(null); });
    $("story-caption").addEventListener("click", tapCaption);
    $("story-art").addEventListener("click", function (ev) {
      if (ev.target.closest(".cast-card")) return;
      tapCaption();
    });
    $("fo-cmds").addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-cmd]");
      if (b) faceoffCmd(b.getAttribute("data-cmd"));
    });
    $("modal").addEventListener("click", function (ev) {
      if (ev.target.id === "modal") closeModal();
    });

    window.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        if (panel === "stage") {
          tapCaption();
          e.preventDefault();
        }
      }
      if (e.key === "Escape" && !$("modal").classList.contains("hidden")) closeModal();
    });
    window.addEventListener("resize", fitCanvas);
  }

  NB.onRemoteState(function (next) {
    S = next;
    if (S.stageMode === "overworld") S.stageMode = "story";
    if (beatSig() !== lastBeatSig) {
      localShown = reduceMotion ? 9999 : 0;
      typeAcc = 0;
      lastBeatSig = beatSig();
    }
    renderChrome();
    renderPanel();
  });

  canvas = $("stage");
  ctx = canvas.getContext("2d");
  bind();
  parseQuery();
  NB.loadArt().then(function () {
    if (sess.role) enterTable();
    else showJoin();
    requestAnimationFrame(loop);
  });
})();
