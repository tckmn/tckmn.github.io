function l2n(x) { return 'abcdefgh'.indexOf(x); }
function n2l(x) { return 'abcdefgh'[x]; }
function abs(x) { return x < 0 ? -x : x; }
function sgn(x) { return x < 0 ? -1 : x > 0 ? 1 : 0; }
function cl(e, c) { return (' '+e.className+' ').indexOf(c) != -1; }
function rc(e, c) { if (e) e.className = e.className.replace(c, '').replace(/^ *| *$/g, '').replace(/ +/g, ' '); }

function fromFen(fen) {
    return fen
        .replace(/\d/g, function(x) { return new Array(+x+1).join('.'); })
        .split('/')
        .map(function(x) { return x.split(''); });
}

function toFen(pos) {
    return pos
        .map(function(x) { return x.join(''); })
        .join('/')
        .replace(/\.+/g, function(x) { return x.length; });
}

function getActive(chess) {
    return chess.getElementsByClassName('active')[0];
}

function canMove(pos, piece, fx, fy, tx, ty) {
    if (piece == 'P' || piece == 'K') return true;  // other checks are sufficient
    var dx = abs(tx - fx), dy = abs(ty - fy);
    if (piece == 'N') return (dx == 1 && dy == 2) || (dx == 2 && dy == 1);
    if (piece == 'B' && dx != dy) return false;
    if (piece == 'R' && dx != 0 && dy != 0) return false;
    if (piece == 'Q' && dx != dy && dx != 0 && dy != 0) return false;
    // check that the line doesn't have pieces blocking it
    var sx = sgn(tx - fx), sy = sgn(ty - fy);
    for (var x = fx+sx, y = fy+sy; x != tx; x += sx, y += sy) {
        if (pos[y][x] != '.') return false;
    }
    return true;
}

function applyMove(pos, move, white) {
    var m = /^([KQRBN]?)([a-h1-8]?)(x?)([a-h])([1-8])/.exec(move);
    var piece = m[1], spec = m[2], capt = m[3], tx = l2n(m[4]), ty = 8-m[5];
    if (!!capt != (pos[ty][tx] != '.')) console.log('WARNING: wrong capture spec');
    if (!piece) {
        piece = 'P';
        spec = spec || m[4];
    }
    for (var x = 0; x < 8; ++x) {
        var xl = n2l(x);
        for (var y = 0; y < 8; ++y) {
            if (pos[y][x].toUpperCase() == piece &&
                    (pos[y][x] == piece) == white &&
                    (spec ? spec == xl || +spec == y : true) &&
                    canMove(pos, piece, x, y, tx, ty)) {
                if (capt) {
                    pos[ty][tx] = '.';
                    pos[y][x] = '.';
                    for (var xx = tx-1; xx <= tx+1; ++xx) {
                        for (var yy = ty-1; yy <= ty+1; ++yy) {
                            if (xx >= 0 && xx < 8 && yy >= 0 && yy < 8 &&
                                pos[yy][xx].toLowerCase() != 'p') pos[yy][xx] = '.';
                        }
                    }
                } else {
                    pos[ty][tx] = pos[y][x];
                    pos[y][x] = '.';
                }
                return pos;
            }
        }
    }
    console.log("WARNING: couldn't apply move");
}

var popup;
function killPopup() {
    if (popup) {
        document.body.removeChild(popup);
        popup = undefined;
    }
}

function setPos(chess, pos) {
    var rows = chess.firstChild.firstChild.children,
        f = chess.getAttribute('data-flipped');
    for (var y = 0; y < 8; ++y) {
        var row = rows[y].children;
        for (var x = 0; x < 8; ++x) {
            var p = pos[f?7-y:y][f?7-x:x], pl = p.toLowerCase();
            row[x].firstChild.src = '/img/' + (p == '.' ? 'no.png' :
                pl + (p == pl ? 'd' : 'l') + '.svg');
        }
    }
    killPopup();
}

function moveClick(e) {
    var pos = fromFen(this.getAttribute('data-pos')), chess = this;
    while (!cl(chess, 'chess')) chess = chess.parentNode;

    rc(getActive(chess), 'active');
    this.className += ' active';

    setPos(chess, pos);
}

function go(el, pos, white) {
    var c = el.children;
    for (var i = 0; i < c.length; ++i) {
        if (cl(c[i], 'm')) {
            pos = applyMove(pos, c[i].textContent, white);
            white = !white;
            c[i].setAttribute('data-pos', toFen(pos));
            c[i].addEventListener('click', moveClick);
        } else if (cl(c[i], 'b')) {
            go(c[i], pos.map(function(x) { return x.slice(); }), white);
        }
    }
}

function doPrev(chess) {
    return function() {
        var el = getActive(chess);
        if (!el) return;
        rc(el, 'active');
        for (;;) {
            if (el.previousSibling) {
                el = el.previousSibling;
                if (cl(el, 'm')) {
                    el.className += ' active';
                    setPos(chess, fromFen(el.getAttribute('data-pos')));
                    return;
                }
            } else {
                el = el.parentNode;
                if (!cl(el, 'b')) {
                    setPos(chess, fromFen(chess.getAttribute('data-pos')));
                    return;
                }
            }
        }
    };
}

function doFlip(chess) {
    return function() {
        var flipped = chess.getAttribute('data-flipped');
        if (flipped) chess.removeAttribute('data-flipped');
        else chess.setAttribute('data-flipped', '1');

        var active = getActive(chess);
        setPos(chess, fromFen((active || chess).getAttribute('data-pos')));
    };
}

function doNext(chess) {
    return function(e) {
        var active = getActive(chess);
        if (!active) active = chess.lastChild.lastChild.firstChild;
        var el = active, branches = [];
        for (;;) {
            if (el.nextSibling) {
                el = el.nextSibling;
                if (cl(el, 'm')) {
                    rc(active, 'active');
                    el.className += ' active';
                    setPos(chess, fromFen(el.getAttribute('data-pos')));
                    return;
                } else if (cl(el, 'b')) {
                    branches.push(el);
                }
            } else if (branches.length) {
                killPopup();
                popup = document.createElement('div');
                popup.className = 'chesspopup';
                popup.style.top  = e.pageY + 'px'; // TODO maybe not
                popup.style.left = e.pageX + 'px';
                var x = true;
                for (var i = 0; i < branches.length; ++i) {
                    var ch = branches[i].firstChild, txt = '';
                    for (;;) {
                        txt += ch.textContent;
                        if (cl(ch, 'm')) break;
                        ch = ch.nextSibling;
                    }
                    var opt = document.createElement('div');
                    opt.className = 'opt ' + ((x=!x) ? 'even' : 'odd');
                    opt.appendChild(document.createTextNode(txt));
                    opt.addEventListener('click', (function(ch) { return function() {
                        rc(active, 'active');
                        ch.className += ' active';
                        setPos(chess, fromFen(ch.getAttribute('data-pos')));
                    }})(ch));
                    popup.appendChild(opt);
                }
                document.body.appendChild(popup);
                return;
            } else return;
        }
    };
}

function gobble(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
}

window.addEventListener('load', function() {
    var els = document.getElementsByClassName('chess');
    for (var i = 0; i < els.length; ++i) {
        var chess = els[i], mcont = chess.lastChild,
            moves = mcont.lastChild, ctrls = mcont.firstChild.children;
        go(moves, fromFen(chess.getAttribute('data-pos')),
            moves.firstChild.textContent.indexOf('...') == -1);

        ctrls[0].addEventListener('click', doPrev(chess));
        ctrls[1].addEventListener('click', doFlip(chess));
        ctrls[2].addEventListener('click', doNext(chess));

        ctrls[0].addEventListener('mousedown', gobble);
        ctrls[1].addEventListener('mousedown', gobble);
        ctrls[2].addEventListener('mousedown', gobble);
    }
});
