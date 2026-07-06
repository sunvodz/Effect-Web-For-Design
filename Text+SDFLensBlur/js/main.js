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
 * All styling lives in scss/style.scss — this file only moves the lens.
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

  // blurred clone of the text (decorative)
  var blurLayer = sharp.cloneNode(true);
  blurLayer.classList.add('lensblur__text--blur');
  blurLayer.setAttribute('aria-hidden', 'true');
  host.appendChild(blurLayer);

  // masks only activate once JS runs, so the text is intact without JS
  host.classList.add('lensblur--active');

  // damped lens tracking (starts off-screen: everything sharp)
  var damp = parseFloat(host.dataset.damp) || 8;
  var mx = -1e4, my = -1e4;
  var tx = -1e4, ty = -1e4;
  var last = performance.now();

  document.addEventListener('pointermove', function (e) {
    var r = host.getBoundingClientRect();
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
  }
  requestAnimationFrame(tick);
})();
