/* global window */
(function (NB) {
  var bc = null;
  try { bc = new BroadcastChannel(NB.CHANNEL); } catch (e) { bc = null; }
  var clientId = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
  var applying = false;

  function blankState() {
    return {
      version: 1,
      pin: NB.DEFAULT_PIN,
      tableCode: NB.TABLE_CODE,
      sceneId: "inn",
      stageMode: "story",
      faceoff: null,
      party: [],
      px: 118,
      py: 108,
      facing: "down",
      lastRoll: null,
      lastAction: "",
      beat: null,
      joined: [],
      decision: null,
      resolvedDecisions: [],
      talkReturn: null,
      pendingNextScene: null,
      heardLines: {},
      started: false,
      endCard: null,
      updatedAt: 0,
      rev: 0,
      presence: {}
    };
  }

  NB.blankState = blankState;

  NB.clearStoryState = function (state) {
    var blank = blankState();
    var keep = { pin: true, tableCode: true, party: true, lastRoll: true };
    Object.keys(blank).forEach(function (k) {
      if (keep[k]) return;
      state[k] = blank[k];
    });
    return state;
  };

  NB.newPc = function (name, color) {
    return {
      id: "pc-" + Date.now().toString(36) + Math.floor(Math.random() * 99),
      name: name || "Blade",
      className: "Fighter",
      level: 1,
      hp: 12,
      maxHp: 12,
      ac: 16,
      skills: ["Athletics", "Perception"],
      notes: "",
      subclass: "",
      claimed: {},
      asiAt: {},
      conditions: [],
      color: color || NB.PC_COLORS[0]
    };
  };

  NB.loadState = function () {
    try {
      var raw = localStorage.getItem(NB.STATE_KEY);
      if (!raw) return blankState();
      var s = JSON.parse(raw);
      var b = blankState();
      Object.keys(b).forEach(function (k) {
        if (s[k] === undefined) s[k] = b[k];
      });
      return s;
    } catch (e) {
      return blankState();
    }
  };

  NB.syncClientId = clientId;
  NB.saveState = function (state, broadcast) {
    try { localStorage.setItem(NB.STATE_KEY, JSON.stringify(state)); } catch (e) {}
    if (broadcast !== false && bc && !applying) {
      try { bc.postMessage({ clientId: clientId, state: state }); } catch (e2) {}
    }
    if (broadcast !== false && !applying && typeof NB.afterSave === "function") {
      try { NB.afterSave(state); } catch (e3) {}
    }
  };
  NB.setApplying = function (on) { applying = !!on; };

  NB.onRemoteState = function (fn) {
    if (!bc) return;
    bc.onmessage = function (ev) {
      if (!ev.data || ev.data.clientId === clientId || !ev.data.state) return;
      applying = true;
      try { fn(ev.data.state); } finally { applying = false; }
    };
  };

  NB.loadSession = function () {
    try { return JSON.parse(sessionStorage.getItem(NB.SESSION_KEY) || "null"); } catch (e) { return null; }
  };
  NB.saveSession = function (sess) {
    try { sessionStorage.setItem(NB.SESSION_KEY, JSON.stringify(sess)); } catch (e) {}
  };
})(window.NB = window.NB || {});
