const data = [[[12,1176],[13,7745],[14,7763],[15,7696],[16,7775],[17,2212],[27,6223],[28,7315],[29,7260],[30,7337],[31,6627],[32,5189],[33,6246],[34,9914],[35,10106],[36,4757],[37,4873],[38,1134]],
[[17,5484],[18,7712],[19,7770],[20,7685],[21,5721],[27,4579],[28,5186],[29,8373],[30,10109],[31,10482],[32,12135],[33,11057],[34,7254],[35,7343],[36,342]],
[[0,3606],[21,2115],[22,9359],[23,12777],[24,13542],[25,17826],[26,11181],[27,5488],[28,4733],[29,1577],[36,6913],[37,7206],[38,7259],[39,7255]],
[[0,3816],[1,7269],[18,4048],[19,5283],[2,7273],[20,7777],[21,10029],[22,8326],[23,4694],[24,4339],[26,6400],[27,7644],[28,7708],[29,7728],[3,7324],[30,4830],[4,6887]],
[[13,1133],[14,5163],[15,5249],[16,9950],[17,9887],[18,5906],[19,4798],[20,2174],[30,2902],[31,7756],[32,7733],[33,7700],[34,7744],[35,486],[4,488],[5,7356],[6,7345],[7,7187],[8,7269],[9,2751]],
[[10,12401],[11,14623],[12,17159],[13,14766],[14,4890],[15,4711],[16,44],[35,7293],[36,7627],[37,7763],[38,7797],[39,3952],[9,7924]],
[[0,7756],[1,7704],[10,4772],[11,2781],[13,1335],[14,7369],[15,7235],[16,7311],[17,7337],[18,1948],[2,7748],[3,7467],[39,3682],[4,503],[5,5268],[6,5300],[7,9364],[8,10065],[9,6531]],
[[0,2841],[1,5141],[18,5364],[19,7340],[2,6724],[20,7172],[21,7233],[22,5283],[3,10371],[4,17081],[5,12419],[6,12492],[7,8277],[8,3137]],
[[0,7223],[1,4814],[10,7740],[11,7719],[12,6535],[2,3208],[22,2137],[23,7310],[24,7286],[25,7185],[26,7226],[27,1155],[36,5114],[37,5182],[38,8945],[39,9797],[8,4619],[9,7735]]];

function go(cells, locs) {
    for (const [box, lbl] of cells) {
        box.style.display = 'none';
        lbl.style.display = 'none';
    }
    const sum = data[locs].reduce((acc,loc) => acc+loc[1], 0);
    for (const [loc, cnt] of data[locs]) {
        const [box, lbl] = cells[loc];
        box.style.display = 'block';
        lbl.style.display = 'flex';
        //box.style.opacity = 5*cnt/sum;
        lbl.textContent = (100*cnt/sum).toFixed(1)+'%';
    }
}

window.addEventListener('load', () => {
    const div = document.getElementById('divination');
    const gold = document.getElementById('divgold');

    div.style.display = 'inline-grid';
    div.style.gap = '1px';

    for (let i = 0; i < 11; ++i) {
        const w = Math.min(11, 15-2*Math.abs(5-i));
        for (let j = 0; j < w; ++j) {
            const el = document.createElement('div');
            el.style.gridArea = `${1+i} / ${6-(w-1)/2+j}`;
            el.style.outline = '1px solid #888';
            el.style.width = '35px';
            el.style.height = '35px';
            div.append(el);
        }
    }

    const cells = [];

    for (let i = 0; i < 8; ++i) {
        const w = Math.min(8, 9-2*Math.abs(3.5-i));
        for (let j = 0; j < w; ++j) {
            const box = document.createElement('div');
            box.style.gridArea = `${1+i} / ${5-w/2+j} / span 4 / span 4`;
            box.style.background = 'no-repeat center/contain url(box.png)';
            box.style.opacity = '0.5';
            box.style.zIndex = '1';
            div.append(box);

            const lbl = document.createElement('div');
            lbl.style.gridArea = `${1+i} / ${5-w/2+j} / span 4 / span 4`;
            lbl.style.alignItems = 'center';
            lbl.style.justifyContent = 'center';
            lbl.style.fontSize = '9pt';
            lbl.style.fontWeight = 'bold';
            lbl.style.textShadow = '0 0 1px black, 0 0 2px black';
            lbl.style.zIndex = '2';
            div.append(lbl);

            cells.push([box,lbl]);
        }
    }

    go(cells, (gold.value || 7) - 7);
    gold.addEventListener('change', () => go(cells, (gold.value || 7) - 7));
});