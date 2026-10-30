// assets/filegen.js — builds downloadable files IN THE BROWSER from the AI's Markdown.
//   Word (.docx)       docx library, loaded on first use      (Arabic = right-to-left paragraphs)
//   PowerPoint (.pptx) pptxgenjs, loaded on first use         (Arabic = rtlMode)
//   Excel (.xlsx)      written by hand with JSZip (already on the page): real numbers, formulas, bold header
//   CSV                UTF-8 with BOM so Excel shows Arabic correctly
//   PDF                the browser's own print engine ("Save as PDF"): the only route that shapes Arabic
//                      and renders the equations properly (canvas/jsPDF PDF libraries break Arabic)
//   code / text        any text file, with the right extension
// Needs the page globals: marked, katex (optional), JSZip (for xlsx).
(function () {
  const CDN = {
    docx: 'https://cdn.jsdelivr.net/npm/docx@9.6.1/dist/index.iife.js',
    pptx: 'https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js',
    katexCss: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css'
  };
  const FONT = 'Arial'; // has Arabic glyphs, available everywhere

  // ---------------------------------------------------------------- small helpers
  const loaded = {};
  function loadScript(url) {
    if (!loaded[url]) {
      loaded[url] = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = url; s.onload = resolve;
        s.onerror = () => { delete loaded[url]; reject(new Error('Could not load ' + url)); };
        document.head.appendChild(s);
      });
    }
    return loaded[url];
  }
  const isArabic = s => /[\u0600-\u06FF]/.test(s || '');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const decode = s => String(s == null ? '' : s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const stripMd = s => decode(s).replace(/\*\*|__|`|~~/g, '').trim();

  function save(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  // Equations: Word/PowerPoint/Excel can't take LaTeX, so they get a readable plain-text version.
  const GREEK = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω' };
  const SYM = { cdot: '·', times: '×', pm: '±', mp: '∓', leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠', approx: '≈', infty: '∞', rightarrow: '→', to: '→', Rightarrow: '⇒', leftarrow: '←', degree: '°', circ: '°', partial: '∂', nabla: '∇', sum: 'Σ', int: '∫', angle: '∠', parallel: '∥', ldots: '…', dots: '…', cdots: '⋯', sim: '∼', propto: '∝', equiv: '≡', therefore: '∴', quad: ' ', qquad: '  ' };
  const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ' };
  const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', o: 'ₒ', x: 'ₓ', h: 'ₕ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', p: 'ₚ', s: 'ₛ', t: 'ₜ', i: 'ᵢ', j: 'ⱼ', r: 'ᵣ', u: 'ᵤ', v: 'ᵥ' };
  const mapAll = (str, table, fallbackPrefix) => {
    const chars = [...str]; const ok = chars.every(c => table[c] !== undefined);
    return ok ? chars.map(c => table[c]).join('') : fallbackPrefix + (chars.length > 1 ? '(' + str + ')' : str);
  };
  function latexToText(tex) {
    let s = String(tex);
    s = s.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\{([^{}]*)\}/g, '$1');
    // sub/superscripts FIRST: they remove inner braces, so \frac{V_{out}}{V_{in}} can then be matched
    s = s.replace(/\^\{([^{}]*)\}/g, (_, a) => mapAll(a, SUP, '^')).replace(/\^(\w)/g, (_, a) => mapAll(a, SUP, '^'));
    s = s.replace(/_\{([^{}]*)\}/g, (_, a) => mapAll(a, SUB, '_')).replace(/_(\w)/g, (_, a) => mapAll(a, SUB, '_'));
    for (let i = 0; i < 4; i++) s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)');
    s = s.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)').replace(/\\sqrt\s*(\w)/g, '√$1');
    s = s.replace(/\\left|\\right/g, '');
    s = s.replace(/\\([A-Za-z]+)/g, (m, n) => GREEK[n] !== undefined ? GREEK[n] : (SYM[n] !== undefined ? SYM[n] : n));
    s = s.replace(/\\[,;:! ]/g, ' ').replace(/\\\\/g, ' ').replace(/\\%/g, '%');
    return s.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
  }

  // Pull $...$ / $$...$$ out of the Markdown (so the Markdown parser can't damage it); put back as @@M0@@ markers.
  function shieldMath(text) {
    const math = []; const stash = (tex, display) => { math.push({ tex, display }); return '@@M' + (math.length - 1) + '@@'; };
    let s = String(text || '');
    s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => '\n\n' + stash(m, true) + '\n\n');
    s = s.replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => '\n\n' + stash(m, true) + '\n\n');
    s = s.replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => stash(m, false));
    s = s.replace(/\$([^\s$](?:[^\n$]*?[^\s$])?)\$/g, (_, m) => stash(m, false));
    return { text: s, math };
  }

  // ---------------------------------------------------------------- the file block the AI writes
  // ~~~electrored-file
  // type: docx            (docx | pdf | xlsx | pptx | csv | code)
  // name: report.docx
  // ---
  // ...content...
  // ~~~
  const TYPE_ALIASES = { word: 'docx', doc: 'docx', excel: 'xlsx', xls: 'xlsx', powerpoint: 'pptx', ppt: 'pptx', slides: 'pptx', text: 'code', txt: 'code', md: 'code', markdown: 'code' };
  const TYPE_EXT = { docx: 'docx', pdf: 'pdf', xlsx: 'xlsx', pptx: 'pptx', csv: 'csv', code: 'txt' };
  const MIME = {
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    csv: 'text/csv;charset=utf-8', code: 'text/plain;charset=utf-8'
  };
  function safeName(name, type) {
    let n = String(name || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\.{2,}/g, '.').replace(/^\.+/, '').trim().slice(0, 80) || 'electrored-file';
    if (type === 'code') { if (!/\.[A-Za-z0-9]{1,8}$/.test(n)) n += '.txt'; return n; }
    return n.toLowerCase().endsWith('.' + TYPE_EXT[type]) ? n : n.replace(/\.[A-Za-z0-9]{1,5}$/, '') + '.' + TYPE_EXT[type];
  }
  function parseBlock(body) {
    const lines = String(body || '').replace(/\r/g, '').split('\n');
    const meta = {}; let i = 0;
    for (; i < lines.length; i++) {
      const l = lines[i].trim();
      if (l === '---') { i++; break; }
      const m = l.match(/^(type|name|title)\s*:\s*(.+)$/i);
      if (m) meta[m[1].toLowerCase()] = m[2].trim();
      else if (l === '') continue;
      else break;                                   // first real content line: no more header
    }
    let type = (meta.type || '').toLowerCase(); type = TYPE_ALIASES[type] || type;
    if (!TYPE_EXT[type]) type = 'code';
    return { type, name: safeName(meta.name, type), title: meta.title || '', content: lines.slice(i).join('\n').replace(/^\n+|\n+$/g, '') };
  }

  // ---------------------------------------------------------------- tables → rows
  function parseMdTables(md) {
    // returns [{name, rows}] ; "## Name" headings before a table name the sheet
    const sheets = []; let name = null; let cur = null;
    const split = line => line.trim().replace(/^\||\|$/g, '').split('|').map(c => stripMd(c));
    for (const raw of String(md).split('\n')) {
      const line = raw.trim();
      const h = line.match(/^#{1,6}\s+(.*)$/);
      if (h) { name = stripMd(h[1]); cur = null; continue; }
      if (line.startsWith('|')) {
        const cells = split(line);
        if (cells.every(c => /^:?-{2,}:?$/.test(c))) continue;       // |---|---| separator
        if (!cur) { cur = { name: name || 'Sheet' + (sheets.length + 1), rows: [] }; sheets.push(cur); name = null; }
        cur.rows.push(cells);
      } else if (line === '') { /* blank line may sit between tables */ } else if (cur) { cur = null; }
    }
    if (!sheets.length) {                                              // plain CSV text fallback
      const rows = String(md).split('\n').filter(l => l.trim() && l.includes(',')).map(l => l.split(',').map(c => c.trim()));
      if (rows.length) sheets.push({ name: 'Sheet1', rows });
    }
    return sheets;
  }
  const isNumber = s => /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s);
  const SAFE_FORMULA = /^=[A-Za-z0-9_+\-*/^().,:;$<>=&%!' ]+$/;        // no | @ or anything that could launch a program

  // ---------------------------------------------------------------- CSV
  function buildCsv(spec) {
    const sheets = parseMdTables(spec.content);
    if (!sheets.length) throw new Error('No table found in the content');
    const cell = v => {
      let s = String(v);
      if (/^[=+@]/.test(s) || (/^-/.test(s) && !isNumber(s))) s = "'" + s;   // stop spreadsheet-formula injection
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const text = '\uFEFF' + sheets[0].rows.map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
    return new Blob([text], { type: MIME.csv });
  }

  // ---------------------------------------------------------------- XLSX (hand-built with JSZip)
  const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const colName = n => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  async function buildXlsx(spec) {
    if (typeof JSZip === 'undefined') throw new Error('JSZip is not loaded');
    const sheets = parseMdTables(spec.content);
    if (!sheets.length) throw new Error('No table found in the content');
    const used = new Set();
    sheets.forEach((sh, i) => {                                         // Excel sheet names: ≤31 chars, no []:*?/\ , unique
      let n = (sh.name || 'Sheet' + (i + 1)).replace(/[\[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Sheet' + (i + 1);
      let base = n, k = 2; while (used.has(n.toLowerCase())) n = base.slice(0, 28) + ' ' + k++;
      used.add(n.toLowerCase()); sh.name = n;
    });
    const rtl = isArabic(spec.content);
    const sheetXml = sh => {
      const widths = [];
      const rowsXml = sh.rows.map((r, ri) => {
        const cells = r.map((v, ci) => {
          const ref = colName(ci) + (ri + 1); const s = ri === 0 ? ' s="1"' : '';
          widths[ci] = Math.max(widths[ci] || 8, Math.min(60, [...String(v)].length + 3));
          if (v === '') return '<c r="' + ref + '"' + s + '/>';
          if (isNumber(v)) return '<c r="' + ref + '"' + s + '><v>' + v + '</v></c>';
          if (SAFE_FORMULA.test(v)) return '<c r="' + ref + '"' + s + '><f>' + xmlEsc(v.slice(1)) + '</f></c>';
          return '<c r="' + ref + '"' + s + ' t="inlineStr"><is><t xml:space="preserve">' + xmlEsc(v) + '</t></is></c>';
        }).join('');
        return '<row r="' + (ri + 1) + '">' + cells + '</row>';
      }).join('');
      const cols = '<cols>' + widths.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols>';
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<sheetViews><sheetView workbookViewId="0"' + (rtl ? ' rightToLeft="1"' : '') + '><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
        cols + '<sheetData>' + rowsXml + '</sheetData></worksheet>';
    };
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      sheets.map((sh, i) => '<sheet name="' + xmlEsc(sh.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>');
    zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map((_, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    zip.file('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF2E6D5"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
    sheets.forEach((sh, i) => zip.file('xl/worksheets/sheet' + (i + 1) + '.xml', sheetXml(sh)));
    return zip.generateAsync({ type: 'blob', mimeType: MIME.xlsx });
  }

  // ---------------------------------------------------------------- DOCX
  async function buildDocx(spec) {
    await loadScript(CDN.docx);
    const D = window.docx;
    const { text, math } = shieldMath(spec.content);
    const tokens = marked.lexer(text);
    const mathText = i => latexToText(math[+i].tex);

    const mk = (t, st) => new D.TextRun({
      text: t, bold: st.bold, italics: st.italics, strike: st.strike,
      font: st.code ? 'Consolas' : FONT, size: st.size, color: st.color, rightToLeft: st.rtl,
      shading: st.code ? { type: D.ShadingType.CLEAR, fill: 'EEEEEE', color: 'auto' } : undefined
    });
    const textRuns = (t, st) => decode(t).split(/(@@M\d+@@)/).filter(x => x !== '').map(part => {
      const m = part.match(/^@@M(\d+)@@$/);
      return m ? mk(mathText(m[1]), { ...st, italics: true }) : mk(part, st);
    });
    const runs = (toks, st) => {
      const out = [];
      for (const t of toks || []) {
        switch (t.type) {
          case 'strong': out.push(...runs(t.tokens, { ...st, bold: true })); break;
          case 'em': out.push(...runs(t.tokens, { ...st, italics: true })); break;
          case 'del': out.push(...runs(t.tokens, { ...st, strike: true })); break;
          case 'codespan': out.push(mk(decode(t.text), { ...st, code: true })); break;
          case 'br': out.push(new D.TextRun({ break: 1 })); break;
          case 'link': out.push(...runs(t.tokens, { ...st, color: '1F5FBF' })); break;
          case 'html': out.push(...textRuns(String(t.text).replace(/<[^>]+>/g, ''), st)); break;
          default:
            if (t.tokens) out.push(...runs(t.tokens, st));
            else if (t.text) out.push(...textRuns(t.text, st));
        }
      }
      return out;
    };
    const plain = toks => (toks || []).map(t => t.tokens ? plain(t.tokens) : (t.text || '')).join('');
    const rtlOf = toks => isArabic(plain(toks));

    let numInstance = 0;
    const children = [];
    const block = (toks, ctx) => {
      for (const t of toks) {
        switch (t.type) {
          case 'heading': {
            const ar = rtlOf(t.tokens);
            children.push(new D.Paragraph({ heading: D.HeadingLevel['HEADING_' + Math.min(6, t.depth)], bidirectional: ar, spacing: { before: 240, after: 120 }, children: runs(t.tokens, { rtl: ar, bold: true }) }));
            break;
          }
          case 'paragraph': case 'text': {
            const inline = t.tokens || [{ type: 'text', text: t.text }];
            const ar = rtlOf(inline); const only = plain(inline).trim();
            if (/^@@M\d+@@$/.test(only)) {                                   // display equation: centred, italic
              children.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 120, after: 120 }, children: [mk(mathText(only.slice(3, -2)), { italics: true, size: 24 })] }));
            } else {
              children.push(new D.Paragraph({ bidirectional: ar, spacing: { after: 120 }, indent: ctx.indent ? { left: ctx.indent } : undefined, children: runs(inline, { rtl: ar, italics: ctx.italics }) }));
            }
            break;
          }
          case 'list': {
            const instance = ++numInstance;
            for (const item of t.items) {
              const first = (item.tokens || []).find(x => x.type === 'text' || x.type === 'paragraph');
              const inline = first ? (first.tokens || [{ type: 'text', text: first.text }]) : [];
              const ar = rtlOf(inline);
              children.push(new D.Paragraph({
                numbering: { reference: t.ordered ? 'num' : 'bul', level: Math.min(2, ctx.level || 0), instance: t.ordered ? instance : undefined },
                bidirectional: ar, spacing: { after: 60 }, children: runs(inline, { rtl: ar })
              }));
              const rest = (item.tokens || []).filter(x => x !== first);
              if (rest.length) block(rest, { ...ctx, level: (ctx.level || 0) + 1 });
            }
            break;
          }
          case 'table': {
            const head = t.header.map(c => c.tokens || [{ type: 'text', text: c.text }]);
            const body = t.rows.map(r => r.map(c => c.tokens || [{ type: 'text', text: c.text }]));
            const all = [head, ...body]; const n = head.length; const w = Math.floor(9000 / n);
            const ar = rtlOf(head.flat());
            const cell = (toks, header) => new D.TableCell({
              width: { size: w, type: D.WidthType.DXA },
              shading: header ? { type: D.ShadingType.CLEAR, fill: 'F2E6D5', color: 'auto' } : undefined,
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: [new D.Paragraph({ bidirectional: rtlOf(toks), children: runs(toks, { rtl: rtlOf(toks), bold: header }) })]
            });
            children.push(new D.Table({
              width: { size: 9000, type: D.WidthType.DXA }, columnWidths: Array(n).fill(w), visuallyRightToLeft: ar,
              rows: all.map((r, ri) => new D.TableRow({ tableHeader: ri === 0, children: r.map(c => cell(c, ri === 0)) }))
            }));
            children.push(new D.Paragraph({ children: [] }));
            break;
          }
          case 'code': {
            const lines = decode(t.text).split('\n');
            children.push(new D.Paragraph({
              bidirectional: false, spacing: { before: 80, after: 160 },
              shading: { type: D.ShadingType.CLEAR, fill: 'F3F3F3', color: 'auto' },
              children: lines.map((l, i) => new D.TextRun({ text: l, break: i ? 1 : 0, font: 'Consolas', size: 19 }))
            }));
            break;
          }
          case 'blockquote': block(t.tokens, { ...ctx, indent: 540, italics: true }); break;
          case 'hr': children.push(new D.Paragraph({ border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: '999999', space: 1 } }, children: [] })); break;
          default: break;                                                    // space, html…
        }
      }
    };
    if (spec.title) children.push(new D.Paragraph({ heading: D.HeadingLevel.TITLE, bidirectional: isArabic(spec.title), children: [new D.TextRun({ text: spec.title, font: FONT, rightToLeft: isArabic(spec.title) })] }));
    block(tokens, {});
    if (!children.length) children.push(new D.Paragraph({ children: [new D.TextRun('')] }));

    const level = (l, bullet, fmt) => ({ level: l, format: fmt, text: bullet, alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 720 * (l + 1), hanging: 360 } } } });
    const doc = new D.Document({
      creator: 'ElectroRed AI', title: spec.title || spec.name,
      styles: { default: { document: { run: { font: FONT, size: 22 } } } },
      numbering: { config: [
        { reference: 'bul', levels: [0, 1, 2].map(l => level(l, ['•', '◦', '▪'][l], D.LevelFormat.BULLET)) },
        { reference: 'num', levels: [0, 1, 2].map(l => level(l, '%' + (l + 1) + '.', D.LevelFormat.DECIMAL)) }
      ] },
      sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }]
    });
    return D.Packer.toBlob(doc);
  }

  // ---------------------------------------------------------------- PPTX
  async function buildPptx(spec) {
    await loadScript(CDN.pptx);
    const P = new window.PptxGenJS();
    P.layout = 'LAYOUT_WIDE'; P.title = spec.title || spec.name; P.author = 'ElectroRed AI';
    const chunks = String(spec.content).split(/\n[ \t]*-{3,}[ \t]*\n/).map(s => s.trim()).filter(Boolean);
    if (!chunks.length) throw new Error('No slides in the content');
    for (const md of chunks) {
      const { text, math } = shieldMath(md);
      const unmath = s => decode(s).replace(/@@M(\d+)@@/g, (_, i) => latexToText(math[+i].tex));
      const toks = marked.lexer(text);
      const inline = tk => { const out = []; const walk = (arr, st) => { for (const t of arr || []) { if (t.type === 'strong') walk(t.tokens, { ...st, bold: true }); else if (t.type === 'em') walk(t.tokens, { ...st, italic: true }); else if (t.type === 'codespan') out.push({ text: unmath(t.text), o: { ...st, fontFace: 'Consolas' } }); else if (t.tokens) walk(t.tokens, st); else if (t.type === 'br') out.push({ text: ' ', o: st }); else if (t.text) out.push({ text: unmath(t.text), o: st }); } }; walk(tk, {}); return out; };
      let title = ''; const items = []; let table = null; let code = null;
      const collect = (arr, level) => {
        for (const t of arr) {
          if (t.type === 'heading') { if (!title) title = unmath(plainTok(t)); else items.push({ runs: inline(t.tokens).map(r => ({ ...r, o: { ...r.o, bold: true } })), level: 0, bullet: false }); }
          else if (t.type === 'paragraph' || t.type === 'text') items.push({ runs: inline(t.tokens || [{ type: 'text', text: t.text }]), level, bullet: level > 0 });
          else if (t.type === 'list') t.items.forEach(it => { const f = (it.tokens || []).find(x => x.type === 'text' || x.type === 'paragraph'); if (f) items.push({ runs: inline(f.tokens || [{ type: 'text', text: f.text }]), level, bullet: true }); collect((it.tokens || []).filter(x => x.type === 'list'), level + 1); });
          else if (t.type === 'table' && !table) table = t;
          else if (t.type === 'code' && !code) code = decode(t.text);
        }
      };
      const plainTok = t => (t.tokens || []).map(x => x.tokens ? plainTok(x) : (x.text || '')).join('') || t.text || '';
      collect(toks, 0);
      const ar = isArabic(md);
      const slide = P.addSlide(); slide.background = { color: 'FFFFFF' };
      slide.addShape(P.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.14, fill: { color: 'C87F3B' }, line: { color: 'C87F3B' } });
      if (title) slide.addText(title, { x: 0.6, y: 0.35, w: 12.1, h: 0.95, fontSize: 30, bold: true, color: '10231C', fontFace: FONT, rtlMode: ar, align: ar ? 'right' : 'left', valign: 'middle', fit: 'shrink' });
      const chars = items.reduce((n, it) => n + it.runs.reduce((m, r) => m + r.text.length, 0), 0);
      const size = chars > 700 ? 15 : chars > 350 ? 18 : 22;
      const bodyTop = title ? 1.5 : 0.7;
      const textH = table ? Math.min(2.4, 0.5 + items.length * 0.5) : (code ? 2.6 : 5.4);
      if (items.length) {
        const arr = [];
        items.forEach(it => it.runs.forEach((r, i) => {
          const o = { fontSize: size, fontFace: r.o.fontFace || FONT, bold: r.o.bold, italic: r.o.italic, color: '222222', rtlMode: ar, align: ar ? 'right' : 'left', breakLine: i === it.runs.length - 1 };
          if (i === 0 && it.bullet) { o.bullet = true; o.indentLevel = Math.min(3, it.level); }
          arr.push({ text: r.text, options: o });
        }));
        slide.addText(arr, { x: 0.7, y: bodyTop, w: 11.9, h: textH, valign: 'top', fit: 'shrink', paraSpaceAfter: 6 });
      }
      let y = bodyTop + (items.length ? textH + 0.15 : 0);
      if (table) {
        const cellOpts = (header, c) => ({ bold: header, color: '10231C', fill: header ? { color: 'F2E6D5' } : undefined, fontSize: 14, fontFace: FONT, rtlMode: isArabic(c), valign: 'middle' });
        const row = (cells, header) => cells.map(c => { const t = unmath(plainTok(c) || c.text || ''); return { text: t, options: cellOpts(header, t) }; });
        slide.addTable([row(table.header, true), ...table.rows.map(r => row(r, false))], { x: 0.7, y, w: 11.9, border: { type: 'solid', color: 'BBBBBB', pt: 1 }, autoPage: false });
        y += 0.6 + 0.45 * (table.rows.length + 1);
      }
      if (code) slide.addText(code, { x: 0.7, y: Math.min(y, 5), w: 11.9, h: Math.max(1.2, 7.1 - Math.min(y, 5)), fontFace: 'Consolas', fontSize: 13, color: '222222', fill: { color: 'F3F3F3' }, valign: 'top', fit: 'shrink', rtlMode: false });
    }
    return P.write({ outputType: 'blob' });
  }

  // ---------------------------------------------------------------- PDF (the browser's print engine)
  function buildPrintHtml(spec) {
    const { text, math } = shieldMath(spec.content);
    let html = marked.parse(text, { breaks: true });
    html = html.replace(/@@M(\d+)@@/g, (_, i) => {
      const m = math[+i];
      try { return window.katex ? katex.renderToString(m.tex.trim(), { displayMode: m.display, throwOnError: false }) : esc(m.tex); }
      catch (e) { return esc(m.tex); }
    });
    const ar = isArabic(spec.content);
    const title = (spec.name || 'electrored').replace(/\.[A-Za-z0-9]{1,5}$/, '');
    return '<!doctype html><html lang="' + (ar ? 'ar' : 'en') + '" dir="' + (ar ? 'rtl' : 'ltr') + '"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      '<link rel="stylesheet" href="' + CDN.katexCss + '"><style>@page{size:A4;margin:16mm}' +
      'body{font-family:"IBM Plex Sans Arabic","Segoe UI",Tahoma,Arial,sans-serif;color:#111;line-height:1.75;font-size:12pt}' +
      'h1,h2,h3{color:#10231C;line-height:1.3;margin:1.1em 0 .4em}h1{font-size:22pt;border-bottom:2px solid #C87F3B;padding-bottom:.2em}h2{font-size:17pt}h3{font-size:14pt}' +
      'table{border-collapse:collapse;width:100%;margin:.8em 0}th,td{border:1px solid #bbb;padding:6px 10px;text-align:start}th{background:#f2e6d5}' +
      'pre{direction:ltr;text-align:left;background:#f3f3f3;border:1px solid #ddd;border-radius:6px;padding:10px 12px;white-space:pre-wrap;word-break:break-word;font-size:10.5pt}' +
      'code{font-family:Consolas,"Courier New",monospace}p code,li code{background:#f3f3f3;padding:1px 5px;border-radius:4px}' +
      '.katex{direction:ltr;unicode-bidi:isolate}.katex-display{overflow:visible;margin:.8em 0}blockquote{border-inline-start:4px solid #C87F3B;margin:.8em 0;padding:.1em 1em;color:#444}img{max-width:100%}' +
      '</style></head><body>' + html + '</body></html>';
  }
  // Separate function so it can be replaced in tests. Opens the print dialog on a hidden frame.
  function printHtml(html) {
    return new Promise(resolve => {
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none';
      f.srcdoc = html;
      f.onload = () => {
        setTimeout(() => {                                   // give the equation fonts a moment to load
          try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { console.error(e); }
          setTimeout(() => { f.remove(); resolve(); }, 60000);
        }, 900);
      };
      document.body.appendChild(f);
    });
  }

  // ---------------------------------------------------------------- public API
  async function buildBlob(spec) {
    switch (spec.type) {
      case 'docx': return buildDocx(spec);
      case 'pptx': return buildPptx(spec);
      case 'xlsx': return buildXlsx(spec);
      case 'csv': return buildCsv(spec);
      default: return new Blob([spec.content + (spec.content.endsWith('\n') ? '' : '\n')], { type: MIME.code });
    }
  }
  async function download(spec) {
    if (spec.type === 'pdf') { await api.printHtml(buildPrintHtml(spec)); return null; }
    const blob = await buildBlob(spec);
    save(blob, spec.name);
    return blob;
  }
  const LANG_EXT = { python: 'py', py: 'py', matlab: 'm', octave: 'm', c: 'c', cpp: 'cpp', 'c++': 'cpp', arduino: 'ino', ino: 'ino', vhdl: 'vhd', verilog: 'v', systemverilog: 'sv', spice: 'cir', ngspice: 'cir', netlist: 'cir', asm: 'asm', assembly: 'asm', nasm: 'asm', bash: 'sh', sh: 'sh', shell: 'sh', json: 'json', javascript: 'js', js: 'js', typescript: 'ts', html: 'html', css: 'css', latex: 'tex', tex: 'tex', csv: 'csv', xml: 'xml', yaml: 'yml', yml: 'yml', java: 'java', markdown: 'md', md: 'md' };
  const extForLang = lang => LANG_EXT[String(lang || '').toLowerCase()] || 'txt';
  const hasTable = md => /^\s*\|.*\|\s*$/m.test(md) && /^\s*\|?\s*:?-{2,}/m.test(md);
  const titleOf = md => { const h = String(md).match(/^#{1,3}\s+(.+)$/m); const t = h ? h[1] : String(md).replace(/[#*`$|>\-]/g, ' ').trim().split(/\s+/).slice(0, 6).join(' '); return stripMd(t).slice(0, 60) || 'electrored-answer'; };

  const api = {
    parseBlock, buildBlob, buildPrintHtml, printHtml, download, save, extForLang, hasTable, titleOf, latexToText, parseMdTables, isArabic,
    // the whole reply as a document
    exportReply(type, text) {
      const t = titleOf(text);
      const name = t.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'electrored-answer';
      const spec = { type, name: safeName(name, type === 'md' ? 'code' : type) , title: '', content: text };
      if (type === 'md') spec.name = (name || 'electrored-answer') + '.md';
      return download(spec.type === 'md' ? { ...spec, type: 'code' } : spec);
    }
  };
  window.ERFiles = api;
})();
