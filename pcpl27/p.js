window.addEventListener('load', function() {
    Array.from(document.getElementsByClassName('ans')).forEach(function(a) {
        var f, p = a.children[0], t = a.children[1];
        t.addEventListener('input', f = function() {
            p.textContent = 'answer count: ' +
                t.value.split('\n').filter(function(x) { return x.length }).length;
            t.style.height = 'auto';
            t.style.height = (t.scrollHeight+5)+'px';
        });
        f();
    });
});
