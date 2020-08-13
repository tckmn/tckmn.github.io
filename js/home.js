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
            var x = 1-(1-ts)*(1-ts), a = 4*Math.PI*x;
            g.setAttribute('transform', `translate(0.0844448 0) scale(${Math.cos(a)} 1) skewY(${Math.sin(a)*30})`);
        };
    });

    anim(document.getElementById('home_boardgame'), 600, elt => {
        var g1 = elt.getElementsByTagName('g')[0], g2 = g1.cloneNode(true);
        g2.setAttribute('opacity', 0);
        g1.parentNode.appendChild(g2);
        // squish small/large, zoom out
        var ss = 0.7, sl = 1.8, zo = 0.5;
        return animSeq([1/3, 1/3, 1/3], [
            t => {
                g1.setAttribute('transform', `rotate(${tw(0, -20, t)}) scale(${tw(1, zo, t)} ${tw(1, ss*zo, t)}) translate(${tw(0, -1.5, t)} ${tw(0, 0.5, t)})`);
            },
            t => {
                g1.setAttribute('transform', `rotate(${-20}) scale(${zo} ${tw(ss*zo, sl*zo, t)}) translate(${tw(-1.5, -2, t)} ${tw(0.5, -1.5, t)})`);
                g2.setAttribute('transform', `rotate(${20})  scale(${zo} ${tw(sl*zo, ss*zo, t)}) translate(${tw(2, 1.5, t)}   ${tw(-1.5, 0.5, t)})`);
                g1.setAttribute('opacity', 1-t);
                g2.setAttribute('opacity', t);
            },
            t => {
                g1.setAttribute('opacity', 0);
                g2.setAttribute('opacity', 1); // oops
                g2.setAttribute('transform', `rotate(${tw(20, 0, t)}) scale(${tw(zo, 1, t)} ${tw(ss*zo, 1, t)}) translate(${tw(1.5, 0, t)} ${tw(0.5, 0, t)})`);
            },
            t => {
                g1.setAttribute('transform', '');
                g1.setAttribute('opacity', 1);
                g2.setAttribute('opacity', 0);
            }
        ]);
    });

    anim(document.getElementById('home_puzzle'), 600, elt => {
        var p1 = elt.getElementsByTagName('path')[0], p2 = p1.cloneNode();
        p2.setAttribute('transform', 'translate(10, 0)');
        p1.parentNode.appendChild(p2);
        // zoom out, translation
        var zo = 0.25, tr = 0.77;
        return animSeq([1/3, 1/3, 1/3], [
            t => {
                p1.setAttribute('transform', `translate(${-t} 0) scale(${1-t*zo})`);
                p2.setAttribute('transform', `translate(${t} 0)  scale(${1-t*zo})`);
            },
            t => {
                p1.setAttribute('transform', `translate(${tw(-1, -tr*(1-zo), t)} 0) scale(${1-zo})`);
                p2.setAttribute('transform', `translate(${tw(1,   tr*(1-zo), t)} 0) scale(${1-zo})`);
            },
            t => {
                p1.setAttribute('transform', `translate(${tw(-tr*(1-zo), 0, t)} 0)    scale(${1-zo+zo*t})`);
                p2.setAttribute('transform', `translate(${tw( tr*(1-zo), tr*2, t)} 0) scale(${1-zo+zo*t})`);
                p2.setAttribute('opacity', 1-t);
            },
            t => {
                p1.setAttribute('transform', '');
                p2.setAttribute('opacity', 1);
                p2.setAttribute('transform', 'translate(10, 0)');
            }
        ]);
    });

    anim(document.getElementById('home_portfolio'), 600, elt => {
        var ps = elt.getElementsByTagName('path'), p1 = ps[0], p2 = ps[1];
        // distance/squish small/large
        var ds = 0.15, ss = 0.2, dl = 0.1, sl = 0.2;
        return animSeq([1/3, 1/3, 1/3], [
            t => {
                t = 1-(1-t)*(1-t);
                p1.setAttribute('transform', `translate(${t*ds} 0)  scale(${1-t*ss} 1)`);
                p2.setAttribute('transform', `translate(${-t*ds} 0) scale(${1-t*ss} 1)`);
            },
            t => {
                t = 1-(1-t)*(1-t);
                p1.setAttribute('transform', `translate(${tw(ds, -dl, t)} 0) scale(${tw(1-ss, 1+sl, t)} 1)`);
                p2.setAttribute('transform', `translate(${tw(-ds, dl, t)} 0) scale(${tw(1-ss, 1+sl, t)} 1)`);
            },
            t => {
                p1.setAttribute('transform', `translate(${-dl+dl*t} 0) scale(${1+sl-sl*t} 1)`);
                p2.setAttribute('transform', `translate(${dl-dl*t} 0)  scale(${1+sl-sl*t} 1)`);
            },
            t => {
                p1.setAttribute('transform', '');
                p2.setAttribute('transform', '');
            }
        ]);
    });

    anim(document.getElementById('home_conlang'), 600, elt => {
        var ps = elt.getElementsByTagName('path'), p0 = ps[0], p1 = ps[1], p2 = ps[2], p3 = ps[3];
        // angles, amplitude
        var a1 = Math.PI*0.75, a2 = Math.PI*0.55, a3 = Math.PI*0.3, amp = 0.3;
        return animSeq([1/3, 1/3, 1/3], [
            t => {
                p1.setAttribute('transform', `translate(${Math.sin(t*Math.PI)*amp*Math.cos(a1)} ${-Math.sin(t*Math.PI)*amp*Math.sin(a1)})`);
            },
            t => {
                p1.setAttribute('transform', '');
                p2.setAttribute('transform', `translate(${Math.sin(t*Math.PI)*amp*Math.cos(a2)} ${-Math.sin(t*Math.PI)*amp*Math.sin(a2)})`);
            },
            t => {
                p2.setAttribute('transform', '');
                p3.setAttribute('transform', `translate(${Math.sin(t*Math.PI)*amp*Math.cos(a3)} ${-Math.sin(t*Math.PI)*amp*Math.sin(a3)})`);
            },
            t => {
                p3.setAttribute('transform', '');
            }
        ]);
    });

});

function anim(elt, dur, fn) {
    var cb = fn(elt), going = false, evfunc = () => {
        if (going) return;
        going = true;
        var start, f = ts => {
            if (start === undefined) start = ts;
            if (ts - start < dur) cb((ts - start) / dur), requestAnimationFrame(f);
            else cb(1), going = false;
        };
        requestAnimationFrame(f);
    };
    elt.addEventListener('mouseenter', evfunc);
    elt.addEventListener('touchstart', evfunc, {passive: true});
}

function animSeq(durs, anims) {
    return ts => {
        if (ts == 1) return anims[anims.length-1](1);
        for (var i = 0; i < anims.length; ++i) {
            if (ts < durs[i]) return anims[i](ts / durs[i]);
            else ts -= durs[i];
        }
    };
}

function tw(a, b, t) { return a + (b-a)*t; }
