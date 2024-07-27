const ph = 150, pw = 250;

function clr(el) { while (el.firstChild) el.removeChild(el.firstChild); }

function add(parent, el, o) {
    const child = document.createElement(el);
    if (o.txt) child.textContent = o.txt;
    if (o.cls) for (const c of o.cls.split(' ')) child.classList.add(c);
    parent.appendChild(child);
    return child;
}

function stxt2(parent, str) {
    for (const txt of str.split(/(\[[^\]]+\])/)) {
        if (txt[0] === '[') {
            add(parent, 'span', { cls: 'stse' });
        } else parent.appendChild(document.createTextNode(txt));
    }
}
function stxt(parent, str) {
    for (const txt of str.split(/(\([^)]+\))/)) {
        if (txt[0] === '(') {
            stxt2(add(parent, 'span', { cls: 'stsu' }), txt);
        } else stxt2(parent, txt);
    }
}

function dcol(d) {
    if (d.indexOf('[R]') !== -1) return 'stscr';
    if (d.indexOf('[G]') !== -1) return 'stscg';
    if (d.indexOf('[B]') !== -1) return 'stscb';
    if (d.indexOf('[W]') !== -1) return 'stscp';
}
function col(el) {
    return Array.from(el.classList).find(x => x.slice(0,4) === 'stsc');
}

window.addEventListener('load', () => {
    const popup = add(document.body, 'div', { cls: 'stspopup stshidden' }),
        ptitle = add(popup, 'div', { cls: 'stsptitle' }),
        pbody = add(popup, 'div', { cls: 'stspbody' });

    let touching = false;
    for (const el of Array.from(document.getElementsByClassName('sts'))) {
        const go = e => {
            popup.style.left = Math.max(e.pageX - pw, scrollX) + 'px';
            popup.style.top = Math.max(e.pageY - ph, scrollY) + 'px';
        };
        el.addEventListener('pointerenter', e => {
            const desc = el.dataset.desc.split('/');
            clr(ptitle); clr(pbody);
            add(ptitle, 'div', { txt: el.textContent.split('+')[0], cls: 'stsname' });
            if (desc[1]) stxt(add(ptitle, 'div', { cls: 'stscost' }), desc[1] + ' [E]');
            stxt(pbody, desc[0]);
            popup.classList.remove(col(popup));
            popup.classList.add(dcol(desc[0]) || col(el));
            popup.classList.remove('stshidden');
            go(e);
        });
        el.addEventListener('pointermove', e => {
            go(e);
        });
        el.addEventListener('pointerleave', e => {
            if (!touching) popup.classList.add('stshidden');
        });
        el.addEventListener('touchstart', e => {
            e.stopPropagation();
            touching = true;
        });
    }

    document.body.addEventListener('touchstart', () => {
        popup.classList.add('stshidden');
        touching = false;
    });
});
