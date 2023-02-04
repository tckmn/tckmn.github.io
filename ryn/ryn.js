const aday = ['Pelor', 'Zehir', 'Melora', 'Kord', 'Avandra', 'Vecna'];
const eday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function now() { const d = new Date(); return eday[d.getDay()] + ' ' + d.getHours() + ':' + d.getMinutes(); }
function pad(x) { return (x < 10 ? '0' : '')+x; }
function estr(hour, tm) { return eday[hour / 24 | 0] + ' ' + pad(hour % 24) + ':' + pad(tm); }
function astr(hour, tm) { return aday[hour / 28 | 0] + ' ' + pad(hour % 28) + ':' + pad(tm); }

// return: which eh ah m
function go(input) {
    const x = input.toLowerCase();

    const t = x.match(/(\d+)(?::(\d+))?(?:\s*(p\.?m))?/);
    if (!t) return;
    const th = +t[1] + (t[3] ? 12 : 0);
    const tm = t[2] ? +t[2] : 0;

    const ad = aday.findIndex(d => x.includes(d.slice(0,3).toLowerCase()));
    const ed = eday.findIndex(d => x.includes(d.slice(0,3).toLowerCase()));

    const magic = 122;
    if (ad !== -1) {
        // if (th > 28) return;
        return [0, (28*ad + th + magic) % 168, (28*ad + th) % 168, tm];
    } else if (ed !== -1) {
        // if (th > 24) return;
        return [1, (24*ed + th) % 168, (24*ed + th + 168 - magic) % 168, tm];
    }
}

function chart(days, hours) {
    const ret = Array(days.length * hours);

    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    hr.appendChild(document.createElement('th'));
    days.forEach(day => {
        const h = document.createElement('th');
        h.appendChild(document.createTextNode(day.slice(0,3)));
        hr.appendChild(h);
    });
    thead.appendChild(hr);

    const tbody = document.createElement('tbody');
    for (let i = 0; i < hours; ++i) {
        const dr = document.createElement('tr');
        const dh = document.createElement('td');
        dh.appendChild(document.createTextNode(i));
        dr.appendChild(dh);
        days.forEach((day, j) => {
            const dd = document.createElement('td');
            ret[j*hours + i] = dd;
            dr.appendChild(dd);
        });
        tbody.appendChild(dr);
    }

    const chart = document.createElement('table');
    chart.appendChild(thead);
    chart.appendChild(tbody);
    document.getElementById('c').appendChild(chart);

    return ret;
}

window.addEventListener('load', () => {
    const i = document.getElementById('i'),
        o = document.getElementById('o'),
        o1 = document.getElementById('o1'),
        o2 = document.getElementById('o2');

    const ac = chart(aday, 28);
    const ec = chart(eday, 24);

    let timeout;
    const full = x => {
        Array.from(document.getElementsByClassName('active')).forEach(e => e.classList.remove('active'));

        let res;
        if (!x || x === 'now') {
            if (!timeout) timeout = setTimeout(() => {
                full(i.value);
            }, (61 - new Date().getSeconds()) * 1000);
            res = go(now());
        } else {
            if (timeout) clearTimeout(timeout);
            res = go(x);
        }

        if (res) {
            o.style.visibility = 'visible';
            const es = estr(res[1], res[3]),
                as = astr(res[2], res[3]);
            o1.textContent = res[0] ? es : as;
            o2.textContent = res[0] ? as : es;
            ec[res[1]].classList.add('active');
            ac[res[2]].classList.add('active');
        } else {
            o.style.visibility = 'hidden';
        }
    }

    full('');
    i.addEventListener('input', () => full(i.value));
    i.focus();
});
