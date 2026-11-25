/* ElectroRed AI - small educational circuit simulator (engine only, no DOM).
 *
 * Modified nodal analysis (MNA) with Newton iterations for the non-linear parts.
 * It is a SIMPLIFIED teaching tool, not SPICE: ideal-ish models, fixed time step,
 * no temperature, no noise, no parasitics unless you add them yourself.
 *
 * Elements (netlist = array of objects; nodes are strings, "0"/"gnd" = ground):
 *   {t:"R",  name, n:[a,b], v:ohms}
 *   {t:"C",  name, n:[a,b], v:farads}
 *   {t:"L",  name, n:[a,b], v:henries}
 *   {t:"V",  name, n:[plus,minus], wave:W, ac:1}      voltage source (ac = small-signal amplitude for AC sweeps)
 *   {t:"I",  name, n:[from,to],  wave:W}              current source (current flows from n[0] through the source to n[1])
 *   {t:"D",  name, n:[anode,cathode], is:1e-14, nn:1} silicon diode (Shockley)
 *   {t:"Z",  name, n:[anode,cathode], vz:5.1, izt:5e-3} zener (forward like D, breakdown at vz)
 *   {t:"Q",  name, n:[c,b,e], bf:100, is:1e-14}       NPN BJT (Ebers-Moll, no Early effect)
 *   {t:"OA", name, n:[plus,minus,out], A:1e5, vsat:12, gbw:0}  op-amp, output limited to +-vsat (smooth tanh), gbw only used in AC
 *  W = {type:"dc", v} | {type:"sine", amp, freq, off, phase(deg)} |
 *      {type:"pulse", v1, v2, td, tr, tf, pw, per} | {type:"step", v1, v2, t0}
 */
(function (root) {
  'use strict';
  const VT = 0.025852;            // thermal voltage at ~300 K
  const GMIN = 1e-12;
  const isGnd = n => n === '0' || n === 0 || /^gnd$/i.test(String(n));

  // ---------- dense linear solvers ----------
  function solveReal(A, z, N) {
    for (let c = 0; c < N; c++) {
      let p = c, best = Math.abs(A[c * N + c]);
      for (let r = c + 1; r < N; r++) { const v = Math.abs(A[r * N + c]); if (v > best) { best = v; p = r; } }
      if (!(best > 1e-300)) return null;
      if (p !== c) {
        for (let k = 0; k < N; k++) { const t = A[c * N + k]; A[c * N + k] = A[p * N + k]; A[p * N + k] = t; }
        const t = z[c]; z[c] = z[p]; z[p] = t;
      }
      const d = A[c * N + c];
      for (let r = c + 1; r < N; r++) {
        const f = A[r * N + c] / d; if (f === 0) continue;
        for (let k = c; k < N; k++) A[r * N + k] -= f * A[c * N + k];
        z[r] -= f * z[c];
      }
    }
    const x = new Float64Array(N);
    for (let r = N - 1; r >= 0; r--) {
      let s = z[r]; for (let k = r + 1; k < N; k++) s -= A[r * N + k] * x[k];
      x[r] = s / A[r * N + r];
    }
    return x;
  }
  function solveComplex(Ar, Ai, zr, zi, N) {
    for (let c = 0; c < N; c++) {
      let p = c, best = Math.hypot(Ar[c * N + c], Ai[c * N + c]);
      for (let r = c + 1; r < N; r++) { const v = Math.hypot(Ar[r * N + c], Ai[r * N + c]); if (v > best) { best = v; p = r; } }
      if (!(best > 1e-300)) return null;
      if (p !== c) {
        for (let k = 0; k < N; k++) {
          let t = Ar[c * N + k]; Ar[c * N + k] = Ar[p * N + k]; Ar[p * N + k] = t;
          t = Ai[c * N + k]; Ai[c * N + k] = Ai[p * N + k]; Ai[p * N + k] = t;
        }
        let t = zr[c]; zr[c] = zr[p]; zr[p] = t; t = zi[c]; zi[c] = zi[p]; zi[p] = t;
      }
      const dr = Ar[c * N + c], di = Ai[c * N + c], dd = dr * dr + di * di;
      for (let r = c + 1; r < N; r++) {
        const nr = Ar[r * N + c], ni = Ai[r * N + c]; if (nr === 0 && ni === 0) continue;
        const fr = (nr * dr + ni * di) / dd, fi = (ni * dr - nr * di) / dd;
        for (let k = c; k < N; k++) {
          const ar = Ar[c * N + k], ai = Ai[c * N + k];
          Ar[r * N + k] -= fr * ar - fi * ai; Ai[r * N + k] -= fr * ai + fi * ar;
        }
        zr[r] -= fr * zr[c] - fi * zi[c]; zi[r] -= fr * zi[c] + fi * zr[c];
      }
    }
    const xr = new Float64Array(N), xi = new Float64Array(N);
    for (let r = N - 1; r >= 0; r--) {
      let sr = zr[r], si = zi[r];
      for (let k = r + 1; k < N; k++) {
        const ar = Ar[r * N + k], ai = Ai[r * N + k];
        sr -= ar * xr[k] - ai * xi[k]; si -= ar * xi[k] + ai * xr[k];
      }
      const dr = Ar[r * N + r], di = Ai[r * N + r], dd = dr * dr + di * di;
      xr[r] = (sr * dr + si * di) / dd; xi[r] = (si * dr - sr * di) / dd;
    }
    return { re: xr, im: xi };
  }

  // ---------- helpers ----------
  const num = (x, d) => (typeof x === 'number' && isFinite(x) ? x : d);
  function waveAt(w, t, dcOnly) {
    if (!w) return 0;
    switch (w.type) {
      case 'sine': return num(w.off, 0) + (dcOnly ? 0 : num(w.amp, 1) * Math.sin(2 * Math.PI * num(w.freq, 1000) * t + num(w.phase, 0) * Math.PI / 180));
      case 'pulse': {
        if (dcOnly) return num(w.v1, 0);
        const v1 = num(w.v1, 0), v2 = num(w.v2, 1), td = num(w.td, 0), tr = Math.max(num(w.tr, 1e-9), 1e-12), tf = Math.max(num(w.tf, 1e-9), 1e-12);
        const pw = num(w.pw, 1e-3), per = num(w.per, 0);
        if (t < td) return v1;
        let tt = t - td; if (per > 0) tt = tt % per;
        if (tt < tr) return v1 + (v2 - v1) * tt / tr;
        if (tt < tr + pw) return v2;
        if (tt < tr + pw + tf) return v2 + (v1 - v2) * (tt - tr - pw) / tf;
        return v1;
      }
      case 'step': return dcOnly ? num(w.v1, 0) : (t >= num(w.t0, 0) ? num(w.v2, 1) : num(w.v1, 0));
      default: return num(w.v, 0);
    }
  }
  let limitFlag = false;        // set when a junction voltage had to be limited: that Newton iteration cannot count as converged
  function pnjlim(vnew, vold, vt, vcrit) {
    if (vnew > vcrit && Math.abs(vnew - vold) > 2 * vt) {
      if (vold > 0) { const arg = 1 + (vnew - vold) / vt; vnew = arg > 0 ? vold + vt * Math.log(arg) : vcrit; }
      else vnew = vt * Math.log(vnew / vt);
      limitFlag = true;
    }
    return vnew;
  }
  const expc = x => Math.exp(Math.min(x, 60));

  // ---------- compile ----------
  function compile(netlist) {
    const nodeIdx = new Map(); let nNodes = 0;
    const node = n => { if (isGnd(n)) return -1; const k = String(n); if (!nodeIdx.has(k)) nodeIdx.set(k, nNodes++); return nodeIdx.get(k); };
    const els = [];
    let nBr = 0; const brOf = [];
    netlist.forEach((e, i) => {
      if (!e || !e.t) throw new Error('bad element #' + i);
      const el = Object.assign({}, e); el.name = el.name || (e.t + (i + 1));
      el.nd = (el.n || []).map(node);
      const need = { R: 2, C: 2, L: 2, V: 2, I: 2, D: 2, Z: 2, Q: 3, OA: 3 }[el.t];
      if (!need) throw new Error('unknown element type ' + el.t);
      if (el.nd.length !== need) throw new Error(el.name + ': needs ' + need + ' nodes');
      if ((el.t === 'R' || el.t === 'C' || el.t === 'L') && !(el.v > 0)) throw new Error(el.name + ': value must be > 0');
      if (el.t === 'V' || el.t === 'L' || el.t === 'OA') { el.br = nBr++; brOf.push(el); }
      el._s = {};
      els.push(el);
    });
    return { els, nNodes, nBr, N: nNodes + nBr, nodeNames: [...nodeIdx.keys()], nodeIdx, brOf,
             nonlinear: els.some(e => e.t === 'D' || e.t === 'Z' || e.t === 'Q' || e.t === 'OA') };
  }

  // ---------- device evaluation (returns currents into terminals + Jacobian) ----------
  function diodeEval(el, vd, limited) {
    const is = num(el.is, 1e-14), nn = num(el.nn, 1), vt = nn * VT;
    let v = vd;
    const s = el._s;
    if (limited) { v = pnjlim(vd, s.vd === undefined ? 0 : s.vd, vt, vt * Math.log(vt / (Math.SQRT2 * is))); s.vd = v; }
    const e = expc(v / vt);
    let i = is * (e - 1), g = is * e / vt;
    let ieq = i - g * v;
    if (el.t === 'Z') {
      const vz = num(el.vz, 5.1), izt = num(el.izt, 5e-3), vtz = 1.5 * VT;
      let w = -(v + vz);
      if (limited) { w = pnjlim(-(vd + vz), s.w === undefined ? -vz : s.w, vtz, vtz * Math.log(vtz / (Math.SQRT2 * izt))); s.w = w; }
      const ez = expc(w / vtz);
      const ib = -izt * ez, gb = izt * ez / vtz;
      ieq += ib - gb * (limited ? -(w + vz) : v);     // tangent of the breakdown branch about ITS own (limited) point
      i += ib; g += gb;
    }
    return { i, g: g + GMIN, ieq, v };
  }
  function bjtEval(el, vb, vc, ve, limited) {
    const is = num(el.is, 1e-14), bf = num(el.bf, 100), br = num(el.br_, 1);
    let vbe = vb - ve, vbc = vb - vc; const s = el._s;
    if (limited) {
      const vcrit = VT * Math.log(VT / (Math.SQRT2 * is));
      vbe = pnjlim(vbe, s.vbe === undefined ? 0 : s.vbe, VT, vcrit); vbc = pnjlim(vbc, s.vbc === undefined ? 0 : s.vbc, VT, vcrit);
      s.vbe = vbe; s.vbc = vbc;
    }
    const ebe = expc(vbe / VT), ebc = expc(vbc / VT);
    const ibe = is * (ebe - 1), ibc = is * (ebc - 1), gbe = is * ebe / VT + GMIN, gbc = is * ebc / VT + GMIN;
    const ic = ibe - ibc - ibc / br, ib = ibe / bf + ibc / br;
    // derivatives wrt Vbe, Vbc
    const dIc_dbe = gbe, dIc_dbc = -gbc - gbc / br, dIb_dbe = gbe / bf, dIb_dbc = gbc / br;
    // terminal order c,b,e ; Vbe = Vb-Ve ; Vbc = Vb-Vc
    const dIc = [-dIc_dbc, dIc_dbe + dIc_dbc, -dIc_dbe];
    const dIb = [-dIb_dbc, dIb_dbe + dIb_dbc, -dIb_dbe];
    const dIe = [-(dIc[0] + dIb[0]), -(dIc[1] + dIb[1]), -(dIc[2] + dIb[2])];
    return { ic, ib, ie: -(ic + ib), J: [dIc, dIb, dIe], vbe, vbc };
  }
  function oaEval(el, vd, limited) {
    const A = num(el.A, 1e5), vs = Math.max(num(el.vsat, 12), 1e-3);
    if (limited) {            // damped Newton: the high-gain tanh is very steep, so move the differential input in small steps
      const s = el._s, prev = s.vd === undefined ? 0 : s.vd, w = vs / A, zone = 6 * w;
      // far inside saturation the curve is flat, so the input may travel freely up to the edge of the active zone;
      // inside the zone move in small steps (the slope there is huge)
      const allowed = (Math.abs(prev) > zone ? Math.abs(prev) - zone : 0) + 0.5 * w;
      const d = vd - prev;
      if (Math.abs(d) > allowed) { vd = prev + Math.sign(d) * allowed; limitFlag = true; }
      s.vd = vd;
    }
    const th = Math.tanh(A * vd / vs);
    return { f: vs * th, slope: A * (1 - th * th) + 1e-9, vd };
  }

  // ---------- real assemble (DC / transient) ----------
  function assemble(c, x, mode, t, h, scale, st, A, z) {
    const N = c.N, nn = c.nNodes;
    A.fill(0); z.fill(0);
    const V = k => (k < 0 ? 0 : x[k]);
    const addA = (r, col, v) => { if (r >= 0 && col >= 0) A[r * N + col] += v; };
    const addZ = (r, v) => { if (r >= 0) z[r] += v; };
    const stampG = (a, b, g) => { addA(a, a, g); addA(b, b, g); addA(a, b, -g); addA(b, a, -g); };
    for (let k = 0; k < nn; k++) A[k * N + k] += GMIN;
    for (const el of c.els) {
      const [a, b, d] = el.nd;
      switch (el.t) {
        case 'R': stampG(a, b, 1 / el.v); break;
        case 'C':
          if (mode === 'tran') { const g = 2 * el.v / h; const s = el._s; stampG(a, b, g); const ieq = g * s.vp + s.ip; addZ(a, ieq); addZ(b, -ieq); }
          break; // open at DC
        case 'L': {
          const r = nn + el.br; addA(a, r, 1); addA(b, r, -1); addA(r, a, 1); addA(r, b, -1);
          if (mode === 'tran') { const g = 2 * el.v / h; A[r * N + r] -= g; z[r] += -g * el._s.ip - el._s.vp; }
          break; }
        case 'V': {
          const r = nn + el.br; addA(a, r, 1); addA(b, r, -1); addA(r, a, 1); addA(r, b, -1);
          z[r] += scale * waveAt(el.wave, t, mode === 'dc'); break; }
        case 'I': { const i = scale * waveAt(el.wave, t, mode === 'dc'); addZ(a, -i); addZ(b, i); break; }
        case 'D': case 'Z': {
          const r = diodeEval(el, V(a) - V(b), true);
          stampG(a, b, r.g); addZ(a, -r.ieq); addZ(b, r.ieq); break; }
        case 'Q': {
          const r = bjtEval(el, V(b), V(a), V(d), true); // nd = [c,b,e]
          const tn = [a, b, d], I = [r.ic, r.ib, r.ie], vt3 = [V(a), V(b), V(d)];
          // linearised currents into terminals: I_k = I0_k + sum_m J[k][m](V_m - V0_m), but V0 are the limited ones
          const v0 = [r.vbe, r.vbc];
          // reconstruct limited terminal voltages relative to emitter: use Ve as ref
          const ve = vt3[2], vb0 = ve + r.vbe, vc0 = vb0 - r.vbc, V0 = [vc0, vb0, ve];
          for (let k = 0; k < 3; k++) {
            let ieq = I[k]; for (let m = 0; m < 3; m++) { addA(tn[k], tn[m], r.J[k][m]); ieq -= r.J[k][m] * V0[m]; }
            addZ(tn[k], -ieq);
          }
          break; }
        case 'OA': {
          const r = nn + el.br; // terminals p=a, n=b, out=d ; branch current flows into out node from the amp
          const o = oaEval(el, V(a) - V(b), true), vd = o.vd;
          addA(d, r, 1);                       // KCL at out: +i_branch leaves the node into the amp output... sign: branch current = current delivered into node
          addA(r, d, 1); addA(r, a, -o.slope); addA(r, b, o.slope);
          z[r] += o.f - o.slope * vd; break; }
      }
    }
  }

  function newton(c, x0, mode, t, h, scale, opts) {
    const N = c.N, A = new Float64Array(N * N), z = new Float64Array(N);
    let x = Float64Array.from(x0);
    const maxIt = c.nonlinear ? (opts.maxIt || 200) : 2;
    for (let it = 0; it < maxIt; it++) {
      limitFlag = false;
      assemble(c, x, mode, t, h, scale, null, A, z);
      const limited = limitFlag;
      const xn = solveReal(A, z, N);
      if (!xn) return { ok: false, x, it, reason: 'singular' };
      let conv = !limited;
      for (let k = 0; k < N && conv; k++) {
        if (!isFinite(xn[k])) return { ok: false, x, it, reason: 'nan' };
        const abs = k < c.nNodes ? 1e-6 : 1e-9;
        if (Math.abs(xn[k] - x[k]) > abs + 1e-6 * Math.max(Math.abs(xn[k]), Math.abs(x[k]))) { conv = false; break; }
      }
      x = xn;
      if (!c.nonlinear) return { ok: true, x, it: 1 };
      if (conv && it >= 1) return { ok: true, x, it: it + 1 };
    }
    return { ok: false, x, it: maxIt, reason: 'noconv' };
  }

  function dcSolve(c, guess) {
    c.els.forEach(e => { e._s = {}; });
    let x = guess ? Float64Array.from(guess) : new Float64Array(c.N);
    let r = newton(c, x, 'dc', 0, 0, 1, {});
    if (r.ok) return r;
    // source stepping fallback
    x = new Float64Array(c.N);
    c.els.forEach(e => { e._s = {}; });
    for (let k = 1; k <= 20; k++) {
      r = newton(c, x, 'dc', 0, 0, k / 20, { maxIt: 400 });
      if (!r.ok) return r; x = r.x;
    }
    return r;
  }

  // ---------- results helpers ----------
  function elementCurrent(c, el, x, mode, h) {
    const V = k => (k < 0 ? 0 : x[k]);
    const [a, b, d] = el.nd;
    switch (el.t) {
      case 'R': return (V(a) - V(b)) / el.v;
      case 'V': return -x[c.nNodes + el.br];
      case 'L': return x[c.nNodes + el.br];
      case 'OA': return -x[c.nNodes + el.br];
      case 'I': return waveAt(el.wave, 0, mode === 'dc');
      case 'D': case 'Z': { const r = diodeEval(el, V(a) - V(b), false); return r.i; }
      case 'Q': return bjtEval(el, V(b), V(a), V(d), false).ic;
      case 'C': return el._s.icur || 0;
    }
    return 0;
  }
  function nodeVoltages(c, x) { const o = { '0': 0 }; c.nodeNames.forEach((n, i) => { o[n] = x[i]; }); return o; }

  // ---------- analyses ----------
  function op(netlist) {
    const c = compile(netlist); const r = dcSolve(c);
    const cur = {}; c.els.forEach(e => { cur[e.name] = elementCurrent(c, e, r.x, 'dc'); });
    const extra = {}; c.els.forEach(e => { if (e.t === 'Q') { const q = bjtEval(e, r.x[e.nd[1]] || 0, e.nd[0] < 0 ? 0 : r.x[e.nd[0]], e.nd[2] < 0 ? 0 : r.x[e.nd[2]], false); extra[e.name] = { ib: q.ib, ic: q.ic, vbe: q.vbe, vbc: q.vbc }; } });
    return { ok: r.ok, reason: r.reason, v: nodeVoltages(c, r.x), i: cur, q: extra };
  }

  function tran(netlist, o) {
    const c = compile(netlist);
    const tstop = o.tstop, h = o.dt || tstop / 1000;
    const nSteps = Math.min(Math.max(Math.round(tstop / h), 1), 200000);
    const hh = tstop / nSteps;
    const probesV = o.v || c.nodeNames, probesI = o.i || [];
    const res = { t: [], v: {}, i: {}, ok: true, reason: '' };
    probesV.forEach(n => { res.v[n] = []; }); probesI.forEach(n => { res.i[n] = []; });
    // initial state
    let x;
    if (o.uic) { x = new Float64Array(c.N); }
    else { const r0 = dcSolve(c); if (!r0.ok) return { ok: false, reason: 'dc:' + r0.reason, t: [], v: {}, i: {} }; x = r0.x; }
    const V = k => (k < 0 ? 0 : x[k]);
    c.els.forEach(el => {
      const s = el._s; const [a, b] = el.nd;
      if (el.t === 'C') { s.vp = o.uic ? num(el.ic, 0) : V(a) - V(b); s.ip = 0; s.icur = 0; }
      if (el.t === 'L') { s.ip = o.uic ? num(el.ic, 0) : x[c.nNodes + el.br]; s.vp = 0; }
    });
    if (o.uic) c.els.forEach(el => { if (el.t === 'L') { /* inductor current ic enters via ip */ } });
    const record = t => {
      res.t.push(t);
      probesV.forEach(n => { const k = c.nodeIdx.get(String(n)); res.v[n].push(isGnd(n) ? 0 : (k === undefined ? NaN : x[k])); });
      probesI.forEach(n => { const el = c.els.find(e => e.name === n); res.i[n].push(el ? elementCurrent(c, el, x, 'tran', hh) : NaN); });
    };
    record(0);
    for (let s = 1; s <= nSteps; s++) {
      const t = s * hh;
      const r = newton(c, x, 'tran', t, hh, 1, {});
      if (!r.ok) { res.ok = false; res.reason = 'noconv at t=' + t.toExponential(2) + ' (' + r.reason + ')'; break; }
      x = r.x;
      c.els.forEach(el => {
        const st = el._s, [a, b] = el.nd;
        if (el.t === 'C') { const vn = V(a) - V(b), g = 2 * el.v / hh; const inew = g * (vn - st.vp) - st.ip; st.ip = inew; st.vp = vn; st.icur = inew; }
        if (el.t === 'L') { st.vp = V(a) - V(b); st.ip = x[c.nNodes + el.br]; }
      });
      record(t);
    }
    return res;
  }

  function ac(netlist, o) {
    const c = compile(netlist);
    const r0 = dcSolve(c); if (!r0.ok) return { ok: false, reason: 'dc:' + r0.reason, f: [], v: {} };
    const x0 = r0.x, V0 = k => (k < 0 ? 0 : x0[k]);
    const N = c.N, nn = c.nNodes;
    const probes = o.v || c.nodeNames;
    const fstart = o.fstart, fstop = o.fstop, np = o.n || 120;
    const res = { ok: true, f: [], v: {} };
    probes.forEach(n => { res.v[n] = { mag: [], db: [], ph: [] }; });
    // small-signal parameters at the operating point
    const lin = new Map();
    c.els.forEach(el => {
      const [a, b, d] = el.nd;
      if (el.t === 'D' || el.t === 'Z') lin.set(el, diodeEval(el, V0(a) - V0(b), false).g);
      if (el.t === 'Q') lin.set(el, bjtEval(el, V0(b), V0(a), V0(d), false).J);
      if (el.t === 'OA') lin.set(el, oaEval(el, V0(a) - V0(b), false).slope);
    });
    for (let k = 0; k < np; k++) {
      const f = fstart * Math.pow(fstop / fstart, np === 1 ? 0 : k / (np - 1)), w = 2 * Math.PI * f;
      const Ar = new Float64Array(N * N), Ai = new Float64Array(N * N), zr = new Float64Array(N), zi = new Float64Array(N);
      const add = (r, col, gr, gi) => { if (r >= 0 && col >= 0) { Ar[r * N + col] += gr; Ai[r * N + col] += gi; } };
      const stampY = (a, b, gr, gi) => { add(a, a, gr, gi); add(b, b, gr, gi); add(a, b, -gr, -gi); add(b, a, -gr, -gi); };
      for (let q = 0; q < nn; q++) Ar[q * N + q] += GMIN;
      for (const el of c.els) {
        const [a, b, d] = el.nd;
        switch (el.t) {
          case 'R': stampY(a, b, 1 / el.v, 0); break;
          case 'C': stampY(a, b, 0, w * el.v); break;
          case 'L': { const r = nn + el.br; add(a, r, 1, 0); add(b, r, -1, 0); add(r, a, 1, 0); add(r, b, -1, 0); add(r, r, 0, -w * el.v); break; }
          case 'V': { const r = nn + el.br; add(a, r, 1, 0); add(b, r, -1, 0); add(r, a, 1, 0); add(r, b, -1, 0); zr[r] += num(el.ac, 0); break; }
          case 'I': { const i = num(el.ac, 0); if (a >= 0) zr[a] -= i; if (b >= 0) zr[b] += i; break; }
          case 'D': case 'Z': stampY(a, b, lin.get(el), 0); break;
          case 'Q': { const J = lin.get(el), tn = [a, b, d]; for (let p = 0; p < 3; p++) for (let m = 0; m < 3; m++) add(tn[p], tn[m], J[p][m], 0); break; }
          case 'OA': {
            const r = nn + el.br, sl = lin.get(el), A0 = num(el.A, 1e5), gbw = num(el.gbw, 0);
            let gr = sl, gi = 0;
            if (gbw > 0) { const wp = 2 * Math.PI * gbw / A0, den = 1 + (w / wp) * (w / wp); gr = sl / den; gi = -sl * (w / wp) / den; }
            add(d, r, 1, 0); add(r, d, 1, 0); add(r, a, -gr, -gi); add(r, b, gr, gi); break; }
        }
      }
      const sol = solveComplex(Ar, Ai, zr, zi, N);
      if (!sol) { res.ok = false; res.reason = 'singular at ' + f.toExponential(2) + ' Hz'; break; }
      res.f.push(f);
      probes.forEach(n => {
        const q = c.nodeIdx.get(String(n)); const re = isGnd(n) || q === undefined ? 0 : sol.re[q], im = isGnd(n) || q === undefined ? 0 : sol.im[q];
        const mag = Math.hypot(re, im);
        res.v[n].mag.push(mag); res.v[n].db.push(20 * Math.log10(Math.max(mag, 1e-30))); res.v[n].ph.push(Math.atan2(im, re) * 180 / Math.PI);
      });
    }
    return res;
  }

  function dcsweep(netlist, o) {
    const c = compile(netlist); const src = c.els.find(e => e.name === o.src);
    if (!src || (src.t !== 'V' && src.t !== 'I')) throw new Error('sweep source not found: ' + o.src);
    const n = o.n || 100, probes = o.v || c.nodeNames, res = { ok: true, x: [], v: {}, i: {} };
    probes.forEach(p => { res.v[p] = []; }); (o.i || []).forEach(p => { res.i[p] = []; });
    let x = null;
    for (let k = 0; k < n; k++) {
      const val = o.from + (o.to - o.from) * (n === 1 ? 0 : k / (n - 1));
      src.wave = { type: 'dc', v: val };
      const r = dcSolve(c, x); if (!r.ok) { res.ok = false; res.reason = 'noconv at ' + val; break; }
      x = r.x; res.x.push(val);
      probes.forEach(p => { const q = c.nodeIdx.get(String(p)); res.v[p].push(isGnd(p) ? 0 : (q === undefined ? NaN : x[q])); });
      (o.i || []).forEach(p => { const el = c.els.find(e => e.name === p); res.i[p].push(el ? elementCurrent(c, el, x, 'dc') : NaN); });
    }
    return res;
  }

  const api = { op, tran, ac, dcsweep, solveReal, version: '1' };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ERSim = api;
})(typeof window !== 'undefined' ? window : globalThis);
