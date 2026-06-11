const con = 'ptkmnqfsx';
const vow = 'iyuehovac';

const audios = Array.from({ length: 81 }, (_, i) => new Audio(con[Math.floor(i/9)] + vow[i%9] + '.flac'));

const cards = Array.from({ length: 81 }, (_, i) => i);
shuf(cards);

const board = [];


function shuf(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function makeCard(card) {
    const el = document.createElement('div');
    el.setAttribute('id', 'c'+card);
    el.addEventListener('pointerenter', () => { audios[card].play(); });
    el.addEventListener('click', () => {
        el.classList.toggle('active');
        const actives = Array.from(document.getElementsByClassName('active'));
        if (actives.length === 3) submit(actives);
    });
    el.classList.add('card');
    return el;
}

function redeal() {
    while (board.length < 12) {
        const card = cards.shift();
        board.push(card);
        document.getElementById('main').append(makeCard(card));
    }
}

function check(ids) { return checkSub(ids.map(i => Math.floor(i/27))) && checkSub(ids.map(i => Math.floor(i/9)%3)) && checkSub(ids.map(i => Math.floor(i/3)%3)) && checkSub(ids.map(i => i%3)); }
function checkSub(ids) { return new Set(ids).size !== 2; }

function submit(arr) {
    const ids = arr.map(el => +el.getAttribute('id').slice(1));
    if (check(ids)) {
        alert('yay');
    }
    for (let el of arr) el.classList.remove('active');
}

window.addEventListener('load', () => {
    redeal();

    document.getElementById('exhibit').addEventListener('click', () => {
        for (let i = 0; i < 9; ++i) {
            for (let j = i+1; j < 9; ++j) {
                for (let k = j+1; k < 9; ++k) {
                    if (check([board[i], board[j], board[k]])) {
                        document.getElementById('c'+board[i]).classList.add('active');
                        document.getElementById('c'+board[j]).classList.add('active');
                        document.getElementById('c'+board[k]).classList.add('active');
                        return;
                    }
                }
            }
        }
    });

    document.getElementById('count').addEventListener('click', () => {
        let count = 0;
        for (let i = 0; i < 9; ++i) {
            for (let j = i+1; j < 9; ++j) {
                for (let k = j+1; k < 9; ++k) {
                    if (check([board[i], board[j], board[k]])) {
                        ++count;
                    }
                }
            }
        }
        alert(count);
    });

});
