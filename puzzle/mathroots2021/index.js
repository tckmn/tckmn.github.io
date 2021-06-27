var puzs, ansed = {};
function makeconf() {
    var el = document.createElement('div');
    el.classList.add('conf');
    el.style.backgroundColor = `rgb(${Math.random()*255|0},${Math.random()*255|0},${Math.random()*255|0})`;
    el.style.transform = 'translate(-99px,-99px)';
    document.body.appendChild(el);
    return el;
}
window.addEventListener('load', () => {
    var form = document.getElementsByTagName('form')[0],
        ipt = document.getElementsByTagName('input')[0];
    puzs = document.getElementsByClassName('puz');
    form.addEventListener('submit', e => {
        e.preventDefault();
        if (guess(ipt.value.toUpperCase().replace(/[^A-Z]/g, ''), 'y')) {
            var st, grav = 0.019,
                confs = Array(100).fill().map(_ => ({
                    el: makeconf(),
                    x: 0.45+Math.random()*0.1, y: 1+Math.random()*0.1, r: Math.random()*360,
                    dx: Math.random()*0.07-0.035, dy: -0.15-Math.random()*0.1, dr: Math.random()*200-100,
                    ax: Math.random(), ay: Math.random(), az: Math.random()
                })),
                f = t => {
                    if (st === undefined) st = t;
                    var dt = 0.01*(t - st);
                    confs.forEach(c => {
                        c.el.style.transform = `translate(${(c.x+c.dx*dt)*innerWidth|0}px,${(c.y+c.dy*dt+grav*dt*dt)*innerHeight|0}px) rotate3d(${c.ax},${c.ay},${c.az},${c.r+c.dr*dt}deg)`;
                    });
                    if (dt > 20) confs.forEach(c => document.body.removeChild(c.el));
                    else requestAnimationFrame(f);
                };
            requestAnimationFrame(f);
        } else {
            ipt.classList.add('wrong');
            setTimeout(() => ipt.classList.remove('wrong'), 200);
        }
        ipt.value = '';
    });
    (localStorage.getItem('good') || '').split(' ').forEach(guess);
});
function guess(ans, addtogood) {
    if (!ans) return false;
    var corr = false, hsh = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash('wowsalty'+ans));
    [
        '72dd023939a2f6ee5f65ce619424b1c1df4f1f639bcfdf8ef276caaaac171351',
        'f8ad123d27f5e2a7d1b4b24ca2914713926292e1d0748671e83d045f02f93689',
        'bb4b0f52571c9ae1425dff97e7a91df6b36e54fb3528391e392ddaeb75feaf97',
        'bf97e93b19a4f2ba37219f00b7bcb87e2fbd156fd3445cd267c82d185a7291d1'
    ].forEach((correct, idx) => {
        if (hsh === correct && !ansed[idx]) {
            var span = document.createElement('span');
            span.textContent = ans;
            puzs[idx].appendChild(span);
            ansed[idx] = 1;
            addtogood === 'y' && localStorage.setItem('good', (localStorage.getItem('good') || '') + ' ' + ans);
            corr = true;
        }
    });
    return corr;
}
