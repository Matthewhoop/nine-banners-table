/* global window, document, NB */
(function () {
  var S = NB.loadState();
  var sess = NB.loadSession() || { role: null, name: "", pin: "" };
  var panel = "stage";
  var keys = { up: false, down: false, left: false, right: false };
  var t = 0;
  var walking = false;
  var dialogue = null; // { npcId, line, shown, full }
  var typeAcc = 0;
  var canvas, ctx, bust;
  var lastTs = 0;

  function $(id) { return document.getElementById(id); }
  function scene() { return NB.SCENES[S.sceneId] || NB.SCENES.inn; }
  function isDM() { return sess.role === "dm"; }
  function persist() { NB.saveState(S, true); }

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
    var sc = scene();
    if (S.px == null) { S.px = sc.spawn.x; S.py = sc.spawn.y; }
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
    }
  }

  /* ——— Chrome / panels ——— */
  function renderChrome() {
    var sc = scene();
    $("top-scene").textContent = sc.name;
    $("top-code").textContent = S.tableCode;
    $("top-role").textContent = isDM() ? "DM" : (sess.name || "player");
    $("btn-role").textContent = isDM() ? "DM" : "Player";
    $("cap-loc").textContent = sc.name;
    $("cap-nar").textContent = sc.narration;
    $("dm-stage-tools").classList.toggle("hidden", !isDM());
    $("btn-add-pc").classList.toggle("hidden", !isDM());
    $("party-lede").textContent = isDM() ? "Every blade at the table. Thumbs on the HP." : "Your contract. Your blood.";
    var row = $("present-row");
    row.innerHTML = "";
    (sc.present || []).forEach(function (id) {
      var n = NB.NPCS[id];
      if (!n) return;
      var s = document.createElement("span");
      s.className = "npc-chip";
      s.textContent = n.name;
      row.appendChild(s);
    });
    $("hud-overworld").classList.toggle("hidden", S.stageMode === "faceoff" || !!dialogue);
    $("faceoff-ui").classList.toggle("hidden", S.stageMode !== "faceoff");
    $("dialogue").classList.toggle("hidden", !dialogue);
    if (S.stageMode === "faceoff") renderFaceoffUI();
    if (dialogue) renderDialogueDOM();
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
    if (S.stageMode === "faceoff") renderFaceoffUI();
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

  /* ——— Dialogue ——— */
  function nearestNpc() {
    var sc = scene();
    var best = null, bestD = 22;
    (sc.npcs || []).forEach(function (n) {
      var dx = n.x - S.px, dy = n.y - S.py;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) { bestD = d; best = n; }
    });
    return best;
  }

  function startTalk(npcId) {
    var n = NB.NPCS[npcId];
    if (!n) return;
    var line = n.lines[Math.floor(Math.random() * n.lines.length)];
    dialogue = { npcId: npcId, line: 0, shown: 0, full: line };
    typeAcc = 0;
    $("hud-overworld").classList.add("hidden");
    $("dialogue").classList.remove("hidden");
    NB.drawBust(bust, n.sprite || npcId);
    $("dlg-name").textContent = n.name;
    $("dlg-text").textContent = "";
  }

  function lookAround() {
    dialogue = { npcId: null, line: 0, shown: 0, full: scene().narration };
    typeAcc = 0;
    $("hud-overworld").classList.add("hidden");
    $("dialogue").classList.remove("hidden");
    NB.drawBust(bust, "player");
    $("dlg-name").textContent = scene().name;
    $("dlg-text").textContent = "";
  }

  function advanceDialogue() {
    if (!dialogue) return;
    if (dialogue.shown < dialogue.full.length) {
      dialogue.shown = dialogue.full.length;
      $("dlg-text").textContent = dialogue.full;
      return;
    }
    closeDialogue();
  }

  function closeDialogue() {
    dialogue = null;
    $("dialogue").classList.add("hidden");
    if (S.stageMode !== "faceoff") $("hud-overworld").classList.remove("hidden");
  }

  function renderDialogueDOM() {
    if (!dialogue) return;
    $("dlg-text").textContent = dialogue.full.slice(0, dialogue.shown);
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
    $("fo-sub").textContent = S.lastAction || fo.sub || "The table is waiting.";
    var act = $("fo-cmds").querySelector("[data-cmd='act']");
    if (act) act.textContent = fo.kind === "combat" ? "Fight" : "Act";
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
      S.stageMode = "overworld";
      S.faceoff = null;
      S.lastAction = "";
      persist();
      renderChrome();
      return;
    }
    if (cmd === "act" && S.faceoff && S.faceoff.kind === "combat") cmd = "fight";
    S.lastAction = lines[cmd] || lines.act;
    persist();
    renderFaceoffUI();
  }

  /* ——— Movement ——— */
  function step(dt) {
    if (dialogue || S.stageMode === "faceoff" || panel !== "stage") { walking = false; return; }
    var vx = 0, vy = 0;
    if (keys.left) vx -= 1;
    if (keys.right) vx += 1;
    if (keys.up) vy -= 1;
    if (keys.down) vy += 1;
    walking = vx !== 0 || vy !== 0;
    if (!walking) return;
    if (vx < 0) S.facing = "left";
    else if (vx > 0) S.facing = "right";
    else if (vy < 0) S.facing = "up";
    else S.facing = "down";
    var sp = 38 * (dt / 1000);
    if (vx && vy) sp *= 0.72;
    var nx = S.px + vx * sp;
    var ny = S.py + vy * sp;
    var sc = scene();
    if (NB.walkable(sc, nx, S.py)) S.px = nx;
    if (NB.walkable(sc, S.px, ny)) S.py = ny;
  }

  /* ——— Draw ——— */
  function fitCanvas() {
    if (!canvas) return;
    canvas.width = NB.STAGE_W;
    canvas.height = NB.STAGE_H;
  }

  function draw() {
    if (!ctx) return;
    var sc = scene();
    NB.drawSceneBg(ctx, sc, S.stageMode);
    if (S.stageMode === "faceoff") {
      var me = myPc();
      NB.drawActor(ctx, "player", 70, 132, { t: t, h: 72, facing: "right", label: me ? me.name : "You" });
      var oid = (S.faceoff && S.faceoff.opponentId) || "dreth";
      var n = NB.NPCS[oid];
      NB.drawActor(ctx, (n && n.sprite) || oid, 176, 132, { t: t, h: 72, facing: "left", label: n ? n.name.split(" ")[0] : "" });
      return;
    }
    (sc.npcs || []).forEach(function (spot) {
      var n = NB.NPCS[spot.id];
      if (!n) return;
      NB.drawActor(ctx, n.sprite || spot.id, spot.x, spot.y, { t: t, h: 30, label: n.name.split(" ")[0] });
    });
    var followers = S.party.slice(0, 3);
    followers.forEach(function (pc, i) {
      if (i === 0) return;
      var fx = S.px - (i * 10);
      var fy = S.py + 2;
      NB.drawActor(ctx, "player", fx, fy, { t: t, walking: walking, facing: S.facing, h: 24 });
    });
    NB.drawActor(ctx, "player", S.px, S.py, { t: t, walking: walking, facing: S.facing, h: 32, label: (myPc() && myPc().name) || sess.name || "You" });
  }

  function loop(ts) {
    var dt = lastTs ? Math.min(48, ts - lastTs) : 16;
    lastTs = ts;
    t += 1;
    step(dt);
    if (dialogue && dialogue.shown < dialogue.full.length) {
      typeAcc += dt;
      while (typeAcc > 22 && dialogue.shown < dialogue.full.length) {
        dialogue.shown += 1;
        typeAcc -= 22;
      }
      $("dlg-text").textContent = dialogue.full.slice(0, dialogue.shown);
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

  function openScenes() {
    var html = "<h3>Change the room</h3><div class='choice-list'>";
    NB.SCENE_ORDER.forEach(function (id) {
      var sc = NB.SCENES[id];
      html += "<button type='button' data-scene='" + id + "'>" + escapeHtml(sc.name) + "</button>";
    });
    html += "</div><div class='modal-actions'><button type='button' class='btn ink' data-close>Back</button></div>";
    openModal(html);
    $("modal-card").querySelectorAll("[data-scene]").forEach(function (b) {
      b.addEventListener("click", function () {
        S.sceneId = b.getAttribute("data-scene");
        var sc = scene();
        S.px = sc.spawn.x; S.py = sc.spawn.y;
        S.stageMode = "overworld";
        S.faceoff = null;
        persist();
        closeModal();
        renderChrome();
      });
    });
    $("modal-card").querySelector("[data-close]").addEventListener("click", closeModal);
  }

  function openFaceoffPick() {
    var html = "<h3>Face-off</h3><p class='sheet-lede'>A tense beat. Players see Speak / Look / Act / Leave.</p><div class='choice-list'>";
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
        var oldLevel = pc.level;
        Object.assign(pc, next);
        if (pc.hp > pc.maxHp) pc.hp = pc.maxHp;
        if (pc.level !== oldLevel) {
          /* new unclaimed coach items appear automatically */
        }
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
    $("btn-talk").addEventListener("click", function () {
      var n = nearestNpc();
      if (n) startTalk(n.id);
      else lookAround();
    });
    $("btn-look-ow").addEventListener("click", lookAround);
    $("dialogue").addEventListener("click", advanceDialogue);
    $("fo-cmds").addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-cmd]");
      if (b) faceoffCmd(b.getAttribute("data-cmd"));
    });
    $("modal").addEventListener("click", function (ev) {
      if (ev.target.id === "modal") closeModal();
    });

    var dpad = $("dpad");
    function hold(dir, on) { keys[dir] = on; }
    dpad.querySelectorAll("[data-dir]").forEach(function (b) {
      var dir = b.getAttribute("data-dir");
      b.addEventListener("pointerdown", function (e) { e.preventDefault(); hold(dir, true); b.classList.add("on"); b.setPointerCapture(e.pointerId); });
      b.addEventListener("pointerup", function () { hold(dir, false); b.classList.remove("on"); });
      b.addEventListener("pointercancel", function () { hold(dir, false); b.classList.remove("on"); });
    });
    window.addEventListener("keydown", function (e) {
      var m = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
      if (m[e.key]) { keys[m[e.key]] = true; e.preventDefault(); }
      if (e.key === "Enter" || e.key === " ") {
        if (dialogue) advanceDialogue();
        else if (S.stageMode !== "faceoff") {
          var n = nearestNpc();
          if (n) startTalk(n.id);
        }
      }
      if (e.key === "Escape" && dialogue) closeDialogue();
    });
    window.addEventListener("keyup", function (e) {
      var m = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
      if (m[e.key]) keys[m[e.key]] = false;
    });
    window.addEventListener("resize", fitCanvas);
  }

  NB.onRemoteState(function (next) {
    S = next;
    renderChrome();
    renderPanel();
  });

  canvas = $("stage");
  ctx = canvas.getContext("2d");
  bust = $("bust");
  bind();
  parseQuery();
  NB.loadArt().then(function () {
    if (sess.role) enterTable();
    else showJoin();
    requestAnimationFrame(loop);
  });
})();
