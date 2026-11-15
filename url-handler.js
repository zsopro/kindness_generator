// url-handler.js – bemenet-tisztítás. Az admin ÉS a kártya is ezt használja,
// mert a linket bárki kézzel is megírhatja.
const FONTS = ['Russo One', 'Cinzel', 'Orbitron', 'Great Vibes', 'Permanent Marker', 'Exo 2', 'Special Elite'];
const YT_ID = /^[\w-]{11}$/;

export const URLHandler = {
    FONTS,

    // YouTube azonosító linkből vagy önállóan; hibás bemenetnél üres szöveg
    parseYouTubeID(input) {
        if (!input) return '';
        const s = String(input).trim();
        if (YT_ID.test(s)) return s;
        let u;
        try { u = new URL(s.includes('://') ? s : 'https://' + s); } catch { return ''; }
        const host = u.hostname.replace(/^(www\.|m\.|music\.)/, '');
        let id = '';
        if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
        else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
            if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
            else id = (u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/) || [])[1] || '';
        }
        return YT_ID.test(id) ? id : '';
    },

    // Csak https képek
    cleanImageURL(url) {
        try {
            const u = new URL(String(url || '').trim());
            return u.protocol === 'https:' ? u.href : '';
        } catch { return ''; }
    },

    hex: v => /^[0-9a-f]{6}$/i.test(v || '') ? '#' + v : null,
    font: v => FONTS.includes(v) ? v : null,
    num(v, min, max, def) {
        if (v === null || v === undefined || v === '') return def;
        const n = Number(v);
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
    }
};
