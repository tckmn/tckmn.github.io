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
define("draw", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.draw = void 0;
    const svgNS = 'http://www.w3.org/2000/svg';
    function draw(parent, tagname, attrs = {}) {
        const elt = document.createElementNS(svgNS, tagname);
        for (let [k, v] of Object.entries(attrs)) {
            if (k === 'children') {
                for (let child of v)
                    elt.appendChild(child);
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
});
define("measure", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.hctype = exports.rhalfcell = exports.rcell = exports.halfcell = exports.cell = exports.round = exports.CELL = exports.LINE = exports.ZOOMTICK = exports.HALFCELL = exports.GRIDSIZE = exports.GRIDLINE = exports.GRIDCOLOR = void 0;
    exports.GRIDCOLOR = '#aaa';
    exports.GRIDLINE = 1;
    exports.GRIDSIZE = 500;
    exports.HALFCELL = 20;
    exports.ZOOMTICK = 1.1;
    exports.LINE = 5;
    exports.CELL = 2 * exports.HALFCELL;
    // TODO figure these out
    function round(x, r) { return Math.round(x / r) * r; }
    exports.round = round;
    function cell(x) { return Math.floor(x / exports.CELL); }
    exports.cell = cell;
    function halfcell(x) { return Math.round(x / exports.HALFCELL); }
    exports.halfcell = halfcell;
    function rcell(x) { return Math.round(x / exports.CELL) * exports.CELL; }
    exports.rcell = rcell;
    function rhalfcell(x) { return Math.round(x / exports.HALFCELL) * exports.HALFCELL; }
    exports.rhalfcell = rhalfcell;
    function hctype(x, y) {
        return (Math.abs(x % 2) << 1) | Math.abs(y % 2);
    }
    exports.hctype = hctype;
});
define("layer", ["require", "exports", "draw", "measure"], function (require, exports, Draw, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.obj = exports.initialize = exports.stamps = exports.copypaste = exports.line = exports.surface = exports.grid = exports.parent = void 0;
    function initialize(svg) {
        exports.parent = Draw.draw(svg, 'g');
        exports.grid = Draw.draw(exports.parent, 'g', { stroke: Measure.GRIDCOLOR, strokeWidth: Measure.GRIDLINE });
        exports.surface = Draw.draw(exports.parent, 'g');
        exports.line = Draw.draw(exports.parent, 'g');
        exports.copypaste = Draw.draw(exports.parent, 'g');
        exports.stamps = Draw.draw(exports.parent, 'g', { opacity: 0.5 });
    }
    exports.initialize = initialize;
    function obj(obj) {
        switch (obj) {
            case 0 /* Data.Obj.SURFACE */: return exports.surface;
            case 1 /* Data.Obj.LINE */: return exports.line;
        }
    }
    exports.obj = obj;
});
define("tools/tool", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
define("tools/line", ["require", "exports", "data", "draw", "measure"], function (require, exports, Data, Draw, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class LineTool {
        name() { return 'Line'; }
        icon() {
            return Draw.draw(undefined, 'svg', {
                viewBox: `-${Measure.HALFCELL} 0 ${Measure.HALFCELL * 2} ${Measure.HALFCELL * 2}`,
                children: [
                    Data.drawfns[1 /* Data.Obj.LINE */](0, 1, this.color)
                ]
            });
        }
        constructor(color) {
            this.color = color;
            this.repeat = false;
            this.isDrawing = undefined;
            this.x = 0;
            this.y = 0;
        }
        ondown(x, y) {
            this.x = Measure.cell(x);
            this.y = Measure.cell(y);
        }
        onmove(x, y) {
            var _a;
            x = Measure.cell(x);
            y = Measure.cell(y);
            if (x === this.x && y === this.y)
                return;
            const dx = Math.abs(this.x - x);
            const dy = Math.abs(this.y - y);
            const lx = Math.min(x, this.x);
            const ly = Math.min(y, this.y);
            this.x = x;
            this.y = y;
            if (!(dx === 0 && dy === 1 || dx === 1 && dy === 0))
                return;
            const n = dx > 0 ? Data.encode(lx * 2 + 2, ly * 2 + 1) : Data.encode(lx * 2 + 1, ly * 2 + 2);
            const line = (_a = Data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(1 /* Data.Obj.LINE */);
            if (this.isDrawing === undefined) {
                this.isDrawing = line === undefined;
            }
            if (line === undefined) {
                if (this.isDrawing) {
                    Data.add(new Data.Change(n, 1 /* Data.Obj.LINE */, line, this.color));
                }
            }
            else {
                if (!this.isDrawing) {
                    Data.add(new Data.Change(n, 1 /* Data.Obj.LINE */, line, undefined));
                }
            }
        }
        onup() { this.isDrawing = undefined; }
    }
    exports.default = LineTool;
});
define("view", ["require", "exports", "layer", "measure"], function (require, exports, layer_1, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.update = exports.zoom = exports.setZ = exports.setY = exports.setX = exports.initialize = exports.z = exports.y = exports.x = void 0;
    exports.x = 0;
    exports.y = 0;
    exports.z = 0;
    let elt;
    function initialize(svg) {
        elt = svg;
    }
    exports.initialize = initialize;
    function setX(n) { exports.x = n; }
    exports.setX = setX;
    function setY(n) { exports.y = n; }
    exports.setY = setY;
    function setZ(n) { exports.z = n; }
    exports.setZ = setZ;
    function zoom() { return Math.pow(Measure.ZOOMTICK, exports.z); }
    exports.zoom = zoom;
    function update() {
        layer_1.parent.setAttribute('transform', `scale(${zoom()}) translate(${exports.x} ${exports.y})`);
    }
    exports.update = update;
});
define("tools/pan", ["require", "exports", "view"], function (require, exports, View) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class PanTool {
        constructor() {
            this.repeat = false;
            this.mx = 0;
            this.my = 0;
        }
        name() { return 'Pan'; }
        icon() { }
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
define("tools/surface", ["require", "exports", "data", "draw", "measure"], function (require, exports, Data, Draw, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SurfaceTool {
        name() { return 'Surface'; }
        icon() {
            return Draw.draw(undefined, 'svg', {
                viewBox: `0 0 ${Measure.HALFCELL * 2} ${Measure.HALFCELL * 2}`,
                children: [
                    Data.drawfns[0 /* Data.Obj.SURFACE */](0, 0, this.color)
                ]
            });
        }
        constructor(color) {
            this.color = color;
            this.repeat = false;
            this.isDrawing = false;
        }
        ondown(x, y) {
            var _a;
            x = Measure.cell(x);
            y = Measure.cell(y);
            const n = Data.encode(x * 2, y * 2);
            const surface = (_a = Data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(0 /* Data.Obj.SURFACE */);
            if (surface === undefined) {
                Data.add(new Data.Change(n, 0 /* Data.Obj.SURFACE */, surface, this.color));
                this.isDrawing = true;
            }
            else {
                Data.add(new Data.Change(n, 0 /* Data.Obj.SURFACE */, surface, undefined));
                this.isDrawing = false;
            }
        }
        onmove(x, y) {
            var _a;
            x = Measure.cell(x);
            y = Measure.cell(y);
            const n = Data.encode(x * 2, y * 2);
            const surface = (_a = Data.halfcells.get(n)) === null || _a === void 0 ? void 0 : _a.get(0 /* Data.Obj.SURFACE */);
            if (surface === undefined) {
                if (this.isDrawing) {
                    Data.add(new Data.Change(n, 0 /* Data.Obj.SURFACE */, surface, this.color));
                }
            }
            else {
                if (!this.isDrawing) {
                    Data.add(new Data.Change(n, 0 /* Data.Obj.SURFACE */, surface, undefined));
                }
            }
        }
        onup() { }
    }
    exports.default = SurfaceTool;
});
define("tools/zoom", ["require", "exports", "view"], function (require, exports, View) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class ZoomTool {
        name() { return 'Zoom ' + (this.amount > 0 ? 'in' : 'out'); }
        icon() { }
        constructor(amount) {
            this.amount = amount;
            this.repeat = false;
        }
        ondown(x, y) {
            View.setZ(View.z + this.amount);
            View.update();
        }
        onmove(x, y) { }
        onup() { }
    }
    exports.default = ZoomTool;
});
define("tools/undo", ["require", "exports", "data"], function (require, exports, Data) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class UndoTool {
        name() { return this.isUndo ? 'Undo' : 'Redo'; }
        icon() { }
        constructor(isUndo) {
            this.isUndo = isUndo;
            this.repeat = true;
        }
        ondown() { Data.undo(this.isUndo); }
        onmove() { }
        onup() { }
    }
    exports.default = UndoTool;
});
define("tools/copy", ["require", "exports", "data", "draw", "layer", "measure", "stamp"], function (require, exports, Data, Draw, Layer, Measure, Stamp) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class CopyTool {
        constructor() {
            this.repeat = false;
            this.sx = 0;
            this.sy = 0;
            this.tx = 0;
            this.ty = 0;
        }
        name() { return 'Copy'; }
        icon() { }
        ondown(x, y) {
            this.sx = x;
            this.sy = y;
            this.tx = x;
            this.ty = y;
            this.elt = Draw.draw(Layer.copypaste, 'rect', {
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
            const sx = Measure.rhalfcell(Math.min(this.sx, this.tx));
            const sy = Measure.rhalfcell(Math.min(this.sy, this.ty));
            const tx = Measure.rhalfcell(Math.max(this.sx, this.tx));
            const ty = Measure.rhalfcell(Math.max(this.sy, this.ty));
            if (this.elt !== undefined) {
                this.elt.setAttribute('x', sx.toString());
                this.elt.setAttribute('y', sy.toString());
                this.elt.setAttribute('width', (tx - sx).toString());
                this.elt.setAttribute('height', (ty - sy).toString());
            }
        }
        onup() {
            if (this.elt !== undefined)
                Layer.copypaste.removeChild(this.elt);
            const sx = Measure.halfcell(Math.min(this.sx, this.tx));
            const sy = Measure.halfcell(Math.min(this.sy, this.ty));
            const tx = Measure.halfcell(Math.max(this.sx, this.tx));
            const ty = Measure.halfcell(Math.max(this.sy, this.ty));
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
define("tools/paste", ["require", "exports", "data", "stamp", "measure"], function (require, exports, Data, Stamp, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class PasteTool {
        constructor() {
            this.repeat = false;
        }
        name() { return 'Paste'; }
        icon() { }
        ondown(x, y) {
            var _a;
            const xoff = Math.round(x / Measure.CELL) * 2;
            const yoff = Math.round(y / Measure.CELL) * 2;
            const stamp = Stamp.current();
            if (stamp === undefined)
                return;
            for (let i = 0; i < stamp.cells.length; ++i) {
                const cell = stamp.cells[i];
                const [x, y] = Data.decode(cell.n);
                const newn = Data.encode(x - stamp.xoff + xoff, y - stamp.yoff + yoff);
                const pre = (_a = Data.halfcells.get(newn)) === null || _a === void 0 ? void 0 : _a.get(cell.obj);
                if (pre !== cell.data) {
                    Data.add(new Data.Change(newn, cell.obj, pre, cell.data, i !== stamp.cells.length - 1));
                }
            }
        }
        onmove(x, y) { }
        onup() { }
    }
    exports.default = PasteTool;
});
define("toolbox", ["require", "exports", "tools/line", "tools/pan", "tools/surface", "tools/zoom", "tools/undo", "tools/copy", "tools/paste"], function (require, exports, line_1, pan_1, surface_1, zoom_1, undo_1, copy_1, paste_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Toolbox {
        constructor(container) {
            this.container = container;
            this.mouseTools = new Map();
            this.keyTools = new Map();
            this.wheelTools = new Map();
            this.bindMouse(1, new pan_1.default());
            this.bindKey(' ', new pan_1.default());
            this.bindKey('s', new surface_1.default(0));
            this.bindKey('d', new line_1.default(1));
            this.bindKey('z', new undo_1.default(true));
            this.bindKey('x', new undo_1.default(false));
            this.bindKey('c', new copy_1.default());
            this.bindKey('v', new paste_1.default());
            this.bindWheel(true, new zoom_1.default(1));
            this.bindWheel(false, new zoom_1.default(-1));
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
    }
    exports.default = Toolbox;
});
define("event", ["require", "exports", "view"], function (require, exports, View) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.initialize = exports.onmove = void 0;
    exports.onmove = [];
    function initialize(svg, page, toolbox, menu) {
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
                t.onmove(lastX, lastY);
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
            t.ondown(lastX, lastY);
            activeTools.add(t);
        });
        svg.addEventListener('pointerup', e => {
            if (menu.isOpen())
                return;
            const t = toolbox.mouseTools.get(e.button);
            if (t === undefined)
                return;
            t.onup();
            activeTools.delete(t);
        });
        svg.addEventListener('pointerleave', e => {
            for (const t of activeTools)
                t.onup();
            activeTools.clear();
        });
        page.addEventListener('keydown', e => {
            if (menu.isOpen()) {
                if (e.key === 'Escape')
                    menu.close();
                return;
            }
            const t = toolbox.keyTools.get(e.key);
            if (t === undefined)
                return;
            if (e.repeat && !t.repeat)
                return;
            t.ondown(lastX, lastY);
            activeTools.add(t);
        });
        page.addEventListener('keyup', e => {
            if (menu.isOpen())
                return;
            const t = toolbox.keyTools.get(e.key);
            if (t === undefined)
                return;
            t.onup();
            activeTools.delete(t);
        });
        page.addEventListener('wheel', e => {
            if (menu.isOpen())
                return;
            const t = toolbox.wheelTools.get(e.deltaY < 0);
            if (t === undefined)
                return;
            t.ondown(lastX, lastY);
            t.onup();
        });
    }
    exports.initialize = initialize;
});
define("stamp", ["require", "exports", "data", "event", "layer", "measure"], function (require, exports, Data, Event, Layer, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.initialize = exports.deselect = exports.current = exports.add = exports.stamps = void 0;
    class Stamp {
        constructor(cells, xoff, yoff) {
            this.cells = cells;
            this.xoff = xoff;
            this.yoff = yoff;
        }
    }
    exports.stamps = new Array();
    let stamppos = 0;
    function add(cells) {
        if (cells.length === 0)
            return;
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
        const stamp = new Stamp(cells, xoff, yoff);
        exports.stamps.push(stamp);
        stamppos = exports.stamps.length - 1;
        Layer.stamps.replaceChildren(...cells.map(cell => {
            const [x, y] = Data.decode(cell.n);
            return Data.drawfns[cell.obj](x - xoff, y - yoff, cell.data);
        }));
    }
    exports.add = add;
    function current() {
        return stamppos >= 0 && stamppos < exports.stamps.length ? exports.stamps[stamppos] : undefined;
    }
    exports.current = current;
    function deselect() {
        stamppos = exports.stamps.length;
        Layer.stamps.replaceChildren();
    }
    exports.deselect = deselect;
    function initialize() {
        Event.onmove.push((x, y) => {
            // if (stamppos === -1) return;
            Layer.stamps.setAttribute('transform', `translate(${Measure.round(x, Measure.CELL)} ${Measure.round(y, Measure.CELL)})`);
        });
    }
    exports.initialize = initialize;
});
define("menu", ["require", "exports", "stamp", "data", "tools/line", "tools/pan", "tools/surface", "tools/zoom", "tools/undo", "tools/copy", "tools/paste"], function (require, exports, Stamp, Data, line_2, pan_2, surface_2, zoom_2, undo_2, copy_2, paste_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const menuactions = new Map([
    // ['stamp', () => {
    //     console.log(Stamp.stamps[Stamp.stamppos].cells);
    //     console.log(Data.deserialize(Data.serialize(Stamp.stamps[Stamp.stamppos].cells)));
    // }]
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
        resolve = tool => manager.toolbox.bindMouse(e.button, tool);
    });
    menuevents.set('addtool-bindkey', (manager, menu, e, target) => {
        e.preventDefault();
        target.value = 'key [' + e.key + ']';
        resolve = tool => manager.toolbox.bindKey(e.key, tool);
    });
    menuevents.set('addtool-bindwheel', (manager, menu, e, target) => {
        target.value = 'scr ' + (e.deltaY < 0 ? 'up' : 'dn');
        resolve = tool => manager.toolbox.bindWheel(e.deltaY < 0, tool);
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
            MenuManager.alert('please pick a binding for this tool');
            return;
        }
        const el = document.getElementsByClassName('addtool-active')[0];
        if (el === undefined) {
            MenuManager.alert('please pick an action for this tool');
            return;
        }
        const args = Array.from(el.getElementsByTagName('input')).map(x => x.value);
        switch (el.dataset.tool) {
            case 'surface':
                resolve(new surface_2.default(parseInt(args[0], 10)));
                break;
            case 'line':
                resolve(new line_2.default(parseInt(args[0], 10)));
                break;
            case 'pan':
                resolve(new pan_2.default());
                break;
            case 'zoomin':
                resolve(new zoom_2.default(1));
                break;
            case 'zoomout':
                resolve(new zoom_2.default(-1));
                break;
            case 'copy':
                resolve(new copy_2.default());
                break;
            case 'paste':
                resolve(new paste_2.default());
                break;
            case 'undo':
                resolve(new undo_2.default(true));
                break;
            case 'redo':
                resolve(new undo_2.default(false));
                break;
            default:
                MenuManager.alert('unknown tool??');
                return;
        }
        menu.close();
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
        menu.close();
    });
    menuevents.set('stamp-key', (manager, menu, e) => {
        if (e.key === 'Enter')
            manager.menuevent(menu, 'go');
    });
    class Menu {
        constructor(manager, name, popup, inputs) {
            this.manager = manager;
            this.name = name;
            this.popup = popup;
            this.inputs = inputs;
        }
        open() {
            if (this.manager.isOpen())
                return;
            this.manager.activeMenu = this;
            this.popup.style.display = 'flex';
            this.manager.menuevent(this, 'open');
        }
        close() {
            this.manager.activeMenu = undefined;
            this.popup.style.display = 'none';
            this.manager.menuevent(this, 'close');
        }
    }
    class MenuManager {
        isOpen() { return this.activeMenu !== undefined; }
        close() { if (this.activeMenu !== undefined)
            this.activeMenu.close(); }
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
        constructor(btns, popups, toolbox) {
            this.toolbox = toolbox;
            // this should morally be private; only Menu accesses it directly
            this.activeMenu = undefined;
            this.menus = new Map();
            for (const btn of btns) {
                btn.addEventListener('click', () => {
                    const menu = this.menus.get(btn.dataset.menu);
                    if (menu !== undefined)
                        menu.open();
                    else {
                        const fn = menuactions.get(btn.dataset.menu);
                        if (fn !== undefined)
                            fn();
                    }
                });
            }
            for (const popup of popups) {
                const menu = new Menu(this, popup.dataset.menu, popup, new Map(Array.from(popup.getElementsByClassName('menuinput')).map(ipt => {
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
                    menu.close();
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
define("data", ["require", "exports", "draw", "layer", "measure", "menu", "bitstream"], function (require, exports, Draw, Layer, Measure, menu_1, bitstream_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.undo = exports.add = exports.halfcells = exports.deserialize = exports.serialize = exports.drawfns = exports.Change = exports.Item = exports.decode = exports.encode = void 0;
    function encode(x, y) {
        return (x << 16) | (y & 0xffff);
    }
    exports.encode = encode;
    function decode(n) {
        return [n >> 16, n << 16 >> 16];
    }
    exports.decode = decode;
    class Item {
        constructor(n, obj, data) {
            this.n = n;
            this.obj = obj;
            this.data = data;
        }
    }
    exports.Item = Item;
    class Change {
        constructor(n, obj, pre, post, linked = false) {
            this.n = n;
            this.obj = obj;
            this.pre = pre;
            this.post = post;
            this.linked = linked;
        }
    }
    exports.Change = Change;
    const colors = [
        '#000000',
        '#008000'
    ];
    exports.drawfns = {
        [0 /* Obj.SURFACE */]: (x, y, data) => {
            return Draw.draw(undefined, 'rect', {
                width: Measure.CELL,
                height: Measure.CELL,
                x: Measure.HALFCELL * x,
                y: Measure.HALFCELL * y,
                fill: colors[data]
            });
        },
        [1 /* Obj.LINE */]: (x, y, data) => {
            const horiz = Measure.hctype(x, y) === 1 /* Measure.HC.EVERT */ ? 1 : 0;
            return Draw.draw(undefined, 'line', {
                x1: (x - horiz) * Measure.HALFCELL,
                x2: (x + horiz) * Measure.HALFCELL,
                y1: (y - (1 - horiz)) * Measure.HALFCELL,
                y2: (y + (1 - horiz)) * Measure.HALFCELL,
                stroke: colors[data],
                strokeWidth: Measure.LINE,
                strokeLinecap: 'round'
            });
        }
    };
    const N_BITS = 32;
    const OBJ_BITS = 6;
    const COLOR_BITS = 6;
    const serializefns = {
        [0 /* Obj.SURFACE */]: (bs, data) => {
            bs.write(COLOR_BITS, data);
        },
        [1 /* Obj.LINE */]: (bs, data) => {
            bs.write(COLOR_BITS, data);
        }
    };
    const deserializefns = {
        [0 /* Obj.SURFACE */]: (bs) => {
            return bs.read(COLOR_BITS);
        },
        [1 /* Obj.LINE */]: (bs) => {
            return bs.read(COLOR_BITS);
        }
    };
    function serialize(stamp) {
        const bs = bitstream_1.default.empty();
        bs.write(1, 0);
        for (const item of stamp) {
            bs.write(N_BITS, item.n);
            bs.write(OBJ_BITS, item.obj);
            serializefns[item.obj](bs, item.data);
        }
        return bs.cut();
    }
    exports.serialize = serialize;
    function deserialize(arr) {
        const stamp = new Array();
        const bs = bitstream_1.default.fromArr(arr);
        const version = bs.read(1);
        if (version !== 0) {
            menu_1.default.alert('deserialize: invalid version number');
            return [];
        }
        while (1) {
            const n = bs.read(N_BITS);
            if (!bs.inbounds())
                break;
            const obj = bs.read(OBJ_BITS);
            stamp.push(new Item(n, obj, deserializefns[obj](bs)));
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
                const elt = (_a = drawn.get(change.n)) === null || _a === void 0 ? void 0 : _a.get(change.obj);
                if (elt !== undefined)
                    Layer.obj(change.obj).removeChild(elt);
                // delete item
                const hc = exports.halfcells.get(change.n);
                hc === null || hc === void 0 ? void 0 : hc.delete(change.obj);
                if ((hc === null || hc === void 0 ? void 0 : hc.size) === 0)
                    exports.halfcells.delete(change.n);
            }
            if (post !== undefined) {
                // create item
                if (!exports.halfcells.has(change.n))
                    exports.halfcells.set(change.n, new Map());
                exports.halfcells.get(change.n).set(change.obj, post);
                // draw it
                const [x, y] = decode(change.n);
                const elt = exports.drawfns[change.obj](x, y, post);
                Layer.obj(change.obj).appendChild(elt);
                // save the element
                if (!drawn.has(change.n))
                    drawn.set(change.n, new Map());
                (_b = drawn.get(change.n)) === null || _b === void 0 ? void 0 : _b.set(change.obj, elt);
            }
        } while ((_c = history[histpos - 1]) === null || _c === void 0 ? void 0 : _c.linked);
    }
    exports.undo = undo;
});
define("grid", ["require", "exports", "draw", "layer", "measure"], function (require, exports, Draw, Layer, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.initialize = void 0;
    function initialize() {
        for (let i = 0; i < Measure.GRIDSIZE; ++i) {
            Draw.draw(Layer.grid, 'line', {
                x1: 0, x2: Measure.GRIDSIZE * Measure.CELL, y1: i * Measure.CELL, y2: i * Measure.CELL
            });
            Draw.draw(Layer.grid, 'line', {
                x1: i * Measure.CELL, x2: i * Measure.CELL, y1: 0, y2: Measure.GRIDSIZE * Measure.CELL
            });
        }
    }
    exports.initialize = initialize;
});
define("main", ["require", "exports", "layer", "event", "grid", "view", "stamp", "menu", "toolbox"], function (require, exports, Layer, Event, Grid, View, Stamp, menu_2, toolbox_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // TODO make this better i guess
    const svg = document.getElementById('grid');
    const toolbox = new toolbox_1.default(document.getElementById('toolbox'));
    const menu = new menu_2.default(Array.from(document.getElementsByClassName('menuaction')), Array.from(document.getElementById('menupopups').children), toolbox);
    Layer.initialize(svg);
    Event.initialize(svg, document.body, toolbox, menu);
    View.initialize(svg);
    Grid.initialize();
    Stamp.initialize();
    // TODO this stuff should really go somewhere else
    for (const multisel of Array.from(document.getElementsByClassName('multisel'))) {
        const children = Array.from(multisel.children);
        for (const child of children) {
            child.addEventListener('click', () => {
                for (const ch of children)
                    ch.classList.remove('active');
                child.classList.add('active');
                multisel.dataset.multisel = child.dataset.multisel;
            });
        }
    }
});
