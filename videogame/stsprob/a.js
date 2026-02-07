let hovEl;
function hover(e, txt) {
    hovEl.textContent = txt;
    hovEl.style.display = 'block';
    hovEl.style.left = e.clientX+'px';
    hovEl.style.top = e.clientY+'px';
}

function unhover() {
    hovEl.style.display = 'none';
}

const INF = 999999;
class Highlight {
    constructor(name, idx, largest) {
        this.active = true;
        this.name = name;
        this.startIdx = idx;
        this.endIdx = idx;
        this.largest = largest;
    }
    lo() { return Math.min(this.startIdx, this.endIdx); }
    hi() { const x = Math.max(this.startIdx, this.endIdx); return x === this.largest ? INF : x; }
    render(dist) {
        const lo = this.lo(), hi = this.hi();
        return (lo === hi ? lo : hi === INF ? `≥ ${lo}` : lo ? `${lo}-${hi}` : `≤ ${hi}`) +
            ` ${this.name}: ${dist.slice(lo, hi+1).reduce((acc, val) => acc+val, 0)}`;
    }
    rerender(info, dist, cols, idx) {
        if (this.endIdx === idx) return;
        if (idx !== undefined) this.endIdx = idx;
        info.textContent = this.render(dist);
        cols.forEach((col, i) => {
            col.classList.toggle('hi', this.lo() <= i && i <= this.hi());
        });
    }
}
let hi = undefined;

window.addEventListener('load', () => {
    hovEl = document.getElementById('hover');
    const ipt = document.getElementById('in');
    const out = document.getElementById('out');
    const info = document.getElementById('info');
    const go = () => {
        disp(out, info, getDist(ipt.value.split('').flatMap(ch => ch === 'e' ? [1,1,1] : [0,0,0])));
    };
    ipt.addEventListener('keyup', go);
    if (!ipt.value) ipt.value = 'fffeffeffe';
    go();

    document.body.addEventListener('pointerup', () => {
        if (hi) hi.active = false;
    });
});

class Dist {
    constructor(rare, uncommon, common) {
        this.rare = rare;
        this.uncommon = uncommon;
        this.common = common;
    }
}

const BASE_RARE = -5;
const BASE_DIST = new Dist([1], [1], [1]);

let dp;
function getDist(path) {
    dp = path.map(() => ({}));
    return getDistSub(path, 0, BASE_RARE);
}

function getDistSub(path, idx, rare) {
    if (idx >= path.length) return BASE_DIST;
    if (dp[idx][rare]) return dp[idx][rare];

    // keep rare as integer until the end to make sure 0 stays 0
    const pRare = Math.max(0, rare + (path[idx] ? 10 : 3)) * 0.01;
    const pUncommon = Math.min(0, rare + (path[idx] ? 10 : 3)) * 0.01 + (path[idx] ? 0.4 : 0.37);
    const pCommon = 1 - pRare - pUncommon;

    const fRare = getDistSub(path, idx+1, BASE_RARE);
    const fUncommon = getDistSub(path, idx+1, rare);
    const fCommon = getDistSub(path, idx+1, Math.min(40, rare+1));

    const rRare = [], rUncommon = [], rCommon = [];
    for (let i = 0;; ++i) {
        const newRare = pRare*(fRare.rare[i-1]||0) + pUncommon*(fUncommon.rare[i]||0) + pCommon*(fCommon.rare[i]||0);
        const newUncommon = pRare*(fRare.uncommon[i]||0) + pUncommon*(fUncommon.uncommon[i-1]||0) + pCommon*(fCommon.uncommon[i]||0);
        const newCommon = pRare*(fRare.common[i]||0) + pUncommon*(fUncommon.common[i]||0) + pCommon*(fCommon.common[i-1]||0);
        if (newRare) rRare[i] = newRare;
        if (newUncommon) rUncommon[i] = newUncommon;
        if (newCommon) rCommon[i] = newCommon;
        if (!newRare && !newUncommon && !newCommon) break;
    }

    const res = new Dist(rRare, rUncommon, rCommon);
    dp[idx][rare] = res;
    return res;
}

function disp(out, info, dist) {
    while (out.firstChild) out.removeChild(out.firstChild);
    out.appendChild(dispOne('rare', info, dist.rare));
    out.appendChild(dispOne('uncommon', info, dist.uncommon));
    out.appendChild(dispOne('common', info, dist.common));
    info.textContent = hi ? hi.render(dist[hi.name]) : '\u00a0';
}

function dispOne(name, info, dist) {
    const max = Math.max(...dist);
    const cont = document.createElement('div');
    const cols = [];
    cont.classList.add('chart');
    dist.forEach((val, i) => {
        const col = document.createElement('div');
        if (hi && hi.name === name && hi.lo() <= i && i <= hi.hi()) col.classList.add('hi');
        const bar = document.createElement('div');
        bar.classList.add('bar');
        bar.style.height = Math.round(100*val/max)+'px';
        const lbl = document.createElement('div');
        lbl.classList.add('lbl');
        lbl.textContent = i;
        col.appendChild(bar);
        col.appendChild(lbl);
        cont.appendChild(col);
        cols.push(col);

        col.addEventListener('pointerdown', e => {
            e.preventDefault();
            for (const el of [...document.getElementsByClassName('hi')]) el.classList.remove('hi');
            hi = new Highlight(name, i, dist.length-1);
            hi.rerender(info, dist, cols);
        });
        col.addEventListener('pointermove', e => {
            hover(e, `${i} ${name}: ${val}`);
            if (e.buttons && hi && hi.active && hi.name === name) {
                hi.rerender(info, dist, cols, i);
            }
        });
        col.addEventListener('pointerleave', e => { unhover(); });
    });

    const bigcont = document.createElement('div');
    bigcont.appendChild(document.createTextNode(`${name} (EV: ${dist.reduce((acc, val, idx) => acc + val*idx, 0)})`));
    bigcont.appendChild(cont);
    return bigcont;
}
