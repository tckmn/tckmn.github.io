const $ = document.querySelector.bind(document), dim = 1000;

window.addEventListener('load', () => {
    const ctx = $('#c').getContext('2d'), ipt = $('#i');
    ipt.addEventListener('change', go);
    $('#v').addEventListener('change', go);

    $('#r').addEventListener('click', () => {
        let s = Array(+$('#n').value).fill().map((_, i) => i.toString(36));
        for (let i = s.length - 1; i > 0; --i) {
            let j = Math.random() * (i+1) | 0,
                tmp = s[i];
            s[i] = s[j];
            s[j] = tmp;
        }
        ipt.value = s.join('');
        go();
    });

    $('#s').addEventListener('click', () => {
        let img = document.createElement('img');
        img.setAttribute('src', $('#c').toDataURL());
        $('#img').prepend(img);
    });
});

function go() {
    const ctx = $('#c').getContext('2d'),
        data = $('#i').value.split(''),
        orig = data.map(row => data.map((_, i) => parseInt(row,36) === i)),
        posgreedy = gen(orig, 1),
        neggreedy = gen(orig, -1),
        greedy = gen(orig, 0);

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, dim, dim);
    draw(ctx, greedy, 0.1, '#36f');
    if ($('#v').checked) {
        draw(ctx, posgreedy, 0.1, '#080');
        draw(ctx, neggreedy, 0.1, '#e80');
        draw(ctx, greedy, 0.05, '#fff');
    }
    draw(ctx, orig, 0.1, '#000');
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

    console.log(pts);
    return pts;
}

function draw(ctx, pts, sz, clr) {
    const f = dim*0.9/(pts.length-1), pad = dim*0.05;
    ctx.fillStyle = clr;
    pts.forEach((row, y) => {
        row.forEach((p, x) => {
            if (p) {
                ctx.beginPath();
                ctx.arc(x*f+pad, y*f+pad, sz*f, 2*Math.PI, false);
                ctx.fill();
            }
        });
    });
}
