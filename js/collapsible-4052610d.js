window.addEventListener('load', () => {
    Array.from(document.getElementsByClassName('collapsible')).forEach(x => {
        x.children[0].addEventListener('click', e => x.children[1].classList.toggle('collshow'));
    });
});
