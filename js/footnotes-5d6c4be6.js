window.addEventListener('load', () => {

    const pmaxh = 350, pw = 360, pp = 10, pb = 2;

    const popup = document.createElement('div');
    popup.style.width = `${pw-pp*2}px`;
    // popup.style.maxHeight = `${pmaxh-pp*2}px`;
    popup.style.padding = `${pp}px`;
    popup.classList.add('footnotepopup');
    document.body.append(popup);

    for (const link of Array.from(document.getElementsByClassName('footnote'))) {
        if (link.tagName !== 'A') continue;
        const tgt = link.href.split('#')[1];
        link.addEventListener('click', e => {
            e.preventDefault();
            document.getElementById(tgt).scrollIntoView();
        });

        if (tgt.slice(0,8) === 'footnote') {
            let ph = pmaxh;

            const go = e => {
                popup.style.left = Math.max(e.pageX - pw - pb*2, scrollX) + 'px';
                popup.style.top = Math.max(e.pageY - ph - pb*2, scrollY) + 'px';
            };

            link.addEventListener('pointerenter', e => {
                const clone = document.getElementById(tgt+'ctnt').cloneNode(true);
                clone.removeAttribute('id');
                while (popup.firstChild) popup.firstChild.remove();
                popup.append(clone);
                popup.style.display = 'block';
                ph = popup.getBoundingClientRect().height;
                go(e);
            });
            link.addEventListener('pointermove', e => {
                go(e);
            });
            link.addEventListener('pointerleave', e => {
                popup.style.display = 'none';
            });
        }
    }

});
