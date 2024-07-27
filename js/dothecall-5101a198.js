let fst, snd, asinfst, asinsnd, lvl = 0, lvls, pf, ps;

window.addEventListener('load', () => {
    fst = document.getElementById('fst');
    snd = document.getElementById('snd');
    // fst.addEventListener('pointerenter', enter);
    // fst.addEventListener('pointerleave', leave);
    // snd.addEventListener('pointerenter', enter);
    // snd.addEventListener('pointerleave', leave);
    asinfst = document.getElementById('asinfst');
    asinsnd = document.getElementById('asinsnd');
    lvls = Array.from(document.getElementsByClassName('dtclvl'));
    lvls.forEach(x => x.addEventListener('click', lvlclick));
    go();
    document.getElementById('another').addEventListener('click', go);
});

function go() {
    let f, s;
    do {
        f = choose(data.filter(x => x[0] <= lvl).map(x => x[1]));
        s = choose(data.filter(x => x[0] <= lvl).map(x => x[2]));
        // intentionally allow getting a real call of a higher level
        // because that's funny lol
    } while ((pf === f && ps === s) || data.some(x => x[0] <= lvl && x[1] === f && x[2] === s));
    fst.textContent = pf = f;
    snd.textContent = ps = s;
    while (asinfst.lastChild) asinfst.removeChild(asinfst.lastChild);
    while (asinsnd.lastChild) asinsnd.removeChild(asinsnd.lastChild);
    data.forEach(x => {
        if (x[0] <= lvl) {
            if (x[1] === f) asinfst.appendChild(mkasin(x));
            if (x[2] === s) asinsnd.appendChild(mkasin(x));
        }
    });
}

function choose(arr) {
    const nodup = Array.from(new Set(arr));
    return nodup[Math.random() * nodup.length | 0];
}

function mkasin(x) {
    const elt = document.createElement('p'),
        a = document.createElement('span'),
        b = document.createElement('span'),
        c = document.createElement('span');
    a.appendChild(document.createTextNode(x[1]));
    b.appendChild(document.createTextNode(' The '));
    c.appendChild(document.createTextNode(x[2]));
    a.classList.add('fst');
    c.classList.add('snd');
    elt.appendChild(a);
    elt.appendChild(b);
    elt.appendChild(c);
    return elt;
}

function lvlclick(e) {
    lvl = +e.target.dataset.lvl;
    lvls.forEach(x => x.classList.toggle('on', (+x.dataset.lvl) <= lvl));
}

const data = [
[0, "Bend", "Line"],
[0, "Box", "Gnat"],
[0, "Chain Down", "Line"],
[0, "Pass", "Ocean"],
[0, "Pass To", "Center"],
[0, "Shoot", "Star"],
[0, "Slip", "Clutch"],
[0, "Spin", "Top"],
[0, "Tag", "Line"],
[0, "Walk Around", "Corner"],
[0, "Weave", "Ring"],
[1, "All 8 Spin", "Top", true],
[1, "Cut", "Diamond"],
[1, "Explode", "Wave"],
[1, "Fan", "Top"],
[1, "Flip", "Diamond"],
[1, "Load", "Boat"],
[1, "Peel", "Top"],
[1, "Relay", "Deucey"],
[1, "Spin Chain & Exchange", "Gears"],
[1, "Spin Chain", "Gears"],
[1, "Trade", "Wave"],
[2, "Explode", "Line"],
[2, "Pass", "Sea"],
[2, "Transfer", "Column"],
[3, "Cut", "Hourglass"],
[3, "Flip", "Hourglass"],
[3, "Remake", "Thar"],
[3, "Spin", "Windmill"],
[3, "Switch", "Wave"],
[4, "(anything)", "Axle"],
[4, "(anything)", "Windmill"],
[4, "Alter", "Wave"],
[4, "Cut", "Galaxy"],
[4, "Flip", "Galaxy"],
[4, "Flip", "Line"],
[4, "Pass", "Axle"],
[4, "Prefer", "(anyone)"],
[4, "Relay", "Shadow"],
[4, "Relay", "Top"],
[4, "Split Square Chain", "Top"],
[4, "Square Chain", "Top"],
[4, "Square", "Bases"],
[4, "Squeeze", "\"O\""],
[4, "Squeeze", "Butterfly"],
[4, "Squeeze", "Diamond"],
[4, "Squeeze", "Galaxy"],
[4, "Squeeze", "Hourglass"],
[4, "Swing", "Fractions"],
[4, "Switch", "Line"],
[4, "Twist", "Line"],
[4, "With", "Flow"],
[5, "(anything)", "\"K\""],
[5, "Hold", "Column", true],
[5, "Chain", "Square"],
[5, "Criss Cross", "Shadow"],
[5, "Cross Invert", "Column"],
[5, "Cross", "\"K\""],
[5, "Exchange", "Diamonds"],
[5, "Here Comes", "Judge"],
[5, "Invert", "Column"],
[5, "Invert", "Tag"],
[5, "Relocate", "Diamond"],
[5, "Reverse Cut", "Diamond"],
[5, "Reverse Cut", "Galaxy"],
[5, "Reverse Flip", "Diamond"],
[5, "Reverse Flip", "Galaxy"],
[5, "Stack", "Line"],
[5, "Swap", "Wave"],
[5, "Unwrap", "(setup)"],
[5, "Wheel", "Ocean"],
[5, "Wheel", "Sea"],
[6, "(anything)", "Gamut"],
[6, "(anything)", "Lock"],
[6, "(anything)", "Pulley"],
[6, "1/4", "Deucey"],
[6, "1/4 Wheel", "Ocean"],
[6, "1/4 Wheel", "Sea"],
[6, "3/4", "Deucey"],
[6, "3/4 Wheel", "Ocean"],
[6, "3/4 Wheel", "Sea"],
[6, "Exchange", "3 By 1 Triangles"],
[6, "Exchange", "Boxes"],
[6, "Exchange", "Triangles"],
[6, "Explode", "Top"],
[6, "Hinge", "Lock"],
[6, "Lock", "Hinge"],
[6, "Open Up", "Column"],
[6, "Own", "(anyone)"],
[6, "Mirror Swap", "Top", true],
[6, "Scoot", "Diamond"],
[6, "Snap", "Lock"],
[6, "Spin Chain", "Line"],
[6, "Spin", "Pulley"],
[6, "Swap", "Top"],
[6, "Trade", "Deucey"],
[6, "Trip", "Set"],
[6, "Wind", "Bobbin"],
[7, "(any Tag call)", "Top"],
[7, "(anything)", "Key"],
[7, "Change", "Centers"],
[7, "Change", "Wave"],
[7, "Chase", "Tag"],
[7, "Criss Cross", "Deucey"],
[7, "Cross Flip", "Line"],
[7, "Cross Lock", "Hinge"],
[7, "Cross Swap", "Top"],
[7, "Divide", "Ocean"],
[7, "Divide", "Sea"],
[7, "Explode", "Diamond"],
[7, "Hinge", "Cross Lock"],
[7, "Mirror Cross Swap", "Top", true],
[7, "Reverse", "Pass"],
[7, "Reverse", "Top"],
[7, "Split Turn", "Key", true],
[7, "Tag", "Top"],
[7, "Trade", "Diamond"],
[7, "Turn", "Key"],
[7, "Wave", "(anyone)"],
[8, "(any Tag call)", "Yellow Brick Road"],
[8, "(any Tag call)", "Yellow Bricking (anything)"],
[8, "Break", "Alamo"],
[8, "Cross Run", "Tag"],
[8, "Cross Run", "Top"],
[8, "Finish", "Stack"],
[8, "Run", "Tag"],
[8, "Run", "Top"],
[8, "Run", "Wheel"],
[8, "Tip Toe Thru", "Tulips"],
[8, "Tow Train Leave", "Caboose"],
[8, "(anything)", "Action"],
[8, "(anything)", "Boat"],
[8, "(anything)", "Coop"],
[8, "(anything)", "Deucey"],
[8, "(anything)", "Difference"],
[8, "(anything)", "Fractions"],
[8, "(anything)", "Plank"],
[8, "(anything)", "Wave"],
[8, "Clover", "Horn"],
[8, "Cross Clover", "Horn"],
[8, "I-J-K 1/4", "Alter"],
[8, "I-J-K-L 1/4", "Deucey"],
[8, "I-J-K-L Change", "Web"],
[8, "I-J-K-L Relay", "Top"],
[8, "I-J-K-L Spin Chain", "Gears"],
[8, "Peel & Trail", "Deal"],
[8, "Trail & Peel", "Deal"],
[8, "1/4", "Alter"],
[8, "3/4", "Alter"],
[8, "Alter", "Diamond"],
[8, "Alter", "Galaxy"],
[8, "Anchor", "(anyone)"],
[8, "Bridge", "Gap"],
[8, "Cast", "Column"],
[8, "Centers Thru & Close", "Gate"],
[8, "Change", "Apex"],
[8, "Change", "Diagonal"],
[8, "Change", "Web"],
[8, "Circle", "Tag"],
[8, "Clear", "Centers"],
[8, "Clear", "Centers But Cross It", true],
[8, "Clear", "Way"],
[8, "Clover", "Column"],
[8, "Complete", "Tag"],
[8, "Connect", "Diamond"],
[8, "Contour", "Line"],
[8, "Convert", "Triangle"],
[8, "Criss Cross Shadow", "Column"],
[8, "Criss Cross", "Diamond"],
[8, "Criss Cross Wind", "Bobbin"],
[8, "Cross & Turn", "Wave"],
[8, "Cross Invert", "Tag"],
[8, "Cross Pair", "Line"],
[8, "Cross Reduce", "Column"],
[8, "Cross Replace", "Column"],
[8, "Cross Swap", "Windmill"],
[8, "Cross", "Ocean"],
[8, "Cross", "Top"],
[8, "Cross Wind", "Bobbin"],
[8, "Cross Zip", "Top"],
[8, "Curli-Cross", "Top"],
[8, "Cut", "Line"],
[8, "Cut", "Wave"],
[8, "Cut", "(setup)"],
[8, "Deflate", "(setup)"],
[8, "Double", "Wave"],
[8, "Drag", "(anyone)"],
[8, "Exchange", "(setup)"],
[8, "Explode", "Clover"],
[8, "Fan", "Gate"],
[8, "Fan", "Gating (anything)"],
[8, "Flare", "Star"],
[8, "Flip", "(setup)"],
[8, "Fly", "Coop"],
[8, "Follow", "Yellow Brick Road"],
[8, "Follow", "Yellow Bricking (anything)"],
[8, "Grand Spin", "Top"],
[8, "Hinge", "Top"],
[8, "Hit", "Wall"],
[8, "Kick", "Habit"],
[8, "Lead", "Class"],
[8, "Lead", "Way"],
[8, "Mix", "Line"],
[8, "Pair", "Line"],
[8, "Pass & Roll", "Axle"],
[8, "Pass", "Top"],
[8, "Pass To", "Outside"],
[8, "Peel", "Deal"],
[8, "Reduce", "Column"],
[8, "Relay", "Diamond"],
[8, "Remember", "Alamo"],
[8, "Replace", "Column"],
[8, "Retreat", "Line"],
[8, "Return To", "Coop"],
[8, "Reverse Cut", "(setup)"],
[8, "Reverse Flip", "(setup)"],
[8, "Reverse Flip", "Hourglass"],
[8, "Reverse Stack", "Line"],
[8, "Reverse", "Diamond"],
[8, "Ride", "Tide"],
[8, "Rip", "Line"],
[8, "Roll Out", "Barrel"],
[8, "Roll", "Line"],
[8, "Roll", "Wave"],
[8, "Rotary Spin", "Windmill"],
[8, "Round", "Horn"],
[8, "Shadow", "Column"],
[8, "Shadow", "Hourglass"],
[8, "Shuffle", "Deck"],
[8, "Single Mix", "Line", true],
[8, "Snap", "Tag"],
[8, "Snap", "Diamond"],
[8, "Spin Chain & Circulate", "Gears"],
[8, "Spin Chain", "Star"],
[8, "Spin Tag", "Deucey"],
[8, "Spin", "Web"],
[8, "Split Swap", "Wave"],
[8, "Split", "Difference"],
[8, "Square Chain Cross", "Top"],
[8, "Square", "Barge"],
[8, "Square", "Bases Plus 2"],
[8, "Stack", "Wheel"],
[8, "Swap", "Windmill"],
[8, "Swat", "Flea"],
[8, "Tag", "Star"],
[8, "Tap", "(anyone)"],
[8, "Trim", "Web"],
[8, "Walk", "Clover"],
[8, "Walk", "Cross Clover"],
[8, "Walk", "Plank"],
[8, "Zip", "Top"]
];
