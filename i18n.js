// i18n.js – nyelvválasztás. Minden szöveg a lang.json fájlból töltődik be: { key, hu, en, ... } sorok (adatbázisba is importálható).
// A "hu" oszlop a forrásszöveg: az oldalakon ez az alapértelmezett, a többi nyelv ennek a fordítása.
// Új nyelv: add hozzá a "languages" listához, és vegyél fel egy új oszlopot a "strings" sorokba.
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
let DB = { languages: [{ id: 'hu', label: 'Magyar', flag: '🇭🇺' }], strings: [] };
let byHu = new Map(), pats = [], cur = 'hu';
const origT = new WeakMap(), origA = new WeakMap(), hooks = [];
const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const skip = el => !el || !el.closest || !!el.closest('script,style,textarea,[data-notr]');
const skipAttr = el => !el || !el.closest || !!el.closest('script,style,[data-notr]');   // a textarea placeholderét is fordítjuk

export const lang = () => cur;
export const onLang = f => hooks.push(f);
export function getLang() {
    let s = new URLSearchParams(location.search).get('lang') || '';
    try { s = s || localStorage.getItem('lang') || ''; } catch { }
    s = s || (navigator.language || 'hu').slice(0, 2);
    return DB.languages.some(l => l.id === s) ? s : 'hu';
}
function build() {
    byHu = new Map(); pats = [];
    for (const e of DB.strings || []) {
        if (!e || typeof e.hu !== 'string') continue;
        byHu.set(e.hu, e);
        if (/\{\w+\}/.test(e.hu)) {                                   // változós minta, pl. "Még több ({x}) ▾"
            const parts = e.hu.split(/\{\w+\}/), names = [...e.hu.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
            if (parts.join('').trim().length >= 3) pats.push({ e, names, len: parts.join('').length, re: new RegExp('^' + parts.map(esc).join('(.+?)') + '$', 's') });
        }
    }
    pats.sort((a, b) => b.len - a.len);
}
function xl(s) {                                                      // magyar forrásszöveg -> aktuális nyelv (null: nincs ilyen szöveg a fájlban)
    const e = byHu.get(s);
    if (e) return e[cur] ?? e.hu;
    for (const p of pats) {
        const m = s.match(p.re);
        if (m) return (p.e[cur] ?? p.e.hu).replace(/\{(\w+)\}/g, (_, k) => { const i = p.names.indexOf(k); return i < 0 ? '{' + k + '}' : m[i + 1]; });
    }
    return null;
}
export function t(s, vars) {                                          // kódból hívható fordítás (alert, prompt, összeállított szövegek)
    const r = xl(s) ?? s;
    return vars ? r.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '{' + k + '}') : r;
}
function node(n, force) {
    const raw = n.nodeValue, core = raw.trim(); if (!core) return;
    const o = origT.get(n);
    if (o !== undefined) {
        const v = xl(o);
        if (core === v) return;                                       // már az aktuális nyelven van
        if (force && v != null) { n.nodeValue = raw.replace(core, () => v); return; }
    }
    const v = xl(core);
    if (v == null) { origT.delete(n); return; }                       // ismeretlen szöveg (felhasználói tartalom, már lefordított szöveg)
    origT.set(n, core);
    if (v !== core) n.nodeValue = raw.replace(core, () => v);
}
function attr(el, a, force) {
    const raw = el.getAttribute(a); if (!raw) return;
    const m = origA.get(el) || {}, o = m[a];
    if (o !== undefined) {
        const v = xl(o);
        if (raw === v) return;
        if (force && v != null) { el.setAttribute(a, v); return; }
    }
    const v = xl(raw.trim());
    if (v == null) { delete m[a]; return; }
    m[a] = raw.trim(); origA.set(el, m);
    if (v !== raw) el.setAttribute(a, v);
}
function walk(root, force) {
    if (root.nodeType === 3) { if (!skip(root.parentNode)) node(root, force); return; }
    if (root.nodeType !== 1) return;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) if (!skip(n.parentNode)) node(n, force);
    for (const el of [root, ...root.querySelectorAll('*')]) for (const a of ATTRS) if (el.hasAttribute(a) && !skipAttr(el)) attr(el, a, force);
}
const mo = new MutationObserver(ms => {
    for (const m of ms) {
        if (m.type === 'childList') m.addedNodes.forEach(n => walk(n, false));
        else if (m.type === 'characterData') { if (!skip(m.target.parentNode)) node(m.target, false); }
        else if (!skipAttr(m.target)) attr(m.target, m.attributeName, false);
    }
});
export function setLang(id) {
    if (!DB.languages.some(l => l.id === id)) return;
    cur = id; try { localStorage.setItem('lang', id); } catch { }
    document.documentElement.lang = id;
    walk(document.documentElement, true);
    hooks.forEach(f => { try { f(); } catch (e) { console.error(e); } });
    const s = document.getElementById('lang'); if (s) s.value = id;
}
export async function loadLang(file = 'lang.json') {                  // csak betölt (pl. a kártyához); hiányzó fájlnál magyarul marad
    try { const r = await fetch(file, { cache: 'no-cache' }); if (r.ok) DB = await r.json(); } catch { }
    build(); cur = getLang();
}
export async function initI18n() {                                    // teljes oldal fordítása, nyelvválasztó, élő figyelés
    await loadLang();
    const s = document.getElementById('lang');
    if (s) {
        s.length = 0; DB.languages.forEach(l => s.add(new Option(`${l.flag || ''} ${l.label}`.trim(), l.id)));
        s.value = cur; s.addEventListener('change', e => setLang(e.target.value));
    }
    document.documentElement.lang = cur;
    walk(document.documentElement, true);
    mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
