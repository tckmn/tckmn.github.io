localStorage.clear();

$(document).ready(function() {
    var invopen = false, ansopen = false, caninv = true, invanim = 300, invflash;

    $('#invcont').click(function() {
        if (!caninv || ansopen) return;
        caninv = false;
        if (invflash) clearInterval(invflash), $(this).css('background-color','');
        invopen = !invopen;
        $('#invcont').animate({right:invopen?'95vw':0},invanim);
        $('#sandbox').animate({left:invopen?'5vw':'100vw'},invanim);
        $('#cover').css('display','block').animate({opacity:invopen?0.5:0},invanim,function(){if(!invopen)$(this).css('display','none');caninv=true});
    });

    $('#anscont').click(function() {
        if (!caninv || invopen) return;
        caninv = false;
        ansopen = !ansopen;
        $('#anscont').animate({right:ansopen?'20vw':0},invanim);
        $('#ansin').animate({left:ansopen?'80vw':'100vw'},invanim);
        $('#cover').css('display','block').animate({opacity:ansopen?0.5:0},invanim,function(){if(!ansopen)$(this).css('display','none');caninv=true});
        if (ansopen) $('#answer').focus();
    });

    var dismiss = function() {
        if (invopen) $('#invcont').click();
        else if (ansopen) $('#anscont').click();
    };

    $('#cover').click(dismiss);
    $(document.body).keydown(function(e) {
        if (e.key == 'Escape') dismiss();
    });

    var corrects = {
        'd641965aa1b6710bbaf920f89a523a821d8352b062d5f8c4530d562b834af84a': [350, 350,  -80,  700, 700, -60],
        'f68998c9a36e890e4997c40f8e0a9a38ca9bce1ee4174176c9a66dc2b822ed61': [10,  -500, -150, 700, 700, -60],
        '60fa036b0406499b21a3a2d9f91e0e6d766aeb4ca43df38da9858e0fa81e330b': [10,  350,  -500, 600, 700, -60],
        '081b877e29a3f60575ae84c54c5165be34f9c714f12ae74930ddb0956b696049': [10,  350,  -80,  180, 700, -60],
        '34b3137e9334acfa2281b66dbee778bd195fe0a187b916c104203681a45000f4': [10,  500,  -60,  700, 700, -60],
        'b5f29fdc6bd180e1c4e613f18446ba8e868326542731b28464e12c5d601b0c13': [10,  350,  -80,  400, 700, -60],
        '0a75d888554ec1680203255ed809d43c7af4dae3550cb46a2d9ac68b86703ee2': 'x',
        '9b9e643904273d3e7c81b074ce72150545191c666eaad3eed23ef98a99c665eb': 'x',
        '5bd23a80008aa890bb0d2f1e9e0fe0d35f75f3a951cbdc4971111c111085a8e2': 'x',
        'dbb51cac9f8ebe3a87554dac58efeb593fc7c3ab8aae93d9be096e055122c7b5': 'x',
        '6da1a727fe71db7b64d7e643a99402d482b35bd884e8727d995a94b7abe38b78': 'x',
        'f7c19131b4194d457694215a8a7f6a5bd3b63bcfbf0ac19b410d843fd0472280': 'x',
        '9fd0219f46a9553ee5dfaf070d124ff8d1dfdd78ea6cef4ec03180eb08181b69': 'x'
    }, ain = $('#answer'), aanim = 500;
    $('#ansin form').submit(function(e) {
        e.preventDefault();
        if (submit(ain.val().replace(/[^A-Za-z]/g, '').toUpperCase())) {
            $('#anscont').click();
        } else {
            ain.css('background-color', '#a88');
            setTimeout(function() { ain.css('background-color', ''); }, aanim);
        }
        ain.val('');
    });

    var submit = function(ans) {
        var hsh = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash('wowsalty'+ans)), ws, s, r;
        if (r = ((ws = corrects[hsh]) && (s = localStorage.getItem('sols')||'').indexOf('/'+ans)===-1)) {
            addinv(ans, ws);
            localStorage.setItem('sols', s+'/'+ans);
        }
        if (hsh === 'eb02043c5751074c045cb804e2875b076aab8084582362e34a38a30d7f5a142c') {
            window.location = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash('wowsaltier'+ans))+'.html';
        }
        return r;
    };

    var addinv = function(ans, ws) {
        var hsh = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash('wowsaltier'+ans));
        var old = JSON.parse(localStorage.getItem('objs')||'[]'), o;
        if (ws === 'x') {
            old.push(o={u:'_'+ans,x:(Math.random()*300)|0,y:(Math.random()*300)|0});
            addimg(o);
        } else for (var i = 0; i < ws.length; ++i) {
            old.push(o={u:hsh+'_'+i,x:(Math.random()*300)|0,y:(Math.random()*300)|0,w:ws[i]});
            addimg(o);
        }
        localStorage.setItem('objs', JSON.stringify(old));
        invflash = setInterval((function() { var on = 0, f = function() {
            $('#invcont').css('background-color',(on=!on)?'#fff':'#79e');
        }; f(); return f})(), 500);
    };

    var sbdrag, sbdx, sbdy, addimg = function(o) {
        $('#sbcont').append($('<div>')
            .attr('id', o.u)
            .css({left:o.x,top:o.y,backgroundColor:o.u[0]==='_'?'#aea':''})
            .append(o.u[0] === '_' ?
                $('<span>').addClass('correct').text(o.u.slice(1)) :
                $('<img>').attr({src:'img/'+o.u+'.svg'}).attr(o.w>0 ? 'width' : 'height', Math.abs(o.w)))
            .mousedown(function(e){sbdrag=$(this)}));
    };
    JSON.parse(localStorage.getItem('objs')||'[]').forEach(addimg);

    $('#sandbox').mousedown(function(e) {
        e.preventDefault();
        sbdx = e.clientX;
        sbdy = e.clientY;
    }).mousemove(function(e) {
        e.preventDefault();
        if (sbdx !== undefined) {
            var el = sbdrag || $('#sbcont');
            el.css('left', function(_,l) { return +l.replace('px','') + e.clientX - sbdx; });
            el.css('top',  function(_,t) { return +t.replace('px','') + e.clientY - sbdy; });
            sbdx = e.clientX;
            sbdy = e.clientY;
        }
    });

    $(document.body).mouseup(function() {
        if (sbdx !== undefined && sbdrag) {
            var old = JSON.parse(localStorage.getItem('objs')||'[]');
            for (var i = 0; i < old.length; ++i) {
                if (old[i].u == sbdrag.id) old[i].x = sbdrag.style.top, old[i].y = sbdrag.style.left;
            }
            localStorage.setItem('objs', JSON.stringify(old));
        }
        sbdx = sbdrag = undefined;
    });

    var spcss = {
        pan: {left:'3vw',top:'3vh',right:'',bottom:''},
        dog: {left:'',top:'',right:'15vw',bottom:'30vh'},
        hid: {left:'',top:'20vh',left:'2930vw',bottom:''},
        pnt: {left:'100vw',top:'25vh',right:'',bottom:''}
    }, sphtml = {
        'pan': [
            "Hello! My name is Pan. My father, Dr. Demic, had a very important message about <strong>how we can convey healthy habits to everyone</strong>! In fact, it was so important that he split it into several parts and gave them to various friends for safekeeping<a class=s href=# data-s=pn2>.</a> Unfortunately, now that social distancing is in place, all of his friends are scattered apart, all over the place. If you can find them, you might be able to reconstruct Dr. Demic's critical message! Will you help me figure out what he was trying to tell us?",
            "To the right, you can find your inventory, which you can click and drag to move around in (and drag and drop items to rearrange them), and a place to submit answers.",
            "...wait, inventory? Answers? What does that mean? What am I saying?",
            "The message may be a bit hard to decipher... you know how doctors' handwriting is. But I'm sure you can do it!",
            "Do you wanna hear a joke? Actually, hmm, we're supposed to be quarantined, so I can only tell inside jokes.",
            "I'll tell you a joke now, but you'll have to wait two weeks to see if you got it.",
            "Hey, are you on Twitter? You should follow me! I haven't posted much yet, but I promise I'll become super popular. My username is @demicpan1!",
            "I really hope we can discover my father's message... he said he had this great idea for how to remind everyone to be healthy, and he was so excited about it.",
            "Do I have a piece of the message? Oh, yeah, I totally forgot! <a class=s href=# data-s=pan>Here you go.</a>",
            "My father used some pretty crazy techniques to hide his work while it was still in progress... it's almost like he was some kind of sourcerer.",
            "Do you like my dog? His name is Pepper!"
        ],
        'dog': [
            'woof',
            'woof woof woof woof woof woof woof woof woof woof woof woof woof woof',
            'woof woof woof woof woof woof woof woof woof woof woof woof woof woof woof woof woof woof woof woof woof woof',
            'woof woof woof woof woof woof woof woof woof',
            'woof woof woof woof woof woof woof woof woof woof woof woof',
            "Fine -- you got me. I'm actually a human hiding in a dog's body! They say dogs can't get coronavirus... I'm perfectly safe here.",
            "A message? Oh, yeah, Dr. Demic did give me <a class=s href=# data-s=dog>this thing</a>... I don't know how useful it'll be, but here you go!"
        ],
        'hid': [
            "You found me!",
            "What am I doing, you ask? I'm socially distancing... do you think this is 6 feet away from Pan?",
            "Ah, you must be <a class=s href=# data-s=hid>looking for this!</a>",
            "You know, there's another reason I'm this far away from Pan... it's like she has this way of hiding things between her words..."
        ],
        'pnt': [
            "Oh, hello!",
            "I'm hiding in this painting to avoid getting sick. You're the first person who's found me!",
            "If you reach through the frame, I can give you this <a class=s href=# data-s=pnt>strange set of objects</a> that the doctor told me to keep safe.",
            "Do you have any idea what they are?"
        ]
    }, spactive, spidx;

    var spfn = function(x) {
        if (x == spactive) ++spidx;
        else {
            $('#speech').css(spcss[x]);
            spactive = x;
            spidx = 0;
        }
        $('#sptext').html(sphtml[x][spidx%sphtml[x].length]);
        $('#sptext a.s').click(function(e) {
            e.preventDefault();
            submit(this.dataset.s);
        });
    };
    $('.ch').click(function(){spfn(this.id)});

    spfn('pan');
    $('#speech').show();

    var cls=[[5,6], [4,1], [1,5], [5,7], [3,1], [0,0]], clidx = 0;
    $('.cl').show().click(function() {
        $('#clok1').css('transform', 'rotate('+cls[clidx  ][0]*45+'deg)');
        $('#clok2').css('transform', 'rotate('+cls[clidx++][1]*45+'deg)');
        clidx==cls.length && (clidx=0);
    });
});
