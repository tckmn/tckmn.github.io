let g, gi, gim, gimg;

function gopen(imgs, starting) {
    document.body.style.overflow = 'hidden';
    gi = starting === undefined ? 0 : imgs.indexOf(starting);
    g.style.display = 'flex';
    gimg = imgs;
    gmove(0);
}

function gclose() {
    document.body.style.overflow = '';
    g.style.display = 'none';
    gim.src = '';
}

function gmove(dir) {
    gi += dir;
    if (gi < 0) gi = gimg.length-1;
    if (gi >= gimg.length) gi = 0;
    gim.src = 'pics/'+gimg[gi];
}

window.addEventListener('load', () => {
    g = document.getElementById('bundtgallery');
    gim = g.getElementsByTagName('img')[0];
    window.addEventListener('keydown', e => {
        if (e.key === 'Escape') gclose();
        else if (e.key === 'ArrowRight') gmove(1);
        else if (e.key === 'ArrowLeft') gmove(-1);
    });
    g.lastChild.firstChild.addEventListener('click', e => { e.stopPropagation(); gmove(-1); });
    g.lastChild.lastChild.addEventListener('click', e => { e.stopPropagation(); gmove(1); });
    g.addEventListener('click', () => gclose());
    for (const b of document.getElementsByClassName('bimg')) {
        const imgs = b.dataset.gallery.split(' ');
        for (const img of b.getElementsByTagName('img')) {
            img.addEventListener('click', () => gopen(imgs, img.src.replace(/^.*icon_/, 'small_')));
        }
        b.lastChild.addEventListener('click', e => {
            e.preventDefault();
            gopen(imgs);
        });
    }
});
