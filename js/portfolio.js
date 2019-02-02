window.addEventListener('load', function() {
    var icons = document.getElementsByClassName('icon');
    for (var i = 0; i < icons.length; ++i) go(icons[i]);
});

function go(icon) {
    icon.addEventListener('click', function(e) {
        e.preventDefault();

        var link = document.createElement('a');
        link.href = icon.href;
        document.body.appendChild(link);

        var img = document.createElement('img');
        img.className = 'big';
        img.src = icon.href;
        link.appendChild(img);

        var intr = setInterval(function() {
            if (!img.width) return;
            clearInterval(intr);

            var iw = img.width, ih = img.height,
                ww = window.innerWidth, wh = window.innerHeight;

            // scale down image to fit in window
            var r = Math.min(ww/iw, wh/ih);
            if (r < 1) { iw *= r; ih *= r; }

            // add padding if necessary
            var s = Math.max(ww/iw, wh/ih) / 1.2;
            if (s < 1) { iw *= s; ih *= s; }

            img.width = iw = Math.floor(iw);
            img.height = ih = Math.floor(ih);
            img.style.left = (iw < ww ? (ww-iw)/2 : 0) + 'px';
            img.style.top = /*window.scrollY +*/ (ih < wh ? (wh-ih)/2 : 0) + 'px';
        }, 20);

        var closeFunc = function() {
            document.body.removeChild(link);
            document.body.removeChild(overlay);
            document.body.removeChild(closeBtn);
        };

        var overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.addEventListener('click', closeFunc);
        document.body.appendChild(overlay, closeFunc);

        var closeBtn = document.createElement('div');
        closeBtn.className = 'close';
        closeBtn.appendChild(document.createTextNode('×'));
        closeBtn.addEventListener('click', closeFunc);
        document.body.appendChild(closeBtn);
    });
}
