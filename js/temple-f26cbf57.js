// via @bryc https://stackoverflow.com/a/47593316
function rnd(str) {
  let h1 = 1779033703, h2 = 3144134277,
      h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;
  return function() {
    h1 |= 0; h2 |= 0; h3 |= 0; h4 |= 0;
    let t = (h1 + h2 | 0) + h4 | 0;
    h4 = h4 + 1 | 0;
    h1 = h2 ^ h2 >>> 9;
    h2 = h3 + (h3 << 3) | 0;
    h3 = (h3 << 21 | h3 >>> 11);
    h3 = h3 + t | 0;
    return (t >>> 0) / 4294967296;
  }
}

const DBUF = 7;

class Animator {
    #animating = false;
    #cancel = false;
    interruptable = false;
    constructor(c) {
        this.c = c;
    }
    anim(t1, t2) {
        const intr = setInterval(() => {
            if (this.#animating && this.#cancel) return;
            let st;
            const f = t => {
                if (st === undefined) st = t;
                this.c.classList.toggle('on', ((t - st) / 1000) % t2 < t1);
                if (this.#cancel) {
                    this.c.classList.remove('on');
                    this.#animating = false;
                    this.#cancel = false;
                } else requestAnimationFrame(f);
            };
            requestAnimationFrame(f);
            clearInterval(intr);
            this.#animating = true;
            this.#cancel = false;
        }, 20);
    }
    animh(t, r, tt) {
        if (!r) r = () => 0.5;
        if (!tt) tt = t;
        this.anim(t, tt + 0.75 + r()/2 + Math.min(tt,5)/3*(0.5+r()/2));
    }
    animb(t) {
        this.anim(0.1, 60 / t);
    }
    get animating() { return this.#animating; }
    cancel() { this.#cancel = true; }
    reset() { this.#cancel = true; this.interruptable = false; }
}


window.addEventListener('load', () => {
    const c = document.getElementsByClassName('clicker')[0];
    const guess = document.getElementById('guess');
    const ipt = document.getElementById('ipt');
    ipt.value = '';
    let icb = ()=>{};
    ipt.addEventListener('input', () => icb());

    const ca = new Animator(c);

    let lastpress = 0, lasthold, lastbpm;
    let deltas = new Array(DBUF).fill(-1), didx = 0;
    let ucb1 = ()=>{}, ucb2 = ()=>{}, cuptimer;
    let abtn;
    const cdn = e => {
        e.preventDefault();
        if (!ca.animating) {
            const t = (+new Date())/1000;
            deltas[didx] = t - lastpress;
            didx = (didx + 1) % DBUF;
            lastpress = t;
            ucb2 = ()=>{};
            c.classList.add('on');
            if (deltas.every(x=>x>0)) {
                let arr = deltas.map(Math.log).sort((a,b)=>a-b);
                arr = arr.filter(x => Math.abs(arr[(DBUF-1)/2] - x) < 0.05);
                lastbpm = arr.length < DBUF/2 ? undefined : 60 / Math.exp(arr.reduce((a,b)=>a+b)/arr.length);
            }
        } else if (ca.interruptable) {
            ca.cancel();
        }
    }
    const cup = e => {
        e.preventDefault();
        if (!ca.animating) {
            const t = (+new Date())/1000;
            if (c.classList.contains('on')) {
                lasthold = t - lastpress;
                c.classList.remove('on');
                ucb1();
            }
            // this is outside of the if because there might have been a preview animation cancel
            if (cuptimer) clearTimeout(cuptimer);
            // the wrapping is important, i want the value of ucb2 6 seconds from now
            cuptimer = setTimeout(() => { ucb2(); }, 6000);
        }
    }
    c.addEventListener('pointerdown', cdn);
    c.addEventListener('pointerup', cup);
    c.addEventListener('pointerleave', cup);
    c.addEventListener('pointermove', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        if (!e.repeat && e.key === ' ') cdn(e);
        else if (e.key === ' ') e.preventDefault();
        else if (!e.repeat && e.key === 'Enter' && abtn) abtn.click();
    });
    document.addEventListener('keyup', e => {
        if (e.key === ' ') cup(e);
    });

    let target, guessing;
    const regguess = g => {
        if ((guessing = g) === undefined) guess.setAttribute('disabled', 1);
        else { abtn = guess; guess.removeAttribute('disabled'); }
    };

    const
        gclk = document.getElementById('gclk'),
        gtxt = document.getElementById('gtxt'),
        ga = new Animator(gclk),
        tclk = document.getElementById('tclk'),
        ttxt = document.getElementById('ttxt'),
        ta = new Animator(tclk),
        score = document.getElementById('score');

    const reset = () => {
        ca.reset();
        ga.reset();
        ta.reset();
        ipt.value = '';
        ipt.setAttribute('disabled', 1);
        guess.setAttribute('disabled', 1);
        lastpress = 0;
        lasthold = undefined;
        lastbpm = undefined;
        deltas.fill(-1);
        ucb1 = ucb2 = icb = ()=>{};
        abtn = undefined;
        target = guessing = undefined;
        document.body.classList.remove('showresult');
    };

    let today;
    const chkday = () => {
        today = new Date().toLocaleString('sv').split(' ')[0];
        if (localStorage.getItem('temple-day') !== today) {
            localStorage.removeItem('temple-scores');
        }
        localStorage.setItem('temple-day', today);
    };
    chkday();

    const a = {};
    const sfx = () => (a.hold ? 'H' : a.beat ? 'B' : '?') + (a.give ? 'G' : a.take ? 'T' : '?');
    const newgame = () => {
        reset();
        chkday();

        const r = a.daily ? rnd(today + sfx()) : Math.random;
        const centralization = a.hold ? 0.8 : 1.4;
        const logsmooth = 0.5;
        const min = a.hold ? 0.1 : 30, max = a.hold ? 5 : 300;
        const unscaled = 0.5 + Math.pow(r(), centralization) / (r() < 0.5 ? 2 : -2);
        target = a.hold ?
            Math.exp(unscaled * (Math.log(max+logsmooth)-Math.log(min+logsmooth)) + Math.log(min+logsmooth)) - logsmooth :
            unscaled * (max-min) + min;

        if (a.daily && (localStorage.getItem('temple-scores') || '- - - -').split(' ')[(a.hold ? 2 : 0) + (a.give ? 1 : 0)] !== '-') {
            regguess(+localStorage.getItem('temple-' + sfx()));
            guess.click();
            return;
        }

        if (a.give) {
            ipt.value = target;
            ca.interruptable = true;
            if (a.hold) {
                ucb1 = () => { regguess(lasthold); };
                ucb2 = () => { ca.animh(guessing); };
            } else {
                ucb1 = () => { regguess(lastbpm) };
                ucb2 = () => { ca.animb(guessing); };
            }
        } else {
            ipt.removeAttribute('disabled');
            if (a.hold) {
                ca.animh(target, r);
            } else {
                ca.animb(target);
            }
            icb = () => { regguess(ipt.value.match(/^\d*\.?\d*$/) && ipt.value !== '' && ipt.value !== '.' ? +ipt.value : undefined); }
            ipt.focus();
        }
    };

    const suff = document.getElementById('suffix');
    const p1 = document.getElementById('p1');
    const p2 = document.getElementById('p2');
    const rs = [];
    for (const s of document.getElementsByClassName('sel')) {
        const idx = rs.length;
        rs.push(false);
        const bs = s.getElementsByTagName('button');
        for (const b of bs) {
            b.addEventListener('click', () => {
                if (b.classList.contains('active')) return;
                rs[idx] = true;
                for (const bb of bs) bb.classList.toggle('active', a[bb.textContent] = bb === b);
                suff.textContent = sfx();
                p1.textContent = a.give ? (a.hold ? 'hold (touch/click/space key) for' : a.beat ? 'tap (touch/click/space key) at' : '\u00a0') : a.take ? (a.hold ? 'light stays on for' : a.beat ? 'light is flashing at' : '\u00a0') : '\u00a0';
                p2.textContent = a.hold ? 'seconds' : a.beat ? 'beats per minute' : '\u00a0';
                updshare();
                if (rs.every(x=>x)) newgame();
            });
        }
    }

    const againp = document.getElementById('againp');
    const again = document.getElementById('again');
    guess.addEventListener('click', () => {
        const g = guessing, t = target, unit = a.hold ? ' sec' : ' bpm';
        reset();
        gtxt.textContent = g + unit;
        ttxt.textContent = t + unit;
        if (a.hold) ga.animh(g, 0, Math.max(g,t)); else ga.animb(g);
        if (a.hold) ta.animh(t, 0, Math.max(g,t)); else ta.animb(t);
        const sc =  Math.ceil(10000 * Math.min(g,t) / Math.max(g,t));
        score.textContent = sc;
        if (a.daily) {
            const scs = (localStorage.getItem('temple-scores') || '- - - -').split(' ');
            scs[(a.hold ? 2 : 0) + (a.give ? 1 : 0)] = sc;
            localStorage.setItem('temple-scores', scs.join(' '));
            localStorage.setItem('temple-' + sfx(), g);
            updshare();
            againp.classList.add('daily');
            againp.classList.remove('infinite');
        } else {
            againp.classList.add('infinite');
            againp.classList.remove('daily');
            abtn = again;
        }
        document.body.classList.add('showresult');
    });

    again.addEventListener('click', () => {
        if (abtn === again) newgame();
    });

    const shcont = document.getElementById('share');
    const sha = document.getElementById('sharea');
    const sch = document.getElementById('shc');
    sha.addEventListener('focus', () => sha.select());
    shc.addEventListener('click', () => {
        sha.focus();
        sha.select();
        document.execCommand('copy');
        shc.textContent = 'copied!';
        setTimeout(() => { shc.textContent = 'copy'; }, 5000);
    });
    const updshare = () => {
        const sday = localStorage.getItem('temple-day');
        const sscs = (localStorage.getItem('temple-scores') || '- - - -').split(' ');
        shcont.style.display = !a.daily || sscs.every(x=>x==='-') ? 'none' : 'flex';
        sha.value = `temple ${sday}\n-HG: ${sscs[3]}\n-HT: ${sscs[2]}\n-BG: ${sscs[1]}\n-BT: ${sscs[0]}\nhttps://tck.mn/temple`;
    };
    updshare();

});