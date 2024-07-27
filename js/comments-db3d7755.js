window.addEventListener('load', () => {
    var form = document.getElementById('commentform'),
        submit = document.getElementById('commentsubmit'),
        feedback = document.getElementById('commentfeedback');

    if (localStorage.commentname) form.name.value = localStorage.commentname;
    if (localStorage.commentcont) form.cont.value = localStorage.commentcont;

    form.addEventListener('submit', e => {
        e.preventDefault();
        if (!form.name.value || !form.comm.value) {
            feedback.textContent = 'please enter a ' +
                (form.name.value ? 'comment.' :
                    form.comm.value ? 'name.' : 'name and comment.');
            return;
        }
        var req = new XMLHttpRequest();
        submit.setAttribute('disabled', '1');
        var good = () => {
            submit.removeAttribute('disabled');
            feedback.textContent = 'your comment was submitted!';
            form.comm.value = '';
        };
        var bad = () => {
            submit.removeAttribute('disabled');
            while (feedback.firstChild) feedback.removeChild(feedback.firstChild);
            feedback.appendChild(document.createTextNode('sorry, something went wrong. please '));
            var clink = document.createElement('a');
            clink.setAttribute('href', 'https://tck.mn/contact');
            clink.textContent = 'contact me';
            feedback.appendChild(clink);
            feedback.appendChild(document.createTextNode(' to post your comment.'));
        };
        req.addEventListener('load', () => req.status === 200 ? good() : bad());
        req.addEventListener('error', bad);
        req.open('POST', e.target.action);
        req.send(new URLSearchParams(new FormData(e.target)).toString());
    });

    form.name.addEventListener('change', e => localStorage.commentname = form.name.value);
    form.cont.addEventListener('change', e => localStorage.commentcont = form.cont.value);
});
