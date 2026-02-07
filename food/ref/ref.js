const data1 = [
    ['flour', [145, 121, 114]],
    ['bread flour', [157, 130, 121]],
    ['cake flour', [130, 115, 100]],
    ['cornstarch', 120],

    [],

    ['butter', 227],
    ['oil', 218], // or 215
    ['most other dairy', 240],
    ['water', 237],

    [],

    ['sugar', 200],
    ['brown sugar', 220],
    ['powdered sugar', [125, 120, 115]],
    ['honey/molasses', 339],
    ['corn syrup', 328],
    ['maple syrup', 315],

    []
]; const data2 = [

    ['cocoa powder', [95, 82, 75]],
    ['chocolate chips', 180],
    ['peanut butter', 260],
    ['raisins', 145],
    ['oats', 90],
    ['jam/preserves', 320],

    [],

    ['whole almonds', 143],
    ['slivered almonds', 114],
    ['sliced almonds', 92],
    ['ground almonds', 100],
    ['walnut/pecan halves', 100],
    ['chopped nuts', 120],

    []
];

function txt(x, col) { const el = document.createElement('div'); el.textContent = x; if (col) el.classList.add('col'); return el; }
function spc() { const el = document.createElement('div'); el.classList.add('spc'); return el; }

function render(upt1, upt2, val) {
    const idx = +document.getElementsByClassName('sel')[0].dataset.idx;
    upt1.replaceChildren(...data1.flatMap(d => d[0] ? [
        txt(d[0], d[1].length),
        txt(((d[1].length ? d[1][idx] : d[1])*val).toFixed(2).replace(/\.?0+$/, '')+'g', d[1].length)
    ] : [spc(), spc()]));
    upt2.replaceChildren(...data2.flatMap(d => d[0] ? [
        txt(d[0], d[1].length),
        txt(((d[1].length ? d[1][idx] : d[1])*val).toFixed(2).replace(/\.?0+$/, '')+'g', d[1].length)
    ] : [spc(), spc()]));
}

window.addEventListener('load', () => {
    const ipt = document.getElementById('ipt');
    const upt1 = document.getElementById('upt1');
    const upt2 = document.getElementById('upt2');
    const go = () => render(upt1, upt2, +ipt.value);
    ipt.addEventListener('input', go);
    go();

    const sel = document.getElementById('sel');
    for (const s of sel.children) {
        s.addEventListener('click', () => {
            for (const t of sel.getElementsByClassName('sel')) t.classList.remove('sel');
            s.classList.add('sel');
            go();
        });
    }
});
