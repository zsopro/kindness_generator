// studio.js – a Canva-szerű alkalmazáshéj nézetei: Kezdőlap, Projektek, Sablonok, Arculat, Nyomda, Dream Lab, Egyéb.
// A szerkesztő (admin.html) a saját API-ját adja át az initStudio()-nak; a nézetek ezen keresztül töltenek be sablont, projektet.
import { t, lang, onLang } from './i18n.js';
import { limitFor, isLocked } from './settings.js';
import { URLHandler as U } from './url-handler.js';

const $ = id => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const ls = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } } };
const fmt = ts => new Date(ts).toLocaleString(lang() === 'hu' ? 'hu-HU' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const TITLES = { home: 'Kezdőlap', projects: 'Projektek', templates: 'Sablonok', brand: 'Arculat', print: 'Nyomda', dream: 'Dream Lab', editor: 'Szerkesztő' };
const R = {};
let A, projects = [], folders = [], brand = {}, curId = null, view = 'home';
const persist = () => { ls.set('neo_projects', projects); ls.set('neo_folders', folders); ls.set('neo_brand', brand); };

/* ---------- közös elemek ---------- */
function thumb(params, name, extra = '') {
    const b = el('button', 'thumb ' + extra); b.type = 'button'; b.title = name;
    const f = el('iframe'); f.loading = 'lazy'; f.tabIndex = -1; f.title = name;
    const q = A.toQuery(A.flatten(params)); q.set('thumb', '1'); f.src = 'index.html?' + q;
    const n = el('b'); n.textContent = name; n.dataset.notr = ''; b.append(f, n);
    return b;
}
function tplCard(tp) {
    const paid = A.paidIn(tp), b = thumb(tp.params, tp.name, paid ? 'paid' : '');
    if (paid) b.append(el('span', 'lock', '🔒'));
    b.onclick = () => useTemplate(tp);
    return b;
}
function useTemplate(tp) { A.loadParams(tp.params); curId = null; $('pname').value = tp.name; show('editor'); }
function newCard() { A.loadParams(''); curId = null; $('pname').value = t('Névtelen kártya'); show('editor'); A.openTab('text'); }
const catText = tp => { const c = A.cats.find(x => x.id === tp.categoryId), s = c && (c.items || []).find(x => x.id === tp.subId); return Object.values((c && c.label) || {}).concat(Object.values((s && s.label) || {})).join(' '); };
const pbtn = (ico, title, fn) => { const b = el('button', '', ico); b.type = 'button'; b.title = title; b.onclick = fn; return b; };
const limMsg = () => { A.flash(t('Elérted a csomag korlátját, nem adható hozzá több.')); openPlans(); };

/* ---------- útválasztó ---------- */
export function show(v, arg) {
    view = v;
    document.querySelectorAll('.view').forEach(x => x.classList.toggle('on', x.id === 'view-' + v));
    document.querySelectorAll('#nav [data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === v || (v === 'editor' && b.dataset.v === 'create')));
    $('ttitle').textContent = TITLES[v];
    document.body.dataset.view = v;
    closePops();
    if (R[v]) R[v](arg);
    try { history.replaceState(null, '', '#/' + v); } catch { }
    if (v === 'editor') setTimeout(() => A.update(), 60);          // az újra látható előnézetek frissítése
}

/* ---------- Kezdőlap ---------- */
R.home = () => {
    $('view-home').innerHTML = `
        <div class="hero"><h1 class="grad">Ma mit fogsz tervezni?</h1>
            <div class="searchbox glass"><span>🔍</span><input id="hs" placeholder="Bármire rákereshetsz" autocomplete="off"></div>
            <div class="pills" id="hpills"></div></div>
        <div class="sect" id="hres" hidden></div>
        <div class="sect" id="hmain">
            <div class="sh"><h2 class="s">Tervezz tovább</h2><button type="button" class="lnk" data-go="projects">Összes megtekintése</button></div><div class="hscroll" id="hrecent"></div>
            <h2 class="s">Sablonkategóriák böngészése</h2><div class="tiles" id="hcats"></div>
            <div class="sh"><h2 class="s">Népszerű sablonok</h2><button type="button" class="lnk" data-go="templates">Összes megtekintése</button></div><div class="hscroll" id="hpop"></div>
            <h2 class="s">Kiemelt lehetőségek</h2><div class="feat" id="hfeat"></div>
        </div>`;
    const pills = [['➕', 'Üres kártya', newCard], ['🎨', 'Sablonok', () => show('templates')], ['🪪', 'Névjegy', () => show('templates', { cat: 'nevjegy' })], ['🎉', 'Ünnepek', () => show('templates', { cat: 'unnepek' })], ['✨', 'AI tervező', () => show('dream')], ['🖨️', 'Nyomda', () => show('print')], ['🏷️', 'Arculat', () => show('brand')]];
    for (const [i, l, f] of pills) { const b = el('button', 'pill', `<i>${i}</i><span>${l}</span>`); b.type = 'button'; b.onclick = f; $('hpills').append(b); }
    $('view-home').querySelectorAll('[data-go]').forEach(b => { b.onclick = () => show(b.dataset.go); });
    const rec = projects.filter(p => !p.trashed).sort((a, b) => b.updated - a.updated).slice(0, 8);
    if (rec.length) rec.forEach(p => $('hrecent').append(projCard(p))); else $('hrecent').append(el('p', 'empty', 'Még nincs mentett projekted. Hozz létre egy kártyát, és mentsd el!'));
    A.cats.forEach((c, ci) => (c.items || []).forEach((s, si) => {
        const b = el('button', 'tile t' + ((ci * 3 + si) % 6), `<i>${esc(s.icon || c.icon || '✨')}</i><span data-notr>${esc(A.lab(s))}</span>`); b.type = 'button';
        b.onclick = () => show('templates', { cat: c.id, sub: s.id }); $('hcats').append(b);
    }));
    A.tpls.slice(0, 8).forEach(tp => $('hpop').append(tplCard(tp)));
    const feats = [['t0', '✨ Ragyogó effektek minden alkalomra', () => { newCard(); A.openTab('media'); }], ['t1', '🏷️ A saját arculatod minden kártyán', () => show('brand')], ['t3', '📲 QR-kód és NFC-chip a kártyádhoz', () => show('print')]];
    for (const [c, l, f] of feats) { const b = el('button', 'fcard ' + c, l); b.type = 'button'; b.onclick = f; $('hfeat').append(b); }
    $('hs').oninput = e => {
        const q = norm(e.target.value).trim(); $('hres').hidden = !q; $('hmain').hidden = !!q; if (!q) return;
        const tp = A.tpls.filter(x => norm(x.name + ' ' + catText(x)).includes(q)), pr = projects.filter(p => !p.trashed && norm(p.name).includes(q)), box = $('hres');
        box.innerHTML = '';
        if (tp.length) { box.append(el('h2', 's', 'Sablonok')); const w = el('div', 'wrap'); tp.forEach(x => w.append(tplCard(x))); box.append(w); }
        if (pr.length) { box.append(el('h2', 's', 'Projektek')); const w = el('div', 'wrap'); pr.forEach(x => w.append(projCard(x))); box.append(w); }
        if (!tp.length && !pr.length) box.append(el('p', 'empty', 'Nincs találat.'));
    };
};

/* ---------- Sablonok ---------- */
let tf = { cat: '', sub: '', q: '' };
R.templates = arg => {
    if (arg) tf = { cat: arg.cat || '', sub: arg.sub || '', q: '' };
    const v = $('view-templates');
    v.innerHTML = `<div class="hero"><h1 class="grad">Sablonok</h1>
        <div class="searchbox glass"><span>🔍</span><input id="tq" placeholder="Keresés a sablonok között" autocomplete="off" value="${esc(tf.q)}"></div><div class="pills" id="tchips"></div></div>
        <div class="sect"><h2 class="s">Sablonkategóriák böngészése</h2><div class="tiles" id="tcats"></div>
        <h2 class="s" id="tcount"></h2><div class="wrap" id="tgrid"></div></div>`;
    const chip = (id, label, on, fn) => { const b = el('button', 'chip' + (on ? ' on' : ''), label); b.type = 'button'; b.onclick = fn; return b; };
    $('tchips').append(chip('', 'Mind', !tf.cat, () => { tf.cat = tf.sub = ''; R.templates(); }));
    A.cats.forEach(c => $('tchips').append(chip(c.id, esc(A.icoLab(c)), tf.cat === c.id, () => { tf.cat = c.id; tf.sub = ''; R.templates(); })));
    A.cats.filter(c => !tf.cat || c.id === tf.cat).forEach((c, ci) => (c.items || []).forEach((s, si) => {
        const b = el('button', 'tile t' + ((ci * 3 + si) % 6) + (tf.sub === s.id ? ' on' : ''), `<i>${esc(s.icon || c.icon || '✨')}</i><span data-notr>${esc(A.lab(s))}</span>`); b.type = 'button';
        b.onclick = () => { tf.cat = c.id; tf.sub = tf.sub === s.id ? '' : s.id; R.templates(); }; $('tcats').append(b);
    }));
    const q = norm(tf.q), list = A.tpls.filter(x => (!tf.cat || x.categoryId === tf.cat) && (!tf.sub || x.subId === tf.sub) && (!q || norm(x.name + ' ' + catText(x)).includes(q)));
    $('tcount').textContent = t('Összes sablon: {x}', { x: list.length });
    list.forEach(x => $('tgrid').append(tplCard(x)));
    if (!list.length) $('tgrid').append(el('p', 'empty', 'Nincs találat.'));
    $('tq').oninput = e => { tf.q = e.target.value; const pos = e.target.selectionStart; R.templates(); const n = $('tq'); n.focus(); n.setSelectionRange(pos, pos); };
};

/* ---------- Projektek ---------- */
let pf = { tab: 'all', q: '', sort: 'new' };
function projCard(p) {
    const c = el('div', 'pcard'), th = thumb(p.params, p.name);
    th.onclick = () => { if (!p.trashed) openProject(p); };
    const nm = el('div', 'nm'); nm.textContent = p.name; nm.dataset.notr = '';
    c.append(th, nm, el('div', 'dt', t('Módosítva: {x}', { x: fmt(p.updated) })));
    const act = el('div', 'pact');
    if (p.trashed) act.append(pbtn('♻️', 'Visszaállítás', () => { p.trashed = false; persist(); R.projects(); }), pbtn('❌', 'Végleges törlés', () => { projects = projects.filter(x => x !== p); persist(); R.projects(); }));
    else {
        const mv = el('select'); mv.title = t('Mappába'); mv.add(new Option(t('Nincs mappa'), ''));
        folders.forEach(f => mv.add(new Option('📁 ' + f.name, f.id))); mv.value = p.folder || '';
        mv.onchange = () => { p.folder = mv.value; persist(); if (view === 'projects') R.projects(); };
        act.append(pbtn('📄', 'Másolás', () => { if (projects.filter(x => !x.trashed).length >= limitFor(A.S, A.plan, 'projects')) return limMsg(); const n = Date.now(); projects.push({ ...p, id: 'p' + n.toString(36), name: t('{x} (másolat)', { x: p.name }), created: n, updated: n }); persist(); if (view === 'projects') R.projects(); else R[view] && R[view](); }),
            pbtn('✏️', 'Átnevezés', () => { const nn = prompt(t('Új név:'), p.name); if (nn && nn.trim()) { p.name = nn.trim().slice(0, 60); persist(); R[view] && R[view](); } }), mv,
            pbtn('🗑', 'Törlés', () => { p.trashed = true; persist(); R[view] && R[view](); }));
    }
    c.append(act); return c;
}
function openProject(p) { A.loadParams(p.params); curId = p.id; $('pname').value = p.name; show('editor'); }
R.projects = () => {
    const v = $('view-projects'), titles = { all: 'Minden projekt', recent: 'Legutóbbiak', trash: 'Kuka' };
    v.innerHTML = `<div class="split"><nav class="subnav" id="psub"></nav><div>
        <div class="hero"><h1 class="grad" id="ptitle"></h1><div class="searchbox glass"><span>🔍</span><input id="pq" placeholder="Projektek keresése" value="${esc(pf.q)}" autocomplete="off"></div>
        <select id="psort"><option value="new">Módosítás dátuma (új elöl)</option><option value="old">Módosítás dátuma (régi elöl)</option><option value="name">Név (A–Z)</option></select></div>
        <div class="sect"><div class="wrap" id="pbody"></div></div></div></div>`;
    const nav = $('psub'), item = (id, label, raw) => { const b = el('button', pf.tab === id ? 'on' : '', raw ? esc(label) : label); b.type = 'button'; b.onclick = () => { pf.tab = id; R.projects(); }; nav.append(b); };
    item('all', '🗂 Minden projekt'); item('recent', '🕘 Legutóbbiak'); nav.append(el('hr'));
    folders.forEach(f => item(f.id, '📁 ' + f.name, true));
    const nf = el('button', '', '+ Új mappa'); nf.type = 'button';
    nf.onclick = () => { const n = prompt(t('Mappa neve:')); if (n && n.trim()) { folders.push({ id: 'f' + Date.now().toString(36), name: n.trim().slice(0, 40) }); persist(); R.projects(); } }; nav.append(nf, el('hr'));
    item('trash', '🗑 Kuka');
    const fo = folders.find(f => f.id === pf.tab); $('ptitle').textContent = fo ? fo.name : titles[pf.tab];
    $('psort').value = pf.sort;
    let list = projects.filter(p => pf.tab === 'trash' ? p.trashed : !p.trashed && (pf.tab === 'all' || pf.tab === 'recent' || p.folder === pf.tab));
    const q = norm(pf.q); if (q) list = list.filter(p => norm(p.name).includes(q));
    list.sort((a, b) => pf.sort === 'name' ? a.name.localeCompare(b.name) : pf.sort === 'old' ? a.updated - b.updated : b.updated - a.updated);
    if (pf.tab === 'recent') list = list.slice(0, 12);
    list.forEach(p => $('pbody').append(projCard(p)));
    if (!list.length) $('pbody').append(el('p', 'empty', pf.tab === 'trash' ? 'A kuka üres.' : 'Itt még nincs semmi.'));
    $('pq').oninput = e => { pf.q = e.target.value; const pos = e.target.selectionStart; R.projects(); const n = $('pq'); n.focus(); n.setSelectionRange(pos, pos); };
    $('psort').onchange = e => { pf.sort = e.target.value; R.projects(); };
};
function saveProject() {
    const name = ($('pname').value || '').trim().slice(0, 60) || t('Névtelen kártya'), params = A.collect(), now = Date.now();
    let p = projects.find(x => x.id === curId);
    if (!p) {
        if (projects.filter(x => !x.trashed).length >= limitFor(A.S, A.plan, 'projects')) { A.flash(t('Elérted a csomag korlátját, nem menthető több projekt.')); openPlans(); return; }
        p = { id: 'p' + now.toString(36), created: now, folder: '' }; projects.push(p); curId = p.id;
    }
    Object.assign(p, { name, params, updated: now, trashed: false }); persist(); A.flash(t('Projekt elmentve.'));
}

/* ---------- Arculat ---------- */
const BS = [['logos', '🏷️ Logók', 'img'], ['colors', '🎨 Színek', 'color'], ['fonts', '🔤 Betűtípus', 'font'], ['audio', '🎵 Arculati hang', 'audio'], ['photos', '🖼️ Fotók', 'img'], ['icons', '😀 Ikonok', 'emoji']];
let bt = 'logos';
const bcount = k => (brand[k] || []).length;
function badd(k, item) {
    const max = limitFor(A.S, A.plan, k);
    if (bcount(k) >= max) return limMsg();
    brand[k].push(item); persist(); R.brand(); renderStrips();
}
R.brand = () => {
    const v = $('view-brand'), cur = BS.find(b => b[0] === bt), free = limitFor(A.S, 'free', 'colors');
    v.innerHTML = `<div class="split"><nav class="subnav" id="bsub"></nav><div>
        <div class="hero"><h1 class="grad">Arculati csomag</h1></div>
        <div class="sect"><div class="banner"><div><h2>Minden tervedben életre kelthetsz az arculatodat</h2>
            <p>Az arculati csomagban egy helyen készítheted elő a logóidat, színeidet, betűtípusaidat és hangjaidat, és egy kattintással beillesztheted őket a kártyáidba.</p>
            <div class="row"><button type="button" class="btn b-pur" id="bb-plans">👑 Előfizetés</button><button type="button" class="btn" id="bb-colors">Kezdés ${free} ingyenes színnel</button></div></div></div>
        <div class="sh"><h2 class="s" id="bt-title"></h2><span class="mut" id="bt-count"></span></div><div id="bform" class="form"></div><div class="bgrid" id="bbody"></div></div></div></div>`;
    BS.forEach(([k, l]) => { const b = el('button', bt === k ? 'on' : '', l); b.type = 'button'; b.onclick = () => { bt = k; R.brand(); }; $('bsub').append(b); });
    $('bb-plans').onclick = openPlans; $('bb-colors').onclick = () => { bt = 'colors'; R.brand(); };
    $('bt-title').textContent = cur[1].replace(/^\S+\s/, ''); const max = limitFor(A.S, A.plan, bt);
    $('bt-count').textContent = bcount(bt) + (max === Infinity ? '' : ' / ' + max);
    const f = $('bform'), kind = cur[2], inp = (id, ph, extra = '') => `<label>${ph}<input id="${id}" ${extra}></label>`;
    if (kind === 'img') f.innerHTML = inp('b-n', 'Név', 'maxlength="40"') + inp('b-u', 'Kép címe (https://…)', 'placeholder="https://..."') + '<button type="button" class="btn b-grn" id="b-ok">Hozzáadás</button>';
    if (kind === 'color') f.innerHTML = '<label>Szín<input type="color" id="b-c" value="#22e6c4"></label><button type="button" class="btn b-grn" id="b-ok">Hozzáadás</button>';
    if (kind === 'font') f.innerHTML = '<label>Betűtípus<select id="b-f"></select></label><button type="button" class="btn b-grn" id="b-ok">Hozzáadás</button>';
    if (kind === 'audio') f.innerHTML = inp('b-n', 'Név', 'maxlength="40"') + inp('b-u', 'Fájl címe (https, .mp3 .m4a .ogg .wav)', 'placeholder="https://…/zene.mp3"') + '<label class="chk"><input type="checkbox" id="b-r"> Kijelentem, hogy a fájl a sajátom, vagy jogom van felhasználni.</label><button type="button" class="btn b-grn" id="b-ok">Hozzáadás</button>';
    if (kind === 'emoji') f.innerHTML = inp('b-e', 'Emoji', 'maxlength="16"') + '<button type="button" class="btn b-grn" id="b-ok">Hozzáadás</button>';
    if (kind === 'font') for (const x of A.S.fonts.filter(x => x.enabled)) { const lk = isLocked(x, A.plan), o = new Option((lk ? '🔒 ' : '') + x.label, x.id); o.disabled = lk; $('b-f').add(o); }
    $('b-ok').onclick = () => {
        if (kind === 'img') { const u = U.cleanImageURL($('b-u').value); if (!u) return A.flash(t('Érvénytelen vagy nem támogatott link')); badd(bt, { n: $('b-n').value.trim() || 'Kép', u }); }
        if (kind === 'color') badd('colors', $('b-c').value.slice(1));
        if (kind === 'font') { const id = $('b-f').value; if (id && !brand.fonts.includes(id)) badd('fonts', id); }
        if (kind === 'audio') { const u = U.cleanMediaURL($('b-u').value); if (!u) return A.flash(t('Érvénytelen vagy nem támogatott link')); if (!$('b-r').checked) return A.flash(t('A jogosultsági nyilatkozat nélkül a fájl nem használható.')); badd('audio', { n: $('b-n').value.trim() || 'Hang', u, r: 1 }); }
        if (kind === 'emoji') { const e = $('b-e').value.trim(); if (e) badd('icons', e); }
    };
    const body = $('bbody'), del = i => { brand[bt].splice(i, 1); persist(); R.brand(); renderStrips(); };
    (brand[bt] || []).forEach((it, i) => {
        const d = el('div', 'bitem'), x = el('button', 'x', '✕'); x.type = 'button'; x.title = t('Törlés'); x.onclick = () => del(i);
        if (kind === 'img') d.innerHTML = `<img src="${esc(it.u)}" alt="" referrerpolicy="no-referrer"><div data-notr>${esc(it.n)}</div>`;
        if (kind === 'color') d.innerHTML = `<div class="bsw" style="background:#${esc(it)}"></div><div>#${esc(it)}</div>`;
        if (kind === 'font') d.innerHTML = `<div style="font-size:1.4rem;padding:14px 0" data-notr>Aa</div><div data-notr>${esc(it)}</div>`;
        if (kind === 'audio') d.innerHTML = `<div style="font-size:1.6rem">🎵</div><div data-notr>${esc(it.n)}</div><audio controls preload="none" src="${esc(it.u)}" style="width:100%"></audio>`;
        if (kind === 'emoji') d.innerHTML = `<div style="font-size:2rem">${esc(it)}</div>`;
        d.append(x); body.append(d);
    });
    if (!(brand[bt] || []).length) body.append(el('p', 'empty', 'Még nincs elem. Add hozzá az elsőt!'));
};
function renderStrips() {                              // arculati elemek gyorsan a szerkesztő paneljein
    const c = $('bs-colors'); if (!c) return;
    c.innerHTML = ''; brand.colors.forEach(h => { const b = el('button', 'sw'); b.type = 'button'; b.style.background = '#' + h; b.title = '#' + h; b.onclick = () => applyColor(h); c.append(b); });
    $('bs-fonts').innerHTML = ''; brand.fonts.forEach(id => { const b = el('button', 'chip', esc(id)); b.type = 'button'; b.dataset.notr = ''; b.onclick = () => applyFont(id); $('bs-fonts').append(b); });
    const im = $('bs-images'); im.innerHTML = '';
    [...brand.logos, ...brand.photos].forEach(x => { const i = el('img'); i.src = x.u; i.alt = x.n; i.title = x.n; i.referrerPolicy = 'no-referrer'; i.onclick = () => { if ($('b-addi').disabled) return limMsg(); A.addImage({ u: x.u, x: 50, y: 50, w: 40, z: 10, r: 0 }); A.refreshLimits(); A.update(); }; im.append(i); });
    $('bs-icons').innerHTML = ''; brand.icons.forEach(e => { const b = el('button', 'chip', esc(e)); b.type = 'button'; b.onclick = () => { if ($('b-adde').disabled) return limMsg(); A.addEmoji({ e, x: 50, y: 50, s: 12, z: 15, r: 0 }); A.refreshLimits(); A.update(); }; $('bs-icons').append(b); });
    $('bs-audio').innerHTML = ''; brand.audio.forEach(a => { const b = el('button', 'chip', '🎵 ' + esc(a.n)); b.type = 'button'; b.onclick = () => applyAudio(a); $('bs-audio').append(b); });
}
const selTxt = () => { const k = A.selKey; return k && /^txt\d+$/.test(k) ? k.slice(3) : null; };
function applyColor(h) { const n = selTxt(); if (!n) return A.flash(t('Jelölj ki egy szöveget az előnézetben.')); A.set('c' + n, '#' + h); A.update(); }
function applyFont(id) { const n = selTxt(); if (!n) return A.flash(t('Jelölj ki egy szöveget az előnézetben.')); A.set('f' + n, id); A.update(); }
function applyAudio(a) {
    const s = $('med'); s.value = 'file'; s.dispatchEvent(new Event('change', { bubbles: true }));
    $('mlink').value = a.u; $('mmode').value = 'audio'; $('mjog').checked = !!a.r; $('mlink').dispatchEvent(new Event('input', { bubbles: true })); A.update(); A.flash(t('Arculati hang beállítva.'));
}

/* ---------- Nyomda: QR-kód és NFC ---------- */
let qrState = { src: 'cur' };
const loadQR = () => window.qrcode ? Promise.resolve(true) : new Promise(res => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; s.onload = () => res(!!window.qrcode); s.onerror = () => res(false); document.head.append(s); });
function makeQR(text) { for (const lvl of ['M', 'L']) { try { const q = window.qrcode(0, lvl); q.addData(text); q.make(); return q; } catch { } } return null; }
function qrSVG(q, fg = '#000000', bg = '#ffffff', cell = 8, m = 4) {
    const n = q.getModuleCount(), sz = (n + m * 2) * cell; let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${(c + m) * cell} ${(r + m) * cell}h${cell}v${cell}h-${cell}z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sz} ${sz}"><rect width="100%" height="100%" fill="${bg}"/><path d="${d}" fill="${fg}"/></svg>`;
}
const linkOf = src => src === 'cur' ? A.cardURL() : (() => { const p = projects.find(x => x.id === src); return p ? new URL('index.html?' + A.toQuery(A.flatten(p.params)), location.href).href : A.cardURL(); })();
function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
R.print = () => {
    const v = $('view-print');
    v.innerHTML = `<div class="hero"><h1 class="grad">Üdvözöl a Nyomda</h1></div>
        <div class="sect"><h2 class="s">Így működik</h2><div class="steps">
            <div class="step"><small>1. LÉPÉS</small><h3>Kártya kiválasztása</h3><p class="mut">Válaszd ki a szerkesztőben lévő vagy egy mentett kártyádat.</p></div>
            <div class="step"><small>2. LÉPÉS</small><h3>QR-kód és NFC-link</h3><p class="mut">Egy kattintással elkészül a QR-kód, és kiderül, melyik NFC-chipre fér rá a link.</p></div>
            <div class="step"><small>3. LÉPÉS</small><h3>Nyomtatás vagy írás chipre</h3><p class="mut">Töltsd le a QR-kódot, nyomtasd ki, vagy írd rá a linket az NFC-chipre.</p></div></div>
        <div class="pbox glass"><label>Melyik kártyához?<select id="pr-src"></select></label>
            <div class="qrwrap"><div><div class="qr" id="pr-qr"></div><div class="row" style="margin-top:10px"><button type="button" class="btn" id="pr-svg">SVG letöltése</button><button type="button" class="btn" id="pr-png">PNG letöltése</button></div>
                <div class="row" style="margin-top:6px"><button type="button" class="btn b-pur" id="pr-print">🖨️ Nyomtatás</button><button type="button" class="btn b-grn" id="pr-nfc" hidden>📲 Írás NFC chipre</button></div></div>
            <div style="flex:1;min-width:260px"><label>Link<textarea id="pr-link" rows="3" readonly></textarea></label><div class="row"><button type="button" class="btn" id="pr-copy">🔗 Link másolása</button></div>
                <h3>NFC-chip kiválasztása</h3><table class="t" id="pr-chips"></table><p class="hint" id="pr-len"></p></div></div></div></div>`;
    const sel = $('pr-src'); sel.add(new Option(t('Aktuális kártya a szerkesztőben'), 'cur'));
    projects.filter(p => !p.trashed).forEach(p => sel.add(new Option('📄 ' + p.name, p.id))); sel.value = projects.some(p => p.id === qrState.src) ? qrState.src : 'cur';
    const draw = async () => {
        qrState.src = sel.value; const link = linkOf(sel.value); $('pr-link').value = link;
        const bytes = new TextEncoder().encode(link).length, need = bytes - 8 + 1 + 6;      // https:// helyett 1 bájtos előtag + NDEF fejléc (becslés)
        $('pr-chips').innerHTML = '<tr><th>Chip</th><th>Kb. hasznos hely</th><th></th></tr>' + [['NTAG213', 137], ['NTAG215', 492], ['NTAG216', 868]].map(([n, c]) => `<tr><td>${n}</td><td>${c} B</td><td>${need <= c ? '✅' : '❌'}</td></tr>`).join('');
        $('pr-len').textContent = t('A link {x} bájt (kb. {y} bájt az NFC-rekordban). Hosszú linkhez rövidlink ajánlott.', { x: bytes, y: need });
        const ok = await loadQR(), box = $('pr-qr');
        if (!ok) { box.style.lineHeight = '1.3'; box.style.color = '#000'; box.textContent = t('A QR-kód létrehozásához internetkapcsolat kell.'); return; }
        const q = makeQR(link); if (!q) { box.textContent = t('A link túl hosszú a QR-kódhoz. Használj rövidebb linket.'); return; }
        box.style.lineHeight = ''; box.innerHTML = qrSVG(q); box._q = q;
    };
    sel.onchange = draw; draw();
    $('pr-copy').onclick = async () => { try { await navigator.clipboard.writeText($('pr-link').value); A.flash(t('Másolva.')); } catch { prompt(t('Másold ki a linket:'), $('pr-link').value); } };
    $('pr-svg').onclick = () => { const q = $('pr-qr')._q; if (q) download('kartya-qr.svg', new Blob([qrSVG(q)], { type: 'image/svg+xml' })); };
    $('pr-png').onclick = () => {
        const q = $('pr-qr')._q; if (!q) return; const n = q.getModuleCount(), cell = 10, m = 4, c = document.createElement('canvas'); c.width = c.height = (n + m * 2) * cell;
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000';
        for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + m) * cell, (r + m) * cell, cell, cell);
        c.toBlob(b => download('kartya-qr.png', b));
    };
    $('pr-print').onclick = () => {
        const q = $('pr-qr')._q; if (!q) return; const w = window.open('', '_blank'); if (!w) return;
        const nm = sel.options[sel.selectedIndex].text.replace(/^📄 /, '');
        w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(nm)}</title><style>body{font-family:sans-serif;text-align:center;margin:40px}svg{width:280px;height:280px}p{font-size:12px;word-break:break-all;color:#555}</style><h2>${esc(nm)}</h2>${qrSVG(q)}<p>${esc($('pr-link').value)}</p><script>onload=()=>print()<\/script>`); w.document.close();
    };
    if ('NDEFReader' in window) {                                                        // Web NFC (Android Chrome)
        $('pr-nfc').hidden = false;
        $('pr-nfc').onclick = async () => {
            try { A.flash(t('Tartsd az NFC-chipet a telefon hátuljához…')); await new window.NDEFReader().write({ records: [{ recordType: 'url', data: $('pr-link').value }] }); A.flash(t('Az NFC-chip megírva.')); }
            catch { A.flash(t('Az NFC-írás nem sikerült.')); }
        };
    }
};

/* ---------- Dream Lab ---------- */
const STYLES = ['Romantikus', 'Futurisztikus', 'Vidám', 'Elegáns', 'Retro', 'Ünnepi'];
const FONT_BY_STYLE = { futurisztikus: 'Orbitron', elegans: 'Cinzel', vidam: 'Russo One', retro: 'Exo 2', romantikus: 'Cinzel', unnepi: 'Cinzel' };
function quickIdea(text, style) {                      // szabály alapú ötletgenerátor (AI-szerver nélkül is használható)
    const s = norm(text + ' ' + style), has = (...w) => w.some(x => s.includes(x)), quoted = (text.match(/[„"“']([^„"”'”]{2,60})[”"”']/) || [])[1];
    let cim = quoted || 'Üdvözlet', alcim = '', effect = 'none', emoji = '✨', mc = 'ffffff';
    if (has('karacsony')) { cim = quoted || 'Boldog Karácsonyt!'; effect = 'snow'; emoji = '🎄'; mc = 'ff4d4d'; }
    else if (has('szulinap', 'szuletes')) { cim = quoted || 'Boldog születésnapot!'; effect = 'bday'; emoji = '🎂'; mc = 'ffd166'; }
    else if (has('valentin', 'szeretlek', 'szerelem', 'szerel', 'szív', 'sziv')) { cim = quoted || 'Szeretlek'; effect = 'hearts'; emoji = '❤️'; mc = 'ff4d6d'; }
    else if (has('ballagas')) { cim = quoted || 'Gratulálunk!'; emoji = '🎓'; mc = '27e885'; }
    else if (has('nevnap')) { cim = quoted || 'Boldog névnapot!'; effect = 'flowers'; emoji = '🌸'; mc = 'f9a8d4'; }
    else if (has('husvet')) { cim = quoted || 'Kellemes húsvéti ünnepeket!'; effect = 'flowers'; emoji = '🐣'; mc = 'a7f3d0'; }
    else if (has('nevjegy')) { cim = quoted || 'Neved'; alcim = 'Beosztás · Telefonszám'; emoji = '🪪'; }
    if (has('hó', 'ho ', 'havaz')) effect = 'snow'; if (has('konfetti')) effect = 'bday'; if (has('csillag')) effect = 'stars'; if (has('szivek', 'szivdobb')) effect = 'hearts';
    const col = [['piros', 'ff4d4d'], ['kek', '4cc9f0'], ['zold', '22e6c4'], ['arany', 'fbbf24'], ['lila', 'a855f7'], ['rozsaszin', 'f472b6'], ['feher', 'ffffff']].find(([k]) => s.includes(k)); if (col) mc = col[1];
    const st = Object.keys(FONT_BY_STYLE).find(k => s.includes(k)) || 'futurisztikus';
    if (st === 'futurisztikus' && effect === 'none') effect = 'stars';
    return { btn: 'Indítás', cim, mc, mf: FONT_BY_STYLE[st], ms: 7, mx: 50, my: 32, ...(alcim ? { alcim, sc: 'ffffff', sf: 'Exo 2', ss: 4, sx: 50, sy: 44 } : {}), effect, em1: emoji, em1x: 50, em1y: 70, em1s: 22, em1z: 15 };
}
async function generate(prompt, style, ratio) {
    if (A.S.aiEndpoint) {
        try {
            const r = await fetch(A.S.aiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt + ' [' + style + ', ' + ratio + ']', current: {}, plan: A.plan }) });
            const j = await r.json(); if (j.params) return { params: j.params, reply: j.reply || t('Kész, nézd meg az előnézetet. Szabadon módosíthatod.') };
        } catch { /* tartalék: szabály alapú ötlet */ }
    }
    return { params: quickIdea(prompt, style), reply: t('Gyors ötlet készült (szabály alapú, AI-szerver nélkül). Szabadon módosíthatod.') };
}
R.dream = () => {
    const v = $('view-dream'), hist = ls.get('neo_dream', []);
    v.innerHTML = `<div class="hero"><h1 class="grad">Dream Lab</h1>
        <div class="dbox glass"><textarea id="dl-p" maxlength="500" placeholder="Írd le az elképzelt kártyát, én pedig életre keltem"></textarea>
            <div class="row" style="justify-content:space-between"><span class="mut">＋</span><button type="button" class="btn b-pur" id="dl-go" style="flex:none">✨ Generálás</button></div></div>
        <div class="dopts"><select id="dl-s" title="Stílus"></select><select id="dl-r" title="Képarány"><option>9:16</option><option>16:9</option><option>1:1</option></select><select disabled><option>NEO Craft 1</option></select></div>
        <p class="hint" id="dl-msg" role="status"></p></div>
        <div class="sect"><h2 class="s">Legutóbbi ötletek</h2><div class="wrap" id="dl-h"></div></div>`;
    STYLES.forEach(s => $('dl-s').add(new Option(s, s)));
    hist.forEach(h => { const b = el('button', 'chip'); b.type = 'button'; b.textContent = h; b.dataset.notr = ''; b.onclick = () => { $('dl-p').value = h; }; $('dl-h').append(b); });
    if (!hist.length) $('dl-h').append(el('p', 'empty', 'Még nincs ötlet. Írd le az elsőt!'));
    $('dl-go').onclick = async () => {
        const p = $('dl-p').value.trim(); if (!p) return;
        $('dl-go').disabled = true; $('dl-msg').textContent = t('Készül…');
        const r = await generate(p, $('dl-s').value, $('dl-r').value); $('dl-go').disabled = false; $('dl-msg').textContent = '';
        ls.set('neo_dream', [p, ...hist.filter(x => x !== p)].slice(0, 8));
        A.loadParams(r.params); curId = null; $('pname').value = p.slice(0, 40); show('editor'); A.flash(String(r.reply).slice(0, 300));
    };
};

/* ---------- Egyéb, csomagok, tanulóközpont ---------- */
const POPS = ['more-menu', 'bell-menu'];
function closePops() { POPS.forEach(id => { $(id).hidden = true; }); }
function togglePop(id, anchor) {
    const p = $(id), open = p.hidden; closePops(); if (!open) return;
    p.hidden = false; const r = anchor.getBoundingClientRect();
    p.style.left = Math.min(innerWidth - p.offsetWidth - 10, r.right + 8) + 'px'; p.style.top = Math.max(10, Math.min(innerHeight - p.offsetHeight - 10, r.bottom - p.offsetHeight)) + 'px';
}
function openPlans() {
    const S = A.S, kinds = [['texts', 'Szövegek'], ['images', 'Képek'], ['emojis', 'Emojik'], ['projects', 'Projektek'], ['colors', 'Arculati színek'], ['logos', 'Logók'], ['photos', 'Fotók'], ['audio', 'Arculati hangok'], ['fonts', 'Arculati betűtípusok'], ['icons', 'Arculati ikonok']];
    const v = x => x == null ? '∞' : x, paid = l => l.filter(x => x.enabled && x.tier === 'paid').map(x => esc(t(x.label))).join(', ') || '–';
    $('plans-body').innerHTML = `<table class="t plans"><tr><th></th><th>Ingyenes</th><th>Fizetős</th></tr>${kinds.map(([k, l]) => `<tr><td>${l}</td><td>${v(S.limits.free[k])}</td><td>${v(S.limits.paid[k])}</td></tr>`).join('')}</table>
        <h3>🔒 Fizetős betűtípusok</h3><p class="mut">${S.fonts.filter(x => x.enabled && x.tier === 'paid').map(x => esc(x.label)).join(', ') || '–'}</p>
        <h3>🔒 Fizetős effektek</h3><p class="mut">${paid(S.effects)}</p><h3>🔒 Fizetős médiaforrások</h3><p class="mut">${paid(S.providers)}</p>`;
    $('plans').showModal();
}

/* ---------- indítás ---------- */
export function initStudio(api) {
    A = api;
    projects = ls.get('neo_projects', []); folders = ls.get('neo_folders', []);
    brand = { logos: [], photos: [], colors: [], fonts: [], audio: [], icons: [], ...ls.get('neo_brand', {}) };
    $('nav').addEventListener('click', e => {
        const b = e.target.closest('[data-v]'); if (!b) return;
        const v = b.dataset.v; if (v === 'create') return newCard(); if (v === 'more') return togglePop('more-menu', b); show(v);
    });
    $('nav-collapse').onclick = () => document.body.classList.toggle('navmin');
    $('bell').onclick = e => togglePop('bell-menu', e.currentTarget); $('avatar').onclick = e => togglePop('more-menu', e.currentTarget);
    $('b-plans').onclick = openPlans; $('help').onclick = () => $('learn').showModal(); $('b-proj').onclick = saveProject;
    document.addEventListener('click', e => { if (!e.target.closest('.pop') && !e.target.closest('[data-v="more"],#bell,#avatar')) closePops(); });
    $('more-menu').addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (!a) return; closePops(); a.dataset.act === 'plans' ? openPlans() : $('learn').showModal(); });
    for (const id of ['plans', 'learn']) $(id).addEventListener('click', e => { if (e.target.closest('[data-close]')) $(id).close(); });
    $('plan').addEventListener('change', () => { if (R[view]) R[view](); renderStrips(); });
    onLang(() => { if (R[view]) R[view](); renderStrips(); });
    R.editor = renderStrips; renderStrips();
    const m = location.hash.match(/^#\/(\w+)/);
    show(m && TITLES[m[1]] ? m[1] : 'home');
}
