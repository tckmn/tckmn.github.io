window.addEventListener('load', () => {
    for (const btns of [...document.getElementsByClassName('barchartbtns')]) {
        for (const child of btns.children) {
            child.addEventListener('click', () => {
                const btn = child.dataset.btn;
                const idx = child.dataset.idx;
                for (const el of document.querySelectorAll(`[data-btn='${btn}']`)) {
                    if (el.dataset.keys) el.textContent = el.dataset.keys.split('|')[+idx];
                    else el.classList.toggle('active', el.dataset.idx === idx);
                }
            });
        }
    }
    for (const el of document.querySelectorAll('div[data-hover]')) {
        el.addEventListener('');
    }
});
