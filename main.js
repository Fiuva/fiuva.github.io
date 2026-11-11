/* ==========================================================================
   FIUVA LABS — Site interactions
   Zero dependencies. Every module is a no-op on pages that lack its markup.
   ========================================================================== */

(() => {
    'use strict';

    const root = document.documentElement;
    const THEME_KEY = 'fiuva_theme_v2';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const storage = {
        get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
        set(key, value) { try { localStorage.setItem(key, value); } catch (_) { /* private mode */ } }
    };

    /* ----------------------------------------------------------------------
       1. THEME (saved choice > system preference). The <head> snippet applies
          it before first paint; this keeps older pages without it in sync.
       ---------------------------------------------------------------------- */
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    const resolveTheme = () => storage.get(THEME_KEY) || (systemDark.matches ? 'dark' : 'light');
    const applyTheme = (theme) => {
        root.setAttribute('data-theme', theme);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'dark' ? '#09090b' : '#f5f3ec');
    };
    applyTheme(resolveTheme());
    root.classList.add('js');

    const initThemeToggle = () => {
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            btn.addEventListener('click', () => {
                const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                applyTheme(next);
                storage.set(THEME_KEY, next);
            });
        }
        // Follow the OS while the visitor has not chosen explicitly.
        systemDark.addEventListener('change', () => {
            if (!storage.get(THEME_KEY)) applyTheme(resolveTheme());
        });
    };

    /* ----------------------------------------------------------------------
       2. LIVE PAMPLONA CLOCK (CET in winter, CEST in summer)
       ---------------------------------------------------------------------- */
    const initLiveClock = () => {
        const el = document.getElementById('pamplona-clock');
        if (!el) return;
        let fmt;
        try {
            fmt = new Intl.DateTimeFormat('es-ES', {
                timeZone: 'Europe/Madrid',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false, timeZoneName: 'short'
            });
        } catch (_) { return; }
        const update = () => {
            const parts = fmt.formatToParts(new Date());
            const pick = (type) => (parts.find((p) => p.type === type) || {}).value || '';
            el.textContent = `${pick('hour')}:${pick('minute')}:${pick('second')} ${pick('timeZoneName')}`;
        };
        update();
        setInterval(update, 1000);
    };

    /* ----------------------------------------------------------------------
       3. SCROLL REVEAL, CARD SPOTLIGHT & TEXT SCRAMBLE
       ---------------------------------------------------------------------- */
    const initReveal = () => {
        const reveals = document.querySelectorAll('[data-reveal]');
        if (!reveals.length) return;
        if (!('IntersectionObserver' in window) || reducedMotion.matches) {
            reveals.forEach((el) => el.classList.add('is-visible'));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });
        reveals.forEach((el) => io.observe(el));
    };

    const initSpotlight = () => {
        document.querySelectorAll('.project-showcase').forEach((card) => {
            card.addEventListener('pointermove', (e) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
                card.style.setProperty('--my', `${e.clientY - rect.top}px`);
            }, { passive: true });
        });
    };

    const initScramble = () => {
        if (reducedMotion.matches) return;
        const glyphs = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ/_+#';
        document.querySelectorAll('[data-scramble]').forEach((el) => {
            const original = el.textContent;
            let timer = null;
            el.addEventListener('mouseenter', () => {
                let iter = 0;
                clearInterval(timer);
                timer = setInterval(() => {
                    el.textContent = original
                        .split('')
                        .map((ch, idx) => {
                            if (ch === ' ') return ' ';
                            if (idx < iter) return original[idx];
                            return glyphs[Math.floor(Math.random() * glyphs.length)];
                        })
                        .join('');
                    iter += 0.6;
                    if (iter >= original.length) {
                        el.textContent = original;
                        clearInterval(timer);
                    }
                }, 22);
            });
        });
    };

    /* ----------------------------------------------------------------------
       4. HERO SAMPLER — "Fig. 1": the studio logo resolved out of noise,
          the way a diffusion model samples an image. Every dot is one pixel
          of the logo: it starts at x_T (pure Gaussian noise) and is pulled
          to its place as the noise level sigma decays to zero. The pointer
          re-injects noise locally and the field denoises again.
       ---------------------------------------------------------------------- */
    const initSampler = () => {
        const canvas = document.getElementById('sampler-canvas');
        if (!canvas) return;
        const figure = canvas.closest('.sampler');
        const stage = canvas.parentElement;
        const readout = document.getElementById('sampler-readout');
        const button = document.getElementById('sampler-btn');
        const ctx = canvas.getContext('2d');

        const GRID = 116;          // logo is sampled on a GRID x GRID lattice
        const STEPS = 50;          // sampler steps shown in the readout
        const DURATION = 3600;     // ms from x_T to x_0
        const INSET = 0.07;        // margin around the logo inside the stage

        let particles = [];
        let size = 0, dpr = 1;
        let ink = [20, 20, 19];
        let startTime = 0;
        let running = false;
        let visible = true;
        let lastStep = -1;
        const pointer = { x: -9999, y: -9999, active: false };

        const gauss = () => {
            // Box–Muller transform
            const u = 1 - Math.random(), v = Math.random();
            return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        };

        const readInk = () => {
            const raw = getComputedStyle(root).getPropertyValue('--ink-rgb').split(',').map((n) => parseInt(n, 10));
            if (raw.length === 3 && raw.every((n) => !Number.isNaN(n))) ink = raw;
        };

        const resize = () => {
            const w = stage.clientWidth;
            if (!w) return;
            size = w;
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(size * dpr);
            canvas.height = Math.round(size * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const renoise = () => {
            for (const p of particles) {
                p.nx = gauss();
                p.ny = gauss();
                p.heat = 0;
            }
        };

        const setReadout = (step) => {
            if (!readout || step === lastStep) return;
            lastStep = step;
            readout.textContent = step >= STEPS
                ? `x₀ · ${STEPS}/${STEPS}`
                : `paso ${String(step).padStart(2, '0')}/${STEPS}`;
        };

        const draw = (now) => {
            const progress = reducedMotion.matches ? 1 : Math.min(1, (now - startTime) / DURATION);
            // Noise schedule: fast early clean-up, long gentle tail.
            const sigma = Math.pow(1 - progress, 2.2);
            setReadout(Math.round(progress * STEPS));

            ctx.clearRect(0, 0, size, size);
            const span = size * (1 - INSET * 2);
            const origin = size * INSET;
            const cell = span / GRID;
            const dot = Math.max(1.4, cell * 0.8);
            const spread = size * 0.36;
            const reach = size * 0.2;
            const reachSq = reach * reach;
            let hot = false;

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                const tx = origin + p.u * span;
                const ty = origin + p.v * span;

                if (pointer.active) {
                    const dx = tx - pointer.x, dy = ty - pointer.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < reachSq) {
                        const push = (1 - Math.sqrt(d2) / reach) * 0.34;
                        if (push > p.heat) p.heat = push;
                    }
                }

                // Each dot settles at its own pace, so the image "condenses".
                let s = sigma * (0.7 + p.k * 0.6);
                if (s > 1) s = 1;
                if (p.heat > s) s = p.heat;
                if (p.heat > 0.002) { p.heat *= 0.93; hot = true; } else { p.heat = 0; }

                const shake = s > 0.01 ? s * 10 : 0;
                const x = tx + p.nx * s * spread + (Math.random() - 0.5) * shake;
                const y = ty + p.ny * s * spread + (Math.random() - 0.5) * shake;

                // Colour emerges as the noise leaves: ink first, pigment last.
                const c = s <= 0.04 ? 1 : s >= 0.5 ? 0 : 1 - (s - 0.04) / 0.46;
                if (c >= 1) {
                    ctx.fillStyle = p.css;
                } else {
                    const r = Math.round(ink[0] + (p.r - ink[0]) * c);
                    const g = Math.round(ink[1] + (p.g - ink[1]) * c);
                    const b = Math.round(ink[2] + (p.b - ink[2]) * c);
                    ctx.fillStyle = `rgb(${r},${g},${b})`;
                }
                ctx.globalAlpha = 0.28 + 0.72 * (1 - s);
                ctx.fillRect(x - dot / 2, y - dot / 2, dot, dot);
            }
            ctx.globalAlpha = 1;
            return progress < 1 || hot || pointer.active;
        };

        const frame = (now) => {
            if (!running) return;
            const keepGoing = draw(now);
            if (keepGoing && visible) {
                requestAnimationFrame(frame);
            } else {
                running = false;
            }
        };

        const wake = () => {
            if (running || !particles.length || !visible) return;
            running = true;
            requestAnimationFrame(frame);
        };

        const resample = () => {
            renoise();
            lastStep = -1;
            startTime = performance.now();
            wake();
        };

        const build = (img) => {
            const probe = document.createElement('canvas');
            probe.width = GRID;
            probe.height = GRID;
            const pctx = probe.getContext('2d', { willReadFrequently: true });
            pctx.imageSmoothingQuality = 'high';
            pctx.drawImage(img, 0, 0, GRID, GRID);
            const data = pctx.getImageData(0, 0, GRID, GRID).data; // throws if tainted (file://)

            for (let y = 0; y < GRID; y++) {
                for (let x = 0; x < GRID; x++) {
                    const i = (y * GRID + x) * 4;
                    if (data[i + 3] < 110) continue;
                    const r = data[i], g = data[i + 1], b = data[i + 2];
                    particles.push({
                        u: (x + 0.5) / GRID, v: (y + 0.5) / GRID,
                        r, g, b, css: `rgb(${r},${g},${b})`,
                        nx: 0, ny: 0, k: Math.random(), heat: 0
                    });
                }
            }
            if (!particles.length) return;

            readInk();
            resize();
            figure.classList.add('is-live');
            resample();
        };

        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
            try { build(img); } catch (_) { particles = []; /* keep the static logo */ }
        };
        img.src = canvas.dataset.src;

        // Pointer adds noise; leaving lets it settle.
        stage.addEventListener('pointermove', (e) => {
            const rect = stage.getBoundingClientRect();
            pointer.x = e.clientX - rect.left;
            pointer.y = e.clientY - rect.top;
            pointer.active = true;
            wake();
        }, { passive: true });
        const release = () => { pointer.active = false; };
        stage.addEventListener('pointerleave', release);
        stage.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') release(); });
        stage.addEventListener('pointercancel', release);
        stage.addEventListener('click', resample);
        if (button) button.addEventListener('click', resample);

        if ('ResizeObserver' in window) {
            new ResizeObserver(() => {
                const before = size;
                resize();
                if (size !== before && particles.length && !running) draw(performance.now());
            }).observe(stage);
        }
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([entry]) => {
                visible = entry.isIntersecting;
                if (visible) wake();
            }).observe(stage);
        }
        new MutationObserver(() => {
            readInk();
            if (particles.length && !running) draw(performance.now());
        }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    };

    /* ----------------------------------------------------------------------
       5. CATALOG: status filter, today's date on the Dayli plate, and
          pausing SVG motifs for visitors who prefer reduced motion
       ---------------------------------------------------------------------- */
    const initCatalog = () => {
        const filterBtns = document.querySelectorAll('.filter-pill-btn');
        const plates = document.querySelectorAll('.plate[data-status]');
        if (filterBtns.length && plates.length) {
            filterBtns.forEach((btn) => {
                btn.addEventListener('click', () => {
                    const filter = btn.dataset.filter;
                    filterBtns.forEach((b) => {
                        const on = b === btn;
                        b.classList.toggle('active', on);
                        b.setAttribute('aria-pressed', String(on));
                    });
                    let shown = 0;
                    plates.forEach((plate) => {
                        const show = filter === 'all' || plate.dataset.status === filter;
                        plate.hidden = !show;
                        if (show) {
                            plate.classList.add('is-visible');
                            // Keep the art alternating left/right among visible plates.
                            plate.classList.toggle('plate--flip', shown % 2 === 1);
                            shown++;
                        }
                    });
                });
            });
        }

        const weekdayEl = document.querySelector('[data-today="weekday"]');
        const dateEl = document.querySelector('[data-today="date"]');
        if (weekdayEl && dateEl) {
            try {
                const now = new Date();
                const weekday = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(now);
                const date = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(now);
                weekdayEl.textContent = `Hoy, ${weekday}`;
                dateEl.textContent = date;
            } catch (_) { /* keep the static fallback */ }
        }

        if (reducedMotion.matches) {
            document.querySelectorAll('svg.art-motif').forEach((svg) => {
                if (typeof svg.pauseAnimations === 'function') svg.pauseAnimations();
            });
        }
    };

    /* ----------------------------------------------------------------------
       6. NAV: highlight the section currently in view (in-page links only)
       ---------------------------------------------------------------------- */
    const initScrollSpy = () => {
        if (!('IntersectionObserver' in window)) return;
        const links = [...document.querySelectorAll('.nav-cluster .nav-item[href^="#"]')];
        const pairs = links
            .map((link) => ({ link, section: document.getElementById(link.getAttribute('href').slice(1)) }))
            .filter((pair) => pair.section);
        if (pairs.length < 2) return;
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                pairs.forEach(({ link, section }) => link.classList.toggle('active', section === entry.target));
            });
        }, { rootMargin: '-35% 0px -60% 0px' });
        pairs.forEach(({ section }) => io.observe(section));
    };

    /* ----------------------------------------------------------------------
       7. SMALL DELIGHTS: flask shake (about) & laboratory map pins (Platypus)
       ---------------------------------------------------------------------- */
    const initFlaskEasterEgg = () => {
        const trigger = document.getElementById('flask-trigger');
        const box = document.getElementById('flask-box');
        const statusEl = document.getElementById('flask-status-text');
        if (!trigger || !box) return;

        const messages = [
            statusEl ? statusEl.textContent : 'LAB STATUS: ESTABLE',
            'ORNITORRINCO: HIDRATADO',
            'EMBEDDINGGEMMA: ONLINE',
            'UPNA PHD: ENTRENANDO DIFUSIÓN',
            'BEENET-8 CQT: < 0.8 CENTS',
            '4.180 CARTAS EN MEMORIA'
        ];
        let idx = 0;
        trigger.addEventListener('click', () => {
            box.classList.remove('shaking');
            void box.offsetWidth;
            box.classList.add('shaking');
            idx = (idx + 1) % messages.length;
            if (statusEl) statusEl.textContent = messages[idx];
        });
    };

    const initLabPins = () => {
        const labPins = document.querySelectorAll('.lab-pin');
        if (!labPins.length) return;
        const activate = (pin) => labPins.forEach((p) => p.classList.toggle('active', p === pin));
        labPins.forEach((pin) => {
            pin.addEventListener('mouseenter', () => activate(pin));
            pin.addEventListener('click', () => activate(pin));
        });
    };

    /* ----------------------------------------------------------------------
       BOOT
       ---------------------------------------------------------------------- */
    const boot = () => {
        initThemeToggle();
        initLiveClock();
        initReveal();
        initSpotlight();
        initScramble();
        initSampler();
        initCatalog();
        initScrollSpy();
        initFlaskEasterEgg();
        initLabPins();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
