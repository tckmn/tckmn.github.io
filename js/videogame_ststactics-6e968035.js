window.addEventListener('load', () => {
    for (const el of document.getElementsByClassName('click')) {
        el.addEventListener('click', () => el.parentNode.classList.toggle('clean'));
    }
});