/* global window, document */
(function () {
  window.NB_FEEDBACK = { open: true };

  var NTFY = "https://ntfy.sh/9b-playtest-3679cfae-e1ac-4ca4-8a7a";
  var OUTBOX = "nb-feedback-outbox";
  var TABLE = "9B-PELLANE";

  function $(id) { return document.getElementById(id); }
  function lockedOff() {
    return !(window.NB_FEEDBACK && window.NB_FEEDBACK.open);
  }

  function session() {
    try {
      var NB = window.NB || {};
      var raw = sessionStorage.getItem(NB.SESSION_KEY || "nb-session");
      return JSON.parse(raw || "null") || {};
    } catch (e) { return {}; }
  }

  function tableState() {
    try {
      var NB = window.NB || {};
      var raw = localStorage.getItem(NB.STATE_KEY || "nb-table-state");
      return JSON.parse(raw || "null") || {};
    } catch (e) { return {}; }
  }

  function sceneLabel() {
    var S = tableState();
    var id = S.sceneId || "";
    var sc = window.NB && NB.SCENES && NB.SCENES[id];
    return (sc && sc.name) || id || "";
  }

  function applyLock() {
    var btn = $("btn-feedback");
    var sheet = $("feedback-sheet");
    if (lockedOff()) {
      if (btn) btn.classList.add("hidden");
      if (sheet) sheet.classList.add("hidden");
      return;
    }
    if (btn) btn.classList.remove("hidden");
  }

  function openSheet() {
    if (lockedOff()) return;
    var sess = session();
    var name = (sess.name || "").trim();
    $("fb-name").value = name;
    $("fb-note").value = "";
    $("fb-form").classList.remove("hidden");
    $("fb-thanks").classList.add("hidden");
    $("fb-send").disabled = false;
    $("fb-send").textContent = "Send";
    $("feedback-sheet").classList.remove("hidden");
    setTimeout(function () { $("fb-note").focus(); }, 40);
  }

  function closeSheet() {
    var sheet = $("feedback-sheet");
    if (sheet) sheet.classList.add("hidden");
  }

  function showThanks() {
    closeSheet();
    var toast = $("fb-toast");
    if (!toast) return;
    toast.classList.remove("hidden");
    clearTimeout(showThanks._t);
    showThanks._t = setTimeout(function () {
      toast.classList.add("hidden");
    }, 1800);
  }

  function appendOutbox(entry) {
    var box = [];
    try { box = JSON.parse(localStorage.getItem(OUTBOX) || "[]") || []; } catch (e) { box = []; }
    if (!Array.isArray(box)) box = [];
    box.push(entry);
    try { localStorage.setItem(OUTBOX, JSON.stringify(box)); } catch (e2) {}
  }

  function postNtfy(body) {
    var headers = { Title: "Nine Banners playtest" };
    return fetch(NTFY, { method: "POST", headers: headers, body: body })
      .catch(function () {
        return fetch(NTFY, { method: "POST", headers: headers, body: body, mode: "no-cors" });
      });
  }

  function withTimeout(p, ms) {
    return Promise.race([
      p.catch(function () { return null; }),
      new Promise(function (resolve) { setTimeout(function () { resolve(null); }, ms); })
    ]);
  }

  function send() {
    if (lockedOff()) return;
    var note = ($("fb-note").value || "").trim();
    if (!note) { $("fb-note").focus(); return; }
    var sess = session();
    var name = ($("fb-name").value || "").trim() || (sess.name || "").trim() || "anonymous";
    var role = sess.role || "";
    var scene = sceneLabel();
    var payload = {
      name: name,
      role: role,
      scene: scene,
      message: note,
      table: TABLE
    };
    var body = JSON.stringify(payload);
    appendOutbox({ at: Date.now(), name: name, role: role, scene: scene, message: note, table: TABLE });
    $("fb-send").disabled = true;
    $("fb-send").textContent = "Sending…";
    withTimeout(postNtfy(body), 4000).then(function () {
      showThanks();
    });
  }

  function bind() {
    applyLock();
    if (lockedOff()) return;
    var btn = $("btn-feedback");
    var sheet = $("feedback-sheet");
    if (!btn || !sheet) return;
    btn.addEventListener("click", openSheet);
    sheet.addEventListener("click", function (ev) {
      if (ev.target.id === "feedback-sheet") closeSheet();
    });
    var back = $("fb-back");
    if (back) back.addEventListener("click", closeSheet);
    var form = $("fb-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        send();
      });
    }
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sheet && !sheet.classList.contains("hidden")) {
        closeSheet();
        e.preventDefault();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
