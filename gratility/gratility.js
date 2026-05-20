define("bitstream", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class BitStream {
        constructor(arr) {
            this.arr = arr;
            this.bytepos = 0;
            this.bitsleft = 8;
        }
        static fromArr(arr) { return new BitStream(arr); }
        static fromLen(len) { return new BitStream(new Uint8Array(len)); }
        static empty() { return new BitStream(new Uint8Array(1024)); }
        read(len) {
            let val = 0;
            // read chunks of bits that advance the byte pointer
            while (len >= this.bitsleft) {
                val |= (this.arr[this.bytepos++] & ((1 << this.bitsleft) - 1)) << (len -= this.bitsleft);
                this.bitsleft = 8;
            }
            // read the last chunk
            val |= (this.arr[this.bytepos] >>> (this.bitsleft -= len)) & ((1 << len) - 1);
            return val >>> 0;
        }
        write(len, data) {
            // reallocate if out of space
            const needs = this.bytepos + Math.ceil(len / 8);
            if (needs >= this.arr.length) {
                const newArr = new Uint8Array(needs * 2);
                newArr.set(this.arr);
                this.arr = newArr;
            }
            // write chunks of bits that advance the byte pointer
            while (len >= this.bitsleft) {
                // safe to bitmask with 0xff here, since if bitsleft != 8 we're at the start of data
                this.arr[this.bytepos++] |= (data >>> (len -= this.bitsleft)) & 0xff;
                this.bitsleft = 8;
            }
            // write the last chunk
            this.arr[this.bytepos] |= (data & ((1 << len) - 1)) << (this.bitsleft -= len);
        }
        readVLQ(chunklen) {
            let val = 0, pos = 0;
            while (this.read(1)) {
                val |= this.read(chunklen) << pos;
                pos += chunklen;
            }
            val |= this.read(chunklen) << pos;
            return val >>> 0;
        }
        writeVLQ(chunklen, n) {
            if (!n) {
                this.write(chunklen + 1, 0);
            }
            while (n) {
                const chunk = n & ((1 << chunklen) - 1);
                n >>>= chunklen;
                this.write(1, n !== 0 ? 1 : 0);
                this.write(chunklen, chunk);
            }
        }
        readSignedVLQ(chunklen) {
            const sign = this.read(1) ? -1 : 1;
            return sign * this.readVLQ(chunklen);
        }
        writeSignedVLQ(chunklen, n) {
            this.write(1, n < 0 ? 1 : 0);
            this.writeVLQ(chunklen, Math.abs(n));
        }
        writeString(str) {
            const encoded = new TextEncoder().encode(str);
            this.writeVLQ(3, encoded.length);
            encoded.forEach(b => this.write(8, b));
        }
        readString() {
            const len = this.readVLQ(3), encoded = new Uint8Array(len);
            for (let i = 0; i < len; ++i) {
                encoded[i] = this.read(8);
            }
            return new TextDecoder().decode(encoded);
        }
        // WARNING: does not resize the buffer if seeking past the end
        // (should not matter, because buffer will autoresize on write)
        seek(bytepos, bitsleft) {
            this.bytepos = bytepos || 0;
            this.bitsleft = bitsleft || 8;
        }
        cut() {
            return this.arr.subarray(0, this.bytepos + 1);
        }
        inbounds() {
            return this.bytepos < this.arr.length;
        }
    }
    exports.default = BitStream;
});
define("color", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.colors = void 0;
    exports.colors = [
        '#000000',
        '#666666',
        '#989898',
        '#bbbbbb',
        '#ffffff',
        '#333399',
        '#3366ff',
        '#00c7c7',
        '#008000',
        '#00c000',
        '#800080',
        '#d000d0',
        '#a00000',
        '#ff0000',
        '#855723',
        '#ed8e00',
        '#eced00'
    ];
});
define("courier", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.alert = alert;
    function alert(msg) {
        if (typeof document === 'undefined') {
            console.error(msg);
        }
        else {
            const alerts = document.getElementById('alerts');
            const elt = document.createElement('div');
            elt.textContent = msg;
            const rm = () => { elt.remove(); };
            elt.addEventListener('click', rm);
            setTimeout(rm, Math.max(3000, 250 * msg.length));
            alerts.prepend(elt);
        }
    }
});
define("measure", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CELL = exports.LINE = exports.ZOOMTICK = exports.HALFCELL = exports.GRIDLINE = exports.GRIDCOLOR = void 0;
    exports.round = round;
    exports.cell = cell;
    exports.hc = hc;
    exports.physhc = physhc;
    exports.hctype = hctype;
    exports.atlocs = atlocs;
    exports.atpos = atpos;
    exports.GRIDCOLOR = '#aaa';
    exports.GRIDLINE = 1;
    exports.HALFCELL = 20;
    exports.ZOOMTICK = 1.1;
    exports.LINE = 2;
    exports.CELL = 2 * exports.HALFCELL;
    // this doesn't really belong here lol
    function round(x, r, o = 0) { return Math.round((x - o) / r) * r + o; }
    // when you only care about which square in the visual grid the point is in, use this one
    function cell(x) { return Math.floor(x / exports.CELL); }
    // i think of this as the fundamental one, i guess
    // "spc" specifies how much to weight grid-aligned points relative to half-grid-aligned points
    // higher values of "spc" result in rounding towards gridline intersections more
    // cf pzv MouseInput#getpos
    function hc(x, spc = 0.25) {
        const prelim = x / exports.CELL, cellpos = Math.floor(prelim), offset = prelim - cellpos;
        return cellpos * 2 + (offset >= spc ? 1 : 0) + (offset >= 1 - spc ? 1 : 0);
    }
    // sometimes you want the physical coordinates
    function physhc(x, spc = 0.25) { return hc(x, spc) * exports.HALFCELL; }
    function hctype(x, y) {
        return (Math.abs(x % 2) << 1) | Math.abs(y % 2);
    }
    // lmao surely there is a better way
    // locs is bitmask: 0b center edge corner
    function atlocs(x, y, locs) {
        const dx = x / exports.HALFCELL, dy = y / exports.HALFCELL;
        const fx = Math.floor(dx), fy = Math.floor(dy);
        let best = exports.HALFCELL * exports.HALFCELL * 999, bx = fx, by = fy;
        for (let xp = 0; xp <= 1; ++xp) {
            for (let yp = 0; yp <= 1; ++yp) {
                if ((locs & (1 << (xp + yp))) === 0)
                    continue;
                const tryx = fx + (fx % 2 === 0 ? xp : 1 - xp), tryy = fy + (fy % 2 === 0 ? yp : 1 - yp);
                const dist = (dx - tryx) * (dx - tryx) + (dy - tryy) * (dy - tryy);
                if (dist < best) {
                    best = dist;
                    bx = tryx;
                    by = tryy;
                }
            }
        }
        return [bx, by];
    }
    function atpos(x, y, cx, cy, mask) {
        cx *= exports.HALFCELL;
        cy *= exports.HALFCELL;
        let best = exports.HALFCELL * exports.HALFCELL * 999, bpos = 0;
        for (let xp = -1; xp <= 1; ++xp) {
            for (let yp = -1; yp <= 1; ++yp) {
                const pos = xp + 1 + (yp + 1) * 3;
                if (((mask >> pos) & 1) === 0)
                    continue;
                const tryx = cx + xp * exports.HALFCELL / 2, tryy = cy + yp * exports.HALFCELL / 2;
                const dist = (x - tryx) * (x - tryx) + (y - tryy) * (y - tryy);
                if (dist < best) {
                    best = dist;
                    bpos = pos;
                }
            }
        }
        return bpos;
    }
});
define("draw", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.initialize = initialize;
    exports.draw = draw;
    exports.poly = poly;
    // TODO this is absolutely an extremely temporary bandaid lol
    let doc;
    function initialize(document) { doc = document; }
    const svgNS = 'http://www.w3.org/2000/svg';
    function draw(parent, tagname, attrs = {}) {
        const elt = doc.createElementNS(svgNS, tagname);
        for (let [k, v] of Object.entries(attrs)) {
            if (k === 'children') {
                for (let child of v)
                    elt.appendChild(child);
            }
            else if (k === 'textContent') {
                elt.textContent = v;
            }
            else {
                elt.setAttribute(k === 'viewBox' ? k : k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()), v);
            }
        }
        if (parent !== undefined)
            parent.appendChild(elt);
        return elt;
    }
    function poly(parent, sides, star, attrs = {}) {
        if (star)
            sides *= 2;
        const angleOffset = star || sides % 2 ? 0.25 : 1 / sides / 2;
        const yOffset = sides % 2 ? (1 + Math.sin((Math.floor(sides / 2) / sides + angleOffset) * 2 * Math.PI)) / 2 : 0;
        return draw(parent, 'path', {
            d: 'M' + Array.from({ length: sides }, (_, n) => ((star && n % 2 === 1 ? 0.5 : 1) * Math.cos((n / sides + angleOffset) * 2 * Math.PI) + ' ' +
                (yOffset - (star && n % 2 === 1 ? 0.5 : 1) * Math.sin((n / sides + angleOffset) * 2 * Math.PI)))).join('L') + 'Z',
            ...attrs
        });
    }
});
define("image", ["require", "exports", "measure", "draw"], function (require, exports, Measure, Draw) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Image {
        constructor(svg) {
            this.root = Draw.draw(svg, 'g');
            this.gridlines = Draw.draw(this.root, 'g', { stroke: Measure.GRIDCOLOR, strokeWidth: Measure.GRIDLINE });
            this.surface = Draw.draw(this.root, 'g');
            this.shape_xl = Draw.draw(this.root, 'g');
            this.shape_l = Draw.draw(this.root, 'g');
            this.path = Draw.draw(this.root, 'g');
            this.edge = Draw.draw(this.root, 'g');
            this.wall = Draw.draw(this.root, 'g');
            this.shape_m = Draw.draw(this.root, 'g');
            this.shape_s = Draw.draw(this.root, 'g');
            this.shape_xs = Draw.draw(this.root, 'g');
            this.textInd = Draw.draw(this.root, 'g');
            this.text_xl = Draw.draw(this.root, 'g');
            this.text_l = Draw.draw(this.root, 'g');
            this.text_m = Draw.draw(this.root, 'g');
            this.text_s = Draw.draw(this.root, 'g');
            this.text_xs = Draw.draw(this.root, 'g');
            this.copypaste = Draw.draw(this.root, 'g');
            this.stamps = Draw.draw(this.root, 'g', { opacity: 0.5 });
        }
        layer(layer) {
            switch (layer) {
                case 0 /* Data.Layer.SURFACE */: return this.surface;
                case 1 /* Data.Layer.PATH */: return this.path;
                case 2 /* Data.Layer.EDGE */: return this.edge;
                case 3 /* Data.Layer.WALL */: return this.wall;
                case 16 /* Data.Layer.SHAPE_XL */: return this.shape_xl;
                case 17 /* Data.Layer.SHAPE_L */: return this.shape_l;
                case 18 /* Data.Layer.SHAPE_M */: return this.shape_m;
                case 19 /* Data.Layer.SHAPE_S */: return this.shape_s;
                case 24 /* Data.Layer.SHAPE_XS */:
                case 20 /* Data.Layer.SHAPE_XSNW */:
                case 21 /* Data.Layer.SHAPE_XSN */:
                case 22 /* Data.Layer.SHAPE_XSNE */:
                case 23 /* Data.Layer.SHAPE_XSW */:
                case 25 /* Data.Layer.SHAPE_XSE */:
                case 26 /* Data.Layer.SHAPE_XSSW */:
                case 27 /* Data.Layer.SHAPE_XSS */:
                case 28 /* Data.Layer.SHAPE_XSSE */: return this.shape_xs;
                case 32 /* Data.Layer.TEXT_XL */: return this.text_xl;
                case 33 /* Data.Layer.TEXT_L */: return this.text_l;
                case 34 /* Data.Layer.TEXT_M */: return this.text_m;
                case 35 /* Data.Layer.TEXT_S */: return this.text_s;
                case 40 /* Data.Layer.TEXT_XS */:
                case 36 /* Data.Layer.TEXT_XSNW */:
                case 37 /* Data.Layer.TEXT_XSN */:
                case 38 /* Data.Layer.TEXT_XSNE */:
                case 39 /* Data.Layer.TEXT_XSW */:
                case 41 /* Data.Layer.TEXT_XSE */:
                case 42 /* Data.Layer.TEXT_XSSW */:
                case 43 /* Data.Layer.TEXT_XSS */:
                case 44 /* Data.Layer.TEXT_XSSE */: return this.text_xs;
            }
        }
        grid(xmin, xmax, ymin, ymax) {
            for (let x = Math.ceil(xmin / 2) * 2; x <= xmax; x += 2) {
                Draw.draw(this.gridlines, 'line', {
                    x1: x * Measure.HALFCELL, x2: x * Measure.HALFCELL,
                    y1: ymin * Measure.HALFCELL, y2: ymax * Measure.HALFCELL
                });
            }
            for (let y = Math.ceil(ymin / 2) * 2; y <= ymax; y += 2) {
                Draw.draw(this.gridlines, 'line', {
                    x1: xmin * Measure.HALFCELL, x2: xmax * Measure.HALFCELL,
                    y1: y * Measure.HALFCELL, y2: y * Measure.HALFCELL
                });
            }
        }
    }
    exports.default = Image;
});
define("view", ["require", "exports", "measure"], function (require, exports, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class ViewManager {
        constructor(image) {
            this.image = image;
            this.x = 0;
            this.y = 0;
            this.z = 0;
        }
        zoom(n) { return Math.pow(Measure.ZOOMTICK, n !== null && n !== void 0 ? n : this.z); }
        update() {
            this.image.root.setAttribute('transform', `scale(${this.zoom()}) translate(${this.x} ${this.y})`);
        }
    }
    exports.default = ViewManager;
});
define("tools/bind", ["require", "exports", "tools/tool", "toolbox"], function (require, exports, Tool, Toolbox) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class BindTool extends Tool.Tool {
        constructor(toolbox, name, binding, tparam, action) {
            super();
            this.toolbox = toolbox;
            this.name = name;
            this.binding = binding;
            this.tparam = tparam;
            this.action = action;
            this.repeat = false;
        }
        ondown(x, y, g, b) {
            const box = this.name ? this.toolbox.toolboxes.find(t => t.name === this.name) : b;
            if (box === undefined) {
                const newEntry = new Toolbox.ToolboxEntry(this.toolbox.gf, this.binding, this.tparam, this.action);
                this.toolbox.toolboxes.push(new Toolbox.Toolbox(this.toolbox.gf, true, this.name, [newEntry]));
            }
            else {
                const entry = box.byBind(this.binding);
                if (entry === undefined) {
                    box.addBind(this.binding, this.tparam, this.action);
                }
                else {
                    entry.replace(this.binding, this.tparam, this.action);
                }
            }
            this.toolbox.saveRefresh();
        }
    }
    exports.default = BindTool;
});
define("tools/copy", ["require", "exports", "tools/tool", "data"], function (require, exports, Tool, Data) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class CopyTool extends Tool.SelectTool {
        constructor(isCut) {
            super();
            this.isCut = isCut;
            this.repeat = false;
        }
        onselect(sx, sy, tx, ty, g) {
            if (sx === tx && sy === ty) {
                g.stamp.deselect();
                return;
            }
            const xoff = Math.round(sx / 2) * 2;
            const yoff = Math.round(sy / 2) * 2;
            const stamp = new Array();
            let shouldBreak = false;
            for (let x = sx; x <= tx; ++x) {
                for (let y = sy; y <= ty; ++y) {
                    const n = Data.encode(x, y);
                    const hc = g.data.halfcells.get(n);
                    if (hc !== undefined) {
                        stamp.push(...hc.values().map((t) => {
                            if (this.isCut) {
                                shouldBreak = true;
                                g.data.add(new Data.Change(n, t, undefined, true));
                            }
                            return new Data.Item(n, t);
                        }));
                    }
                }
            }
            if (shouldBreak)
                g.data.breakLink();
            g.stamp.add(stamp);
        }
    }
    exports.default = CopyTool;
});
define("tools/func", ["require", "exports", "tools/tool", "data", "stamp"], function (require, exports, Tool, Data, Stamp) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class FuncTool extends Tool.SelectTool {
        constructor(funcName) {
            super();
            this.funcName = funcName;
            this.repeat = false;
        }
        onselect(sx, sy, tx, ty, g) {
            if (sx === tx && sy === ty) {
                g.stamp.deselect();
                return;
            }
            const xoff = Math.round(sx / 2) * 2;
            const yoff = Math.round(sy / 2) * 2;
            const stamp = new Array();
            for (let x = sx; x <= tx; ++x) {
                for (let y = sy; y <= ty; ++y) {
                    const n = Data.encode(x, y);
                    const hc = g.data.halfcells.get(n);
                    if (hc !== undefined) {
                        stamp.push(...hc.values().map((t) => {
                            // TODO can make this more efficient, obviously
                            // intentionally not calling breakLink() so that the
                            // whole thing is one operation
                            g.data.add(new Data.Change(n, t, undefined, true));
                            return new Data.Item(n, t);
                        }));
                    }
                }
            }
            const newcells = stamp.map(item => {
                if (item.tile.obj === 0 /* Data.Obj.SURFACE */)
                    return new Data.Item(item.n, new Data.SurfaceTile(0));
                if (item.tile.obj === 3 /* Data.Obj.TEXT */)
                    return new Data.Item(item.n, new Data.TextTile(item.tile.val, item.tile.spec.setColor(4)));
                return item;
            });
            Stamp.unsafeWrap(newcells).apply(g.data, 0, 0);
        }
    }
    exports.default = FuncTool;
});
define("tools/line", ["require", "exports", "tools/tool", "draw", "data", "measure"], function (require, exports, Tool, Draw, Data, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class LineTool extends Tool.Tool {
        icon() {
            return Draw.draw(undefined, 'svg', {
                viewBox: `-${Measure.HALFCELL} 0 ${Measure.CELL} ${Measure.CELL}`,
                children: [
                    new Data.LineTile(this.isEdge, new Data.LineSpec(this.color, this.thickness, this.head, false)).draw(0, 1)
                ]
            });
        }
        constructor(isEdge, color, thickness, head) {
            super();
            this.isEdge = isEdge;
            this.color = color;
            this.thickness = thickness;
            this.head = head;
            this.repeat = false;
            this.isDrawing = undefined;
            this.x = 0;
            this.y = 0;
            this.HC_WEIGHT = isEdge ? 0.35 : 0;
        }
        ondown(x, y) {
            this.x = Measure.hc(x, this.HC_WEIGHT);
            this.y = Measure.hc(y, this.HC_WEIGHT);
        }
        onmove(x, y, g) {
            var _a;
            x = Measure.hc(x, this.HC_WEIGHT);
            y = Measure.hc(y, this.HC_WEIGHT);
            if (x === this.x && y === this.y)
                return;
            let dx = this.x - x;
            let dy = this.y - y;
            const lx = Math.min(x, this.x);
            const ly = Math.min(y, this.y);
            this.x = x;
            this.y = y;
            let cx, cy, dir;
            if (!this.isEdge) {
                dx = dx / 2;
                dy = dy / 2;
            }
            dir = dx + dy;
            if (dx ** 2 + dy ** 2 !== 1)
                return;
            if (this.isEdge) {
                if (dx === 0) {
                    if (x % 2 !== 0)
                        return;
                    cx = x;
                    cy = y % 2 ? y : y + dy;
                }
                else {
                    if (y % 2 !== 0)
                        return;
                    cy = y;
                    cx = x % 2 ? x : x + dx;
                }
            }
            else {
                cx = x + dx;
                cy = y + dy;
            }
            const n = Data.encode(cx, cy);
            // TODO need to make sure this is good
            // oh, only two lines should ever be created at least
            const newline = new Data.LineTile(this.isEdge, new Data.LineSpec(this.color, this.thickness, this.head, dir === -1));
            const oldline = (_a = g.data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(newline.layer);
            if (this.isDrawing === undefined) {
                this.isDrawing = oldline === undefined || !oldline.eq(newline);
            }
            if (this.isDrawing) {
                if (oldline === undefined || !oldline.eq(newline)) {
                    g.data.add(new Data.Change(n, oldline, newline));
                }
            }
            else {
                if (oldline !== undefined) {
                    g.data.add(new Data.Change(n, oldline, undefined));
                }
            }
        }
        onup() { this.isDrawing = undefined; }
    }
    exports.default = LineTool;
});
define("tools/multi", ["require", "exports", "tools/tool"], function (require, exports, Tool) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class MultiTool extends Tool.Tool {
        constructor(tools) {
            super();
            this.tools = tools;
            this.repeat = false;
        }
        ondown(x, y, g, b) {
            for (const t of this.tools)
                t.ondown(x, y, g, b);
        }
        onmove(x, y, g) {
            for (const t of this.tools)
                t.onmove(x, y, g);
        }
        onup(g) {
            for (const t of this.tools)
                t.onup(g);
        }
        onclick(g) {
            let ret = false;
            for (const t of this.tools)
                ret || (ret = t.onclick(g));
            return ret;
        }
    }
    exports.default = MultiTool;
});
define("tools/pan", ["require", "exports", "tools/tool"], function (require, exports, Tool) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class PanTool extends Tool.Tool {
        constructor() {
            super(...arguments);
            this.repeat = false;
            this.mx = 0;
            this.my = 0;
        }
        ondown(x, y) {
            this.mx = x;
            this.my = y;
        }
        onmove(x, y, g) {
            g.view.x += x - this.mx;
            g.view.y += y - this.my;
            g.view.update();
        }
    }
    exports.default = PanTool;
});
define("tools/paste", ["require", "exports", "tools/tool", "measure"], function (require, exports, Tool, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class PasteTool extends Tool.Tool {
        constructor() {
            super(...arguments);
            this.repeat = false;
        }
        ondown(x, y, g) {
            var _a;
            const xoff = Math.round(x / Measure.CELL) * 2;
            const yoff = Math.round(y / Measure.CELL) * 2;
            (_a = g.stamp.current()) === null || _a === void 0 ? void 0 : _a.apply(g.data, xoff, yoff);
        }
    }
    exports.default = PasteTool;
});
define("tools/poly", ["require", "exports", "tools/tool", "draw", "data", "measure"], function (require, exports, Tool, Draw, Data, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class PolyTool extends Tool.DragTool {
        icon() {
            return Draw.draw(undefined, 'svg', {
                viewBox: `0 0 ${Measure.CELL} ${Measure.CELL}`,
                children: [this.tile.draw(1, 1)]
            });
        }
        constructor(sides, star, spec) {
            var _a;
            super();
            this.sides = sides;
            this.star = star;
            this.spec = spec;
            this.repeat = false;
            [this.posmask, this.tiles] = spec.unpack(spec => new Data.PolyTile(sides, star, spec));
            this.tile = (_a = this.tiles.get(4)) !== null && _a !== void 0 ? _a : this.tiles.values().next().value; // TODO uh
        }
        ondown(x, y, g) {
            const [cx, cy] = Measure.atlocs(x, y, this.spec.locs);
            const pos = Measure.atpos(x, y, cx, cy, this.posmask);
            this.tile = this.tiles.get(pos);
            this.drag(true, Data.encode(cx, cy), g);
        }
        onmove(x, y, g) {
            [x, y] = Measure.atlocs(x, y, this.spec.locs);
            this.drag(false, Data.encode(x, y), g);
        }
    }
    exports.default = PolyTool;
});
define("tools/shape", ["require", "exports", "tools/tool", "draw", "data", "measure"], function (require, exports, Tool, Draw, Data, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class ShapeTool extends Tool.DragTool {
        icon() {
            return Draw.draw(undefined, 'svg', {
                viewBox: `0 0 ${Measure.CELL} ${Measure.CELL}`,
                children: [this.tile.draw(1, 1)]
            });
        }
        constructor(shape, spec) {
            var _a;
            super();
            this.shape = shape;
            this.spec = spec;
            this.repeat = false;
            [this.posmask, this.tiles] = spec.unpack(spec => new Data.ShapeTile(shape, spec));
            this.tile = (_a = this.tiles.get(4)) !== null && _a !== void 0 ? _a : this.tiles.values().next().value; // TODO uh
        }
        ondown(x, y, g) {
            const [cx, cy] = Measure.atlocs(x, y, this.spec.locs);
            const pos = Measure.atpos(x, y, cx, cy, this.posmask);
            this.tile = this.tiles.get(pos);
            this.drag(true, Data.encode(cx, cy), g);
        }
        onmove(x, y, g) {
            [x, y] = Measure.atlocs(x, y, this.spec.locs);
            this.drag(false, Data.encode(x, y), g);
        }
    }
    exports.default = ShapeTool;
});
define("tools/surface", ["require", "exports", "tools/tool", "draw", "data", "measure"], function (require, exports, Tool, Draw, Data, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SurfaceTool extends Tool.DragTool {
        icon() {
            return Draw.draw(undefined, 'svg', {
                viewBox: `0 0 ${Measure.CELL} ${Measure.CELL}`,
                children: [
                    this.tile.draw(1, 1)
                ]
            });
        }
        constructor(color) {
            super();
            this.color = color;
            this.repeat = false;
            this.tile = new Data.SurfaceTile(color);
        }
        ondown(x, y, g) {
            this.drag(true, Data.encode(Measure.cell(x) * 2 + 1, Measure.cell(y) * 2 + 1), g);
        }
        onmove(x, y, g) {
            this.drag(false, Data.encode(Measure.cell(x) * 2 + 1, Measure.cell(y) * 2 + 1), g);
        }
    }
    exports.default = SurfaceTool;
});
define("tools/text", ["require", "exports", "tools/tool", "draw", "data", "measure", "event"], function (require, exports, Tool, Draw, Data, Measure, Event) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class TextTool extends Tool.DragTool {
        constructor(preset, spec) {
            var _a;
            super();
            this.preset = preset;
            this.spec = spec;
            this.repeat = false;
            this.n = 0;
            this.elt = undefined;
            [this.posmask, this.tiles] = spec.unpack(spec => new Data.TextTile(preset, spec));
            this.tile = (_a = this.tiles.get(4)) !== null && _a !== void 0 ? _a : this.tiles.values().next().value; // TODO uh
        }
        ondown(x, y, g) {
            const [cx, cy] = Measure.atlocs(x, y, this.spec.locs);
            const pos = Measure.atpos(x, y, cx, cy, this.posmask);
            this.tile = this.tiles.get(pos);
            if (this.preset !== '') {
                this.drag(true, Data.encode(cx, cy), g);
            }
            else if (Event.keyeater.ref === undefined) {
                this.n = Data.encode(cx, cy);
                // TODO some of this goes somewhere else
                // TODO this is wrong now also
                this.elt = Draw.draw(g.image.textInd, 'rect', {
                    x: (cx - 1) * Measure.HALFCELL, y: (cy - 1) * Measure.HALFCELL, width: Measure.CELL, height: Measure.CELL,
                    fill: '#ccc',
                    stroke: '#f88',
                    strokeWidth: Measure.HALFCELL / 5
                });
                Event.keyeater.ref = this.onkey(g).bind(this);
            }
        }
        onkey(g) {
            return (e) => {
                var _a;
                const pre = (_a = g.data.halfcells.get(this.n)) === null || _a === void 0 ? void 0 : _a.get(this.tile.spec.layer(Data.Layer_TEXT_BASE)); // TODO a bit odd
                const spec = pre === undefined ? this.tile.spec : pre.spec;
                const text = pre === undefined ? '' : pre.val;
                if (e.key === 'Enter' || e.key === 'Escape') {
                    this.deselect();
                }
                else if (e.key === 'Backspace') {
                    g.data.add(new Data.Change(this.n, pre, text.length === 1 ? undefined : new Data.TextTile(text.slice(0, text.length - 1), spec)));
                }
                else if (e.key.length === 1) {
                    g.data.add(new Data.Change(this.n, pre, new Data.TextTile(text + e.key, spec)));
                }
            };
        }
        deselect() {
            Event.keyeater.ref = undefined;
            if (this.elt !== undefined)
                this.elt.parentNode.removeChild(this.elt);
        }
        onmove(x, y, g) {
            if (this.preset === '')
                return;
            [x, y] = Measure.atlocs(x, y, this.spec.locs);
            this.drag(false, Data.encode(x, y), g);
        }
    }
    exports.default = TextTool;
});
define("tools/transform", ["require", "exports", "tools/tool"], function (require, exports, Tool) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // TODO: some of them don't work yet
    class TransformTool extends Tool.Tool {
        constructor(trnum) {
            super();
            this.trnum = trnum;
            this.repeat = false;
        }
        ondown(x, y, g) {
            switch (this.trnum) {
                case 0:
                    g.stamp.transform(s => s.reflect(true));
                    break;
                case 1:
                    g.stamp.transform(s => s.reflect(false));
                    break;
                case 10:
                    g.stamp.transform(s => s.rotate(true));
                    break;
                case 11:
                    g.stamp.transform(s => s.rotate(false));
                    break;
            }
        }
        onmove() { }
        onup() { }
    }
    exports.default = TransformTool;
});
define("tools/undo", ["require", "exports", "tools/tool"], function (require, exports, Tool) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class UndoTool extends Tool.Tool {
        constructor(isUndo) {
            super();
            this.isUndo = isUndo;
            this.repeat = true;
        }
        ondown(x, y, g) { g.data.undo(this.isUndo); }
        onmove() { }
        onup() { }
    }
    exports.default = UndoTool;
});
define("tools/wall", ["require", "exports", "tools/tool", "draw", "data", "measure"], function (require, exports, Tool, Draw, Data, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class WallTool extends Tool.Tool {
        icon() {
            return Draw.draw(undefined, 'svg', {
                viewBox: `-${Measure.HALFCELL} 0 ${Measure.CELL} ${Measure.CELL}`,
                children: [
                    new Data.WallTile(0, new Data.LineSpec(this.color, this.thickness, this.head, false)).draw(0, 1)
                ]
            });
        }
        constructor(color, thickness, head, locs) {
            super();
            this.color = color;
            this.thickness = thickness;
            this.head = head;
            this.locs = locs;
            this.repeat = false;
            this.isDrawing = undefined;
            // these are virtual coordinates, for where we "think" we are
            this.x = 0;
            this.y = 0;
            // is the cursor actually in that cell?
            this.arrived = true;
        }
        ondown(x, y) {
            [this.x, this.y] = Measure.atlocs(x, y, this.locs);
            this.arrived = false;
        }
        onmove(x, y, g) {
            var _a;
            const fx = x / Measure.HALFCELL;
            const fy = y / Measure.HALFCELL;
            const rx = Measure.round(fx, 2, this.x);
            const ry = Measure.round(fy, 2, this.y);
            if (rx === this.x && ry === this.y) {
                if (!this.arrived && Math.abs(rx - fx) < WallTool.INNER_DIST && Math.abs(rx - fx) < WallTool.INNER_DIST)
                    this.arrived = true;
                return;
            }
            if (!this.arrived && Math.abs(this.x - fx) < WallTool.OUTER_DIST && Math.abs(this.y - fy) < WallTool.OUTER_DIST)
                return;
            const dx = x - this.x * Measure.HALFCELL;
            const dy = y - this.y * Measure.HALFCELL;
            const angle = Math.atan2(dy, dx) / (Math.PI / 4);
            const a = 1 << ((4 + Math.round(angle)) % 4);
            const n = Data.encode(this.x, this.y);
            const oldwall = (_a = g.data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(3 /* Data.Layer.WALL */);
            const newwall = new Data.WallTile(a, new Data.LineSpec(this.color, this.thickness, this.head, false));
            this.x = this.x + 2 * [-1, -1, 0, 1, 1, 1, 0, -1, -1][Math.round(angle) + 4];
            this.y = this.y + 2 * [0, -1, -1, -1, 0, 1, 1, 1, 0][Math.round(angle) + 4];
            this.arrived = false;
            if (this.isDrawing === undefined) {
                this.isDrawing = oldwall === undefined || !oldwall.eq(newwall) || !(oldwall.angles & a);
            }
            if (this.isDrawing) {
                if (oldwall === undefined || !oldwall.eq(newwall)) {
                    g.data.add(new Data.Change(n, oldwall, newwall));
                }
                else if (!(oldwall.angles & a)) {
                    g.data.add(new Data.Change(n, oldwall, new Data.WallTile(oldwall.angles | a, oldwall.spec)));
                }
            }
            else {
                if (oldwall !== undefined) {
                    if (oldwall.angles === a) {
                        g.data.add(new Data.Change(n, oldwall, undefined));
                    }
                    else if (oldwall.angles & a) {
                        g.data.add(new Data.Change(n, oldwall, new Data.WallTile(oldwall.angles & ~a, oldwall.spec)));
                    }
                }
            }
        }
        onup() { this.isDrawing = undefined; }
    }
    // you can be this far outside a cell and not yet trigger a new line
    WallTool.OUTER_DIST = 2 - Math.tan(Math.PI / 8);
    // once you get this close to the center of a cell you will trigger lines again
    WallTool.INNER_DIST = 0.9;
    exports.default = WallTool;
});
define("tools/zoom", ["require", "exports", "tools/tool"], function (require, exports, Tool) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class ZoomTool extends Tool.Tool {
        constructor(amount) {
            super();
            this.amount = amount;
            this.repeat = false;
        }
        ondown(x, y, g) {
            g.view.x = (x + g.view.x) * g.view.zoom(-this.amount) - x;
            g.view.y = (y + g.view.y) * g.view.zoom(-this.amount) - y;
            g.view.z += this.amount;
            g.view.update();
        }
        onmove(x, y) { }
        onup() { }
    }
    exports.default = ZoomTool;
});
define("tools/alltools", ["require", "exports", "tools/bind", "tools/copy", "tools/func", "tools/line", "tools/multi", "tools/pan", "tools/paste", "tools/poly", "tools/shape", "tools/surface", "tools/text", "tools/transform", "tools/undo", "tools/wall", "tools/zoom"], function (require, exports, bind_js_1, copy_js_1, func_js_1, line_js_1, multi_js_1, pan_js_1, paste_js_1, poly_js_1, shape_js_1, surface_js_1, text_js_1, transform_js_1, undo_js_1, wall_js_1, zoom_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ZoomTool = exports.WallTool = exports.UndoTool = exports.TransformTool = exports.TextTool = exports.SurfaceTool = exports.ShapeTool = exports.PolyTool = exports.PasteTool = exports.PanTool = exports.MultiTool = exports.LineTool = exports.FuncTool = exports.CopyTool = exports.BindTool = void 0;
    Object.defineProperty(exports, "BindTool", { enumerable: true, get: function () { return bind_js_1.default; } });
    Object.defineProperty(exports, "CopyTool", { enumerable: true, get: function () { return copy_js_1.default; } });
    Object.defineProperty(exports, "FuncTool", { enumerable: true, get: function () { return func_js_1.default; } });
    Object.defineProperty(exports, "LineTool", { enumerable: true, get: function () { return line_js_1.default; } });
    Object.defineProperty(exports, "MultiTool", { enumerable: true, get: function () { return multi_js_1.default; } });
    Object.defineProperty(exports, "PanTool", { enumerable: true, get: function () { return pan_js_1.default; } });
    Object.defineProperty(exports, "PasteTool", { enumerable: true, get: function () { return paste_js_1.default; } });
    Object.defineProperty(exports, "PolyTool", { enumerable: true, get: function () { return poly_js_1.default; } });
    Object.defineProperty(exports, "ShapeTool", { enumerable: true, get: function () { return shape_js_1.default; } });
    Object.defineProperty(exports, "SurfaceTool", { enumerable: true, get: function () { return surface_js_1.default; } });
    Object.defineProperty(exports, "TextTool", { enumerable: true, get: function () { return text_js_1.default; } });
    Object.defineProperty(exports, "TransformTool", { enumerable: true, get: function () { return transform_js_1.default; } });
    Object.defineProperty(exports, "UndoTool", { enumerable: true, get: function () { return undo_js_1.default; } });
    Object.defineProperty(exports, "WallTool", { enumerable: true, get: function () { return wall_js_1.default; } });
    Object.defineProperty(exports, "ZoomTool", { enumerable: true, get: function () { return zoom_js_1.default; } });
});
define("input", ["require", "exports", "color", "draw", "data", "courier", "toolbox"], function (require, exports, Color, Draw, Data, Courier, Toolbox) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ParamSource = exports.Param = void 0;
    exports.makeGroup = makeGroup;
    exports.objectParam = objectParam;
    class Param {
        constructor(source, readFunc, writeFunc) {
            this.source = source;
            this.readFunc = readFunc;
            this.writeFunc = writeFunc;
            this.hook = () => { };
            this.val = readFunc();
        }
        setFromHTML() { this.val = this.readFunc(); }
        setFromJSON(t) { this.val = t; }
        save() { return JSON.stringify(this.readFunc()); }
        load(t) { this.writeFunc(t); this.hook(t); }
    }
    exports.Param = Param;
    function makeGroup(cont, name) {
        const group = document.createElement('section');
        group.classList.add('group');
        const lbl = document.createElement('span');
        lbl.textContent = name;
        group.append(lbl);
        cont.append(group);
        return group;
    }
    class ParamSource {
        constructor(element) {
            this.element = element;
            this.params = [];
        }
        param(readFunc, writeFunc) {
            const param = new Param(this, readFunc, writeFunc);
            this.params.push(param);
            return param;
        }
        el(labelTag, labelName, elTag) {
            const el = document.createElement(elTag); // this is a little dumb but whatever
            const arg = document.createElement(labelTag);
            arg.append(document.createTextNode(`${labelName}: `));
            arg.append(el);
            this.element.append(arg);
            return el;
        }
        num(name, min, max) {
            const el = this.el('label', name, 'input');
            el.setAttribute('type', 'number');
            el.setAttribute('size', '3');
            el.setAttribute('min', min.toString());
            el.setAttribute('max', max.toString());
            el.value = min.toString();
            const get = () => Math.min(max, Math.max(min, parseInt(el.value, 10)));
            const p = this.param(() => get(), n => (el.value = n.toString()));
            el.addEventListener('change', () => p.hook(get()));
            return p;
        }
        bool(name) {
            const el = this.el('label', name, 'input');
            el.setAttribute('type', 'checkbox');
            return this.param(() => el.checked, b => (el.checked = b));
        }
        text(name) {
            const el = this.el('label', name, 'input');
            return this.param(() => el.value, s => (el.value = s));
        }
        color(name, optional = false) {
            const colorpicker = this.el('label', name, 'span');
            colorpicker.classList.add('colorpicker');
            const children = [];
            let val = optional ? -1 : 0;
            const sqr = (color, i) => {
                const el = document.createElement('span');
                if (color === 'transparent')
                    el.classList.add('transparent');
                else
                    el.style.backgroundColor = color;
                el.addEventListener('click', () => {
                    for (const ch of children)
                        ch.classList.remove('active');
                    el.classList.add('active');
                    val = i;
                });
                colorpicker.appendChild(el);
                children.push(el);
            };
            if (optional)
                sqr('transparent', -1);
            Color.colors.forEach((color, i) => { sqr(color, i); });
            children[0].classList.add('active');
            return this.param(() => val, i => children[optional ? i + 1 : i].click());
        }
        position(name) {
            const picker = this.el('label', name, 'div');
            picker.classList.add('positionpicker', 's2');
            let sz = 2;
            const setsz = (i) => {
                picker.classList.remove('s' + sz);
                sz = i;
                picker.classList.add('s' + sz);
            };
            const preview = document.createElement('div');
            const cells = [];
            for (let i = 0; i < 3; ++i) {
                const row = document.createElement('div');
                for (let j = 0; j < 3; ++j) {
                    const cell = document.createElement('div');
                    cell.classList.toggle('ctr', i == 1 && j == 1);
                    cell.classList.toggle('on', i == 1 && j == 1);
                    cell.addEventListener('click', () => {
                        cell.classList.toggle('on');
                    });
                    cells.push(cell);
                    row.append(cell);
                }
                preview.append(row);
            }
            picker.append(preview);
            const size = document.createElement('div');
            for (let i = 0; i < 5; ++i) {
                const bar = document.createElement('div');
                bar.classList.add('b' + i);
                bar.addEventListener('click', (i => () => setsz(i))(i));
                size.append(bar);
            }
            picker.append(size);
            const controls = document.createElement('div');
            for (let i = 0; i < 2; ++i) {
                const btn = document.createElement('div');
                btn.textContent = '+−'[i];
                btn.addEventListener('click', (i => () => setsz([Math.max(0, sz - 1), Math.min(4, sz + 1)][i]))(i));
                btn.addEventListener('pointerdown', e => e.preventDefault());
                controls.append(btn);
            }
            picker.append(controls);
            return this.param(() => cells.reduce((r, c, i) => r | (c.classList.contains('on') ? 1 << (i === 4 ? Data.POS_SIZE[sz] : Data.POS_LOC[i]) : 0), 0), mask => {
                cells.forEach((c, i) => c.classList.toggle('on', !!((mask >> Data.POS_LOC[i]) & 1)));
                // TODO this logic maybe pull from other function
                const ctr = (mask & 0xf) | ((mask >> 8 /* Data.Position.XS */) & 1) << 4;
                cells[4].classList.toggle('on', !!ctr);
                setsz(ctr ? Math.log2(ctr) : 4);
            });
        }
        transform(name, p) {
            const picker = this.el('label', name, 'div');
            picker.classList.add('transformpicker');
            let val = 0;
            const g = Draw.draw(undefined, 'g', {
                strokeWidth: 0.03,
                children: [p.exShape()]
            });
            const svg = Draw.draw(picker, 'svg', {
                viewBox: '-1 -1 2 2',
                children: [g]
            });
            svg.addEventListener('click', () => {
                svg.animate([
                    { transform: `rotate(${p.rotAmt * val}deg)`, easing: 'ease-out' },
                    { transform: `rotate(${p.rotAmt * (val + 1)}deg)`, easing: 'ease-in', offset: 1 },
                    { transform: `rotate(${p.rotAmt * (val = (val + 1) % Math.pow(2, p.serBits - (p.flipBit ? 1 : 0)))}deg)` }
                ], { duration: 200, fill: 'forwards' });
            });
            const ret = this.param(() => val, n => svg.style.setProperty('transform', `rotate(${p.rotAmt * (val = n)}deg)`));
            ret.setParadigm = newP => {
                p = newP;
                g.removeChild(g.firstChild);
                g.append(p.exShape());
            };
            return ret;
        }
        // TODO repetition here and multiAny kinda sucks
        multi(name, options) {
            const multisel = this.el('span', name, 'span');
            multisel.classList.add('multisel');
            const children = [];
            let val = options[0][1];
            // TODO error handling?
            const p = this.param(() => val, t => children[options.findIndex(o => o[1] === t)].click());
            for (const opt of options) {
                const el = document.createElement('button');
                el.textContent = opt[0];
                el.addEventListener('click', () => {
                    for (const ch of children)
                        ch.classList.remove('active');
                    el.classList.toggle('active');
                    p.hook(val = opt[1]);
                });
                multisel.append(el);
                children.push(el);
            }
            children[0].classList.add('active');
            return p;
        }
        multiAny(name, options) {
            const multisel = this.el('span', name, 'span');
            multisel.classList.add('multisel');
            const children = [];
            let val = [options[0][1]];
            for (const opt of options) {
                const el = document.createElement('button');
                el.textContent = opt[0];
                el.addEventListener('click', () => {
                    el.classList.toggle('active');
                    val = children
                        .map((ch, i) => ch.classList.contains('active') ? options[i][1] : undefined)
                        .filter(x => x !== undefined);
                });
                multisel.append(el);
                children.push(el);
            }
            children[0].classList.add('active');
            return this.param(() => val, arr => {
                val = arr;
                for (let i = 0; i < options.length; ++i) {
                    children[i].classList.toggle('active', arr.includes(options[i][1]));
                }
            });
        }
        subtool(name, toolbox) {
            let subs = [];
            const el = this.el('span', name, 'span');
            const addbtn = document.createElement('button');
            addbtn.textContent = '+';
            addbtn.addEventListener('click', () => {
                toolbox.queryTool('', (tparam, tool) => {
                    addsub(tparam, tool);
                });
            });
            el.append(addbtn);
            const addsub = (tparam, tool) => {
                const sub = mksub(tparam, tool);
                addbtn.before(sub.el);
                subs.push(sub);
            };
            const mksub = (tparam, tool) => {
                var _a;
                const el = document.createElement('span');
                el.classList.add('subtool');
                const sub = { el, tparam };
                const delbtn = document.createElement('button');
                delbtn.textContent = '×';
                delbtn.addEventListener('click', () => {
                    // erm
                    sub.tparam = 'REMOVE';
                    for (let i = subs.length - 1; i >= 0; --i)
                        if (subs[i].tparam === 'REMOVE')
                            subs.splice(i, 1);
                    el.remove();
                });
                el.append(delbtn);
                const editbtn = document.createElement('button');
                editbtn.textContent = '✎';
                editbtn.addEventListener('click', () => {
                    toolbox.queryTool(tparam, (newtparam, newtool) => {
                        const newsub = mksub(newtparam, newtool);
                        el.before(newsub.el);
                        el.remove();
                        sub.el = newsub.el;
                        sub.tparam = newsub.tparam;
                    });
                });
                el.append(editbtn);
                const maybeIcon = tool.icon();
                el.append(' ' + ((_a = toolbox.toolMenu.lookup.get(tparam.split(':')[0])) === null || _a === void 0 ? void 0 : _a.name) + (maybeIcon === undefined ? '' : ' '));
                if (maybeIcon !== undefined)
                    el.append(maybeIcon);
                return sub;
            };
            return this.param(() => subs.map(s => s.tparam), arr => {
                for (const sub of subs)
                    sub.el.remove();
                subs = [];
                for (const tparam of arr)
                    addsub(tparam, toolbox.toolMenu.parse(tparam));
            });
        }
        binding(name) {
            let val = undefined;
            const el = this.el('label', name, 'input');
            const p = this.param(() => val, tbind => setval(tbind));
            const setval = (tbind) => (p.hook(val = tbind), el.value = tbind === undefined ? '' : new Toolbox.Bind(tbind).describe());
            el.addEventListener('pointerdown', e => { if (e.button !== 0)
                e.preventDefault(); setval(e.button); });
            el.addEventListener('keydown', e => { e.preventDefault(); setval(e.key); });
            el.addEventListener('wheel', e => { e.preventDefault(); setval(e.deltaY < 0); });
            el.addEventListener('paste', e => e.preventDefault());
            el.addEventListener('contextmenu', e => e.preventDefault());
            return p;
        }
        setFromHTML() { for (const p of this.params)
            p.setFromHTML(); }
        setFromJSON(s) { JSON.parse(`[${s}]`).forEach((x, i) => this.params[i].setFromJSON(x)); }
        save() { return this.params.map(p => p.save()).join(','); }
        load(s) { JSON.parse(`[${s}]`).forEach((x, i) => this.params[i].load(x)); }
    }
    exports.ParamSource = ParamSource;
    function objectParam(param, paradigm) {
        const position = param.position('size');
        const transform = param.transform('rotation', paradigm);
        const location = param.multiAny('location', [
            ['center', 4],
            ['edge', 2],
            ['corner', 1]
        ]);
        const fill = param.color('fill', true);
        const outline = param.color('outline', true);
        return {
            generate: (f) => {
                if (position.val === 0) {
                    Courier.alert('should be placeable in at least one position');
                    return;
                }
                if (location.val.length === 0) {
                    Courier.alert('should be placeable in at least one location');
                    return;
                }
                if (fill.val === -1 && outline.val === -1) {
                    Courier.alert('should have at least one of fill or outline');
                    return;
                }
                return f(new Data.ObjectParam(fill.val === -1 ? undefined : fill.val, outline.val === -1 ? undefined : outline.val, position.val, transform.val, location.val.reduce((a, b) => a + b, 0)));
            },
            setParadigm: (p) => transform.setParadigm(p)
        };
    }
});
define("toolbox", ["require", "exports", "tools/alltools", "data", "courier", "input"], function (require, exports, Tools, Data, Courier, Input) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MenuItem = exports.ToolMenu = exports.Toolboxbox = exports.Toolbox = exports.ToolboxEntry = exports.Bind = void 0;
    const DEFAULT_TOOLS = `*main
m1::pan:
k ::pan:
ks::surface:0
kr::line:false,8,2,0
ke::line:true,0,2,0
kt::text:"",4,0,[4],0,-1
kz::undo:
kx::redo:
kc::copy:
kd::cut:
kv::paste:
w1::zoomin:
w0::zoomout:`;
    function onesplit(s, delim) {
        const parts = s.split(delim);
        return parts.length === 1 ? [s, undefined] : [parts[0], parts.slice(1).join(delim)];
    }
    class Bind {
        constructor(tbind) {
            this.tbind = tbind;
        }
        describe() {
            switch (typeof this.tbind) {
                case 'number': return `click ${this.tbind}`;
                case 'string': return `key [${this.tbind}]`;
                case 'boolean': return `scr ${this.tbind ? 'up' : 'dn'}`;
            }
        }
        render() {
            const el = document.createElement('span');
            el.classList.add('pic');
            switch (typeof this.tbind) {
                case 'number':
                    el.classList.add('mouse');
                    el.textContent = this.tbind.toString();
                    break;
                case 'string':
                    el.classList.add('key');
                    el.textContent = this.tbind === ' ' ? '␣' : this.tbind;
                    break;
                case 'boolean':
                    el.classList.add('mouse');
                    el.textContent = this.tbind ? '⇑' : '⇓';
                    break;
            }
            return el;
        }
        save() {
            switch (typeof this.tbind) {
                case 'number': return `m${this.tbind}`;
                case 'string': return `k${this.tbind}`;
                case 'boolean': return `w${+this.tbind}`;
            }
        }
        static load(s) {
            const bindtype = s[0];
            const bindval = s.slice(1);
            switch (bindtype) {
                case 'm': return new Bind(parseInt(bindval, 10));
                case 'k': return new Bind(bindval);
                case 'w': return new Bind(bindval === '1');
                default:
                    Courier.alert('malformed toolbox entry: bad bind');
                    throw new Error();
            }
        }
    }
    exports.Bind = Bind;
    class ToolboxEntry {
        constructor(gf, tbind, tparam, tool) {
            this.gf = gf;
            this.tbind = tbind;
            this.tparam = tparam;
            this.tool = tool;
        }
        mid() { return this.tparam.split(':')[0]; }
        spec() { return this.tparam.slice(this.tparam.indexOf(':') + 1); }
        menuItem() { return this.gf.toolbox.toolMenu.lookup.get(this.mid()); }
        replace(tbind, tparam, tool) { this.tbind = tbind; this.tparam = tparam; this.tool = tool; }
        save() {
            // the delimiter is :: to avoid any confusion about keybinds to Space
            // maybe i should just globally turn ' ' into 'Space' everywhere,
            // but whatever
            return `${this.tbind.save()}::${this.tparam}`;
        }
        static load(gf, s) {
            const [bind, rest] = onesplit(s, '::');
            if (rest === undefined) {
                Courier.alert('malformed toolbox entry: no bind');
                throw new Error();
            }
            return new ToolboxEntry(gf, Bind.load(bind), rest, gf.toolbox.toolMenu.parse(rest));
        }
        display(toolbox) {
            const container = document.createElement('div');
            container.appendChild(this.tbind.render());
            const name = document.createElement('div');
            name.textContent = this.menuItem().name;
            container.appendChild(name);
            const icon = document.createElement('div');
            const maybeIcon = this.tool.icon();
            if (maybeIcon !== undefined)
                icon.appendChild(maybeIcon);
            container.appendChild(icon);
            container.addEventListener('click', e => {
                e.preventDefault();
                if (e.button === 0 && !this.tool.onclick(this.gf.backend)) {
                    toolbox.showMenu(e, this, container);
                }
            });
            container.addEventListener('contextmenu', e => {
                e.preventDefault();
                toolbox.showMenu(e, this, container);
            });
            return container;
        }
    }
    exports.ToolboxEntry = ToolboxEntry;
    class Toolbox {
        constructor(gf, enabled, name, tools = []) {
            this.gf = gf;
            this.enabled = enabled;
            this.name = name;
            this.tools = tools;
        }
        byBind(tbind) {
            return this.tools.find(e => e.tbind.tbind === tbind.tbind);
        }
        hasBind(tbind) {
            return this.tools.some(e => e.tbind.tbind === tbind.tbind);
        }
        addBind(tbind, tparam, tool) {
            if (this.hasBind(tbind))
                return false;
            this.tools.push(new ToolboxEntry(this.gf, tbind, tparam, tool));
            return true;
        }
        delBind(e) {
            const idx = this.tools.indexOf(e);
            if (idx !== -1)
                this.tools.splice(idx, 1);
        }
        // oops naming lol
        save() { this.gf.toolbox.save(); }
        saveStr() { return (this.enabled ? '*' : '-') + this.name + this.tools.map(t => '\n' + t.save()).join(''); }
        static load(gf, s) { return new Toolbox(gf, s[0] === '*', s.split('\n')[0].slice(1), s.split('\n').slice(1).map(x => ToolboxEntry.load(gf, x))); }
        replace(s) { this.enabled = s[0] === '*'; this.name = s.split('\n')[0].slice(1); this.tools.splice(0, Infinity, ...s.split('\n').slice(1).map(x => ToolboxEntry.load(this.gf, x))); this.gf.toolbox.refresh(); } // TODO remove duplication
        display(container) {
            const cont = document.createElement('div');
            cont.classList.toggle('disabled', !this.enabled);
            const title = document.createElement('div');
            title.classList.add('tbname');
            title.textContent = this.name;
            cont.appendChild(title);
            title.addEventListener('click', e => {
                e.preventDefault();
                this.showMenu(e);
            });
            container.addEventListener('contextmenu', e => {
                e.preventDefault();
                this.showMenu(e);
            });
            cont.appendChild(this.generateList());
            cont.addEventListener('mousedown', e => {
                if (e.button === 1) {
                    this.enabled = !this.enabled;
                    this.gf.toolbox.saveRefresh();
                }
            });
            container.appendChild(cont);
        }
        generateList() {
            const container = document.createElement('div');
            container.classList.add('tbtools');
            for (const t of this.tools)
                container.appendChild(t.display(this));
            return container;
        }
        showMenu(e, te = undefined, row = undefined) {
            const c = this.gf.menu.newContextMenu(e, () => {
                if (row !== undefined)
                    row.classList.remove('activerow');
            });
            if (c === undefined)
                return;
            if (row !== undefined)
                row.classList.add('activerow');
            if (te !== undefined) {
                c.lbl(`tool ${te.menuItem().name}`);
                c.btn('✎ edit tool', () => {
                    this.gf.menu.addtool(this, te);
                    return true;
                });
                c.btn('× delete tool', () => {
                    this.gf.menu.confirm(`really delete tool ${te.menuItem().name}?`, [
                        ['delete it', () => {
                                this.delBind(te);
                                this.gf.toolbox.saveRefresh();
                            }],
                        ['never mind', () => { }]
                    ]);
                    return true;
                });
                c.space();
            }
            c.lbl(`toolbox ${this.name}`);
            c.btn('+ add new tool', () => {
                this.gf.menu.addtool(this, undefined);
                return true;
            });
            c.btn('× delete toolbox', () => {
                this.gf.menu.confirm(`really delete toolbox ${this.name}?`, [
                    ['delete it', () => {
                            this.gf.toolbox.delToolbox(this);
                            this.gf.toolbox.saveRefresh();
                        }],
                    ['never mind', () => { }]
                ]);
                return true;
            });
            const renametxt = document.createElement('input');
            renametxt.setAttribute('placeholder', 'toolbox name...');
            renametxt.value = this.name;
            c.menu.appendChild(renametxt);
            const renamefn = () => {
                if (renametxt.value.replace(/\s/g, '')) {
                    this.name = renametxt.value;
                    this.gf.toolbox.saveRefresh();
                    return true;
                }
                else {
                    Courier.alert(`please provide a name to rename ${this.name} to`);
                }
            };
            c.btn('✎ rename toolbox', renamefn);
            renametxt.addEventListener('keyup', e => e.stopPropagation());
            renametxt.addEventListener('keydown', e => {
                e.stopPropagation();
                if (e.key === 'Enter')
                    if (renamefn())
                        c.close();
                if (e.key === 'Escape')
                    renametxt.blur();
            });
            c.btn('⇅ import/export', () => {
                this.gf.menu.ietool(this.saveStr(), s => this.replace(s));
                return true;
            });
            c.space();
            c.lbl('all toolboxes');
            const addtxt = document.createElement('input');
            addtxt.setAttribute('placeholder', 'toolbox name...');
            c.menu.appendChild(addtxt);
            const addfn = () => {
                if (addtxt.value.replace(/\s/g, '')) {
                    this.gf.toolbox.toolboxes.push(new Toolbox(this.gf, true, addtxt.value));
                    this.gf.toolbox.saveRefresh();
                    return true;
                }
                else {
                    Courier.alert('please provide a name for your new toolbox');
                }
            };
            c.btn('+ add new toolbox', addfn);
            addtxt.addEventListener('keyup', e => e.stopPropagation());
            addtxt.addEventListener('keydown', e => {
                e.stopPropagation();
                if (e.key === 'Enter')
                    if (addfn())
                        c.close();
                if (e.key === 'Escape')
                    addtxt.blur();
            });
            c.btn('⇅ import/export', () => {
                this.gf.menu.ietool(this.gf.toolbox.saveStr(), s => this.gf.toolbox.load(s));
                return true;
            });
            c.reposition();
        }
    }
    exports.Toolbox = Toolbox;
    class Toolboxbox {
        constructor(gf, container) {
            this.gf = gf;
            this.container = container;
            this.toolboxes = [];
            this.mouseTools = new Map();
            this.keyTools = new Map();
            this.wheelTools = new Map();
            this.toolMenu = gf.menu.init_addtool(el => this.generateMenu(el));
        }
        save() { localStorage.toolbox = this.saveStr(); }
        saveStr() { return this.toolboxes.map(b => b.saveStr()).join('\n:\n'); }
        load(s) { this.toolboxes = s.split('\n:\n').map(x => Toolbox.load(this.gf, x)); this.refresh(); }
        loadSaved(s) { this.load(s !== null && s !== void 0 ? s : DEFAULT_TOOLS); }
        refresh() { this.recompute(); this.rerender(); }
        saveRefresh() { this.refresh(); this.save(); }
        delToolbox(t) {
            const idx = this.toolboxes.indexOf(t);
            if (idx !== -1)
                this.toolboxes.splice(idx, 1);
        }
        recompute() {
            this.mouseTools.clear();
            this.keyTools.clear();
            this.wheelTools.clear();
            for (const toolbox of this.toolboxes) {
                if (!toolbox.enabled)
                    continue;
                for (const entry of toolbox.tools) {
                    switch (typeof entry.tbind.tbind) {
                        case 'number':
                            this.mouseTools.set(entry.tbind.tbind, [toolbox, entry.tool]);
                            break;
                        case 'string':
                            this.keyTools.set(entry.tbind.tbind, [toolbox, entry.tool]);
                            break;
                        case 'boolean':
                            this.wheelTools.set(entry.tbind.tbind, [toolbox, entry.tool]);
                            break;
                    }
                }
            }
        }
        rerender() {
            if (this.container === undefined)
                return;
            while (this.container.firstChild)
                this.container.removeChild(this.container.firstChild);
            for (const t of this.toolboxes)
                t.display(this.container);
        }
        generateMenu(menuCont) {
            const tm = new ToolMenu();
            let group;
            group = Input.makeGroup(menuCont, 'drawing');
            group.append(tm.item('surface', 'Surface', (param) => {
                const color = param.color('color');
                return () => new Tools.SurfaceTool(color.val);
            }, 'full'));
            group.append(tm.item('line', 'Line', (param) => {
                const type = param.multi('type', [['path', false], ['edge', true]]);
                const color = param.color('color');
                const thickness = param.multi('thickness', [['thin', 1], ['normal', 2], ['thick', 3]]);
                const head = param.multi('head', [['none', 0 /* Data.Head.NONE */], ['arrow', 1 /* Data.Head.ARROW */]]);
                return () => new Tools.LineTool(type.val, color.val, thickness.val, head.val);
            }, 'full'));
            group.append(tm.item('wall', 'Wall', (param) => {
                const color = param.color('color');
                const thickness = param.multi('thickness', [['thin', 1], ['normal', 2], ['thick', 3]]);
                const head = param.multi('head', [['none', 0 /* Data.Head.NONE */], ['arrow', 1 /* Data.Head.ARROW */]]);
                // TODO
                const location = param.multiAny('location', [
                    ['center', 4],
                    ['edge', 2],
                    ['corner', 1]
                ]);
                return () => new Tools.WallTool(color.val, thickness.val, head.val, location.val.reduce((a, b) => a + b, 0));
            }, 'full'));
            group.append(tm.item('poly', 'Polygon', (param) => {
                const sides = param.num('sides', 3, 18);
                const star = param.bool('star');
                const spec = Input.objectParam(param, Data.PolyTile.paradigm[3]);
                sides.hook = n => spec.setParadigm(Data.PolyTile.paradigm[n]);
                return () => spec.generate(spec => new Tools.PolyTool(sides.val, star.val, spec));
            }, 'full'));
            group.append(tm.item('shape', 'Shape', (param) => {
                const type = param.multi('type', [
                    ['circle', 0 /* Data.Shape.CIRCLE */],
                    ['cross', 1 /* Data.Shape.CROSS */],
                    ['flag', 2 /* Data.Shape.FLAG */],
                    ['arrow', 3 /* Data.Shape.ARROW */],
                ]);
                const spec = Input.objectParam(param, Data.ShapeTile.paradigm[0 /* Data.Shape.CIRCLE */]);
                type.hook = shape => spec.setParadigm(Data.ShapeTile.paradigm[shape]);
                return () => spec.generate(spec => new Tools.ShapeTool(type.val, spec));
            }, 'full'));
            group.append(tm.item('text', 'Text', (param) => {
                const preset = param.text('preset');
                const spec = Input.objectParam(param, Data.TextTile.paradigm);
                return () => spec.generate(spec => new Tools.TextTool(preset.val, spec));
            }, 'full'));
            group = Input.makeGroup(menuCont, 'movement');
            group.append(tm.item('pan', 'Pan', () => () => new Tools.PanTool()));
            group.append(tm.item('zoomin', 'Zoom in', () => () => new Tools.ZoomTool(1)));
            group.append(tm.item('zoomout', 'Zoom out', () => () => new Tools.ZoomTool(-1)));
            group = Input.makeGroup(menuCont, 'stamps');
            group.append(tm.item('copy', 'Copy', () => () => new Tools.CopyTool(false)));
            group.append(tm.item('cut', 'Cut', () => () => new Tools.CopyTool(true)));
            group.append(tm.item('paste', 'Paste', () => () => new Tools.PasteTool()));
            group.append(tm.item('flip', 'Flip', (param) => {
                const direction = param.multi('direction', [
                    ['\u00a0↔\u00a0', 0],
                    ['\u00a0↕\u00a0', 1],
                    ['\u00a0⤡\u00a0', 2],
                    ['\u00a0⤢\u00a0', 3]
                ]);
                return () => new Tools.TransformTool(direction.val);
            }, 'natwidth'));
            group.append(tm.item('rotate', 'Rotate', (param) => {
                const direction = param.multi('direction', [
                    ['\u00a0↶\u00a0', 10],
                    ['\u00a0↷\u00a0', 11],
                    ['180°', 12]
                ]);
                return () => new Tools.TransformTool(direction.val);
            }, 'natwidth'));
            group.append(tm.item('func', 'Func', (param) => {
                const name = param.text('name');
                return () => new Tools.FuncTool(name.val);
            }, 'natwidth'));
            group = Input.makeGroup(menuCont, 'misc');
            group.append(tm.item('undo', 'Undo', () => () => new Tools.UndoTool(true)));
            group.append(tm.item('redo', 'Redo', () => () => new Tools.UndoTool(false)));
            group = Input.makeGroup(menuCont, 'meta');
            group.append(tm.item('multi', 'Multi', (param) => {
                const subtools = param.subtool('subtools', this);
                return () => subtools.val.length ? new Tools.MultiTool(subtools.val.map(s => this.toolMenu.parse(s))) : (Courier.alert('add at least one subtool'), undefined);
            }, 'natwidth'));
            group.append(tm.item('bind', 'Bind', (param) => {
                const name = param.text('toolbox');
                const binding = param.binding('binding');
                const action = param.subtool('action', this);
                return () => {
                    if (binding.val === undefined) {
                        Courier.alert('please pick a binding to bind to');
                        return;
                    }
                    if (action.val.length === 0) {
                        Courier.alert('please pick an action to bind to');
                        return;
                    }
                    return new Tools.BindTool(this, name.val, new Bind(binding.val), action.val[0], this.toolMenu.parse(action.val[0]));
                };
            }, 'natwidth'));
            return tm;
        }
        queryTool(prevVal, cb) {
            const toolMenu = this.gf.menu.push('confirm subtool', (cont) => {
                cont.classList.add('big');
                cont.classList.add('actions');
                return this.generateMenu(cont);
            }, (tm, page) => {
                const tool = this.gf.menu.getSelectedTool(tm, page);
                if (tool === undefined)
                    return false;
                cb(tool[0], tool[1]);
                return true;
            });
            if (toolMenu && prevVal)
                this.gf.menu.setSelectedTool(toolMenu, prevVal);
        }
    }
    exports.Toolboxbox = Toolboxbox;
    class ToolMenu {
        constructor() {
            this.lookup = new Map();
        }
        item(mid, name, f, extraClass = undefined) {
            const menuItem = new MenuItem(this, mid, name, f, extraClass);
            this.lookup.set(mid, menuItem);
            return menuItem.element;
        }
        clearActive() { for (const v of this.lookup.values())
            v.element.classList.remove('addtool-active'); }
        parse(s) {
            const [mid, spec] = onesplit(s, ':');
            if (spec === undefined) {
                Courier.alert('malformed toolbox entry: no menu id');
                throw new Error();
            }
            const menuItem = this.lookup.get(mid);
            if (menuItem === undefined) {
                Courier.alert('malformed toolbox entry: bad menu id');
                throw new Error();
            }
            const tool = menuItem.fromJSON(spec);
            if (tool === undefined) {
                Courier.alert('malformed toolbox entry: tool gen failed');
                throw new Error();
            }
            return tool;
        }
    }
    exports.ToolMenu = ToolMenu;
    class MenuItem {
        // if f returns undefined, it should always show a Courier alert explaining why
        constructor(toolMenu, mid, name, f, extraClass = undefined) {
            this.toolMenu = toolMenu;
            this.mid = mid;
            this.name = name;
            this.element = document.createElement('div');
            this.element.dataset.tool = mid;
            this.element.classList.add('settool');
            if (extraClass !== undefined)
                this.element.classList.add(extraClass);
            this.element.append(document.createTextNode(name));
            this.element.addEventListener('click', () => {
                this.toolMenu.clearActive();
                this.element.classList.add('addtool-active');
            });
            this.psource = new Input.ParamSource(this.element);
            this.generate = f(this.psource);
        }
        fromHTML() { this.psource.setFromHTML(); return this.generate(); }
        fromJSON(s) { this.psource.setFromJSON(s); return this.generate(); }
        save() { return this.mid + ':' + this.psource.save(); }
        load(s) { this.psource.load(s); }
    }
    exports.MenuItem = MenuItem;
});
define("menu", ["require", "exports", "stamp", "data", "draw", "toolbox", "file", "courier"], function (require, exports, Stamp, Data, Draw, Toolbox, File, Courier) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function download(fname, data, contenttype) {
        const blob = new Blob([data], { type: contenttype });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', fname);
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    function copy(s) {
        navigator.clipboard.writeText(s).then(() => {
            Courier.alert('copied to clipboard!');
        }, e => {
            Courier.alert(`failed to copy to clipboard: ${e}`);
        });
    }
    // TODO full page import
    // TODO refactor some of this
    // TODO give feedback when no stamp
    const menuactions = new Map([
        ['dark', () => {
                document.body.classList.toggle('dark');
            }],
        ['ultxt', (manager) => {
                navigator.clipboard.readText().then(s => {
                    manager.gb.stamp.add(Data.deserializeStamp(new Uint8Array(atob(s).split('').map(c => c.charCodeAt(0)))));
                }, e => {
                    Courier.alert(`failed to read from clipboard: ${e}`);
                });
            }],
        ['ulstamp', (manager) => {
                const fileinput = document.getElementById('fileinput');
                const cb = () => {
                    fileinput.removeEventListener('change', cb);
                    fileinput.files[0].bytes().then(x => manager.gb.stamp.add(Data.deserializeStamp(x)));
                };
                fileinput.addEventListener('change', cb);
                fileinput.click();
            }],
        ['dltxt', (manager) => {
                const stamp = manager.state.get('iesel') === 'full' ? Stamp.unsafeWrap(manager.gb.data.listcells()) : manager.gb.stamp.current();
                if (stamp === undefined)
                    return;
                copy(btoa(String.fromCharCode.apply(null, Data.serializeStamp(stamp.cells))));
            }],
        ['dlstamp', (manager) => {
                const stamp = manager.state.get('iesel') === 'full' ? Stamp.unsafeWrap(manager.gb.data.listcells()) : manager.gb.stamp.current();
                if (stamp === undefined)
                    return;
                download('gratility.stamp', Data.serializeStamp(stamp.cells), 'application/octet-stream');
            }],
        ['dlsvg', (manager) => {
                const stamp = manager.state.get('iesel') === 'full' ? Stamp.render(manager.gb.data.listcells()) : manager.gb.stamp.current();
                if (stamp === undefined)
                    return;
                const svg = Draw.draw(undefined, 'svg');
                stamp.toSVG(svg);
                download('gratility.svg', svg.outerHTML, 'image/svg+xml;charset=utf-8');
            }]
    ]);
    const menuevents = new Map();
    // ###### ADD TOOL MENU ###### //
    let resolve = undefined;
    menuevents.set('addtool-nop', (manager, menu, e) => {
        e.preventDefault();
    });
    // TODO: something if file does not exist below? it should never not exist
    // ###### SERVER MENU ###### //
    menuevents.set('server-login', (manager, menu) => {
        var _a;
        (_a = manager.gb.data.file) === null || _a === void 0 ? void 0 : _a.sendWS({
            m: 'login',
            username: menu.inputs.get('username').value,
            password: menu.inputs.get('password').value
        });
        manager.close();
    });
    menuevents.set('server-register', (manager, menu) => {
        var _a;
        (_a = manager.gb.data.file) === null || _a === void 0 ? void 0 : _a.sendWS({
            m: 'register',
            username: menu.inputs.get('username').value,
            password: menu.inputs.get('password').value
        });
        manager.close();
    });
    // ###### FILE MENU ###### //
    menuevents.set('file-open', (manager, menu) => {
        const file = manager.gb.data.file;
        if (file === undefined)
            return;
        const localList = menu.popup.querySelector('#localfilelist');
        while (localList.firstChild)
            localList.removeChild(localList.firstChild);
        for (const [s, t] of file.localFiles) {
            const e = document.createElement('div');
            e.innerText = t;
            e.addEventListener('click', () => {
                file.open(new File.File(File.Schema.LOCAL, s, t));
                manager.close();
            });
            localList.appendChild(e);
        }
        const serverList = menu.popup.querySelector('#serverfilelist');
        while (serverList.firstChild)
            serverList.removeChild(serverList.firstChild);
        for (const [s, t] of file.serverFiles) {
            const e = document.createElement('div');
            e.innerText = t;
            e.addEventListener('click', () => {
                file.open(new File.File(File.Schema.SERVER, s, t));
                manager.close();
            });
            serverList.appendChild(e);
        }
    });
    menuevents.set('file-newlocal', (manager, menu) => {
        var _a;
        (_a = manager.gb.data.file) === null || _a === void 0 ? void 0 : _a.open(new File.File(File.Schema.LOCAL, '', menu.inputs.get('newlocaltitle').value), true);
        manager.close();
    });
    menuevents.set('file-newserver', (manager, menu) => {
        var _a;
        (_a = manager.gb.data.file) === null || _a === void 0 ? void 0 : _a.open(new File.File(File.Schema.SERVER, '', menu.inputs.get('newservertitle').value), true);
        manager.close();
    });
    // ###### FILE SETTINGS MENU ###### //
    menuevents.set('filesetting-open', (manager, menu) => {
        const link = document.createElement('a');
        const url = manager.gb.data.file.getURL();
        link.textContent = 'copy link to this document';
        link.setAttribute('href', url);
        link.addEventListener('click', e => {
            e.preventDefault();
            copy(url);
        });
        const cont = menu.popup.firstElementChild;
        while (cont.firstChild)
            cont.firstChild.remove();
        cont.append(link);
    });
    class Menu {
        constructor(name, popup, inputs) {
            this.name = name;
            this.popup = popup;
            this.inputs = inputs;
        }
        open() { this.popup.style.display = 'flex'; }
        close() { this.popup.style.display = 'none'; }
    }
    class ContextMenu {
        constructor(e, onclose) {
            this.e = e;
            this.onclose = onclose;
            this.menu = document.createElement('div');
            this.menu.classList.add('contextmenu');
            this.menu.style.left = e.pageX + 'px';
            this.menu.style.top = e.pageY + 'px';
            document.body.appendChild(this.menu);
            this.overlay = document.createElement('div');
            this.overlay.classList.add('overlay');
            document.body.appendChild(this.overlay);
            this.overlay.addEventListener('click', e => {
                e.stopPropagation();
                this.close();
            });
        }
        close() {
            this.menu.remove();
            this.overlay.remove();
            this.onclose();
        }
        lbl(label) {
            const lbl = document.createElement('div');
            lbl.classList.add('menulbl');
            lbl.textContent = label;
            this.menu.appendChild(lbl);
        }
        btn(label, click) {
            const btn = document.createElement('div');
            btn.classList.add('menubtn');
            btn.textContent = label;
            btn.addEventListener('click', () => {
                if (click())
                    this.close();
            });
            this.menu.appendChild(btn);
        }
        space() {
            const elt = document.createElement('div');
            elt.classList.add('spacer');
            this.menu.appendChild(elt);
        }
        reposition() {
            const rect = this.menu.getBoundingClientRect();
            if (rect.y + rect.height > window.innerHeight) {
                this.menu.style.top = (this.e.pageY - rect.height) + 'px';
            }
        }
    }
    class MenuManager {
        isOpen() { return this.activeMenu !== undefined || this.contextMenu !== undefined; }
        open(mname) {
            if (this.activeMenu !== undefined)
                return;
            const menu = this.menus.get(mname);
            if (menu === undefined)
                return;
            menu.open();
            this.activeMenu = menu;
            this.menuevent(menu, 'open');
            return menu;
        }
        close() {
            if (this.activeMenu !== undefined) {
                const menu = this.activeMenu;
                const pages = menu.popup.querySelectorAll('.page');
                if (pages.length > 1)
                    pages[0].remove();
                else {
                    this.activeMenu.close();
                    this.activeMenu = undefined;
                    this.menuevent(menu, 'close');
                }
            }
        }
        newContextMenu(e, onclose) {
            if (this.contextMenu !== undefined)
                return undefined;
            this.contextMenu = new ContextMenu(e, () => {
                this.contextMenu = undefined;
                onclose();
            });
            return this.contextMenu;
        }
        closeContextMenu() {
            var _a;
            (_a = this.contextMenu) === null || _a === void 0 ? void 0 : _a.close();
        }
        confirm(msg, btns) {
            const menu = this.open('confirm');
            if (menu === undefined)
                return;
            menu.popup.querySelector('#confmsg').textContent = msg;
            menu.popup.querySelector('#confbtn').textContent = '';
            for (const [lbl, cb] of btns) {
                const btn = document.createElement('button');
                btn.textContent = lbl;
                btn.addEventListener('click', () => {
                    this.close();
                    cb();
                });
                menu.popup.querySelector('#confbtn').appendChild(btn);
            }
        }
        ietool(initVal, cb) {
            const menu = this.open('ietool');
            if (menu === undefined)
                return;
            const elt = menu.inputs.get('value');
            elt.value = initVal;
            elt.focus();
            elt.select();
            menuevents.set('ietool-go', (manager, menu) => {
                cb(elt.value);
                manager.gf.toolbox.save();
                manager.close();
            });
        }
        init_addtool(fn) {
            const menu = this.menus.get('addtool');
            if (menu === undefined)
                return fn(document.createElement('div')); // TODO
            return fn(menu.popup.querySelector('#actions'));
        }
        addtool(box, entry) {
            const menu = this.open('addtool');
            if (menu === undefined)
                return;
            const elt = menu.inputs.get('binding');
            const btn = menu.inputs.get('go');
            elt.classList.remove('conflict');
            this.gf.toolbox.toolMenu.clearActive();
            if (entry === undefined) {
                elt.value = '';
                resolve = undefined;
                btn.textContent = 'add';
            }
            else {
                elt.value = entry.tbind.describe();
                resolve = entry.tbind;
                btn.textContent = 'save edits';
                this.setSelectedTool(this.gf.toolbox.toolMenu, entry.tparam);
            }
            const setres = (b, target) => {
                var _a;
                target.value = b.describe();
                const conflict = b.tbind !== ((_a = entry === null || entry === void 0 ? void 0 : entry.tbind) === null || _a === void 0 ? void 0 : _a.tbind) && box.hasBind(b);
                target.classList.toggle('conflict', conflict);
                resolve = conflict ? undefined : b;
            };
            menuevents.set('addtool-bindmouse', (manager, menu, e, target) => {
                if (e.button !== 0)
                    e.preventDefault();
                setres(new Toolbox.Bind(e.button), target);
            });
            menuevents.set('addtool-bindkey', (manager, menu, e, target) => {
                e.preventDefault();
                setres(new Toolbox.Bind(e.key), target);
            });
            menuevents.set('addtool-bindwheel', (manager, menu, e, target) => {
                setres(new Toolbox.Bind(e.deltaY < 0), target);
            });
            menuevents.set('addtool-go', (manager, menu) => {
                if (resolve === undefined) {
                    Courier.alert('please pick an available binding for this tool');
                    return;
                }
                const tool = manager.getSelectedTool(this.gf.toolbox.toolMenu, menu.popup);
                if (tool === undefined)
                    return;
                if (entry === undefined) {
                    box.addBind(resolve, tool[0], tool[1]);
                }
                else {
                    entry.replace(resolve, tool[0], tool[1]);
                }
                manager.gf.toolbox.saveRefresh();
                manager.close();
            });
        }
        setSelectedTool(toolMenu, tparam) {
            const menuItem = toolMenu.lookup.get(tparam.split(':')[0]);
            if (menuItem === undefined) {
                console.error('no menu item in setSelectedTool??', toolMenu, tparam);
            }
            else {
                menuItem.element.classList.add('addtool-active');
                menuItem.element.scrollIntoView();
                menuItem.load(tparam.slice(tparam.indexOf(':') + 1));
            }
        }
        getSelectedTool(toolMenu, cont) {
            const el = cont.querySelector('.addtool-active');
            if (!el) {
                Courier.alert('please pick an action for this tool');
                return;
            }
            const menuItem = toolMenu.lookup.get(el.dataset.tool);
            if (menuItem === undefined)
                return;
            const tparam = menuItem.save();
            const tool = menuItem.fromHTML();
            if (tool === undefined)
                return;
            return [tparam, tool];
        }
        push(btnText, fn, cb) {
            const menu = this.activeMenu;
            if (menu === undefined)
                return;
            const page = document.createElement('div');
            page.classList.add('page');
            menu.popup.prepend(page);
            const cont = document.createElement('div');
            page.append(cont);
            const ret = fn(cont);
            const btn = document.createElement('button');
            btn.textContent = btnText;
            btn.addEventListener('click', e => {
                if (cb(ret, cont))
                    page.remove();
            });
            page.append(btn);
            return ret;
        }
        constructor(gf, gb, btns, popups, states) {
            this.gf = gf;
            this.gb = gb;
            this.activeMenu = undefined;
            this.contextMenu = undefined;
            this.stack = [];
            this.menus = new Map();
            this.state = new Map();
            for (const btn of btns) {
                btn.addEventListener('click', () => {
                    btn.blur();
                    if (this.open(btn.dataset.menu))
                        return;
                    const fn = menuactions.get(btn.dataset.menu);
                    if (fn !== undefined)
                        fn(this);
                });
            }
            for (const popup of popups) {
                const menu = new Menu(popup.dataset.menu, popup, new Map(Array.from(popup.getElementsByClassName('menuinput')).map(ipt => {
                    const evs = ipt.dataset.event;
                    if (evs !== undefined) {
                        for (const ev of evs.split(';')) {
                            const [k, v] = ev.split('=');
                            ipt.addEventListener(k, e => {
                                this.menuevent(menu, v, e, ipt);
                            });
                        }
                    }
                    const chevs = ipt.dataset.events;
                    if (chevs !== undefined) {
                        for (const chev of chevs.split('&')) {
                            const [sel, subevs] = chev.split('@');
                            for (const ch of Array.from(popup.querySelectorAll(sel))) {
                                for (const subev of subevs.split(';')) {
                                    const [k, v] = subev.split('=');
                                    ch.addEventListener(k, e => {
                                        this.menuevent(menu, v, e, ch);
                                    });
                                }
                            }
                        }
                    }
                    return [ipt.dataset.menu, ipt];
                })));
                this.menus.set(popup.dataset.menu, menu);
                const close = document.createElement('div');
                close.textContent = '×';
                close.className = 'menuclose';
                close.addEventListener('click', () => {
                    this.close();
                });
                popup.appendChild(close);
            }
            for (const state of states) {
                // TODO refactor stuff in input.ts + this
                if (state.classList.contains('multisel')) {
                    const k = state.dataset.menu;
                    const any = state.classList.contains('any');
                    const children = Array.from(state.children);
                    for (const child of children) {
                        child.addEventListener('click', () => {
                            if (!any)
                                for (const ch of children)
                                    ch.classList.remove('active');
                            child.classList.toggle('active');
                            this.state.set(k, children
                                .filter(ch => ch.classList.contains('active'))
                                .map(ch => ch.dataset.multisel)
                                .join('|'));
                        });
                    }
                    if (any) {
                        this.state.set(k, '');
                    }
                    else {
                        children[0].classList.add('active');
                        this.state.set(k, children[0].dataset.multisel);
                    }
                }
            }
        }
        menuevent(menu, ev, e = undefined, target = undefined) {
            const fn = menuevents.get(`${menu.name}-${ev}`);
            if (fn !== undefined)
                fn(this, menu, e, target);
        }
    }
    exports.default = MenuManager;
});
define("gratility", ["require", "exports", "toolbox", "menu"], function (require, exports, Toolbox, menu_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Frontend = exports.Backend = void 0;
    class Backend {
        constructor(image, data, stamp, view) {
            this.image = image;
            this.data = data;
            this.stamp = stamp;
            this.view = view;
        }
    }
    exports.Backend = Backend;
    class Frontend {
        constructor(backend, toolcont, toolsaved, btns, popups, states) {
            this.backend = backend;
            // kinda hacky, but must be done in this order, because toolbox references menu
            this.menu = new menu_js_1.default(this, backend, btns, popups, states);
            this.toolbox = new Toolbox.Toolboxbox(this, toolcont);
            this.toolbox.loadSaved(toolsaved); // uh oh it got hackier (same reason)
        }
    }
    exports.Frontend = Frontend;
});
define("tools/tool", ["require", "exports", "data", "draw", "measure"], function (require, exports, Data, Draw, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SelectTool = exports.DragTool = exports.Tool = void 0;
    class Tool {
        icon() { }
        ondown(x, y, g, b) { }
        onmove(x, y, g) { }
        onup(g) { }
        onclick(g) { return false; }
    }
    exports.Tool = Tool;
    class DragTool extends Tool {
        constructor() {
            super(...arguments);
            this.isDrawing = false;
        }
        draw(cell) { return this.tile; }
        erase(cell) { return undefined; }
        drag(isDown, n, g) {
            var _a;
            const cell = (_a = g.data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(this.tile.layer);
            // TODO think this is just impossible to get correct due to
            // lack of dependent types, but should think about it more
            // TODO wtf, this logic is really weird and i feel like something
            // should change/simplify but not sure what
            if (cell && (cell.eq(this.tile) || !isDown && !this.isDrawing)) {
                if (isDown || !this.isDrawing) {
                    this.isDrawing = false;
                    g.data.add(new Data.Change(n, cell, this.erase(cell)));
                }
            }
            else {
                if (isDown || this.isDrawing) {
                    this.isDrawing = true;
                    g.data.add(new Data.Change(n, cell, this.draw(cell)));
                }
            }
        }
    }
    exports.DragTool = DragTool;
    class SelectTool extends Tool {
        constructor() {
            super(...arguments);
            this.sx = 0;
            this.sy = 0;
            this.tx = 0;
            this.ty = 0;
        }
        ondown(x, y, g) {
            this.sx = x;
            this.sy = y;
            this.tx = x;
            this.ty = y;
            this.elt = Draw.draw(g.image.copypaste, 'rect', {
                x: x,
                y: y,
                width: 0,
                height: 0,
                fill: 'rgba(0,0,0,0.25)',
                stroke: '#000'
            });
        }
        onmove(x, y) {
            this.tx = x;
            this.ty = y;
            const sx = Measure.physhc(Math.min(this.sx, this.tx));
            const sy = Measure.physhc(Math.min(this.sy, this.ty));
            const tx = Measure.physhc(Math.max(this.sx, this.tx));
            const ty = Measure.physhc(Math.max(this.sy, this.ty));
            if (this.elt !== undefined) {
                this.elt.setAttribute('x', sx.toString());
                this.elt.setAttribute('y', sy.toString());
                this.elt.setAttribute('width', (tx - sx).toString());
                this.elt.setAttribute('height', (ty - sy).toString());
            }
        }
        onup(g) {
            if (this.elt !== undefined)
                g.image.copypaste.removeChild(this.elt);
            const sx = Measure.hc(Math.min(this.sx, this.tx));
            const sy = Measure.hc(Math.min(this.sy, this.ty));
            const tx = Measure.hc(Math.max(this.sx, this.tx));
            const ty = Measure.hc(Math.max(this.sy, this.ty));
            this.onselect(sx, sy, tx, ty, g);
        }
    }
    exports.SelectTool = SelectTool;
});
define("event", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.keyeater = exports.onmove = void 0;
    exports.initialize = initialize;
    exports.onmove = [];
    exports.keyeater = { ref: undefined };
    function initialize(gf, gb, svg, page) {
        const activeTools = new Set();
        let lastX = 0;
        let lastY = 0;
        let upd = (e) => {
            // TODO this moved in here to support gratility as a library usage
            // but maybe there's a better way
            const rect = svg.getBoundingClientRect();
            lastX = (e.clientX - rect.left) / gb.view.zoom() - gb.view.x;
            lastY = (e.clientY - rect.top) / gb.view.zoom() - gb.view.y;
        };
        svg.addEventListener('contextmenu', e => e.preventDefault());
        svg.addEventListener('pointermove', e => {
            if (gf.menu.isOpen())
                return;
            upd(e);
            for (const t of activeTools)
                t.onmove(lastX, lastY, gb);
            for (const f of exports.onmove)
                f(lastX, lastY);
        });
        svg.addEventListener('pointerdown', e => {
            if (gf.menu.isOpen())
                return;
            upd(e);
            const t = gf.toolbox.mouseTools.get(e.button);
            if (t === undefined)
                return;
            t[1].ondown(lastX, lastY, gb, t[0]);
            activeTools.add(t[1]);
        });
        svg.addEventListener('pointerup', e => {
            if (gf.menu.isOpen())
                return;
            const t = gf.toolbox.mouseTools.get(e.button);
            if (t === undefined)
                return;
            t[1].onup(gb);
            activeTools.delete(t[1]);
        });
        svg.addEventListener('pointerleave', e => {
            for (const t of activeTools)
                t.onup(gb);
            activeTools.clear();
        });
        const kd = (e) => {
            if (gf.menu.isOpen()) {
                if (e.key === 'Escape') {
                    gf.menu.close();
                    gf.menu.closeContextMenu();
                }
                return;
            }
            if (exports.keyeater.ref !== undefined) {
                exports.keyeater.ref(e);
                return;
            }
            const t = gf.toolbox.keyTools.get(e.key);
            if (t === undefined)
                return;
            if (e.repeat && !t[1].repeat)
                return;
            t[1].ondown(lastX, lastY, gb, t[0]);
            activeTools.add(t[1]);
        };
        page.addEventListener('keydown', kd);
        const ku = (e) => {
            if (gf.menu.isOpen())
                return;
            const t = gf.toolbox.keyTools.get(e.key);
            if (t === undefined)
                return;
            t[1].onup(gb);
            activeTools.delete(t[1]);
        };
        page.addEventListener('keyup', ku);
        const wh = (e) => {
            if (gf.menu.isOpen())
                return;
            const t = gf.toolbox.wheelTools.get(e.deltaY < 0);
            if (t === undefined)
                return;
            t[1].ondown(lastX, lastY, gb, t[0]);
            t[1].onup(gb);
        };
        page.addEventListener('wheel', wh);
        return () => {
            page.removeEventListener('keydown', kd);
            page.removeEventListener('keyup', ku);
            page.removeEventListener('wheel', wh);
        };
    }
});
define("stamp", ["require", "exports", "draw", "data", "event", "measure", "image"], function (require, exports, Draw, Data, Event, Measure, image_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.StampManager = exports.Stamp = void 0;
    exports.unsafeWrap = unsafeWrap;
    exports.render = render;
    class Stamp {
        // ideally this shouldn't be outside world exposed
        constructor(cells, xoff, yoff, xmin, xmax, ymin, ymax) {
            this.cells = cells;
            this.xoff = xoff;
            this.yoff = yoff;
            this.xmin = xmin;
            this.xmax = xmax;
            this.ymin = ymin;
            this.ymax = ymax;
        }
        apply(data, xoff, yoff, noUndo = false) {
            var _a;
            for (let i = 0; i < this.cells.length; ++i) {
                const cell = this.cells[i];
                const [x, y] = Data.decode(cell.n);
                const newn = Data.encode(x - this.xoff + xoff, y - this.yoff + yoff);
                const pre = (_a = data.halfcells.get(newn)) === null || _a === void 0 ? void 0 : _a.get(cell.tile.layer);
                if (pre !== cell.tile) { // TODO don't think ref equality is correct here, but neither is eq()
                    const ch = new Data.Change(newn, pre, cell.tile, i !== this.cells.length - 1);
                    if (noUndo)
                        data.perform(ch);
                    else
                        data.add(ch);
                }
            }
        }
        reflect(isHorizontal) {
            return new Stamp(this.cells.map(cell => {
                const [x, y] = Data.decode(cell.n);
                const newn = Data.encode(isHorizontal ? 2 * this.xoff - x : x, isHorizontal ? y : 2 * this.yoff - y);
                return new Data.Item(newn, cell.tile);
            }), this.xoff, this.yoff, isHorizontal ? 2 * this.xoff - this.xmin : this.xmin, isHorizontal ? 2 * this.xoff - this.xmax : this.xmax, isHorizontal ? this.ymin : 2 * this.yoff - this.ymin, isHorizontal ? this.ymax : 2 * this.yoff - this.ymax);
        }
        rotate(isLeft) {
            const xmult = isLeft ? 1 : -1, ymult = isLeft ? -1 : 1;
            return new Stamp(this.cells.map(cell => {
                const [x, y] = Data.decode(cell.n);
                const newn = Data.encode(this.xoff + xmult * (y - this.yoff), this.yoff + ymult * (x - this.xoff));
                return new Data.Item(newn, cell.tile);
            }), this.xoff, this.yoff, isLeft ? this.xoff + xmult * (this.ymin - this.yoff) : this.xoff + xmult * (this.ymax - this.yoff), isLeft ? this.xoff + xmult * (this.ymax - this.yoff) : this.xoff + xmult * (this.ymin - this.yoff), isLeft ? this.yoff + ymult * (this.xmax - this.xoff) : this.yoff + ymult * (this.xmin - this.xoff), isLeft ? this.yoff + ymult * (this.xmin - this.xoff) : this.yoff + ymult * (this.xmax - this.xoff));
            // TODO ^ these might be wrong
        }
        toSVG(svg, bgcolor = '#fff', imgpad = 1, gridpad = 0) {
            const image = new image_js_1.default(svg);
            const data = new Data.DataManager(image);
            this.apply(data, 0, 0);
            const xmin = Math.floor(this.xmin / 2) * 2;
            const ymin = Math.floor(this.ymin / 2) * 2;
            const xmax = Math.ceil(this.xmax / 2) * 2;
            const ymax = Math.ceil(this.ymax / 2) * 2;
            image.grid(xmin - gridpad, xmax + gridpad, ymin - gridpad, ymax + gridpad);
            const vx = Measure.HALFCELL * (xmin - imgpad);
            const vy = Measure.HALFCELL * (ymin - imgpad);
            const vw = Measure.HALFCELL * (xmax - xmin + 2 * imgpad);
            const vh = Measure.HALFCELL * (ymax - ymin + 2 * imgpad);
            // TODO erm
            image.text_xl.setAttribute('transform', 'translate(0 2.5)');
            image.text_l.setAttribute('transform', 'translate(0 2.5)');
            image.text_m.setAttribute('transform', 'translate(0 2.5)');
            image.text_s.setAttribute('transform', 'translate(0 2.5)');
            image.text_xs.setAttribute('transform', 'translate(0 2.5)');
            svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
            svg.setAttribute('version', '1.1');
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            if (bgcolor !== undefined) {
                image.root.prepend(Draw.draw(undefined, 'rect', { fill: bgcolor, x: vx, y: vy, w: vw, h: vh }));
            }
        }
    }
    exports.Stamp = Stamp;
    // WARNING: this does not compute any of the numeric metadata
    // only use when the stamp is just a wrapper for cell list
    function unsafeWrap(cells) {
        return new Stamp(cells, 0, 0, 0, 0, 0, 0);
    }
    function render(cells) {
        const [xtmp, ytmp] = Data.decode(cells[0].n);
        let xmin = xtmp, xmax = xtmp, ymin = ytmp, ymax = ytmp;
        for (const cell of cells) {
            const [x, y] = Data.decode(cell.n);
            if (x < xmin)
                xmin = x;
            if (x > xmax)
                xmax = x;
            if (y < ymin)
                ymin = y;
            if (y > ymax)
                ymax = y;
        }
        const xoff = Measure.round((xmin + xmax) / 2, 2);
        const yoff = Measure.round((ymin + ymax) / 2, 2);
        return new Stamp(cells, xoff, yoff, xmin - xoff, xmax - xoff, ymin - yoff, ymax - yoff);
    }
    class StampManager {
        constructor(image) {
            this.image = image;
            this.stamps = new Array();
            this.stamppos = 0;
            // TODO this definitely belongs somewhere else
            Event.onmove.push((x, y) => {
                // if (stamppos === -1) return;
                this.image.stamps.setAttribute('transform', `translate(${Measure.round(x, Measure.CELL)} ${Measure.round(y, Measure.CELL)})`);
            });
        }
        add(cells) {
            if (cells.length === 0)
                return;
            const stamp = render(cells);
            this.stamps.push(stamp);
            this.stamppos = this.stamps.length - 1;
            this.redraw();
        }
        transform(fn) {
            const stamp = this.stamps.pop();
            if (stamp !== undefined) {
                this.stamps.push(fn(stamp));
                this.stamppos = this.stamps.length - 1;
                this.redraw();
            }
        }
        redraw() {
            const stamp = this.stamps[this.stamppos];
            this.image.stamps.replaceChildren(...stamp.cells.map(cell => {
                const [x, y] = Data.decode(cell.n);
                return cell.tile.draw(x - stamp.xoff, y - stamp.yoff);
            }));
        }
        current() {
            return this.stamppos >= 0 && this.stamppos < this.stamps.length ? this.stamps[this.stamppos] : undefined;
        }
        deselect() {
            this.stamppos = this.stamps.length;
            this.image.stamps.replaceChildren();
        }
    }
    exports.StampManager = StampManager;
});
define("file", ["require", "exports", "data", "courier", "stamp"], function (require, exports, Data, Courier, Stamp) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FileManager = exports.File = exports.Schema = void 0;
    var Schema;
    (function (Schema) {
        Schema[Schema["LOCAL"] = 0] = "LOCAL";
        Schema[Schema["SERVER"] = 1] = "SERVER";
    })(Schema || (exports.Schema = Schema = {}));
    class File {
        constructor(schema, filename, title) {
            this.schema = schema;
            this.filename = filename;
            this.title = title;
        }
        stringify() { return JSON.stringify({ s: this.schema, f: this.filename, t: this.title }); }
        static destringify(s) { const o = JSON.parse(s); return new File(o.s, o.f, o.t); }
    }
    exports.File = File;
    class FileManager {
        constructor(fileCont, serverCont, data) {
            this.fileCont = fileCont;
            this.serverCont = serverCont;
            this.data = data;
            this.available = { [Schema.LOCAL]: false, [Schema.SERVER]: false };
            this.emoji = { [Schema.LOCAL]: '🏠', [Schema.SERVER]: '🌐' };
            this.pending = undefined;
            this.ws = undefined;
            this.wscb = _ => { };
            this.db = undefined;
            this.dbto = undefined;
            this.currentDocument = undefined;
            // this is meaningful exactly when currentDocument is LOCAL (and in that case should always be string)
            // maybe there is some type theoretic nonsense to be done here,
            // i really just wnat a dependent type
            this.localName = undefined;
            this.localFiles = [];
            this.serverFiles = [];
            this.connectDB();
            this.connectWS(localStorage.serverOverride || (location.protocol === 'file:' ? 'ws://localhost:4784/' : 'wss://gratility.tck.mn/ws/'), localStorage.token ? { m: 'token', token: localStorage.token } : undefined);
            if (location.search) {
                this.open(File.destringify(atob(location.search.slice(1))));
            }
            else if (localStorage.lastfile) {
                this.open(File.destringify(localStorage.lastfile));
            }
        }
        setText(s) { this.fileCont.firstElementChild.textContent = s; }
        setSetting(b) { this.fileCont.classList.toggle('setting', b); }
        getURL() { return location.href.split('?')[0] + '?' + btoa(localStorage.lastfile); } // TODO bad
        sendWS(msg) { var _a; if (this.ws === undefined)
            Courier.alert('not connected to server');
        else
            (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify(msg)); }
        connectWS(url, initmsg) {
            this.ws = new WebSocket(url);
            this.ws.binaryType = 'arraybuffer';
            this.ws.addEventListener('open', () => {
                var _a;
                this.serverCont.classList.remove('nc', 'dc');
                this.serverCont.classList.add('c');
                if (initmsg !== undefined)
                    (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify(initmsg));
                this.onopen(Schema.SERVER);
            });
            this.ws.addEventListener('error', () => {
                this.serverCont.classList.remove('nc', 'c');
                this.serverCont.classList.add('dc');
                Courier.alert('server connection failed');
                this.ws = undefined;
                this.onclose(Schema.SERVER);
            });
            this.ws.addEventListener('close', () => {
                this.serverCont.classList.remove('nc', 'c');
                this.serverCont.classList.add('dc');
                Courier.alert('server connection lost');
                this.ws = undefined;
                this.onclose(Schema.SERVER);
            });
            this.ws.addEventListener('message', this.message.bind(this));
        }
        connectDB() {
            const req = window.indexedDB.open('gratility', 1);
            req.onsuccess = (ev) => {
                this.db = ev.target.result;
                this.readLocalFiles(() => this.onopen(Schema.LOCAL));
            };
            req.onerror = () => {
                Courier.alert('local database connection failed');
                this.db = undefined;
                this.onclose(Schema.LOCAL);
            };
            req.onupgradeneeded = (ev) => {
                this.db = ev.target.result;
                this.db.createObjectStore('docs');
            };
        }
        readLocalFiles(cb) {
            this.db.transaction(['docs'], 'readonly').objectStore('docs').get('files').onsuccess = (ev) => {
                const res = ev.target.result;
                if (res)
                    this.localFiles = res;
                cb();
            };
        }
        message(msg) {
            if (!(msg.data instanceof ArrayBuffer)) {
                const json = JSON.parse(msg.data);
                if (json.alert !== undefined)
                    Courier.alert(json.alert);
                if (json.token !== undefined)
                    localStorage.token = json.token;
                if (json.wscb !== undefined) {
                    this.wscb(json.wscb);
                    this.wscb = () => { };
                } // TODO same fail consideration as local
                if (json.doclist !== undefined)
                    this.serverFiles = json.doclist.map((x) => [x.name, x.title]);
            }
            else if (this.currentDocument === Schema.SERVER) {
                for (const ch of Data.deserializeChanges(new Uint8Array(msg.data))) {
                    this.data.perform(ch);
                }
            }
            else {
                this.data.clear();
                this.data.frozen = false;
                Stamp.unsafeWrap(Data.deserializeStamp(new Uint8Array(msg.data))).apply(this.data, 0, 0, true);
                this.wscb(true);
                this.wscb = () => { };
                this.currentDocument = Schema.SERVER;
            }
        }
        // TODO all of the below should make sure current doc is saved first
        openLocal(f, cb) {
            this.data.frozen = true;
            // TODO check db existence (here and below)
            // TODO unfreeze when these fail
            // should it go back to previous document?
            // should it go to a not-saving-changes state?
            const req = this.db.transaction(['docs'], 'readonly').objectStore('docs').get(f.filename);
            req.onsuccess = (ev) => {
                const res = ev.target.result;
                this.data.clear();
                this.data.frozen = false;
                if (res !== undefined) {
                    Stamp.unsafeWrap(Data.deserializeStamp(res)).apply(this.data, 0, 0, true);
                }
                else {
                    Courier.alert('warning: file is blank');
                }
                this.currentDocument = Schema.LOCAL;
                this.localName = f.filename;
                cb(true);
            };
            req.onerror = () => { Courier.alert('failed to open local file (error)'); cb(false); };
        }
        newLocal(f, cb) {
            this.data.frozen = true;
            this.readLocalFiles(() => {
                this.localFiles.push([f.filename, f.title]);
                const tr = this.db.transaction(['docs'], 'readwrite');
                tr.oncomplete = () => {
                    this.data.clear();
                    this.data.frozen = false;
                    this.currentDocument = Schema.LOCAL;
                    this.localName = f.filename;
                    cb(true);
                };
                tr.onerror = () => { Courier.alert('failed to create local file (error)'); cb(false); };
                tr.onabort = () => { Courier.alert('failed to create local file (abort)'); cb(false); };
                tr.objectStore('docs').put(this.localFiles, 'files');
            });
        }
        openRemote(f, cb) {
            var _a;
            this.data.frozen = true;
            this.currentDocument = undefined;
            // TODO check ws existence here and below
            this.wscb = cb;
            (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({ m: 'open', name: f.filename }));
        }
        newRemote(f, cb) {
            var _a;
            this.data.frozen = true;
            this.currentDocument = undefined;
            this.wscb = cb;
            (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({ m: 'new', name: f.filename, title: f.title }));
        }
        open(f, createNew = false) {
            const docname = this.emoji[f.schema] + ' ' + f.title;
            if (this.available[f.schema]) {
                if (createNew)
                    f.filename = crypto.randomUUID();
                this.setText(`${createNew ? 'creating' : 'opening'} ${docname}...`);
                this.setSetting(false);
                (createNew
                    ? f.schema === Schema.LOCAL ? this.newLocal : this.newRemote
                    : f.schema === Schema.LOCAL ? this.openLocal : this.openRemote).bind(this)(f, success => {
                    this.setText(success ? docname : `failed to ${createNew ? 'create' : 'open'} ${docname}`);
                    this.setSetting(success);
                    if (success)
                        localStorage.lastfile = f.stringify();
                });
            }
            else {
                this.pending = [f, createNew];
            }
        }
        onopen(t) {
            this.available[t] = true;
            if (this.pending !== undefined && this.available[this.pending[0].schema]) {
                this.open(this.pending[0], this.pending[1]);
            }
        }
        onclose(t) {
            this.available[t] = false;
        }
        recv(change) {
            var _a;
            if (this.currentDocument === Schema.SERVER) {
                (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(Data.serializeChanges([change]));
            }
            else if (this.currentDocument === Schema.LOCAL) {
                if (this.dbto === undefined)
                    this.dbto = setTimeout(() => {
                        // TODO what happens if a change occurs during the transaction
                        const tr = this.db.transaction(['docs'], 'readwrite');
                        tr.oncomplete = () => { this.dbto = undefined; };
                        tr.objectStore('docs').put(Data.serializeStamp(this.data.listcells()), this.localName);
                    }, 1000);
            }
        }
        unsavedChanges() {
            return this.currentDocument === Schema.LOCAL && this.dbto !== undefined;
        }
    }
    exports.FileManager = FileManager;
});
define("data", ["require", "exports", "measure", "courier", "bitstream", "file", "draw", "color"], function (require, exports, Measure, Courier, bitstream_js_1, File, Draw, Color) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DataManager = exports.Change = exports.Item = exports.TextTile = exports.PolyTile = exports.ShapeTile = exports.ObjectParam = exports.ObjectSpec = exports.WallTile = exports.LineTile = exports.LineSpec = exports.SurfaceTile = exports.Tile = exports.Paradigm = exports.POS_SCALE = exports.POS_OFFSET = exports.POS_LOC = exports.POS_SIZE = exports.Layer_TEXT_BASE = exports.Layer_SHAPE_BASE = void 0;
    exports.encode = encode;
    exports.decode = decode;
    exports.unpackPos = unpackPos;
    exports.serializeStamp = serializeStamp;
    exports.deserializeStamp = deserializeStamp;
    exports.serializeChanges = serializeChanges;
    exports.deserializeChanges = deserializeChanges;
    function encode(x, y) {
        return (x << 16) | (y & 0xffff);
    }
    function decode(n) {
        return [n >> 16, n << 16 >> 16];
    }
    exports.Layer_SHAPE_BASE = 0x10;
    exports.Layer_TEXT_BASE = 0x20;
    exports.POS_SIZE = [0 /* Position.XL */, 1 /* Position.L */, 2 /* Position.M */, 3 /* Position.S */, 8 /* Position.XS */];
    exports.POS_LOC = [4 /* Position.XSNW */, 5 /* Position.XSN */, 6 /* Position.XSNE */, 7 /* Position.XSW */, 8 /* Position.XS */, 9 /* Position.XSE */, 10 /* Position.XSSW */, 11 /* Position.XSS */, 12 /* Position.XSSE */];
    // oh god this sucks
    function unpackPos(posmask, mapfn) {
        const ctr = (posmask & 0xf) | ((posmask >> 8 /* Position.XS */) & 1) << 4;
        posmask = (posmask | (ctr ? 1 << 8 /* Position.XS */ : 0)) >> 4 /* Position.XSNW */;
        const m = new Map();
        for (let i = 0; i < 9; ++i) {
            if ((posmask >> i) & 1)
                m.set(i, mapfn(i === 4 ? exports.POS_SIZE[Math.log2(ctr)] : exports.POS_LOC[i]));
        }
        return [posmask, m];
    }
    exports.POS_OFFSET = {
        [0 /* Position.XL */]: [0, 0],
        [1 /* Position.L */]: [0, 0],
        [2 /* Position.M */]: [0, 0],
        [3 /* Position.S */]: [0, 0],
        [4 /* Position.XSNW */]: [-Measure.HALFCELL / 2, -Measure.HALFCELL / 2],
        [5 /* Position.XSN */]: [0, -Measure.HALFCELL / 2],
        [6 /* Position.XSNE */]: [Measure.HALFCELL / 2, -Measure.HALFCELL / 2],
        [7 /* Position.XSW */]: [-Measure.HALFCELL / 2, 0],
        [8 /* Position.XS */]: [0, 0],
        [9 /* Position.XSE */]: [Measure.HALFCELL / 2, 0],
        [10 /* Position.XSSW */]: [-Measure.HALFCELL / 2, Measure.HALFCELL / 2],
        [11 /* Position.XSS */]: [0, Measure.HALFCELL / 2],
        [12 /* Position.XSSE */]: [Measure.HALFCELL / 2, Measure.HALFCELL / 2],
    };
    exports.POS_SCALE = {
        [0 /* Position.XL */]: 5,
        [1 /* Position.L */]: 4,
        [2 /* Position.M */]: 3,
        [3 /* Position.S */]: 2,
        [4 /* Position.XSNW */]: 1,
        [5 /* Position.XSN */]: 1,
        [6 /* Position.XSNE */]: 1,
        [7 /* Position.XSW */]: 1,
        [8 /* Position.XS */]: 1,
        [9 /* Position.XSE */]: 1,
        [10 /* Position.XSSW */]: 1,
        [11 /* Position.XSS */]: 1,
        [12 /* Position.XSSE */]: 1,
    };
    class Paradigm {
        constructor(rotAmt, flipBit, serBits, exShape) {
            this.rotAmt = rotAmt;
            this.flipBit = flipBit;
            this.serBits = serBits;
            this.exShape = exShape;
        }
    }
    exports.Paradigm = Paradigm;
    Paradigm.NONE = new Paradigm(0, 0, 0, () => Draw.draw(undefined, 'circle', { cx: 0, cy: 0, r: 1 }));
    Paradigm.POLY = Array.from({ length: 19 }, (_, i) => new Paradigm(i % 4 ? 90 : 180 / i, 0, i % 2 ? 2 : 1, () => Draw.poly(undefined, i, false)));
    Paradigm.ALL = new Paradigm(45, 0x8, 4, () => Draw.poly(undefined, 3, false));
    Paradigm.ROT8 = new Paradigm(45, 0, 3, () => Draw.poly(undefined, 3, false));
    const CURRENT_VERSION = 2;
    const VERSION_BITS = 7;
    const N_BITS = 32;
    const OBJ_BITS = 6;
    const LAYER_BITS = 6;
    const SHAPE_BITS = 6;
    const COLOR_BITS = 6;
    const SIZE_BITS = 3;
    const POSITION_BITS = 4;
    const VLQ_CHUNK = 4;
    const HEAD_BITS = 3;
    const THICKNESS_BITS = 3;
    const SIDE_BITS = 4;
    const ANGLE_BITS = 4;
    class Tile {
    }
    exports.Tile = Tile;
    class SurfaceTile extends Tile {
        constructor(color) {
            super();
            this.color = color;
            this.obj = 0 /* Obj.SURFACE */;
            this.layer = 0 /* Layer.SURFACE */;
        }
        eq(other) { return this.color === other.color; }
        serialize(bs) {
            bs.write(COLOR_BITS, this.color);
        }
        draw(x, y) {
            return Draw.draw(undefined, 'rect', {
                width: Measure.CELL,
                height: Measure.CELL,
                x: Measure.HALFCELL * (x - 1),
                y: Measure.HALFCELL * (y - 1),
                fill: Color.colors[this.color]
            });
        }
    }
    exports.SurfaceTile = SurfaceTile;
    class LineSpec {
        constructor(color, thickness, head, dir) {
            this.color = color;
            this.thickness = thickness;
            this.head = head;
            this.dir = dir;
        }
        eq(other) {
            return this.color === other.color && this.thickness === other.thickness &&
                this.head === other.head && (this.head === 0 /* Head.NONE */ ? true : this.dir === other.dir);
        }
        serialize(bs) {
            bs.write(COLOR_BITS, this.color);
            bs.write(THICKNESS_BITS, this.thickness);
            bs.write(HEAD_BITS, this.head);
            bs.write(1, this.dir ? 1 : 0);
        }
        draw(x, y, rot, len = 1) {
            const g = Draw.draw(undefined, 'g', {
                transform: `translate(${x * Measure.HALFCELL} ${y * Measure.HALFCELL}) rotate(${rot + (this.dir ? 180 : 0)})`
            });
            const stroke = Color.colors[this.color];
            const strokeLinecap = 'round';
            const strokeWidth = Measure.LINE * this.thickness;
            Draw.draw(g, 'line', {
                x1: Measure.HALFCELL * len, x2: -Measure.HALFCELL * len, y1: 0, y2: 0,
                stroke, strokeLinecap, strokeWidth
            });
            if (this.head === 1 /* Head.ARROW */) {
                const mul = Math.sqrt(this.thickness);
                Draw.draw(g, 'path', {
                    d: `M ${3 * mul} ${5 * mul} L ${-2 * mul} 0 L ${3 * mul} ${-5 * mul}`,
                    fill: 'none', stroke, strokeLinecap, strokeWidth
                });
            }
            return g;
        }
    }
    exports.LineSpec = LineSpec;
    class LineTile extends Tile {
        constructor(isEdge, spec) {
            super();
            this.isEdge = isEdge;
            this.spec = spec;
            this.obj = 1 /* Obj.LINE */;
            this.layer = isEdge ? 2 /* Layer.EDGE */ : 1 /* Layer.PATH */;
        }
        eq(other) { return this.isEdge === other.isEdge && this.spec.eq(other.spec); }
        serialize(bs) {
            bs.write(1, this.isEdge ? 1 : 0);
            this.spec.serialize(bs);
        }
        draw(x, y) {
            return this.spec.draw(x, y, (y % 2 === 0) === this.isEdge ? 0 : 90);
        }
    }
    exports.LineTile = LineTile;
    class WallTile extends Tile {
        constructor(angles, spec) {
            super();
            this.angles = angles;
            this.spec = spec;
            this.obj = 5 /* Obj.WALL */;
            this.layer = 3 /* Layer.WALL */;
        }
        eq(other) { return this.spec.eq(other.spec); }
        serialize(bs) {
            bs.write(ANGLE_BITS, this.angles);
            this.spec.serialize(bs);
        }
        draw(x, y) {
            const g = Draw.draw(undefined, 'g');
            if (this.angles & 0x1)
                g.appendChild(this.spec.draw(x, y, 0));
            if (this.angles & 0x2)
                g.appendChild(this.spec.draw(x, y, 45, Math.sqrt(2)));
            if (this.angles & 0x4)
                g.appendChild(this.spec.draw(x, y, 90));
            if (this.angles & 0x8)
                g.appendChild(this.spec.draw(x, y, 135, Math.sqrt(2)));
            return g;
        }
    }
    exports.WallTile = WallTile;
    class ObjectSpec {
        constructor(color, outline, position, transform) {
            this.color = color;
            this.outline = outline;
            this.position = position;
            this.transform = transform;
        }
        // TODO temporary hack
        setColor(color) { return new ObjectSpec(color, this.outline, this.position, this.transform); }
        // not needed to check position here because different position is always different layer
        eq(other) { return this.color === other.color && this.outline === other.outline && this.transform === other.transform; }
        layer(base) { return base + this.position; }
        serialize(bs, paradigm) {
            if (this.color === undefined)
                bs.write(1, 0);
            else {
                bs.write(1, 1);
                bs.write(COLOR_BITS, this.color);
            }
            if (this.outline === undefined)
                bs.write(1, 0);
            else {
                bs.write(1, 1);
                bs.write(COLOR_BITS, this.outline);
            }
            bs.write(POSITION_BITS, this.position);
            bs.write(paradigm.serBits, this.transform);
        }
        offset() { return exports.POS_OFFSET[this.position]; }
        size() { return exports.POS_SCALE[this.position]; }
        scale() { return Measure.HALFCELL * this.size() / 6; }
        strokeWidth() { return (0.05 + 0.1 * (this.size() / 12)) / (this.size() / 6); }
        fill() { return this.color === undefined ? 'none' : Color.colors[this.color]; }
        stroke() { return this.outline === undefined ? 'none' : Color.colors[this.outline]; }
        gTransform(x, y) { const [ox, oy] = this.offset(); return `translate(${x * Measure.HALFCELL + ox} ${y * Measure.HALFCELL + oy})`; }
        gRotate(p) { return ` rotate(${p.rotAmt * (this.transform & ~p.flipBit)})` + (this.transform & p.flipBit ? ' scale(-1,1)' : ''); }
        gScale(s) { return ` scale(${s !== null && s !== void 0 ? s : this.scale()})`; }
        g(x, y, p, s = undefined) {
            return Draw.draw(undefined, 'g', {
                transform: this.gTransform(x, y) + this.gRotate(p) + this.gScale(s)
            });
        }
    }
    exports.ObjectSpec = ObjectSpec;
    class ObjectParam {
        constructor(fill, outline, posmask, transform, locs) {
            this.fill = fill;
            this.outline = outline;
            this.posmask = posmask;
            this.transform = transform;
            this.locs = locs;
        }
        unpack(f) {
            return unpackPos(this.posmask, p => f(new ObjectSpec(this.fill, this.outline, p, this.transform)));
        }
    }
    exports.ObjectParam = ObjectParam;
    class ShapeTile extends Tile {
        constructor(shape, spec) {
            super();
            this.shape = shape;
            this.spec = spec;
            this.obj = 2 /* Obj.SHAPE */;
            this.layer = spec.layer(exports.Layer_SHAPE_BASE);
        }
        // must test obj because shapetile and polytile share layer... feels dubious
        eq(other) { return this.obj === other.obj && this.shape === other.shape && this.spec.eq(other.spec); }
        serialize(bs) {
            bs.write(SHAPE_BITS, this.shape);
            this.spec.serialize(bs, ShapeTile.paradigm[this.shape]);
        }
        draw(x, y) {
            const g = this.spec.g(x, y, ShapeTile.paradigm[this.shape]);
            const strokeWidth = this.spec.strokeWidth();
            const fill = this.spec.fill();
            const stroke = this.spec.stroke();
            switch (this.shape) {
                case 0 /* Shape.CIRCLE */:
                    Draw.draw(g, 'circle', {
                        cx: 0, cy: 0, r: 1,
                        strokeWidth, fill, stroke
                    });
                    break;
                case 1 /* Shape.CROSS */:
                    Draw.draw(g, 'path', {
                        d: 'M 0 1 L 4 5 L 5 4 L 1 0 L 5 -4 L 4 -5 L 0 -1 L -4 -5 L -5 -4 L -1 0 L -5 4 L -4 5 Z',
                        transform: 'scale(0.2)',
                        strokeWidth, fill, stroke
                    });
                    break;
                case 2 /* Shape.FLAG */:
                    Draw.draw(g, 'path', {
                        d: 'M -0.8 1 L -0.8 -1 L -0.6 -1 L 0.8 -0.5 L -0.6 0 L -0.6 1 Z',
                        transform: 'scale(0.9)',
                        strokeWidth: strokeWidth / 0.9, fill, stroke
                    });
                    break;
                case 3 /* Shape.ARROW */:
                    Draw.draw(g, 'path', {
                        d: 'M -1 0 L 0 -1 L 1 0 L 0.4 0 L 0.4 1 L -0.4 1 L -0.4 0 Z',
                        strokeWidth, fill, stroke
                    });
                    break;
            }
            return g;
        }
    }
    exports.ShapeTile = ShapeTile;
    ShapeTile.paradigm = {
        [0 /* Shape.CIRCLE */]: Paradigm.NONE,
        [1 /* Shape.CROSS */]: Paradigm.POLY[4],
        [2 /* Shape.FLAG */]: Paradigm.ALL,
        [3 /* Shape.ARROW */]: Paradigm.ROT8,
    };
    class PolyTile extends Tile {
        constructor(sides, star, spec) {
            super();
            this.sides = sides;
            this.star = star;
            this.spec = spec;
            this.obj = 4 /* Obj.POLY */;
            this.layer = spec.layer(exports.Layer_SHAPE_BASE);
        }
        eq(other) { return this.obj === other.obj && this.sides === other.sides && this.star === other.star && this.spec.eq(other.spec); }
        serialize(bs) {
            bs.write(SIDE_BITS, this.sides - 3);
            bs.write(1, +this.star);
            this.spec.serialize(bs, PolyTile.paradigm[this.sides]);
        }
        draw(x, y) {
            // TODO this square special case is extremely suspicious
            const g = this.spec.g(x, y, PolyTile.paradigm[this.sides], this.sides === 4 && this.spec.transform === (this.star ? 1 : 0) ? Math.sqrt(2) * this.spec.scale() : undefined);
            const strokeWidth = this.spec.strokeWidth();
            const fill = this.spec.fill();
            const stroke = this.spec.stroke();
            Draw.poly(g, this.sides, this.star, { strokeWidth, fill, stroke });
            return g;
        }
    }
    exports.PolyTile = PolyTile;
    PolyTile.paradigm = Paradigm.POLY;
    class TextTile extends Tile {
        constructor(val, spec) {
            super();
            this.val = val;
            this.spec = spec;
            this.obj = 3 /* Obj.TEXT */;
            this.layer = spec.layer(exports.Layer_TEXT_BASE);
        }
        eq(other) { return this.val === other.val && this.spec.eq(other.spec); }
        serialize(bs) {
            bs.writeString(this.val);
            this.spec.serialize(bs, TextTile.paradigm);
        }
        draw(x, y) {
            const [ox, oy] = this.spec.offset();
            const strokeWidth = this.spec.strokeWidth();
            const fill = this.spec.fill();
            const stroke = this.spec.stroke();
            const size = this.spec.size();
            return Draw.draw(undefined, 'text', {
                x: Measure.HALFCELL * x + ox,
                y: Measure.HALFCELL * y + oy,
                textAnchor: 'middle',
                dominantBaseline: 'central',
                fontSize: Measure.CELL * (this.val.length === 1 ? 0.75 :
                    this.val.length === 2 ? 0.55 :
                        this.val.length === 3 ? 0.4 :
                            0.3) * (size === 1 ? 1 / 2 : size / 3),
                textContent: this.val,
                strokeWidth, fill, stroke
            });
        }
    }
    exports.TextTile = TextTile;
    TextTile.paradigm = Paradigm.ALL;
    class Item {
        constructor(n, tile) {
            this.n = n;
            this.tile = tile;
        }
    }
    exports.Item = Item;
    class Change {
        constructor(n, pre, post, linked = false) {
            this.n = n;
            this.pre = pre;
            this.post = post;
            this.linked = linked;
        }
        rev() { return new Change(this.n, this.post, this.pre, this.linked); }
    }
    exports.Change = Change;
    function dos(bs, paradigm) {
        const fill = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
        const outline = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
        const position = bs.read(POSITION_BITS);
        const transform = bs.read(paradigm.serBits);
        return new ObjectSpec(fill, outline, position, transform);
    }
    const deserializefns = ((x) => {
        for (let i = CURRENT_VERSION - 1; i >= 0; --i) {
            if (x[i][0 /* Obj.SURFACE */] === undefined)
                x[i][0 /* Obj.SURFACE */] = x[i + 1][0 /* Obj.SURFACE */];
            if (x[i][1 /* Obj.LINE */] === undefined)
                x[i][1 /* Obj.LINE */] = x[i + 1][1 /* Obj.LINE */];
            if (x[i][2 /* Obj.SHAPE */] === undefined)
                x[i][2 /* Obj.SHAPE */] = x[i + 1][2 /* Obj.SHAPE */];
            if (x[i][3 /* Obj.TEXT */] === undefined)
                x[i][3 /* Obj.TEXT */] = x[i + 1][3 /* Obj.TEXT */];
            if (x[i][4 /* Obj.POLY */] === undefined)
                x[i][4 /* Obj.POLY */] = x[i + 1][4 /* Obj.POLY */];
            if (x[i][5 /* Obj.WALL */] === undefined)
                x[i][5 /* Obj.WALL */] = x[i + 1][5 /* Obj.WALL */];
        }
        return x;
    })({ 0: {
            [1 /* Obj.LINE */]: (bs) => {
                const isEdge = bs.read(1) === 1;
                const color = bs.read(1) === 0 ? 0 : bs.read(COLOR_BITS);
                const thickness = bs.read(THICKNESS_BITS);
                const head = bs.read(HEAD_BITS);
                const dir = bs.read(1) === 1;
                return new LineTile(isEdge, new LineSpec(color, thickness, head, dir));
            },
            [3 /* Obj.TEXT */]: (bs) => {
                return new TextTile(bs.readString(), new ObjectSpec(0, undefined, 2 /* Position.M */, 0));
            }
        }, 1: {
            [2 /* Obj.SHAPE */]: (bs) => {
                const len = Math.min(bs.readVLQ(VLQ_CHUNK), 16);
                const arr = [];
                for (let i = 0; i < len; ++i) {
                    const shape = bs.read(SHAPE_BITS);
                    const fill = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
                    const outline = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
                    const size = exports.POS_SIZE[5 - bs.read(SIZE_BITS)];
                    if (shape === 1)
                        arr.push(new PolyTile(4, false, new ObjectSpec(fill, outline, size, 0)));
                    else if (shape === 3)
                        arr.push(new PolyTile(5, true, new ObjectSpec(fill, outline, size, 0)));
                    else
                        arr.push(new ShapeTile(shape, new ObjectSpec(fill, outline, size, 0)));
                }
                // if (arr.length !== 1) console.error(`WARNING: ${arr.length} shapes`);
                return arr; // uh oh
            },
            [3 /* Obj.TEXT */]: (bs) => {
                const color = bs.read(COLOR_BITS);
                return new TextTile(bs.readString(), new ObjectSpec(color, undefined, 2 /* Position.M */, 0));
            }
        }, 2: {
            [0 /* Obj.SURFACE */]: (bs) => {
                return new SurfaceTile(bs.read(COLOR_BITS));
            },
            [1 /* Obj.LINE */]: (bs) => {
                const isEdge = bs.read(1) === 1;
                const color = bs.read(COLOR_BITS);
                const thickness = bs.read(THICKNESS_BITS);
                const head = bs.read(HEAD_BITS);
                const dir = bs.read(1) === 1;
                return new LineTile(isEdge, new LineSpec(color, thickness, head, dir));
            },
            [2 /* Obj.SHAPE */]: (bs) => {
                const shape = bs.read(SHAPE_BITS);
                const spec = dos(bs, ShapeTile.paradigm[shape]);
                return new ShapeTile(shape, spec);
            },
            [3 /* Obj.TEXT */]: (bs) => {
                return new TextTile(bs.readString(), dos(bs, TextTile.paradigm));
            },
            [4 /* Obj.POLY */]: (bs) => {
                const sides = bs.read(SIDE_BITS) + 3;
                return new PolyTile(sides, !!bs.read(1), dos(bs, PolyTile.paradigm[sides]));
            },
            [5 /* Obj.WALL */]: (bs) => {
                const angles = bs.read(ANGLE_BITS);
                const color = bs.read(COLOR_BITS);
                const thickness = bs.read(THICKNESS_BITS);
                const head = bs.read(HEAD_BITS);
                const dir = bs.read(1) === 1;
                return new WallTile(angles, new LineSpec(color, thickness, head, dir));
            },
        } });
    function readVersion(bs) {
        let ret;
        const bit = bs.read(1);
        if (bit === 0)
            ret = 0;
        else
            ret = bs.read(VERSION_BITS);
        if (ret > CURRENT_VERSION) {
            Courier.alert(`deserialize: invalid version number ${ret}`);
            return undefined;
        }
        if (ret !== CURRENT_VERSION) {
            Courier.alert(`deserialize: old version number ${ret}; converting automatically`);
        }
        return ret;
    }
    function serializeStamp(stamp) {
        const bs = bitstream_js_1.default.empty();
        bs.write(1, 1);
        bs.write(VERSION_BITS, CURRENT_VERSION);
        for (const item of stamp) {
            bs.write(N_BITS, item.n);
            bs.write(OBJ_BITS, item.tile.obj);
            item.tile.serialize(bs);
        }
        return bs.cut();
    }
    function deserializeStamp(arr) {
        const stamp = new Array();
        const bs = bitstream_js_1.default.fromArr(arr);
        const version = readVersion(bs);
        if (version === undefined)
            return [];
        // TODO this is pretty awful
        // i don't think deserializeChanges should have anything similar
        if (version >= 2) {
            while (1) {
                const n = bs.read(N_BITS);
                if (!bs.inbounds())
                    break;
                const obj = bs.read(OBJ_BITS);
                if (version <= 1)
                    bs.read(LAYER_BITS);
                stamp.push(new Item(n, deserializefns[version][obj](bs)));
            }
        }
        else {
            while (1) {
                const n = bs.read(N_BITS);
                if (!bs.inbounds())
                    break;
                const obj = bs.read(OBJ_BITS);
                if (version <= 1)
                    bs.read(LAYER_BITS);
                const ret = deserializefns[version][obj](bs);
                if (ret.constructor === Array) {
                    for (const x of ret)
                        stamp.push(new Item(n, x));
                }
                else
                    stamp.push(new Item(n, ret));
            }
        }
        return stamp;
    }
    function serializeChanges(changes) {
        const bs = bitstream_js_1.default.empty();
        bs.write(1, 1);
        bs.write(VERSION_BITS, CURRENT_VERSION);
        for (const ch of changes) {
            bs.write(N_BITS, ch.n);
            if (ch.pre === undefined) {
                bs.write(OBJ_BITS, (1 << OBJ_BITS) - 1);
            }
            else {
                bs.write(OBJ_BITS, ch.pre.obj);
                ch.pre.serialize(bs);
            }
            if (ch.post === undefined) {
                bs.write(OBJ_BITS, (1 << OBJ_BITS) - 1);
            }
            else {
                bs.write(OBJ_BITS, ch.post.obj);
                ch.post.serialize(bs);
            }
        }
        return bs.cut();
    }
    function deserializeChanges(arr) {
        const changes = [];
        const bs = bitstream_js_1.default.fromArr(arr);
        const version = readVersion(bs);
        if (version === undefined)
            return [];
        while (1) {
            const n = bs.read(N_BITS);
            if (!bs.inbounds())
                break;
            if (version <= 1)
                bs.read(LAYER_BITS);
            const preobj = bs.read(OBJ_BITS);
            const pre = preobj === (1 << OBJ_BITS) - 1 ? undefined : deserializefns[version][preobj](bs);
            const postobj = bs.read(OBJ_BITS);
            const post = postobj === (1 << OBJ_BITS) - 1 ? undefined : deserializefns[version][postobj](bs);
            changes.push(new Change(n, pre, post));
        }
        return changes;
    }
    class DataManager {
        constructor(image = undefined) {
            this.image = image;
            this.halfcells = new Map();
            this.drawn = new Map();
            this.history = new Array();
            this.histpos = 0;
            this.frozen = false;
            this.file = undefined;
        }
        connect(fileCont, serverCont) {
            this.file = new File.FileManager(fileCont, serverCont, this);
        }
        add(change) {
            if (this.frozen)
                return;
            if (this.histpos < this.history.length)
                this.history.splice(this.histpos, this.history.length);
            this.history.push(change);
            this.undo(false);
        }
        breakLink() {
            if (this.frozen)
                return;
            this.history[this.histpos - 1].linked = false;
        }
        undo(isUndo) {
            var _a, _b;
            if (this.frozen)
                return;
            do {
                if (isUndo ? (this.histpos <= 0) : (this.histpos >= this.history.length))
                    return;
                const change = this.history[isUndo ? --this.histpos : this.histpos++];
                const real = isUndo ? change.rev() : change;
                this.perform(real);
                (_a = this.file) === null || _a === void 0 ? void 0 : _a.recv(real);
            } while ((_b = this.history[this.histpos - 1]) === null || _b === void 0 ? void 0 : _b.linked);
        }
        perform(change) {
            var _a, _b;
            if (this.frozen)
                return;
            if (change.pre !== undefined) {
                // TODO undefined cases here should never happen
                if (this.image !== undefined) {
                    // delete the drawing
                    const elt = (_a = this.drawn.get(change.n)) === null || _a === void 0 ? void 0 : _a.get(change.pre.layer);
                    if (elt !== undefined)
                        this.image.layer(change.pre.layer).removeChild(elt);
                }
                // delete item
                const hc = this.halfcells.get(change.n);
                hc === null || hc === void 0 ? void 0 : hc.delete(change.pre.layer);
                if ((hc === null || hc === void 0 ? void 0 : hc.size) === 0)
                    this.halfcells.delete(change.n);
            }
            if (change.post !== undefined) {
                // create item
                if (!this.halfcells.has(change.n))
                    this.halfcells.set(change.n, new Map());
                this.halfcells.get(change.n).set(change.post.layer, change.post);
                if (this.image !== undefined) {
                    // draw it
                    const [x, y] = decode(change.n);
                    const elt = change.post.draw(x, y);
                    this.image.layer(change.post.layer).appendChild(elt);
                    // save the element
                    if (!this.drawn.has(change.n))
                        this.drawn.set(change.n, new Map());
                    (_b = this.drawn.get(change.n)) === null || _b === void 0 ? void 0 : _b.set(change.post.layer, elt);
                }
            }
        }
        listcells() {
            return this.halfcells.entries().flatMap(([n, hc]) => hc.values().map(t => new Item(n, t))).toArray();
        }
        clear() {
            this.halfcells.clear();
            for (const [_, layers] of this.drawn) {
                for (const [_, elt] of layers) {
                    elt.remove();
                }
            }
            this.drawn.clear();
            this.history.length = 0;
            this.histpos = 0;
        }
    }
    exports.DataManager = DataManager;
});
define("lib", ["require", "exports", "event", "stamp", "data", "draw", "view", "image", "gratility", "measure"], function (require, exports, Event, Stamp, Data, Draw, view_js_1, image_js_2, Gratility, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.create = create;
    Draw.initialize(document);
    function create(maxw, maxh, initStamp, tools) {
        const svg = Draw.draw(undefined, 'svg');
        const image = new image_js_2.default(svg);
        const data = new Data.DataManager(image);
        const stamp = new Stamp.StampManager(image);
        const view = new view_js_1.default(image);
        const backend = new Gratility.Backend(image, data, stamp, view);
        const frontend = new Gratility.Frontend(backend, undefined, tools, [], [], []);
        const cleanup = Event.initialize(frontend, backend, svg, document.body);
        const s = Stamp.render(Data.deserializeStamp(new Uint8Array(atob(initStamp).split('').map(c => c.charCodeAt(0)))));
        // TODO duplication from stamp.ts
        const pad = 1;
        const xmin = Math.floor(s.xmin / 2) * 2;
        const ymin = Math.floor(s.ymin / 2) * 2;
        const xmax = Math.ceil(s.xmax / 2) * 2;
        const ymax = Math.ceil(s.ymax / 2) * 2;
        const w = xmax - xmin + pad;
        const h = ymax - ymin + pad;
        s.apply(data, -xmin, -ymin, true);
        image.grid(0, xmax - xmin, 0, ymax - ymin);
        const ratio = (w / h) / (maxw / maxh);
        view.x = Measure.HALFCELL * pad / 2;
        view.y = Measure.HALFCELL * pad / 2;
        view.z = ratio < 1 ?
            Math.log(maxh / (h * Measure.HALFCELL)) / Math.log(Measure.ZOOMTICK) :
            Math.log(maxw / (w * Measure.HALFCELL)) / Math.log(Measure.ZOOMTICK);
        view.update();
        svg.style.width = ratio < 1 ? (maxh / h * w) + 'px' : maxw + 'px';
        svg.style.height = ratio < 1 ? maxh + 'px' : (maxw / w * h) + 'px';
        svg.style.userSelect = 'none';
        return {
            svg, cleanup,
            set: (newStamp, offset = undefined) => {
                data.clear();
                const s = Stamp.render(Data.deserializeStamp(new Uint8Array(atob(newStamp).split('').map(c => c.charCodeAt(0)))));
                const xmin = Math.floor(s.xmin / 2) * 2;
                const ymin = Math.floor(s.ymin / 2) * 2;
                const xmax = Math.ceil(s.xmax / 2) * 2;
                const ymax = Math.ceil(s.ymax / 2) * 2;
                s.apply(data, -xmin + (offset ? offset[0] * 2 : 0), -ymin + (offset ? offset[1] * 2 : 0), true);
            }
        };
    }
    ;
});
define("main", ["require", "exports", "event", "stamp", "data", "draw", "view", "image", "gratility"], function (require, exports, Event, Stamp, Data, Draw, view_js_2, image_js_3, Gratility) {
    "use strict";
    var _a, _b;
    Object.defineProperty(exports, "__esModule", { value: true });
    Draw.initialize(document);
    const svg = document.getElementById('grid');
    const image = new image_js_3.default(svg);
    const data = new Data.DataManager(image);
    const stamp = new Stamp.StampManager(image);
    const view = new view_js_2.default(image);
    const backend = new Gratility.Backend(image, data, stamp, view);
    data.connect(document.getElementById('filecont'), document.getElementById('server'));
    const frontend = new Gratility.Frontend(backend, (_a = document.getElementById('toolbox')) !== null && _a !== void 0 ? _a : undefined, localStorage.toolbox, Array.from(document.getElementsByClassName('menuaction')), Array.from(document.getElementById('menupopups').children), Array.from(document.getElementsByClassName('menustate')));
    Event.initialize(frontend, backend, svg, document.body);
    // TODO better
    image.grid(-500, 500, -500, 500);
    window.addEventListener('beforeunload', e => {
        var _a;
        if ((_a = data.file) === null || _a === void 0 ? void 0 : _a.unsavedChanges()) {
            e.preventDefault();
            e.returnValue = true;
        }
    });
    (_b = document.getElementById('toolbar')) === null || _b === void 0 ? void 0 : _b.addEventListener('wheel', e => e.stopPropagation());
});
