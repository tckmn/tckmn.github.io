window.addEventListener('load', () => {

    anim(document.getElementById('home_videogame'), 600, elt => {
        // radius, border width, x offset of center, max angle
        var path = elt.getElementsByTagName('path')[0],
            r = 0.9, b = 0.2, p = 0.1, ma = 0.8;
        return ts => {
            var a = ma * Math.abs(1 - (ts * 4) % 2),
                x = r*Math.cos(a), y = r*Math.sin(a);

            var d = Math.max(-r,
                (4*p*y*y + b*(b*x + Math.sqrt(b*b*(x*x-r*r) + 4*y*y*(p*p + r*r + 2*p*x)))) / (b*b - 4*y*y));

            path.setAttribute('d', `M ${d > 0 ? -r : d} 0 L ${x} ${y} A ${r} ${r} 0 1 1 ${x} ${-y} z`);
        };
    });

    anim(document.getElementById('home_music'), 600, elt => {
        var g = elt.getElementsByTagName('g')[0];
        return ts => {
            var x = 1-Math.pow(1-ts,2), a = 4*Math.PI*x;
            g.setAttribute('transform', `translate(2.19424235 0) scale(${Math.cos(a)} 1) skewY(${Math.sin(a)*25})`);
        };
    });

    anim(document.getElementById('home_boardgame'), 600, elt => {
        var gs = elt.getElementsByTagName('g'), g1 = gs[0], g2 = gs[1];
        // squish small/large, zoom out
        var ss = 0.7, sl = 1.8, zo = 0.5;
        return ts => {
            var phase = Math.floor(ts*3), t = (ts * 3) % 1;
            switch (phase) {
            case 0:
                g1.setAttribute('transform', `rotate(${tw(0, -20, t)}) scale(${tw(1, zo, t)} ${tw(1, ss*zo, t)}) translate(${tw(0, -1.5, t)} ${tw(0, 0.5, t)})`);
                break;
            case 1:
                g1.setAttribute('transform', `rotate(${-20}) scale(${zo} ${tw(ss*zo, sl*zo, t)}) translate(${tw(-1.5, -2, t)} ${tw(0.5, -1.5, t)})`);
                g2.setAttribute('transform', `rotate(${20})  scale(${zo} ${tw(sl*zo, ss*zo, t)}) translate(${tw(2, 1.5, t)}   ${tw(-1.5, 0.5, t)})`);
                g1.setAttribute('opacity', 1-t);
                g2.setAttribute('opacity', t);
                break;
            case 2:
                g1.setAttribute('opacity', 0);
                g2.setAttribute('opacity', 1); // oops
                g2.setAttribute('transform', `rotate(${tw(20, 0, t)}) scale(${tw(zo, 1, t)} ${tw(ss*zo, 1, t)}) translate(${tw(1.5, 0, t)} ${tw(0.5, 0, t)})`);
                break;
            case 3:
                g1.setAttribute('transform', '');
                g1.setAttribute('opacity', 1);
                g2.setAttribute('opacity', 0);
                break;
            }
        };
    });

    anim(document.getElementById('home_puzzle'), 600, elt => {
        var ps = elt.getElementsByTagName('path'), p1 = ps[0], p2 = ps[1];
        return ts => {
        };
    });

});

function anim(elt, dur, fn) {
    var cb = fn(elt), going = false;
    elt.addEventListener('mouseenter', () => {
        if (going) return;
        going = true;
        var start, f = ts => {
            if (start === undefined) start = ts;
            if (ts - start < dur) cb((ts - start) / dur), requestAnimationFrame(f);
            else cb(1), going = false;
        };
        requestAnimationFrame(f);
    });
}

function animSeq(ts, durs, anims) {

}

function tw(a, b, t) { return a + (b-a)*t; }
