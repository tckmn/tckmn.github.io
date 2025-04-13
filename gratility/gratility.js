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
define("measure", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.hctype = exports.physhc = exports.hc = exports.cell = exports.round = exports.CELL = exports.LINE = exports.ZOOMTICK = exports.HALFCELL = exports.GRIDLINE = exports.GRIDCOLOR = void 0;
    exports.GRIDCOLOR = '#aaa';
    exports.GRIDLINE = 1;
    exports.HALFCELL = 20;
    exports.ZOOMTICK = 1.1;
    exports.LINE = 2;
    exports.CELL = 2 * exports.HALFCELL;
    // this doesn't really belong here lol
    function round(x, r) { return Math.round(x / r) * r; }
    exports.round = round;
    // when you only care about which square in the visual grid the point is in, use this one
    function cell(x) { return Math.floor(x / exports.CELL); }
    exports.cell = cell;
    // i think of this as the fundamental one, i guess
    // "spc" specifies how much to weight grid-aligned points relative to half-grid-aligned points
    // higher values of "spc" result in rounding towards gridline intersections more
    // cf pzv MouseInput#getpos
    function hc(x, spc = 0.25) {
        const prelim = x / exports.CELL, cellpos = Math.floor(prelim), offset = prelim - cellpos;
        return cellpos * 2 + (offset >= spc ? 1 : 0) + (offset >= 1 - spc ? 1 : 0);
    }
    exports.hc = hc;
    // sometimes you want the physical coordinates
    function physhc(x, spc = 0.25) { return hc(x, spc) * exports.HALFCELL; }
    exports.physhc = physhc;
    function hctype(x, y) {
        return (Math.abs(x % 2) << 1) | Math.abs(y % 2);
    }
    exports.hctype = hctype;
});
define("draw", ["require", "exports", "measure", "color"], function (require, exports, Measure, Color) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.objdraw = exports.draw = exports.initialize = void 0;
    // TODO this is absolutely an extremely temporary bandaid lol
    let doc;
    function initialize(document) { doc = document; }
    exports.initialize = initialize;
    const svgNS = 'http://www.w3.org/2000/svg';
    const drawfns = {
        [0 /* Data.Obj.SURFACE */]: (x, y, data) => {
            return draw(undefined, 'rect', {
                width: Measure.CELL,
                height: Measure.CELL,
                x: Measure.HALFCELL * (x - 1),
                y: Measure.HALFCELL * (y - 1),
                fill: Color.colors[data]
            });
        },
        [1 /* Data.Obj.LINE */]: (x, y, [spec, reversed]) => {
            const g = draw(undefined, 'g', {
                transform: `
                rotate(${((y % 2 === 0) == spec.isEdge ? 0 : 90) + (reversed ? 180 : 0)} ${x * Measure.HALFCELL} ${y * Measure.HALFCELL})
                `
            });
            const stroke = Color.colors[spec.color];
            const strokeLinecap = 'round';
            const strokeWidth = Measure.LINE * spec.thickness;
            const adjust = (z, n) => (z * Measure.HALFCELL + n * Math.sqrt(spec.thickness));
            draw(g, 'line', {
                x1: adjust(x + 1, 0),
                x2: adjust(x - 1, 0),
                y1: adjust(y, 0),
                y2: adjust(y, 0),
                stroke, strokeLinecap, strokeWidth
            });
            switch (spec.head) {
                case 0 /* Data.Head.NONE */:
                    break;
                case 1 /* Data.Head.ARROW */:
                    draw(g, 'path', {
                        d: `M ${adjust(x, 3)} ${adjust(y, 5)} L ${adjust(x, -2)} ${adjust(y, 0)} L ${adjust(x, 3)} ${adjust(y, -5)}`,
                        fill: 'none',
                        stroke, strokeLinecap, strokeWidth
                    });
            }
            return g;
        },
        [2 /* Data.Obj.SHAPE */]: (x, y, data) => {
            const g = draw(undefined, 'g', {
                transform: `translate(${x * Measure.HALFCELL} ${y * Measure.HALFCELL})`
            });
            for (const spec of data) {
                const r = Measure.HALFCELL * (spec.size / 6);
                const strokeWidth = Measure.HALFCELL * (0.05 + 0.1 * (spec.size / 12));
                const fill = spec.fill === undefined ? 'transparent' : Color.colors[spec.fill];
                const stroke = spec.outline === undefined ? 'transparent' : Color.colors[spec.outline];
                switch (spec.shape) {
                    case 0 /* Data.Shape.CIRCLE */:
                        draw(g, 'circle', {
                            cx: 0, cy: 0, r: r,
                            strokeWidth, fill, stroke
                        });
                        break;
                    case 1 /* Data.Shape.SQUARE */:
                        draw(g, 'rect', {
                            width: r * 2, height: r * 2, x: -r, y: -r,
                            strokeWidth, fill, stroke
                        });
                        break;
                    case 2 /* Data.Shape.FLAG */:
                        draw(g, 'path', {
                            d: 'M -0.8 1 L -0.8 -1 L -0.6 -1 L 0.8 -0.5 L -0.6 0 L -0.6 1 Z',
                            transform: `scale(${r * 0.9})`,
                            strokeWidth: strokeWidth / (r * 0.9), fill, stroke
                        });
                        break;
                    case 3 /* Data.Shape.STAR */:
                        draw(g, 'path', {
                            d: 'M' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (r * (n % 2 === 0 ? 1 : 0.5) * Math.cos((n / 5 + 0.5) * Math.PI) + ' ' +
                                -r * (n % 2 === 0 ? 1 : 0.5) * Math.sin((n / 5 + 0.5) * Math.PI))).join('L') + 'Z',
                            strokeWidth, fill, stroke
                        });
                        break;
                }
            }
            return g;
        },
        [3 /* Data.Obj.TEXT */]: (x, y, data) => {
            return draw(undefined, 'text', {
                x: Measure.HALFCELL * x,
                y: Measure.HALFCELL * y,
                textAnchor: 'middle',
                dominantBaseline: 'central',
                fontSize: Measure.CELL * (data.length === 1 ? 0.75 :
                    data.length === 2 ? 0.55 :
                        data.length === 3 ? 0.4 :
                            0.3),
                textContent: data
            });
        },
    };
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
    exports.draw = draw;
    function objdraw(elt, x, y) {
        return drawfns[elt.obj](x, y, elt.data);
    }
    exports.objdraw = objdraw;
});
define("image", ["require", "exports", "measure", "draw"], function (require, exports, Measure, Draw) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Image {
        constructor(svg) {
            this.root = Draw.draw(svg, 'g');
            this.gridlines = Draw.draw(this.root, 'g', { stroke: Measure.GRIDCOLOR, strokeWidth: Measure.GRIDLINE });
            this.surface = Draw.draw(this.root, 'g');
            this.path = Draw.draw(this.root, 'g');
            this.edge = Draw.draw(this.root, 'g');
            this.shape = Draw.draw(this.root, 'g');
            this.textInd = Draw.draw(this.root, 'g');
            this.text = Draw.draw(this.root, 'g');
            this.copypaste = Draw.draw(this.root, 'g');
            this.stamps = Draw.draw(this.root, 'g', { opacity: 0.5 });
        }
        obj(obj) {
            switch (obj) {
                case 0 /* Data.Layer.SURFACE */: return this.surface;
                case 1 /* Data.Layer.PATH */: return this.path;
                case 2 /* Data.Layer.EDGE */: return this.edge;
                case 3 /* Data.Layer.SHAPE */: return this.shape;
                case 4 /* Data.Layer.TEXT */: return this.text;
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
define("tools/tool", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
define("tools/copy", ["require", "exports", "draw", "data", "measure"], function (require, exports, Draw, Data, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class CopyTool {
        constructor() {
            this.repeat = false;
            this.tid = 'copy';
            this.sx = 0;
            this.sy = 0;
            this.tx = 0;
            this.ty = 0;
        }
        name() { return 'Copy'; }
        icon() { }
        save() { return ''; }
        static load(_) { return new CopyTool(); }
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
                        stamp.push(...Array.from(hc.entries()).map(([k, v]) => {
                            return new Data.Item(n, k, v);
                        }));
                    }
                }
            }
            g.stamp.add(stamp);
        }
    }
    exports.default = CopyTool;
});
define("tools/line", ["require", "exports", "draw", "data", "measure"], function (require, exports, Draw, Data, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class LineTool {
        name() { return 'Line'; }
        icon() {
            return Draw.draw(undefined, 'svg', {
                viewBox: `-${Measure.HALFCELL} 0 ${Measure.CELL} ${Measure.CELL}`,
                children: [
                    Draw.objdraw(new Data.Element(1 /* Data.Obj.LINE */, [this.spec, false]), 0, 1)
                ]
            });
        }
        save() {
            return [
                this.spec.isEdge ? 'E' : 'L',
                this.spec.color.toString(),
                this.spec.thickness.toString(),
                this.spec.head.toString()
            ].join(' ');
        }
        static load(s) {
            const ss = s.split(' '), ns = ss.map(x => parseInt(x, 10));
            return new LineTool({
                isEdge: ss[0] === 'E',
                color: ns[1],
                thickness: ns[2],
                head: ns[3]
            });
        }
        constructor(spec) {
            this.spec = spec;
            this.repeat = false;
            this.tid = 'line';
            this.isDrawing = undefined;
            this.x = 0;
            this.y = 0;
            this.HC_WEIGHT = spec.isEdge ? 0.35 : 0;
            this.LAYER = spec.isEdge ? 2 /* Data.Layer.EDGE */ : 1 /* Data.Layer.PATH */;
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
            if (!this.spec.isEdge) {
                dx = dx / 2;
                dy = dy / 2;
            }
            dir = dx + dy;
            if (dx ** 2 + dy ** 2 !== 1)
                return;
            if (this.spec.isEdge) {
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
            const oldline = (_a = g.data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(this.LAYER);
            const newline = new Data.Element(1 /* Data.Obj.LINE */, [this.spec, dir === -1]);
            if (this.isDrawing === undefined) {
                this.isDrawing = oldline === undefined || !Data.lineeq(oldline.data, newline.data);
            }
            if (this.isDrawing) {
                if (oldline === undefined || !Data.lineeq(oldline.data, newline.data)) {
                    g.data.add(new Data.Change(n, this.LAYER, oldline, newline));
                }
            }
            else {
                if (oldline !== undefined) {
                    g.data.add(new Data.Change(n, this.LAYER, oldline, undefined));
                }
            }
        }
        onup() { this.isDrawing = undefined; }
    }
    exports.default = LineTool;
});
define("tools/pan", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class PanTool {
        constructor() {
            this.repeat = false;
            this.tid = 'pan';
            this.mx = 0;
            this.my = 0;
        }
        name() { return 'Pan'; }
        icon() { }
        save() { return ''; }
        static load() { return new PanTool(); }
        ondown(x, y) {
            this.mx = x;
            this.my = y;
        }
        onmove(x, y, g) {
            g.view.x += x - this.mx;
            g.view.y += y - this.my;
            g.view.update();
        }
        onup() { }
    }
    exports.default = PanTool;
});
define("tools/paste", ["require", "exports", "measure"], function (require, exports, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class PasteTool {
        constructor() {
            this.repeat = false;
            this.tid = 'paste';
        }
        name() { return 'Paste'; }
        icon() { }
        save() { return ''; }
        static load() { return new PasteTool(); }
        ondown(x, y, g) {
            var _a;
            const xoff = Math.round(x / Measure.CELL) * 2;
            const yoff = Math.round(y / Measure.CELL) * 2;
            (_a = g.stamp.current()) === null || _a === void 0 ? void 0 : _a.apply(g.data, xoff, yoff);
        }
        onmove(x, y) { }
        onup() { }
    }
    exports.default = PasteTool;
});
define("tools/shape", ["require", "exports", "draw", "data", "measure"], function (require, exports, Draw, Data, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // lmao surely there is a better way
    function atlocs(x, y, locs) {
        const dx = x / Measure.HALFCELL, dy = y / Measure.HALFCELL;
        const fx = Math.floor(dx), fy = Math.floor(dy);
        let best = Measure.HALFCELL * Measure.HALFCELL * 999, bx = fx, by = fy;
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
    class ShapeTool {
        name() { return 'Shape'; }
        icon() {
            return Draw.draw(undefined, 'svg', {
                viewBox: `0 0 ${Measure.CELL} ${Measure.CELL}`,
                children: [
                    Draw.objdraw(new Data.Element(2 /* Data.Obj.SHAPE */, [this.spec]), 1, 1)
                ]
            });
        }
        save() {
            return [
                this.spec.shape.toString(),
                this.spec.fill === undefined ? '-' : this.spec.fill.toString(),
                this.spec.outline === undefined ? '-' : this.spec.outline.toString(),
                this.spec.size.toString(),
                this.locs.toString()
            ].join(' ');
        }
        static load(s) {
            const ss = s.split(' '), ns = ss.map(x => parseInt(x, 10));
            return new ShapeTool({
                shape: ns[0],
                fill: ss[1] === '-' ? undefined : ns[1],
                outline: ss[2] === '-' ? undefined : ns[2],
                size: ns[3]
            }, ns[4]);
        }
        constructor(spec, locs // bitmask: 0b center edge corner
        ) {
            this.spec = spec;
            this.locs = locs;
            this.repeat = false;
            this.tid = 'shape';
            this.isDrawing = false;
        }
        ondown(x, y, g) {
            var _a;
            [x, y] = atlocs(x, y, this.locs);
            const n = Data.encode(x, y);
            const shape = (_a = g.data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(3 /* Data.Layer.SHAPE */);
            const shapelst = shape === null || shape === void 0 ? void 0 : shape.data;
            if (shapelst === undefined) {
                g.data.add(new Data.Change(n, 3 /* Data.Layer.SHAPE */, shape, new Data.Element(2 /* Data.Obj.SHAPE */, [this.spec])));
                this.isDrawing = true;
            }
            else if (!shapelst.some(sh => Data.sheq(sh, this.spec))) {
                g.data.add(new Data.Change(n, 3 /* Data.Layer.SHAPE */, shape, new Data.Element(2 /* Data.Obj.SHAPE */, shapelst.concat(this.spec))));
                this.isDrawing = true;
            }
            else {
                const remaining = shapelst.filter(sh => !Data.sheq(sh, this.spec));
                g.data.add(new Data.Change(n, 3 /* Data.Layer.SHAPE */, shape, remaining.length === 0 ? undefined
                    : new Data.Element(2 /* Data.Obj.SHAPE */, remaining)));
                this.isDrawing = false;
            }
        }
        onmove(x, y, g) {
            var _a;
            [x, y] = atlocs(x, y, this.locs);
            const n = Data.encode(x, y);
            const shape = (_a = g.data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(3 /* Data.Layer.SHAPE */);
            const shapelst = shape === null || shape === void 0 ? void 0 : shape.data;
            if (shapelst === undefined) {
                if (this.isDrawing) {
                    g.data.add(new Data.Change(n, 3 /* Data.Layer.SHAPE */, shape, new Data.Element(2 /* Data.Obj.SHAPE */, [this.spec])));
                }
            }
            else if (!shapelst.some(sh => Data.sheq(sh, this.spec))) {
                if (this.isDrawing) {
                    g.data.add(new Data.Change(n, 3 /* Data.Layer.SHAPE */, shape, new Data.Element(2 /* Data.Obj.SHAPE */, shapelst.concat(this.spec))));
                }
            }
            else {
                if (!this.isDrawing) {
                    const remaining = shapelst.filter(sh => !Data.sheq(sh, this.spec));
                    g.data.add(new Data.Change(n, 3 /* Data.Layer.SHAPE */, shape, remaining.length === 0 ? undefined :
                        new Data.Element(2 /* Data.Obj.SHAPE */, remaining)));
                }
            }
        }
        onup() { }
    }
    exports.default = ShapeTool;
});
define("tools/surface", ["require", "exports", "draw", "data", "measure"], function (require, exports, Draw, Data, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SurfaceTool {
        name() { return 'Surface'; }
        icon() {
            return Draw.draw(undefined, 'svg', {
                viewBox: `0 0 ${Measure.CELL} ${Measure.CELL}`,
                children: [
                    Draw.objdraw(this.element, 1, 1)
                ]
            });
        }
        save() { return this.color.toString(); }
        static load(s) { return new SurfaceTool(parseInt(s, 10)); }
        constructor(color) {
            this.color = color;
            this.repeat = false;
            this.tid = 'surface';
            this.isDrawing = false;
            this.element = new Data.Element(0 /* Data.Obj.SURFACE */, this.color);
        }
        ondown(x, y, g) {
            var _a;
            x = Measure.cell(x);
            y = Measure.cell(y);
            const n = Data.encode(x * 2 + 1, y * 2 + 1);
            const surface = (_a = g.data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(0 /* Data.Layer.SURFACE */);
            if (surface === undefined) {
                g.data.add(new Data.Change(n, 0 /* Data.Layer.SURFACE */, surface, new Data.Element(0 /* Data.Obj.SURFACE */, this.color)));
                this.isDrawing = true;
            }
            else {
                g.data.add(new Data.Change(n, 0 /* Data.Layer.SURFACE */, surface, undefined));
                this.isDrawing = false;
            }
        }
        onmove(x, y, g) {
            var _a;
            x = Measure.cell(x);
            y = Measure.cell(y);
            const n = Data.encode(x * 2 + 1, y * 2 + 1);
            const surface = (_a = g.data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(0 /* Data.Layer.SURFACE */);
            if (surface === undefined) {
                if (this.isDrawing) {
                    g.data.add(new Data.Change(n, 0 /* Data.Layer.SURFACE */, surface, this.element));
                }
            }
            else {
                if (!this.isDrawing) {
                    g.data.add(new Data.Change(n, 0 /* Data.Layer.SURFACE */, surface, undefined));
                }
            }
        }
        onup() { }
    }
    exports.default = SurfaceTool;
});
define("tools/text", ["require", "exports", "draw", "data", "measure", "event"], function (require, exports, Draw, Data, Measure, Event) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class TextTool {
        name() { return 'Text'; }
        icon() { }
        save() { return this.preset; }
        static load(s) { return new TextTool(s); }
        constructor(preset) {
            this.preset = preset;
            this.repeat = false;
            this.tid = 'text';
            this.n = 0;
            this.elt = undefined;
            this.isDrawing = false;
        }
        ondown(x, y, g) {
            var _a;
            if (this.preset !== '') {
                const n = Data.encode(Measure.cell(x) * 2 + 1, Measure.cell(y) * 2 + 1);
                const text = (_a = g.data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(4 /* Data.Layer.TEXT */);
                if (text && text.data === this.preset) {
                    g.data.add(new Data.Change(n, 4 /* Data.Layer.TEXT */, text, undefined));
                    this.isDrawing = false;
                }
                else {
                    g.data.add(new Data.Change(n, 4 /* Data.Layer.TEXT */, text, new Data.Element(3 /* Data.Obj.TEXT */, this.preset)));
                    this.isDrawing = true;
                }
            }
            else if (Event.keyeater.ref === undefined) {
                const cx = Measure.cell(x) * 2, cy = Measure.cell(y) * 2;
                this.n = Data.encode(cx + 1, cy + 1);
                // TODO some of this goes somewhere else
                this.elt = Draw.draw(g.image.textInd, 'rect', {
                    x: cx * Measure.HALFCELL, y: cy * Measure.HALFCELL, width: Measure.CELL, height: Measure.CELL,
                    fill: '#ccc',
                    stroke: '#f88',
                    strokeWidth: Measure.HALFCELL / 5
                });
                Event.keyeater.ref = this.onkey(g).bind(this);
            }
        }
        onkey(g) {
            return (e) => {
                var _a, _b, _c, _d;
                const text = (_a = g.data.halfcells.get(this.n)) === null || _a === void 0 ? void 0 : _a.get(4 /* Data.Layer.TEXT */);
                if (e.key === 'Enter' || e.key === 'Escape') {
                    this.deselect();
                }
                else if (e.key === 'Backspace') {
                    g.data.add(new Data.Change(this.n, 4 /* Data.Layer.TEXT */, text, new Data.Element(3 /* Data.Obj.TEXT */, ((_b = text === null || text === void 0 ? void 0 : text.data) !== null && _b !== void 0 ? _b : '').slice(0, ((_c = text === null || text === void 0 ? void 0 : text.data) !== null && _c !== void 0 ? _c : '').length - 1))));
                }
                else if (e.key.length === 1) {
                    g.data.add(new Data.Change(this.n, 4 /* Data.Layer.TEXT */, text, new Data.Element(3 /* Data.Obj.TEXT */, ((_d = text === null || text === void 0 ? void 0 : text.data) !== null && _d !== void 0 ? _d : '') + e.key)));
                }
            };
        }
        deselect() {
            Event.keyeater.ref = undefined;
            if (this.elt !== undefined)
                this.elt.parentNode.removeChild(this.elt);
        }
        onmove(x, y, g) {
            var _a;
            if (this.preset === '')
                return;
            const n = Data.encode(Measure.cell(x) * 2 + 1, Measure.cell(y) * 2 + 1);
            const text = (_a = g.data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(4 /* Data.Layer.TEXT */);
            if (text && text.data === this.preset) {
                if (!this.isDrawing) {
                    g.data.add(new Data.Change(n, 4 /* Data.Layer.TEXT */, text, undefined));
                }
            }
            else {
                if (this.isDrawing) {
                    g.data.add(new Data.Change(n, 4 /* Data.Layer.TEXT */, text, new Data.Element(3 /* Data.Obj.TEXT */, this.preset)));
                }
            }
        }
        onup() { }
    }
    exports.default = TextTool;
});
define("tools/undo", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class UndoTool {
        name() { return this.isUndo ? 'Undo' : 'Redo'; }
        icon() { }
        save() { return this.isUndo ? 'u' : 'r'; }
        static load(s) { return new UndoTool(s === 'u'); }
        constructor(isUndo) {
            this.isUndo = isUndo;
            this.repeat = true;
            this.tid = 'undo';
        }
        ondown(x, y, g) { g.data.undo(this.isUndo); }
        onmove() { }
        onup() { }
    }
    exports.default = UndoTool;
});
define("tools/zoom", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class ZoomTool {
        name() { return 'Zoom ' + (this.amount > 0 ? 'in' : 'out'); }
        icon() { }
        save() { return this.amount.toString(); }
        static load(s) { return new ZoomTool(parseInt(s, 10)); }
        constructor(amount) {
            this.amount = amount;
            this.repeat = false;
            this.tid = 'zoom';
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
define("tools/alltools", ["require", "exports", "tools/copy", "tools/line", "tools/pan", "tools/paste", "tools/shape", "tools/surface", "tools/text", "tools/undo", "tools/zoom", "tools/copy", "tools/line", "tools/pan", "tools/paste", "tools/shape", "tools/surface", "tools/text", "tools/undo", "tools/zoom"], function (require, exports, copy_js_1, line_js_1, pan_js_1, paste_js_1, shape_js_1, surface_js_1, text_js_1, undo_js_1, zoom_js_1, copy_js_2, line_js_2, pan_js_2, paste_js_2, shape_js_2, surface_js_2, text_js_2, undo_js_2, zoom_js_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.tidtotool = exports.ZoomTool = exports.UndoTool = exports.TextTool = exports.SurfaceTool = exports.ShapeTool = exports.PasteTool = exports.PanTool = exports.LineTool = exports.CopyTool = void 0;
    Object.defineProperty(exports, "CopyTool", { enumerable: true, get: function () { return copy_js_2.default; } });
    Object.defineProperty(exports, "LineTool", { enumerable: true, get: function () { return line_js_2.default; } });
    Object.defineProperty(exports, "PanTool", { enumerable: true, get: function () { return pan_js_2.default; } });
    Object.defineProperty(exports, "PasteTool", { enumerable: true, get: function () { return paste_js_2.default; } });
    Object.defineProperty(exports, "ShapeTool", { enumerable: true, get: function () { return shape_js_2.default; } });
    Object.defineProperty(exports, "SurfaceTool", { enumerable: true, get: function () { return surface_js_2.default; } });
    Object.defineProperty(exports, "TextTool", { enumerable: true, get: function () { return text_js_2.default; } });
    Object.defineProperty(exports, "UndoTool", { enumerable: true, get: function () { return undo_js_2.default; } });
    Object.defineProperty(exports, "ZoomTool", { enumerable: true, get: function () { return zoom_js_2.default; } });
    /*
     * TODO:
     * these strings must be manually checked to match the "tid" instance of each class.
     * afaict, there's no good way to fix this with typescript's """type system""",
     * because this needs to be accessible both statically and from an instance.
     * you can't even put static constraints on an interface.
     * object-oriented programming is a blight upon this world :(
     */
    exports.tidtotool = new Map([
        ['copy', copy_js_1.default.load],
        ['line', line_js_1.default.load],
        ['pan', pan_js_1.default.load],
        ['paste', paste_js_1.default.load],
        ['shape', shape_js_1.default.load],
        ['surface', surface_js_1.default.load],
        ['text', text_js_1.default.load],
        ['undo', undo_js_1.default.load],
        ['zoom', zoom_js_1.default.load],
    ]);
});
define("toolbox", ["require", "exports", "tools/alltools"], function (require, exports, Tools) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Toolbox {
        constructor(container) {
            this.container = container;
            this.mouseTools = new Map();
            this.keyTools = new Map();
            this.wheelTools = new Map();
            this.bindMouse(1, new Tools.PanTool());
            this.bindKey(' ', new Tools.PanTool());
            this.bindKey('s', new Tools.SurfaceTool(0));
            this.bindKey('d', new Tools.LineTool({
                isEdge: false,
                head: 0 /* Data.Head.NONE */,
                color: 8,
                thickness: 2
            }));
            this.bindKey('e', new Tools.LineTool({
                isEdge: true,
                head: 0 /* Data.Head.NONE */,
                color: 0,
                thickness: 2
            }));
            this.bindKey('t', new Tools.TextTool(''));
            this.bindKey('z', new Tools.UndoTool(true));
            this.bindKey('x', new Tools.UndoTool(false));
            this.bindKey('c', new Tools.CopyTool());
            this.bindKey('v', new Tools.PasteTool());
            this.bindWheel(true, new Tools.ZoomTool(1));
            this.bindWheel(false, new Tools.ZoomTool(-1));
        }
        toolDisplay(tool, txt, delcb) {
            const bind = document.createElement('div');
            bind.textContent = txt;
            this.container.appendChild(bind);
            const name = document.createElement('div');
            name.textContent = tool.name();
            this.container.appendChild(name);
            const icon = document.createElement('div');
            const maybeIcon = tool.icon();
            if (maybeIcon !== undefined)
                icon.appendChild(maybeIcon);
            this.container.appendChild(icon);
            const delbtn = document.createElement('div');
            delbtn.className = 'delbtn';
            delbtn.textContent = '×';
            delbtn.addEventListener('click', () => {
                delcb();
                this.container.removeChild(bind);
                this.container.removeChild(name);
                this.container.removeChild(icon);
                this.container.removeChild(delbtn);
            });
            this.container.appendChild(delbtn);
        }
        bindMouse(btn, tool) {
            if (this.mouseTools.has(btn))
                return false;
            this.mouseTools.set(btn, tool);
            this.toolDisplay(tool, `click ${btn}`, () => {
                this.mouseTools.delete(btn);
            });
            return true;
        }
        bindKey(key, tool) {
            if (this.keyTools.has(key))
                return false;
            this.keyTools.set(key, tool);
            this.toolDisplay(tool, `key [${key}]`, () => {
                this.keyTools.delete(key);
            });
            return true;
        }
        bindWheel(dir, tool) {
            if (this.wheelTools.has(dir))
                return false;
            this.wheelTools.set(dir, tool);
            this.toolDisplay(tool, `scr ${dir ? 'up' : 'dn'}`, () => {
                this.wheelTools.delete(dir);
            });
            return true;
        }
        save() {
            // the delimiter is :: to avoid any confusion about keybinds to Space
            // maybe i should just globally turn ' ' into 'Space' everywhere,
            // but whatever
            return [
                ...Array.from(this.mouseTools.entries()).map(([btn, tool]) => `m${btn}::${tool.tid}:${tool.save()}`),
                ...Array.from(this.keyTools.entries()).map(([key, tool]) => `k${key}::${tool.tid}:${tool.save()}`),
                ...Array.from(this.wheelTools.entries()).map(([dir, tool]) => `w${+dir}::${tool.tid}:${tool.save()}`)
            ].join('\n');
        }
        clear() {
            while (this.container.firstChild)
                this.container.removeChild(this.container.firstChild);
            this.mouseTools.clear();
            this.keyTools.clear();
            this.wheelTools.clear();
        }
    }
    exports.default = Toolbox;
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
define("event", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.initialize = exports.keyeater = exports.onmove = void 0;
    exports.onmove = [];
    exports.keyeater = { ref: undefined };
    function initialize(g, svg, page, toolbox, menu, view) {
        const activeTools = new Set();
        const rect = svg.getBoundingClientRect();
        let lastX = 0;
        let lastY = 0;
        let upd = (e) => {
            lastX = (e.clientX - rect.left) / view.zoom() - view.x;
            lastY = (e.clientY - rect.top) / view.zoom() - view.y;
        };
        svg.addEventListener('contextmenu', e => e.preventDefault());
        svg.addEventListener('pointermove', e => {
            if (menu.isOpen())
                return;
            upd(e);
            for (const t of activeTools)
                t.onmove(lastX, lastY, g);
            for (const f of exports.onmove)
                f(lastX, lastY);
        });
        svg.addEventListener('pointerdown', e => {
            if (menu.isOpen())
                return;
            upd(e);
            const t = toolbox.mouseTools.get(e.button);
            if (t === undefined)
                return;
            t.ondown(lastX, lastY, g);
            activeTools.add(t);
        });
        svg.addEventListener('pointerup', e => {
            if (menu.isOpen())
                return;
            const t = toolbox.mouseTools.get(e.button);
            if (t === undefined)
                return;
            t.onup(g);
            activeTools.delete(t);
        });
        svg.addEventListener('pointerleave', e => {
            for (const t of activeTools)
                t.onup(g);
            activeTools.clear();
        });
        page.addEventListener('keydown', e => {
            if (menu.isOpen()) {
                if (e.key === 'Escape')
                    menu.close();
                return;
            }
            if (exports.keyeater.ref !== undefined) {
                exports.keyeater.ref(e);
                return;
            }
            const t = toolbox.keyTools.get(e.key);
            if (t === undefined)
                return;
            if (e.repeat && !t.repeat)
                return;
            t.ondown(lastX, lastY, g);
            activeTools.add(t);
        });
        page.addEventListener('keyup', e => {
            if (menu.isOpen())
                return;
            const t = toolbox.keyTools.get(e.key);
            if (t === undefined)
                return;
            t.onup(g);
            activeTools.delete(t);
        });
        page.addEventListener('wheel', e => {
            if (menu.isOpen())
                return;
            const t = toolbox.wheelTools.get(e.deltaY < 0);
            if (t === undefined)
                return;
            t.ondown(lastX, lastY, g);
            t.onup(g);
        });
    }
    exports.initialize = initialize;
});
define("stamp", ["require", "exports", "draw", "data", "event", "measure", "image"], function (require, exports, Draw, Data, Event, Measure, image_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.StampManager = exports.render = exports.Stamp = void 0;
    class Stamp {
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
                const pre = (_a = data.halfcells.get(newn)) === null || _a === void 0 ? void 0 : _a.get(cell.layer);
                if (pre !== cell.elt.data) {
                    const ch = new Data.Change(newn, cell.layer, pre, cell.elt, i !== this.cells.length - 1);
                    if (noUndo)
                        data.perform(ch);
                    else
                        data.add(ch);
                }
            }
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
            image.text.setAttribute('transform', 'translate(0 2.5)');
            svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
            svg.setAttribute('version', '1.1');
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            if (bgcolor !== undefined) {
                image.root.prepend(Draw.draw(undefined, 'rect', { fill: bgcolor, x: vx, y: vy, w: vw, h: vh }));
            }
        }
    }
    exports.Stamp = Stamp;
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
        const stamp = new Stamp(cells, xoff, yoff, xmin - xoff, xmax - xoff, ymin - yoff, ymax - yoff);
        return stamp;
    }
    exports.render = render;
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
            this.image.stamps.replaceChildren(...cells.map(cell => {
                const [x, y] = Data.decode(cell.n);
                return Draw.objdraw(cell.elt, x - stamp.xoff, y - stamp.yoff);
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
define("gratility", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Gratility {
        constructor(image, data, stamp, view) {
            this.image = image;
            this.data = data;
            this.stamp = stamp;
            this.view = view;
        }
    }
    exports.default = Gratility;
});
define("menu", ["require", "exports", "data", "draw", "tools/alltools"], function (require, exports, Data, Draw, Tools) {
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
    const menuactions = new Map([
        ['dark', () => {
                document.body.classList.toggle('dark');
            }],
        ['dlstamp', (manager) => {
                const stamp = manager.g.stamp.current();
                if (stamp === undefined)
                    return;
                download('gratility.stamp', Data.serializeStamp(stamp.cells), 'application/octet-stream');
            }],
        ['dlsvg', (manager) => {
                const stamp = manager.g.stamp.current();
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
    menuevents.set('addtool-open', (manager, menu) => {
        const elt = menu.inputs.get('binding');
        elt.value = '';
        for (const el of Array.from(document.getElementsByClassName('addtool-active'))) {
            el.classList.remove('addtool-active');
        }
        resolve = undefined;
    });
    menuevents.set('addtool-bindmouse', (manager, menu, e, target) => {
        if (e.button !== 0)
            e.preventDefault();
        target.value = 'click ' + e.button;
        const conflict = manager.toolbox.mouseTools.has(e.button);
        target.classList.toggle('conflict', conflict);
        resolve = conflict ? undefined : tool => manager.toolbox.bindMouse(e.button, tool);
    });
    menuevents.set('addtool-bindkey', (manager, menu, e, target) => {
        e.preventDefault();
        target.value = 'key [' + e.key + ']';
        const conflict = manager.toolbox.keyTools.has(e.key);
        target.classList.toggle('conflict', conflict);
        resolve = conflict ? undefined : tool => manager.toolbox.bindKey(e.key, tool);
    });
    menuevents.set('addtool-bindwheel', (manager, menu, e, target) => {
        target.value = 'scr ' + (e.deltaY < 0 ? 'up' : 'dn');
        const conflict = manager.toolbox.wheelTools.has(e.deltaY < 0);
        target.classList.toggle('conflict', conflict);
        resolve = conflict ? undefined : tool => manager.toolbox.bindWheel(e.deltaY < 0, tool);
    });
    menuevents.set('addtool-nop', (manager, menu, e) => {
        e.preventDefault();
    });
    menuevents.set('addtool-settool', (manager, menu, e, target) => {
        for (const el of Array.from(document.getElementsByClassName('addtool-active'))) {
            el.classList.remove('addtool-active');
        }
        target.classList.add('addtool-active');
    });
    menuevents.set('addtool-go', (manager, menu) => {
        if (resolve === undefined) {
            MenuManager.alert('please pick an available binding for this tool');
            return;
        }
        const el = document.getElementsByClassName('addtool-active')[0];
        if (el === undefined) {
            MenuManager.alert('please pick an action for this tool');
            return;
        }
        const args = Array.from(el.getElementsByClassName('arg')).map(el => {
            if (el.tagName === 'INPUT') {
                return el.value;
            }
            else if (el.dataset.value !== undefined) {
                return el.dataset.value;
            }
            else {
                return '???'; // TODO
            }
        });
        switch (el.dataset.tool) {
            case 'surface':
                resolve(new Tools.SurfaceTool(parseInt(args[0], 10)));
                break;
            case 'line':
                resolve(new Tools.LineTool({
                    isEdge: parseInt(args[0]) === 1,
                    color: parseInt(args[1]),
                    thickness: parseInt(args[2]),
                    head: parseInt(args[3]),
                }));
                break;
            case 'shape':
                if (!(parseInt(args[1], 10) >= 1 && parseInt(args[1], 10) <= 5)) {
                    MenuManager.alert('shape size should be between 1 and 5');
                    return;
                }
                if (args[2] === '') {
                    MenuManager.alert('shape should be placeable in at least one location');
                    return;
                }
                if (args[3] === '' && args[4] === '') {
                    MenuManager.alert('shape should should have at least one of fill or outline');
                    return;
                }
                resolve(new Tools.ShapeTool({
                    shape: parseInt(args[0], 10),
                    size: parseInt(args[1], 10),
                    fill: args[3] === '' ? undefined : parseInt(args[3], 10),
                    outline: args[4] === '' ? undefined : parseInt(args[4], 10)
                }, args[2].split('|').map(x => parseInt(x, 10)).reduce((x, y) => x + y, 0)));
                break;
            case 'text':
                resolve(new Tools.TextTool(args[0]));
                break;
            case 'pan':
                resolve(new Tools.PanTool());
                break;
            case 'zoomin':
                resolve(new Tools.ZoomTool(1));
                break;
            case 'zoomout':
                resolve(new Tools.ZoomTool(-1));
                break;
            case 'copy':
                resolve(new Tools.CopyTool());
                break;
            case 'paste':
                resolve(new Tools.PasteTool());
                break;
            case 'undo':
                resolve(new Tools.UndoTool(true));
                break;
            case 'redo':
                resolve(new Tools.UndoTool(false));
                break;
            default:
                MenuManager.alert('unknown tool??');
                return;
        }
        manager.close();
    });
    // ###### STAMP MENU ###### //
    menuevents.set('stamp-open', (manager, menu) => {
        // TODO this whole function is awful
        const elt = menu.inputs.get('value');
        const stamp = manager.g.stamp.current();
        elt.value = stamp === undefined ? '' :
            btoa(String.fromCharCode.apply(null, Data.serializeStamp(stamp.cells)));
        elt.focus();
        elt.select();
    });
    menuevents.set('stamp-go', (manager, menu) => {
        const elt = menu.inputs.get('value');
        manager.g.stamp.add(Data.deserializeStamp(new Uint8Array(atob(elt.value).split('').map(c => c.charCodeAt(0)))));
        manager.close();
    });
    menuevents.set('stamp-key', (manager, menu, e) => {
        if (e.key === 'Enter')
            manager.menuevent(menu, 'go');
    });
    // ###### TOOLBOX MENU ###### //
    menuevents.set('toolbox-open', (manager, menu) => {
        const elt = menu.inputs.get('value');
        elt.value = manager.toolbox.save();
        elt.focus();
        elt.select();
    });
    function onesplit(s, delim) {
        const parts = s.split(delim);
        return parts.length === 1 ? [s, undefined] : [parts[0], parts.slice(1).join(delim)];
    }
    menuevents.set('toolbox-go', (manager, menu) => {
        const elt = menu.inputs.get('value');
        manager.toolbox.clear();
        for (const line of elt.value.split('\n')) {
            const [bind, rest] = onesplit(line, '::');
            if (rest === undefined)
                continue;
            const [tid, spec] = onesplit(rest, ':');
            if (spec === undefined)
                continue;
            const toolfn = Tools.tidtotool.get(tid);
            if (toolfn === undefined)
                continue;
            const bindtype = bind[0];
            const bindval = bind.slice(1);
            const tool = toolfn(spec);
            switch (bindtype) {
                case 'm':
                    manager.toolbox.bindMouse(parseInt(bindval, 10), tool);
                    break;
                case 'k':
                    manager.toolbox.bindKey(bindval, tool);
                    break;
                case 'w':
                    manager.toolbox.bindWheel(bindval === '1', tool);
                    break;
            }
        }
        manager.close();
    });
    menuevents.set('toolbox-key', (manager, menu, e) => {
        if (e.key === 'Enter')
            manager.menuevent(menu, 'go');
    });
    // ###### SERVER MENU ###### //
    menuevents.set('server-go', (manager, menu) => {
        manager.g.data.connect(localStorage.serverOverride || 'wss://gratility.tck.mn/ws/');
        manager.close();
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
    class MenuManager {
        isOpen() { return this.activeMenu !== undefined; }
        open(menu) {
            menu.open();
            this.activeMenu = menu;
            this.menuevent(menu, 'open');
        }
        close() {
            if (this.activeMenu !== undefined) {
                const menu = this.activeMenu;
                this.activeMenu.close();
                this.activeMenu = undefined;
                this.menuevent(menu, 'close');
            }
        }
        // TODO
        static alert(msg) {
            const alerts = document.getElementById('alerts');
            const elt = document.createElement('div');
            elt.textContent = msg;
            const rm = () => {
                alerts.removeChild(elt);
            };
            elt.addEventListener('click', rm);
            setTimeout(rm, Math.max(3000, 250 * msg.length));
            alerts.insertBefore(elt, alerts.firstChild);
        }
        constructor(btns, popups, g, toolbox) {
            this.g = g;
            this.toolbox = toolbox;
            this.activeMenu = undefined;
            this.menus = new Map();
            for (const btn of btns) {
                btn.addEventListener('click', () => {
                    const menu = this.menus.get(btn.dataset.menu);
                    if (menu !== undefined && this.activeMenu === undefined) {
                        this.open(menu);
                    }
                    else {
                        const fn = menuactions.get(btn.dataset.menu);
                        if (fn !== undefined)
                            fn(this);
                    }
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
        }
        menuevent(menu, ev, e = undefined, target = undefined) {
            const fn = menuevents.get(`${menu.name}-${ev}`);
            if (fn !== undefined)
                fn(this, menu, e, target);
        }
    }
    exports.default = MenuManager;
});
define("data", ["require", "exports", "menu", "bitstream", "draw", "stamp"], function (require, exports, menu_js_1, bitstream_js_1, Draw, Stamp) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DataManager = exports.deserializeChanges = exports.serializeChanges = exports.deserializeStamp = exports.serializeStamp = exports.Change = exports.Item = exports.Element = exports.lineeq = exports.linedateq = exports.sheq = exports.headsymmetric = exports.decode = exports.encode = void 0;
    function encode(x, y) {
        return (x << 16) | (y & 0xffff);
    }
    exports.encode = encode;
    function decode(n) {
        return [n >> 16, n << 16 >> 16];
    }
    exports.decode = decode;
    function headsymmetric(h) {
        switch (h) {
            case 0 /* Head.NONE */: return true;
            case 1 /* Head.ARROW */: return false;
        }
    }
    exports.headsymmetric = headsymmetric;
    function sheq(a, b) {
        return a.shape === b.shape && a.size === b.size;
    }
    exports.sheq = sheq;
    function linedateq(a, b) {
        return a.isEdge === b.isEdge && a.head === b.head
            && a.color === b.color && a.thickness === b.thickness;
    }
    exports.linedateq = linedateq;
    function lineeq([spec1, dir1], [spec2, dir2]) {
        if (!linedateq(spec1, spec2))
            return false;
        switch (spec1.head) {
            case 0 /* Head.NONE */: return true;
            case 1 /* Head.ARROW */: return dir1 === dir2;
        }
    }
    exports.lineeq = lineeq;
    class Element {
        constructor(obj, data) {
            this.obj = obj;
            this.data = data;
        }
    }
    exports.Element = Element;
    class Item {
        constructor(n, layer, elt) {
            this.n = n;
            this.layer = layer;
            this.elt = elt;
        }
    }
    exports.Item = Item;
    class Change {
        constructor(n, layer, pre, post, linked = false) {
            this.n = n;
            this.layer = layer;
            this.pre = pre;
            this.post = post;
            this.linked = linked;
        }
        rev() { return new Change(this.n, this.layer, this.post, this.pre, this.linked); }
    }
    exports.Change = Change;
    const N_BITS = 32;
    const OBJ_BITS = 6;
    const LAYER_BITS = 6;
    const SHAPE_BITS = 6;
    const COLOR_BITS = 6;
    const SIZE_BITS = 3;
    const VLQ_CHUNK = 4;
    const HEAD_BITS = 3;
    const THICKNESS_BITS = 3;
    const serializefns = {
        [0 /* Obj.SURFACE */]: (bs, data) => {
            bs.write(COLOR_BITS, data);
        },
        [1 /* Obj.LINE */]: (bs, [spec, dir]) => {
            bs.write(1, spec.isEdge ? 1 : 0);
            if (spec.color === undefined)
                bs.write(1, 0);
            else {
                bs.write(1, 1);
                bs.write(COLOR_BITS, spec.color);
            }
            bs.write(THICKNESS_BITS, spec.thickness);
            bs.write(HEAD_BITS, spec.head);
            bs.write(1, dir ? 1 : 0);
        },
        [2 /* Obj.SHAPE */]: (bs, data) => {
            bs.writeVLQ(VLQ_CHUNK, data.length);
            for (const spec of data) {
                bs.write(SHAPE_BITS, spec.shape);
                if (spec.fill === undefined)
                    bs.write(1, 0);
                else {
                    bs.write(1, 1);
                    bs.write(COLOR_BITS, spec.fill);
                }
                if (spec.outline === undefined)
                    bs.write(1, 0);
                else {
                    bs.write(1, 1);
                    bs.write(COLOR_BITS, spec.outline);
                }
                bs.write(SIZE_BITS, spec.size);
            }
        },
        [3 /* Obj.TEXT */]: (bs, data) => {
            bs.writeString(data);
        },
    };
    const deserializefns = {
        [0 /* Obj.SURFACE */]: (bs) => {
            return bs.read(COLOR_BITS);
        },
        [1 /* Obj.LINE */]: (bs) => {
            const isEdge = bs.read(1) === 1;
            const color = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
            const thickness = bs.read(THICKNESS_BITS);
            const head = bs.read(HEAD_BITS);
            const dir = bs.read(1) === 1;
            return [{ isEdge, color, thickness, head }, dir];
        },
        [2 /* Obj.SHAPE */]: (bs) => {
            // check to make sure this isn't unreasonably large
            // (maybe should do something if it is?)
            const len = Math.min(bs.readVLQ(VLQ_CHUNK), 16);
            const arr = [];
            for (let i = 0; i < len; ++i) {
                const shape = bs.read(SHAPE_BITS);
                const fill = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
                const outline = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
                const size = bs.read(SIZE_BITS);
                arr.push({ shape, fill, outline, size });
            }
            return arr;
        },
        [3 /* Obj.TEXT */]: (bs) => {
            return bs.readString();
        },
    };
    function serializeStamp(stamp) {
        const bs = bitstream_js_1.default.empty();
        bs.write(1, 0);
        for (const item of stamp) {
            bs.write(N_BITS, item.n);
            bs.write(OBJ_BITS, item.elt.obj);
            bs.write(LAYER_BITS, item.layer);
            serializefns[item.elt.obj](bs, item.elt.data);
        }
        return bs.cut();
    }
    exports.serializeStamp = serializeStamp;
    function deserializeStamp(arr) {
        const stamp = new Array();
        const bs = bitstream_js_1.default.fromArr(arr);
        const version = bs.read(1);
        if (version !== 0) {
            menu_js_1.default.alert('deserialize: invalid version number');
            return [];
        }
        while (1) {
            const n = bs.read(N_BITS);
            if (!bs.inbounds())
                break;
            const obj = bs.read(OBJ_BITS);
            const layer = bs.read(LAYER_BITS);
            stamp.push(new Item(n, layer, new Element(obj, deserializefns[obj](bs))));
        }
        return stamp;
    }
    exports.deserializeStamp = deserializeStamp;
    function serializeChanges(changes) {
        const bs = bitstream_js_1.default.empty();
        bs.write(1, 0);
        for (const ch of changes) {
            bs.write(N_BITS, ch.n);
            bs.write(LAYER_BITS, ch.layer);
            if (ch.pre === undefined) {
                bs.write(OBJ_BITS, (1 << OBJ_BITS) - 1);
            }
            else {
                bs.write(OBJ_BITS, ch.pre.obj);
                serializefns[ch.pre.obj](bs, ch.pre.data);
            }
            if (ch.post === undefined) {
                bs.write(OBJ_BITS, (1 << OBJ_BITS) - 1);
            }
            else {
                bs.write(OBJ_BITS, ch.post.obj);
                serializefns[ch.post.obj](bs, ch.post.data);
            }
        }
        return bs.cut();
    }
    exports.serializeChanges = serializeChanges;
    function deserializeChanges(arr) {
        const changes = [];
        const bs = bitstream_js_1.default.fromArr(arr);
        const version = bs.read(1);
        if (version !== 0) {
            menu_js_1.default.alert('deserialize: invalid version number');
            return [];
        }
        while (1) {
            const n = bs.read(N_BITS);
            if (!bs.inbounds())
                break;
            const layer = bs.read(LAYER_BITS);
            const preobj = bs.read(OBJ_BITS);
            const pre = preobj === (1 << OBJ_BITS) - 1 ? undefined : new Element(preobj, deserializefns[preobj](bs));
            const postobj = bs.read(OBJ_BITS);
            const post = postobj === (1 << OBJ_BITS) - 1 ? undefined : new Element(postobj, deserializefns[postobj](bs));
            changes.push(new Change(n, layer, pre, post));
        }
        return changes;
    }
    exports.deserializeChanges = deserializeChanges;
    class DataManager {
        constructor(image = undefined) {
            this.image = image;
            this.halfcells = new Map();
            this.drawn = new Map();
            this.history = new Array();
            this.histpos = 0;
            this.ws = undefined;
            this.hasReceivedDocument = false;
        }
        connect(url) {
            this.ws = new WebSocket(url);
            this.ws.addEventListener('open', () => {
                menu_js_1.default.alert('connected to server');
            });
            this.ws.addEventListener('error', () => {
                menu_js_1.default.alert('server connection failed');
            });
            this.ws.addEventListener('message', this.message.bind(this));
        }
        message(msg) {
            msg.data.arrayBuffer().then((buf) => {
                if (this.hasReceivedDocument) {
                    for (const ch of deserializeChanges(new Uint8Array(buf))) {
                        this.perform(ch);
                    }
                }
                else {
                    // TODO kinda bad
                    new Stamp.Stamp(deserializeStamp(new Uint8Array(buf)), 0, 0, 0, 0, 0, 0).apply(this, 0, 0);
                    this.hasReceivedDocument = true;
                }
            });
        }
        add(change) {
            if (this.histpos < this.history.length)
                this.history.splice(this.histpos, this.history.length);
            this.history.push(change);
            this.undo(false);
        }
        undo(isUndo) {
            var _a;
            do {
                if (isUndo ? (this.histpos <= 0) : (this.histpos >= this.history.length))
                    return;
                const change = this.history[isUndo ? --this.histpos : this.histpos++];
                const real = isUndo ? change.rev() : change;
                if (this.ws !== undefined && this.hasReceivedDocument) {
                    this.ws.send(serializeChanges([real]));
                }
                this.perform(real);
            } while ((_a = this.history[this.histpos - 1]) === null || _a === void 0 ? void 0 : _a.linked);
        }
        perform(change) {
            var _a, _b;
            if (change.pre !== undefined) {
                // TODO undefined cases here should never happen
                if (this.image !== undefined) {
                    // delete the drawing
                    const elt = (_a = this.drawn.get(change.n)) === null || _a === void 0 ? void 0 : _a.get(change.layer);
                    if (elt !== undefined)
                        this.image.obj(change.layer).removeChild(elt);
                }
                // delete item
                const hc = this.halfcells.get(change.n);
                hc === null || hc === void 0 ? void 0 : hc.delete(change.layer);
                if ((hc === null || hc === void 0 ? void 0 : hc.size) === 0)
                    this.halfcells.delete(change.n);
            }
            if (change.post !== undefined) {
                // create item
                if (!this.halfcells.has(change.n))
                    this.halfcells.set(change.n, new Map());
                this.halfcells.get(change.n).set(change.layer, change.post);
                if (this.image !== undefined) {
                    // draw it
                    const [x, y] = decode(change.n);
                    const elt = Draw.objdraw(change.post, x, y);
                    this.image.obj(change.layer).appendChild(elt);
                    // save the element
                    if (!this.drawn.has(change.n))
                        this.drawn.set(change.n, new Map());
                    (_b = this.drawn.get(change.n)) === null || _b === void 0 ? void 0 : _b.set(change.layer, elt);
                }
            }
        }
        listcells() {
            const cells = new Array();
            for (const [n, hc] of this.halfcells) {
                cells.push(...Array.from(hc.entries()).map(([k, v]) => {
                    return new Item(n, k, v);
                }));
            }
            return cells;
        }
    }
    exports.DataManager = DataManager;
});
define("main", ["require", "exports", "event", "stamp", "color", "data", "draw", "menu", "view", "toolbox", "image", "gratility"], function (require, exports, Event, Stamp, Color, Data, Draw, menu_js_2, view_js_1, toolbox_js_1, image_js_2, gratility_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // TODO make this better i guess
    Draw.initialize(document);
    const svg = document.getElementById('grid');
    const image = new image_js_2.default(svg);
    const data = new Data.DataManager(image);
    const stamp = new Stamp.StampManager(image);
    const view = new view_js_1.default(image);
    const gratility = new gratility_js_1.default(image, data, stamp, view);
    const toolbox = new toolbox_js_1.default(document.getElementById('toolbox'));
    const menu = new menu_js_2.default(Array.from(document.getElementsByClassName('menuaction')), Array.from(document.getElementById('menupopups').children), gratility, toolbox);
    Event.initialize(gratility, svg, document.body, toolbox, menu, view);
    // TODO better
    image.grid(-500, 500, -500, 500);
    // TODO this stuff should really go somewhere else
    for (const multisel of Array.from(document.getElementsByClassName('multisel'))) {
        const any = multisel.classList.contains('any');
        const children = Array.from(multisel.children);
        for (const child of children) {
            child.addEventListener('click', () => {
                if (!any)
                    for (const ch of children)
                        ch.classList.remove('active');
                child.classList.toggle('active');
                multisel.dataset.value = children
                    .filter(ch => ch.classList.contains('active'))
                    .map(ch => ch.dataset.multisel)
                    .join('|');
            });
        }
        if (any) {
            multisel.dataset.value = '';
        }
        else {
            children[0].classList.add('active');
            multisel.dataset.value = children[0].dataset.multisel;
        }
    }
    for (const colorpicker of Array.from(document.getElementsByClassName('colorpicker'))) {
        const children = [];
        // TODO less repetition
        if (colorpicker.classList.contains('optional')) {
            const el = document.createElement('span');
            el.classList.add('transparent');
            el.addEventListener('click', () => {
                for (const ch of children)
                    ch.classList.remove('active');
                el.classList.add('active');
                colorpicker.dataset.value = '';
            });
            colorpicker.appendChild(el);
            children.push(el);
        }
        Color.colors.forEach((color, i) => {
            const el = document.createElement('span');
            el.style.backgroundColor = color;
            el.addEventListener('click', () => {
                for (const ch of children)
                    ch.classList.remove('active');
                el.classList.add('active');
                colorpicker.dataset.value = i.toString();
            });
            colorpicker.appendChild(el);
            children.push(el);
        });
        children[0].classList.add('active');
        colorpicker.dataset.value = colorpicker.classList.contains('optional') ? '' : '0';
    }
    window.addEventListener('beforeunload', e => { e.preventDefault(); e.returnValue = true; });
});
