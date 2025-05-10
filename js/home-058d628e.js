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
        const a1 = Math.PI*0.75, a2 = Math.PI*0.55, a3 = Math.PI*0.3, amp = 0.3;
        // rotation
        const rx = 0.07, ry = 0.32, rf = t => (1-(1-t)*(1-t))*360;
        return animSeq([1/3, 1/3, 1/3], [
            t => {
                p1.setAttribute('transform', `translate(${Math.sin(t*Math.PI)*amp*Math.cos(a1)} ${-Math.sin(t*Math.PI)*amp*Math.sin(a1)})`);
                p0.setAttribute('transform', `translate(${rx} ${ry}) rotate(${rf(t/3)}) translate(${-rx}, ${-ry})`)
            },
            t => {
                p1.setAttribute('transform', '');
                p2.setAttribute('transform', `translate(${Math.sin(t*Math.PI)*amp*Math.cos(a2)} ${-Math.sin(t*Math.PI)*amp*Math.sin(a2)})`);
                p0.setAttribute('transform', `translate(${rx} ${ry}) rotate(${rf((1+t)/3)}) translate(${-rx}, ${-ry})`)
            },
            t => {
                p2.setAttribute('transform', '');
                p3.setAttribute('transform', `translate(${Math.sin(t*Math.PI)*amp*Math.cos(a3)} ${-Math.sin(t*Math.PI)*amp*Math.sin(a3)})`);
                p0.setAttribute('transform', `translate(${rx} ${ry}) rotate(${rf((2+t)/3)}) translate(${-rx}, ${-ry})`)
            },
            t => {
                p3.setAttribute('transform', '');
                p0.setAttribute('transform', '');
            }
        ]);
    });

    anim(document.getElementById('home_squares'), 600, elt => {
        let ps = elt.getElementsByTagName('path'), p0 = ps[0], p1 = ps[1];

        // coordinate system conversions
        const c2p = (x, y) => [Math.sqrt(x*x + y*y), Math.atan2(y, x)];
        const p2c = (r, th) => (r * Math.cos(th)) + ' ' + (r * Math.sin(th));

        // generate polar coords for blocks
        const resolution = 20;
        const scale = 4.5;

        let pts0 = [];
        for (let i = 0; i <= resolution; ++i) pts0.push(c2p(-1 + 4*(i/resolution), -3));
        for (let i = 0; i <= resolution; ++i) pts0.push(c2p(3, -3 + 4*(i/resolution)));
        for (let i = 0; i <= resolution; ++i) pts0.push(c2p(3 - 4*(i/resolution), 1));
        for (let i = 0; i <= resolution; ++i) pts0.push(c2p(-1, 1 - 4*(i/resolution)));

        let pts1 = [];
        for (let i = 0; i <= resolution; ++i) pts1.push(c2p(-3 + 4*(i/resolution), -1));
        for (let i = 0; i <= resolution; ++i) pts1.push(c2p(1, -1 + 4*(i/resolution)));
        for (let i = 0; i <= resolution; ++i) pts1.push(c2p(1 - 4*(i/resolution), 3));
        for (let i = 0; i <= resolution; ++i) pts1.push(c2p(-3, 3 - 4*(i/resolution)));

        return ts => {
            const exp = 2 - 4*(ts - 0.5)*(ts - 0.5);
            p0.setAttribute('d', 'M ' + pts0.map(p => p2c(Math.pow(p[0]/scale, exp) * scale, p[1]*exp)).join(' L '));
            p1.setAttribute('d', 'M ' + pts1.map(p => p2c(Math.pow(p[0]/scale, exp) * scale, p[1]*exp)).join(' L '));
        };
    });

    anim(document.getElementById('home_food'), 600, elt => {
        const gs = elt.getElementsByTagName('g'), gout = gs[2], gin = gs[3];
        const ps = elt.getElementsByTagName('path'), pb1 = ps[0], pb2 = ps[1];
        const randomize = obj => {
            obj.x = Math.random()-0.5;
            obj.y = 0.4;
            obj.vx = Math.random()-0.5;
            obj.vy = Math.random()-2;
            obj.e.setAttribute('r', Math.random()*0.06+0.04);
            obj.e.setAttribute('opacity', 0);
            return obj;
        };
        const cs = [0,0,0].map(_ => {
            const e = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            e.setAttribute('class', 'secfill');
            e.setAttribute('stroke', 'none');
            e.setAttribute('mask', 'url(#foodmask)');
            gs[1].appendChild(e);
            return randomize({e: e});
        });
        return ts => {
            const tt = ts*4*Math.PI;
            gout.setAttribute('transform', `translate(${0.2*Math.cos(tt)-0.1} ${0.2*Math.sin(tt)})`);
            gin.setAttribute('transform', `translate(1 1) rotate(${tw(30, 40, Math.sin(Math.PI/6+tt))}) translate(-1 -1)`);
            const bowl = `translate(1 1) rotate(${tw(-3, 3, Math.sin(Math.PI/6+tt/2))}) translate(-1 -1)`;
            pb1.setAttribute('transform', bowl);
            pb2.setAttribute('transform', bowl);
            if (ts === 1) cs.forEach(randomize);
            else for (const c of cs) {
                c.e.setAttribute('opacity', 1-ts);
                c.e.setAttribute('transform', `translate(${1+c.x+ts*c.vx} ${1+c.y+ts*c.vy+ts*ts})`);
            }
        };
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
