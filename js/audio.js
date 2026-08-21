/* global window, document, NB */
(function (NB) {
  var unlocked = false;
  var ctx = null;
  var master = null;
  var bedGain = null;
  var bedNodes = [];
  var bedTimers = [];
  var ambientId = "";
  var fading = null;
  var voiceDone = true;
  var lastSpeakKey = "";
  var uttered = null;
  var spokeThisLine = false;
  var noiseBuf = null;

  function isStage() {
    try { return !!(document.body && document.body.classList.contains("is-stage")); }
    catch (e) { return false; }
  }

  function stripHtml(s) {
    return String(s || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"").replace(/&#39;/g, "'")
      .replace(/\s+/g, " ").trim();
  }

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    bedGain = ctx.createGain();
    bedGain.gain.value = 0;
    bedGain.connect(master);
    return ctx;
  }

  function unlock() {
    unlocked = true;
    var c = ensureCtx();
    if (c && c.state === "suspended") {
      try { c.resume(); } catch (e) {}
    }
    try {
      if (window.speechSynthesis) speechSynthesis.getVoices();
    } catch (e2) {}
    return unlocked;
  }

  function makeNoise(seconds) {
    var c = ensureCtx();
    if (!c) return null;
    if (noiseBuf) return noiseBuf;
    var n = Math.max(1, Math.floor(c.sampleRate * (seconds || 2)));
    var buf = c.createBuffer(1, n, c.sampleRate);
    var d = buf.getChannelData(0);
    var acc = 0;
    for (var i = 0; i < n; i++) {
      acc = acc * 0.96 + (Math.random() * 2 - 1) * 0.35;
      d[i] = acc + (Math.random() * 2 - 1) * 0.15;
    }
    noiseBuf = buf;
    return buf;
  }

  function noiseSrc(loop) {
    var c = ensureCtx();
    if (!c) return null;
    var src = c.createBufferSource();
    src.buffer = makeNoise(2.4);
    src.loop = loop !== false;
    return src;
  }

  function filter(type, freq, q) {
    var c = ensureCtx();
    var f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (q != null) f.Q.value = q;
    return f;
  }

  function osc(type, freq) {
    var c = ensureCtx();
    var o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    return o;
  }

  function gain(v) {
    var c = ensureCtx();
    var g = c.createGain();
    g.gain.value = v;
    return g;
  }

  function lfo(freq, dest, depth, offset) {
    var c = ensureCtx();
    var o = osc("sine", freq);
    var g = gain(depth);
    o.connect(g);
    g.connect(dest);
    if (offset != null && dest.value != null) dest.value = offset;
    o.start();
    bedNodes.push(o, g);
    return o;
  }

  function track(node) {
    if (node) bedNodes.push(node);
    return node;
  }

  function later(fn, ms) {
    var id = setTimeout(fn, ms);
    bedTimers.push(id);
    return id;
  }

  function stopBeds(fadeMs) {
    var c = ctx;
    var g = bedGain;
    bedTimers.forEach(function (id) { clearTimeout(id); });
    bedTimers = [];
    if (!c || !g) {
      bedNodes.forEach(function (n) {
        try { if (n.stop) n.stop(); } catch (e) {}
        try { n.disconnect(); } catch (e2) {}
      });
      bedNodes = [];
      ambientId = "";
      return;
    }
    var now = c.currentTime;
    var t = Math.max(0.05, (fadeMs || 600) / 1000);
    try {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0, now + t);
    } catch (e3) {
      g.gain.value = 0;
    }
    var old = bedNodes.slice();
    bedNodes = [];
    later(function () {
      old.forEach(function (n) {
        try { if (n.stop) n.stop(); } catch (e4) {}
        try { n.disconnect(); } catch (e5) {}
      });
    }, Math.ceil(t * 1000) + 40);
  }

  function fadeBedIn(target, fadeMs) {
    var c = ctx;
    if (!c || !bedGain) return;
    var now = c.currentTime;
    var t = Math.max(0.05, (fadeMs || 600) / 1000);
    try {
      bedGain.gain.cancelScheduledValues(now);
      bedGain.gain.setValueAtTime(bedGain.gain.value, now);
      bedGain.gain.linearRampToValueAtTime(target, now + t);
    } catch (e) {
      bedGain.gain.value = target;
    }
  }

  function startInn() {
    var src = track(noiseSrc(true));
    var lp = track(filter("lowpass", 520, 0.7));
    var g = track(gain(0.14));
    src.connect(lp);
    lp.connect(g);
    g.connect(bedGain);
    src.start();
    lfo(0.07, lp.frequency, 80, 520);

    var hum = track(osc("sine", 78));
    var hg = track(gain(0.03));
    hum.connect(hg);
    hg.connect(bedGain);
    hum.start();

    var murmur = track(noiseSrc(true));
    var bp = track(filter("bandpass", 280, 0.9));
    var mg = track(gain(0.07));
    murmur.connect(bp);
    bp.connect(mg);
    mg.connect(bedGain);
    murmur.start();
    lfo(0.11, mg.gain, 0.03, 0.07);

    function crackle() {
      if (ambientId !== "inn" || !ctx) return;
      var n = track(noiseSrc(false));
      var hp = track(filter("highpass", 1800, 0.7));
      var cg = track(gain(0));
      n.loop = false;
      n.connect(hp);
      hp.connect(cg);
      cg.connect(bedGain);
      var now = ctx.currentTime;
      var dur = 0.018 + Math.random() * 0.05;
      cg.gain.setValueAtTime(0, now);
      cg.gain.linearRampToValueAtTime(0.09 + Math.random() * 0.08, now + 0.004);
      cg.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      try { n.start(); n.stop(now + dur + 0.02); } catch (e) {}
      later(crackle, 180 + Math.random() * 900);
    }
    later(crackle, 400);
  }

  function startQuay() {
    var water = track(noiseSrc(true));
    var lp = track(filter("lowpass", 640, 0.8));
    var wg = track(gain(0.14));
    water.connect(lp);
    lp.connect(wg);
    wg.connect(bedGain);
    water.start();
    lfo(0.13, lp.frequency, 180, 640);
    lfo(0.09, wg.gain, 0.05, 0.14);

    var wind = track(noiseSrc(true));
    var hp = track(filter("highpass", 700, 0.6));
    var bp = track(filter("bandpass", 1400, 0.5));
    var vg = track(gain(0.05));
    wind.connect(hp);
    hp.connect(bp);
    bp.connect(vg);
    vg.connect(bedGain);
    wind.start();
    lfo(0.05, vg.gain, 0.02, 0.05);
  }

  function startHall(tight) {
    var hush = track(noiseSrc(true));
    var lp = track(filter("lowpass", tight ? 280 : 360, 0.8));
    var hg = track(gain(tight ? 0.04 : 0.07));
    hush.connect(lp);
    lp.connect(hg);
    hg.connect(bedGain);
    hush.start();

    var crowd = track(noiseSrc(true));
    var bp = track(filter("bandpass", tight ? 220 : 310, 1.1));
    var cg = track(gain(tight ? 0.025 : 0.05));
    crowd.connect(bp);
    bp.connect(cg);
    cg.connect(bedGain);
    crowd.start();
    lfo(0.06, cg.gain, tight ? 0.003 : 0.007, tight ? 0.01 : 0.02);

    if (tight) return;

    function clink() {
      if (ambientId !== "hall" || !ctx) return;
      var o = track(osc("triangle", 1400 + Math.random() * 700));
      var g = track(gain(0));
      o.connect(g);
      g.connect(bedGain);
      var now = ctx.currentTime;
      g.gain.setValueAtTime(0.012, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      try { o.start(); o.stop(now + 0.24); } catch (e) {}
      later(clink, 4000 + Math.random() * 8000);
    }
    later(clink, 2500);
  }

  function startBed(id) {
    if (id === "inn") startInn();
    else if (id === "quay") startQuay();
    else if (id === "faceoff") startHall(true);
    else startHall(false);
  }

  function setAmbient(id) {
    if (!unlocked || !id) {
      if (ambientId) {
        stopBeds(600);
        ambientId = "";
      }
      return;
    }
    ensureCtx();
    if (!ctx) return;
    if (id === ambientId && bedNodes.length) return;
    var prev = ambientId;
    if (prev && prev !== id) stopBeds(600);
    ambientId = id;
    startBed(id);
    fadeBedIn(1, prev ? 600 : 600);
  }

  function voiceProfile(speakerId) {
    var id = String(speakerId || "");
    if (id === "sera") return { pitch: 0.92, rate: 0.9, prefer: "low" };
    if (id === "mara") return { pitch: 1.08, rate: 0.94, prefer: "warm" };
    if (id === "dreth") return { pitch: 0.72, rate: 0.86, prefer: "low" };
    if (id === "kell") return { pitch: 1.0, rate: 0.9, prefer: "even" };
    if (id === "pava") return { pitch: 0.98, rate: 0.93, prefer: "even" };
    if (id === "aldren") return { pitch: 0.82, rate: 0.92, prefer: "warm" };
    return { pitch: 1.0, rate: 0.96, prefer: "narr" };
  }

  function pickVoice(pref) {
    var list = [];
    try { list = (window.speechSynthesis && speechSynthesis.getVoices()) || []; }
    catch (e) { list = []; }
    if (!list.length) return null;
    var en = [];
    var i;
    for (i = 0; i < list.length; i++) {
      if (/^en/i.test(list[i].lang || "")) en.push(list[i]);
    }
    var pool = en.length ? en : list;
    function score(v) {
      var n = ((v.name || "") + " " + (v.voiceURI || "")).toLowerCase();
      var s = 0;
      if (v.localService) s += 2;
      if (pref === "low" && /(male|daniel|fred|alex|david|george|rishi)/.test(n)) s += 3;
      if (pref === "warm" && /(female|samantha|karen|moira|tessa|zira|fiona)/.test(n)) s += 3;
      if (pref === "even" && /(female|karen|moira|samantha)/.test(n)) s += 2;
      if (pref === "narr" && /(daniel|alex|samantha|karen|google)/.test(n)) s += 2;
      if (/google|premium|enhanced|natural/.test(n)) s += 1;
      return s;
    }
    var best = pool[0], bestS = -1;
    for (i = 0; i < pool.length; i++) {
      var sc = score(pool[i]);
      if (sc > bestS) { best = pool[i]; bestS = sc; }
    }
    if (pref === "low" && pool.length > 1) {
      for (i = 0; i < pool.length; i++) {
        if (pool[i] !== best && score(pool[i]) >= 3) return pool[i];
      }
    }
    return best;
  }

  function cancelVoice() {
    lastSpeakKey = "";
    spokeThisLine = false;
    voiceDone = true;
    uttered = null;
    try {
      if (window.speechSynthesis) speechSynthesis.cancel();
    } catch (e) {}
  }

  function speakLine(text, speakerId) {
    if (!unlocked) return;
    var plain = stripHtml(text);
    if (!plain) return;
    var key = String(speakerId || "") + "|" + plain;
    if (key === lastSpeakKey) return;
    lastSpeakKey = key;
    spokeThisLine = false;
    try {
      if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function") {
        voiceDone = true;
        return;
      }
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(plain);
      var prof = voiceProfile(speakerId);
      u.pitch = prof.pitch;
      u.rate = prof.rate;
      u.volume = 1;
      var v = pickVoice(prof.prefer);
      if (v) u.voice = v;
      voiceDone = false;
      uttered = u;
      u.onend = function () {
        if (uttered === u) {
          voiceDone = true;
          spokeThisLine = true;
          uttered = null;
        }
      };
      u.onerror = function () {
        if (uttered === u) {
          voiceDone = true;
          uttered = null;
        }
      };
      speechSynthesis.speak(u);
    } catch (e) {
      voiceDone = true;
      uttered = null;
    }
  }

  function stopAll() {
    cancelVoice();
    stopBeds(400);
    ambientId = "";
  }

  try {
    if (window.speechSynthesis && speechSynthesis.addEventListener) {
      speechSynthesis.addEventListener("voiceschanged", function () {});
    } else if (window.speechSynthesis) {
      speechSynthesis.onvoiceschanged = function () {};
    }
  } catch (e) {}

  NB.audio = {
    unlock: unlock,
    isUnlocked: function () { return unlocked; },
    speakLine: speakLine,
    cancelVoice: cancelVoice,
    voiceDone: function () { return voiceDone; },
    justFinishedVoice: function () { return spokeThisLine && voiceDone; },
    setAmbient: setAmbient,
    stopAll: stopAll,
    ambientId: function () { return ambientId; }
  };
})(window.NB = window.NB || {});
