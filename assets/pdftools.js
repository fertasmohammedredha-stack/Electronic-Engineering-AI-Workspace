// assets/pdftools.js — reads PDFs in the browser (pdf.js, loaded from a CDN only when a PDF is attached)
//   PdfTools.process(file, {from, to, onProgress})  → big PDFs become  text of the chosen pages  +  a few small page images
//                                                       (so a 20 MB lecture fits in about 2 MB and the AI can still see the figures)
//   PdfTools.quickText(file, maxChars)              → the first characters of text, used as a fallback when the main AI is busy
(function () {
  'use strict';
  const VERSION = '6.2.108';
  const BASE = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + VERSION + '/build/';
  const MAX_TEXT_CHARS = 20000;          // what the server accepts as attached text
  const MAX_IMAGES = 6;                  // page pictures sent with a big PDF (8 for scanned PDFs that have no text)
  const MAX_IMAGES_SCANNED = 8;
  const IMAGE_BUDGET_CHARS = 2300000;    // total base64 size of all page pictures (the whole request must stay under ~4 MB)
  const IMAGE_WIDTH = 1100;

  let libPromise = null;
  function loadLib() {
    if (!libPromise) {
      libPromise = import(BASE + 'pdf.min.mjs').then(m => { m.GlobalWorkerOptions.workerSrc = BASE + 'pdf.worker.min.mjs'; return m; })
        .catch(e => { libPromise = null; throw e; });
    }
    return libPromise;
  }

  async function openDoc(file) {
    const lib = await loadLib();
    const data = new Uint8Array(await file.arrayBuffer());
    return lib.getDocument({ data, isEvalSupported: false }).promise;
  }

  const clampRange = (total, from, to) => {
    let a = Math.max(1, Math.min(total, parseInt(from, 10) || 1));
    let b = Math.max(1, Math.min(total, parseInt(to, 10) || total));
    if (b < a) { const t = a; a = b; b = t; }
    return [a, b];
  };

  async function pageText(doc, n) {
    const page = await doc.getPage(n);
    const tc = await page.getTextContent();
    page.cleanup();
    return tc.items.map(i => (i.str || '') + (i.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  // Text of pages a..b, stopping when the limit is reached. Each page is labelled so the AI can quote page numbers.
  async function extractText(doc, a, b, maxChars, onProgress) {
    let out = '', last = a - 1;
    for (let n = a; n <= b; n++) {
      const t = await pageText(doc, n);
      const block = (t ? '\n\n--- page ' + n + ' ---\n' + t : '');
      if (out.length + block.length > maxChars) { out += block.slice(0, Math.max(0, maxChars - out.length)); last = n; break; }
      out += block; last = n;
      if (onProgress) onProgress({ phase: 'text', done: n - a + 1, of: b - a + 1 });
    }
    return { text: out.trim(), lastPage: last };
  }

  // Evenly spaced sample of the pages (all of them when there are few).
  function pickPages(a, b, k) {
    const n = b - a + 1;
    if (n <= k) return Array.from({ length: n }, (_, i) => a + i);
    const out = []; for (let i = 0; i < k; i++) out.push(a + Math.round(i * (n - 1) / (k - 1)));
    return [...new Set(out)];
  }

  async function renderPage(doc, n, width, quality) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(3, width / base.width) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);   // transparent PDF backgrounds would turn black as JPEG
    await page.render({ canvasContext: ctx, canvas, viewport }).promise;
    const url = canvas.toDataURL('image/jpeg', quality);
    canvas.width = canvas.height = 0; page.cleanup();
    return url.split(',')[1];
  }

  // Every chosen page gets a share of the size budget; a page that is too heavy is re-drawn smaller / lighter until it fits,
  // so a scan full of grain still sends all its pages instead of dropping some.
  const STEPS = [[IMAGE_WIDTH, 0.62], [900, 0.5], [750, 0.42], [620, 0.36], [520, 0.32]];
  async function renderImages(doc, pages, onProgress) {
    const images = []; let total = 0;
    for (let i = 0; i < pages.length; i++) {
      const share = Math.floor((IMAGE_BUDGET_CHARS - total) / (pages.length - i));   // what this page may use
      let data = '';
      for (const [w, q] of STEPS) { data = await renderPage(doc, pages[i], w, q); if (data.length <= share) break; }
      if (total + data.length > IMAGE_BUDGET_CHARS) break;                              // even the lightest version does not fit
      total += data.length; images.push({ data, mimeType: 'image/jpeg', page: pages[i] });
      if (onProgress) onProgress({ phase: 'images', done: i + 1, of: pages.length });
    }
    return images;
  }

  async function process(file, opts) {
    opts = opts || {};
    const doc = await openDoc(file);
    try {
      const total = doc.numPages;
      const [a, b] = clampRange(total, opts.from, opts.to);
      const t = await extractText(doc, a, b, MAX_TEXT_CHARS - 600, opts.onProgress);   // leave room for the header line
      const scanned = t.text.replace(/--- page \d+ ---/g, '').replace(/\s+/g, '').length < 80;   // no real text layer: it is a scan
      const pages = pickPages(a, b, scanned ? MAX_IMAGES_SCANNED : MAX_IMAGES);
      const images = await renderImages(doc, pages, opts.onProgress);
      const header = '[PDF "' + file.name + '": ' + total + ' pages in total. Included: ' +
        (scanned ? 'no text layer (scanned document)' : 'text of pages ' + a + '–' + t.lastPage) +
        ' and pictures of pages ' + images.map(i => i.page).join(', ') + '. For other pages the student can choose a page range.]';
      return { text: header + '\n' + t.text, images, total, from: a, to: b, textTo: t.lastPage, scanned, imagePages: images.map(i => i.page) };
    } finally { try { doc.destroy(); } catch (e) {} }
  }

  async function quickText(file, maxChars) {
    const doc = await openDoc(file);
    try { const r = await extractText(doc, 1, doc.numPages, maxChars || 6000); return r.text; }
    finally { try { doc.destroy(); } catch (e) {} }
  }

  window.PdfTools = { process, quickText, loadLib, VERSION, MAX_TEXT_CHARS };
})();
