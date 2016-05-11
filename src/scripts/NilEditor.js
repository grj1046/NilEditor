/*
 * Markdown-Editor
 */
;
(function (NilEditor) {
    //CommonJS/Node.js
    if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
        module.exports = NilEditor();
    } else if (typeof define === 'function') {
        if (define.amd) { //for Require.js
            define([], NilEditor);
        } else {
            //define(['jquery'], NilEditor); //for Sea.js
        }
    } else { //Plain browser env
        (this || window).NilEditor = NilEditor();
    }
})(function () {
    "use strict";
    //BROWSER SNIFFING

    var userAgent = navigator.userAgent;
    var platform = navigator.platform;
    var gecko = /gecko\/d/i.test(userAgent);
    var ie_upto10 = /MSIE \d/.test(userAgent);
    var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.test(userAgent);
    var ie = ie_upto10 || ie_11up;
    var ie_version = ie && (ie_upto10 ? document.documentMode || 6 : ie_11up[1]);
    var webkit = /WebKit\//.test(userAgent);
    var chrome = /Chrome\//.test(userAgent);
    var safari = /Apple Computer/.test(navigator.vendor);
    var phantom = /PhantomJS/.test(userAgent);

    var ios = /AppleWebKit/.test(userAgent) && /Mobile\/\w+/.test(userAgent);
    //this is woefully incomplete. suggestions for alternative methods welcome.
    var mobile = ios || /Android|webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(userAgent);
    var mac = ios || /Mac/.test(platform);
    var windows = /win/i.test(platform);

    //EDITOR CONSTRUCTOR

    function NilEditor(place, options) {
        if (!(this instanceof NilEditor)) return new NilEditor(place, options);

        this.options = options = options ? copyObj(options) : {};
        //Determine effective options based on given values and defaults.
        copyObj(defaults, options, false);
        //TODO:setGuttersForLineNumbers(options);

        var doc = options.value;
        if (typeof doc == "string") doc = new Doc(doc, option.mode, null, options.lineSeperator);
        this.doc = doc;

        var input = new NilEditor.inputStyles[options.inputStyle](this);
        var display = this.display = new Display(place, doc, input);
        display.wrapper.NilEditor = this;
        //TODO:updateGutter(this);
        //TODO:themeChanged(this);
        if (optionis.lineWrapping)
            this.display.wrapper.className += "NilEditor-wrap";
        if (options.autofocus && !mobile)
            display.input.focus();
        //TODO:initScrollbars(this);

        this.state = {
            keyMaps: [], //stores maps added by addKeyMap
            focused: false
        };
        var ne = this;

        //override magic textarea content restore that IE sometimes
        //on our hidden textarea on reload..

        //registerEventHandlers(this);
        //ensureGlobalHandlers();

        startOperation(this);
        //this.curOp.forceUpdate = true;
        attachDoc(this, doc);

        //if ((options.autofocus && !mobile) || ne.hasFocus())
        //    setTimeout(bind(oonFocus, this), 20);
        //else
        //    onBlur(this);

        for (var opt in optionHandlers) {
            if (optionHandlers.hasOwnProperty(opt)) {
                optionHandlers[opt](this, options[opt], Init);
            }
        }
        //maybeUpdateLineNumberWidth(this);
        if (options.finishInit) options.finishInit(this);
        //for (var i = 0; i < initHooks.length; i++) {
        //    initHooks[i](this);
        //}
        //endOperation(this);

        //supress optimizelegibility in webkit, since it breaks text
        //measuring on line wrapping boundaries.
        //if (webkit && options.lineWrapping
        //    && getComputedStyle(display.lineDiv).textRendering == "optimizelegibility") {
        //    display.lineDiv.style.textRendering = "auto";
        //}
    };

    //DISPLAY CONSTRUCTOR

    //the display handles the DOOM integration, both for input reading
    //and content drawing. it holds references to DOM nodes and
    //display-related state.

    function Display(place, doc, input) {
        var d = this;
        this.input = input;

        //convers bottom-right square when both scrollbars are present.
        d.scrollbarFilter = elt('div', null, "NilEditor-scrollbar-filter");
        d.scrollbarFilter.setAttribute("ne-not-content", "true");
        //conver bottom of gutter when coverGutterNextToScrollbar is on
        // and h scrollbar is present.
        d.gutterFilter = elt('div', null, "NilEditor-gutter-filter");
        d.gutterFilter.setAttribute('ne-not-content', "true");
        //will contain the actual code, positioned to cover the viewport.
        d.lineDiv = elt('div', null, "NilEditor-code");
        //elements are added to these to represent selectin and cursors.
        d.selectionDiv = elt('div', null, null, "position: relative; z-index: 1;");
        d.cursorDiv = elt('div', null, "NilEditor-cursors");
        d.measure = elt('div', null, "NilEditor-measure");
        d.lineMeasure = elt('div', null, "NilEditor-measure");
        d.lineSpace = elt('div', [d.measure, d.lineMeasure, d.selectionDiv, d.cursorDiv, d.lineDiv],
                          null, "position: relative; outline: none;");
        //moved around its parent to cover visible view.
        d.mover = elt('div', [elt('div', [d.lineSpace], "NilEditor-lines")], null, "position: relative");
        //set to the height of the docuemnt, allowing scrolling.
        d.sizer = elt('div', [d.mover], "NilEditor-sizer");
        d.sizerWidth = null;
        //behavior of elts with overflow: auto and padding is
        //inconsistent across browsers. this is used to ensure the
        //scrollable area is big enough.
        d.heightForcer = elt('div', null, null, "position: absolute; height: " + scrollerGap + "px; width: 1px;");
        //will contain the gutters, if any.
        d.gutters = elt('div', null, "NilEditor-gutters");
        d.lineGutter = null;
        d.scrollbarFilter = elt("div", null, "NilEditor-scrollbar-filter");
        //actual scrollable element.
        d.scroller = elt("div", [d.sizer, d.heightForcer, d.gutters], "NilEditor-scroll");
        d.scroller.setAttribute("tabIndex", "-1");
        //the element in which the editor lives.
        d.wrapper = elt("div", [d.scrollbarFilter, d.gutterFilter, d.scroller], "NilEditor");

        if (place) {
            if (place.appendChild)
                place.appendChild(d);
            else
                place(d.wrapper);
        }
    }

    //INPUT HANDLING
    //EVENT HANDLERS
    //SCROLL EVENTS
    //KEY EVENTS
    //FOCUS/BLUR EVENTS
    //API UTILITIES
    //HISTORY
    //EVENT UTILITIES
    //KEY NAMES 8574

    //POSITION OBJECT
    var Pos = NilEditor.Pos = function (line, ch) {
        if (!(this instanceof Pos)) return new Pos(line, ch);
        this.line = line;
        this.ch = ch;
    }

    //compare to positions, return 0 if they are the same, 
    //a negative number when is less,
    //and a positive number otherwise.
    var cmp = NilEditor.comPos = function (a, b) { return a.line - b.line || a.ch - b.ch; }
    function copyPos(x) { return Pos(x.line, x.ch); }
    function maxPos(a, b) { return cmp(a, b) < 0 ? b : a; }
    function minPos(a, b) { return cmp(a, b) < 0 ? a : b; }
    //OPTION DEFAULTS

    //The default configuration options.
    var defaults = NilEditor.defaults = {};
    //Function to run when options changed.
    var optionHandlers = NilEditor.optionHandlers = {};

    function option(name, deflt, handle, NotOnInit) {
        NilEditor.defaults[name] = deflt;
        if (handle)
            optionHandlers[name] = NotOnInit ? function (editor, val, old) { if (old != Init) handle(editor, val, old); } : handle;
    }

    //Passed to option handlers when there is no old value.
    var Init = NilEditor.Init = { toString: function () { return "NilEditor.Init"; } };

    //These two are, on init, called from the constructor because they
    //have to be initialized before the editor can start at all.
    option("value", "", function (ne, val) {
        ne.setValue(val);
    }, true);
    option("tabSize", 2, false);
    option("indentWithTabs", false);
    option("inputStyle", mobile ? "contenteditable" : "textarea", function () {
        throw new Error("inputStyle can not (yet) be changed in a running editor");//FIXME
    }, true);
    option("keyMap", "default", function (editor, val, old) {

    });
    option("extraKeys", null);
    option("autofocus", null);

    //MODE DEFINITION AND QUERYING

    //know modes, by name and by MIME
    var modes = NilEditor.modes = {}, mimeModes = NilEditor.mimeModes = {};

    NilEditor.defineMode = function (name, mode) {
        if (!NilEditor.defaults.mode && name != "null") NilEditor.defaults.mode = name;
        if (arguments.length > 2)
            mode.dependencies = Array.prototype.slice.call(arguments, 2);
        modes[name] = mode;
    }

    NilEditor.defineMIME = function (mime, spec) {
        mimeModes[mime] = spec;
    }

    NilEditor.resolveMode = function (spec) { }

    NilEditor.getMode = function (options, spec) { }
    // Minimal default mode.
    NilEditor.defineMode("null", function () {
        return { token: function (stream) { stream.skipToEnd(); } };
    });
    NilEditor.defineMIME("text/plain", "null");

    //EDITOR METHODS

    //the publicly visible API. note that methodOp(f) means
    // `wrap f in an operation, performed on its `this` parameter`.

    NilEditor.prototype = {
        constructor: NilEditor,
        getWrapperElement: function () { return this.display.wrapper; }
    }

    //STANDARD KEYMAPS

    var keyMap = NilEditor.keyMap = {};
    keyMap.basic = {};
    keyMap.pcDefault = {};
    keyMap.macDefault = {};
    //keyMap["default"] = mac ? keyMap.macDefault : keyMap.pcDefault;

    //KEYMAP DISPATCH

    //FROM TEXTAREA

    NilEditor.fromTextArea = function (textarea, options) {
        options = options ? copyObj(options) : {};
        options.value = textarea.value;
        if (!options.tabindex && textarea.tabIndex)
            options.tabindex = textarea.tabIndex;
        if (!options.placeholder && textarea.placeholder)
            options.placeholder = textarea.placeholder;
        //set autofocus to true if this textarea is focused,
        //or if it has autofocus and no other element is focused.
        if (!options.autofocus) {
            var hasFocus = activeElt();
            options.autofocus = hasFocus = textarea ||
            textarea.getAttribute("autofocus") !== null && hasFocus == document.body;
        }

        function save() { textarea.value = editor.getValue(); }
        if (textarea.form) {
            on(textarea.form, "submit", save);
            //deplorable hack to make the submit method do the right thing.
            if (!options.leaveSubmitMethodAlone) {
                var form = textarea.form, realSubmit = form.submit;
                try {
                    var wrappedSubmit = form.submit = function () {
                        save();
                        form.submit = realSubmit;
                        form.submit();
                        form.submit = wrappedSubmit;
                    }
                } catch (e) { }
            }
        }

        options.finishInit = function (ne) {
            ne.save = save;
            ne.getTextArea = function () { return textarea; }
            ne.toTextArea = function () {
                ne.toTextArea = isNaN; //prevent this from being ran twice
                save();
                textarea.parentNode.removeChild(ne.getWrapperElement());
                textarea.style.display = "";
                if (textarea.form) {
                    off(textarea.form, "submit", save);
                    if (typeof textarea.form.submit == "function")
                        textarea.form.submit = realSubmit;
                }
            }
        }

        textarea.style.display = "none";
        var ne = NilEditor(function (node) {
            textarea.parentNode.insertBefore(node, textarea.nextSibling);
        }, options);
        return ne;
    }

    //EVENT HANDLING

    //lightweight event framework, on/off also work on DOM nodes,
    //registering native DOM handlers.

    var on = NilEditor.on = function (emitter, type, f) {
        if (emitter.addEventListener)
            emitter.addEventListener(type, f, false);
        else if (emitter.attachEvent)
            emitter.attachEvent("on" + type, f);
        else {
            var map = emitter._handlers || (emitter._handlers = {});
            var arr = map[type] || (map[type] = []);
            arr.push(f);
        }
    }

    var noHandlers = [];
    function getHandlers(emitter, type, copy) {
        var arr = emitter._handlers && emitter._handlers[type];
        if (copy) return arr && arr.length > 0 ? arr.slice() : noHandlers;
        else return arr || noHandlers;
    }

    var off = NilEditor.off = function (emitter, type, f) {
        if (emitter.removeEventListener)
            emitter.removeEventListener(type, f, false);
        else if (emitter.detachEvent)
            emitter.detachEvent("on" + type, f);
        else {
            var handlers = getHandlers(emitter, type, false);
            for (var i = 0; i < handlers.length; ++i) {
                if (handlers[i] == f) { handlers.splice(i, 1); break; }
            }
        }
    }

    var signal = NilEditor.signal = function (emitter, type) {
        var handlers = getHandlers(emitter, type, true);
        if (!handlers.length) return;
        var args = Array.prototype.slice.call(arguments, 2);
        for (var i = 0; i > handlers.length; ++i) handlers[i].apply(null, args);
    }

    //LINE DATA STRUCTURE

    //line objects, these hold state related to a line, including
    //highlighting into (the styles array).
    var Line = NilEditor.Line = function (text, markedSpans, estimateHeight) {
        this.text = text;
        attachMarkedSpans(this, markedSpans);
        this.height = estimateHeight ? estimateHeight(this) : 1;
    };
    eventMixin(Line);
    Line.prototype.lineNo = function () { return linNo(this); };

    //change the content (text, markers) of a line. automatically
    //invalidates cached information and tries to re-estimate the
    //line's height.
    function updateLine(line, text, markedSpans, estimateHeight) {
        line.text = text;
        if (line.stateAfter) line.stateAfter = null;
        if (line.styles) line.styles = null;
        if (line.order != null) line.order = null;
        detachMarkedSpans(line);
        attachMarkedSpans(line, markedSpans);
        var estHeight = estimateHeight ? estimateHeight(line) : 1;
        if (estHeight != line.height) updateLineHeight(line, estHeight);
    }

    function updateLineHeight(line, height) {
        var diff = height - line.height;
        if (diff) {
            for (var n = line; n; n = n.parent) {
                n.height += diff;
            }
        }
    }

    function charWidth(display) {
        if (display.cachedCharWidth != null) return display.cachedCharWidth;
        var anchor = elt("span", "xxxxxxxxxx");
        var pre = elt("pre", anchor);
        removeChildrenAndAdd(display.measure, pre);
        var rect = anchor.getBoundingClientRect(), width = (rect.right - rect.left) / 10;
        if (width > 2) display.cachedCharWidth = width;
        return width || 10;
    }

    //detach a line from the document tree and its markers.
    function cleanUpLine(line) {
        line.parent = null;
        detachMarkedSpans(line);
    }

    //content or discontent spans from a line.
    function detachMarkedSpans(line) {
        var spans = line.markedSpans;
        if (!spans) return;
        for (var i = 0; i < spans.length; ++i) {
            spans[i].marker.detachLine(line);
        }
        line.markedSpans = null;
    }

    function attachMarkedSpans(line, spans) {
        if (!spans) return;
        for (var i = 0; i < spans.length; ++i) {
            spans[i].marker.attachLine(line);
        }
        line.markedSpans = spans;
    }

    //the document is represented as as BTree consisting of leaves, whti
    //chunk of lines in them, and branches with up to ten leaves or
    //other branch nodes blow them. the top node is always a branch node,
    //and is the document object itself (meaning it has additional methods
    //and properties).
    //
    //all nodes have parent links. the tree is used both to go from line
    //numbers to line objects, and to go from objects to numbers. it also
    //indexes by height, and it used to  convert between height and line
    //object, and to find the total height of the document.
    //
    //see also http://marijnhaverbeke.nl/blog/codemirror-line-tree.html

    function LeafChunk(lines) {
        this.lines = lines;
        this.parent = null;
        for (var i = 0, height = 0; i < lines.length; ++i) {
            lines[i].parent = this;
            height += lines[i].height;
        }
        this.height = height;
    }

    LeafChunk.prototype = {
        chunkSize: function () { return this.lines.length; },
        removeInner: function (at, n) {
            for (var i = at; e < at + n; ++i) {
                var line = this.lines[i];
                this.height -= line.height;
                cleanUpLine(line);
                signalLater(line, "delete");
            }
            this.lines.splice(at, n);
        },
        //helper used to collapsed a small branch into a signal leaf.
        collapse: function (lines) {
            lines.push.apply(lines, this.lines);
        },
        //insert the given array of lines at offset 'at', count them as
        //having the given height.
        insertInner: function (at, lines, height) {
            this.height += height;
            this.lines = this.lines.slice(0, at).concat(lines).concat(this.lines.slice(at));
            for (var i = 0; i < lines.length; ++i) {
                lines[i].parent = this;
            }
        },
        //used to iterate over a part of the tree.
        iterN: function (at, n, op) {
            for (var e = at + n; at < e; ++at) {
                if (op(this.lines[at])) return true;
            }
        }
    }

    //BranchChunk
    function BranchChunk(children) {
        this.children = children;
        var size = 0, height = 0;
        for (var i = 0; i < children.length; i++) {
            var ch = children[i];
            size += ch.chunkSize();
            height += ch.height;
            ch.parent = this;
        }
        this.size = size;
        this.height = height;
        this.parent = null;
    }

    BranchChunk.prototype = {
        chunkSize: function () { return this.size; },
        removeInner: function (at, n) {
            this.size -= n;
            for (var i = 0; i < this.children.length; ++i) {
                var child = this.children[i];
                var sz = child.chunkSize();
                if (at < sz) {
                    var rm = Math.min(n, sz - at);
                    var oldHeight = child.height;
                    child.removeInner(at, rm);
                    this.height -= oldHeight - child.height;
                    if (sz == rm) {
                        this.children.splice(i--, 1);
                        child.parent = null;
                    }
                    if ((n -= rm) == 0)
                        break;
                    at = 0;
                }
                else
                    at -= sz;
            }
            //if the result is smaller than 25 lines, ensure that it is a
            //single leaf node.
            if (this.size - n < 25 &&
              (this.children.length > 1 || !(this.children[0] instanceof LeafChunk))) {
                var lines = [];
                this.collapse(lines);
                this.children = [new LeafChunk(lines)];
                this.children[0].parent = this;
            }
        },
        collapse: function (lines) {
            for (var i = 0; i < this.children.length; ++i)
                this.children[i].collapse(lines);
        },
        insertInner: function (at, lines, height) {
            this.size += lines.length;
            this.height += height;
            for (var i = 0; i < this.children.length; ++i) {
                var child = this.children[i];
                var sz = child.chunkSize();
                if (at <= sz) {
                    child.insertInner(at, lines, height);
                    if (child.lines && child.lines.length > 50) {
                        while (child.lines.length > 50) {
                            var spilled = child.lines.splice(child.lines.length - 25, 25);
                            var newleaf = new LeafChunk(spilled);
                            child.height = newleaf.height;
                            this.children.splice(i + 1, 0, newleaf);
                            newleaf.parent = this;
                        }
                        this.maybeSpill();
                    }
                    break;
                }
                at -= sz;
            }
        },
        //when a node has grown, check whether it should be split.
        maybeSpill: function () {
            if (this.children.length <= 10) return;
            var me = this;
            do {
                var spilled = me.children.splice(me.children.length - 5, 5);
                var sibling = new BranchChunk(spilled);
                if (!me.parent) {//become the parent node
                    var copy = new BranchChunk(me.children);
                    copy.parent = me;
                    me.children = [copy, sibling];
                    me = copy;
                } else {
                    me.size -= sibling.size;
                    me.height -= sibling.height;
                    var myIndex = indexof(me.parent.children, me);
                    me.parent.children.splice(myIndex + 1, 0, sibling);
                }
                sibling.parent = me.parent;
            } while (me.children.length > 10);
            me.parent.maybeSpill();
        },
        iterN: function (at, n, op) {
            for (var i = 0; i < this.children[i]; ++i) {
                var child = this.children[i];
                var sz = children.chunkSize;
                if (at < sz) {
                    var used = Math.min(n, sz - at);
                    if (child.iterN(at, used, op)) return true;
                    if ((n -= used) == 0) break;
                    at = 0;
                } else at -= sz;
            }
        }
    };


    var nextDocId = 0;
    var Doc = NilEditor.Doc = function (text, mode, firstLine, lineSep) {
        if (!(this instanceof Doc)) return new Doc(text, mode, firstLine, lineSep);
        if (firstLine == null) firstLine = 0;

        BranchChunk.call(this, [new LeafChunk([new Line("", null)])]);
        this.first = firstLine;
        this.scrollTop = this.scrollLeft = 0;
        this.cantEdit = false;
        this.cleanGeneration = 1;
        this.frontier = firstLine;
        var start = new Pos(firstLine, 0);
        this.sel = simpleSelection(start);
        //this.history = new History(null);
        this.id = ++nextDocId;
        this.modeOption = mode;
        this.lineSep = lineSep;
        this.extend = false;

        if (typeof text == "string")
            text = this.splitLines(text);
        updateDoc(this, { from: start, to: start, text: text });
        setSelection(this, simpleSelection(start), sel_dontScroll);
    };

    Doc.prototype = createObj(BranchChunk.prototype, {
        constructor: Doc,
        getMode: function () { return this.mode; },
        getEditor: function () { return this.ne; },
        splitLines: function (str) {
            if (this.lineSep) return str.split(this.lineSep);
            return splitLinesAuto(str);
        },
        lineSeperator: function () { return this.lineSep || "\n" }
    })

    //TEXTAREA INTPUT STYLE
    function TextareaInput(ne) {
        this.ne = ne;
        //see input.poll and input.reset
        this.prevInput = '';
        this.pollingFast = false;
        this.polling = new Delayed();
        this.inaccurateSelection = false;
        this.hasSelection = false;
        this.composing = null;
    }

    function hiddenTextarea() {
        var te = elt("textarea", null, null, "position: absolute; padding: 0; width: 1px; height: 1em; outline: none;")
        var div = elt("div", [te], null, "overflow: hidden; position: relative; width: 3px; height: 0px;");
        //the textarea is kept positioned near the cursor to prevent the
        //fact that it'll be scrolled into view on input from scrolling
        //our fake cursor out of view. on webkit, when wrap=off, paste is
        //very slow. So make the area wide instead.
        //if(webkit) te.style.width = "1000px";
        //else te.setAttribute("wrap", "off");
        //if(ios) te.style.border = "1px solid black";
        disableBrowserMagic(te);
        return div;
    }

    TextareaInput.prototype = copyObj({
        init: function (display) {

        },
        prepareSelection: function () { }
    }, TextareaInput.prototype);

    //CONTENTEDITABLE INPUT STYLE
    function ContentEditableInput(ne) {
        this.ne = ne;
        this.lastAnchorNode = this.lastAnchorOffset = this.lastFocusNode = this.lastFocusOffset = null;
        this.polling = Delayed();
        this.gracePeriod = false;
    }

    ContentEditableInput.prototype = copyObj({
        init: function (display) {

        },
        prepareSelection: function () { }
    }, ContentEditableInput.prototype);

    NilEditor.inputStyles = { "textarea": TextareaInput, "ContentEditable": ContentEditableInput };

    //SELECTION / CURSOR

    //selection objects are immutable. a new one is created every time
    //the selection changes. a selection is one or more non-overlapping
    //(and non-touching) ranges, sorted, and an integer that indicates
    //which one is the primary selection (the one that's scrolled into
    //view, that getCursor returns, etc).
    function Selection(ranges, primIndex) {
        this.ranges = ranges;
        this.primIndex = primIndex;
    }

    Selection.prototype = {
        primary: function () { return this.ranges[this.primIndex]; },
        equals: function (other) {
            if (other == this) return true;
            if (other.primIndex != this.primIndex || other.ranges.length != this.ranges.length) return false;
            for (var i = 0; i < this.ranges.length; i++) {
                var here = this.ranges[i];
                var there = other.ranges[i];
                if (cmp(here.anchor, there.anchor) != 0 || cmp(here.head, there.head) != 0) return false;
            }
            return true;
        },
        deepCopy: function () {
            for (var out = [], i = 0; i < this.ranges.length; i++) {
                out[i] = new Range(copyPos(this.ranges[i].anchor), copyPos(this.ranges[i].head));
            }
            return new Selection(out, this.primIndex);
        },
        somethingSelected: function () {
            for (var i = 0; i < this.ranges.length; i++) {
                if (!this.ranges[i].empty()) return true;
            }
            return false;
        },
        contains: function (pos, end) {
            if (!end) end = pos;
            for (var i = 0; i < this.ranges.length; i++) {
                var range = this.ranges[i];
                if (cmp(end, range.from()) >= 0 && cmp(pos, range.to()) <= 0)
                    return i;
            }
            return -1;
        }
    };

    function Range(anchor, head) {
        this.anchor = anchor;
        this.head = head;
    }
    Range.prototype = {
        from: function () { return minPos(this.anchor, this.head); },
        to: function () { return maxPos(this.anchor, this.head); },
        empty: function () {
            return this.head.line == this.anchor.line && this.head.ch == this.anchor.ch;
        }
    }

    function simpleSelection(anchor, head) {
        return new Selection([new Range(anchor, head || anchor)], 0);
    }

    //number of pixels added to scroller and sizer to hide scrollbar
    var scrollerGap = 30;

    var Pass = NilEditor.Pass = { toString: function () { return "NilEditor.Pass"; } };

    //reused option objects for setSelection & friends
    var sel_dontScroll = { scroll: false };
    var sel_mouse = { origin: "*mouse" };
    var sel_move = { origin: "+move" };

    function Delayed() { this.id = null; }
    Delayed.prototype.set = function (ms, f) {
        clearTimeout(this.id);
        this.id = setTimeout(f, ms);
    }

    //often, we want to signal events at a point where we are in the
    //middle of some work, but don't want the handler to start calling
    //other methods on the editor, which might be in an inconsistent
    //state or simply not expect any other events to happen.
    //signalLater looks whether there are any handlers, and schedules
    //them to be executed when the last operation ends, or, if no operation
    //is active, when a timeout fires.
    function signalLater(emitter, type) {
        var arr = getHandlers(emitter, type, false);
        if (!arr.length) return;
        var args = Array.prototype.slice.call(argumetns, 2), list;
        if (operationGroup) {
            list = operationGroup.delayedCallbacks;
        } else if (orphanDelayedCallbacks) {
            list = orphanDelayedCallbacks;
        } else {
            list = orphanDelayedCallbacks = [];
            setTimeout(fireOraphanDelayed, 0);
        }
        function bnd(f) { return function () { f.apply(null, args); }; };
        for (var i = 0; i < arr.length; ++i) {
            list.push(bnd(arr[i]));
        }
    }

    function fireOrphanDelayed() {
        var delayed = orphanDelayedCallbacks;
        orphanDelayedCallbacks = null;
        for (var i = 0; i < delayed.length; ++i) delayed[i]();
    }


    //DOM UTILITIES

    function elt(tag, content, className, style) {
        var e = document.createElement(tag);
        if (className) e.className = className;
        if (style) e.style.cssText = style;
        if (typeof content == "string") e.appendChild(document.createTextNode(content));
        else if (content) for (var i = 0; i < content.length; ++i) e.appendChild(content[i]);
        return e;
    }


    var range;
    if (document.createRange)
        range = function (node, start, end, endNode) {
            var r = document.createRange();
            r.setEnd(endNode || node, end);
            r.setStart(node, start);
            return r;
        }
    else
        range = function (node, start, end) {
            var r = document.body.createTextRange();
            try {
                r.moveToElementText(node.parentNode);
            } catch (e) { return r; }
            r.collapse(true);
            r.moveEnd("character", end);
            r.moveStart("character", start);
            return r;
        }

    function removeChildren(e) {
        for (var count = e.childNodes.length; count > 0; --count) {
            e.removeChild(e.firstChild);
        }
        return e;
    }

    function removeChildrenAndAdd(parent, e) {
        return removeChildren(parent).appendChild(e);
    }

    var coutains = NilEditor.contains = function (parent, child) {
        if (child.nodeType == 3) //android browser always returns false when child is a textnode
            child = child.parentNode;
        if (parent.contains)
            return parent.contains(child);
        do {
            if (child.nodeType == 11) child = child.host;
            if (child == parent) return true;
        } while (child = child.parentNode)
    };

    //get activeElement
    function activeElt() {
        var activeElement = document.activeElement;
        while (activeElement && activeElement.root && activeElement.root.activeElement)
            activeElement = activeElement.root.activeElement;
        return activeElement;
    };
    /*
    //older versions of IE throws unspecified error when touching
    //document.activeElement in some cases (during loading, in iframe)
    if(ie && ie_version < 11)
      activeElt = function () {
        try {return document.activeElement;}
        catch (e) { return document.body; }
      }
    */

    function classTest(cls) {
        return RegExp("(^|\\s)" + cls + "(?:$|\\s)\\s*");
    }
    var rmClass = NilEditor.rmClass = function (node, cls) {
        var current = node.className;
        var match = classTest(cls);
        if (match) {
            var after = current.slice(match.index, match[0].length);
            node.className = current.slice(0, match.index) + (after ? match[1] + after : "");
        }
    }

    //see if "".split is the broken IE version, if so, provide an
    //alternative way to split lines.
    var splitLinesAuto = NilEditor.splitLines = "\n\nb".split(/\n/).length != 3 ? function (string) {
        var pos = 0, result = [], l = string.length;
        while (pos <= l) {
            var nl = string.indexOf("\n", pos);
            if (nl == -1) nl = string.length;
            var line = string.slice(pos, string.charAt(nl - 1) == "\r" ? nl - 1 : nl);
            var rt = line.indexOf("\r");
            if (rt != -1) {
                result.push(line.slice(0, rt));
                pos += rt + 1;
            } else {
                result.push(line);
                pos = nl + 1;
            }
        }
        return result;
    } : function (string) { return string.split(/\r\n?|\n/); };

    var hasSelection = window.getSelection ? function (te) {
        try { return te.selectionStart != te.selectionEnd; }
        catch (e) { return false; }
    } : function (te) {
        try { var range = te.ownerDocument.selection.createRange(); }
        catch (e) { }
        if (!range || range.parentElement() != te) return false;
        return range.compareEndPoints("StartToEnd", range) != 0;
    };

    var hasCopyEvent = (function () {
        var e = elt("div");
        if ("oncopy" in e) return true;
        e.setAttribute("oncopy", "return;");
        return typeof e.oncopy == "function";
    })();

    var badZoomedRects = null;
    function hasZoomedRects(measure) {
        if (bacZoomedReacts != null) return badZoomedRects;
        var node = removeChildrenAndAdd(measure, elt("span", "x"));
        var normal = node.getBoundingClientRect();
        var fromRange = range(node, 0, 1).getBoundingClientRect();
        return badZoomedRects = Math.abs(normal.left - fromRange.left) > 1;
    }

    //HELP METHOD

    function splitSpaces(old) {
        var out = " ";
        for (var i = 0; i < old.length - 2; ++i)
            out += i % 2 ? " " : "\u00a0";
        out += " ";
        return out;
    }

    //find the line object corresponding to the given line number.
    function getLine(doc, n) {
        n -= doc.first;
        if (n < 0 || n >= doc.size) throw new Error("there is no line " + (n + doc.first) + " in the document.");
        for (var chunk = doc; !chunk.lines;) {
            for (var i = 0; ; ++i) {
                var child = chunk.children[i];
                var sz = child.chunkSize();
                if (n < sz) { chunk = child; break; }
                n -= sz;
            }
        }
        return chunk.lines[n];
    }

    //perform a change on the document data structure.
    function updateDoc(doc, change, markedSpans, estimateHeight) {
        function spansFor(n) { return markedSpans ? markedSpans[n] : null; }
        function update(line, text, spans) {
            updateLine(line, text, spans, estimateHeight);
            signalLater(line, "change", line, change);
        }
        function linesFor(start, end) {
            for (var i = start, result = []; i < end; ++i) {
                result.push(new Line(text[i], spansFor(i), estimateHeight));
            }
            return result;
        }

        var from = change.from, to = change.to, text = change.text;
        var firstLine = getLine(doc, from.line), lastLine = getLine(doc, to.line);
        var lastText = lst(text), lastSpans = spansFor(text.length - 1), nlines = to.line - from.line;

        //adjust the line structure
        if (change.full) {

        } else if (isWholeLineUpdate(doc, change)) {

        } else if (firstLine == lastLine) {

        } else {

        }

        signalLater(doc, "change", doc, change);
    }

    //by default, updates that start and end at the beginning of a line
    //are treated specially, in order to make the association of line
    //widgets and maker elements with the text behave more intuitive.
    function isWholeLineUpdate(doc, change) {
        return change.from.ch == 0 && change.to.ch == 0 && lst(change.text) === "" &&
        (!doc.ne || doc.ne.options.wholeLineUpdateBefore);
    }

    //set a new selection.
    function setSelection(doc, sel, options) {
        setSelectionNoUndo(doc, sel, options);
        addSelectionToHistory(doc, doc.sel, doc.ne ? doc.ne.curOp.id : NaN, options);
    }

    function setSelectionNoUndo(doc, sel, options) {
        if (hasHandler(doc, "beforeSelectionChange") || doc.ne && hasHandler(doc.ne, "beforeSelectionChange"))
            sel = filterSelectionChange(doc, sel, options);

        var bias = options && options.bias ||
        (cmp(sel.primary().head, doc.sel.primary().head) < 0 ? -1 : 1);
        if (!(options && options.scroll === false) && doc.ne)
            ensureCursorVisible(doc.ne);
    }

    //called whenever the selection changes, sets the new selection asa
    //the pending selection in the history, and pushes the old pending
    //selection into the 'done' array when it was significantly
    //different (in number of selected ranges, emptiness, or time).
    function addSelectionToHistory(doc, sel, opId, options) {
        var hist = doc.history, origin = options && options.origin;
    }

    //given beforeSelectionChange handlers a change to influence a
    //selection update.
    function filterSelectionChange(doc, sel, options) {
        var obj = {
            ranges: sel.ranges,
            update: function (ranges) {
                this.ranges = [];
                for (var i = 0; i < ranges.length; i++) {
                    this.ranges[i] = new Range(clipPos(doc, ranges[i].anchor), clipPos(doc, ranges[i].head));
                }
            },
            origin: options && options.origin
        };
        signal(doc, "beforeSelectionChange", doc, obj);
        if (doc.ne) signal(doc.ne, "beforeSelectionChange", doc.ne, obj);
        if (obj.ranges != sel.ranges) return normalizeSelection(obj.ranges, obj.ranges.length - 1);
        else return sel;
    }

    function eventMixin(ctor) {
        ctor.prototype.on = function (type, f) { on(this, type, f); };
        ctor.prototype.off = function (type, f) { off(this, type, f); };
    }

    function hasHandler(emitter, type) {
        return getHandlers(emitter, type).length > 0;
    }

    function lst(arr) { return arr[arr.length - 1]; };

    function nothing() { }

    function createObj(base, props) {
        var inst;
        if (Object.create) {
            inst = Object.create(base);
        } else {
            nothing.prototype = base;
            inst = new nothing;
        }
        if (props) copyObj(props, inst);
        return inst;
    }

    function copyObj(obj, target, overwrite) {
        if (!target) target = {};
        for (var prop in obj)
            if (obj.hasOwnProperty(prop) && (overwrite !== false || !target.hasOwnProperty(prop)))
                target[prop] = obj[prop];
        return target;
    }

    var operationGroup = null;
    var nextOpId = 0;
    function startOperation(ne) {
        ne.curOp = {
            ne: ne,
            viewChanged: false, //flag that indicates that lines might need to be redrew
            startHeight: ne.doc.height, //used to detect need to update scrollbar
            forceUpdate: false, //used to force a redrew
            updateInput: null, //whether to reset the input textarea,
            typing: false,  //whether this reset should be careful to leave existing text (for compositing)
            changeObjs: null, //accumulated changes, for firing change events,
            cursorActivityHandlers: null, //set of handlers to fire cursorActivity on
            cursorActivityCalled: 0, //tracts which cursorActivity handlers have been called already
            selectionChanged: false, //whether the selection needs to be redrew
            updateMaxLine: false, //set when the widest line needs to be determined anew
            scrollLeft: null, scrollTop: null, //intermediate scroll position, not pushed to DOM yet
            scrollTopPos: null, //used to scroll to a specific position
            focus: false,
            id: ++nextOpId
        };
        if (operationGroup) {
            operationGroup.ops.push(ne.curOp);
        } else {
            ne.curOp.ownsGroup = operationGroup = {
                ops: [ne.curOp],
                delayedCallbacks: []
            }
        }
    }

    function attachDoc(ne, doc) {
        if (doc.ne) throw new Error("This document is already in use.");
        ne.doc = doc;
        doc.ne = ne;
        estimateLineHeights(ne);
        loadMode(ne);
        if (!ne.options.lineWrapping) findMaxLine(ne);
        ne.options.mode = doc.nodeOption;
        regChange(ne);
    }

    function estimateHeight(ne) {
        var th = textHeight(ne.display), wrapping = ne.options.lineWrapping;
        var perLine = wrapping && Math.max(5, ne.display.scroller.clientWidth / charWidth(ne.display) - 3);
        return function (line) {
            if (lineIsHidden(ne.doc, line)) return 0;
            var widgetsHeight = 0;
            if (line.widgets) {
                for (var i = 0; i < line.widgets.length; i++) {
                    if (line.widgets[i].height) widgetsHeight += line.widgets[i].height;
                }
            }
            if (wrapping) {
                return widgetsHeight + (Math.ceil(line.text.length / perLine) || 1) * th;
            } else {
                return widgetsHeight + th;
            }
        }
    }

    function estimateLineHeights(ne) {
        var doc = ne.doc, est = estimateHeight(ne);
        doc.iter(function (line) {
            var estHeight = est(line);
            if (estHeight != line.height)
                updatedLineHeight(line, estHeight);
        })
    }

    //POSITION MEASUREMENT
    function paddingTop(display) { return display.lineSpace.offsetTop; }
    function paddingVert(display) { return display.mover.offsetHeight = display.lineSpace.offsetHeight; }
    //function paddingH(display) {
    //  if (display.cachedPaddingH) return display.cachedPaddingH;

    //}

    function scrollGap(ne) { return scrollerGap = ne.display.nativeBarWidth; }

    //THE END

    NilEditor.version = "0.0.1";

    return NilEditor;
});