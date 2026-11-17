// github.js – JSON fájl mentése a GitHub tárolóba (Contents API). A hozzáférési token csak a böngészőben tárolódik, a kódban és a tárolóban soha.
const KEY = 'gh_token';
const b64e = s => { let bin = ''; new TextEncoder().encode(s).forEach(c => { bin += String.fromCharCode(c); }); return btoa(bin); };
const b64d = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));

export function ghClearToken() { try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch { } }
export function ghToken(t = x => x) {                                 // t: fordító függvény a felugró kérdésekhez
    let tok = ''; try { tok = sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || ''; } catch { }
    if (tok) return tok;
    tok = (prompt(t('GitHub hozzáférési token (csak ehhez a repóhoz, Contents: írás). Nem kerül a kódba.')) || '').trim();
    if (!tok) throw new Error('token');
    try { (confirm(t('Megjegyezzem ezen az eszközön?')) ? localStorage : sessionStorage).setItem(KEY, tok); } catch { }
    return tok;
}
export function ghCfg(S) {                                            // tulajdonos / repó / ág a settings.json-ból, ellenőrizve
    const g = (S && S.github) || {}, ok = (v, re, d) => re.test(v || '') ? v : d;
    return { owner: ok(g.owner, /^[A-Za-z0-9_.-]{1,100}$/, 'zsopro'), repo: ok(g.repo, /^[A-Za-z0-9_.-]{1,100}$/, 'kindness_generator'), branch: ok(g.branch, /^[A-Za-z0-9._\/-]{1,100}$/, '') };
}
// A fájl friss tartalmából a mutate() állítja elő az újat; ütközésnél (közben változott) egyszer újrapróbálja a friss tartalommal.
export async function ghUpdateJSON({ owner, repo, branch, path, token, message, mutate }) {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`;
    const h = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    for (let attempt = 0; attempt < 2; attempt++) {
        const r = await fetch(url + (branch ? '?ref=' + encodeURIComponent(branch) : ''), { headers: h, cache: 'no-store' });
        let cur = null, sha;
        if (r.status !== 404) {
            if (!r.ok) { if (r.status === 401 || r.status === 403) ghClearToken(); throw new Error('GitHub ' + r.status); }
            const j = await r.json(); sha = j.sha;
            try { cur = JSON.parse(b64d(j.content)); } catch { throw new Error('invalid JSON'); }
        }
        const body = { message, content: b64e(JSON.stringify(mutate(cur), null, 2) + '\n'), ...(sha ? { sha } : {}), ...(branch ? { branch } : {}) };
        const w = await fetch(url, { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (w.ok) return w.json();
        if (w.status === 409 || w.status === 422) continue;
        if (w.status === 401 || w.status === 403) ghClearToken();
        throw new Error('GitHub ' + w.status);
    }
    throw new Error('GitHub conflict');
}
