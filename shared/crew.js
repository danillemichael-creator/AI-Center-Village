window.AIViceCrew = (function () {
  // Sheet layout, left to right: portrait | front | back | walk strip (N frames).
  // Tune crops here; add per-member fixes under overrides.
  var CROP = {
    portrait: { x: 0,   y: 0, w: 128, h: 128 },
    front:    { x: 128, y: 0, w: 64,  h: 128 },
    back:     { x: 192, y: 0, w: 64,  h: 128 },
    walk:     { x: 256, y: 0, w: 128, h: 128, frames: 2 },
    overrides: {
      // jay: { walk: { x: 256, y: 0, w: 192, frames: 3 } }
    }
  };

  var KEY_TOLERANCE = 60;   // RGB distance for the purple key
  var cache = {};           // id -> frames | 'failed' | null(loading)
  var pending = {};         // id -> [repaint callbacks]
  var loads = [];

  var base = (document.currentScript && document.currentScript.src || '')
    .replace(/shared\/[^/]*$/, '') + 'assets/crew/';

  function cropFor(id) {
    var o = (CROP.overrides && CROP.overrides[id]) || {};
    var out = {};
    ['portrait', 'front', 'back', 'walk'].forEach(function (k) {
      out[k] = {};
      for (var p in CROP[k]) out[k][p] = CROP[k][p];
      for (var p2 in (o[k] || {})) out[k][p2] = o[k][p2];
    });
    return out;
  }

  function keySheet(img) {
    var c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    var ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    var data = ctx.getImageData(0, 0, c.width, c.height);
    var px = data.data, k = 0;
    var kr = px[0], kg = px[1], kb = px[2];           // top-left pixel = key color
    for (var i = 0; i < px.length; i += 4) {
      if (Math.abs(px[i] - kr) + Math.abs(px[i + 1] - kg) + Math.abs(px[i + 2] - kb) < KEY_TOLERANCE) {
        px[i + 3] = 0;
      }
    }
    ctx.putImageData(data, 0, 0);
    return c;
  }

  function cut(sheet, r) {
    var c = document.createElement('canvas');
    c.width = r.w; c.height = r.h;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    return c;
  }

  function load(id) {
    if (cache[id] !== undefined) return;
    cache[id] = null;
    var done = new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        try {
          var sheet = keySheet(img);
          var c = cropFor(id);
          var frames = { portrait: cut(sheet, c.portrait), front: cut(sheet, c.front), back: cut(sheet, c.back), walk: [] };
          var n = c.walk.frames || 1, fw = c.walk.w / n;
          for (var i = 0; i < n; i++) {
            frames.walk.push(cut(sheet, { x: c.walk.x + i * fw, y: c.walk.y, w: fw, h: c.walk.h }));
          }
          cache[id] = frames;
        } catch (e) { cache[id] = 'failed'; }
        (pending[id] || []).forEach(function (f) { f(); });
        delete pending[id];
        resolve();
      };
      img.onerror = function () {
        cache[id] = 'failed';
        (pending[id] || []).forEach(function (f) { f(); });
        delete pending[id];
        resolve();
      };
      img.src = base + id + '.png';
    });
    loads.push(done);
    return done;
  }

  function colorsOf(id) {
    var list = (window.AIVice && AIVice.characters) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i].colors;
    }
    return { body: '#eaf6ff', accent: '#2ee6ff' };
  }

  function frameOf(id, which, i) {
    var e = cache[id];
    if (!e || e === 'failed') return null;
    if (which === 'walk') return e.walk[(i || 0) % e.walk.length];
    return e[which] || null;
  }

  function drawInto(canvas, id, which, i) {
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    function paint() {
      var f = frameOf(id, which || 'front', i || 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (f) {
        var s = Math.min(canvas.width / f.width, canvas.height / f.height);
        var dw = f.width * s, dh = f.height * s;
        ctx.drawImage(f, (canvas.width - dw) / 2, canvas.height - dh, dw, dh);
      } else if (window.AIViceSprite) {
        AIViceSprite.draw(ctx, colorsOf(id), i === 1 ? 1 : 0,
          canvas.width / 2 - 24, canvas.height - 40, 4);
      }
    }
    if (cache[id] === undefined || cache[id] === null) {
      paint();
      (pending[id] = pending[id] || []).push(paint);
      load(id);
    } else {
      paint();
    }
  }

  var ids = ((window.AIVice && AIVice.characters) || []).map(function (c) { return c.id; });
  var ready = Promise.all(ids.map(load));

  return {
    CROP: CROP,
    drawInto: drawInto,
    frameOf: frameOf,
    has: function (id) { var e = cache[id]; return !!(e && e !== 'failed'); },
    ready: ready
  };
})();
