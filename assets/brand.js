// assets/brand.js — ElectroRed AI identity
//   • the H circuit logo (inline SVG, CSS-animated; colours come from CSS variables so it works in both themes)
//   • one global AI-activity state:  ElectroRed.setActivity(true | false)
//       idle   → logo is still, with a soft static glow
//       active → a pulse travels along the circuit traces (every logo on the page) AND the browser-tab icon pulses
//   • the dynamic favicon: pre-drawn canvas frames, swapped by ONE timer that exists only while the AI is active
// Markup:  <span data-er-logo="full|compact|static|word" data-size="32"></span>   (filled in by ElectroRed.mount())
(function () {
  'use strict';
  const NAME = 'ElectroRed AI';
  const DESCRIPTOR = 'Electronic Engineering AI Workspace';

  // ------------------------------------------------------------------ geometry (64 × 64 viewBox)
  const GEO = {
    outline: 'M12 6H24V26H40V6H52L56 10V54L52 58H40V38H24V58H12L8 54V10Z',        // the H, chamfered like the reference
    pulse: 'M14 52V36L18 32H28L31 28.5L33.5 35.5L36 32H46L50 28V12',                // main trace: bottom-left → crossbar → top-right
    pulseLength: 79.66,                                                              // used by the canvas favicon
    traces: ['M14 12V24', 'M19 14V22', 'M50 52V40', 'M45 50V42'],                    // secondary traces
    hot: [[14, 52], [50, 12]],                                                       // solid nodes at both ends of the main trace
    rings: [[14, 12], [19, 14], [50, 52], [45, 50]]                                  // hollow nodes
  };

  let uid = 0;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ------------------------------------------------------------------ the logo mark
  // o.live === false → the "static logo": it never animates (print, social images, places where motion is unsuitable)
  function markSVG(o) {
    o = o || {};
    const id = 'er' + (++uid);
    const size = o.size ? ' style="width:' + o.size + 'px;height:' + o.size + 'px"' : '';
    const a11y = o.label ? 'role="img" aria-label="' + esc(o.label) + '"' : 'aria-hidden="true" focusable="false"';
    const cls = 'er-mark' + (o.live === false ? '' : ' er-live');
    const grad = '<linearGradient id="' + id + 'b" gradientUnits="userSpaceOnUse" x1="8" y1="0" x2="56" y2="0">' +
      '<stop offset="0" style="stop-color:var(--er-red)"/><stop offset=".36" style="stop-color:var(--er-red)"/>' +
      '<stop offset=".5" style="stop-color:var(--er-mid)"/><stop offset=".64" style="stop-color:var(--er-blue)"/>' +
      '<stop offset="1" style="stop-color:var(--er-cyan)"/></linearGradient>' +
      '<linearGradient id="' + id + 'p" gradientUnits="userSpaceOnUse" x1="14" y1="0" x2="50" y2="0">' +
      '<stop offset="0" style="stop-color:var(--er-pulse-a)"/><stop offset=".5" stop-color="#fff"/>' +
      '<stop offset="1" style="stop-color:var(--er-pulse-b)"/></linearGradient>';
    const nodes = GEO.hot.map((p, i) => '<circle class="er-node er-hot er-hot' + i + '" cx="' + p[0] + '" cy="' + p[1] + '" r="2.1" fill="url(#' + id + 'b)"/>').join('') +
      GEO.rings.map(p => '<circle class="er-node" cx="' + p[0] + '" cy="' + p[1] + '" r="1.55" fill="none" stroke="url(#' + id + 'b)" stroke-width="1.2"/>').join('');
    return '<svg class="' + cls + '" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"' + size + ' ' + a11y + '>' +
      '<defs>' + grad + '</defs>' +
      '<path d="' + GEO.outline + '" fill="url(#' + id + 'b)" fill-opacity=".1"/>' +
      '<path d="' + GEO.outline + '" fill="none" stroke="url(#' + id + 'b)" stroke-width="2.3" stroke-linejoin="round"/>' +
      '<g fill="none" stroke="url(#' + id + 'b)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' +
      GEO.traces.map(d => '<path d="' + d + '"/>').join('') + '<path d="' + GEO.pulse + '"/></g>' +
      '<path class="er-pulse-glow" d="' + GEO.pulse + '" pathLength="100" stroke="url(#' + id + 'b)"/>' +
      '<path class="er-pulse" d="' + GEO.pulse + '" pathLength="100" stroke="url(#' + id + 'p)"/>' +
      nodes + '</svg>';
  }

  // ------------------------------------------------------------------ the full lockup / wordmark
  function wordHTML() {
    return '<span class="er-wm"><span class="er-w1">Electro</span><span class="er-w2">Red</span><span class="er-w3"> AI</span></span>';
  }
  function logoHTML(o) {
    o = o || {};
    const v = o.variant || 'compact';
    if (v === 'word') return wordHTML();
    const mark = markSVG({ size: o.size, live: v !== 'static' });
    if (v === 'compact' || v === 'static') return mark;
    // full: symbol + wordmark (+ descriptor)
    return '<span class="er-lockup">' + mark + '<span class="er-wordblock">' + wordHTML() +
      (o.sub ? '<span class="er-sub" dir="ltr">' + DESCRIPTOR.toUpperCase() + '</span>' : '') + '</span></span>';
  }
  function mount(root) {
    (root || document).querySelectorAll('[data-er-logo]').forEach(el => {
      if (el.dataset.erDone) return;
      el.innerHTML = logoHTML({ variant: el.dataset.erLogo, size: el.dataset.size ? +el.dataset.size : 0, sub: el.hasAttribute('data-sub') });
      el.dataset.erDone = '1';
      if (el.dataset.erLogo !== 'word' && !el.getAttribute('aria-label') && !el.hasAttribute('aria-hidden')) el.setAttribute('aria-label', NAME);
    });
  }

  // ------------------------------------------------------------------ static icon (favicon / app icon) as an SVG string
  // opts: tile (rounded dark square, default true) · active (shows a lit pulse) · scale (size of the H inside the tile)
  function iconSVG(opts) {
    opts = opts || {};
    const tile = opts.tile !== false, active = !!opts.active, k = opts.scale || 0.8, rx = opts.rx === undefined ? 14 : opts.rx;
    const grad = '<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="8" y1="0" x2="56" y2="0"><stop offset="0" stop-color="#FF3158"/><stop offset=".36" stop-color="#FF3158"/><stop offset=".5" stop-color="#9B5CFF"/><stop offset=".64" stop-color="#168BFF"/><stop offset="1" stop-color="#00D9FF"/></linearGradient>' +
      '<linearGradient id="p" gradientUnits="userSpaceOnUse" x1="14" y1="0" x2="50" y2="0"><stop offset="0" stop-color="#FF8FA6"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#8FEBFF"/></linearGradient>';
    const body = '<g transform="translate(32 32) scale(' + k + ') translate(-32 -32)">' +
      '<path d="' + GEO.outline + '" fill="url(#g)" fill-opacity=".14"/>' +
      '<path d="' + GEO.outline + '" fill="none" stroke="url(#g)" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="' + GEO.pulse + '" fill="none" stroke="url(#g)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"' + (active ? ' opacity=".55"' : '') + '/>' +
      (active ? '<path d="' + GEO.pulse + '" pathLength="100" fill="none" stroke="url(#g)" stroke-width="7" stroke-linecap="round" stroke-dasharray="26 174" stroke-dashoffset="-30" opacity=".45"/>' +
        '<path d="' + GEO.pulse + '" pathLength="100" fill="none" stroke="url(#p)" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="26 174" stroke-dashoffset="-30"/>' : '') +
      GEO.hot.map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.4" fill="url(#g)"/>').join('') + '</g>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs>' + grad + '</defs>' +
      (tile ? '<rect width="64" height="64" rx="' + rx + '" fill="#07111F"/>' + (rx ? '<rect x=".75" y=".75" width="62.5" height="62.5" rx="' + Math.max(0, rx - .7) + '" fill="none" stroke="#223650" stroke-width="1.5"/>' : '') : '') + body + '</svg>';
  }

  // The logo as a standalone file (no CSS variables, no pulse layers): for logo-mark.svg and the share image.
  const THEMES = { dark: { red: '#FF3158', mid: '#9B5CFF', blue: '#168BFF', cyan: '#00D9FF', pa: '#FF8FA6', pb: '#8FEBFF' }, light: { red: '#E0173F', mid: '#7A3FE0', blue: '#0B6FD6', cyan: '#0097B8', pa: '#FF6B88', pb: '#38C8E8' } };
  function standaloneMarkSVG(theme, size) {
    const t = THEMES[theme || 'dark'];
    return markSVG({ live: false, size: 0 })
      .replace(/<path class="er-pulse[^>]*\/>/g, '')
      .replace(/ class="er-mark"/, ' width="' + (size || 64) + '" height="' + (size || 64) + '"')
      .replace(/var\(--er-red\)/g, t.red).replace(/var\(--er-mid\)/g, t.mid).replace(/var\(--er-blue\)/g, t.blue)
      .replace(/var\(--er-cyan\)/g, t.cyan).replace(/var\(--er-pulse-a\)/g, t.pa).replace(/var\(--er-pulse-b\)/g, t.pb);
  }

  // ------------------------------------------------------------------ dynamic favicon (canvas frames)
  const FRAMES = 10, FRAME_MS = 160;
  function faviconFrame(t, lit) {
    // t: 0..1 position of the pulse along the trace · lit: draw it at all
    const S = 64, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    x.fillStyle = '#07111F'; roundRect(x, 0, 0, S, S, 14); x.fill();
    x.strokeStyle = '#223650'; x.lineWidth = 1.5; roundRect(x, .75, .75, S - 1.5, S - 1.5, 13.3); x.stroke();
    x.save(); x.translate(32, 32); x.scale(0.8, 0.8); x.translate(-32, -32);
    const g = x.createLinearGradient(8, 0, 56, 0);
    [[0, '#FF3158'], [.36, '#FF3158'], [.5, '#9B5CFF'], [.64, '#168BFF'], [1, '#00D9FF']].forEach(s => g.addColorStop(s[0], s[1]));
    const H = new Path2D(GEO.outline), P = new Path2D(GEO.pulse);
    x.globalAlpha = .14; x.fillStyle = g; x.fill(H); x.globalAlpha = 1;
    x.lineJoin = 'round'; x.lineCap = 'round';
    x.strokeStyle = g; x.lineWidth = 4; x.stroke(H);
    x.lineWidth = 2.6; x.globalAlpha = lit ? .55 : 1; x.stroke(P); x.globalAlpha = 1;
    if (lit) {
      const L = GEO.pulseLength, dash = L * 0.26, off = dash - t * (L + dash);
      x.setLineDash([dash, L * 3]); x.lineDashOffset = off;
      x.shadowColor = 'rgba(255,255,255,.8)'; x.shadowBlur = 6; x.strokeStyle = '#fff'; x.lineWidth = 3.6; x.stroke(P);
      x.shadowBlur = 0; x.setLineDash([]);
    }
    GEO.hot.forEach(p => { x.fillStyle = g; x.beginPath(); x.arc(p[0], p[1], 3.4, 0, 6.2832); x.fill(); });
    x.restore();
    return c.toDataURL('image/png');
  }
  function roundRect(x, px, py, w, h, r) {
    x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
  }

  // ------------------------------------------------------------------ AI activity state
  const S = { active: false, timer: null, frames: null, i: 0, saved: [], link: null };

  function startFavicon() {
    if (!document.head) return;
    const links = Array.prototype.slice.call(document.querySelectorAll('link[rel~="icon"]'));
    S.saved = links;                                           // kept so the exact static icons come back afterwards
    links.forEach(l => l.remove());
    const dyn = document.createElement('link');
    dyn.rel = 'icon'; dyn.type = 'image/png'; dyn.id = 'er-favicon-live';
    document.head.appendChild(dyn); S.link = dyn;
    try {
      if (!S.frames) { S.frames = []; for (let n = 0; n < FRAMES; n++) S.frames.push(faviconFrame(n / FRAMES, true)); }
    } catch (e) { S.frames = null; restoreFavicon(); return; }   // canvas unavailable: keep the static icon
    const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { dyn.href = S.frames[Math.floor(FRAMES / 2)]; return; }   // lit, but not moving
    S.i = 0; step();
    S.timer = setInterval(step, FRAME_MS);
  }
  function step() { if (S.link && S.frames) { S.link.href = S.frames[S.i]; S.i = (S.i + 1) % FRAMES; } }
  function restoreFavicon() {
    if (S.timer) { clearInterval(S.timer); S.timer = null; }
    if (S.link) { S.link.remove(); S.link = null; }
    S.saved.forEach(l => document.head.appendChild(l));
    S.saved = [];
  }

  function setActivity(on) {
    on = !!on;
    if (on === S.active) return;
    S.active = on;
    document.documentElement.setAttribute('data-ai-state', on ? 'active' : 'idle');
    if (on) startFavicon(); else restoreFavicon();
  }

  document.documentElement.setAttribute('data-ai-state', 'idle');
  window.addEventListener('pagehide', () => { if (S.timer) { clearInterval(S.timer); S.timer = null; } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mount());
  else mount();

  window.ElectroRed = { name: NAME, descriptor: DESCRIPTOR, geometry: GEO, markSVG, logoHTML, mount, iconSVG, standaloneMarkSVG, faviconFrame, setActivity, isActive: () => S.active, _state: S };
})();
