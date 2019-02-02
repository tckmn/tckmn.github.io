var g = {};

window.onload = function() {
    g.cnv = document.getElementById('cnv');
    g.cnv.width = window.innerWidth;
    g.cnv.height = window.innerHeight;
    g.ctx = g.cnv.getContext('2d');

    g.thingies = [];
    g.shift = 0;

    g.r = function(n) {
        return Math.floor(Math.random() * n);
    }

    g.reqAnimFrame = window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        (function(f){setTimeout(f,10);});

    g.ctx.font = '30px sans-serif';
    g.ctx.fillText('Click me', 100, 100);

    g.cnv.onclick = function() {
        var html = document.documentElement, prefixes = ['r', 'webkitR', 'mozR', 'msR'];
        for (var i = 0; i < prefixes.length; ++i) {
            if (html[prefixes[i] + 'equestFullscreen']) {
                html[prefixes[i] + 'equestFullscreen'](Element.ALLOW_KEYBOARD_INPUT);
                break;
            }
        }
        g.cnv.width = screen.width;
        g.cnv.height = screen.height;

        tick();
    }
}

function tick() {
    g.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    g.ctx.fillRect(0, 0, g.cnv.width, g.cnv.height);

    var doBoom = Math.random() < 0.01;

    g.shift = (g.shift > 5 ? g.shift * 0.9 : (Math.random() < -g.shift / 25 * 0.005 ? g.r(100) + 100 : g.shift - 1));

    for (var i = 0; i < g.thingies.length; ++i) {
        var t = g.thingies[i];

        if (doBoom && Math.random() < 0.5) {
            g.thingies.splice(i--, 1);
            continue;
        }

        t.x += t.vx + (g.shift > 0 ? g.shift : 0);
        t.y += t.vy + (g.shift > 0 ? g.shift : 0);
        t.vx += t.ax;
        t.vy += t.ay;

        var doHuge = Math.random() < 0.0001;
        t.w += t.vw + (doHuge ? 200 : 0);
        t.h += t.vy + (doHuge ? 200 : 0);
        if (t.w <= 0) t.w = 1; t.vw = -t.vw;
        if (t.h <= 0) t.h = 1; t.vh = -t.vh;

        t.r += t.vr;

        if (t.x > g.cnv.width  || t.x < -t.w ||
            t.y > g.cnv.height || t.y < -t.h) {
            g.thingies.splice(i--, 1);
            continue;
        }

        g.ctx.fillStyle = t.style;
        g.ctx.translate(t.x, t.y);
        g.ctx.rotate(t.r);
        g.ctx.fillRect(0, 0, t.w, t.h);
        g.ctx.rotate(-t.r);
        g.ctx.translate(-t.x, -t.y);
    }

    for (var _ = 0; _ < 50; ++_) {
        g.thingies.push({
            style: 'rgba('+[g.r(255),g.r(255),g.r(255),g.r(255)]+')',

            x: g.r(g.cnv.width), y: g.r(g.cnv.height),
            vx: g.r(20) - 10, vy: g.r(20) - 10,
            ax: g.r(2) - 1, ay: g.r(2) - 1,

            w: g.r(20), h: g.r(20),
            vw: g.r(10) - 5, vy: g.r(10) - 5,

            r: Math.random() / 4 - 0.2, vr: Math.random() / 75
        });
    }

    if (Math.random() < 0.05) {
        g.ctx.fillStyle = 'white';
        g.ctx.fillRect(0, 0, g.cnv.width, g.cnv.height);
    }

    g.reqAnimFrame.call(window, tick);
}
