/* global window */
(function (NB) {
  var W = 240, H = 160;
  NB.STAGE_W = W;
  NB.STAGE_H = H;

  var images = {};
  var sprites = {}; // id -> canvas (trimmed, keyed)
  var ready = false;
  var loadCbs = [];

  function loadImg(src) {
    return new Promise(function (resolve) {
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function () { resolve(null); };
      im.src = src;
    });
  }

  function chromaKey(img) {
    var c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    var ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    var d = ctx.getImageData(0, 0, c.width, c.height);
    var p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      var r = p[i], g = p[i + 1], b = p[i + 2];
      // #FF00FF and near-magenta
      if (r > 230 && b > 230 && g < 40) p[i + 3] = 0;
      else if (r > 200 && b > 200 && g < 80 && Math.abs(r - b) < 30) p[i + 3] = 0;
    }
    ctx.putImageData(d, 0, 0);
    return c;
  }

  function trimCanvas(src, sx, sy, sw, sh) {
    var tmp = document.createElement("canvas");
    tmp.width = sw;
    tmp.height = sh;
    var tctx = tmp.getContext("2d");
    tctx.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
    var d = tctx.getImageData(0, 0, sw, sh);
    var p = d.data;
    var minX = sw, minY = sh, maxX = 0, maxY = 0, found = false;
    for (var y = 0; y < sh; y++) {
      for (var x = 0; x < sw; x++) {
        if (p[(y * sw + x) * 4 + 3] > 12) {
          found = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) return tmp;
    var tw = maxX - minX + 1, th = maxY - minY + 1;
    var out = document.createElement("canvas");
    out.width = tw;
    out.height = th;
    out.getContext("2d").drawImage(tmp, minX, minY, tw, th, 0, 0, tw, th);
    return out;
  }

  function splitCast(sheet) {
    var n = 4;
    var cw = Math.floor(sheet.width / n);
    var ids = ["player", "sera", "aldren", "dreth"];
    for (var i = 0; i < n; i++) {
      sprites[ids[i]] = trimCanvas(sheet, i * cw, 0, cw, sheet.height);
    }
  }

  NB.loadArt = function () {
    var paths = {
      inn: "art/inn.png",
      quay: "art/quay.png",
      hall: "art/hall.png",
      faceoff: "art/faceoff.png",
      cast: "art/cast.png"
    };
    var keys = Object.keys(paths);
    return Promise.all(keys.map(function (k) { return loadImg(paths[k]); })).then(function (arr) {
      keys.forEach(function (k, i) {
        if (arr[i]) images[k] = arr[i];
      });
      if (images.cast) splitCast(chromaKey(images.cast));
      ready = true;
      loadCbs.forEach(function (fn) { fn(); });
      loadCbs = [];
    });
  };

  NB.onArt = function (fn) {
    if (ready) fn();
    else loadCbs.push(fn);
  };

  NB.hasSprite = function (id) { return !!sprites[id]; };

  var tintCache = {};

  function parseHex(hex) {
    var h = String(hex || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length < 6) return [42, 107, 90];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    var hh = 0, ss = max ? d / max : 0, vv = max;
    if (d) {
      if (max === r) hh = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) hh = ((b - r) / d + 2) / 6;
      else hh = ((r - g) / d + 4) / 6;
    }
    return [hh * 360, ss, vv];
  }
  function shadeTo(tr, tg, tb, lum) {
    var tgt = (0.3 * tr + 0.59 * tg + 0.11 * tb) / 255 || 0.4;
    var k = lum / tgt;
    return [
      Math.max(0, Math.min(255, Math.round(tr * k))),
      Math.max(0, Math.min(255, Math.round(tg * k))),
      Math.max(0, Math.min(255, Math.round(tb * k)))
    ];
  }
  function recolorSprite(src, look) {
    if (!src || !look) return src;
    var key = String(look.id || "") + "|" + String(look.tunic || "") + "|" + String(look.tunic2 || "") + "|" + String(look.accent || "");
    if (tintCache[key]) return tintCache[key];
    var c = document.createElement("canvas");
    c.width = src.width;
    c.height = src.height;
    var cx = c.getContext("2d");
    cx.drawImage(src, 0, 0);
    var img = cx.getImageData(0, 0, c.width, c.height);
    var p = img.data;
    var tunic = parseHex(look.tunic);
    var tunic2 = parseHex(look.tunic2 || look.tunic);
    var accent = parseHex(look.accent || look.tunic);
    var i, r, g, b, hsv, dest, out, lum;
    for (i = 0; i < p.length; i += 4) {
      if (p[i + 3] < 20) continue;
      r = p[i]; g = p[i + 1]; b = p[i + 2];
      hsv = rgbToHsv(r, g, b);
      dest = null;
      if (hsv[1] > 0.16 && hsv[0] >= 128 && hsv[0] <= 198) dest = hsv[2] > 0.38 ? tunic : tunic2;
      else if (hsv[1] > 0.3 && hsv[2] > 0.34 && hsv[0] >= 32 && hsv[0] <= 58) dest = accent;
      if (!dest) continue;
      lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
      out = shadeTo(dest[0], dest[1], dest[2], lum);
      p[i] = out[0]; p[i + 1] = out[1]; p[i + 2] = out[2];
    }
    cx.putImageData(img, 0, 0);
    tintCache[key] = c;
    return c;
  }
  function spriteFor(id, look) {
    var spr = sprites[id] || null;
    if (!spr) spr = sprites.player || null;
    if (spr && look && (!sprites[id] || id === "player")) spr = recolorSprite(spr, look);
    return spr;
  }

  function fallbackPerson(ctx, look, scale) {
    var s = scale || 1;
    var px = function (x, y, w, h, c) {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x * s), Math.round(y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)));
    };
    px(4, 1, 8, 7, look.hair);
    px(5, 3, 6, 6, look.skin);
    px(6, 5, 2, 1, "#1a1210");
    px(9, 5, 2, 1, "#1a1210");
    px(6, 8, 4, 2, look.skin);
    px(3, 10, 10, 8, look.tunic);
    px(3, 12, 10, 2, look.accent);
    px(4, 18, 8, 2, look.tunic2);
    px(4, 20, 3, 5, look.pants);
    px(9, 20, 3, 5, look.pants);
    px(4, 24, 3, 2, look.boots);
    px(9, 24, 3, 2, look.boots);
  }

  NB.sceneToView = function (x, y, destW, destH) {
    var ir = 240 / 160;
    var cr = destW / destH;
    var dw, dh, dx, dy;
    if (ir > cr) { dh = destH; dw = destH * ir; dx = (destW - dw) / 2; dy = 0; }
    else { dw = destW; dh = destW / ir; dx = 0; dy = (destH - dh) / 2; }
    return { x: dx + (x / 240) * dw, y: dy + (y / 160) * dh };
  };

  NB.drawActor = function (ctx, id, x, y, opts) {
    opts = opts || {};
    var facing = opts.facing || "down";
    var walking = !!opts.walking;
    var t = opts.t || 0;
    var h = opts.h || 28;
    var bob = 0;
    if (walking) bob = (Math.floor(t / 8) % 2) ? -1 : 0;
    else bob = (Math.floor(t / 28) % 2) ? 0 : -1;
    var look = opts.look || NB.LOOKS[id] || NB.LOOKS.player;
    var spr = spriteFor(id, look);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + bob));
    if (facing === "left") ctx.scale(-1, 1);
    if (spr) {
      var scale = h / spr.height;
      var dw = Math.round(spr.width * scale);
      var dh = Math.round(spr.height * scale);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(spr, -Math.round(dw / 2), -dh, dw, dh);
    } else {
      var sc = h / 26;
      ctx.translate(-Math.round(8 * sc), -Math.round(26 * sc));
      fallbackPerson(ctx, look, sc);
    }
    ctx.restore();
    if (opts.label) {
      ctx.save();
      ctx.fillStyle = "rgba(8,6,4,0.7)";
      ctx.font = "6px sans-serif";
      var tw = ctx.measureText(opts.label).width;
      ctx.fillRect(Math.round(x - tw / 2 - 2), Math.round(y + 2), Math.round(tw + 4), 8);
      ctx.fillStyle = "#e8d5b0";
      ctx.fillText(opts.label, Math.round(x - tw / 2), Math.round(y + 8));
      ctx.restore();
    }
  };

  NB.drawBust = function (canvas, id) {
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0c0a08";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var spr = sprites[id] || sprites.player;
    if (spr) {
      var cropH = Math.floor(spr.height * 0.42);
      var cropY = Math.floor(spr.height * 0.02);
      var scale = canvas.height / cropH;
      var dw = Math.round(spr.width * scale);
      ctx.drawImage(spr, 0, cropY, spr.width, cropH, Math.round((canvas.width - dw) / 2), 0, dw, canvas.height);
    } else {
      ctx.save();
      ctx.translate(8, 6);
      fallbackPerson(ctx, NB.LOOKS[id] || NB.LOOKS.player, 1.6);
      ctx.restore();
    }
  };

  function paintFallback(ctx, scene) {
    var i, j;
    if (scene.id === "bridge") {
      ctx.fillStyle = "#4a6a6a";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#2a3a28";
      ctx.fillRect(0, 0, W, 40);
      ctx.fillStyle = "#3a5a70";
      ctx.fillRect(0, 50, W, 70);
      ctx.fillStyle = "#6a5a40";
      ctx.fillRect(40, 48, 160, 28);
      ctx.fillStyle = "#8a7a58";
      for (i = 44; i < 200; i += 10) ctx.fillRect(i, 48, 4, 28);
      ctx.fillStyle = "#1a3040";
      ctx.fillRect(0, 120, W, 40);
    } else {
      ctx.fillStyle = "#1a1612";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#2a2218";
      for (j = 0; j < H; j += 8) {
        for (i = 0; i < W; i += 16) {
          ctx.fillRect(i + (j % 16 ? 8 : 0), j, 8, 8);
        }
      }
    }
  }

  function pickSceneImage(scene, mode) {
    if (mode === "faceoff" && images.faceoff) return images.faceoff;
    if (!scene) return null;
    if (scene.id === "inn" && images.inn) return images.inn;
    if (scene.id === "quay" && images.quay) return images.quay;
    if (scene.id === "hall" && images.hall) return images.hall;
    if (scene.id === "banquet" && images.faceoff) return images.faceoff;
    if ((scene.id === "procession" || scene.id === "pellane") && images.quay) return images.quay;
    return null;
  }

  function coverDraw(ctx, src, destW, destH) {
    var ir = src.width / src.height;
    var cr = destW / destH;
    var dw, dh, dx, dy;
    if (ir > cr) {
      dh = destH; dw = destH * ir; dx = (destW - dw) / 2; dy = 0;
    } else {
      dw = destW; dh = destW / ir; dx = 0; dy = (destH - dh) / 2;
    }
    ctx.drawImage(src, dx, dy, dw, dh);
  }

  NB.drawSceneCover = function (ctx, scene, mode, destW, destH) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#070806";
    ctx.fillRect(0, 0, destW, destH);
    var img = pickSceneImage(scene, mode);
    if (img) {
      coverDraw(ctx, img, destW, destH);
    } else {
      var tmp = document.createElement("canvas");
      tmp.width = W;
      tmp.height = H;
      paintFallback(tmp.getContext("2d"), scene || { id: "bridge" });
      coverDraw(ctx, tmp, destW, destH);
    }
    var g = ctx.createLinearGradient(0, destH * 0.58, 0, destH);
    g.addColorStop(0, "rgba(6,6,4,0)");
    g.addColorStop(1, "rgba(6,6,4,0.5)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, destW, destH);
  };

  NB.drawSceneBg = function (ctx, scene, mode) {
    NB.drawSceneCover(ctx, scene, mode, W, H);
  };

  NB.paintPortrait = function (canvas, id) {
    if (!canvas) return;
    var c = canvas.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = "#0c0a08";
    c.fillRect(0, 0, canvas.width, canvas.height);
    var spr = spriteFor(id, NB.LOOKS[id] || NB.LOOKS.player);
    if (spr) {
      var cropH = Math.max(8, Math.floor(spr.height * 0.46));
      var cropY = Math.floor(spr.height * 0.02);
      var scale = canvas.height / cropH;
      var dw = Math.round(spr.width * scale);
      c.drawImage(spr, 0, cropY, spr.width, cropH, Math.round((canvas.width - dw) / 2), 0, dw, canvas.height);
    } else {
      c.save();
      var sc = canvas.height / 22;
      c.translate(Math.round((canvas.width - 16 * sc) / 2), Math.round(canvas.height * 0.06));
      fallbackPerson(c, NB.LOOKS[id] || NB.LOOKS.player, sc);
      c.restore();
    }
  };

  NB.walkable = function (scene, x, y) {
    if (!scene || !scene.map) return true;
    var tw = W / scene.map[0].length;
    var th = H / scene.map.length;
    var cx = Math.floor(x / tw);
    var cy = Math.floor(y / th);
    if (cy < 0 || cy >= scene.map.length || cx < 0 || cx >= scene.map[0].length) return false;
    return scene.map[cy].charAt(cx) === ".";
  };

  NB.drawNameplate = function (ctx, text, x, y) {
    ctx.save();
    ctx.font = "6px sans-serif";
    var tw = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(10,8,6,0.72)";
    ctx.fillRect(Math.round(x - tw / 2 - 2), Math.round(y), Math.round(tw + 4), 8);
    ctx.fillStyle = "#e8d5b0";
    ctx.fillText(text, Math.round(x - tw / 2), Math.round(y + 6));
    ctx.restore();
  };
})(window.NB = window.NB || {});
