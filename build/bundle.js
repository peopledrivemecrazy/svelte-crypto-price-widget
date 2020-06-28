
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.23.2 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (45:3) {:else}
    function create_else_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("loading");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(45:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (30:2) {#if res}
    function create_if_block(ctx) {
    	let await_block_anchor;
    	let promise;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 3
    	};

    	handle_promise(promise = /*res*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			await_block_anchor = empty();
    			info.block.c();
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, await_block_anchor, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty & /*res*/ 1 && promise !== (promise = /*res*/ ctx[0]) && handle_promise(promise, info)) ; else {
    				const child_ctx = ctx.slice();
    				child_ctx[3] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(await_block_anchor);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(30:2) {#if res}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script>  const url = "https://api.gemini.com/v1/pubticker/BTCUSD"    const feed = "https://api.gemini.com/v1/pricefeed";  let feedList = [];  let res;    async function fetchFeed() {   res = await fetch(feed).then(r => r.json())    res.map(c => {     if (c.pair.includes("USD")) {     let tmp = {}
    function create_catch_block(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script>  const url = \\\"https://api.gemini.com/v1/pubticker/BTCUSD\\\"    const feed = \\\"https://api.gemini.com/v1/pricefeed\\\";  let feedList = [];  let res;    async function fetchFeed() {   res = await fetch(feed).then(r => r.json())    res.map(c => {     if (c.pair.includes(\\\"USD\\\")) {     let tmp = {}",
    		ctx
    	});

    	return block;
    }

    // (33:3) {:then data}
    function create_then_block(ctx) {
    	let each_1_anchor;
    	let each_value = /*feedList*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*feedList*/ 2) {
    				each_value = /*feedList*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(33:3) {:then data}",
    		ctx
    	});

    	return block;
    }

    // (34:4) {#each feedList as item}
    function create_each_block(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let p0;
    	let t0_value = (/*item*/ ctx[4].coin ? /*item*/ ctx[4].coin : "...") + "";
    	let t0;
    	let t1;
    	let p1;
    	let t2_value = (/*item*/ ctx[4].price ? /*item*/ ctx[4].price : "...") + "";
    	let t2;
    	let t3;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			p1 = element("p");
    			t2 = text(t2_value);
    			t3 = space();
    			add_location(p0, file, 37, 6, 762);
    			add_location(p1, file, 38, 6, 803);
    			attr_dev(div0, "class", "card-text");
    			add_location(div0, file, 36, 5, 732);
    			attr_dev(div1, "class", "card");
    			add_location(div1, file, 35, 4, 708);
    			attr_dev(div2, "class", "col");
    			add_location(div2, file, 34, 4, 686);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, p0);
    			append_dev(p0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, p1);
    			append_dev(p1, t2);
    			append_dev(div2, t3);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(34:4) {#each feedList as item}",
    		ctx
    	});

    	return block;
    }

    // (31:15)      loading    {:then data}
    function create_pending_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("loading");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(31:15)      loading    {:then data}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div;
    	let t0;
    	let footer;
    	let p;
    	let t1;
    	let a;
    	let t3;
    	let t4;
    	let br;
    	let t5;
    	let svg;
    	let title;
    	let t6;
    	let path0;
    	let path1;
    	let path2;

    	function select_block_type(ctx, dirty) {
    		if (/*res*/ ctx[0]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			if_block.c();
    			t0 = space();
    			footer = element("footer");
    			p = element("p");
    			t1 = text("from ");
    			a = element("a");
    			a.textContent = "anoram";
    			t3 = text(" and made with");
    			t4 = space();
    			br = element("br");
    			t5 = space();
    			svg = svg_element("svg");
    			title = svg_element("title");
    			t6 = text("svelte-horizontal");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			attr_dev(div, "class", "flex-grid");
    			add_location(div, file, 27, 1, 572);
    			add_location(main, file, 26, 0, 564);
    			attr_dev(a, "href", "https://anoram.com");
    			add_location(a, file, 53, 10, 990);
    			add_location(p, file, 53, 1, 981);
    			add_location(br, file, 54, 1, 1049);
    			add_location(title, file, 55, 87, 1141);
    			attr_dev(path0, "d", "M172.4428,100.3382a24.0793,24.0793,0,0,1-13.72-3.8769,19.8715,19.8715,0,0,1-8.0107-10.6094l8.3515-3.0683a15.4054,15.4054,0,0,0,5.4541,6.6044,14.3656,14.3656,0,0,0,8.2657,2.4288,12.1375,12.1375,0,0,0,7.8818-2.3858,8.2746,8.2746,0,0,0,2.94-6.8174,7.4559,7.4559,0,0,0-.8095-3.4511,10.325,10.325,0,0,0-1.8321-2.6,12.3611,12.3611,0,0,0-3.1533-2.0879q-2.1314-1.0635-3.5361-1.6192-1.4062-.5521-4.1328-1.4912-3.41-1.1924-5.1133-1.874a38.46,38.46,0,0,1-4.4737-2.2588,16.5385,16.5385,0,0,1-4.1757-3.1523,15.2908,15.2908,0,0,1-2.5137-4.1338,14.77,14.77,0,0,1,4.0049-16.7871q5.1138-4.5162,13.8906-4.5166,7.3272,0,12.0576,3.2382a15.6579,15.6579,0,0,1,6.3487,8.6075l-8.1807,2.7265a9.5238,9.5238,0,0,0-3.9629-4.3887,13.31,13.31,0,0,0-6.9443-1.6621,10.703,10.703,0,0,0-6.69,1.875,6.2891,6.2891,0,0,0-2.4287,5.2832,5.5132,5.5132,0,0,0,1.874,4.0909,12.885,12.885,0,0,0,3.92,2.6416q2.0464.8524,6.2217,2.3007,2.5547.939,3.791,1.4063t3.6221,1.5762a24.997,24.997,0,0,1,3.6641,2.0029,32.1346,32.1346,0,0,1,2.9824,2.4287,12.7235,12.7235,0,0,1,2.6,3.11,17.39,17.39,0,0,1,1.5332,3.8339,17.5828,17.5828,0,0,1,.64,4.8155q0,8.3524-5.71,13.08Q181.3892,100.3388,172.4428,100.3382Zm54.6221-1.0224L206.6128,39.6644h9.5449L229.7065,81.25a64.4659,64.4659,0,0,1,1.875,6.8173,64.0335,64.0335,0,0,1,1.875-6.8173l13.3789-41.586h9.459L235.9272,99.3158Zm47.294,0V39.6644h36.9843V48.016H283.2221V64.3773h18.15v8.3516h-18.15V90.9642h29.9952v8.3516Zm61.44,0V39.6644h8.8633v51.13h29.1435v8.5215Zm71.41-51.13v51.13h-8.8632v-51.13H381.4741V39.6644h42.6074v8.5215Zm35.1934,51.13V39.6644h36.9844V48.016H451.2661V64.3773h18.15v8.3516h-18.15V90.9642h29.9951v8.3516Z");
    			set_style(path0, "fill", "#fff");
    			add_location(path0, file, 55, 119, 1173);
    			attr_dev(path1, "d", "M110.2859,28.3189c-10.4-14.8851-30.94-19.2971-45.7914-9.8348L38.4118,35.1078A29.9232,29.9232,0,0,0,24.8931,55.1506a31.5143,31.5143,0,0,0,3.1076,20.2318,30.0059,30.0059,0,0,0-4.4761,11.1829,31.8885,31.8885,0,0,0,5.4472,24.1157c10.4022,14.8865,30.9424,19.2966,45.7915,9.8348l26.0826-16.6237a29.9182,29.9182,0,0,0,13.5187-20.0428,31.5276,31.5276,0,0,0-3.1057-20.2323,30.0012,30.0012,0,0,0,4.4742-11.1824,31.88,31.88,0,0,0-5.4472-24.1157");
    			set_style(path1, "fill", "#ff3e00");
    			add_location(path1, file, 55, 1763, 2817);
    			attr_dev(path2, "d", "M61.9463,112.0815A20.718,20.718,0,0,1,39.71,103.8389a19.173,19.173,0,0,1-3.2766-14.5025,18.1886,18.1886,0,0,1,.6233-2.4357l.4912-1.4978,1.3362.9815a33.6466,33.6466,0,0,0,10.203,5.0978l.9694.2941-.0892.9675a5.8469,5.8469,0,0,0,1.052,3.8781,6.2388,6.2388,0,0,0,6.6952,2.485,5.7456,5.7456,0,0,0,1.602-.7041L85.3993,81.781A5.431,5.431,0,0,0,87.85,78.15a5.7944,5.7944,0,0,0-.9876-4.3712,6.2435,6.2435,0,0,0-6.6977-2.4864,5.7427,5.7427,0,0,0-1.6.7036l-9.9533,6.3449a19.0336,19.0336,0,0,1-5.2964,2.3259A20.7182,20.7182,0,0,1,41.078,72.4241a19.173,19.173,0,0,1-3.2766-14.5024,17.9892,17.9892,0,0,1,8.13-12.0513L72.0125,29.2472a19.0031,19.0031,0,0,1,5.3-2.3287A20.718,20.718,0,0,1,99.549,35.1611a19.1734,19.1734,0,0,1,3.2766,14.5025,18.4,18.4,0,0,1-.6233,2.4357l-.4912,1.4978-1.3356-.98a33.6175,33.6175,0,0,0-10.2037-5.1l-.9693-.2942.0892-.9675a5.8576,5.8576,0,0,0-1.052-3.878,6.2388,6.2388,0,0,0-6.6952-2.485,5.7456,5.7456,0,0,0-1.602.7041L53.8592,57.219A5.422,5.422,0,0,0,51.41,60.85a5.7858,5.7858,0,0,0,.9857,4.3717,6.2435,6.2435,0,0,0,6.6977,2.4864,5.7652,5.7652,0,0,0,1.602-.7041l9.952-6.3425a18.9787,18.9787,0,0,1,5.2958-2.3278,20.7183,20.7183,0,0,1,22.2369,8.2427,19.173,19.173,0,0,1,3.2766,14.5024,17.9982,17.9982,0,0,1-8.13,12.0532L67.246,109.7528a19.0031,19.0031,0,0,1-5.3,2.3287");
    			set_style(path2, "fill", "#fff");
    			add_location(path2, file, 55, 2229, 3283);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "width", "200");
    			attr_dev(svg, "height", "139");
    			attr_dev(svg, "viewBox", "0 0 519 139");
    			add_location(svg, file, 55, 0, 1054);
    			attr_dev(footer, "class", "text-center");
    			add_location(footer, file, 52, 0, 951);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			if_block.m(div, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, p);
    			append_dev(p, t1);
    			append_dev(p, a);
    			append_dev(p, t3);
    			append_dev(footer, t4);
    			append_dev(footer, br);
    			append_dev(footer, t5);
    			append_dev(footer, svg);
    			append_dev(svg, title);
    			append_dev(title, t6);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, path2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block.d();
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const url = "https://api.gemini.com/v1/pubticker/BTCUSD";
    const feed = "https://api.gemini.com/v1/pricefeed";

    function instance($$self, $$props, $$invalidate) {
    	let feedList = [];
    	let res;

    	async function fetchFeed() {
    		$$invalidate(0, res = await fetch(feed).then(r => r.json()));

    		res.map(c => {
    			if (c.pair.includes("USD")) {
    				let tmp = {};
    				tmp["coin"] = c.pair.replace("USD", "");
    				tmp["price"] = "$ " + c.price;
    				feedList.push(tmp);
    			}
    		});

    		console.log("%c with love from anoram ", "font-weight: bold; font-size: 15px;color: #fc4a1a;  border:1px dotted #f7b733");
    	}

    	fetchFeed();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	$$self.$capture_state = () => ({ url, feed, feedList, res, fetchFeed });

    	$$self.$inject_state = $$props => {
    		if ("feedList" in $$props) $$invalidate(1, feedList = $$props.feedList);
    		if ("res" in $$props) $$invalidate(0, res = $$props.res);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [res, feedList];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
