const $ = document.querySelector.bind(document),
    colors = {
        classic:      { orig: '#000', posgreedy: '#080', neggreedy: '#e80', greedy: '#36f', greedy2: '#fff' },
        highcontrast: { orig: '#000', posgreedy: '#0f0', neggreedy: '#f00', greedy: '#00f', greedy2: '#fff' },
        nobagels:     { orig: '#000', posgreedy: '#3d3', neggreedy: '#e80', greedy: '#fff', greedy2: '#00f' },
    },
    hist = [], cdata = [], cocreateGrid = 37.76;

let histpos = 0, tries = 0;

window.addEventListener('load', () => {
    $('#i').addEventListener('change', go);
    $('#v').addEventListener('change', go);
    $('#ptsz').addEventListener('input', go);
    $('#imsz').addEventListener('input', go);
    $('#c').addEventListener('change', go);
    $('#r').addEventListener('click', randgen);

    Object.keys(colors).forEach(k => {
        const opt = document.createElement('option');
        opt.appendChild(document.createTextNode(k));
        $('#c').appendChild(opt);
    });

    document.addEventListener('keydown', e => {
        switch (e.key) {
            case 'z':
                if (histpos > 0) {
                    $('#i').value = hist[--histpos];
                    go();
                }
                break;
            case 'x':
                if (histpos < hist.length-1) {
                    $('#i').value = hist[++histpos];
                    go();
                }
                break;
        }
    });

    document.addEventListener('copy', e => {
        e.preventDefault();
        e.clipboardData.setData('application/cocreate-objects', JSON.stringify(cdata));
    });

    // debug
    document.addEventListener('paste', e => {
        console.log(e.clipboardData.getData('application/cocreate-objects'));
    });
});

function randgen() {
    const b = +$('#b').value, n = +$('#n').value;
    let found = !b, data;

    for (let t = 0; t < 1000 && (!t || !found); ++t) {
        // make a pointset
        data = Array(n).fill().map((_, i) => i);
        for (let i = data.length - 1; i > 0; --i) {
            let j = Math.random() * (i+1) | 0, tmp = data[i];
            data[i] = data[j];
            data[j] = tmp;
        }

        // compute greedies
        const orig = data.map(row => data.map((_, i) => row === i)),
            posgreedy = gen(orig, 1),
            neggreedy = gen(orig, -1),
            greedy = gen(orig, 0);

        // check stopping condition
        for (let y = 0; y < orig.length; ++y) {
            let count = 0;
            for (let x = 0; x < orig.length; ++x) {
                if (posgreedy[y][x] || neggreedy[y][x]) {
                    count = 0;
                } else if (greedy[y][x]) {
                    if (++count >= b) found = true;
                }
            }
        }
    }

    if (found) {
        tries = 0;
        $('#i').value = data.map(x => x.toString(36)).join('');
        go();
    } else {
        $('#i').value = (tries+=1000) + ' tries...';
        setTimeout(randgen, 0);
    }
}

function go() {
    const val = $('#i').value,
        data = val.split('').map(c => parseInt(c, 36)),
        orig = data.map(row => data.map((_, i) => row === i)),
        posgreedy = gen(orig, 1),
        neggreedy = gen(orig, -1),
        greedy = gen(orig, 0);

    drawSVG(orig, posgreedy, neggreedy, greedy);

    if (val !== hist[histpos]) {
        hist.splice(histpos+1, hist.length, val);
        histpos = hist.length-1;
    }
}

function gen(pts, sign) {
    // make a copy
    pts = pts.map(x => x.slice());
    // uppermost point in each column below currently scanned row
    const top = pts.map(_ => pts.length);

    for (let y = pts.length-1; y >= 0; --y) {
        let px = pts[y].indexOf(true), h;
        if (sign >= 0) {
            h = top[px];
            for (let x = px-1; x >= 0; --x) {
                if (top[x] < h) {
                    h = top[x];
                    top[x] = y;
                    pts[y][x] = true;
                }
            }
        }
        if (sign <= 0) {
            h = top[px];
            for (let x = px+1; x < pts.length; ++x) {
                if (top[x] < h) {
                    h = top[x];
                    top[x] = y;
                    pts[y][x] = true;
                }
            }
        }
        top[px] = y;
    }

    return pts;
}

function drawSVG(orig, posgreedy, neggreedy, greedy) {
    const out = $('#out'), svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', $('#imsz').value+'px');
    svg.setAttribute('height', $('#imsz').value+'px');
    svg.setAttribute('viewBox', '0 0 1 1');
    if (out.firstChild) out.removeChild(out.firstChild);
    out.appendChild(svg);

    cdata.splice(0);
    const scheme = $('#c').value,
        v = $('#v').checked,
        ptsz = $('#ptsz').value / 250,
        pad = 0.01+1.1*ptsz/(orig.length-1),
        f = (1-2*pad)/(orig.length-1),
        add = (x,y,r,c,o) => {
            const circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circ.setAttribute('cx', x*f+pad);
            circ.setAttribute('cy', y*f+pad);
            circ.setAttribute('r', r*ptsz*f);
            circ.setAttribute('fill', c);

            // right click to delete
            o && circ.addEventListener('mousedown', e => {
                if (e.button === 2 && $('#i').value.length > 2) {
                    const data = $('#i').value.split('').map(d => {
                        d = parseInt(d, 36);
                        return (d < x ? d : d-1).toString(36);
                    });
                    data.splice(y, 1);
                    $('#i').value = data.join('');
                    go();
                }
            });

            svg.appendChild(circ);

            cdata.push({
                type: 'poly',
                pts: [{x: x*cocreateGrid, y: y*cocreateGrid}, {x: x*cocreateGrid, y: y*cocreateGrid}],
                color: c,
                width: r === 1 ? 12 : 5
            });
        };

    cdata.push({ type: 'text', pts: [{x: 0, y: 0}], color: '#000', fontSize: 19, tx: 0, ty: -20, text: $('#i').value });

    // allow right clicks to pass through
    svg.addEventListener('contextmenu', e => e.preventDefault());

    // left click to add
    const clickpt = svg.createSVGPoint();
    svg.addEventListener('mousedown', e => {
        if (e.button === 0 && $('#i').value.length < 36) {
            clickpt.x = e.clientX; clickpt.y = e.clientY;
            const pt = clickpt.matrixTransform(svg.getScreenCTM().inverse()),
                x = Math.ceil((pt.x-pad)/f), y = Math.ceil((pt.y-pad)/f),
                data = $('#i').value.split('').map(d => {
                    d = parseInt(d, 36);
                    return (d < x ? d : d+1).toString(36);
                });
            data.splice(y, 0, x.toString(36));
            $('#i').value = data.join('');
            go();
        }
    });

    orig.forEach((_, y) => {
        orig.forEach((_, x) => {
            const clr =
                orig[y][x] ? colors[scheme].orig :
                v && posgreedy[y][x] ? colors[scheme].posgreedy :
                v && neggreedy[y][x] ? colors[scheme].neggreedy :
                greedy[y][x] ? colors[scheme].greedy : 0;
            if (clr) add(x, y, 1, clr, orig[y][x]);
            if (v && !orig[y][x] && greedy[y][x]) add(x, y, 0.5, colors[scheme].greedy2, false);
        });
    });
}

// OLD CANVAS RENDERING
// function drawCanvas(ctx, pts, sz, clr) {
//     const dim = +$('#cnv').getAttribute('width'), f = dim*0.9/(pts.length-1), pad = dim*0.05;
//     ctx.fillStyle = clr;
//     pts.forEach((row, y) => {
//         row.forEach((p, x) => {
//             if (p) {
//                 ctx.beginPath();
//                 ctx.arc(x*f+pad, y*f+pad, sz*f, 2*Math.PI, false);
//                 ctx.fill();
//             }
//         });
//     });
// }

// in go():
// const ctx = ctx = $('#cnv').getContext('2d');
// ctx.fillStyle = 'white';
// ctx.fillRect(0, 0, dim, dim);
// drawCanvas(ctx, greedy, ptsz, '#36f');
// if ($('#v').checked) {
//     drawCanvas(ctx, posgreedy, ptsz, '#080');
//     drawCanvas(ctx, neggreedy, ptsz, '#e80');
//     drawCanvas(ctx, greedy, ptsz/2, '#fff');
// }
// drawCanvas(ctx, orig, ptsz, '#000');

// in onload:
// $('#s').addEventListener('click', () => {
//     let img = document.createElement('img');
//     img.setAttribute('src', $('#cnv').toDataURL());
//     $('#img').prepend(img);
// });
