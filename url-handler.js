// url-handler.js – bemenet-tisztítás. Az admin ÉS a kártya is ezt használja,
// mert a linket bárki kézzel is megírhatja.
const YT_ID = /^[\w-]{11}$/;

export const URLHandler = {
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

    // TikTok: teljes videó-link vagy azonosító (a rövid vm.tiktok.com linkek kliensoldalon nem oldhatók fel)
    parseTikTokID(input) {
        const s = String(input || '').trim();
        if (/^\d{8,25}$/.test(s)) return s;
        let u; try { u = new URL(s); } catch { return ''; }
        if (u.hostname.replace(/^(www\.|m\.)/, '') !== 'tiktok.com') return '';
        const m = u.pathname.match(/\/(?:video|photo)\/(\d{8,25})|\/player\/v1\/(\d{8,25})/);
        return m ? (m[1] || m[2]) : '';
    },

    // Videa (kísérleti): videa.hu / videakid.hu link vagy azonosító
    parseVideaID(input) {
        const s = String(input || '').trim();
        if (/^[A-Za-z0-9]{12,20}$/.test(s)) return s;
        const m = s.match(/^https?:\/\/(?:www\.)?videa(?:kid)?\.hu\/(?:videok\/(?:[^/?#]+\/)*[^?#]*-|player\?(?:[^#]*&)?v=|player\/v\/)([A-Za-z0-9]{12,20})/);
        return m ? m[1] : '';
    },

    // Saját fájl: https cím, ismert hang/videó kiterjesztéssel
    parseMediaURL(input) {
        try {
            const u = new URL(String(input || '').trim());
            return (u.protocol === 'https:' && /\.(mp4|webm|ogv|mp3|ogg|m4a|wav|aac)$/i.test(u.pathname)) ? u.href : '';
        } catch { return ''; }
    },

    // Csak https képek
    cleanImageURL(url) {
        try {
            const u = new URL(String(url || '').trim());
            return u.protocol === 'https:' ? u.href : '';
        } catch { return ''; }
    },

    hex: v => /^[0-9a-f]{6}$/i.test(v || '') ? '#' + v : null,
    font: v => /^[A-Za-z0-9 ]{2,40}$/.test(v || '') ? v : null,   // Google Fonts név: csak betű, szám, szóköz
    num(v, min, max, def) {
        if (v === null || v === undefined || v === '') return def;
        const n = Number(v);
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
    }
};
