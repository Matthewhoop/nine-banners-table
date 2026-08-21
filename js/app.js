/* global window, document, NB */
(function () {
  var S = NB.loadState();
  var sess = NB.loadSession() || { role: null, name: "", pin: "" };
  var panel = "stage";
  var t = 0;
  var localShown = 0;
  var typeAcc = 0;
  var lastBeatSig = "";
  var decDraft = { id: "", text: "", choice: "" };
  var canvas, ctx;
  var lastTs = 0;
  var viewW = 240, viewH = 160, dpr = 1;
  var peerSeenAt = 0;
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

  function myKey() {
    return String(sess.name || (isDM() ? "DM" : "guest")).trim().toLowerCase();
  }
  function displayName() {
    return (sess.name || (isDM() ? "DM" : "A blade")).trim();
  }
  function decisionOpen() {
    return !!(S.decision && S.decision.status === "open") && !isFaceoff();
  }
  function markJoined() {
    if (isDM()) return;
    var key = myKey();
    if (!key || key === "guest") return;
    S.joined = S.joined || [];
    var found = -1;
    S.joined.forEach(function (j, i) {
      var k = typeof j === "string" ? j : (j.key || "");
      if (String(k).toLowerCase() === key) found = i;
    });
    if (found >= 0) {
      var prev = S.joined[found];
      if (typeof prev === "string") S.joined[found] = { key: key, name: displayName(), at: Date.now() };
      else { prev.at = Date.now(); prev.name = displayName(); prev.key = key; }
    } else {
      S.joined.push({ key: key, name: displayName(), at: Date.now() });
    }
  }
  function joinedVoterKeys() {
    return liveJoinedKeys();
  }
  function liveJoinedKeys() {
    var now = Date.now();
    var staleMs = 20 * 60 * 1000;
    var keys = {};
    var me = myKey();
    (S.joined || []).forEach(function (j) {
      var k = (typeof j === "string" ? j : (j.key || j.name || "")).trim().toLowerCase();
      if (!k || k === "dm" || k === "guest") return;
      if (k === me) { keys[k] = true; return; }
      if (typeof j === "string") return;
      var at = j.at || 0;
      if (at && (now - at) <= staleMs) keys[k] = true;
    });
    return keys;
  }
  function expectedGroupVoters() {
    var live = liveJoinedKeys();
    var liveCount = Object.keys(live).length;
    if (liveCount <= 1) return 1;
    var party = S.party || [];
    if (party.length <= 1) return 1;
    var peersLive = peerSeenAt && (Date.now() - peerSeenAt) < 30000;
    if (!peersLive) return 1;
    var n = 0;
    party.forEach(function (p) {
      var nk = String(p.name || "").trim().toLowerCase();
      if (nk && live[nk]) n += 1;
    });
    return n <= 1 ? 1 : n;
  }
  function groupVoteCount(d) {
    return submissionList(d).filter(function (s) {
      return s && ((s.choice && String(s.choice).trim()) || (s.text && String(s.text).trim()));
    }).length;
  }
  function shouldAutoResolve() {
    var d = S.decision;
    if (!d || d.status !== "open" || isFaceoff()) return false;
    if (d.kind === "solo") return actorSubmitted();
    var votes = groupVoteCount(d);
    if (votes <= 0) return false;
    return votes >= expectedGroupVoters();
  }
  function makeLiveDecision(spec, called) {
    spec = spec || {};
    var kind = spec.kind === "solo" ? "solo" : "group";
    var choices = (spec.choices || []).map(function (c) { return String(c).trim(); }).filter(Boolean).slice(0, 4);
    var reacts = kind === "solo"
      ? (spec.reacts || []).map(function (c) { return String(c).trim(); }).filter(Boolean).slice(0, 4)
      : [];
    return {
      id: spec.id || ("call-" + Date.now().toString(36)),
      kind: kind,
      prompt: String(spec.prompt || "What do you do?").trim() || "What do you do?",
      choices: choices,
      allowText: spec.allowText !== false,
      reacts: reacts,
      actorId: spec.actorId || null,
      actorName: spec.actorName || null,
      submissions: {},
      status: "open",
      called: !!called,
      sceneId: S.sceneId,
      after: spec.after || null,
      nextScene: spec.nextScene || null,
      closer: spec.closer || null,
      talk: !!spec.talk,
      npcId: spec.npcId || null,
      heardLine: spec.heardLine || null,
      textLabel: spec.textLabel || null,
      talkTurn: spec.talkTurn | 0,
      talkMax: spec.talkMax | 0,
      talkUsed: (spec.talkUsed || []).slice()
    };
  }
  function authoredLines(sc) {
    return sceneBeats(sc || scene());
  }
  function currentAuthoredIndex() {
    if (!S.beat || S.beat.speakerId) return -1;
    var authored = authoredLines();
    var line = (S.beat.lines || [])[S.beat.index | 0];
    if (!line) return -1;
    return authored.indexOf(line);
  }
  function isSceneNarrationBeat() {
    return currentAuthoredIndex() >= 0;
  }
  function sceneDecisionForBeat() {
    var sc = scene();
    var decs = (sc && sc.decisions) || [];
    if (!decs.length || !isSceneNarrationBeat()) return null;
    var idx = currentAuthoredIndex();
    var last = authoredLines(sc).length - 1;
    for (var i = 0; i < decs.length; i++) {
      var at = decs[i].afterBeat != null ? decs[i].afterBeat : last;
      if (at === idx) return decs[i];
    }
    return null;
  }
  function syncSceneDecision() {
    if (isFaceoff()) return false;
    if (S.decision && S.decision.status === "open") return false;
    if (S.beat && S.beat.talk) return false;
    if (S.talkReturn) return false;
    var d = sceneDecisionForBeat();
    if (!d) return false;
    if ((S.resolvedDecisions || []).indexOf(d.id) >= 0) return false;
    S.decision = makeLiveDecision(d, false);
    persist();
    return true;
  }
  function mineSubmission() {
    var d = S.decision;
    if (!d || !d.submissions) return null;
    return d.submissions[myKey()] || null;
  }
  function isActor() {
    var d = S.decision;
    if (!d || d.kind !== "solo" || !d.actorName) return false;
    if (d.actorName.toLowerCase() === displayName().toLowerCase()) return true;
    var me = myPc();
    return !!(me && d.actorId && me.id === d.actorId);
  }
  function actorSubmitted() {
    var d = S.decision;
    if (!d || !d.submissions) return false;
    return Object.keys(d.submissions).some(function (k) {
      return d.submissions[k] && d.submissions[k].role === "act";
    });
  }
  function submissionList(d) {
    d = d || S.decision;
    if (!d || !d.submissions) return [];
    return Object.keys(d.submissions).map(function (k) { return d.submissions[k]; })
      .filter(Boolean)
      .sort(function (a, b) { return (a.at || 0) - (b.at || 0); });
  }
  function claimActor(name, pcId) {
    var d = S.decision;
    if (!d || d.kind !== "solo" || d.actorName) return;
    name = String(name || "").trim();
    if (!name) return;
    d.actorName = name;
    d.actorId = pcId || null;
    persist();
    renderDecision();
    renderChromeLight();
    var ta = $("dec-text");
    if (ta && isActor()) ta.focus();
  }
  function playerHasVoted() {
    var mine = mineSubmission();
    return !!(mine && ((mine.choice && String(mine.choice).trim()) || (mine.text && String(mine.text).trim())));
  }
  function cloneBeat(b) {
    if (!b) return null;
    return {
      speakerId: b.speakerId || null,
      lines: (b.lines || []).slice(),
      index: b.index | 0,
      talk: !!b.talk,
      followId: b.followId || null,
      followLine: b.followLine || null
    };
  }
  function cloneDecision(d) {
    if (!d) return null;
    try { return JSON.parse(JSON.stringify(d)); } catch (e) { return d; }
  }
  function winningChoice(d) {
    d = d || S.decision;
    var list = submissionList(d);
    if (!list.length) return "";
    if (d && d.kind === "solo") {
      var act = null;
      list.forEach(function (s) { if (s.role === "act" && !act) act = s; });
      return (act && act.choice) || "";
    }
    var counts = {};
    var best = "", n = 0;
    list.forEach(function (s) {
      if (!s.choice) return;
      counts[s.choice] = (counts[s.choice] || 0) + 1;
      if (counts[s.choice] > n) { n = counts[s.choice]; best = s.choice; }
    });
    return best || (list[0] && list[0].choice) || "";
  }
  function pickAftermath(d) {
    d = d || S.decision;
    if (!d) return "";
    var map = d.after || {};
    var choice = winningChoice(d);
    if (choice && map[choice]) return map[choice];
    if (map["*"]) return map["*"];
    return "The table takes that as the move.";
  }
  function youSaidLine(act) {
    if (!act) return "You let that hang.";
    var said = (act.text && String(act.text).trim()) || act.choice;
    if (said) return "You said " + said;
    return "You let that hang.";
  }
  function talkEndChoices() {
    return (NB.TALK_END_REPLIES || ["That's enough", "I'll look around", "I'll leave it"]).slice();
  }
  function isTalkCloserChoice(choice) {
    if (!choice) return false;
    var c = String(choice).trim().toLowerCase();
    return talkEndChoices().some(function (x) { return String(x).toLowerCase() === c; });
  }
  function talkSceneKey() {
    var id = S.sceneId;
    if (id === "inn" || id === "pellane") return "inn";
    if (id === "quay" || id === "procession") return "quay";
    return "hall";
  }
  function talkSceneReplies() {
    var map = NB.TALK_SCENE_REPLIES || {};
    return (map[talkSceneKey()] || map.inn || []).slice();
  }
  function talkSceneClosers() {
    var map = NB.TALK_CLOSERS || {};
    return (map[talkSceneKey()] || ["Don't let me keep you.", "I've said my piece."]).slice();
  }
  function pickTalkLine(d, preferCloser) {
    d = d || {};
    var used = (d.talkUsed || []).slice();
    if (d.heardLine && used.indexOf(d.heardLine) < 0) used.push(d.heardLine);
    function pickFrom(arr, allowRepeat) {
      var unused = arr.filter(function (l) { return used.indexOf(l) < 0; });
      var pool = unused.length ? unused : (allowRepeat ? arr : []);
      if (!pool.length) return "";
      return pool[Math.floor(Math.random() * pool.length)];
    }
    if (preferCloser) return pickFrom(talkSceneClosers(), true) || "Don't let me keep you.";
    var n = NB.NPCS[d.npcId];
    var npcLines = (n && n.lines) ? n.lines.slice() : [];
    var pool = npcLines.concat(talkSceneReplies()).filter(function (l) { return used.indexOf(l) < 0; });
    if (!pool.length) return pickTalkLine(d, true);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function rememberTalkLine(d, line) {
    if (!d || !line) return;
    d.talkUsed = d.talkUsed || [];
    if (d.talkUsed.indexOf(line) < 0) d.talkUsed.push(line);
    markHeard(d.npcId, line);
  }
  function markHeard(id, line) {
    if (!id || !line) return;
    S.heardLines = S.heardLines || {};
    S.heardLines[id] = S.heardLines[id] || [];
    if (S.heardLines[id].indexOf(line) < 0) S.heardLines[id].push(line);
  }
  function upsertSubmission(role, choice, text) {
    var d = S.decision;
    if (!d) return;
    markJoined();
    var key = myKey();
    var prev = (d.submissions || {})[key] || {};
    var nextChoice = choice || prev.choice || null;
    var nextText = text != null ? String(text).trim() : (prev.text || "");
    var already = !!(prev && ((prev.choice && String(prev.choice).trim()) || (prev.text && String(prev.text).trim())));
    if (already && (nextChoice === (prev.choice || null)) && nextText === (prev.text || "") && canPlayerContinue()) {
      resolveDecision(false);
      return;
    }
    d.submissions = d.submissions || {};
    d.submissions[key] = {
      who: displayName(),
      pcId: (myPc() && myPc().id) || prev.pcId || null,
      role: role,
      choice: nextChoice,
      text: nextText,
      at: Date.now()
    };
    persist();
    if (shouldAutoResolve() || (playerHasVoted() && expectedGroupVoters() <= 1 && d.kind !== "solo")) {
      resolveDecision(false);
      return;
    }
    if (d.kind === "solo" && actorSubmitted()) {
      resolveDecision(false);
      return;
    }
    renderDecision();
    renderCaption();
  }
  function decisionSummary(d) {
    d = d || S.decision;
    if (!d) return "";
    var list = submissionList(d);
    if (!list.length) return "The table lets the moment pass.";
    if (d.kind === "solo") {
      var act = null, reacts = [];
      list.forEach(function (s) {
        if (s.role === "act" && !act) act = s;
        else reacts.push(s);
      });
      var parts = [];
      if (act) {
        var bit = act.who;
        if (act.choice) bit += " — " + act.choice;
        if (act.text) bit += (act.choice ? ". " : " — ") + act.text;
        if (!act.choice && !act.text) bit += " acts.";
        parts.push(bit);
      }
      reacts.forEach(function (r) {
        var rb = r.who;
        if (r.choice) rb += ": " + r.choice;
        if (r.text) rb += (r.choice ? " — " : ": ") + r.text;
        parts.push(rb);
      });
      return parts.join(" ");
    }
    return list.map(function (s) {
      var bit = s.who;
      if (s.choice) bit += " — " + s.choice;
      if (s.text) bit += (s.choice ? ". " : " — ") + s.text;
      return bit;
    }).join(" · ");
  }
  function canPlayerContinue() {
    if (!decisionOpen()) return false;
    if (isDM()) return true;
    if (S.decision.kind === "solo") return actorSubmitted() || (isActor() && playerHasVoted());
    return playerHasVoted() || groupVoteCount() > 0;
  }
  function finishBeatReset() {
    lastBeatSig = beatSig();
    localShown = reduceMotion ? 9999 : 0;
    typeAcc = 0;
  }
  function returnFromTalk() {
    var ret = S.talkReturn;
    S.talkReturn = null;
    if (ret && ret.beat && ret.beat.lines && ret.beat.lines.length) {
      setBeat(ret.beat, true);
      if (ret.decision && ret.decision.status === "open" && !(ret.decision.talk)) {
        S.decision = ret.decision;
      }
    } else {
      setBeat({ speakerId: null, lines: sceneBeats(scene()), index: 0 }, true);
    }
    persist();
    renderChrome();
  }
  function finishTalk(d, closer) {
    rememberTalkLine(d, closer);
    S.resolvedDecisions = S.resolvedDecisions || [];
    if (d.id && S.resolvedDecisions.indexOf(d.id) < 0) S.resolvedDecisions.push(d.id);
    S.decision = null;
    decDraft = { id: "", text: "", choice: "" };
    setBeat({
      speakerId: d.npcId || null,
      lines: [closer || "Don't let me keep you."],
      index: 0,
      talk: true
    }, true);
    persist();
    renderChrome();
  }
  function resolveTalk(d, skipped) {
    var list = submissionList(d);
    var act = null;
    list.forEach(function (s) { if (s.role === "act" && !act) act = s; });
    if (!act) act = list[0] || null;
    var said = skipped && !act ? "You let that hang." : youSaidLine(act);
    S.lastAction = said;
    var closerPick = !!(skipped || !act || isTalkCloserChoice(act.choice));
    if (closerPick) {
      finishTalk(d, pickTalkLine(d, true));
      return;
    }
    var turn = (d.talkTurn | 0) + 1;
    var max = d.talkMax > 0 ? d.talkMax : 4;
    d.talkTurn = turn;
    var mustEnd = turn >= max;
    var line = pickTalkLine(d, mustEnd);
    var closers = talkSceneClosers();
    if (mustEnd || !line || closers.indexOf(line) >= 0) {
      finishTalk(d, line || pickTalkLine(d, true));
      return;
    }
    rememberTalkLine(d, line);
    d.heardLine = line;
    d.submissions = {};
    decDraft = { id: d.id, text: "", choice: "" };
    setBeat({
      speakerId: d.npcId,
      lines: [line],
      index: 0,
      talk: true
    }, true);
    persist();
    renderChrome();
  }
  function chainedNextScene() {
    if (S.pendingNextScene && NB.SCENES[S.pendingNextScene]) return S.pendingNextScene;
    if (decisionOpen()) return null;
    var sc = scene();
    var decs = (sc && sc.decisions) || [];
    var resolved = S.resolvedDecisions || [];
    for (var i = 0; i < decs.length; i++) {
      var d = decs[i];
      if (d.nextScene && NB.SCENES[d.nextScene] && resolved.indexOf(d.id) >= 0) return d.nextScene;
    }
    return null;
  }
  function applyPendingScene() {
    var id = chainedNextScene();
    if (!id) {
      S.pendingNextScene = null;
      return false;
    }
    S.pendingNextScene = null;
    applyScene(id);
    return true;
  }
  function resolveDecision(skipped) {
    var d = S.decision;
    if (!d) return;
    if (d.talk) {
      resolveTalk(d, skipped);
      return;
    }
    var summary = skipped && !submissionList(d).length ? "" : decisionSummary(d);
    var after = skipped && !summary ? "" : pickAftermath(d);
    var closer = d.closer || "";
    var nextId = d.nextScene || null;
    S.resolvedDecisions = S.resolvedDecisions || [];
    if (d.id && S.resolvedDecisions.indexOf(d.id) < 0) S.resolvedDecisions.push(d.id);
    S.decision = null;
    if (summary) S.lastAction = summary;
    ensureBeat();
    var lines = (S.beat.lines || []).slice();
    var idx = S.beat.index | 0;
    var extras = [];
    if (after && lines[idx] !== after && lines[idx + 1] !== after) extras.push(after);
    if (closer && closer !== after && extras.indexOf(closer) < 0 && lines[idx] !== closer) extras.push(closer);
    if (!extras.length && idx >= lines.length - 1) {
      extras.push(after || summary || "The table takes that as the move.");
    }
    if (nextId && NB.SCENES[nextId]) S.pendingNextScene = nextId;
    else S.pendingNextScene = null;
    if (extras.length) {
      lines = lines.slice(0, idx + 1).concat(extras, lines.slice(idx + 1));
      S.beat.lines = lines;
      S.beat.speakerId = null;
      S.beat.index = idx + 1;
      finishBeatReset();
      persist();
      renderChrome();
      return;
    }
    if (nextId && NB.SCENES[nextId]) {
      finishBeatReset();
      persist();
      applyPendingScene();
      return;
    }
    if (idx < lines.length - 1) {
      S.beat.index = idx + 1;
    }
    finishBeatReset();
    persist();
    renderChrome();
  }
  function renderChromeLight() {
    $("story-page").classList.toggle("has-decision", decisionOpen());
    $("story-page").classList.toggle("can-continue", !!(decisionOpen() && (canPlayerContinue() || playerHasVoted())));
  }
  function tallyHtml(d) {
    var list = submissionList(d);
    if (!list.length) return "";
    var counts = {};
    list.forEach(function (s) {
      if (s.choice) counts[s.choice] = (counts[s.choice] || 0) + 1;
    });
    var countBits = Object.keys(counts).map(function (k) { return escapeHtml(k) + " · " + counts[k]; });
    var rows = list.map(function (s) {
      var said = [];
      if (s.choice) said.push(s.choice);
      if (s.text) said.push(s.text);
      return "<div class='dec-row'><div class='dec-who'>" + escapeHtml(s.who) +
        (s.role === "react" ? " <span class='dec-said'>reacts</span>" : "") +
        (s.role === "act" ? " <span class='dec-said'>acts</span>" : "") +
        "</div><div class='dec-said'>" + escapeHtml(said.join(" — ") || "…") + "</div></div>";
    }).join("");
    return "<div class='dec-tally'><h4>The blades said</h4>" +
      (countBits.length ? "<p class='dec-counts'>" + countBits.join(" · ") + "</p>" : "") +
      rows + "</div>";
  }
  function bindDecisionCard(el, d) {
    el.querySelectorAll("[data-claim]").forEach(function (b) {
      b.addEventListener("click", function () {
        var me = myPc();
        claimActor(displayName(), me ? me.id : null);
      });
    });
    var pick = el.querySelector("#dec-actor-pick");
    var nameBtn = el.querySelector("#dec-name-actor");
    if (nameBtn && pick) {
      nameBtn.addEventListener("click", function () {
        var opt = pick.options[pick.selectedIndex];
        if (!opt || !opt.value) return;
        claimActor(opt.textContent, opt.value.indexOf("pc-") === 0 ? opt.value : null);
      });
    }
    el.querySelectorAll("[data-choice]").forEach(function (b) {
      b.addEventListener("click", function () {
        decDraft.choice = b.getAttribute("data-choice");
        var role = d.kind === "solo" ? (isActor() ? "act" : "react") : "vote";
        if (d.kind === "solo" && !isActor() && !d.actorName) return;
        upsertSubmission(role, decDraft.choice, decDraft.text);
      });
    });
    var ta = el.querySelector("#dec-text");
    if (ta) {
      ta.addEventListener("input", function () { decDraft.text = ta.value; });
    }
    var send = el.querySelector("#dec-send");
    if (send) {
      send.addEventListener("click", function () {
        var role = d.kind === "solo" ? (isActor() ? "act" : "react") : "vote";
        var text = ta ? ta.value : decDraft.text;
        if (!decDraft.choice && !(text || "").trim()) {
          if (ta) ta.focus();
          return;
        }
        upsertSubmission(role, decDraft.choice, text);
      });
    }
    var leave = el.querySelector("#dec-leave");
    if (leave) {
      leave.addEventListener("click", function () {
        upsertSubmission(isActor() ? "act" : "react", "I'll leave it", "");
      });
    }
    var cont = el.querySelector("#dec-continue");
    if (cont) cont.addEventListener("click", function () { resolveDecision(false); });
    var skip = el.querySelector("#dec-skip");
    if (skip) skip.addEventListener("click", function () { resolveDecision(true); });
  }
  function renderDecision() {
    var el = $("decision-card");
    if (!el) return;
    var d = S.decision;
    if (!d || d.status !== "open" || isFaceoff()) {
      el.classList.add("hidden");
      el.innerHTML = "";
      $("story-page").classList.remove("has-decision");
      $("story-page").classList.remove("can-continue");
      return;
    }
    $("story-page").classList.add("has-decision");
    if (decDraft.id !== d.id) {
      var mine = mineSubmission();
      decDraft = { id: d.id, text: mine ? (mine.text || "") : "", choice: mine ? (mine.choice || "") : "" };
    } else {
      var live = mineSubmission();
      if (live && !decDraft.choice && live.choice) decDraft.choice = live.choice;
    }
    var focusId = document.activeElement && document.activeElement.id;
    var selStart = null, selEnd = null;
    if (focusId === "dec-text" && $("dec-text")) {
      selStart = $("dec-text").selectionStart;
      selEnd = $("dec-text").selectionEnd;
    }
    var html = "<div class='dec-body'>";
    var badge = d.talk ? "Speak" : (d.kind === "solo" ? "One blade" : "The table");
    var badgeKind = d.talk ? "talk" : d.kind;
    html += "<div class='dec-head'><span class='dec-badge " + badgeKind + "'>" + badge + "</span>";
    html += "<p class='dec-prompt'>" + escapeHtml(d.prompt) + "</p></div>";

    var iAmActor = isActor();
    var hasActor = !!(d.actorName);
    var mine = mineSubmission();
    var voted = playerHasVoted();
    var textLabel = d.textLabel || (d.talk ? "What do you say?" : "What do you do?");

    if (d.kind === "solo" && !hasActor) {
      html += "<p class='dec-status'>One blade takes this. The others can react after.</p>";
      html += "<div class='dec-actions'><button type='button' class='btn brass' data-claim>I do this</button></div>";
      if (isDM() && S.party.length) {
        html += "<div class='dec-pick'><select id='dec-actor-pick'><option value=''>Or name a blade…</option>";
        S.party.forEach(function (pc) {
          html += "<option value='" + escapeAttr(pc.id) + "'>" + escapeHtml(pc.name) + "</option>";
        });
        html += "</select><button type='button' class='btn slim' id='dec-name-actor'>Name them</button></div>";
      } else if (isDM()) {
        html += "<p class='dec-status'>No blades on the roster yet — a player can tap I do this, or add a blade on Party.</p>";
      }
    } else if (d.kind === "solo" && hasActor && iAmActor && voted && !d.talk) {
      html += "<p class='dec-status'>You sent that. Tap Continue — or the caption — to move on.</p>";
    } else if (d.kind === "solo" && hasActor && iAmActor) {
      html += "<p class='dec-status'>" + (d.talk ? "Keep talking — or wrap it up." : "You are acting.") + "</p>";
      if (d.choices && d.choices.length) {
        html += "<div class='dec-choices'>";
        d.choices.forEach(function (c) {
          html += "<button type='button' data-choice='" + escapeAttr(c) + "' class='" + (decDraft.choice === c ? "on" : "") + "'>" + escapeHtml(c) + "</button>";
        });
        html += "</div>";
      }
      if (d.talk) {
        html += "<p class='dec-label'>Or wrap it up</p><div class='dec-choices dec-ends'>";
        talkEndChoices().forEach(function (c) {
          html += "<button type='button' data-choice='" + escapeAttr(c) + "' class='" + (decDraft.choice === c ? "on" : "") + "'>" + escapeHtml(c) + "</button>";
        });
        html += "</div>";
      }
      if (d.allowText !== false) {
        html += "<div class='dec-field'><label for='dec-text'>" + escapeHtml(textLabel) + "</label>";
        html += "<textarea id='dec-text' maxlength='280' placeholder='Type it.'>" + escapeHtml(decDraft.text) + "</textarea></div>";
      }
      html += "<div class='dec-actions'><button type='button' class='btn brass' id='dec-send'>Send</button>";
      if (d.talk) html += "<button type='button' class='btn slim' id='dec-leave'>I'll leave it</button>";
      html += "</div>";
    } else if (d.kind === "solo" && hasActor && !iAmActor) {
      html += "<p class='dec-status'>" + escapeHtml(d.actorName) + " is acting…</p>";
      if (d.reacts && d.reacts.length) {
        html += "<p class='dec-label'>React</p><div class='dec-reacts'>";
        d.reacts.forEach(function (c) {
          html += "<button type='button' data-choice='" + escapeAttr(c) + "' class='" + (decDraft.choice === c ? "on" : "") + "'>" + escapeHtml(c) + "</button>";
        });
        html += "</div>";
      }
      html += "<div class='dec-field'><label for='dec-text'>Or type it</label>";
      html += "<textarea id='dec-text' maxlength='200' placeholder='I watch the door…'>" + escapeHtml(decDraft.text) + "</textarea></div>";
      html += "<div class='dec-actions'><button type='button' class='btn ink' id='dec-send'>Send react</button></div>";
    } else if (voted) {
      html += "<p class='dec-status'>You sent that. Tap Continue — or the caption — to move on.</p>";
    } else {
      html += "<p class='dec-status'>Everyone at the table. Pick, type, or both.</p>";
      if (d.choices && d.choices.length) {
        html += "<div class='dec-choices'>";
        d.choices.forEach(function (c) {
          html += "<button type='button' data-choice='" + escapeAttr(c) + "' class='" + (decDraft.choice === c ? "on" : "") + "'>" + escapeHtml(c) + "</button>";
        });
        html += "</div>";
      }
      if (d.allowText !== false) {
        html += "<div class='dec-field'><label for='dec-text'>" + escapeHtml(textLabel) + "</label>";
        html += "<textarea id='dec-text' maxlength='280' placeholder='Type it.'>" + escapeHtml(decDraft.text) + "</textarea></div>";
      }
      html += "<div class='dec-actions'><button type='button' class='btn brass' id='dec-send'>Send</button></div>";
    }

    html += tallyHtml(d);
    if (d.kind === "solo" && hasActor && !actorSubmitted() && !isDM() && !iAmActor) {
      html += "<p class='dec-status'>Waiting on " + escapeHtml(d.actorName) + ".</p>";
    }
    html += "</div>";

    if (d.talk) {
      if (isDM()) {
        html += "<div class='dec-advance'><div class='dec-actions'>";
        html += "<button type='button' class='btn slim' id='dec-skip'>Skip</button>";
        html += "</div></div>";
      }
    } else if (isDM() || canPlayerContinue() || voted) {
      html += "<div class='dec-advance'><div class='dec-actions'>";
      html += "<button type='button' class='btn brass' id='dec-continue'>Continue</button>";
      if (isDM()) html += "<button type='button' class='btn slim' id='dec-skip'>Skip</button>";
      html += "</div></div>";
    }

    el.innerHTML = html;
    el.classList.remove("hidden");
    bindDecisionCard(el, d);
    if (focusId && $(focusId)) {
      $(focusId).focus();
      if (focusId === "dec-text" && selStart != null) {
        try { $("dec-text").setSelectionRange(selStart, selEnd); } catch (e) {}
      }
    }
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
    } else if (sess.role === "player" && sess.name) {
      var exists = S.party.some(function (p) { return p.name.toLowerCase() === sess.name.toLowerCase(); });
      if (!exists) {
        S.party.push(NB.newPc(sess.name, NB.PC_COLORS[S.party.length % NB.PC_COLORS.length]));
      }
    }
    markJoined();
    persist();
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
      S.decision = null;
      S.talkReturn = null;
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
    $("story-page").classList.toggle("can-continue", !!(decisionOpen() && (canPlayerContinue() || playerHasVoted())));
    $("story-page").classList.toggle("faceoff", isFaceoff());
    $("faceoff-ui").classList.toggle("hidden", !isFaceoff());
    $("cast-strip").classList.toggle("hidden", isFaceoff());
    $("btn-faceoff").textContent = isFaceoff() ? "End face-off" : "Face-off";
    syncSceneDecision();
    if (shouldAutoResolve()) {
      resolveDecision(false);
      return;
    }
    renderCast();
    renderCaption();
    renderDecision();
    renderChromeLight();
    renderHpStrip();
    if (isFaceoff()) renderFaceoffUI();
    fitCanvas();
  }

  function renderHpStrip() {
    var el = $("hp-strip");
    if (!el) return;
    var pcs = visibleParty();
    if (!S.party.length || !pcs.length) {
      el.classList.add("hidden");
      el.innerHTML = "";
      el.setAttribute("aria-hidden", "true");
      return;
    }
    el.classList.remove("hidden");
    el.removeAttribute("aria-hidden");
    var me = myPc();
    var dm = isDM();
    el.innerHTML = pcs.map(function (pc) {
      var max = Math.max(1, pc.maxHp | 0);
      var hp = Math.max(0, pc.hp | 0);
      var pct = Math.max(0, Math.min(100, (hp / max) * 100));
      var tone = hp <= 0 ? "down" : (pct <= 25 ? "low" : (pct <= 50 ? "mid" : "ok"));
      var mine = me && me.id === pc.id ? " mine" : "";
      var html = "<div class='hp-chip " + tone + mine + "' data-pc='" + escapeAttr(pc.id) + "'>";
      html += "<button type='button' class='hp-chip-main' data-open-party='" + escapeAttr(pc.id) + "'>";
      html += "<span class='hp-chip-pip' style='background:" + escapeAttr(pc.color || "#c9a15b") + "'></span>";
      html += "<span class='hp-chip-meta'><span class='hp-chip-name'>" + escapeHtml(pc.name) + "</span>";
      html += "<span class='hp-chip-nums'>" + hp + "/" + max + "</span></span>";
      html += "<span class='hp-mini' aria-hidden='true'><i style='width:" + pct + "%'></i></span>";
      html += "</button>";
      if (dm) {
        html += "<div class='hp-chip-bumps'>";
        html += "<button type='button' class='hp-chip-bump' data-hp='-1' data-pc='" + escapeAttr(pc.id) + "' aria-label='Hurt " + escapeAttr(pc.name) + "'>−</button>";
        html += "<button type='button' class='hp-chip-bump' data-hp='1' data-pc='" + escapeAttr(pc.id) + "' aria-label='Heal " + escapeAttr(pc.name) + "'>+</button>";
        html += "</div>";
      }
      html += "</div>";
      return html;
    }).join("");
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

  function paintCaptionHint() {
    var hint = $("cap-hint");
    if (!hint || !S.beat) return;
    var full = currentLine();
    var more = localShown < full.length || (S.beat.index | 0) < ((S.beat.lines || []).length - 1);
    var canGo = !!(decisionOpen() && (canPlayerContinue() || playerHasVoted()));
    var talkMore = !!(S.beat.followLine || S.beat.talk || S.talkReturn);
    var sceneMore = !!chainedNextScene();
    if (localShown < full.length) {
      hint.classList.remove("hidden");
      hint.textContent = "tap to finish";
      return;
    }
    if (decisionOpen()) {
      hint.classList.remove("hidden");
      if (S.decision.talk) hint.textContent = "answer them";
      else hint.textContent = canGo ? "tap to continue" : "a decision waits";
      return;
    }
    if (more || talkMore || sceneMore) {
      hint.classList.remove("hidden");
      hint.textContent = "tap to continue";
      return;
    }
    hint.classList.add("hidden");
    hint.textContent = "tap to continue";
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
    paintCaptionHint();
  }

  function hearNpc(id) {
    var n = NB.NPCS[id];
    if (!n || !n.lines || !n.lines.length || isFaceoff()) return;
    var unused = n.lines.filter(function (l) {
      return ((S.heardLines || {})[id] || []).indexOf(l) < 0;
    });
    var pool = unused.length ? unused : n.lines;
    var pick = pool[Math.floor(Math.random() * pool.length)];
    markHeard(id, pick);
    if (!S.talkReturn) {
      S.talkReturn = {
        beat: cloneBeat(S.beat),
        decision: (S.decision && S.decision.status === "open" && !S.decision.talk) ? cloneDecision(S.decision) : null
      };
    } else if (S.decision && S.decision.status === "open" && !S.decision.talk) {
      S.talkReturn.decision = cloneDecision(S.decision);
    }
    var me = myPc();
    setBeat({ speakerId: id, lines: [pick], index: 0, talk: true }, true);
    S.decision = makeLiveDecision({
      id: "talk-" + id + "-" + Date.now().toString(36),
      kind: "solo",
      prompt: "What do you say to " + (n.name.split(" ")[0] || n.name) + "?",
      choices: (NB.TALK_REPLIES || []).slice(),
      allowText: true,
      reacts: ["I listen", "I watch the room"],
      actorName: displayName(),
      actorId: me ? me.id : null,
      talk: true,
      npcId: id,
      heardLine: pick,
      talkTurn: 0,
      talkMax: 3 + Math.floor(Math.random() * 3),
      talkUsed: [pick],
      textLabel: "What do you say?"
    }, false);
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
    if (decisionOpen()) {
      if (S.decision.talk) return;
      if (canPlayerContinue() || playerHasVoted()) resolveDecision(false);
      return;
    }
    if ((S.beat.index | 0) < (S.beat.lines || []).length - 1) {
      S.beat.index = (S.beat.index | 0) + 1;
      lastBeatSig = beatSig();
      localShown = reduceMotion ? 9999 : 0;
      typeAcc = 0;
      persist();
      renderCaption();
      syncSceneDecision();
      renderDecision();
      return;
    }
    if (S.beat && S.beat.followLine) {
      var fid = S.beat.followId;
      var fl = S.beat.followLine;
      setBeat({ speakerId: fid, lines: [fl], index: 0, talk: true }, true);
      persist();
      renderChrome();
      return;
    }
    if (S.talkReturn || (S.beat && S.beat.talk)) {
      returnFromTalk();
      return;
    }
    if (S.pendingNextScene) {
      applyPendingScene();
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
    renderHpStrip();
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
    S.talkReturn = null;
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
        paintCaptionHint();
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
    S.pendingNextScene = null;
    S.sceneId = id;
    var sc = scene();
    S.px = sc.spawn.x;
    S.py = sc.spawn.y;
    S.stageMode = "story";
    S.faceoff = null;
    S.lastAction = "";
    S.decision = null;
    S.talkReturn = null;
    var scDecIds = (sc.decisions || []).map(function (d) { return d.id; });
    S.resolvedDecisions = (S.resolvedDecisions || []).filter(function (rid) {
      return scDecIds.indexOf(rid) < 0;
    });
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
        S.decision = null;
        S.talkReturn = null;
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

  function openCallDecision() {
    if (!isDM()) return;
    var html = "<h3>Call a decision</h3>";
    html += "<p class='sheet-lede'>Spin a solo or table prompt right now. Phones follow.</p>";
    html += "<div class='kind-toggle'>";
    html += "<button type='button' class='on' data-kind='solo'>One blade</button>";
    html += "<button type='button' data-kind='group'>The table</button>";
    html += "</div>";
    html += "<div class='form-grid'>";
    html += "<label>Prompt<textarea id='call-prompt' maxlength='220' placeholder='The clerk’s case is unattended. Who reaches for it?'></textarea></label>";
    html += "<label>Choices (optional, one per line, up to 4)<textarea id='call-choices' placeholder='Palm it / Leave it / Ask first'></textarea></label>";
    html += "<label class='check-row'><input type='checkbox' id='call-text' checked> Allow a typed answer</label>";
    html += "<label id='call-reacts-wrap'>Reacts for the others (optional, one per line)<textarea id='call-reacts' placeholder='I watch the door / I create a distraction'></textarea></label>";
    html += "</div>";
    html += "<div class='modal-actions'><button type='button' class='btn brass' id='call-go'>Call it</button>";
    html += "<button type='button' class='btn ink' data-close>Back</button></div>";
    openModal(html);
    var kind = "solo";
    var card = $("modal-card");
    function paintKind() {
      card.querySelectorAll("[data-kind]").forEach(function (b) {
        b.classList.toggle("on", b.getAttribute("data-kind") === kind);
      });
      var wrap = $("call-reacts-wrap");
      if (wrap) wrap.style.display = kind === "solo" ? "" : "none";
    }
    card.querySelectorAll("[data-kind]").forEach(function (b) {
      b.addEventListener("click", function () {
        kind = b.getAttribute("data-kind");
        paintKind();
      });
    });
    paintKind();
    $("call-go").addEventListener("click", function () {
      var prompt = ($("call-prompt").value || "").trim();
      if (!prompt) { $("call-prompt").focus(); return; }
      var choices = ($("call-choices").value || "").split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4);
      var reacts = ($("call-reacts") && $("call-reacts").value || "").split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4);
      if (S.decision && S.decision.id) {
        S.resolvedDecisions = S.resolvedDecisions || [];
        if (S.resolvedDecisions.indexOf(S.decision.id) < 0) S.resolvedDecisions.push(S.decision.id);
      }
      S.decision = makeLiveDecision({
        kind: kind,
        prompt: prompt,
        choices: choices,
        allowText: $("call-text").checked,
        reacts: kind === "solo" ? reacts : []
      }, true);
      persist();
      closeModal();
      renderChrome();
    });
    card.querySelector("[data-close]").addEventListener("click", closeModal);
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
    $("btn-call-dec").addEventListener("click", openCallDecision);
    $("btn-add-pc").addEventListener("click", function () { openPcEditor(null); });
    $("hp-strip").addEventListener("click", function (ev) {
      var bump = ev.target.closest("[data-hp]");
      if (bump) {
        ev.preventDefault();
        ev.stopPropagation();
        bumpHp(bump.getAttribute("data-pc"), parseInt(bump.getAttribute("data-hp"), 10));
        return;
      }
      if (ev.target.closest("[data-pc], [data-open-party]")) setPanel("party");
    });
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
      var tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
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
    peerSeenAt = Date.now();
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
