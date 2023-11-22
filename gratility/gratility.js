define("draw", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.draw = void 0;
    const svgNS = 'http://www.w3.org/2000/svg';
    function draw(parent, tagname, attrs = {}) {
        const elt = document.createElementNS(svgNS, tagname);
        for (let [k, v] of Object.entries(attrs)) {
            elt.setAttribute(k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()), v);
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
    exports.hctype = exports.halfcell = exports.cell = exports.round = exports.CELL = exports.LINE = exports.ZOOMTICK = exports.HALFCELL = exports.GRIDLINE = exports.GRIDCOLOR = void 0;
    exports.GRIDCOLOR = '#aaa';
    exports.GRIDLINE = 1;
    exports.HALFCELL = 20;
    exports.ZOOMTICK = 1.1;
    exports.LINE = 5;
    exports.CELL = 2 * exports.HALFCELL;
    function round(x, r) { return Math.round(x / r) * r; }
    exports.round = round;
    function cell(x) { return Math.floor(x / exports.CELL); }
    exports.cell = cell;
    function halfcell(x) { return Math.floor(x / exports.HALFCELL); }
    exports.halfcell = halfcell;
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
define("data", ["require", "exports", "draw", "layer", "measure"], function (require, exports, Draw, Layer, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.undo = exports.add = exports.halfcells = exports.drawfns = exports.Change = exports.Item = exports.decode = exports.encode = void 0;
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
    exports.drawfns = {
        [0 /* Obj.SURFACE */]: (x, y, data) => {
            return Draw.draw(undefined, 'rect', {
                width: Measure.CELL,
                height: Measure.CELL,
                x: Measure.HALFCELL * x,
                y: Measure.HALFCELL * y,
                fill: 'red'
            });
        },
        [1 /* Obj.LINE */]: (x, y, data) => {
            const horiz = Measure.hctype(x, y) === 1 /* Measure.HC.EVERT */ ? 1 : 0;
            return Draw.draw(undefined, 'line', {
                x1: (x - horiz) * Measure.HALFCELL,
                x2: (x + horiz) * Measure.HALFCELL,
                y1: (y - (1 - horiz)) * Measure.HALFCELL,
                y2: (y + (1 - horiz)) * Measure.HALFCELL,
                stroke: 'green',
                strokeWidth: Measure.LINE,
                strokeLinecap: 'round'
            });
        }
    };
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
define("tools/tool", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
define("tools/line", ["require", "exports", "data", "measure"], function (require, exports, Data, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class LineTool {
        constructor() {
            this.name = 'Line';
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
                    Data.add(new Data.Change(n, 1 /* Data.Obj.LINE */, line, 0));
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
            this.name = 'Pan';
            this.repeat = false;
            this.mx = 0;
            this.my = 0;
        }
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
define("tools/surface", ["require", "exports", "data", "measure"], function (require, exports, Data, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SurfaceTool {
        constructor() {
            this.name = 'Surface';
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
                Data.add(new Data.Change(n, 0 /* Data.Obj.SURFACE */, surface, 0));
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
                    Data.add(new Data.Change(n, 0 /* Data.Obj.SURFACE */, surface, 0));
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
        constructor(amount) {
            this.amount = amount;
            this.name = 'Zoom';
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
        constructor() {
            this.name = 'Undo';
            this.repeat = true;
        }
        ondown() { Data.undo(true); }
        onmove() { }
        onup() { }
    }
    exports.default = UndoTool;
});
define("tools/redo", ["require", "exports", "data"], function (require, exports, Data) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class RedoTool {
        constructor() {
            this.name = 'Redo';
            this.repeat = true;
        }
        ondown() { Data.undo(false); }
        onmove() { }
        onup() { }
    }
    exports.default = RedoTool;
});
define("stamp", ["require", "exports", "data", "event", "layer", "measure"], function (require, exports, Data, Event, Layer, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.initialize = exports.add = exports.stamppos = exports.stamps = void 0;
    class Stamp {
        constructor(cells, xoff, yoff) {
            this.cells = cells;
            this.xoff = xoff;
            this.yoff = yoff;
        }
    }
    exports.stamps = new Array();
    exports.stamppos = -1;
    function add(cells, xmin, xmax, ymin, ymax) {
        const xoff = Measure.round((xmin + xmax) / 2, 2);
        const yoff = Measure.round((ymin + ymax) / 2, 2);
        const stamp = new Stamp(cells, xoff, yoff);
        exports.stamps.push(stamp);
        exports.stamppos = exports.stamps.length - 1;
        Layer.stamps.replaceChildren(...cells.map(cell => {
            const [x, y] = Data.decode(cell.n);
            return Data.drawfns[cell.obj](x - xoff, y - yoff, cell.data);
        }));
    }
    exports.add = add;
    function initialize() {
        Event.onmove.push((x, y) => {
            if (exports.stamppos === -1)
                return;
            Layer.stamps.setAttribute('transform', `translate(${Measure.round(x, Measure.CELL)} ${Measure.round(y, Measure.CELL)})`);
        });
    }
    exports.initialize = initialize;
});
define("tools/copy", ["require", "exports", "data", "draw", "layer", "measure", "stamp"], function (require, exports, Data, Draw, Layer, Measure, Stamp) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class CopyTool {
        constructor() {
            this.name = 'Copy';
            this.repeat = false;
            this.sx = 0;
            this.sy = 0;
            this.tx = 0;
            this.ty = 0;
        }
        ondown(x, y) {
            this.sx = x;
            this.sy = y;
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
            if (this.elt !== undefined) {
                this.elt.setAttribute('x', Math.min(this.sx, this.tx).toString());
                this.elt.setAttribute('y', Math.min(this.sy, this.ty).toString());
                this.elt.setAttribute('width', Math.abs(this.sx - this.tx).toString());
                this.elt.setAttribute('height', Math.abs(this.sy - this.ty).toString());
            }
        }
        onup() {
            if (this.elt !== undefined)
                Layer.copypaste.removeChild(this.elt);
            const sx = Measure.halfcell(Math.min(this.sx, this.tx));
            const sy = Measure.halfcell(Math.min(this.sy, this.ty));
            const tx = Measure.halfcell(Math.max(this.sx, this.tx));
            const ty = Measure.halfcell(Math.max(this.sy, this.ty));
            const xoff = Math.round(sx / 2) * 2;
            const yoff = Math.round(sy / 2) * 2;
            const stamp = new Array();
            let xmin = tx + 1, xmax = sx - 1, ymin = ty + 1, ymax = sy - 1;
            for (let x = sx; x <= tx; ++x) {
                for (let y = sy; y <= ty; ++y) {
                    const n = Data.encode(x, y);
                    const hc = Data.halfcells.get(n);
                    if (hc !== undefined) {
                        stamp.push(...Array.from(hc.entries()).map(([k, v]) => {
                            return new Data.Item(n, k, v);
                        }));
                        if (x < xmin)
                            xmin = x;
                        if (x > xmax)
                            xmax = x;
                        if (y < ymin)
                            ymin = y;
                        if (y > ymax)
                            ymax = y;
                    }
                }
            }
            Stamp.add(stamp, xmin, xmax, ymin, ymax);
        }
    }
    exports.default = CopyTool;
});
define("tools/paste", ["require", "exports", "data", "stamp", "measure"], function (require, exports, Data, Stamp, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class PasteTool {
        constructor() {
            this.name = 'Paste';
            this.repeat = false;
        }
        ondown(x, y) {
            var _a;
            const xoff = Math.round(x / Measure.CELL) * 2;
            const yoff = Math.round(y / Measure.CELL) * 2;
            const stamp = Stamp.stamps[Stamp.stamppos];
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
define("toolbox", ["require", "exports", "tools/line", "tools/pan", "tools/surface", "tools/zoom", "tools/undo", "tools/redo", "tools/copy", "tools/paste"], function (require, exports, line_1, pan_1, surface_1, zoom_1, undo_1, redo_1, copy_1, paste_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.bindWheel = exports.bindKey = exports.bindMouse = exports.wheelTools = exports.keyTools = exports.mouseTools = void 0;
    exports.mouseTools = new Map();
    exports.keyTools = new Map();
    exports.wheelTools = new Map();
    function toolDisplay(tool, txt, delcb) {
        const disp = document.createElement('div');
        disp.textContent = txt + ' -- ' + tool.name;
        const delbtn = document.createElement('button');
        delbtn.textContent = 'x';
        delbtn.addEventListener('click', () => {
            delcb();
            document.getElementById('toolbox').removeChild(disp);
        });
        disp.appendChild(delbtn);
        document.getElementById('toolbox').appendChild(disp); // TODO
    }
    function bindMouse(btn, tool) {
        if (exports.mouseTools.has(btn))
            return false;
        exports.mouseTools.set(btn, tool);
        toolDisplay(tool, `mouse ${btn}`, () => {
            exports.mouseTools.delete(btn);
        });
        return true;
    }
    exports.bindMouse = bindMouse;
    function bindKey(key, tool) {
        if (exports.keyTools.has(key))
            return false;
        exports.keyTools.set(key, tool);
        toolDisplay(tool, `key [${key}]`, () => {
            exports.keyTools.delete(key);
        });
        return true;
    }
    exports.bindKey = bindKey;
    function bindWheel(dir, tool) {
        if (exports.wheelTools.has(dir))
            return false;
        exports.wheelTools.set(dir, tool);
        toolDisplay(tool, `wheel ${dir ? 'up' : 'dn'}`, () => {
            exports.wheelTools.delete(dir);
        });
        return true;
    }
    exports.bindWheel = bindWheel;
    bindMouse(1, new pan_1.default());
    bindKey(' ', new pan_1.default());
    bindKey('s', new surface_1.default());
    bindKey('d', new line_1.default());
    bindKey('z', new undo_1.default());
    bindKey('x', new redo_1.default());
    bindKey('c', new copy_1.default());
    bindKey('v', new paste_1.default());
    bindWheel(true, new zoom_1.default(1));
    bindWheel(false, new zoom_1.default(-1));
});
define("event", ["require", "exports", "toolbox", "view"], function (require, exports, Toolbox, View) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.initialize = exports.onmove = void 0;
    exports.onmove = [];
    function initialize(svg) {
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
            upd(e);
            for (const t of activeTools)
                t.onmove(lastX, lastY);
            for (const f of exports.onmove)
                f(lastX, lastY);
        });
        svg.addEventListener('pointerdown', e => {
            upd(e);
            const t = Toolbox.mouseTools.get(e.button);
            if (t === undefined)
                return;
            t.ondown(lastX, lastY);
            activeTools.add(t);
        });
        svg.addEventListener('pointerup', e => {
            const t = Toolbox.mouseTools.get(e.button);
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
        document.body.addEventListener('keydown', e => {
            const t = Toolbox.keyTools.get(e.key);
            if (t === undefined)
                return;
            if (e.repeat && !t.repeat)
                return;
            t.ondown(lastX, lastY);
            activeTools.add(t);
        });
        document.body.addEventListener('keyup', e => {
            const t = Toolbox.keyTools.get(e.key);
            if (t === undefined)
                return;
            t.onup();
            activeTools.delete(t);
        });
        document.body.addEventListener('wheel', e => {
            const t = Toolbox.wheelTools.get(e.deltaY < 0);
            if (t === undefined)
                return;
            t.ondown(lastX, lastY);
            t.onup();
        });
    }
    exports.initialize = initialize;
});
define("grid", ["require", "exports", "draw", "layer", "measure"], function (require, exports, Draw, Layer, Measure) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.initialize = void 0;
    function initialize() {
        const gridSize = 100; // TODO tmp
        for (let i = 0; i < gridSize; ++i) {
            Draw.draw(Layer.grid, 'line', {
                x1: 0, x2: gridSize * Measure.CELL, y1: i * Measure.CELL, y2: i * Measure.CELL
            });
            Draw.draw(Layer.grid, 'line', {
                x1: i * Measure.CELL, x2: i * Measure.CELL, y1: 0, y2: gridSize * Measure.CELL
            });
        }
    }
    exports.initialize = initialize;
});
define("main", ["require", "exports", "layer", "event", "grid", "view", "stamp"], function (require, exports, Layer, Event, Grid, View, Stamp) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const svg = document.getElementById('grid');
    Layer.initialize(svg);
    Event.initialize(svg);
    View.initialize(svg);
    Grid.initialize();
    Stamp.initialize();
});
