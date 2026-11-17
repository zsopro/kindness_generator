// settings.js – közös beállítások (az admin és a settings.html használja). Adatbázisba importálható: schemaVersion + azonosítós listák.
const F = (id, tier = 'free') => ({ id, label: id, tier, enabled: true });
const E = (id, label, icon, tier = 'free') => ({ id, label, icon, tier, enabled: true });

const P = (id, label, icon, tier = 'free', enabled = true) => ({ id, label, icon, tier, enabled, legal: '' });

export const DEFAULTS = {
    schemaVersion: 1,
    limits: {                                   // null vagy üres = korlátlan
        free: { texts: 5, images: 2, emojis: 3 },
        paid: { texts: 30, images: 20, emojis: 20 }
    },
    fonts: [F('Orbitron'), F('Exo 2'), F('Russo One'), F('Cinzel'),
        F('Great Vibes', 'paid'), F('Permanent Marker', 'paid'), F('Special Elite', 'paid'), F('Pacifico', 'paid'),
        F('Lobster', 'paid'), F('Bangers', 'paid'), F('Dancing Script', 'paid'), F('Playfair Display', 'paid'),
        F('Caveat', 'paid'), F('Press Start 2P', 'paid')],
    effects: [E('none', 'Nincs', '🚫'), E('snow', 'Hóesés', '❄️'), E('bday', 'Konfetti', '🎉'), E('hearts', 'Szívek', '❤️'),
        E('rain', 'Eső', '🌧️', 'paid'), E('stars', 'Csillagok', '⭐', 'paid'), E('sparkles', 'Szikrák', '✨', 'paid'),
        E('leaves', 'Őszi levelek', '🍂', 'paid'), E('flowers', 'Virágszirmok', '🌸', 'paid'), E('bubbles', 'Buborékok', '🫧', 'paid')],
    providers: [P('youtube', 'YouTube', '▶️'), P('file', 'Saját fájl (mp3/mp4)', '📁'), P('tiktok', 'TikTok', '🎵', 'paid'), P('videa', 'Videa (kísérleti)', '🎞️', 'paid', false)],
    github: { owner: 'zsopro', repo: 'kindness_generator', branch: '' },   // nem titkos adatok; a hozzáférési token sosem kerül ide
    aiEndpoint: '',                             // az AI-szolgáltatás https címe (üres = kikapcsolva)
    emojis: '😀 😍 🥰 😘 🥳 😊 😎 🤗 🙏 👍 🎉 🎂 🎁 🎈 🎄 ❄️ 🐣 🎓 🌸 💐 ❤️ 💖 ✨ ⭐ 🌟 🔥 🍀 ☀️ 🌈 🎶 📞 ✉️ 📍 🏠 💼 🚗 🍾 🥂 🕯️ 🎅'.split(' ')
};

export function merge(j) {
    j = j || {}; const d = structuredClone(DEFAULTS), has = Array.isArray;
    return {
        schemaVersion: 1,
        limits: { free: { ...d.limits.free, ...(j.limits?.free || {}) }, paid: { ...d.limits.paid, ...(j.limits?.paid || {}) } },
        fonts: has(j.fonts) && j.fonts.length ? j.fonts : d.fonts,
        effects: [...(j.effects || []), ...d.effects.filter(x => !(j.effects || []).some(e => e.id === x.id))],   // a kódban lévő új effektek automatikusan bekerülnek
        providers: [...(j.providers || []), ...d.providers.filter(x => !(j.providers || []).some(e => e.id === x.id))],
        emojis: has(j.emojis) && j.emojis.length ? j.emojis : d.emojis,
        github: { ...d.github, ...(j.github || {}) },
        aiEndpoint: typeof j.aiEndpoint === 'string' ? j.aiEndpoint : ''
    };
}
export async function loadSettings() {
    try { const r = await fetch('settings.json', { cache: 'no-cache' }); if (r.ok) return merge(await r.json()); } catch { }
    return merge(null);
}
// plan: 'admin' (minden elérhető) | 'free' | 'paid'
export const isLocked = (item, plan) => plan !== 'admin' && item.tier === 'paid' && plan !== 'paid';
export const limitFor = (S, plan, type) => plan === 'admin' ? Infinity : (S.limits?.[plan]?.[type] ?? Infinity);
