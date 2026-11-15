// transform-module.js – elemek elhelyezése (közös az adminnak és a kártyának)
import { URLHandler as U } from './url-handler.js';

export const TransformModule = {
    // get: kulcs => érték (URLSearchParams és sima objektum is jó)
    // Fekvő nézetben az "l" előtagú érték elsőbbséget élvez (pl. ld1x), ha van.
    apply(el, get, prefix, landscape = innerWidth > innerHeight) {
        const has = v => v !== null && v !== undefined && v !== '';
        const pick = k => {
            const base = get(prefix + k);
            if (!landscape) return base;
            const l = get('l' + prefix + k);
            if (has(l)) return l;
            // automatikus fekvő nézet: ugyanakkora fizikai méret az álló nézethez képest (9:16 -> 16:9)
            if (has(base) && k === 'w') return Number(base) * 0.5625;
            if (has(base) && k === 'h') return Number(base) * 1.778;
            return base;
        };
        el.style.left = U.num(pick('x'), -50, 150, 50) + '%';
        el.style.top = U.num(pick('y'), -50, 150, 50) + '%';
        el.style.width = U.num(pick('w'), 1, 300, 100) + 'vw';
        el.style.height = U.num(pick('h'), 1, 300, 100) + 'vh';
    },

    // Admin mezők; az eseményt az admin oldalsávja kezeli (nincs inline oninput)
    createUIFields(prefix) {
        const f = (id, label) =>
            `<input type="number" id="${id}" placeholder="${label}" aria-label="${label}" min="-50" max="300">`;
        const view = (title, p) => `
            <div class="view-section">
                <h6>${title}</h6>
                <div class="input-group">
                    ${f(p + 'x', 'X vízszintes %')}${f(p + 'y', 'Y függőleges %')}
                    ${f(p + 'w', 'Szélesség')}${f(p + 'h', 'Magasság')}
                </div>
            </div>`;
        return `<div class="view-grid">${view('ÁLLÓ NÉZET', prefix)}${view('FEKVŐ NÉZET', 'l' + prefix)}</div>`;
    }
};
