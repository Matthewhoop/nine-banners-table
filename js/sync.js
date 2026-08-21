/* global window, Peer */
(function (NB) {
  var api = null;
  var peer = null;
  var role = "";
  var hostId = "";
  var hostConn = null;
  var conns = [];
  var applying = false;
  var gotHostState = false;
  var heartbeatTimer = null;
  var bootTimer = null;
  var retryTimer = null;
  var retries = 0;
  var linked = false;

  var STORY_KEYS = [
    "sceneId", "stageMode", "faceoff", "beat", "decision", "resolvedDecisions",
    "lastAction", "started", "endCard", "talkReturn", "pendingNextScene",
    "heardLines", "lastRoll", "px", "py", "facing", "storyLog"
  ];

  function now() { return Date.now(); }

  function nameKey(name) {
    return String(name || "").trim().toLowerCase();
  }

  function hostPeerId() {
    var code = NB.TABLE_CODE || "9B-PELLANE";
    try {
      var S = api && api.getState && api.getState();
      if (S && S.tableCode) code = S.tableCode;
    } catch (e) {}
    return "nbtable" + String(code).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  }

  function clone(obj) {
    try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return obj; }
  }

  function asPresenceMap(p) {
    if (!p) return {};
    if (Array.isArray(p)) {
      var m = {};
      p.forEach(function (e) {
        if (!e) return;
        var k = nameKey(e.key || e.name);
        if (k) m[k] = e;
      });
      return m;
    }
    return p;
  }

  function prunePresenceMap(map) {
    var cut = now() - 40000;
    var out = {};
    Object.keys(asPresenceMap(map)).forEach(function (k) {
      var p = map[k];
      if (p && p.at && p.at >= cut) out[k] = p;
    });
    return out;
  }

  function unionParty(a, b) {
    var by = {};
    function add(pc, incoming) {
      if (!pc || !pc.name) return;
      var k = nameKey(pc.name);
      if (!k) return;
      if (!by[k]) { by[k] = pc; return; }
      var keep = by[k];
      var merged = Object.assign({}, incoming ? keep : pc, incoming ? pc : keep);
      merged.hp = keep.hp != null ? keep.hp : pc.hp;
      merged.maxHp = keep.maxHp != null ? keep.maxHp : pc.maxHp;
      if (keep.id) merged.id = keep.id;
      if (keep.color && !merged.color) merged.color = keep.color;
      by[k] = merged;
    }
    (a || []).forEach(function (pc) { add(pc, false); });
    (b || []).forEach(function (pc) { add(pc, true); });
    return Object.keys(by).map(function (k) { return by[k]; });
  }

  function unionJoined(a, b) {
    var by = {};
    function add(j) {
      if (j == null) return;
      var key = nameKey(typeof j === "string" ? j : (j.key || j.name || ""));
      if (!key) return;
      var rec = typeof j === "string"
        ? { key: key, name: j, at: 0 }
        : { key: key, name: j.name || key, at: j.at || 0 };
      if (!by[key] || (rec.at || 0) >= (by[key].at || 0)) {
        by[key] = Object.assign({}, by[key] || {}, rec);
      }
    }
    (a || []).forEach(add);
    (b || []).forEach(add);
    return Object.keys(by).map(function (k) { return by[k]; });
  }

  function unionPresence(a, b) {
    return prunePresenceMap(Object.assign({}, asPresenceMap(a), asPresenceMap(b)));
  }

  function mergeDecision(local, remote, takeRemote) {
    if (!local && !remote) return null;
    if (!local) return remote;
    if (!remote) return local;
    var base = takeRemote ? clone(remote) : clone(local);
    if (local.id && remote.id && local.id === remote.id) {
      base.submissions = Object.assign({}, local.submissions || {}, remote.submissions || {});
      if (!base.actorName && local.actorName) {
        base.actorName = local.actorName;
        base.actorId = local.actorId || base.actorId;
      }
    }
    return base;
  }

  function remoteIsNewer(local, remote) {
    var lr = (local && local.rev) | 0;
    var rr = (remote && remote.rev) | 0;
    var la = (local && local.updatedAt) || 0;
    var ra = (remote && remote.updatedAt) || 0;
    if (rr !== lr) return rr > lr;
    return ra > la;
  }

  function mergeRemote(local, remote, opts) {
    opts = opts || {};
    local = local || {};
    remote = remote || {};
    var first = !!opts.firstConnect;
    var newer = remoteIsNewer(local, remote);
    var takeStory = first || newer;
    var next = Object.assign({}, local);
    if (takeStory) {
      STORY_KEYS.forEach(function (k) {
        if (remote[k] !== undefined) next[k] = remote[k];
      });
      next.rev = Math.max(local.rev | 0, remote.rev | 0);
      next.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0);
    }
    next.party = unionParty(local.party, remote.party);
    next.joined = unionJoined(local.joined, remote.joined);
    next.presence = unionPresence(local.presence, remote.presence);
    next.decision = mergeDecision(local.decision, remote.decision, takeStory);
    return next;
  }

  function isStageSeat(entry, key) {
    var k = nameKey(key || (entry && (entry.key || entry.name)));
    if (k === "table" || k === "dm") return true;
    return !!(entry && entry.seat === "stage");
  }

  function liveCount(state) {
    var names = {};
    var S = state || (api && api.getState && api.getState()) || {};
    var me = (api && api.getMe && api.getMe()) || {};
    var mk = nameKey(me.key || me.name);
    if (mk && mk !== "guest" && !isStageSeat(me, mk)) names[mk] = true;
    var pres = prunePresenceMap(S.presence);
    Object.keys(pres).forEach(function (k) {
      if (!k || k === "guest") return;
      if (isStageSeat(pres[k], k)) return;
      names[k] = true;
    });
    (S.party || []).forEach(function (p) {
      var k = nameKey(p && p.name);
      if (k && k !== "guest" && k !== "table" && k !== "dm") names[k] = true;
    });
    return Object.keys(names).length;
  }

  function applyIncoming(remote, first) {
    if (!api || !remote) return;
    var local = api.getState() || {};
    var merged = mergeRemote(local, remote, { firstConnect: first });
    applying = true;
    try { api.applyState(merged); } finally { applying = false; }
  }

  function send(conn, msg) {
    if (!conn || !conn.open) return;
    try { conn.send(msg); } catch (e) {}
  }

  function fanoutState(state) {
    if (role !== "host") return;
    var payload = { type: "state", state: state };
    conns = conns.filter(function (c) { return c && c.open; });
    conns.forEach(function (c) { send(c, payload); });
    linked = conns.length > 0;
  }

  function fanoutPresence(presence) {
    var payload = { type: "presence", presence: presence };
    if (role === "host") conns.forEach(function (c) { send(c, payload); });
    else if (hostConn) send(hostConn, payload);
  }

  function rememberPresence(entry) {
    if (!api || !entry) return;
    var key = nameKey(entry.key || entry.name);
    if (!key) return;
    var S = api.getState();
    if (!S) return;
    S.presence = prunePresenceMap(S.presence);
    S.presence[key] = {
      key: key,
      name: entry.name || key,
      color: entry.color || "#c9a15b",
      seat: entry.seat || (isStageSeat(entry, key) ? "stage" : "player"),
      at: entry.at || now()
    };
    if (typeof api.applyState === "function") {
      applying = true;
      try { api.applyState(S, { presenceOnly: true }); } finally { applying = false; }
    }
  }

  function myHeartbeat() {
    var me = (api && api.getMe && api.getMe()) || {};
    var key = nameKey(me.key || me.name);
    if (!key || key === "guest") return null;
    return {
      type: "heartbeat",
      key: key,
      name: me.name || key,
      color: me.color || "#c9a15b",
      seat: me.seat || (isStageSeat(me, key) ? "stage" : "player"),
      at: now()
    };
  }

  function pulse() {
    var hb = myHeartbeat();
    if (hb) {
      rememberPresence(hb);
      if (role === "host") fanoutPresence((api.getState() || {}).presence);
      else if (hostConn) send(hostConn, hb);
    }
  }

  function startHeartbeat() {
    if (heartbeatTimer) return;
    pulse();
    heartbeatTimer = setInterval(pulse, 5000);
  }

  function attachHostConn(conn) {
    if (!conn) return;
    conns.push(conn);
    function greet() {
      send(conn, { type: "state", state: api.getState() });
      startHeartbeat();
      linked = true;
    }
    conn.on("open", greet);
    conn.on("data", function (msg) { onHostData(msg, conn); });
    conn.on("close", function () {
      conns = conns.filter(function (c) { return c !== conn && c && c.open; });
      linked = conns.length > 0;
    });
    conn.on("error", function () {
      conns = conns.filter(function (c) { return c !== conn && c && c.open; });
    });
    if (conn.open) greet();
  }

  function onHostData(msg) {
    if (!msg || !api) return;
    if (msg.type === "join") {
      var S = api.getState() || {};
      if (msg.pc) S.party = unionParty(S.party, [msg.pc]);
      if (msg.name || msg.key) {
        S.joined = unionJoined(S.joined, [{
          key: nameKey(msg.key || msg.name),
          name: msg.name || msg.key,
          at: now()
        }]);
      }
      if (msg.key || msg.name) {
        rememberPresence({
          key: msg.key || msg.name,
          name: msg.name,
          color: msg.color || (msg.pc && msg.pc.color),
          seat: msg.seat || ((nameKey(msg.key || msg.name) === "table") ? "stage" : "player"),
          at: now()
        });
      }
      applying = true;
      try { api.applyState(S); } finally { applying = false; }
      fanoutState(api.getState());
      return;
    }
    if (msg.type === "state" && msg.state) {
      applyIncoming(msg.state, false);
      fanoutState(api.getState());
      return;
    }
    if (msg.type === "heartbeat") {
      rememberPresence(msg);
      fanoutPresence((api.getState() || {}).presence);
      return;
    }
    if (msg.type === "presence" && msg.presence) {
      var cur = api.getState();
      if (cur) {
        cur.presence = unionPresence(cur.presence, msg.presence);
        applying = true;
        try { api.applyState(cur, { presenceOnly: true }); } finally { applying = false; }
      }
    }
  }

  function sendJoin() {
    var me = (api && api.getMe && api.getMe()) || {};
    send(hostConn, {
      type: "join",
      name: me.name || "",
      key: me.key || nameKey(me.name),
      pc: me.pc || null,
      color: me.color || "",
      seat: me.seat || "player"
    });
  }

  function onClientData(msg) {
    if (!msg || !api) return;
    if (msg.type === "state" && msg.state) {
      var first = !gotHostState;
      gotHostState = true;
      applyIncoming(msg.state, first);
      if (first) sendJoin();
      return;
    }
    if (msg.type === "presence" && msg.presence) {
      var S = api.getState();
      if (S) S.presence = unionPresence(S.presence, msg.presence);
      if (typeof api.applyState === "function") {
        applying = true;
        try { api.applyState(S, { presenceOnly: true }); } finally { applying = false; }
      }
    }
  }

  function destroyPeer() {
    try { if (hostConn) hostConn.close(); } catch (e) {}
    try { if (peer) peer.destroy(); } catch (e2) {}
    peer = null;
    hostConn = null;
    conns = [];
    linked = false;
  }

  function becomeHost() {
    role = "host";
    gotHostState = true;
    hostConn = null;
    conns = [];
    try { peer = new Peer(hostId); }
    catch (e) {
      role = "";
      return;
    }
    peer.on("open", function () {
      if (bootTimer) { clearTimeout(bootTimer); bootTimer = null; }
      startHeartbeat();
    });
    peer.on("connection", attachHostConn);
    peer.on("error", function (err) {
      var type = err && err.type;
      if (type === "unavailable-id") {
        destroyPeer();
        setTimeout(becomeClient, 40);
        return;
      }
      if (type === "network" || type === "server-error" || type === "socket-error" || type === "disconnected") {
        scheduleRetry("host");
      }
    });
    peer.on("disconnected", function () {
      try { peer.reconnect(); } catch (e2) { scheduleRetry("host"); }
    });
  }

  function becomeClient() {
    role = "client";
    gotHostState = false;
    try { peer = new Peer(); }
    catch (e) {
      role = "";
      return;
    }
    peer.on("open", function () {
      if (bootTimer) { clearTimeout(bootTimer); bootTimer = null; }
      connectToHost();
    });
    peer.on("error", function (err) {
      var type = err && err.type;
      if (type === "peer-unavailable" || type === "network" || type === "server-error" || type === "socket-error") {
        scheduleRetry("client");
      }
    });
    peer.on("disconnected", function () {
      try { peer.reconnect(); } catch (e2) { scheduleRetry("client"); }
    });
  }

  function connectToHost() {
    if (!peer || role !== "client") return;
    try { if (hostConn) hostConn.close(); } catch (e) {}
    hostConn = peer.connect(hostId, { reliable: true });
    hostConn.on("open", function () {
      linked = true;
      retries = 0;
      sendJoin();
      startHeartbeat();
    });
    hostConn.on("data", onClientData);
    hostConn.on("close", function () {
      linked = false;
      scheduleRetry("client");
    });
    hostConn.on("error", function () {
      linked = false;
      scheduleRetry("client");
    });
  }

  function scheduleRetry(want) {
    if (retryTimer) return;
    retryTimer = setTimeout(function () {
      retryTimer = null;
      retries += 1;
      destroyPeer();
      if (want === "client" && retries >= 4) {
        retries = 0;
        becomeHost();
        return;
      }
      if (want === "host") becomeHost();
      else becomeClient();
    }, 1400);
  }

  function startPeer() {
    hostId = hostPeerId();
    if (typeof Peer === "undefined") return;
    var me = (api && api.getMe && api.getMe()) || {};
    if (me.seat === "stage") becomeHost();
    else becomeClient();
  }

  NB.refreshSyncRole = function () {
    var me = (api && api.getMe && api.getMe()) || {};
    hostId = hostPeerId();
    if (typeof Peer === "undefined") return;
    if (me.seat === "stage") {
      if (role === "host") return;
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
      retries = 0;
      destroyPeer();
      becomeHost();
      return;
    }
    if (role === "client" || role === "host") return;
    becomeClient();
  };

  NB.mergeRemote = mergeRemote;
  NB.hostPeerId = hostPeerId;
  NB.syncLiveCount = function (state) { return liveCount(state); };
  NB.syncLinked = function () { return !!linked; };

  NB.pushSync = function (state) {
    if (applying) return;
    state = state || (api && api.getState && api.getState());
    if (!state) return;
    if (role === "host") fanoutState(state);
    else if (role === "client" && hostConn && hostConn.open) {
      send(hostConn, { type: "state", state: state });
    }
  };

  NB.afterSave = function (state) {
    NB.pushSync(state);
  };

  NB.initSync = function (opts) {
    api = opts || {};
    hostId = hostPeerId();
    bootTimer = setTimeout(function () {
      bootTimer = null;
    }, 3000);
    if (typeof Peer === "undefined") {
      setTimeout(function () {
        if (typeof Peer === "undefined") return;
        startPeer();
      }, 3000);
      return;
    }
    startPeer();
  };
})(window.NB = window.NB || {});
