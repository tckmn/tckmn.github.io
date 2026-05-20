let tooltip;
function el(name, props) {
    const el = name === 'svg' || name === 'path' ?
        document.createElementNS('http://www.w3.org/2000/svg', name) :
        document.createElement(name);
    if (props) for (prop in props) {
        if (prop === 'text') el.appendChild(document.createTextNode(props.text));
        else if (prop === 'children') props.children.forEach(ch => {
            if (typeof ch === 'string') el.appendChild(document.createTextNode(ch));
            else if (ch) el.appendChild(ch);
        });
        else if (prop === 'tooltip') {
            if (props.tooltip) {
                el.addEventListener('pointerenter', () => { tooltip.textContent = props.tooltip; tooltip.style.setProperty('display', 'block'); });
                el.addEventListener('pointermove', e => {
                    tooltip.style.setProperty('top', Math.max(0,e.clientY-tooltip.getBoundingClientRect().height)+'px');
                    tooltip.style.setProperty('left', Math.max(0,e.clientX-tooltip.getBoundingClientRect().width)+'px');
                });
                el.addEventListener('pointerleave', () => tooltip.style.setProperty('display', 'none'));
            }
        }
        else if (prop.slice(0,2) === 'on') el.addEventListener(prop.slice(2), props[prop]);
        else el.setAttribute(prop[0] === '_' ?
                prop.slice(1) :
                prop.replace(/[A-Z]/g, m => '-'+m.toLowerCase()),
            props[prop]);
    }
    return el;
}

let activeMenu;
function toggleMenu(menu) {
    if (activeMenu === menu) return closeMenu();
    if (activeMenu) closeMenu();
    menu.classList.remove('hide');
    activeMenu = menu;
    document.getElementById('shade').style.setProperty('display', 'block');
}
function closeMenu() {
    activeMenu.classList.add('hide');
    activeMenu = undefined;
    document.getElementById('shade').style.setProperty('display', 'none');
}

function toast(msg) {
    const alerts = document.getElementById('alerts');
    const elt = document.createElement('div');
    elt.textContent = msg;
    const rm = () => { elt.remove(); };
    elt.addEventListener('click', rm);
    setTimeout(rm, Math.max(3000, 250*msg.length));
    alerts.prepend(elt);
}

function addname(arr, name, src) { for (const [a,b] of arr) if (a === name) { b.push(src); return; } arr.push([name, [src]]); }
function rclass(result) { return {poly: 'poly', hardASP: 'asp', hardNP: 'np'}[result] || 'np'; }
function rtext(result) { return {poly: 'polytime', hardASP: 'ASP-complete', hardNP: 'NP-complete'}[result] || 'NP-complete'; }
function tathamlink(name) { return name.toLowerCase().replace(/[^a-z]/g, '').replace(/^rectangles$/, 'rect'); }
function crossalink(name) { return name.replace(/\W+/g, ' ').split(' ').map(w => w[0].toUpperCase()+w.slice(1)).join('').replace('1', 'One').replace('NoFourInARow', 'NoFour'); }
function cite(citation) {
    // taken from google scholar
    return el('svg', {
        class: 'cite',
        _viewBox: '-0.5 0 16 16',
        children: [ el('path', {
            d: 'M6.5 3.5H1.5V8.5H3.75L1.75 12.5H4.75L6.5 9V3.5zM13.5 3.5H8.5V8.5H10.75L8.75 12.5H11.75L13.5 9V3.5z'
        }) ],
        onclick: e => {
            e.stopPropagation();
            navigator.clipboard.writeText(citation).then(() => {
                toast('copied citation to clipboard!');
            }, e => {
                toast(`failed to copy citation to clipboard: ${e}`);
            })
        }
    });
}
function mkdiagrams(diagrams, toolbox) {
    const cleanups = [];
    return {
        cont: el('div', {
            class: 'cell diagrams',
            children: diagrams.map(([name, tabs]) => {
                const g = Gratility.create(300, 300, tabs[0][1], toolbox || '*x');
                cleanups.push(g.cleanup);
                return el('div', {
                    children: [
                        el('div', { children: [
                            name.replace(/_/g, ' ') + ' (',
                            ...tabs.flatMap(tab => [
                                ' • ',
                                el('a', {
                                    class: 'novisit',
                                    href: '#',
                                    text: tab[0].split(':')[0],
                                    onclick: e => {
                                        e.preventDefault();
                                        g.set(tab[1], tab[0].includes(':') ? tab[0].split(':')[1].split(',').map(x=>+x) : undefined);
                                    }
                                })
                            ]).slice(1),
                            ')'
                        ] }),
                        g.svg
                    ]
                });
            })
        }),
        cleanup: () => { for (const f of cleanups) f(); }
    };
}

const ipt = {};

function generate() {
    const cont = document.getElementById('cont');
    while (cont.firstChild) cont.firstChild.remove();

    for (const header of ['puzzle', 'hardness', 'reduction']) {
        cont.append(el('div', {
            class: 'header',
            text: header
        }));
    }

    const puz = puzzles.filter(x => x);
    puz.sort((a,b) => a.name.localeCompare(b.name));

    let countp = 0, countr = 0, counto = 0;
    for (const p of puz) {
        // TODO all of this sucks lol
        const goodres = p.results ? p.results.filter(r => ipt[rclass(r.result)].checked && (!ipt.interactive.checked || r.diagrams)) : [];
        if (ipt.interactive.checked && !goodres.length) continue;
        if (ipt.best.checked) {
            goodres.sort((a,b) => {
                if (a.result === 'hardASP' && b.result !== 'hardASP') return -1;
                if (b.result === 'hardASP' && a.result !== 'hardASP') return 1;
                if (!a.year && !b.year) return 0;
                if (!a.year) return 1;
                if (!b.year) return -1;
                return a.year - b.year;
            });
            goodres.splice(1, goodres.length);
        }

        const classes = goodres.map(r => rclass(r.result));
        if (!(ipt.asp.checked && classes.includes('asp') ||
            ipt.np.checked && classes.includes('np') ||
            ipt.poly.checked && classes.includes('poly') ||
            ipt.open.checked && !classes.length)) continue;

        if (!(ipt.pzv.checked && p.pzven ||
            ipt.tatham.checked && p.tathamname ||
            ipt.crossa.checked && p.crossaname ||
            ipt.janko.checked && p.jankoname ||
            ipt.other.checked && !(p.pzven || p.tathamname || p.crossaname || p.jankoname))) continue;


        countp += 1;
        countr += goodres.length;
        counto += +!goodres.length;

        const row = el('div', { class: 'row' });
        cont.append(row);

        const names = [[p.name, []]];
        if (p.pzven) addname(names, p.pzven, 'pzv');
        if (p.tathamname) addname(names, p.tathamname, 'tatham');
        if (p.crossaname) addname(names, p.crossaname, 'cross+a');
        if (p.jankoname) addname(names, p.jankoname, 'janko');
        if (p.altnames) names.push([p.altnames, []]);

        row.append(el('div', {
            class: 'cell name',
            style: `grid-row: span ${goodres.length || 1}`,
            children: [
                el('div', {
                    class: 'pname',
                    children: [
                        el('strong', {
                            text: p.name,
                            tooltip: names[0][1].join(', ')
                        }),
                        names.length>1 ? el('em', {
                            children: [
                                '(aka: ',
                                ...names.slice(1).flatMap(([a,b],i) => [el('span', {
                                    text: a,
                                    tooltip: b.join(', ')
                                })].concat(i === names.length-2 ? [] : [', '])),
                                ')'
                            ]
                        }) : undefined
                    ]
                }),
                el('div', {
                    class: 'icons',
                    children: [
                        p.pzvcode ? el('a', { href: `https://pzprxs.vercel.app/rules.html?${p.pzvcode}`, children: [ el('img', { src: 'img/puzzlink.png', class: 'icon', alt: 'pzv', title: 'pzv' }) ] }) : undefined,
                        p.tathamname ? el('a', { href: `https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/${tathamlink(p.tathamname)}.html`, children: [ el('img', { src: 'img/tatham.png', class: 'icon', alt: 'tatham', title: 'tatham' }) ] }) : undefined,
                        p.jankoid ? el('a', { href: `https://www.janko.at/Raetsel/${p.jankoid}/index.htm`, children: [ el('img', { src: 'img/janko.png', class: 'icon', alt: 'janko', title: 'janko' }) ] }) : undefined,
                        p.crossaname ? el('a', { href: `https://www.cross-plus-a.com/puzzles.htm#${crossalink(p.crossaname)}`, children: [ el('img', { src: 'img/crossa.png', class: 'icon', alt: 'crossa', title: 'crossa' }) ] }) : undefined,
                    ]
                })
            ]
        }));

        if (goodres.length) {
            for (const r of goodres) {
                let diagrams; // TODO cleanup if generate() called again
                const rdiv = el('div', {
                    class: 'resrow',
                    onclick: () => {
                        if (r.diagrams) {
                            if (diagrams) { diagrams.cleanup(); diagrams.cont.remove(); diagrams = undefined; }
                            else rdiv.after((diagrams = mkdiagrams(r.diagrams, p.toolbox)).cont);
                        }
                    },
                    children: [
                        el('div', {
                            class: `cell result ${rclass(r.result)}`,
                            text: rtext(r.result)
                        }),
                        el('div', {
                            class: 'cell reduction',
                            children: [el('span', { children: (r.diagrams ? [
                                el('img', { class: 'interactive', src: 'img/interactive.svg', alt: 'interactive', title: 'interactive' }), ' '
                            ] : []).concat(r.year ? [
                                r.reduction + ' [',
                                el('a', {
                                    text: r.year,
                                    tooltip: `"${r.source.title}" (${r.source.authors})`,
                                    href: r.source.link
                                }),
                                '] ',
                                cite(r.citation)
                            ] : [r.reduction]) })]
                        })
                    ]
                });
                row.append(rdiv);
            }
        } else {
            row.append(el('div', {
                class: 'cell result open',
                text: 'open'
            }));
        }
    }

    document.getElementById('countp').textContent = countp;
    document.getElementById('countr').textContent = countr;
    document.getElementById('counto').textContent = counto;
}

window.addEventListener('load', () => {
    tooltip = document.getElementById('tooltip');

    for (const elt of document.querySelectorAll('input[data-filt]')) {
        ipt[elt.dataset.filt] = elt;
        elt.addEventListener('change', generate);
    }

    const genreMenu = document.getElementById('genresub');
    document.getElementById('genre').addEventListener('click', e => {
        e.preventDefault();
        toggleMenu(genreMenu);
    });

    const helpMenu = document.getElementById('helppopup');
    document.getElementById('help').addEventListener('click', e => {
        toggleMenu(helpMenu);
    });

    document.getElementById('shade').addEventListener('click', e => {
        e.stopPropagation();
        closeMenu();
    });

    generate();
});
