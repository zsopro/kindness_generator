// qr-render.js – QR-kód megjelenítők: standard, A) logó a közepén, B) kép a mintázatban (félárnyalatos), automatikus olvashatósági ellenőrzés.
import { qrMatrix } from './qr.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hexOk = v => /^#[0-9a-f]{6}$/i.test(v || '') ? v : null;
const f = x => Math.round(x * 100) / 100;

/** Kép betöltése fájlból (File) vagy https címről; legfeljebb maxPx oldalra kicsinyítve vászonként adja vissza.
 *  Idegen eredetű kép csak akkor használható, ha a kiszolgáló engedi (CORS), különben hibát dob. */
export async function loadImageCanvas(src, maxPx = 1024) {
    const url = typeof src === 'string' ? src : URL.createObjectURL(src), img = new Image();
    if (typeof src === 'string') img.crossOrigin = 'anonymous';
    try {
        await new Promise((ok, no) => { img.onload = ok; img.onerror = () => no(new Error('image')); img.src = url; });
        const w0 = img.naturalWidth || 300, h0 = img.naturalHeight || 300, k = Math.min(1, maxPx / Math.max(w0, h0));
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
        const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
        g.getImageData(0, 0, 1, 1);                                        // szennyezett (CORS nélküli) vászonnál hibát dob
        return c;
    } finally { if (typeof src !== 'string') URL.revokeObjectURL(url); }
}

function rr(g, x, y, w, h, r) {                                            // lekerekített téglalap útvonala
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** Egy QR-kód megrajzolása. o: { text, mode: 'standard'|'logo'|'image', level, fg, bg, margin, px, shape,
 *  logo, logoRatio, padShape, photo, strength, dot, color }. Visszaadja: { canvas, svg, version, size, level }. */
export function renderQR(o) {
    const mode = o.mode || 'standard', level = mode === 'standard' ? (o.level || 'M') : 'H';
    const fg = hexOk(o.fg) || '#000000', bg = hexOk(o.bg) || '#ffffff', shape = o.shape || 'square';
    const q = qrMatrix(o.text, level), n = q.size, m = o.margin ?? 4, tot = n + 2 * m, px = o.px || 640, cell = px / tot, X = c => (c + m) * cell;
    const cv = document.createElement('canvas'); cv.width = cv.height = px;
    const g = cv.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, px, px);
    const sv = [`<rect width="${px}" height="${px}" fill="${bg}"/>`]; let svgOk = true;

    if (mode === 'image' && o.photo) {
        // --- B) a kép a kód mögött, kivilágosítva; a modulok középső pontja hordozza az adatot, a keresőminták tömör modulok
        const qrw = Math.round(n * cell), off = m * cell, strength = clamp(o.strength ?? 0.3, 0.1, 0.7), hi = 0.97, lo = hi - strength, ph = o.photo;
        const u = document.createElement('canvas'); u.width = u.height = qrw; const ug = u.getContext('2d');
        ug.fillStyle = '#fff'; ug.fillRect(0, 0, qrw, qrw);
        const s = Math.max(qrw / ph.width, qrw / ph.height), dw = ph.width * s, dh = ph.height * s; ug.drawImage(ph, (qrw - dw) / 2, (qrw - dh) / 2, dw, dh);
        const id = ug.getImageData(0, 0, qrw, qrw), d = id.data, hist = new Uint32Array(256);
        for (let i = 0; i < d.length; i += 4) hist[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
        let acc = 0, p2 = 0, p98 = 255; const tot2 = qrw * qrw;
        for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc < tot2 * 0.02) p2 = v; if (acc <= tot2 * 0.98) p98 = v; }
        const span = Math.max(40, p98 - p2), lev = x => clamp((x - p2) / span, 0, 1);       // automatikus szintek: a kép részletei teljes skálán, majd a halvány tartományba szorítva
        for (let i = 0; i < d.length; i += 4) {
            if (o.color) for (let k = 0; k < 3; k++) d[i + k] = 255 * (lo + (hi - lo) * lev(d[i + k]));
            else { const v = 255 * (lo + (hi - lo) * lev(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])); d[i] = d[i + 1] = d[i + 2] = v; }
            d[i + 3] = 255;
        }
        ug.putImageData(id, 0, 0); g.drawImage(u, off, off);
        sv.push(`<image href="${u.toDataURL('image/png')}" x="${f(off)}" y="${f(off)}" width="${qrw}" height="${qrw}"/>`);
        const dot = clamp(o.dot ?? 0.62, 0.3, 0.8), sd = cell * dot, gf = [], gb = [], lit = [], U = id.data;
        const local = (r, c, k) => { const px0 = clamp(Math.round((c + .5) * cell), 0, qrw - 1), py0 = clamp(Math.round((r + .5) * cell), 0, qrw - 1); return U[(py0 * qrw + px0) * 4 + k]; };
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
            const x = X(c), y = X(r), dark = q.dark(r, c);
            if (q.isFn(r, c)) { g.fillStyle = dark ? fg : bg; g.fillRect(x - .25, y - .25, cell + .5, cell + .5); (dark ? gf : gb).push(`<rect x="${f(x)}" y="${f(y)}" width="${f(cell)}" height="${f(cell)}"/>`); continue; }
            let col = fg;
            if (!dark) { const k = 0.82, rgb = [0, 1, 2].map(i => Math.round(local(r, c, i) + (255 - local(r, c, i)) * k)); col = `rgb(${rgb})`; }
            g.fillStyle = col; const dx = x + (cell - sd) / 2, dy = y + (cell - sd) / 2; g.fillRect(dx, dy, sd, sd);
            (dark ? gf : lit).push(dark ? `<rect x="${f(dx)}" y="${f(dy)}" width="${f(sd)}" height="${f(sd)}"/>` : `<rect x="${f(dx)}" y="${f(dy)}" width="${f(sd)}" height="${f(sd)}" fill="${col}"/>`);
        }
        sv.push(`<g fill="${bg}">${gb.join('')}</g>${lit.join('')}<g fill="${fg}">${gf.join('')}</g>`);
    } else {
        // --- standard és A) logó: a modulok rajza (a logó alatti modulok kimaradnak)
        let skip = null, pad = 0, ls = 0;
        const withLogo = mode === 'logo' && o.logo;
        if (withLogo) {
            const ratio = clamp(o.logoRatio ?? 0.22, 0.06, 0.34), mid = px / 2;
            ls = ratio * n * cell; pad = ls * 1.22; const half = pad / 2, round = (o.padShape || 'round') === 'round';
            skip = (cx, cy) => round ? Math.hypot(cx - mid, cy - mid) < half + cell * .3 : (Math.abs(cx - mid) < half + cell * .3 && Math.abs(cy - mid) < half + cell * .3);
        }
        const p2 = new Path2D(), sq = [];
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
            if (!q.dark(r, c)) continue;
            const x = X(c), y = X(r), sh = q.isFn(r, c) ? 'square' : shape;
            if (skip && skip(x + cell / 2, y + cell / 2)) continue;
            if (sh === 'square') { p2.rect(x - .25, y - .25, cell + .5, cell + .5); sq.push(`M${f(x)} ${f(y)}h${f(cell)}v${f(cell)}h-${f(cell)}z`); }
            else if (sh === 'round') { const pp = new Path2D(); const gg = { moveTo: (a, b) => pp.moveTo(a, b), arcTo: (...a) => pp.arcTo(...a), closePath: () => pp.closePath() }; rr(gg, x, y, cell, cell, cell * .35); p2.addPath(pp); sq.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(cell)}" height="${f(cell)}" rx="${f(cell * .35)}"/>`); }
            else { p2.moveTo(x + cell / 2 + cell * .46, y + cell / 2); p2.arc(x + cell / 2, y + cell / 2, cell * .46, 0, Math.PI * 2); sq.push(`<circle cx="${f(x + cell / 2)}" cy="${f(y + cell / 2)}" r="${f(cell * .46)}"/>`); }
        }
        g.fillStyle = fg; g.fill(p2);
        const paths = sq.filter(s => s[0] === 'M'), shapes = sq.filter(s => s[0] === '<');
        if (paths.length) sv.push(`<path fill="${fg}" shape-rendering="crispEdges" d="${paths.join('')}"/>`);
        if (shapes.length) sv.push(`<g fill="${fg}">${shapes.join('')}</g>`);
        if (withLogo) {
            const mid = px / 2, half = pad / 2, round = (o.padShape || 'round') === 'round', lg = o.logo, padCol = hexOk(o.padColor) || bg;
            g.fillStyle = padCol; g.beginPath();
            if (round) { g.arc(mid, mid, half, 0, Math.PI * 2); sv.push(`<circle cx="${f(mid)}" cy="${f(mid)}" r="${f(half)}" fill="${padCol}"/>`); }
            else { rr(g, mid - half, mid - half, pad, pad, pad * .18); sv.push(`<rect x="${f(mid - half)}" y="${f(mid - half)}" width="${f(pad)}" height="${f(pad)}" rx="${f(pad * .18)}" fill="${padCol}"/>`); }
            g.fill();
            const k = Math.min(ls / lg.width, ls / lg.height), dw = lg.width * k, dh = lg.height * k;
            g.drawImage(lg, mid - dw / 2, mid - dh / 2, dw, dh);
            try { sv.push(`<image href="${lg.toDataURL('image/png')}" x="${f(mid - dw / 2)}" y="${f(mid - dh / 2)}" width="${f(dw)}" height="${f(dh)}"/>`); } catch { svgOk = false; }
        }
    }
    const svg = svgOk ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${px} ${px}" width="${px}" height="${px}">${sv.join('')}</svg>` : null;
    return { canvas: cv, svg, version: q.version, size: n, level };
}

let jsqrP = null;
const loadJsQR = () => window.jsQR ? Promise.resolve(true) : (jsqrP ||= new Promise(res => {
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
    s.onload = () => res(!!window.jsQR); s.onerror = () => res(false); document.head.append(s);
}));

/** Olvashatóság ellenőrzése: 'ok' | 'fail' | 'unknown' (ha a böngészőben nincs dekódoló). A beépített BarcodeDetectort használja, ennek hiányában jsQR-t. */
export async function verifyDecode(canvas, expected) {
    try {
        if ('BarcodeDetector' in window) {
            const sup = window.BarcodeDetector.getSupportedFormats ? await window.BarcodeDetector.getSupportedFormats() : ['qr_code'];
            if (sup.includes('qr_code')) { const r = await new window.BarcodeDetector({ formats: ['qr_code'] }).detect(canvas); return r.some(x => x.rawValue === expected) ? 'ok' : 'fail'; }
        }
    } catch { /* tartalék ellenőrző */ }
    if (await loadJsQR()) {
        try { const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height), r = window.jsQR(d.data, d.width, d.height, { inversionAttempts: 'dontInvert' }); return r && r.data === expected ? 'ok' : 'fail'; }
        catch { return 'unknown'; }
    }
    return 'unknown';
}

/** Megrajzolja és ellenőrzi; ha nem olvasható, lépésenként finomít (kisebb logó / halványabb kép, nagyobb pontok). */
export async function buildQR(o) {
    const cur = { ...o }; let res, v = 'unknown';
    for (let i = 0; i < 8; i++) {
        res = renderQR(cur); v = await verifyDecode(res.canvas, o.text);
        if (v !== 'fail') break;
        if (cur.mode === 'logo') cur.logoRatio = Math.max(0.06, (cur.logoRatio ?? 0.22) - 0.03);
        else if (cur.mode === 'image') { cur.strength = Math.max(0.1, (cur.strength ?? 0.3) - 0.05); cur.dot = Math.min(0.78, (cur.dot ?? 0.62) + 0.03); }
        else break;
    }
    return { ...res, status: v, used: cur, adjusted: cur.logoRatio !== o.logoRatio || cur.strength !== o.strength };
}
