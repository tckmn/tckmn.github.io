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
define("image", ["require", "exports", "measure", "color"], function (require, exports, Measure, Color) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const svgNS = 'http://www.w3.org/2000/svg';
    const drawfns = {
        [0 /* Data.Obj.SURFACE */]: (image, x, y, data) => {
            return image.draw(undefined, 'rect', {
                width: Measure.CELL,
                height: Measure.CELL,
                x: Measure.HALFCELL * (x - 1),
                y: Measure.HALFCELL * (y - 1),
                fill: Color.colors[data]
            });
        },
        [1 /* Data.Obj.LINE */]: (image, x, y, [spec, reversed]) => {
            const g = image.draw(undefined, 'g', {
                transform: `
                rotate(${((y % 2 === 0) == spec.isEdge ? 0 : 90) + (reversed ? 180 : 0)} ${x * Measure.HALFCELL} ${y * Measure.HALFCELL})
                `
            });
            const stroke = Color.colors[spec.color];
            const strokeLinecap = 'round';
            const strokeWidth = Measure.LINE * spec.thickness;
            const adjust = (z, n) => (z * Measure.HALFCELL + n * Math.sqrt(spec.thickness));
            image.draw(g, 'line', {
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
                    image.draw(g, 'path', {
                        d: `M ${adjust(x, 3)} ${adjust(y, 5)} L ${adjust(x, -2)} ${adjust(y, 0)} L ${adjust(x, 3)} ${adjust(y, -5)}`,
                        fill: 'none',
                        stroke, strokeLinecap, strokeWidth
                    });
            }
            return g;
        },
        [2 /* Data.Obj.SHAPE */]: (image, x, y, data) => {
            const g = image.draw(undefined, 'g', {
                transform: `translate(${x * Measure.HALFCELL} ${y * Measure.HALFCELL})`
            });
            for (const spec of data) {
                const r = Measure.HALFCELL * (spec.size / 6);
                const strokeWidth = Measure.HALFCELL * (0.05 + 0.1 * (spec.size / 12));
                const fill = spec.fill === undefined ? 'transparent' : Color.colors[spec.fill];
                const stroke = spec.outline === undefined ? 'transparent' : Color.colors[spec.outline];
                switch (spec.shape) {
                    case 0 /* Data.Shape.CIRCLE */:
                        image.draw(g, 'circle', {
                            cx: 0, cy: 0, r: r,
                            strokeWidth, fill, stroke
                        });
                        break;
                    case 1 /* Data.Shape.SQUARE */:
                        image.draw(g, 'rect', {
                            width: r * 2, height: r * 2, x: -r, y: -r,
                            strokeWidth, fill, stroke
                        });
                        break;
                    case 2 /* Data.Shape.FLAG */:
                        image.draw(g, 'path', {
                            d: 'M -0.8 1 L -0.8 -1 L -0.6 -1 L 0.8 -0.5 L -0.6 0 L -0.6 1 Z',
                            transform: `scale(${r * 0.9})`,
                            strokeWidth: strokeWidth / (r * 0.9), fill, stroke
                        });
                        break;
                    case 3 /* Data.Shape.STAR */:
                        image.draw(g, 'path', {
                            d: 'M' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (r * (n % 2 === 0 ? 1 : 0.5) * Math.cos((n / 5 + 0.5) * Math.PI) + ' ' +
                                -r * (n % 2 === 0 ? 1 : 0.5) * Math.sin((n / 5 + 0.5) * Math.PI))).join('L') + 'Z',
                            strokeWidth, fill, stroke
                        });
                        break;
                }
            }
            return g;
        },
        [3 /* Data.Obj.TEXT */]: (image, x, y, data) => {
            return image.draw(undefined, 'text', {
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
    class Image {
        constructor(document, svg) {
            this.document = document;
            this.root = this.draw(svg, 'g');
            this.gridlines = this.draw(this.root, 'g', { stroke: Measure.GRIDCOLOR, strokeWidth: Measure.GRIDLINE });
            this.surface = this.draw(this.root, 'g');
            this.path = this.draw(this.root, 'g');
            this.edge = this.draw(this.root, 'g');
            this.shape = this.draw(this.root, 'g');
            this.textInd = this.draw(this.root, 'g');
            this.text = this.draw(this.root, 'g');
            this.copypaste = this.draw(this.root, 'g');
            this.stamps = this.draw(this.root, 'g', { opacity: 0.5 });
        }
        draw(parent, tagname, attrs = {}) {
            const elt = this.document.createElementNS(svgNS, tagname);
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
        obj(obj) {
            switch (obj) {
                case 0 /* Data.Layer.SURFACE */: return this.surface;
                case 1 /* Data.Layer.PATH */: return this.path;
                case 2 /* Data.Layer.EDGE */: return this.edge;
                case 3 /* Data.Layer.SHAPE */: return this.shape;
                case 4 /* Data.Layer.TEXT */: return this.text;
            }
        }
        objdraw(elt, x, y) {
            return drawfns[elt.obj](this, x, y, elt.data);
        }
        grid(xmin, xmax, ymin, ymax) {
            for (let x = Math.ceil(xmin / 2) * 2; x <= xmax; x += 2) {
                this.draw(this.gridlines, 'line', {
                    x1: x * Measure.HALFCELL, x2: x * Measure.HALFCELL,
                    y1: ymin * Measure.HALFCELL, y2: ymax * Measure.HALFCELL
                });
            }
            for (let y = Math.ceil(ymin / 2) * 2; y <= ymax; y += 2) {
                this.draw(this.gridlines, 'line', {
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
define("tools/copy", ["require", "exports", "data", "measure", "stamp"], function (require, exports, Data, Measure, Stamp) {
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
        icon(image) { }
        save() { return ''; }
        static load(_) { return new CopyTool(); }
        ondown(x, y, image) {
            this.sx = x;
            this.sy = y;
            this.tx = x;
            this.ty = y;
            this.elt = image.draw(image.copypaste, 'rect', {
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
        onup(image) {
            if (this.elt !== undefined)
                image.copypaste.removeChild(this.elt);
            const sx = Measure.hc(Math.min(this.sx, this.tx));
            const sy = Measure.hc(Math.min(this.sy, this.ty));
            const tx = Measure.hc(Math.max(this.sx, this.tx));
            const ty = Measure.hc(Math.max(this.sy, this.ty));
            if (sx === tx && sy === ty) {
                Stamp.deselect();
                return;
            }
            const xoff = Math.round(sx / 2) * 2;
            const yoff = Math.round(sy / 2) * 2;
            const stamp = new Array();
            for (let x = sx; x <= tx; ++x) {
                for (let y = sy; y <= ty; ++y) {
                    const n = Data.encode(x, y);
                    const hc = Data.halfcells.get(n);
                    if (hc !== undefined) {
                        stamp.push(...Array.from(hc.entries()).map(([k, v]) => {
                            return new Data.Item(n, k, v);
                        }));
                    }
                }
            }
            Stamp.add(stamp);
        }
    }
    exports.default = CopyTool;
});
define("tools/line", ["require", "exports", "data", "measure"], function (require, exports, Data, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class LineTool {
        name() { return 'Line'; }
        icon(image) {
            return image.draw(undefined, 'svg', {
                viewBox: `-${Measure.HALFCELL} 0 ${Measure.CELL} ${Measure.CELL}`,
                children: [
                    image.objdraw(new Data.Element(1 /* Data.Obj.LINE */, [this.spec, false]), 0, 1)
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
        onmove(x, y) {
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
            const oldline = (_a = Data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(this.LAYER);
            const newline = new Data.Element(1 /* Data.Obj.LINE */, [this.spec, dir === -1]);
            if (this.isDrawing === undefined) {
                this.isDrawing = oldline === undefined || !Data.lineeq(oldline.data, newline.data);
            }
            if (this.isDrawing) {
                if (oldline === undefined || !Data.lineeq(oldline.data, newline.data)) {
                    Data.add(new Data.Change(n, this.LAYER, oldline, newline));
                }
            }
            else {
                if (oldline !== undefined) {
                    Data.add(new Data.Change(n, this.LAYER, oldline, undefined));
                }
            }
        }
        onup() { this.isDrawing = undefined; }
    }
    exports.default = LineTool;
});
define("view", ["require", "exports", "measure"], function (require, exports, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.update = exports.zoom = exports.setZ = exports.setY = exports.setX = exports.initialize = exports.z = exports.y = exports.x = void 0;
    exports.x = 0;
    exports.y = 0;
    exports.z = 0;
    // TODO this is absolutely an extremely temporary bandaid lol
    let img;
    function initialize(image) {
        img = image;
    }
    exports.initialize = initialize;
    function setX(n) { exports.x = n; }
    exports.setX = setX;
    function setY(n) { exports.y = n; }
    exports.setY = setY;
    function setZ(n) { exports.z = n; }
    exports.setZ = setZ;
    function zoom(n) { return Math.pow(Measure.ZOOMTICK, n !== null && n !== void 0 ? n : exports.z); }
    exports.zoom = zoom;
    function update() {
        img.root.setAttribute('transform', `scale(${zoom()}) translate(${exports.x} ${exports.y})`);
    }
    exports.update = update;
});
define("tools/pan", ["require", "exports", "view"], function (require, exports, View) {
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
        icon(image) { }
        save() { return ''; }
        static load() { return new PanTool(); }
        ondown(x, y) {
            this.mx = x;
            this.my = y;
        }
        onmove(x, y) {
            View.setX(View.x - this.mx + x);
            View.setY(View.y - this.my + y);
            View.update();
        }
        onup() { }
    }
    exports.default = PanTool;
});
define("tools/paste", ["require", "exports", "stamp", "measure"], function (require, exports, Stamp, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class PasteTool {
        constructor() {
            this.repeat = false;
            this.tid = 'paste';
        }
        name() { return 'Paste'; }
        icon(image) { }
        save() { return ''; }
        static load() { return new PasteTool(); }
        ondown(x, y) {
            var _a;
            const xoff = Math.round(x / Measure.CELL) * 2;
            const yoff = Math.round(y / Measure.CELL) * 2;
            (_a = Stamp.current()) === null || _a === void 0 ? void 0 : _a.apply(xoff, yoff);
        }
        onmove(x, y) { }
        onup() { }
    }
    exports.default = PasteTool;
});
define("tools/shape", ["require", "exports", "data", "measure"], function (require, exports, Data, Measure) {
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
        icon(image) {
            return image.draw(undefined, 'svg', {
                viewBox: `0 0 ${Measure.CELL} ${Measure.CELL}`,
                children: [
                    image.objdraw(new Data.Element(2 /* Data.Obj.SHAPE */, [this.spec]), 1, 1)
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
        ondown(x, y) {
            var _a;
            [x, y] = atlocs(x, y, this.locs);
            const n = Data.encode(x, y);
            const shape = (_a = Data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(3 /* Data.Layer.SHAPE */);
            const shapelst = shape === null || shape === void 0 ? void 0 : shape.data;
            if (shapelst === undefined) {
                Data.add(new Data.Change(n, 3 /* Data.Layer.SHAPE */, shape, new Data.Element(2 /* Data.Obj.SHAPE */, [this.spec])));
                this.isDrawing = true;
            }
            else if (!shapelst.some(sh => Data.sheq(sh, this.spec))) {
                Data.add(new Data.Change(n, 3 /* Data.Layer.SHAPE */, shape, new Data.Element(2 /* Data.Obj.SHAPE */, shapelst.concat(this.spec))));
                this.isDrawing = true;
            }
            else {
                const remaining = shapelst.filter(sh => !Data.sheq(sh, this.spec));
                Data.add(new Data.Change(n, 3 /* Data.Layer.SHAPE */, shape, remaining.length === 0 ? undefined
                    : new Data.Element(2 /* Data.Obj.SHAPE */, remaining)));
                this.isDrawing = false;
            }
        }
        onmove(x, y) {
            var _a;
            [x, y] = atlocs(x, y, this.locs);
            const n = Data.encode(x, y);
            const shape = (_a = Data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(3 /* Data.Layer.SHAPE */);
            const shapelst = shape === null || shape === void 0 ? void 0 : shape.data;
            if (shapelst === undefined) {
                if (this.isDrawing) {
                    Data.add(new Data.Change(n, 3 /* Data.Layer.SHAPE */, shape, new Data.Element(2 /* Data.Obj.SHAPE */, [this.spec])));
                }
            }
            else if (!shapelst.some(sh => Data.sheq(sh, this.spec))) {
                if (this.isDrawing) {
                    Data.add(new Data.Change(n, 3 /* Data.Layer.SHAPE */, shape, new Data.Element(2 /* Data.Obj.SHAPE */, shapelst.concat(this.spec))));
                }
            }
            else {
                if (!this.isDrawing) {
                    const remaining = shapelst.filter(sh => !Data.sheq(sh, this.spec));
                    Data.add(new Data.Change(n, 3 /* Data.Layer.SHAPE */, shape, remaining.length === 0 ? undefined :
                        new Data.Element(2 /* Data.Obj.SHAPE */, remaining)));
                }
            }
        }
        onup() { }
    }
    exports.default = ShapeTool;
});
define("tools/surface", ["require", "exports", "data", "measure"], function (require, exports, Data, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SurfaceTool {
        name() { return 'Surface'; }
        icon(image) {
            return image.draw(undefined, 'svg', {
                viewBox: `0 0 ${Measure.CELL} ${Measure.CELL}`,
                children: [
                    image.objdraw(this.element, 1, 1)
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
        ondown(x, y) {
            var _a;
            x = Measure.cell(x);
            y = Measure.cell(y);
            const n = Data.encode(x * 2 + 1, y * 2 + 1);
            const surface = (_a = Data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(0 /* Data.Layer.SURFACE */);
            if (surface === undefined) {
                Data.add(new Data.Change(n, 0 /* Data.Layer.SURFACE */, surface, new Data.Element(0 /* Data.Obj.SURFACE */, this.color)));
                this.isDrawing = true;
            }
            else {
                Data.add(new Data.Change(n, 0 /* Data.Layer.SURFACE */, surface, undefined));
                this.isDrawing = false;
            }
        }
        onmove(x, y) {
            var _a;
            x = Measure.cell(x);
            y = Measure.cell(y);
            const n = Data.encode(x * 2 + 1, y * 2 + 1);
            const surface = (_a = Data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(0 /* Data.Layer.SURFACE */);
            if (surface === undefined) {
                if (this.isDrawing) {
                    Data.add(new Data.Change(n, 0 /* Data.Layer.SURFACE */, surface, this.element));
                }
            }
            else {
                if (!this.isDrawing) {
                    Data.add(new Data.Change(n, 0 /* Data.Layer.SURFACE */, surface, undefined));
                }
            }
        }
        onup() { }
    }
    exports.default = SurfaceTool;
});
define("tools/text", ["require", "exports", "data", "measure", "event"], function (require, exports, Data, Measure, Event) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class TextTool {
        name() { return 'Text'; }
        icon(image) { }
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
        ondown(x, y, image) {
            var _a;
            if (this.preset !== '') {
                const n = Data.encode(Measure.cell(x) * 2 + 1, Measure.cell(y) * 2 + 1);
                const text = (_a = Data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(4 /* Data.Layer.TEXT */);
                if (text && text.data === this.preset) {
                    Data.add(new Data.Change(n, 4 /* Data.Layer.TEXT */, text, undefined));
                    this.isDrawing = false;
                }
                else {
                    Data.add(new Data.Change(n, 4 /* Data.Layer.TEXT */, text, new Data.Element(3 /* Data.Obj.TEXT */, this.preset)));
                    this.isDrawing = true;
                }
            }
            else if (Event.keyeater.ref === undefined) {
                const cx = Measure.cell(x) * 2, cy = Measure.cell(y) * 2;
                this.n = Data.encode(cx + 1, cy + 1);
                // TODO some of this goes somewhere else
                this.elt = image.draw(image.textInd, 'rect', {
                    x: cx * Measure.HALFCELL, y: cy * Measure.HALFCELL, width: Measure.CELL, height: Measure.CELL,
                    fill: '#ccc',
                    stroke: '#f88',
                    strokeWidth: Measure.HALFCELL / 5
                });
                Event.keyeater.ref = this.onkey.bind(this);
            }
        }
        onkey(e) {
            var _a, _b, _c, _d;
            const text = (_a = Data.halfcells.get(this.n)) === null || _a === void 0 ? void 0 : _a.get(4 /* Data.Layer.TEXT */);
            if (e.key === 'Enter' || e.key === 'Escape') {
                this.deselect();
            }
            else if (e.key === 'Backspace') {
                Data.add(new Data.Change(this.n, 4 /* Data.Layer.TEXT */, text, new Data.Element(3 /* Data.Obj.TEXT */, ((_b = text === null || text === void 0 ? void 0 : text.data) !== null && _b !== void 0 ? _b : '').slice(0, ((_c = text === null || text === void 0 ? void 0 : text.data) !== null && _c !== void 0 ? _c : '').length - 1))));
            }
            else if (e.key.length === 1) {
                Data.add(new Data.Change(this.n, 4 /* Data.Layer.TEXT */, text, new Data.Element(3 /* Data.Obj.TEXT */, ((_d = text === null || text === void 0 ? void 0 : text.data) !== null && _d !== void 0 ? _d : '') + e.key)));
            }
        }
        deselect() {
            Event.keyeater.ref = undefined;
            if (this.elt !== undefined)
                this.elt.parentNode.removeChild(this.elt);
        }
        onmove(x, y) {
            var _a;
            if (this.preset === '')
                return;
            const n = Data.encode(Measure.cell(x) * 2 + 1, Measure.cell(y) * 2 + 1);
            const text = (_a = Data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(4 /* Data.Layer.TEXT */);
            if (text && text.data === this.preset) {
                if (!this.isDrawing) {
                    Data.add(new Data.Change(n, 4 /* Data.Layer.TEXT */, text, undefined));
                }
            }
            else {
                if (this.isDrawing) {
                    Data.add(new Data.Change(n, 4 /* Data.Layer.TEXT */, text, new Data.Element(3 /* Data.Obj.TEXT */, this.preset)));
                }
            }
        }
        onup() { }
    }
    exports.default = TextTool;
});
define("tools/undo", ["require", "exports", "data"], function (require, exports, Data) {
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
        ondown() { Data.undo(this.isUndo); }
        onmove() { }
        onup() { }
    }
    exports.default = UndoTool;
});
define("tools/zoom", ["require", "exports", "view"], function (require, exports, View) {
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
        ondown(x, y) {
            View.setX((x + View.x) * View.zoom(-this.amount) - x);
            View.setY((y + View.y) * View.zoom(-this.amount) - y);
            View.setZ(View.z + this.amount);
            View.update();
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
        constructor(image, container) {
            this.image = image;
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
            const maybeIcon = tool.icon(this.image);
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
define("event", ["require", "exports", "view"], function (require, exports, View) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.initialize = exports.keyeater = exports.onmove = void 0;
    exports.onmove = [];
    exports.keyeater = { ref: undefined };
    function initialize(image, svg, page, toolbox, menu) {
        const activeTools = new Set();
        const rect = svg.getBoundingClientRect();
        let lastX = 0;
        let lastY = 0;
        let upd = (e) => {
            lastX = (e.clientX - rect.left) / View.zoom() - View.x;
            lastY = (e.clientY - rect.top) / View.zoom() - View.y;
        };
        svg.addEventListener('contextmenu', e => e.preventDefault());
        svg.addEventListener('pointermove', e => {
            if (menu.isOpen())
                return;
            upd(e);
            for (const t of activeTools)
                t.onmove(lastX, lastY, image);
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
            t.ondown(lastX, lastY, image);
            activeTools.add(t);
        });
        svg.addEventListener('pointerup', e => {
            if (menu.isOpen())
                return;
            const t = toolbox.mouseTools.get(e.button);
            if (t === undefined)
                return;
            t.onup(image);
            activeTools.delete(t);
        });
        svg.addEventListener('pointerleave', e => {
            for (const t of activeTools)
                t.onup(image);
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
            t.ondown(lastX, lastY, image);
            activeTools.add(t);
        });
        page.addEventListener('keyup', e => {
            if (menu.isOpen())
                return;
            const t = toolbox.keyTools.get(e.key);
            if (t === undefined)
                return;
            t.onup(image);
            activeTools.delete(t);
        });
        page.addEventListener('wheel', e => {
            if (menu.isOpen())
                return;
            const t = toolbox.wheelTools.get(e.deltaY < 0);
            if (t === undefined)
                return;
            t.ondown(lastX, lastY, image);
            t.onup(image);
        });
    }
    exports.initialize = initialize;
});
define("stamp", ["require", "exports", "data", "event", "measure"], function (require, exports, Data, Event, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.initialize = exports.deselect = exports.current = exports.add = exports.render = exports.stamps = void 0;
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
        apply(xoff, yoff) {
            var _a;
            for (let i = 0; i < this.cells.length; ++i) {
                const cell = this.cells[i];
                const [x, y] = Data.decode(cell.n);
                const newn = Data.encode(x - this.xoff + xoff, y - this.yoff + yoff);
                const pre = (_a = Data.halfcells.get(newn)) === null || _a === void 0 ? void 0 : _a.get(cell.layer);
                if (pre !== cell.elt.data) {
                    Data.add(new Data.Change(newn, cell.layer, pre, cell.elt, i !== this.cells.length - 1));
                }
            }
        }
    }
    // TODO this is absolutely an extremely temporary bandaid lol
    let img;
    exports.stamps = new Array();
    let stamppos = 0;
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
    function add(cells) {
        if (cells.length === 0)
            return;
        const stamp = render(cells);
        exports.stamps.push(stamp);
        stamppos = exports.stamps.length - 1;
        img.stamps.replaceChildren(...cells.map(cell => {
            const [x, y] = Data.decode(cell.n);
            return img.objdraw(cell.elt, x - stamp.xoff, y - stamp.yoff);
        }));
    }
    exports.add = add;
    function current() {
        return stamppos >= 0 && stamppos < exports.stamps.length ? exports.stamps[stamppos] : undefined;
    }
    exports.current = current;
    function deselect() {
        stamppos = exports.stamps.length;
        img.stamps.replaceChildren();
    }
    exports.deselect = deselect;
    function initialize(image) {
        img = image;
        Event.onmove.push((x, y) => {
            // if (stamppos === -1) return;
            img.stamps.setAttribute('transform', `translate(${Measure.round(x, Measure.CELL)} ${Measure.round(y, Measure.CELL)})`);
        });
    }
    exports.initialize = initialize;
});
define("menu", ["require", "exports", "stamp", "data", "tools/alltools"], function (require, exports, Stamp, Data, Tools) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const menuactions = new Map([
        ['dark', () => {
                document.body.classList.toggle('dark');
            }],
        ['dlstamp', () => {
                const stamp = Stamp.current();
                if (stamp === undefined)
                    return;
                const blob = new Blob([Data.serialize(stamp.cells)], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.setAttribute('href', url);
                a.setAttribute('download', 'gratility.stamp');
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 10000);
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
        const stamp = Stamp.current();
        elt.value = stamp === undefined ? '' :
            btoa(String.fromCharCode.apply(null, Data.serialize(stamp.cells)));
        elt.focus();
        elt.select();
    });
    menuevents.set('stamp-go', (manager, menu) => {
        const elt = menu.inputs.get('value');
        Stamp.add(Data.deserialize(new Uint8Array(atob(elt.value).split('').map(c => c.charCodeAt(0)))));
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
        constructor(btns, popups, toolbox, image) {
            this.toolbox = toolbox;
            this.image = image;
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
                            fn();
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
define("data", ["require", "exports", "menu", "bitstream"], function (require, exports, menu_js_1, bitstream_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.initialize = exports.undo = exports.add = exports.halfcells = exports.deserialize = exports.serialize = exports.Change = exports.Item = exports.Element = exports.lineeq = exports.linedateq = exports.sheq = exports.headsymmetric = exports.decode = exports.encode = void 0;
    // TODO this is absolutely an extremely temporary bandaid lol
    let img;
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
            // TODO don't allow maliciously constructed encodings lol
            const len = bs.readVLQ(VLQ_CHUNK);
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
    function serialize(stamp) {
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
    exports.serialize = serialize;
    function deserialize(arr) {
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
    exports.deserialize = deserialize;
    exports.halfcells = new Map();
    const drawn = new Map();
    const history = new Array();
    let histpos = 0;
    function add(change) {
        if (histpos < history.length)
            history.splice(histpos, history.length);
        history.push(change);
        undo(false);
    }
    exports.add = add;
    function undo(isUndo) {
        var _a, _b, _c;
        do {
            if (isUndo ? (histpos <= 0) : (histpos >= history.length))
                return;
            const change = history[isUndo ? --histpos : histpos++];
            const pre = isUndo ? change.post : change.pre;
            const post = isUndo ? change.pre : change.post;
            if (pre !== undefined) {
                // TODO undefined cases here should never happen
                // delete the drawing
                const elt = (_a = drawn.get(change.n)) === null || _a === void 0 ? void 0 : _a.get(change.layer);
                if (elt !== undefined)
                    img.obj(change.layer).removeChild(elt);
                // delete item
                const hc = exports.halfcells.get(change.n);
                hc === null || hc === void 0 ? void 0 : hc.delete(change.layer);
                if ((hc === null || hc === void 0 ? void 0 : hc.size) === 0)
                    exports.halfcells.delete(change.n);
            }
            if (post !== undefined) {
                // create item
                if (!exports.halfcells.has(change.n))
                    exports.halfcells.set(change.n, new Map());
                exports.halfcells.get(change.n).set(change.layer, post);
                // draw it
                const [x, y] = decode(change.n);
                const elt = img.objdraw(post, x, y);
                img.obj(change.layer).appendChild(elt);
                // save the element
                if (!drawn.has(change.n))
                    drawn.set(change.n, new Map());
                (_b = drawn.get(change.n)) === null || _b === void 0 ? void 0 : _b.set(change.layer, elt);
            }
        } while ((_c = history[histpos - 1]) === null || _c === void 0 ? void 0 : _c.linked);
    }
    exports.undo = undo;
    function initialize(image) {
        img = image;
    }
    exports.initialize = initialize;
});
define("main", ["require", "exports", "event", "view", "stamp", "color", "data", "menu", "toolbox", "image"], function (require, exports, Event, View, Stamp, Color, Data, menu_js_2, toolbox_js_1, image_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // TODO make this better i guess
    const svg = document.getElementById('grid');
    const image = new image_js_1.default(document, svg);
    const toolbox = new toolbox_js_1.default(image, document.getElementById('toolbox'));
    const menu = new menu_js_2.default(Array.from(document.getElementsByClassName('menuaction')), Array.from(document.getElementById('menupopups').children), toolbox, image);
    Event.initialize(image, svg, document.body, toolbox, menu);
    View.initialize(image);
    Stamp.initialize(image);
    Data.initialize(image);
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
