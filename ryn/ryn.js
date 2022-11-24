const aday = ['Pelor', 'Zehir', 'Melora', 'Kord', 'Avandra', 'Vecna'];
const eday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function pad(x) { return (x < 10 ? '0' : '')+x; }

function go(input) {
    const x = input.toLowerCase();

    const t = x.match(/(\d+)(?::(\d+))?/);
    if (!t) return;
    const th = +t[1];
    const tm = t[2] ? +t[2] : 0;

    const ad = aday.findIndex(d => x.includes(d.slice(0,3).toLowerCase()));
    const ed = eday.findIndex(d => x.includes(d.slice(0,3).toLowerCase()));

    if (ad !== -1) {
        if (th > 28) return;
        const hour = (28*ad + th + 97) % 168;
        return eday[hour / 24 | 0] + ' ' + pad(hour % 24) + ':' + pad(tm);
    } else if (ed !== -1) {
        if (th > 24) return;
        const hour = (24*ed + th + 71) % 168;
        return aday[hour / 28 | 0] + ' ' + pad(hour % 28) + ':' + pad(tm);
    }
}

window.addEventListener('load', () => {
    const i = document.getElementById('i'),
        o = document.getElementById('o');
    i.addEventListener('input', () => {
        o.textContent = go(i.value);
    });
    i.focus();
});
