
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
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

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
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
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
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
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
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
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.18.2' }, detail)));
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
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */

    function __rest(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }
    function slide(node, { delay = 0, duration = 400, easing = cubicOut }) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => `overflow: hidden;` +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }
    function crossfade(_a) {
        var { fallback } = _a, defaults = __rest(_a, ["fallback"]);
        const to_receive = new Map();
        const to_send = new Map();
        function crossfade(from, node, params) {
            const { delay = 0, duration = d => Math.sqrt(d) * 30, easing = cubicOut } = assign(assign({}, defaults), params);
            const to = node.getBoundingClientRect();
            const dx = from.left - to.left;
            const dy = from.top - to.top;
            const dw = from.width / to.width;
            const dh = from.height / to.height;
            const d = Math.sqrt(dx * dx + dy * dy);
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            const opacity = +style.opacity;
            return {
                delay,
                duration: is_function(duration) ? duration(d) : duration,
                easing,
                css: (t, u) => `
				opacity: ${t * opacity};
				transform-origin: top left;
				transform: ${transform} translate(${u * dx}px,${u * dy}px) scale(${t + (1 - t) * dw}, ${t + (1 - t) * dh});
			`
            };
        }
        function transition(items, counterparts, intro) {
            return (node, params) => {
                items.set(params.key, {
                    rect: node.getBoundingClientRect()
                });
                return () => {
                    if (counterparts.has(params.key)) {
                        const { rect } = counterparts.get(params.key);
                        counterparts.delete(params.key);
                        return crossfade(rect, node, params);
                    }
                    // if the node is disappearing altogether
                    // (i.e. wasn't claimed by the other list)
                    // then we need to supply an outro
                    items.delete(params.key);
                    return fallback && fallback(node, params, intro);
                };
            };
        }
        return [
            transition(to_send, to_receive, false),
            transition(to_receive, to_send, true)
        ];
    }

    /* src\App.svelte generated by Svelte v3.18.2 */
    const file = "src\\App.svelte";

    // (319:12) {#if nav_selected === 'main'}
    function create_if_block_8(ctx) {
    	let div;
    	let div_intro;
    	let div_outro;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "mask svelte-1vjfiyg");
    			add_location(div, file, 319, 12, 7937);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, /*receive*/ ctx[3], {});
    				div_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (div_intro) div_intro.invalidate();
    			div_outro = create_out_transition(div, /*send*/ ctx[2], {});
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_outro) div_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(319:12) {#if nav_selected === 'main'}",
    		ctx
    	});

    	return block;
    }

    // (325:12) {#if nav_selected === 'info'}
    function create_if_block_7(ctx) {
    	let div;
    	let div_intro;
    	let div_outro;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "mask svelte-1vjfiyg");
    			add_location(div, file, 325, 16, 8172);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, /*receive*/ ctx[3], {});
    				div_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (div_intro) div_intro.invalidate();
    			div_outro = create_out_transition(div, /*send*/ ctx[2], {});
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_outro) div_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(325:12) {#if nav_selected === 'info'}",
    		ctx
    	});

    	return block;
    }

    // (331:13) {#if nav_selected === 'API'}
    function create_if_block_6(ctx) {
    	let div;
    	let div_intro;
    	let div_outro;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "mask svelte-1vjfiyg");
    			add_location(div, file, 331, 16, 8411);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, /*receive*/ ctx[3], {});
    				div_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (div_intro) div_intro.invalidate();
    			div_outro = create_out_transition(div, /*send*/ ctx[2], {});
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_outro) div_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(331:13) {#if nav_selected === 'API'}",
    		ctx
    	});

    	return block;
    }

    // (337:13) {#if nav_selected === 'contacts'}
    function create_if_block_5(ctx) {
    	let div;
    	let div_intro;
    	let div_outro;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "mask svelte-1vjfiyg");
    			add_location(div, file, 337, 16, 8655);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, /*receive*/ ctx[3], {});
    				div_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (div_intro) div_intro.invalidate();
    			div_outro = create_out_transition(div, /*send*/ ctx[2], {});
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_outro) div_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(337:13) {#if nav_selected === 'contacts'}",
    		ctx
    	});

    	return block;
    }

    // (346:8) {:else}
    function create_else_block_1(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			if (img.src !== (img_src_value = "close.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", "22px");
    			attr_dev(img, "height", "22px");
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-1vjfiyg");
    			add_location(img, file, 347, 16, 9017);
    			attr_dev(div, "class", "menu svelte-1vjfiyg");
    			add_location(div, file, 346, 12, 8966);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			dispose = listen_dev(div, "click", /*Menu*/ ctx[4], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(346:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (342:8) {#if menu_visibility === 0}
    function create_if_block_4(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			if (img.src !== (img_src_value = "menu.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", "30px");
    			attr_dev(img, "height", "30px");
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-1vjfiyg");
    			add_location(img, file, 343, 16, 8864);
    			attr_dev(div, "class", "menu svelte-1vjfiyg");
    			add_location(div, file, 342, 12, 8813);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			dispose = listen_dev(div, "click", /*Menu*/ ctx[4], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(342:8) {#if menu_visibility === 0}",
    		ctx
    	});

    	return block;
    }

    // (353:8) {#if menu_visibility === 1}
    function create_if_block_3(ctx) {
    	let div;
    	let ul;
    	let li0;
    	let t0;
    	let li1;
    	let a0;
    	let t2;
    	let li2;
    	let a1;
    	let t4;
    	let li3;
    	let a2;
    	let t6;
    	let li4;
    	let a3;
    	let t8;
    	let li5;
    	let div_transition;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			t0 = space();
    			li1 = element("li");
    			a0 = element("a");
    			a0.textContent = "Главная";
    			t2 = space();
    			li2 = element("li");
    			a1 = element("a");
    			a1.textContent = "О сервисе";
    			t4 = space();
    			li3 = element("li");
    			a2 = element("a");
    			a2.textContent = "API";
    			t6 = space();
    			li4 = element("li");
    			a3 = element("a");
    			a3.textContent = "Контакты";
    			t8 = space();
    			li5 = element("li");
    			attr_dev(li0, "class", "svelte-1vjfiyg");
    			add_location(li0, file, 355, 20, 9296);
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "class", "svelte-1vjfiyg");
    			add_location(a0, file, 356, 24, 9330);
    			attr_dev(li1, "class", "svelte-1vjfiyg");
    			add_location(li1, file, 356, 20, 9326);
    			attr_dev(a1, "href", "/");
    			attr_dev(a1, "class", "svelte-1vjfiyg");
    			add_location(a1, file, 357, 24, 9383);
    			attr_dev(li2, "class", "svelte-1vjfiyg");
    			add_location(li2, file, 357, 20, 9379);
    			attr_dev(a2, "href", "/");
    			attr_dev(a2, "class", "svelte-1vjfiyg");
    			add_location(a2, file, 358, 24, 9438);
    			attr_dev(li3, "class", "svelte-1vjfiyg");
    			add_location(li3, file, 358, 20, 9434);
    			attr_dev(a3, "href", "/");
    			attr_dev(a3, "class", "svelte-1vjfiyg");
    			add_location(a3, file, 359, 24, 9487);
    			attr_dev(li4, "class", "svelte-1vjfiyg");
    			add_location(li4, file, 359, 20, 9483);
    			attr_dev(li5, "class", "svelte-1vjfiyg");
    			add_location(li5, file, 360, 20, 9537);
    			attr_dev(ul, "class", "ul_submenu svelte-1vjfiyg");
    			add_location(ul, file, 354, 16, 9252);
    			attr_dev(div, "class", "submenu svelte-1vjfiyg");
    			add_location(div, file, 353, 12, 9191);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t0);
    			append_dev(ul, li1);
    			append_dev(li1, a0);
    			append_dev(ul, t2);
    			append_dev(ul, li2);
    			append_dev(li2, a1);
    			append_dev(ul, t4);
    			append_dev(ul, li3);
    			append_dev(li3, a2);
    			append_dev(ul, t6);
    			append_dev(ul, li4);
    			append_dev(li4, a3);
    			append_dev(ul, t8);
    			append_dev(ul, li5);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			if (local) {
    				add_render_callback(() => {
    					if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, true);
    					div_transition.run(1);
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			if (local) {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, false);
    				div_transition.run(0);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(353:8) {#if menu_visibility === 1}",
    		ctx
    	});

    	return block;
    }

    // (373:12) {:else}
    function create_else_block(ctx) {
    	const block = { c: noop, m: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(373:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (371:45) 
    function create_if_block_2(ctx) {
    	const block = { c: noop, m: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(371:45) ",
    		ctx
    	});

    	return block;
    }

    // (369:46) 
    function create_if_block_1(ctx) {
    	const block = { c: noop, m: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(369:46) ",
    		ctx
    	});

    	return block;
    }

    // (365:8) {#if nav_selected === 'main'}
    function create_if_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "content_main");
    			add_location(div, file, 365, 0, 9640);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(365:8) {#if nav_selected === 'main'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let link0;
    	let t0;
    	let link1;
    	let t1;
    	let link2;
    	let t2;
    	let div12;
    	let div7;
    	let div0;
    	let t3;
    	let div1;
    	let h10;
    	let t5;
    	let div2;
    	let t6;
    	let div3;
    	let t7;
    	let p0;
    	let t9;
    	let div4;
    	let t10;
    	let p1;
    	let t12;
    	let div5;
    	let t13;
    	let p2;
    	let t15;
    	let div6;
    	let t16;
    	let p3;
    	let t18;
    	let div7_class_value;
    	let t19;
    	let div11;
    	let t20;
    	let t21;
    	let div8;
    	let h11;
    	let t23;
    	let img0;
    	let img0_src_value;
    	let t24;
    	let div10;
    	let div9;
    	let p4;
    	let t26;
    	let p5;
    	let t28;
    	let form;
    	let input;
    	let t29;
    	let label;
    	let img1;
    	let img1_src_value;
    	let t30;
    	let p6;
    	let t32;
    	let button;
    	let current;
    	let dispose;
    	let if_block0 = /*nav_selected*/ ctx[0] === "main" && create_if_block_8(ctx);
    	let if_block1 = /*nav_selected*/ ctx[0] === "info" && create_if_block_7(ctx);
    	let if_block2 = /*nav_selected*/ ctx[0] === "API" && create_if_block_6(ctx);
    	let if_block3 = /*nav_selected*/ ctx[0] === "contacts" && create_if_block_5(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*menu_visibility*/ ctx[1] === 0) return create_if_block_4;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block4 = current_block_type(ctx);
    	let if_block5 = /*menu_visibility*/ ctx[1] === 1 && create_if_block_3(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*nav_selected*/ ctx[0] === "main") return create_if_block;
    		if (/*nav_selected*/ ctx[0] === "info") return create_if_block_1;
    		if (/*nav_selected*/ ctx[0] === "API") return create_if_block_2;
    		return create_else_block;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block6 = current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			link0 = element("link");
    			t0 = space();
    			link1 = element("link");
    			t1 = space();
    			link2 = element("link");
    			t2 = space();
    			div12 = element("div");
    			div7 = element("div");
    			div0 = element("div");
    			t3 = space();
    			div1 = element("div");
    			h10 = element("h1");
    			h10.textContent = "Ani me";
    			t5 = space();
    			div2 = element("div");
    			t6 = space();
    			div3 = element("div");
    			if (if_block0) if_block0.c();
    			t7 = space();
    			p0 = element("p");
    			p0.textContent = "Главная";
    			t9 = space();
    			div4 = element("div");
    			if (if_block1) if_block1.c();
    			t10 = space();
    			p1 = element("p");
    			p1.textContent = "О сервисе";
    			t12 = space();
    			div5 = element("div");
    			if (if_block2) if_block2.c();
    			t13 = space();
    			p2 = element("p");
    			p2.textContent = "API";
    			t15 = space();
    			div6 = element("div");
    			if (if_block3) if_block3.c();
    			t16 = space();
    			p3 = element("p");
    			p3.textContent = "Контакты";
    			t18 = space();
    			if_block4.c();
    			t19 = space();
    			div11 = element("div");
    			if (if_block5) if_block5.c();
    			t20 = space();
    			if_block6.c();
    			t21 = space();
    			div8 = element("div");
    			h11 = element("h1");
    			h11.textContent = "Создавайте видео потрясающих танцев для TikTok всего лишь из одной фотографии!";
    			t23 = space();
    			img0 = element("img");
    			t24 = space();
    			div10 = element("div");
    			div9 = element("div");
    			p4 = element("p");
    			p4.textContent = "Преображение основано на технологии Machine Learning.";
    			t26 = space();
    			p5 = element("p");
    			p5.textContent = "Однако чтобы получить готовое видео не нужно проделывать сложные операции: достаточно загрузить фото\n                    в полный рост.";
    			t28 = space();
    			form = element("form");
    			input = element("input");
    			t29 = space();
    			label = element("label");
    			img1 = element("img");
    			t30 = space();
    			p6 = element("p");
    			p6.textContent = "Загрузить файл";
    			t32 = space();
    			button = element("button");
    			button.textContent = "Отправить";
    			attr_dev(link0, "href", "https://fonts.googleapis.com/css?family=Comfortaa&display=swap");
    			attr_dev(link0, "rel", "stylesheet");
    			add_location(link0, file, 28, 0, 858);
    			attr_dev(link1, "href", "https://fonts.googleapis.com/css?family=Playfair+Display&display=swap");
    			attr_dev(link1, "rel", "stylesheet");
    			add_location(link1, file, 29, 0, 952);
    			attr_dev(link2, "href", "https://fonts.googleapis.com/css?family=Bad+Script&display=swap");
    			attr_dev(link2, "rel", "stylesheet");
    			add_location(link2, file, 30, 0, 1053);
    			attr_dev(div0, "class", "empty_1 svelte-1vjfiyg");
    			add_location(div0, file, 310, 8, 7665);
    			attr_dev(h10, "class", "svelte-1vjfiyg");
    			add_location(h10, file, 313, 12, 7741);
    			attr_dev(div1, "class", "logo svelte-1vjfiyg");
    			add_location(div1, file, 312, 8, 7710);
    			attr_dev(div2, "class", "empty");
    			add_location(div2, file, 315, 8, 7780);
    			add_location(p0, file, 321, 12, 8016);
    			attr_dev(div3, "class", "main svelte-1vjfiyg");
    			add_location(div3, file, 317, 8, 7823);
    			add_location(p1, file, 327, 12, 8251);
    			attr_dev(div4, "class", "info svelte-1vjfiyg");
    			add_location(div4, file, 323, 8, 8054);
    			add_location(p2, file, 333, 12, 8490);
    			attr_dev(div5, "class", "API svelte-1vjfiyg");
    			add_location(div5, file, 329, 8, 8295);
    			add_location(p3, file, 339, 12, 8734);
    			attr_dev(div6, "class", "contacts svelte-1vjfiyg");
    			add_location(div6, file, 335, 8, 8524);
    			attr_dev(div7, "class", div7_class_value = "header " + (/*menu_visibility*/ ctx[1] === 0 ? "shadow" : "") + " svelte-1vjfiyg");
    			add_location(div7, file, 309, 4, 7596);
    			attr_dev(h11, "class", "svelte-1vjfiyg");
    			add_location(h11, file, 376, 12, 9854);
    			attr_dev(div8, "class", "text_block svelte-1vjfiyg");
    			add_location(div8, file, 375, 8, 9817);
    			if (img0.src !== (img0_src_value = "people.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "people_image svelte-1vjfiyg");
    			attr_dev(img0, "alt", "");
    			add_location(img0, file, 378, 8, 9965);
    			add_location(p4, file, 381, 16, 10089);
    			add_location(p5, file, 382, 16, 10166);
    			attr_dev(div9, "class", "text svelte-1vjfiyg");
    			add_location(div9, file, 380, 12, 10054);
    			attr_dev(div10, "class", "all svelte-1vjfiyg");
    			add_location(div10, file, 379, 8, 10024);
    			attr_dev(input, "class", "input_upload_image svelte-1vjfiyg");
    			attr_dev(input, "type", "file");
    			attr_dev(input, "name", "file");
    			attr_dev(input, "id", "FileForm");
    			add_location(input, file, 387, 12, 10420);
    			if (img1.src !== (img1_src_value = "upload.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "upload_image svelte-1vjfiyg");
    			attr_dev(img1, "alt", "");
    			add_location(img1, file, 389, 16, 10578);
    			attr_dev(p6, "class", "p_upload_image svelte-1vjfiyg");
    			add_location(p6, file, 390, 16, 10645);
    			attr_dev(label, "for", "FileForm");
    			attr_dev(label, "class", "label_input_upload_image svelte-1vjfiyg");
    			add_location(label, file, 388, 12, 10506);
    			attr_dev(button, "class", "form_button svelte-1vjfiyg");
    			attr_dev(button, "type", "button");
    			add_location(button, file, 392, 12, 10723);
    			attr_dev(form, "class", "form_upload_image svelte-1vjfiyg");
    			attr_dev(form, "method", "POST");
    			attr_dev(form, "id", "Form");
    			add_location(form, file, 386, 8, 10351);
    			attr_dev(div11, "class", "content svelte-1vjfiyg");
    			add_location(div11, file, 351, 4, 9121);
    			attr_dev(div12, "class", "window svelte-1vjfiyg");
    			add_location(div12, file, 308, 0, 7571);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, link0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, link1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, link2, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div12, anchor);
    			append_dev(div12, div7);
    			append_dev(div7, div0);
    			append_dev(div7, t3);
    			append_dev(div7, div1);
    			append_dev(div1, h10);
    			append_dev(div7, t5);
    			append_dev(div7, div2);
    			append_dev(div7, t6);
    			append_dev(div7, div3);
    			if (if_block0) if_block0.m(div3, null);
    			append_dev(div3, t7);
    			append_dev(div3, p0);
    			append_dev(div7, t9);
    			append_dev(div7, div4);
    			if (if_block1) if_block1.m(div4, null);
    			append_dev(div4, t10);
    			append_dev(div4, p1);
    			append_dev(div7, t12);
    			append_dev(div7, div5);
    			if (if_block2) if_block2.m(div5, null);
    			append_dev(div5, t13);
    			append_dev(div5, p2);
    			append_dev(div7, t15);
    			append_dev(div7, div6);
    			if (if_block3) if_block3.m(div6, null);
    			append_dev(div6, t16);
    			append_dev(div6, p3);
    			append_dev(div7, t18);
    			if_block4.m(div7, null);
    			append_dev(div12, t19);
    			append_dev(div12, div11);
    			if (if_block5) if_block5.m(div11, null);
    			append_dev(div11, t20);
    			if_block6.m(div11, null);
    			append_dev(div11, t21);
    			append_dev(div11, div8);
    			append_dev(div8, h11);
    			append_dev(div11, t23);
    			append_dev(div11, img0);
    			append_dev(div11, t24);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, p4);
    			append_dev(div9, t26);
    			append_dev(div9, p5);
    			append_dev(div11, t28);
    			append_dev(div11, form);
    			append_dev(form, input);
    			append_dev(form, t29);
    			append_dev(form, label);
    			append_dev(label, img1);
    			append_dev(label, t30);
    			append_dev(label, p6);
    			append_dev(form, t32);
    			append_dev(form, button);
    			current = true;

    			dispose = [
    				listen_dev(div3, "click", /*click_handler*/ ctx[5], false, false, false),
    				listen_dev(div4, "click", /*click_handler_1*/ ctx[6], false, false, false),
    				listen_dev(div5, "click", /*click_handler_2*/ ctx[7], false, false, false),
    				listen_dev(div6, "click", /*click_handler_3*/ ctx[8], false, false, false),
    				listen_dev(button, "click", Fetch, false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*nav_selected*/ ctx[0] === "main") {
    				if (!if_block0) {
    					if_block0 = create_if_block_8(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div3, t7);
    				} else {
    					transition_in(if_block0, 1);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*nav_selected*/ ctx[0] === "info") {
    				if (!if_block1) {
    					if_block1 = create_if_block_7(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div4, t10);
    				} else {
    					transition_in(if_block1, 1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*nav_selected*/ ctx[0] === "API") {
    				if (!if_block2) {
    					if_block2 = create_if_block_6(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div5, t13);
    				} else {
    					transition_in(if_block2, 1);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (/*nav_selected*/ ctx[0] === "contacts") {
    				if (!if_block3) {
    					if_block3 = create_if_block_5(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(div6, t16);
    				} else {
    					transition_in(if_block3, 1);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block4) {
    				if_block4.p(ctx, dirty);
    			} else {
    				if_block4.d(1);
    				if_block4 = current_block_type(ctx);

    				if (if_block4) {
    					if_block4.c();
    					if_block4.m(div7, null);
    				}
    			}

    			if (!current || dirty & /*menu_visibility*/ 2 && div7_class_value !== (div7_class_value = "header " + (/*menu_visibility*/ ctx[1] === 0 ? "shadow" : "") + " svelte-1vjfiyg")) {
    				attr_dev(div7, "class", div7_class_value);
    			}

    			if (/*menu_visibility*/ ctx[1] === 1) {
    				if (!if_block5) {
    					if_block5 = create_if_block_3(ctx);
    					if_block5.c();
    					transition_in(if_block5, 1);
    					if_block5.m(div11, t20);
    				} else {
    					transition_in(if_block5, 1);
    				}
    			} else if (if_block5) {
    				group_outros();

    				transition_out(if_block5, 1, 1, () => {
    					if_block5 = null;
    				});

    				check_outros();
    			}

    			if (current_block_type_1 !== (current_block_type_1 = select_block_type_1(ctx))) {
    				if_block6.d(1);
    				if_block6 = current_block_type_1(ctx);

    				if (if_block6) {
    					if_block6.c();
    					if_block6.m(div11, t21);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(if_block3);
    			transition_in(if_block5);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(if_block3);
    			transition_out(if_block5);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(link0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(link1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(link2);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div12);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if_block4.d();
    			if (if_block5) if_block5.d();
    			if_block6.d();
    			run_all(dispose);
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

    const url = "";

    async function Fetch() {
    	let headers = new Headers();
    	headers.append("Accept", "application/json");
    	let form_data = new FormData();
    	let myFile = document.getElementById("FileForm").files[0];
    	form_data.append("file", myFile, "file.png");
    	response = await fetch(url, { method: "POST", headers, body: form_data }).then(response => response.json());
    }

    function instance($$self, $$props, $$invalidate) {
    	let nav_selected = "main";
    	const [send, receive] = crossfade({ duration: d => Math.sqrt(d * 500) });
    	let menu_visibility = 0;

    	function Menu() {
    		if (menu_visibility === 0) {
    			$$invalidate(1, menu_visibility = 1);
    		} else {
    			$$invalidate(1, menu_visibility = 0);
    		}
    	}

    	const click_handler = () => $$invalidate(0, nav_selected = "main");
    	const click_handler_1 = () => $$invalidate(0, nav_selected = "info");
    	const click_handler_2 = () => $$invalidate(0, nav_selected = "API");
    	const click_handler_3 = () => $$invalidate(0, nav_selected = "contacts");

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("nav_selected" in $$props) $$invalidate(0, nav_selected = $$props.nav_selected);
    		if ("menu_visibility" in $$props) $$invalidate(1, menu_visibility = $$props.menu_visibility);
    	};

    	return [
    		nav_selected,
    		menu_visibility,
    		send,
    		receive,
    		Menu,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
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

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
