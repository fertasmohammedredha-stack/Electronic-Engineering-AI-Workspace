/* ElectroRed AI - interactive simulation blocks: templates, schematics, plots and the chat widget.
 * Needs assets/sim.js (the engine). The AI writes a ~~~electrored-sim block containing JSON; this file
 * validates it (the JSON is UNTRUSTED text), runs the engine, draws a schematic + plots and adds sliders.
 * Everything drawn is generated as escaped SVG text. It is a simplified educational simulator, not SPICE. */
(function (root) {
  'use strict';
  const Sim = root.ERSim || (typeof require === 'function' ? require('./sim.js') : null);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lang = () => { try { if (typeof root.getLang === 'function') return root.getLang(); } catch (e) { } return (root.document && root.document.documentElement.lang) || 'en'; };
  const L = (ar, en) => (lang() === 'ar' ? ar : en);
  const isNum = x => typeof x === 'number' && isFinite(x);

  // ---------- number formatting ----------
  const PFX = [[1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
  function trimNum(x) { const a = Math.abs(x); let s = a >= 100 ? x.toFixed(0) : a >= 10 ? x.toFixed(1) : x.toFixed(2); if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, ''); return s; }
  function eng(v, unit) {
    unit = unit || '';
    if (!isNum(v)) return '—';
    if (v === 0) return '0 ' + unit;
    const a = Math.abs(v);
    for (const [m, p] of PFX) if (a >= m * 0.9995) return trimNum(v / m) + ' ' + p + unit;
    return v.toExponential(1) + ' ' + unit;
  }
  const engNoUnit = v => { const s = eng(v, ''); return s.replace(' ', ''); };

  // ---------- schematic primitives (SVG text) ----------
  const f1 = x => (Math.round(x * 10) / 10);
  function wire(pts) { return '<polyline class="w" points="' + pts.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ') + '"/>'; }
  const dot = (x, y) => '<circle class="dot" cx="' + f1(x) + '" cy="' + f1(y) + '" r="2.6"/>';
  const txt = (x, y, s, anchor, cls) => '<text class="' + (cls || 't') + '" x="' + f1(x) + '" y="' + f1(y) + '" text-anchor="' + (anchor || 'middle') + '">' + esc(s) + '</text>';
  function gnd(x, y) { return '<g class="w"><line x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + (y + 5) + '"/><line x1="' + (x - 9) + '" y1="' + (y + 5) + '" x2="' + (x + 9) + '" y2="' + (y + 5) + '"/><line x1="' + (x - 5.5) + '" y1="' + (y + 9) + '" x2="' + (x + 5.5) + '" y2="' + (y + 9) + '"/><line x1="' + (x - 2) + '" y1="' + (y + 13) + '" x2="' + (x + 2) + '" y2="' + (y + 13) + '"/></g>'; }
  const SYM = {
    R: len => '<polyline class="w" points="' + [[-len / 2, 0], [-18, 0], [-15, -6], [-9, 6], [-3, -6], [3, 6], [9, -6], [15, 6], [18, 0], [len / 2, 0]].map(p => p.join(',')).join(' ') + '"/>',
    C: len => '<path class="w" d="M' + (-len / 2) + ' 0H-3.5M3.5 0H' + (len / 2) + 'M-3.5 -10V10M3.5 -10V10"/>',
    L: len => '<path class="w" d="M' + (-len / 2) + ' 0H-16a4 4 0 0 1 8 0a4 4 0 0 1 8 0a4 4 0 0 1 8 0a4 4 0 0 1 8 0H' + (len / 2) + '"/>',
    D: len => '<path class="w" d="M' + (-len / 2) + ' 0H-6M6 0H' + (len / 2) + 'M-6 -8V8L6 0Z M6 -8V8"/>',
    Z: len => '<path class="w" d="M' + (-len / 2) + ' 0H-6M6 0H' + (len / 2) + 'M-6 -8V8L6 0Z M3 -11L6 -8V8L9 11"/>',
    V: len => '<path class="w" d="M' + (-len / 2) + ' 0H-12M12 0H' + (len / 2) + '"/><circle class="w" cx="0" cy="0" r="12"/>',
    S: len => '<path class="w" d="M' + (-len / 2) + ' 0H-12M12 0H' + (len / 2) + '"/><circle class="w" cx="0" cy="0" r="12"/><path class="w" d="M-7 0q3.5 -7 7 0t7 0"/>',
    I: len => '<path class="w" d="M' + (-len / 2) + ' 0H-12M12 0H' + (len / 2) + 'M-6 0H6M2 -3.5L6 0L2 3.5"/><circle class="w" cx="0" cy="0" r="12"/>',
  };
  // two-terminal element from (x1,y1) to (x2,y2); label above/right, value below/right
  function two(type, x1, y1, x2, y2, name, value, o) {
    o = o || {};
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI, cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    let s = '<g transform="translate(' + f1(cx) + ' ' + f1(cy) + ') rotate(' + f1(ang) + ')">' + SYM[type](len) + '</g>';
    if (type === 'V' || type === 'S') {                      // + / - marks in absolute coordinates (+ near the first terminal)
      const ux = dx / len, uy = dy / len;
      s += txt(cx - ux * 6.5 - uy * 0, cy - uy * 6.5 + 3.5, '+', 'middle', 't tv') + txt(cx + ux * 6.5, cy + uy * 6.5 + 3.5, '−', 'middle', 't tv');
      if (type === 'S') s = s.replace(/<text[^>]*>[+−]<\/text>/g, '');
    }
    const horiz = Math.abs(dy) < Math.abs(dx);
    if (horiz) { if (name) s += txt(cx, cy - (o.nameDy || 15), name, 'middle', 't tv'); if (value) s += txt(cx, cy + (o.valDy || 22), value, 'middle', 't'); }
    else { const an = o.anchor || 'start'; if (name) s += txt(cx + (o.dx || 17), cy - 1, name, an, 't tv'); if (value) s += txt(cx + (o.dx || 17), cy + 11, value, an, 't'); }
    return s;
  }
  // op-amp triangle: returns {svg, plusTop?...}; inputs on the left, output on the right
  function opamp(x, y, plusOnTop, name) {
    const w = 52, h = 52, top = y - 13, bot = y + 13;
    let s = '<path class="w" d="M' + x + ' ' + (y - h / 2) + 'L' + (x + w) + ' ' + y + 'L' + x + ' ' + (y + h / 2) + 'Z"/>';
    s += txt(x + 7, (plusOnTop ? top : bot) + 3.5, '+', 'middle', 't tv') + txt(x + 7, (plusOnTop ? bot : top) + 3.5, '−', 'middle', 't tv');
    if (name) s += txt(x + 20, y + 3, name, 'middle', 't');
    return s;
  }
  function npn(x, y) {   // base terminal at (x,y); collector (x+24,y-28); emitter (x+24,y+28)
    return '<g class="w"><path d="M' + x + ' ' + y + 'H' + (x + 14) + 'M' + (x + 14) + ' ' + (y - 13) + 'V' + (y + 13) + 'M' + (x + 14) + ' ' + (y - 6) + 'L' + (x + 24) + ' ' + (y - 15) + 'V' + (y - 28) + 'M' + (x + 14) + ' ' + (y + 6) + 'L' + (x + 24) + ' ' + (y + 15) + 'V' + (y + 28) + '"/><path d="M' + (x + 24) + ' ' + (y + 15) + 'L' + (x + 17.5) + ' ' + (y + 14.2) + 'L' + (x + 21.5) + ' ' + (y + 9.2) + 'Z" class="fillink"/></g>';
  }
  const node = (x, y, label, anchor, dy) => dot(x, y) + (label ? txt(x + (anchor === 'end' ? -6 : 6), y + (dy == null ? -6 : dy), label, anchor || 'start', 't tv') : '');

  // ---------- plot renderer (SVG text) ----------
  function niceStep(span, target) { const raw = span / target, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p; }
  const COLORS = ['var(--cyan)', 'var(--red)', 'var(--blue)', 'var(--ok)'];
  function plot(o) {
    const W = 360, H = o.h || 170, ml = 44, mr = 10, mt = o.title ? 22 : 10, mb = 30, pw = W - ml - mr, ph = H - mt - mb;
    const S = (o.series || []).filter(s => s.x && s.x.length && s.y.some(isNum));
    if (!S.length) return '<svg class="sim-plot" viewBox="0 0 ' + W + ' ' + H + '"><text class="t" x="' + W / 2 + '" y="' + H / 2 + '" text-anchor="middle">—</text></svg>';
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    S.forEach(s => s.x.forEach((v, i) => { const y = s.y[i]; if (!isNum(v) || !isNum(y)) return; if (v < xmin) xmin = v; if (v > xmax) xmax = v; if (y < ymin) ymin = y; if (y > ymax) ymax = y; }));
    if (isNum(o.xmin)) xmin = o.xmin; if (isNum(o.xmax)) xmax = o.xmax; if (isNum(o.ymin)) ymin = o.ymin; if (isNum(o.ymax)) ymax = o.ymax;
    if (!(ymax > ymin)) { const c = isNum(ymin) ? ymin : 0; ymin = c - 1; ymax = c + 1; }
    if (!(xmax > xmin)) xmax = xmin + 1;
    const xlog = !!o.xlog;
    const tx = v => xlog ? Math.log10(v) : v;
    const X0 = tx(xmin), X1 = tx(xmax);
    let yticks = [], ystep = niceStep(ymax - ymin, 4);
    if (!isNum(o.ymin)) ymin = Math.floor(ymin / ystep + 1e-6) * ystep; if (!isNum(o.ymax)) ymax = Math.ceil(ymax / ystep - 1e-6) * ystep;      // 1e-6: a tiny numerical -1e-13 must not add a whole extra tick
    for (let v = Math.ceil(ymin / ystep - 1e-9) * ystep; v <= ymax + ystep * 1e-6; v += ystep) yticks.push(Math.abs(v) < ystep * 1e-9 ? 0 : v);
    let xticks = [];
    if (xlog) { for (let e = Math.ceil(X0 - 1e-9); e <= X1 + 1e-9; e++) xticks.push(Math.pow(10, e)); }
    else { const xs = niceStep(xmax - xmin, 5); for (let v = Math.ceil(xmin / xs - 1e-9) * xs; v <= xmax + xs * 1e-6; v += xs) xticks.push(Math.abs(v) < xs * 1e-9 ? 0 : v); }
    const px = v => ml + (tx(v) - X0) / (X1 - X0) * pw, py = v => mt + ph - (v - ymin) / (ymax - ymin) * ph;
    let s = '<svg class="sim-plot" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.title || '') + '">';
    if (o.title) s += txt(ml, 13, o.title, 'start', 't tv');
    xticks.forEach(v => { const x = px(v); if (x >= ml - 0.5 && x <= ml + pw + 0.5) s += '<line class="g" x1="' + f1(x) + '" y1="' + mt + '" x2="' + f1(x) + '" y2="' + (mt + ph) + '"/>' + txt(x, mt + ph + 12, engNoUnit(v), 'middle', 't sm'); });
    yticks.forEach(v => { const y = py(v); s += '<line class="g' + (v === 0 ? ' z' : '') + '" x1="' + ml + '" y1="' + f1(y) + '" x2="' + (ml + pw) + '" y2="' + f1(y) + '"/>' + txt(ml - 4, y + 3, engNoUnit(v), 'end', 't sm'); });
    s += '<rect class="fr" x="' + ml + '" y="' + mt + '" width="' + pw + '" height="' + ph + '"/>';
    if (o.xlabel) s += txt(ml + pw / 2, H - 3, o.xlabel, 'middle', 't sm');
    if (o.ylabel) s += '<text class="t sm" transform="translate(9 ' + (mt + ph / 2) + ') rotate(-90)" text-anchor="middle">' + esc(o.ylabel) + '</text>';
    s += '<clipPath id="cp' + (o.id || 'x') + '"><rect x="' + ml + '" y="' + mt + '" width="' + pw + '" height="' + ph + '"/></clipPath><g clip-path="url(#cp' + (o.id || 'x') + ')">';
    S.forEach((ser, si) => {
      const n = ser.x.length, step = Math.max(1, Math.floor(n / 500)); let d = '', pen = false;
      for (let i = 0; i < n; i += step) { const xv = ser.x[i], yv = ser.y[i]; if (!isNum(xv) || !isNum(yv)) { pen = false; continue; } d += (pen ? 'L' : 'M') + f1(px(xv)) + ' ' + f1(py(yv)); pen = true; }
      s += '<path class="ln" style="stroke:' + (ser.color || COLORS[si % COLORS.length]) + (ser.dash ? ';stroke-dasharray:4 3' : '') + '" d="' + d + '"/>';
    });
    (o.markers || []).forEach(m => { if (isNum(m.x) && isNum(m.y)) s += '<circle cx="' + f1(px(m.x)) + '" cy="' + f1(py(m.y)) + '" r="3.8" style="fill:' + (m.color || 'var(--red)') + '"/>'; });
    s += '</g>';
    if (S.some(x => x.label)) { let lx = ml + 6; S.forEach((ser, si) => { if (!ser.label) return; s += '<rect x="' + lx + '" y="' + (mt + 4) + '" width="9" height="3" style="fill:' + (ser.color || COLORS[si % COLORS.length]) + '"/>' + txt(lx + 12, mt + 9, ser.label, 'start', 't sm'); lx += 22 + ser.label.length * 5.2; }); }
    return s + '</svg>';
  }

  // ---------- templates ----------
  const dc = v => ({ type: 'dc', v }), sine = (amp, freq) => ({ type: 'sine', amp, freq });
  const Vs = (name, a, b, wave, ac) => ({ t: 'V', name, n: [a, b], wave, ac });
  const Rr = (name, a, b, v) => ({ t: 'R', name, n: [a, b], v });
  const Cc = (name, a, b, v) => ({ t: 'C', name, n: [a, b], v });
  const Ll = (name, a, b, v) => ({ t: 'L', name, n: [a, b], v });
  const P = (k, u, min, max, val, log, extra) => Object.assign({ k, u, min, max, val, log: !!log }, extra || {});
  const logSpace = (a, b, n) => Array.from({ length: n }, (_, i) => a * Math.pow(b / a, n === 1 ? 0 : i / (n - 1)));
  const roundDec = (v) => Math.pow(10, Math.round(Math.log10(v)));
  const pct = (a, b) => (b ? (a / b) : NaN);
  const lastCycle = (res, f, key) => { const T = 1 / f, t1 = res.t[res.t.length - 1], t0 = t1 - T; const out = []; for (let i = 0; i < res.t.length; i++) if (res.t[i] >= t0 - 1e-15) out.push(res.v[key][i]); return out; };
  const mean = a => a.reduce((s, v) => s + v, 0) / (a.length || 1);
  const ro = (l, v) => ({ l, v });
  const svgWrap = (inner, h) => '<svg class="sim-sch" viewBox="0 0 360 ' + (h || 150) + '" role="img">' + inner + '</svg>';
  const pv = (p, k, u) => eng(p[k], u);                 // "10 kΩ" for labels

  // the Bode plot shared by the RC / RLC / op-amp templates
  function bodePlot(res, node, fmark, o) {
    o = o || {};
    const db = res.v[node].db, ph = res.v[node].ph, f = res.f;
    const marks = (o.marks || []).map(m => ({ x: m.f, y: interp(f, db, m.f), color: m.color }));
    return plot({ id: 'm' + (o.id || ''), title: o.title || L('مقدار الاستجابة (dB)', 'Gain (dB)'), series: [{ x: f, y: db }], xlog: true, xlabel: L('التردد (Hz)', 'Frequency (Hz)'), ylabel: 'dB', markers: marks, ymax: o.ymax, ymin: o.ymin }) +
      plot({ id: 'p' + (o.id || ''), title: L('الطور (°)', 'Phase (°)'), series: [{ x: f, y: ph, color: 'var(--red)' }], xlog: true, xlabel: L('التردد (Hz)', 'Frequency (Hz)'), ylabel: '°', markers: (o.marks || []).map(m => ({ x: m.f, y: interp(f, ph, m.f), color: m.color })) });
  }
  function interp(xs, ys, x) { if (!xs.length) return NaN; if (x <= xs[0]) return ys[0]; for (let i = 1; i < xs.length; i++) if (x <= xs[i]) { const t = Math.log(x / xs[i - 1]) / Math.log(xs[i] / xs[i - 1]); return ys[i - 1] + t * (ys[i] - ys[i - 1]); } return ys[ys.length - 1]; }
  const sineFreqRange = fc => { const a = Math.max(0.1, roundDec(fc / 100)), b = Math.max(a * 100, roundDec(fc * 100)); return [a, b]; };

  const T = {};

  // ---- 1. voltage divider ----
  T.divider = {
    title: () => L('مقسّم الجهد', 'Voltage divider'), h: 140,
    P: [P('Vin', 'V', 1, 24, 10), P('R1', 'Ω', 100, 1e5, 1000, true), P('R2', 'Ω', 100, 1e5, 2000, true)],
    net: p => [Vs('V1', 'in', '0', dc(p.Vin)), Rr('R1', 'in', 'out', p.R1), Rr('R2', 'out', '0', p.R2)],
    svg: p => two('V', 50, 34, 50, 106, 'Vin', pv(p, 'Vin', 'V')) + wire([[50, 34], [100, 34]]) + two('R', 100, 34, 180, 34, 'R1', pv(p, 'R1', 'Ω')) + wire([[180, 34], [250, 34], [300, 34]]) + node(250, 34) + txt(300, 28, 'Vout', 'end', 't tv') +
      two('R', 250, 34, 250, 106, 'R2', pv(p, 'R2', 'Ω')) + wire([[250, 106], [50, 106]]) + gnd(150, 106) + dot(150, 106),
    run(p) {
      const r = Sim.op(this.net(p)); const sw = Sim.dcsweep(this.net(p), { src: 'V1', from: 0, to: this.P[0].max, n: 25, v: ['out'] });
      return { ok: r.ok, readouts: [ro('Vout', eng(r.v.out, 'V')), ro(L('التيار', 'Current'), eng(r.i.R1, 'A')), ro(L('نسبة التقسيم', 'Ratio'), (r.v.out / p.Vin).toFixed(3)), ro(L('الاستطاعة الكلية', 'Total power'), eng(p.Vin * r.i.R1, 'W'))],
        plots: [plot({ id: 'dv', title: L('Vout بدلالة Vin', 'Vout vs Vin'), series: [{ x: sw.x, y: sw.v.out }], xlabel: 'Vin (V)', ylabel: 'Vout (V)', markers: [{ x: p.Vin, y: r.v.out }] })], notes: [] };
    },
  };

  // ---- 2/3. RC low-pass and high-pass ----
  function rcFilter(kind) {
    const low = kind === 'low';
    return {
      title: () => low ? L('مرشح تمرير منخفض RC', 'RC low-pass filter') : L('مرشح تمرير عالٍ RC', 'RC high-pass filter'), h: 140,
      P: [P('Vin', 'V', 0.5, 10, 5), P('R', 'Ω', 100, 1e6, 1000, true), P('C', 'F', 1e-9, 1e-4, 1e-7, true), P('f', 'Hz', 10, 1e5, 1000, true)],
      net: p => low ? [Vs('V1', 'in', '0', sine(p.Vin, p.f), 1), Rr('R1', 'in', 'out', p.R), Cc('C1', 'out', '0', p.C)] : [Vs('V1', 'in', '0', sine(p.Vin, p.f), 1), Cc('C1', 'in', 'out', p.C), Rr('R1', 'out', '0', p.R)],
      svg: p => two('S', 50, 34, 50, 106, 'Vin', pv(p, 'Vin', 'V') + ' · ' + pv(p, 'f', 'Hz'), { dx: 17 }) + wire([[50, 34], [90, 34]]) + (low ? two('R', 90, 34, 170, 34, 'R', pv(p, 'R', 'Ω')) + wire([[170, 34], [250, 34], [300, 34]]) + node(250, 34) + two('C', 250, 34, 250, 106, 'C', pv(p, 'C', 'F')) : two('C', 90, 34, 170, 34, 'C', pv(p, 'C', 'F')) + wire([[170, 34], [250, 34], [300, 34]]) + node(250, 34) + two('R', 250, 34, 250, 106, 'R', pv(p, 'R', 'Ω'))) + txt(300, 28, 'Vout', 'end', 't tv') + wire([[250, 106], [50, 106]]) + gnd(150, 106) + dot(150, 106),
      run(p) {
        const net = this.net(p), fc = 1 / (2 * Math.PI * p.R * p.C), [fa, fb] = sineFreqRange(fc);
        const ac = Sim.ac(net, { fstart: fa, fstop: fb, n: 160, v: ['out'] }), at = Sim.ac(net, { fstart: p.f, fstop: p.f, n: 1, v: ['out'] });
        const tstop = 5 / p.f, tr = Sim.tran(net, { tstop, dt: tstop / 1200, v: ['in', 'out'] });
        const g = at.v.out.mag[0], phs = at.v.out.ph[0];
        return { ok: ac.ok && tr.ok, readouts: [ro(L('تردد القطع fc', 'Cutoff fc'), eng(fc, 'Hz')), ro(L('ثابت الزمن τ', 'Time constant τ'), eng(p.R * p.C, 's')), ro(L('الربح عند f', 'Gain at f'), g.toFixed(3) + ' (' + at.v.out.db[0].toFixed(1) + ' dB)'), ro(L('الطور عند f', 'Phase at f'), phs.toFixed(1) + '°'), ro(L('سعة Vout', 'Vout amplitude'), eng(g * p.Vin, 'V'))],
          plots: [bodePlot(ac, 'out', fc, { id: kind, marks: [{ f: fc, color: 'var(--red)' }, { f: p.f, color: 'var(--ok)' }] }), plot({ id: 'tr' + kind, title: L('الجهدان في الزمن', 'Voltages over time'), series: [{ x: tr.t, y: tr.v.in, label: 'Vin' }, { x: tr.t, y: tr.v.out, label: 'Vout', color: 'var(--red)' }], xlabel: 't (s)', ylabel: 'V' })], notes: [L('● أحمر: fc  ● أخضر: التردد الحالي f', '● red: fc  ● green: the current f')] };
      },
    };
  }
  T.rc_lowpass = rcFilter('low'); T.rc_highpass = rcFilter('high');

  // ---- 4. RC / RL step (charge and discharge) ----
  T.rc_step = {
    title: () => L('شحن وتفريغ مكثف (RC)', 'RC charge & discharge'), h: 140,
    P: [P('V', 'V', 1, 24, 5), P('R', 'Ω', 100, 1e6, 10000, true), P('C', 'F', 1e-9, 1e-3, 1e-6 * 10, true)],
    net: p => { const tau = p.R * p.C; return [Vs('V1', 'in', '0', { type: 'pulse', v1: 0, v2: p.V, td: 0, tr: tau / 500, tf: tau / 500, pw: 5 * tau, per: 10 * tau }), Rr('R1', 'in', 'out', p.R), Cc('C1', 'out', '0', p.C)]; },
    svg: p => two('V', 50, 34, 50, 106, 'V', pv(p, 'V', 'V')) + wire([[50, 34], [90, 34]]) + two('R', 90, 34, 170, 34, 'R', pv(p, 'R', 'Ω')) + wire([[170, 34], [250, 34], [300, 34]]) + node(250, 34) + txt(300, 28, 'Vc', 'end', 't tv') + two('C', 250, 34, 250, 106, 'C', pv(p, 'C', 'F')) + wire([[250, 106], [50, 106]]) + gnd(150, 106) + dot(150, 106),
    run(p) {
      const tau = p.R * p.C, tr = Sim.tran(this.net(p), { tstop: 10 * tau, dt: tau / 100, v: ['in', 'out'], i: ['R1'] });
      return { ok: tr.ok, readouts: [ro(L('ثابت الزمن τ = RC', 'Time constant τ = RC'), eng(tau, 's')), ro(L('63.2% بعد', '63.2% after'), eng(tau, 's')), ro(L('99% بعد ≈ 4.6τ', '99% after ≈ 4.6τ'), eng(4.6 * tau, 's')), ro(L('أقصى تيار', 'Peak current'), eng(p.V / p.R, 'A'))],
        plots: [plot({ id: 'rs1', title: L('جهد المكثف', 'Capacitor voltage'), series: [{ x: tr.t, y: tr.v.in, label: L('المصدر', 'Source'), dash: true }, { x: tr.t, y: tr.v.out, label: 'Vc', color: 'var(--red)' }], xlabel: 't (s)', ylabel: 'V', markers: [{ x: tau, y: p.V * (1 - Math.exp(-1)), color: 'var(--ok)' }] }),
          plot({ id: 'rs2', title: L('التيار', 'Current'), series: [{ x: tr.t, y: tr.i.R1, color: 'var(--blue)' }], xlabel: 't (s)', ylabel: 'A' })], notes: [L('النقطة الخضراء: 63.2% من الجهد عند t = τ', 'Green dot: 63.2% of the voltage at t = τ')] };
    },
  };
  T.rl_step = {
    title: () => L('استجابة ملف (RL) لقفزة جهد', 'RL step response'), h: 140,
    P: [P('V', 'V', 1, 24, 10), P('R', 'Ω', 10, 1e4, 100, true), P('Lh', 'H', 1e-4, 1, 0.1, true)],
    net: p => { const tau = p.Lh / p.R; return [Vs('V1', 'in', '0', { type: 'pulse', v1: 0, v2: p.V, td: 0, tr: tau / 500, tf: tau / 500, pw: 5 * tau, per: 10 * tau }), Rr('R1', 'in', 'out', p.R), Ll('L1', 'out', '0', p.Lh)]; },
    svg: p => two('V', 50, 34, 50, 106, 'V', pv(p, 'V', 'V')) + wire([[50, 34], [90, 34]]) + two('R', 90, 34, 170, 34, 'R', pv(p, 'R', 'Ω')) + wire([[170, 34], [250, 34]]) + node(250, 34) + two('L', 250, 34, 250, 106, 'L', pv(p, 'Lh', 'H')) + wire([[250, 106], [50, 106]]) + gnd(150, 106) + dot(150, 106),
    run(p) {
      const tau = p.Lh / p.R, tr = Sim.tran(this.net(p), { tstop: 10 * tau, dt: tau / 100, v: ['in', 'out'], i: ['L1'] });
      return { ok: tr.ok, readouts: [ro(L('ثابت الزمن τ = L/R', 'Time constant τ = L/R'), eng(tau, 's')), ro(L('التيار النهائي', 'Final current'), eng(p.V / p.R, 'A')), ro(L('63.2% بعد', '63.2% after'), eng(tau, 's'))],
        plots: [plot({ id: 'rl1', title: L('تيار الملف', 'Inductor current'), series: [{ x: tr.t, y: tr.i.L1, color: 'var(--red)' }], xlabel: 't (s)', ylabel: 'A', markers: [{ x: tau, y: (p.V / p.R) * (1 - Math.exp(-1)), color: 'var(--ok)' }] }),
          plot({ id: 'rl2', title: L('جهد الملف', 'Inductor voltage'), series: [{ x: tr.t, y: tr.v.out, color: 'var(--blue)' }], xlabel: 't (s)', ylabel: 'V' })], notes: [] };
    },
  };

  // ---- 5. series RLC ----
  T.rlc_series = {
    title: () => L('دارة رنين تسلسلية RLC', 'Series RLC resonance'), h: 140,
    P: [P('R', 'Ω', 1, 1000, 20, true), P('Lh', 'H', 1e-5, 0.1, 1e-3, true), P('C', 'F', 1e-9, 1e-4, 1e-6, true)],
    net: p => [Vs('V1', 'in', '0', dc(0), 1), Ll('L1', 'in', 'a', p.Lh), Cc('C1', 'a', 'out', p.C), Rr('R1', 'out', '0', p.R)],
    netStep: p => { const f0 = 1 / (2 * Math.PI * Math.sqrt(p.Lh * p.C)); return [Vs('V1', 'in', '0', { type: 'pulse', v1: 0, v2: 1, td: 0, tr: 1 / f0 / 500, tf: 1 / f0 / 500, pw: 1e3, per: 0 }), Rr('R1', 'in', 'a', p.R), Ll('L1', 'a', 'out', p.Lh), Cc('C1', 'out', '0', p.C)]; },
    svg: p => two('S', 50, 34, 50, 106, 'Vin', '') + wire([[50, 34], [70, 34]]) + two('L', 70, 34, 140, 34, 'L', pv(p, 'Lh', 'H')) + two('C', 140, 34, 200, 34, 'C', pv(p, 'C', 'F')) + wire([[200, 34], [250, 34], [300, 34]]) + node(250, 34) + txt(300, 28, 'Vout', 'end', 't tv') + two('R', 250, 34, 250, 106, 'R', pv(p, 'R', 'Ω')) + wire([[250, 106], [50, 106]]) + gnd(150, 106) + dot(150, 106),
    run(p) {
      const f0 = 1 / (2 * Math.PI * Math.sqrt(p.Lh * p.C)), Q = (1 / p.R) * Math.sqrt(p.Lh / p.C), bw = p.R / (2 * Math.PI * p.Lh), zeta = 1 / (2 * Q);
      const fa = Math.max(0.1, f0 / 30), fb = f0 * 30, ac = Sim.ac(this.net(p), { fstart: fa, fstop: fb, n: 240, v: ['out'] });
      const tstop = Math.min(Math.max(8 / f0, 6 * 2 * p.Lh / p.R), 400 / f0), tr = Sim.tran(this.netStep(p), { tstop, dt: Math.min(tstop / 1500, 1 / f0 / 60), v: ['in', 'out'] });
      const over = zeta < 1 ? Math.exp(-Math.PI * zeta / Math.sqrt(1 - zeta * zeta)) * 100 : 0;
      return { ok: ac.ok && tr.ok, readouts: [ro(L('تردد الرنين f₀', 'Resonant f₀'), eng(f0, 'Hz')), ro(L('عامل الجودة Q', 'Quality factor Q'), Q.toFixed(2)), ro(L('عرض الحزمة', 'Bandwidth'), eng(bw, 'Hz')), ro(L('معامل التخميد ζ', 'Damping ζ'), zeta.toFixed(3)), ro(L('التجاوز الأعلى', 'Overshoot'), over.toFixed(1) + ' %')],
        plots: [bodePlot(ac, 'out', f0, { id: 'rlc', marks: [{ f: f0, color: 'var(--red)' }], title: L('الاستجابة عبر R (dB)', 'Response across R (dB)'), ymin: -40, ymax: 5 }), plot({ id: 'rlcs', title: L('استجابة جهد المكثف لقفزة 1V', 'Capacitor voltage, 1 V step'), series: [{ x: tr.t, y: tr.v.in, dash: true, label: L('المصدر', 'Source') }, { x: tr.t, y: tr.v.out, color: 'var(--red)', label: 'Vc' }], xlabel: 't (s)', ylabel: 'V' })], notes: [L('منحنى الاستجابة: الجهد عبر المقاومة (تمرير حزمة). الاستجابة الزمنية: الجهد عبر المكثف.', 'Frequency plot: voltage across R (band-pass). Step plot: voltage across C.')] };
    },
  };

  // ---- 6/7. rectifiers ----
  function rectTemplate(bridge) {
    return {
      title: () => bridge ? L('مقوّم جسري مع مرشح', 'Bridge rectifier with filter') : L('مقوّم نصف موجة مع مرشح', 'Half-wave rectifier with filter'), h: bridge ? 218 : 140,
      P: [P('Vp', 'V', 2, 24, 10), P('f', 'Hz', 10, 1000, 50, true), P('RL', 'Ω', 10, 1e5, 1000, true), P('C', 'F', 0, 2.2e-3, 47e-6, false)],
      net(p) {
        if (!bridge) { const n = [Vs('V1', 'a', '0', sine(p.Vp, p.f)), { t: 'D', name: 'D1', n: ['a', 'out'] }, Rr('RL', 'out', '0', p.RL)]; if (p.C > 0) n.push(Cc('C1', 'out', '0', p.C)); return n; }
        const n = [Vs('V1', 'a', 'b', sine(p.Vp, p.f)), { t: 'D', name: 'D1', n: ['a', 'out'] }, { t: 'D', name: 'D2', n: ['b', 'out'] }, { t: 'D', name: 'D3', n: ['0', 'a'] }, { t: 'D', name: 'D4', n: ['0', 'b'] }, Rr('RL', 'out', '0', p.RL)];
        if (p.C > 0) n.push(Cc('C1', 'out', '0', p.C)); return n;
      },
      svg: p => bridge ?
        two('D', 100, 85, 190, 28, 'D1', '', { dx: -24, anchor: 'end' }) + two('D', 280, 85, 190, 28, 'D2', '', { dx: 24 }) + two('D', 190, 142, 100, 85, 'D3', '', { dx: -24, anchor: 'end' }) + two('D', 190, 142, 280, 85, 'D4', '', { dx: 24 }) +
        two('R', 190, 28, 190, 142, 'RL', pv(p, 'RL', 'Ω'), { dx: 12 }) + node(190, 28) + gnd(190, 142) + dot(190, 142) + node(100, 85) + node(280, 85) +
        wire([[100, 85], [100, 182], [150, 182]]) + two('S', 150, 182, 230, 182, 'Vin', pv(p, 'Vp', 'V') + ' · ' + pv(p, 'f', 'Hz'), { nameDy: 14, valDy: 26 }) + wire([[230, 182], [280, 182], [280, 85]]) +
        (p.C > 0 ? wire([[190, 28], [336, 28]]) + two('C', 336, 28, 336, 100, 'C', pv(p, 'C', 'F'), { dx: -10, anchor: 'end' }) + gnd(336, 100) + txt(190, 14, 'Vout', 'middle', 't tv') : txt(190, 14, 'Vout', 'middle', 't tv'))
        :
        two('S', 50, 34, 50, 106, 'Vin', pv(p, 'Vp', 'V') + ' · ' + pv(p, 'f', 'Hz')) + wire([[50, 34], [95, 34]]) + two('D', 95, 34, 165, 34, 'D1', '') + wire([[165, 34], [300, 34]]) + node(200, 34) + txt(300, 28, 'Vout', 'end', 't tv') +
        (p.C > 0 ? two('C', 200, 34, 200, 106, 'C', pv(p, 'C', 'F'), { dx: -12, anchor: 'end' }) : '') + node(255, 34) + two('R', 255, 34, 255, 106, 'RL', pv(p, 'RL', 'Ω')) + wire([[255, 106], [50, 106]]) + (p.C > 0 ? dot(200, 106) : '') + gnd(150, 106) + dot(150, 106),
      run(p) {
        const tstop = Math.max(6 / p.f, p.C > 0 ? Math.min(5 * p.RL * p.C, 40 / p.f) : 0), tr = Sim.tran(this.net(p), { tstop, dt: Math.min(tstop / 1600, 1 / p.f / 120), v: bridge ? ['a', 'b', 'out'] : ['a', 'out'] });
        const cyc = lastCycle(tr, p.f, 'out'), vmax = Math.max(...cyc), vmin = Math.min(...cyc), vavg = mean(cyc);
        const drops = bridge ? 2 : 1;
        return { ok: tr.ok, readouts: [ro(L('ذروة الخرج', 'Output peak'), eng(vmax, 'V')), ro(L('المتوسط (DC)', 'Average (DC)'), eng(vavg, 'V')), ro(L('تموّج قمة-لقمة', 'Ripple (pk-pk)'), eng(vmax - vmin, 'V')), ro(L('هبوط الديودات', 'Diode drop(s)'), eng(p.Vp - vmax, 'V') + ' (' + drops + ')'), ro(L('تيار الحِمل المتوسط', 'Avg load current'), eng(vavg / p.RL, 'A'))],
          plots: [plot({ id: 'rc' + (bridge ? 'b' : 'h'), title: L('الدخل والخرج', 'Input and output'), series: [{ x: tr.t, y: bridge ? tr.v.a.map((v, i) => v - tr.v.b[i]) : tr.v.a, label: 'Vin', dash: true }, { x: tr.t, y: tr.v.out, label: 'Vout', color: 'var(--red)' }], xlabel: 't (s)', ylabel: 'V' })], notes: [L('الديود نموذج سيليكون (≈0.6–0.7V). C=0 يعني بلا مرشّح.', 'Silicon diode model (≈0.6–0.7 V). C = 0 means no filter capacitor.')] };
      },
    };
  }
  T.rectifier_half = rectTemplate(false); T.rectifier_bridge = rectTemplate(true);

  // ---- 8. op-amps ----
  function opTemplate(inv) {
    return {
      title: () => inv ? L('مكبّر عاكس (Op-Amp)', 'Inverting amplifier') : L('مكبّر غير عاكس (Op-Amp)', 'Non-inverting amplifier'), h: inv ? 150 : 190,
      P: [P('Vin', 'V', 0.05, 5, 1), P('f', 'Hz', 10, 1e5, 1000, true), P('R1', 'Ω', 100, 1e5, 1000, true), P('Rf', 'Ω', 1000, 1e6, 10000, true), P('Vsat', 'V', 5, 15, 12)],
      net(p) { const src = Vs('V1', 'in', '0', sine(p.Vin, p.f), 1); return inv ? [src, Rr('R1', 'in', 'm', p.R1), Rr('Rf', 'm', 'out', p.Rf), { t: 'OA', name: 'U1', n: ['0', 'm', 'out'], A: 1e5, vsat: p.Vsat, gbw: 1e6 }] : [src, Rr('R1', 'm', '0', p.R1), Rr('Rf', 'm', 'out', p.Rf), { t: 'OA', name: 'U1', n: ['in', 'm', 'out'], A: 1e5, vsat: p.Vsat, gbw: 1e6 }]; },
      svg: p => inv ?
        two('S', 40, 67, 40, 125, 'Vin', pv(p, 'Vin', 'V'), { dx: 15 }) + wire([[40, 67], [60, 67]]) + two('R', 60, 67, 130, 67, 'R1', pv(p, 'R1', 'Ω'), { nameDy: 14, valDy: 22 }) + wire([[130, 67], [180, 67]]) + node(150, 67) +
        wire([[150, 67], [150, 25]]) + two('R', 150, 25, 240, 25, 'Rf', pv(p, 'Rf', 'Ω'), { nameDy: 12, valDy: 20 }) + wire([[240, 25], [272, 25], [272, 80]]) + opamp(180, 80, false, 'U1') + wire([[180, 93], [160, 93]]) + gnd(160, 93) +
        wire([[232, 80], [330, 80]]) + node(272, 80) + txt(330, 74, 'Vout', 'end', 't tv') + wire([[40, 125], [40, 125]]) + gnd(40, 125)
        :
        two('S', 40, 67, 40, 125, 'Vin', pv(p, 'Vin', 'V'), { dx: 15 }) + wire([[40, 67], [180, 67]]) + opamp(180, 80, true, 'U1') + wire([[180, 93], [150, 93], [150, 135]]) + node(150, 93) + two('R', 150, 135, 150, 172, 'R1', pv(p, 'R1', 'Ω'), { dx: 14 }) + gnd(150, 172) +
        wire([[150, 112], [180, 112]]) + two('R', 180, 112, 250, 112, 'Rf', pv(p, 'Rf', 'Ω'), { nameDy: 12, valDy: 20 }) + wire([[250, 112], [272, 112], [272, 80]]) + wire([[232, 80], [330, 80]]) + node(272, 80) + txt(330, 74, 'Vout', 'end', 't tv') + node(150, 112) + gnd(40, 125),
      run(p) {
        const net = this.net(p), gIdeal = inv ? -p.Rf / p.R1 : 1 + p.Rf / p.R1, fb = 1e6 / (1 + p.Rf / p.R1);
        const tstop = 4 / p.f, tr = Sim.tran(net, { tstop, dt: Math.min(tstop / 1000, 1 / p.f / 80), v: ['in', 'out'] });
        const ac = Sim.ac(net, { fstart: 10, fstop: 1e7, n: 160, v: ['out'] });
        const vo = Math.max(...tr.v.out.map(Math.abs)), clip = p.Vin * Math.abs(gIdeal) > p.Vsat * 0.999;
        const warn = clip ? [L('⚠️ الخرج يقتطع عند ±' + p.Vsat + ' V (تشبّع المكبّر)', '⚠️ The output clips at ±' + p.Vsat + ' V (op-amp saturation)')] : [];
        return { ok: tr.ok && ac.ok, readouts: [ro(L('الربح النظري', 'Ideal gain'), gIdeal.toFixed(2) + ' V/V (' + (20 * Math.log10(Math.abs(gIdeal))).toFixed(1) + ' dB)'), ro(L('ذروة الخرج المحاكاة', 'Simulated output peak'), eng(vo, 'V')), ro(L('عرض الحزمة ≈ GBW/(1+Rf/R1)', 'Bandwidth ≈ GBW/(1+Rf/R1)'), eng(fb, 'Hz')), ro(L('GBW المفترض', 'Assumed GBW'), '1 MHz')],
          plots: [plot({ id: 'op' + (inv ? 'i' : 'n'), title: L('الدخل والخرج', 'Input and output'), series: [{ x: tr.t, y: tr.v.in, label: 'Vin', dash: true }, { x: tr.t, y: tr.v.out, label: 'Vout', color: 'var(--red)' }], xlabel: 't (s)', ylabel: 'V' }), plot({ id: 'opb' + (inv ? 'i' : 'n'), title: L('ربح الحلقة المغلقة (dB)', 'Closed-loop gain (dB)'), series: [{ x: ac.f, y: ac.v.out.db }], xlog: true, xlabel: 'f (Hz)', ylabel: 'dB', markers: [{ x: p.f, y: interp(ac.f, ac.v.out.db, p.f), color: 'var(--ok)' }] })], notes: warn };
      },
    };
  }
  T.opamp_inv = opTemplate(true); T.opamp_noninv = opTemplate(false);

  // ---- 9. zener regulator ----
  T.zener_reg = {
    title: () => L('منظّم جهد بديود زينر', 'Zener voltage regulator'), h: 140,
    P: [P('Vin', 'V', 0, 30, 12), P('Rs', 'Ω', 50, 5000, 470, true), P('Vz', 'V', 2.4, 15, 5.1), P('RL', 'Ω', 100, 1e5, 1000, true)],
    net: p => [Vs('V1', 'in', '0', dc(p.Vin)), Rr('Rs', 'in', 'out', p.Rs), { t: 'Z', name: 'Z1', n: ['0', 'out'], vz: p.Vz, izt: 5e-3 }, Rr('RL', 'out', '0', p.RL)],
    svg: p => two('V', 50, 34, 50, 106, 'Vin', pv(p, 'Vin', 'V')) + wire([[50, 34], [90, 34]]) + two('R', 90, 34, 160, 34, 'Rs', pv(p, 'Rs', 'Ω')) + wire([[160, 34], [330, 34]]) + node(200, 34) + txt(330, 28, 'Vout', 'end', 't tv') + two('Z', 200, 106, 200, 34, 'DZ', pv(p, 'Vz', 'V'), { dx: -14, anchor: 'end' }) + node(270, 34) + two('R', 270, 34, 270, 106, 'RL', pv(p, 'RL', 'Ω')) + wire([[270, 106], [50, 106]]) + gnd(135, 106) + dot(135, 106) + dot(200, 106),
    run(p) {
      const net = this.net(p), r = Sim.op(net), sw = Sim.dcsweep(net, { src: 'V1', from: 0, to: this.P[0].max, n: 61, v: ['out'] });
      const izv = -r.i.Z1;     // zener current flowing cathode -> anode (reverse)
      const reg = r.v.out > p.Vz - 0.4 && izv > 1e-3;
      return { ok: r.ok && sw.ok, readouts: [ro('Vout', eng(r.v.out, 'V')), ro(L('تيار الزينر', 'Zener current'), eng(Math.max(izv, 0), 'A')), ro(L('تيار الحِمل', 'Load current'), eng(r.i.RL, 'A')), ro(L('تيار المصدر', 'Source current'), eng(r.i.Rs, 'A')), ro(L('استطاعة الزينر', 'Zener power'), eng(Math.max(izv, 0) * r.v.out, 'W'))],
        plots: [plot({ id: 'zr', title: L('Vout بدلالة Vin', 'Vout vs Vin'), series: [{ x: sw.x, y: sw.v.out }, { x: sw.x, y: sw.x.map(() => p.Vz), dash: true, color: 'var(--ink-soft)' }], xlabel: 'Vin (V)', ylabel: 'Vout (V)', markers: [{ x: p.Vin, y: r.v.out }] })],
        notes: [reg ? L('✅ المنظّم يعمل: الزينر في منطقة الانهيار.', '✅ Regulating: the zener is in breakdown.') : L('⚠️ لا تنظيم الآن: الزينر لا يمرّر تياراً كافياً (ارفع Vin أو اخفض Rs أو RL).', '⚠️ Not regulating: the zener carries too little current (raise Vin, lower Rs or RL).')] };
    },
  };

  // ---- 10. BJT bias ----
  T.bjt_bias = {
    title: () => L('استقطاب ترانزستور BJT (مقسّم جهد)', 'BJT voltage-divider bias'), h: 190,
    P: [P('Vcc', 'V', 5, 24, 12), P('R1', 'Ω', 1e4, 1e5, 47000, true), P('R2', 'Ω', 1e3, 5e4, 10000, true), P('RC', 'Ω', 100, 1e4, 2200, true), P('RE', 'Ω', 50, 5e3, 1000, true), P('beta', '', 20, 400, 100)],
    net: p => [Vs('Vcc', 'vcc', '0', dc(p.Vcc)), Rr('R1', 'vcc', 'b', p.R1), Rr('R2', 'b', '0', p.R2), Rr('RC', 'vcc', 'c', p.RC), Rr('RE', 'e', '0', p.RE), { t: 'Q', name: 'Q1', n: ['c', 'b', 'e'], bf: p.beta }],
    svg: p => wire([[80, 14], [190, 14]]) + txt(190, 10, 'Vcc = ' + eng(p.Vcc, 'V'), 'end', 't tv') + two('R', 80, 14, 80, 68, 'R1', pv(p, 'R1', 'Ω')) + wire([[80, 68], [80, 88], [110, 88]]) + node(80, 88) + two('R', 80, 108, 80, 166, 'R2', pv(p, 'R2', 'Ω')) + wire([[80, 88], [80, 108]]) + gnd(80, 166) +
      npn(110, 88) + two('R', 134, 14, 134, 60, 'RC', pv(p, 'RC', 'Ω')) + node(134, 14) + wire([[134, 60], [250, 60]]) + node(134, 60) + txt(250, 54, 'Vc', 'end', 't tv') + two('R', 134, 116, 134, 166, 'RE', pv(p, 'RE', 'Ω')) + gnd(134, 166) + txt(104, 108, 'Q1', 'middle', 't'),
    run(p) {
      const r = Sim.op(this.net(p)), q = r.q.Q1 || {}, vce = r.v.c - r.v.e;
      const region = !r.ok ? '—' : (q.vbe < 0.45 ? L('قطع (Cut-off)', 'Cut-off') : (vce < 0.25 ? L('إشباع (Saturation)', 'Saturation') : L('فعّالة (Active)', 'Active')));
      const Rdc = p.RC + p.RE, icsat = p.Vcc / Rdc;
      return { ok: r.ok, readouts: [ro('IC', eng(q.ic, 'A')), ro('IB', eng(q.ib, 'A')), ro('VCE', eng(vce, 'V')), ro('VBE', eng(q.vbe, 'V')), ro(L('المنطقة', 'Region'), region)],
        plots: [plot({ id: 'bj', title: L('خط الحِمل DC (IC بدلالة VCE)', 'DC load line (IC vs VCE)'), series: [{ x: [0, p.Vcc], y: [icsat, 0], color: 'var(--blue)' }], xlabel: 'VCE (V)', ylabel: 'IC (A)', markers: [{ x: vce, y: q.ic }], xmin: 0, xmax: p.Vcc, ymin: 0 })],
        notes: [L('النقطة الحمراء = نقطة التشغيل Q. النموذج: Ebers–Moll بسيط بلا تأثير Early.', 'Red dot = operating point Q. Model: simple Ebers–Moll, no Early effect.')] };
    },
  };

  // ---------- generic netlist template (the AI describes the circuit itself; no drawn schematic) ----------
  const EL_TYPES = { R: 2, C: 2, L: 2, V: 2, I: 2, D: 2, Z: 2, Q: 3, OA: 3 };
  const NAME_RE = /^[A-Za-z0-9_]{1,10}$/;
  const FIELD_OK = ['v', 'amp', 'freq', 'off', 'v2', 'bf', 'vsat', 'vz', 'A'];
  const num = (x, d) => (isNum(x) ? x : d);
  function cleanWave(w) {
    if (!w || typeof w !== 'object') return dc(0);
    const type = ['dc', 'sine', 'pulse', 'step'].includes(w.type) ? w.type : 'dc', o = { type };
    ['v', 'amp', 'freq', 'off', 'phase', 'v1', 'v2', 'td', 'tr', 'tf', 'pw', 'per', 't0'].forEach(k => { if (isNum(w[k])) o[k] = w[k]; });
    return o;
  }
  function genericDef(spec) {
    const els = (Array.isArray(spec.elements) ? spec.elements : []).slice(0, 30), seen = new Set(), clean = [];
    els.forEach((e, i) => {
      if (!e || typeof e !== 'object') throw new Error('element ' + (i + 1));
      const t = String(e.t || '').toUpperCase() === 'OPAMP' ? 'OA' : String(e.t || '').toUpperCase();
      if (!EL_TYPES[t]) throw new Error('unknown element type: ' + esc(e.t));
      const name = String(e.name || (t + (i + 1)));
      if (!NAME_RE.test(name) || seen.has(name)) throw new Error('bad or duplicate name: ' + esc(name)); seen.add(name);
      if (!Array.isArray(e.n) || e.n.length !== EL_TYPES[t] || !e.n.every(n => NAME_RE.test(String(n)))) throw new Error(name + ': nodes');
      const o = { t, name, n: e.n.map(String) };
      if (t === 'R' || t === 'C' || t === 'L') { if (!(isNum(e.v) && e.v > 0 && e.v < 1e12)) throw new Error(name + ': value'); o.v = e.v; }
      if (t === 'V' || t === 'I') { o.wave = cleanWave(e.wave); if (isNum(e.ac)) o.ac = e.ac; }
      if (t === 'Q' && isNum(e.bf)) o.bf = e.bf;
      if (t === 'Z') { if (isNum(e.vz) && e.vz > 0) o.vz = e.vz; }
      if (t === 'OA') { if (isNum(e.vsat) && e.vsat > 0) o.vsat = e.vsat; if (isNum(e.gbw) && e.gbw >= 0) o.gbw = e.gbw; }
      clean.push(o);
    });
    if (!clean.length) throw new Error('no elements');
    const plist = (Array.isArray(spec.params) ? spec.params : []).slice(0, 8).map(q => {
      const el = clean.find(e => e.name === q.el); if (!el) return null;
      const field = FIELD_OK.includes(q.field) ? q.field : (el.t === 'V' || el.t === 'I' ? (el.wave.type === 'sine' ? 'amp' : 'v') : 'v');
      const cur = (el.t === 'V' || el.t === 'I') ? el.wave[field] : el[field];
      if (!isNum(cur) && !isNum(q.value)) return null;
      const val = num(q.value, cur), min = num(q.min, val / 10), max = num(q.max, val * 10);
      return { k: q.el + '.' + field, el: q.el, field, label: q.el + (field === 'v' ? '' : ' ' + field), u: String(q.unit || ({ R: 'Ω', C: 'F', L: 'H', V: 'V', I: 'A' }[el.t] || '')).slice(0, 4), min, max, val, log: !!q.log && min > 0 };
    }).filter(Boolean);
    const an = (Array.isArray(spec.analyses) && spec.analyses.length ? spec.analyses : [{ a: 'op' }]).slice(0, 3);
    return {
      title: () => String(spec.title || L('دارة مخصّصة', 'Custom circuit')).slice(0, 80), h: 0, generic: true, P: plist,
      net(p) { const n = clean.map(e => JSON.parse(JSON.stringify(e))); plist.forEach(q => { const e = n.find(x => x.name === q.el), v = p[q.k]; if (!e || !isNum(v)) return; if (e.t === 'V' || e.t === 'I') e.wave[q.field] = v; else e[q.field] = v; }); return n; },
      svg: () => '', list(p) { return this.net(p).map(e => e.name + ': ' + e.n.join(' – ') + (e.v ? '  ' + eng(e.v, { R: 'Ω', C: 'F', L: 'H' }[e.t] || '') : '')); },
      run(p) {
        const net = this.net(p), readouts = [], plots = [], notes = []; let ok = true;
        an.forEach((a, ai) => {
          const kind = a.a || a.type;
          const probes = (Array.isArray(a.v) ? a.v : []).map(String).filter(n => NAME_RE.test(n)).slice(0, 4);
          try {
            if (kind === 'op') { const r = Sim.op(net); ok = ok && r.ok; Object.keys(r.v).filter(n => n !== '0').slice(0, 10).forEach(n => readouts.push(ro('V(' + n + ')', eng(r.v[n], 'V')))); }
            else if (kind === 'tran') {
              const tstop = num(a.tstop, 0.01); if (!(tstop > 0 && tstop < 1e4)) throw new Error('tstop');
              const r = Sim.tran(net, { tstop, dt: tstop / 1000, v: probes.length ? probes : undefined }); ok = ok && r.ok;
              plots.push(plot({ id: 'gt' + ai, title: L('الزمن', 'Transient'), series: Object.keys(r.v).slice(0, 4).map(n => ({ x: r.t, y: r.v[n], label: n })), xlabel: 't (s)', ylabel: 'V' }));
              if (!r.ok) notes.push('⚠️ ' + r.reason);
            } else if (kind === 'ac') {
              const fa = num(a.fstart, 10), fb = num(a.fstop, 1e5); if (!(fa > 0 && fb > fa)) throw new Error('freq');
              const r = Sim.ac(net, { fstart: fa, fstop: fb, n: 140, v: probes.length ? probes : undefined }); ok = ok && r.ok;
              plots.push(plot({ id: 'ga' + ai, title: L('الاستجابة الترددية (dB)', 'Frequency response (dB)'), series: Object.keys(r.v).slice(0, 4).map(n => ({ x: r.f, y: r.v[n].db, label: n })), xlog: true, xlabel: 'f (Hz)', ylabel: 'dB' }));
            } else if (kind === 'dc') {
              const r = Sim.dcsweep(net, { src: String(a.src), from: num(a.from, 0), to: num(a.to, 10), n: 80, v: probes.length ? probes : undefined }); ok = ok && r.ok;
              plots.push(plot({ id: 'gd' + ai, title: L('مسح DC', 'DC sweep'), series: Object.keys(r.v).slice(0, 4).map(n => ({ x: r.x, y: r.v[n], label: n })), xlabel: String(a.src) + ' (V)', ylabel: 'V' }));
            }
          } catch (e) { ok = false; notes.push('⚠️ ' + esc(e.message || e)); }
        });
        return { ok, readouts, plots, notes };
      },
    };
  }

  // ---------- reading and validating a block ----------
  const NAMES = () => Object.keys(T).concat(['netlist']);
  function parseBlock(text) {
    let spec; try { spec = JSON.parse(String(text || '').trim()); } catch (e) { return { ok: false, error: 'json' }; }
    if (!spec || typeof spec !== 'object') return { ok: false, error: 'json' };
    const name = String(spec.template || '').toLowerCase();
    if (!NAMES().includes(name)) return { ok: false, error: 'template' };
    try {
      const def = name === 'netlist' ? genericDef(spec) : T[name];
      return { ok: true, name, spec, def, params: resolveParams(def, spec.params, name === 'netlist') };
    } catch (e) { return { ok: false, error: String(e.message || e) }; }
  }
  function resolveParams(def, given, generic) {
    given = given && typeof given === 'object' && !Array.isArray(given) ? given : {};
    return def.P.map(d => {
      const g = generic ? null : given[d.k], q = Object.assign({}, d);
      if (g != null) {
        const o = typeof g === 'number' ? { value: g } : (typeof g === 'object' ? g : {});
        if (isNum(o.min)) q.min = o.min; if (isNum(o.max)) q.max = o.max; if (isNum(o.value)) q.val = o.value;
        if (q.log && !(q.min > 0)) q.min = d.min > 0 ? d.min : 1e-12;
        if (!(q.max > q.min)) { q.min = d.min; q.max = d.max; }
        if (q.val < q.min) q.min = q.val; if (q.val > q.max) q.max = q.val;       // never silently ignore a value the AI asked for
      }
      if (!isNum(q.val)) q.val = d.val;
      if (q.log && !(q.min > 0)) q.log = false;
      q.val = Math.min(Math.max(q.val, q.min), q.max);
      return q;
    });
  }
  const valuesOf = params => { const p = {}; params.forEach(q => { p[q.k] = q.val; }); return p; };
  function runTemplate(def, params) {
    const p = valuesOf(params);
    try { const r = def.run(p); r.svg = def.generic ? '' : svgWrap(def.svg(p), def.h); r.list = def.generic ? def.list(p) : null; return r; }
    catch (e) { return { ok: false, readouts: [], plots: [], notes: ['⚠️ ' + esc(e.message || e)], svg: '', list: null }; }
  }

  // ---------- the chat widget ----------
  const CSS = `
.sim-card{border:1px solid var(--line);background:color-mix(in srgb,var(--bg) 55%,var(--surface));border-radius:14px;margin:10px 0;overflow:hidden;max-width:560px}
.sim-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:10px 12px;border-bottom:1px solid var(--line)}
.sim-title{font-weight:700;font-size:14px}
.sim-badge{font-size:10.5px;color:var(--ink-soft);border:1px solid var(--line-strong);border-radius:999px;padding:2px 8px}
.sim-sch,.sim-plot{display:block;width:100%;height:auto}
.sim-sch{padding:6px 10px 0;max-height:230px}
.sim-card .w{stroke:var(--ink);fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.sim-card .dot{fill:var(--ink)} .sim-card .fillink{fill:var(--ink);stroke:none}
.sim-card .t{fill:var(--ink-soft);font:600 10px 'JetBrains Mono',ui-monospace,monospace} .sim-card .tv{fill:var(--ink)} .sim-card .sm{font-size:8.5px;font-weight:500}
.sim-card .g{stroke:var(--line);stroke-width:1} .sim-card .g.z{stroke:var(--line-strong)} .sim-card .fr{fill:none;stroke:var(--line-strong)}
.sim-card .ln{fill:none;stroke-width:1.7;stroke-linejoin:round}
.sim-card .hide{display:none}
.sim-reads{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px}
.sim-chip{border:1px solid var(--line);border-radius:10px;padding:4px 9px;background:var(--surface);min-width:0}
.sim-chip b{display:block;font-size:10px;font-weight:600;color:var(--ink-soft)} .sim-chip span{font-size:13px;font-weight:700;font-family:'JetBrains Mono',ui-monospace,monospace;color:var(--ink)}
.sim-plots{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,340px));justify-content:center;gap:4px;padding:2px 8px}
.sim-ctrl{padding:6px 12px 10px;display:grid;gap:7px}
.sim-row{display:grid;grid-template-columns:76px 1fr 84px;align-items:center;gap:8px;font-size:12px}
.sim-row label{color:var(--ink-soft);font-weight:600;font-family:'JetBrains Mono',ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis}
.sim-row output{text-align:end;font-family:'JetBrains Mono',ui-monospace,monospace;color:var(--ink);font-weight:700}
.sim-row input[type=range]{width:100%;accent-color:var(--red-solid,#E01F3D);min-width:0}
.sim-notes{padding:0 12px 8px;font-size:12px;color:var(--ink-soft);display:grid;gap:3px}
.sim-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 12px;border-top:1px solid var(--line);font-size:11px;color:var(--ink-soft)}
.sim-foot button{border:1px solid var(--line-strong);background:transparent;color:var(--ink);border-radius:8px;padding:3px 10px;font-size:11px;cursor:pointer}
.sim-net{padding:8px 12px;font:600 11px 'JetBrains Mono',ui-monospace,monospace;color:var(--ink-soft);white-space:pre-wrap;direction:ltr;text-align:left}
.sim-err{padding:10px 12px;font-size:13px;color:var(--ink-soft)}
`;
  let cssDone = false;
  function ensureCss() { if (cssDone || !root.document) return; const s = root.document.createElement('style'); s.textContent = CSS; root.document.head.appendChild(s); cssDone = true; }
  const posToVal = (q, pos) => q.log ? q.min * Math.pow(q.max / q.min, pos / 1000) : q.min + (q.max - q.min) * pos / 1000;
  const valToPos = (q, v) => Math.round(1000 * (q.log ? Math.log(v / q.min) / Math.log(q.max / q.min) : (v - q.min) / (q.max - q.min || 1)));

  function mount(host, parsed, state) {          // state: optional plain object that remembers the slider values across re-renders
    ensureCss();
    const doc = root.document, card = doc.createElement('div'); card.className = 'sim-card'; card.setAttribute('dir', 'ltr');
    if (!parsed || !parsed.ok) {
      card.innerHTML = '<div class="sim-err">' + esc(L('⚠️ تعذّر عرض هذه المحاكاة. اطلب من المساعد إعادة كتابتها.', '⚠️ This simulation could not be displayed. Ask the assistant to write it again.')) + '</div>';
      host.replaceChildren(card); return card;
    }
    const def = parsed.def, params = parsed.params.map(q => Object.assign({}, q)), defaults = params.map(q => q.val);
    if (state) params.forEach(pp => { const v = state[pp.k]; if (isNum(v)) pp.val = Math.min(Math.max(v, pp.min), pp.max); });
    card.innerHTML = '<div class="sim-head"><span class="sim-title"></span><span class="sim-badge"></span></div><div class="sim-schwrap"></div><div class="sim-reads"></div><div class="sim-notes"></div><div class="sim-plots"></div><div class="sim-ctrl"></div><div class="sim-foot"><span></span><button type="button"></button></div>';
    const q = s => card.querySelector(s);
    q('.sim-title').textContent = '⚡ ' + (parsed.spec.title && !def.generic ? String(parsed.spec.title).slice(0, 80) : def.title());
    q('.sim-badge').textContent = L('محاكي تعليمي مبسّط — ليس SPICE', 'Simplified educational simulator — not SPICE');
    q('.sim-foot span').textContent = L('حرّك المنزلقات وراقب النتيجة. القيم تقريبية.', 'Move the sliders and watch the result. Values are approximate.');
    const resetBtn = q('.sim-foot button'); resetBtn.textContent = L('↺ إعادة', '↺ Reset');
    const ctrl = q('.sim-ctrl'), rows = [];
    params.forEach((pp, i) => {
      const row = doc.createElement('div'); row.className = 'sim-row';
      const lab = doc.createElement('label'); lab.textContent = pp.label || pp.k; const out = doc.createElement('output');
      const inp = doc.createElement('input'); inp.type = 'range'; inp.min = 0; inp.max = 1000; inp.step = 1; inp.value = valToPos(pp, pp.val); inp.setAttribute('aria-label', pp.label || pp.k);
      inp.addEventListener('input', () => { pp.val = posToVal(pp, +inp.value); if (state) state[pp.k] = pp.val; out.textContent = eng(pp.val, pp.u); schedule(); });
      out.textContent = eng(pp.val, pp.u); row.append(lab, inp, out); ctrl.appendChild(row); rows.push({ inp, out });
    });
    if (!params.length) ctrl.remove();
    resetBtn.addEventListener('click', () => { params.forEach((pp, i) => { pp.val = defaults[i]; if (state) delete state[pp.k]; rows[i].inp.value = valToPos(pp, pp.val); rows[i].out.textContent = eng(pp.val, pp.u); }); render(); });
    let pending = false; const raf = root.requestAnimationFrame || (f => setTimeout(f, 16));
    function schedule() { if (pending) return; pending = true; raf(() => { pending = false; render(); }); }
    function render() {
      const r = runTemplate(def, params);
      q('.sim-schwrap').innerHTML = r.svg || (r.list ? '<div class="sim-net">' + esc(r.list.join('\n')) + '</div>' : '');
      q('.sim-reads').innerHTML = (r.readouts || []).map(x => '<div class="sim-chip"><b>' + esc(x.l) + '</b><span>' + esc(x.v) + '</span></div>').join('');
      q('.sim-plots').innerHTML = (r.plots || []).join('');
      const notes = (r.notes || []).slice(); if (!r.ok) notes.unshift(L('⚠️ لم يتقارب الحل لهذه القيم. جرّب قيماً أخرى.', '⚠️ The solver did not converge for these values. Try other values.'));
      q('.sim-notes').innerHTML = notes.map(n => '<div>' + (/^[⚠️✅●]/u.test(n) ? n : esc(n)) + '</div>').join('');
    }
    render(); host.replaceChildren(card); return card;
  }

  const api = { parseBlock, mount, templates: T, names: NAMES, runTemplate, eng, plot, resolveParams, valuesOf, genericDef, svgWrap };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ERSimUI = api;
})(typeof window !== 'undefined' ? window : globalThis);
