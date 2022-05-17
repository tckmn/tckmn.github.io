window.addEventListener('load', () => {

    var setp = x => { document.getElementById('pdata').value = x; return x; };
    var list = document.getElementById('list');
    var drags = Array.from(list.children);
    var offset = drags[0].getBoundingClientRect();
    offset = (offset.bottom - offset.top) / 2;
    var active;

    drags.forEach(ch => {
        var dragger = document.createElement('span');
        dragger.textContent = '𝄘';
        ch.prepend(dragger);
        dragger.addEventListener('pointerdown', () => {
            if (active) active.classList.remove('active');
            active = ch;
            active.classList.add('active');
        });
        window.addEventListener('pointerup', () => {
            if (active) active.classList.remove('active');
            active = undefined;
        });
    });

    window.addEventListener('pointermove', e => {
        if (!active) return;
        e.preventDefault();
        var winning = -999999, winner;
        drags.forEach(el => {
            var diff = e.clientY - el.getBoundingClientRect().top - offset;
            if (diff < 0 && diff > winning) {
                winning = diff
                winner = el;
            }
        });
        if (winner !== active.nextSibling) {
            active.parentNode.insertBefore(active, winner);
            localStorage.setItem('saved', setp(Array.from(list.children).map(x => x.id.slice(1)).join(',')));
        }
    });

    document.body.addEventListener('touchmove', e => {
        if (active) e.preventDefault();
    }, { passive: false });

    if (localStorage.saved) {
        setp(localStorage.saved).split(',').forEach(x => {
            var el = document.getElementById('p'+x);
            el.parentNode.insertBefore(el, null);
        });
    }

    var n = document.getElementById('name');
    n.addEventListener('input', () => localStorage.setItem('name', n.value));
    if (localStorage.name) n.value = localStorage.name;

});
