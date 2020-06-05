
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
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
    function create_component(block) {
        block && block.c();
    }
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.0' }, detail)));
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
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
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

    /* src/Tailwindcss.svelte generated by Svelte v3.23.0 */

    function create_fragment(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
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

    function instance($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Tailwindcss> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Tailwindcss", $$slots, []);
    	return [];
    }

    class Tailwindcss extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tailwindcss",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.23.0 */
    const file = "src/App.svelte";

    // (188:6) {#if showOriginalGoal}
    function create_if_block(ctx) {
    	let div;
    	let span;
    	let t0;
    	let strong;
    	let t1_value = toDollars(/*initialGoal*/ ctx[2]) + "";
    	let t1;
    	let div_style_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t0 = text("Original goal:\n            ");
    			strong = element("strong");
    			t1 = text(t1_value);
    			attr_dev(strong, "class", "svelte-1obshuk");
    			add_location(strong, file, 193, 12, 8648);
    			attr_dev(span, "class", "svelte-1obshuk");
    			add_location(span, file, 191, 10, 8602);
    			attr_dev(div, "class", "chartLabelLine absolute dashed svelte-1obshuk");
    			attr_dev(div, "style", div_style_value = `top: ${/*originalGoalPosition*/ ctx[6]}%;`);
    			add_location(div, file, 188, 8, 8486);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t0);
    			append_dev(span, strong);
    			append_dev(strong, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*initialGoal*/ 4 && t1_value !== (t1_value = toDollars(/*initialGoal*/ ctx[2]) + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*originalGoalPosition*/ 64 && div_style_value !== (div_style_value = `top: ${/*originalGoalPosition*/ ctx[6]}%;`)) {
    				attr_dev(div, "style", div_style_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(188:6) {#if showOriginalGoal}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let t0;
    	let main;
    	let div4;
    	let div0;
    	let label0;
    	let t2;
    	let input0;
    	let t3;
    	let div1;
    	let label1;
    	let t5;
    	let input1;
    	let t6;
    	let hr;
    	let t7;
    	let div2;
    	let label2;
    	let t9;
    	let input2;
    	let t10;
    	let div3;
    	let t11;
    	let input3;
    	let t12;
    	let div9;
    	let div8;
    	let div5;
    	let span0;
    	let t13;
    	let strong0;
    	let t14_value = toDollars(/*currentGoal*/ ctx[0]) + "";
    	let t14;
    	let t15;
    	let t16;
    	let div6;
    	let span1;
    	let t17;
    	let strong1;
    	let t18_value = toDollars(/*totalRaised*/ ctx[1]) + "";
    	let t18;
    	let div6_style_value;
    	let t19;
    	let div7;
    	let span2;
    	let strong2;
    	let t20_value = toDollars(/*totalRaised*/ ctx[1]) + "";
    	let t20;
    	let t21;
    	let div7_style_value;
    	let div8_style_value;
    	let current;
    	let mounted;
    	let dispose;
    	const tailwindcss = new Tailwindcss({ $$inline: true });
    	let if_block = /*showOriginalGoal*/ ctx[3] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			create_component(tailwindcss.$$.fragment);
    			t0 = space();
    			main = element("main");
    			div4 = element("div");
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Current Goal:";
    			t2 = space();
    			input0 = element("input");
    			t3 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Raised so far:";
    			t5 = space();
    			input1 = element("input");
    			t6 = space();
    			hr = element("hr");
    			t7 = space();
    			div2 = element("div");
    			label2 = element("label");
    			label2.textContent = "Original Goal:";
    			t9 = space();
    			input2 = element("input");
    			t10 = space();
    			div3 = element("div");
    			t11 = text("Show original goal line?\n      ");
    			input3 = element("input");
    			t12 = space();
    			div9 = element("div");
    			div8 = element("div");
    			div5 = element("div");
    			span0 = element("span");
    			t13 = text("Current goal:\n          ");
    			strong0 = element("strong");
    			t14 = text(t14_value);
    			t15 = space();
    			if (if_block) if_block.c();
    			t16 = space();
    			div6 = element("div");
    			span1 = element("span");
    			t17 = text("Total raised:\n          ");
    			strong1 = element("strong");
    			t18 = text(t18_value);
    			t19 = space();
    			div7 = element("div");
    			span2 = element("span");
    			strong2 = element("strong");
    			t20 = text(t20_value);
    			t21 = text(" raised");
    			attr_dev(label0, "class", "pr-2 svelte-1obshuk");
    			attr_dev(label0, "for", "currentGoalInput");
    			add_location(label0, file, 151, 6, 7186);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "id", "currentGoalInput");
    			attr_dev(input0, "class", "svelte-1obshuk");
    			add_location(input0, file, 152, 6, 7257);
    			attr_dev(div0, "class", "flex items-center py-4 svelte-1obshuk");
    			add_location(div0, file, 150, 4, 7143);
    			attr_dev(label1, "class", "pr-2 svelte-1obshuk");
    			attr_dev(label1, "for", "totalRaisedInput");
    			add_location(label1, file, 155, 6, 7386);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "id", "totalRaisedInput");
    			attr_dev(input1, "class", "svelte-1obshuk");
    			add_location(input1, file, 156, 6, 7458);
    			attr_dev(div1, "class", "flex items-center py-4 svelte-1obshuk");
    			add_location(div1, file, 154, 4, 7343);
    			attr_dev(hr, "class", "svelte-1obshuk");
    			add_location(hr, file, 159, 4, 7545);
    			attr_dev(label2, "class", "pr-2 svelte-1obshuk");
    			attr_dev(label2, "for", "initialGoalInput");
    			add_location(label2, file, 162, 6, 7600);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "id", "initialGoalInput");
    			attr_dev(input2, "class", "svelte-1obshuk");
    			add_location(input2, file, 163, 6, 7672);
    			attr_dev(div2, "class", "flex items-center py-4 svelte-1obshuk");
    			add_location(div2, file, 161, 4, 7557);
    			attr_dev(input3, "id", "showOriginalGoal");
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "class", "svelte-1obshuk");
    			add_location(input3, file, 168, 6, 7833);
    			attr_dev(div3, "class", "flex items-center py-4 svelte-1obshuk");
    			add_location(div3, file, 166, 4, 7759);
    			attr_dev(div4, "id", "Controls");
    			attr_dev(div4, "class", "flex-1 p-2 svelte-1obshuk");
    			add_location(div4, file, 149, 2, 7100);
    			attr_dev(strong0, "class", "svelte-1obshuk");
    			add_location(strong0, file, 184, 10, 8378);
    			attr_dev(span0, "class", "svelte-1obshuk");
    			add_location(span0, file, 182, 8, 8337);
    			attr_dev(div5, "class", "chartLabelLine alt svelte-1obshuk");
    			add_location(div5, file, 181, 6, 8296);
    			attr_dev(strong1, "class", "svelte-1obshuk");
    			add_location(strong1, file, 203, 10, 8885);
    			attr_dev(span1, "class", "svelte-1obshuk");
    			add_location(span1, file, 201, 8, 8844);
    			attr_dev(div6, "class", "chartLabelLine absolute svelte-1obshuk");
    			attr_dev(div6, "style", div6_style_value = `top: ${/*totalRaisedPosition*/ ctx[7]}%;`);
    			add_location(div6, file, 198, 6, 8742);
    			attr_dev(strong2, "class", "text-5xl high svelte-1obshuk");
    			add_location(strong2, file, 208, 10, 9089);
    			attr_dev(span2, "class", "chartLabel text-center svelte-1obshuk");
    			add_location(span2, file, 207, 8, 9041);
    			attr_dev(div7, "id", "ChartTotalRaisedBar");
    			attr_dev(div7, "style", div7_style_value = `height: ${/*totalRaisedHeight*/ ctx[5]}%`);
    			attr_dev(div7, "class", "svelte-1obshuk");
    			add_location(div7, file, 206, 6, 8962);
    			attr_dev(div8, "id", "Chart");
    			attr_dev(div8, "class", "h-full svelte-1obshuk");
    			attr_dev(div8, "style", div8_style_value = `height: ${/*chartHeight*/ ctx[4]}%`);
    			add_location(div8, file, 180, 4, 8224);
    			attr_dev(div9, "id", "View");
    			attr_dev(div9, "class", "flex-1 p-10 svelte-1obshuk");
    			add_location(div9, file, 178, 2, 8129);
    			attr_dev(main, "id", "Container");
    			attr_dev(main, "class", "flex svelte-1obshuk");
    			add_location(main, file, 148, 0, 7063);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(tailwindcss, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div4);
    			append_dev(div4, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t2);
    			append_dev(div0, input0);
    			set_input_value(input0, /*currentGoal*/ ctx[0]);
    			append_dev(div4, t3);
    			append_dev(div4, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t5);
    			append_dev(div1, input1);
    			set_input_value(input1, /*totalRaised*/ ctx[1]);
    			append_dev(div4, t6);
    			append_dev(div4, hr);
    			append_dev(div4, t7);
    			append_dev(div4, div2);
    			append_dev(div2, label2);
    			append_dev(div2, t9);
    			append_dev(div2, input2);
    			set_input_value(input2, /*initialGoal*/ ctx[2]);
    			append_dev(div4, t10);
    			append_dev(div4, div3);
    			append_dev(div3, t11);
    			append_dev(div3, input3);
    			input3.checked = /*showOriginalGoal*/ ctx[3];
    			append_dev(main, t12);
    			append_dev(main, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div5);
    			append_dev(div5, span0);
    			append_dev(span0, t13);
    			append_dev(span0, strong0);
    			append_dev(strong0, t14);
    			append_dev(div8, t15);
    			if (if_block) if_block.m(div8, null);
    			append_dev(div8, t16);
    			append_dev(div8, div6);
    			append_dev(div6, span1);
    			append_dev(span1, t17);
    			append_dev(span1, strong1);
    			append_dev(strong1, t18);
    			append_dev(div8, t19);
    			append_dev(div8, div7);
    			append_dev(div7, span2);
    			append_dev(span2, strong2);
    			append_dev(strong2, t20);
    			append_dev(strong2, t21);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[9]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[10]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[11]),
    					listen_dev(input3, "change", /*input3_change_handler*/ ctx[12])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentGoal*/ 1 && to_number(input0.value) !== /*currentGoal*/ ctx[0]) {
    				set_input_value(input0, /*currentGoal*/ ctx[0]);
    			}

    			if (dirty & /*totalRaised*/ 2 && to_number(input1.value) !== /*totalRaised*/ ctx[1]) {
    				set_input_value(input1, /*totalRaised*/ ctx[1]);
    			}

    			if (dirty & /*initialGoal*/ 4 && to_number(input2.value) !== /*initialGoal*/ ctx[2]) {
    				set_input_value(input2, /*initialGoal*/ ctx[2]);
    			}

    			if (dirty & /*showOriginalGoal*/ 8) {
    				input3.checked = /*showOriginalGoal*/ ctx[3];
    			}

    			if ((!current || dirty & /*currentGoal*/ 1) && t14_value !== (t14_value = toDollars(/*currentGoal*/ ctx[0]) + "")) set_data_dev(t14, t14_value);

    			if (/*showOriginalGoal*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div8, t16);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if ((!current || dirty & /*totalRaised*/ 2) && t18_value !== (t18_value = toDollars(/*totalRaised*/ ctx[1]) + "")) set_data_dev(t18, t18_value);

    			if (!current || dirty & /*totalRaisedPosition*/ 128 && div6_style_value !== (div6_style_value = `top: ${/*totalRaisedPosition*/ ctx[7]}%;`)) {
    				attr_dev(div6, "style", div6_style_value);
    			}

    			if ((!current || dirty & /*totalRaised*/ 2) && t20_value !== (t20_value = toDollars(/*totalRaised*/ ctx[1]) + "")) set_data_dev(t20, t20_value);

    			if (!current || dirty & /*totalRaisedHeight*/ 32 && div7_style_value !== (div7_style_value = `height: ${/*totalRaisedHeight*/ ctx[5]}%`)) {
    				attr_dev(div7, "style", div7_style_value);
    			}

    			if (!current || dirty & /*chartHeight*/ 16 && div8_style_value !== (div8_style_value = `height: ${/*chartHeight*/ ctx[4]}%`)) {
    				attr_dev(div8, "style", div8_style_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tailwindcss.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tailwindcss.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tailwindcss, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function toDollars(num) {
    	if (!num) return "$0";
    	let dollaString = num.toString();
    	return `$${dollaString.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")}`;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let currentGoal = 1000;
    	let totalRaised = 600;
    	let initialGoal = 500;
    	let showOriginalGoal = !false;

    	function getChartHeight() {
    		if (totalRaised <= currentGoal) return 100; else if (totalRaised > currentGoal) {
    			return 100;
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function input0_input_handler() {
    		currentGoal = to_number(this.value);
    		$$invalidate(0, currentGoal);
    	}

    	function input1_input_handler() {
    		totalRaised = to_number(this.value);
    		$$invalidate(1, totalRaised);
    	}

    	function input2_input_handler() {
    		initialGoal = to_number(this.value);
    		$$invalidate(2, initialGoal);
    	}

    	function input3_change_handler() {
    		showOriginalGoal = this.checked;
    		$$invalidate(3, showOriginalGoal);
    	}

    	$$self.$capture_state = () => ({
    		Tailwindcss,
    		currentGoal,
    		totalRaised,
    		initialGoal,
    		showOriginalGoal,
    		getChartHeight,
    		toDollars,
    		chartHeight,
    		totalRaisedHeight,
    		originalGoalPosition,
    		totalRaisedPosition
    	});

    	$$self.$inject_state = $$props => {
    		if ("currentGoal" in $$props) $$invalidate(0, currentGoal = $$props.currentGoal);
    		if ("totalRaised" in $$props) $$invalidate(1, totalRaised = $$props.totalRaised);
    		if ("initialGoal" in $$props) $$invalidate(2, initialGoal = $$props.initialGoal);
    		if ("showOriginalGoal" in $$props) $$invalidate(3, showOriginalGoal = $$props.showOriginalGoal);
    		if ("chartHeight" in $$props) $$invalidate(4, chartHeight = $$props.chartHeight);
    		if ("totalRaisedHeight" in $$props) $$invalidate(5, totalRaisedHeight = $$props.totalRaisedHeight);
    		if ("originalGoalPosition" in $$props) $$invalidate(6, originalGoalPosition = $$props.originalGoalPosition);
    		if ("totalRaisedPosition" in $$props) $$invalidate(7, totalRaisedPosition = $$props.totalRaisedPosition);
    	};

    	let chartHeight;
    	let totalRaisedHeight;
    	let originalGoalPosition;
    	let totalRaisedPosition;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*totalRaised, currentGoal*/ 3) {
    			 $$invalidate(5, totalRaisedHeight = totalRaised / currentGoal * 100);
    		}

    		if ($$self.$$.dirty & /*initialGoal, currentGoal*/ 5) {
    			 $$invalidate(6, originalGoalPosition = (1 - initialGoal / currentGoal) * 100);
    		}

    		if ($$self.$$.dirty & /*totalRaised, currentGoal*/ 3) {
    			 $$invalidate(7, totalRaisedPosition = (1 - totalRaised / currentGoal) * 100);
    		}
    	};

    	 $$invalidate(4, chartHeight = getChartHeight());

    	return [
    		currentGoal,
    		totalRaised,
    		initialGoal,
    		showOriginalGoal,
    		chartHeight,
    		totalRaisedHeight,
    		originalGoalPosition,
    		totalRaisedPosition,
    		getChartHeight,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_change_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'bijstream'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
