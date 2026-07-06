/*
 * Text + Lens Blur — CSS-only version (no canvas, no WebGL, no three.js)
 * ----------------------------------------------------------------------------
 * The text is real DOM text (selectable, SEO friendly). The effect works by
 * stacking two copies of the text:
 *   - the sharp layer, masked OUT near the lens position
 *   - a blurred clone (filter: blur), masked IN near the lens position
 * Both masks are radial-gradients driven by the CSS variables --mx / --my,
 * which this script updates with damped mouse tracking (same feel as the
 * original Codrops demo: https://tympanus.net/Tutorials/SDFLensBlur/).
 *
 * On top of that, each letter is wrapped in its own <span> so nearby letters
 * can lift into a soft arch as the (damped) mouse passes over them.
 *
 * All styling lives in scss/style.scss — this file only moves the lens and
 * writes the per-letter transforms every frame.
 */
(function () {
  'use strict';

  var host = document.querySelector('[data-lensblur]');
  if (!host) return;

  var sharp = host.querySelector('.lensblur__text');
  if (!sharp) return;

  // url override: ?mode=stroke draws outlined text (like demo variation 2)
  var mode = new URLSearchParams(window.location.search).get('mode');
  if (mode === 'stroke' || mode === 'fill') {
    host.classList.remove('lensblur--stroke');
    if (mode === 'stroke') host.classList.add('lensblur--stroke');
  }
  var current = host.classList.contains('lensblur--stroke') ? 'stroke' : 'fill';
  var link = document.querySelector('.frame__demos a[data-mode="' + current + '"]');
  if (link) link.classList.add('selected');

  var waveEnabled = host.dataset.wave !== 'false';

  // --------------------------------------------------------------------
  // Split the visible text into one <span> per letter (spaces and <br>
  // stay as-is) so each letter can be lifted independently. The original
  // text is preserved in a visually-hidden element for screen readers,
  // since per-letter spans are read unreliably by assistive tech.
  // --------------------------------------------------------------------

  function flattenText(el) {
    var parts = [];
    el.childNodes.forEach(function (n) {
      if (n.nodeType === 3) parts.push(n.textContent);
      else if (n.nodeName === 'BR') parts.push(' ');
    });
    return parts.join('').replace(/\s+/g, ' ').trim();
  }

  function wrapChars(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var textNodes = [];
    var node;
    while ((node = walker.nextNode())) textNodes.push(node);

    textNodes.forEach(function (textNode) {
      var frag = document.createDocumentFragment();
      var text = textNode.textContent;
      for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        if (ch === ' ') {
          frag.appendChild(document.createTextNode(' '));
        } else {
          var span = document.createElement('span');
          span.className = 'lensblur__char';
          span.textContent = ch;
          frag.appendChild(span);
        }
      }
      textNode.parentNode.replaceChild(frag, textNode);
    });
  }

  if (waveEnabled) {
    var srOnly = document.createElement('span');
    srOnly.className = 'lensblur__sr-text';
    srOnly.textContent = flattenText(sharp);
    host.insertBefore(srOnly, sharp);
    sharp.setAttribute('aria-hidden', 'true');
    wrapChars(sharp);
  }

  // three blurred clones of the text (decorative) — graded blur levels,
  // masked into overlapping rings so the melt is perfectly gradual.
  // Cloned AFTER wrapChars so they carry the same per-letter spans.
  var blurLayers = [];
  for (var i = 1; i <= 3; i++) {
    var blurLayer = sharp.cloneNode(true);
    blurLayer.classList.add('lensblur__text--blur', 'lensblur__text--blur-' + i);
    blurLayer.setAttribute('aria-hidden', 'true');
    host.appendChild(blurLayer);
    blurLayers.push(blurLayer);
  }

  // masks only activate once JS runs, so the text is intact without JS
  host.classList.add('lensblur--active');

  // --------------------------------------------------------------------
  // Letter wave: for every letter, cache its rest position (relative to
  // the sharp text box, same frame the lens coordinates use below), then
  // each frame lift it based on distance to the damped mouse position.
  // --------------------------------------------------------------------

  var charGroups = [];

  // reads a CSS length (incl. clamp()/calc()) into a px number, by letting
  // the browser resolve it on a throwaway element — custom properties don't
  // resolve themselves when read directly via getPropertyValue
  function resolveLength(varName, fallback) {
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;height:0;width:var(' + varName + ')';
    host.appendChild(probe);
    var px = parseFloat(getComputedStyle(probe).width);
    probe.remove();
    return px > 0 ? px : fallback;
  }

  var waveAmp = parseFloat(host.dataset.waveAmplitude) || resolveLength('--wave-amplitude', 24);
  var waveRadius = parseFloat(host.dataset.waveRadius) || resolveLength('--wave-radius', 170);
  var waveTilt = parseFloat(host.dataset.waveTilt) || 7;

  function buildCharGroups() {
    if (!waveEnabled) return;
    var sharpChars = sharp.querySelectorAll('.lensblur__char');
    var blurCharLists = blurLayers.map(function (layer) {
      return layer.querySelectorAll('.lensblur__char');
    });
    charGroups = [];
    for (var idx = 0; idx < sharpChars.length; idx++) {
      var els = [sharpChars[idx]];
      for (var j = 0; j < blurCharLists.length; j++) els.push(blurCharLists[j][idx]);
      charGroups.push({ cx: 0, cy: 0, active: false, els: els });
    }
  }

  // offsetLeft/offsetTop are layout-based (unaffected by transform), so this
  // stays correct across frames without ever needing to reset transforms
  function measureChars() {
    var baseLeft = sharp.offsetLeft;
    var baseTop = sharp.offsetTop;
    charGroups.forEach(function (g) {
      var el = g.els[0];
      g.cx = el.offsetLeft + el.offsetWidth / 2 - baseLeft;
      g.cy = el.offsetTop + el.offsetHeight / 2 - baseTop;
    });
  }

  buildCharGroups();
  measureChars();

  var resizeQueued = false;
  window.addEventListener('resize', function () {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(function () { resizeQueued = false; measureChars(); });
  });

  // rebuild once webfonts are ready: glyph widths may have shifted
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measureChars);
  }

  function updateWave() {
    for (var i = 0; i < charGroups.length; i++) {
      var g = charGroups[i];
      var dx = mx - g.cx;
      var dy = my - g.cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var falloff = Math.exp(-(dist * dist) / (2 * waveRadius * waveRadius));

      if (falloff < 0.002) {
        if (g.active) {
          for (var j = 0; j < g.els.length; j++) if (g.els[j]) g.els[j].style.transform = '';
          g.active = false;
        }
        continue;
      }

      var lift = -waveAmp * falloff;
      var tilt = -(dx / waveRadius) * waveTilt * falloff;
      var scale = 1 + 0.1 * falloff;
      var t = 'translateY(' + lift.toFixed(2) + 'px) rotate(' + tilt.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
      for (var k = 0; k < g.els.length; k++) if (g.els[k]) g.els[k].style.transform = t;
      g.active = true;
    }
  }

  // --------------------------------------------------------------------
  // Damped lens tracking (starts off-screen: everything sharp/still)
  // --------------------------------------------------------------------

  var damp = parseFloat(host.dataset.damp) || 8;
  var mx = -1e4, my = -1e4;
  var tx = -1e4, ty = -1e4;
  var last = performance.now();

  document.addEventListener('pointermove', function (e) {
    // the masks (and letter positions) are measured relative to the text
    // element's own box, not the host, so the lens must use that frame too
    var r = sharp.getBoundingClientRect();
    tx = e.clientX - r.left;
    ty = e.clientY - r.top;
    if (mx < -9000) { mx = tx; my = ty; } // first move: snap, then damp
  });

  function tick(now) {
    requestAnimationFrame(tick);
    var dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    var k = 1 - Math.exp(-damp * dt);
    mx += (tx - mx) * k;
    my += (ty - my) * k;
    host.style.setProperty('--mx', mx.toFixed(1) + 'px');
    host.style.setProperty('--my', my.toFixed(1) + 'px');
    if (waveEnabled) updateWave();
  }
  requestAnimationFrame(tick);
})();
