window.addEventListener('load', () => {
    Array.from(document.getElementsByClassName('spoiler')).forEach(x => {
        x.addEventListener('click', () => {
            x.classList.remove('spoiler');
        });
    });
});
