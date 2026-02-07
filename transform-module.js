// transform-module.js Ez a fájl felel az X, Y, Width, Height adatok kezeléséért, figyelembe véve az álló és fekvő nézetet.
export const TransformModule = {
    // Kinyeri a stílust a paraméterekből az aktuális nézet alapján
    // prefix: pl. 'v' (video), 'd1' (deco1), 'txt1'
    getResponsiveStyles: (params, prefix) => {
        const isLandscape = window.innerWidth > window.innerHeight;
        const p = isLandscape ? 'l' : ''; // 'l' mint Landscape prefix
        
        // Ha van specifikus fekvő érték (pl. lvx), azt használja, 
        // ha nincs, akkor az alapértelmezett állót (pl. vx)
        const x = params.get(p + prefix + 'x') || params.get(prefix + 'x') || 50;
        const y = params.get(p + prefix + 'y') || params.get(prefix + 'y') || 50;
        const w = params.get(p + prefix + 'w') || params.get(prefix + 'w') || 100;
        const h = params.get(p + prefix + 'h') || params.get(prefix + 'h') || 100;

        return {
            left: `${x}%`,
            top: `${y}%`,
            width: isLandscape ? `${w}vw` : `${w}vw`, // Itt lehet finomítani az egységeket
            height: isLandscape ? `${h}vh` : `${h}vh`,
            transform: 'translate(-50%, -50%)',
            position: 'absolute'
        };
    },

    // Segéd függvény az Admin felületre a mezők legenerálásához
    createUIFields: (label, prefix) => {
        return `
            <div class="transform-group">
                <h5 style="color: #0df; font-size: 0.7rem; margin: 10px 0 5px;">${label}</h5>
                <div class="row">
                    <div class="col">
                        <span>ÁLLÓ (X, Y, W, H)</span>
                        <div class="row">
                            <input type="number" id="${prefix}x" placeholder="X%" oninput="update()">
                            <input type="number" id="${prefix}y" placeholder="Y%" oninput="update()">
                            <input type="number" id="${prefix}w" placeholder="W%" oninput="update()">
                            <input type="number" id="${prefix}h" placeholder="H%" oninput="update()">
                        </div>
                    </div>
                    <div class="col" style="border-left: 1px solid #444; padding-left: 5px;">
                        <span>FEKVŐ (X, Y, W, H)</span>
                        <div class="row">
                            <input type="number" id="l${prefix}x" placeholder="X%" oninput="update()">
                            <input type="number" id="l${prefix}y" placeholder="Y%" oninput="update()">
                            <input type="number" id="l${prefix}w" placeholder="W%" oninput="update()">
                            <input type="number" id="l${prefix}h" placeholder="H%" oninput="update()">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};
