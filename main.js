/* ==========================================================================
   FIUVA LABS — Interactive Physics, Canvas & Micro-Simulations Engine
   Zero external dependencies. 60fps native requestAnimationFrame.
   ========================================================================== */

(() => {
    'use strict';

    /* ----------------------------------------------------------------------
       1. THEME CONTROLLER (Carbon Dark / Archival Paper Light)
       ---------------------------------------------------------------------- */
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('fiuva_theme_v2') || 'light';
    root.setAttribute('data-theme', savedTheme);

    const initThemeToggle = () => {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            localStorage.setItem('fiuva_theme_v2', next);
        });
    };

    /* ----------------------------------------------------------------------
       2. LIVE PAMPLONA CLOCK (UPNA Research Location)
       ---------------------------------------------------------------------- */
    const initLiveClock = () => {
        const el = document.getElementById('pamplona-clock');
        if (!el) return;
        const update = () => {
            try {
                const now = new Date();
                const timeStr = now.toLocaleTimeString('es-ES', {
                    timeZone: 'Europe/Madrid',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
                el.textContent = `${timeStr} CET`;
            } catch (_) {
                const now = new Date();
                el.textContent = now.toTimeString().slice(0, 8);
            }
        };
        update();
        setInterval(update, 1000);
    };

    /* ----------------------------------------------------------------------
       3. SPRING-PHYSICS CUSTOM CURSOR & MAGNETIC ELEMENTS
       ---------------------------------------------------------------------- */
    const initCustomCursor = () => {
        if (window.matchMedia('(pointer: coarse)').matches) return;

        const dot = document.querySelector('.cursor-dot');
        const ring = document.querySelector('.cursor-ring');
        if (!dot || !ring) return;

        let mouseX = -100, mouseY = -100;
        let ringX = -100, ringY = -100;

        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
        }, { passive: true });

        const tick = () => {
            ringX += (mouseX - ringX) * 0.18;
            ringY += (mouseY - ringY) * 0.18;
            ring.style.transform = `translate3d(${ringX.toFixed(2)}px, ${ringY.toFixed(2)}px, 0)`;
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);

        // Hover states on interactive elements
        document.querySelectorAll('a, button').forEach((el) => {
            el.addEventListener('mouseenter', () => {
                document.body.classList.add('cursor-hover');
            });
            el.addEventListener('mouseleave', () => {
                document.body.classList.remove('cursor-hover');
            });
        });

        // Subtle magnetic pull on [data-magnetic]
        document.querySelectorAll('[data-magnetic]').forEach((el) => {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const dx = e.clientX - (rect.left + rect.width / 2);
                const dy = e.clientY - (rect.top + rect.height / 2);
                el.style.transform = `translate3d(${(dx * 0.18).toFixed(1)}px, ${(dy * 0.18).toFixed(1)}px, 0)`;
            });
            el.addEventListener('mouseleave', () => {
                el.style.transform = '';
            });
        });
    };

    /* ----------------------------------------------------------------------
       4. SCROLL REVEAL & SPOTLIGHT CARDS + TEXT SCRAMBLE
       ---------------------------------------------------------------------- */
    const initRevealAndSpotlights = () => {
        const reveals = document.querySelectorAll('[data-reveal]');
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        io.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
            reveals.forEach((el) => io.observe(el));
        } else {
            reveals.forEach((el) => el.classList.add('is-visible'));
        }

        // Mouse spotlight tracking on .project-showcase, .app-editorial-card and .bento-panel
        document.querySelectorAll('.project-showcase, .app-editorial-card, .bento-panel').forEach((card) => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
                card.style.setProperty('--my', `${e.clientY - rect.top}px`);
            }, { passive: true });
        });

        // Monospace text cipher scramble on [data-scramble]
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
       5. HERO INTERACTIVE LATENT DIFFUSION VECTOR FIELD (#latent-canvas)
       ---------------------------------------------------------------------- */
    const initLatentCanvas = () => {
        const canvas = document.getElementById('latent-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const telemetryEl = document.getElementById('latent-telemetry');
        const pulseBtn = document.getElementById('latent-pulse-btn');

        let width = 0, height = 0, dpr = 1;
        let cols = 0, rows = 0;
        const spacing = 36;
        let nodes = [];

        const pointer = { x: -999, y: -999, vx: 0, vy: 0, lastX: 0, lastY: 0 };
        const waves = []; // Radial denoising waves { x, y, radius, alpha }

        const resize = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = rect.width;
            height = rect.height;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            cols = Math.ceil(width / spacing);
            rows = Math.ceil(height / spacing);
            nodes = [];
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const x = c * spacing + spacing * 0.5;
                    const y = r * spacing + spacing * 0.5;
                    nodes.push({
                        ox: x,
                        oy: y,
                        angle: Math.atan2(y - height * 0.5, x - width * 0.5),
                        va: 0,
                        energy: 0
                    });
                }
            }
        };

        resize();
        window.addEventListener('resize', resize, { passive: true });

        const triggerWave = (x, y) => {
            waves.push({ x, y, radius: 10, maxRadius: Math.hypot(width, height) * 0.75, alpha: 1 });
        };

        canvas.parentElement.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const nx = e.clientX - rect.left;
            const ny = e.clientY - rect.top;
            pointer.vx = nx - pointer.lastX;
            pointer.vy = ny - pointer.lastY;
            pointer.lastX = pointer.x = nx;
            pointer.lastY = pointer.y = ny;
        }, { passive: true });

        canvas.parentElement.addEventListener('mouseleave', () => {
            pointer.x = -999;
            pointer.y = -999;
        });

        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            triggerWave(e.clientX - rect.left, e.clientY - rect.top);
        });

        if (pulseBtn) {
            pulseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                triggerWave(width * 0.5, height * 0.5);
            });
        }

        let t = 0;
        const render = () => {
            t += 0.012;
            ctx.clearRect(0, 0, width, height);

            const isLight = root.getAttribute('data-theme') === 'light';
            const baseStroke = isLight ? 'rgba(20, 20, 19, 0.14)' : 'rgba(244, 243, 238, 0.11)';

            // Update waves
            for (let i = waves.length - 1; i >= 0; i--) {
                const w = waves[i];
                w.radius += 11;
                w.alpha = Math.max(0, 1 - w.radius / w.maxRadius);
                if (w.alpha <= 0.01) waves.splice(i, 1);
            }

            let totalEnergy = 0;

            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                // Smooth harmonic flow field
                const targetAngle =
                    Math.sin(n.ox * 0.0045 + t) * Math.cos(n.oy * 0.0045 - t * 0.7) * Math.PI;

                // Cursor perturbation
                const dx = pointer.x - n.ox;
                const dy = pointer.y - n.oy;
                const distSq = dx * dx + dy * dy;
                const radiusSq = 190 * 190;

                if (distSq < radiusSq) {
                    const dist = Math.sqrt(distSq) || 1;
                    const factor = (1 - dist / 190);
                    const cursorAngle = Math.atan2(dy, dx) + Math.PI * 0.5;
                    let diff = cursorAngle - n.angle;
                    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                    n.va += diff * factor * 0.12;
                    n.energy = Math.min(1, n.energy + factor * 0.16);
                }

                // Wave perturbation
                for (let w = 0; w < waves.length; w++) {
                    const wave = waves[w];
                    const wDist = Math.hypot(n.ox - wave.x, n.oy - wave.y);
                    const band = Math.abs(wDist - wave.radius);
                    if (band < 48) {
                        const boost = (1 - band / 48) * wave.alpha;
                        n.energy = Math.min(1, n.energy + boost * 0.55);
                        n.va += boost * 0.18;
                    }
                }

                // Spring towards harmonic field
                let dAngle = targetAngle - n.angle;
                dAngle = Math.atan2(Math.sin(dAngle), Math.cos(dAngle));
                n.va += dAngle * 0.04;
                n.va *= 0.86;
                n.angle += n.va;
                n.energy *= 0.94;
                totalEnergy += n.energy;

                const len = 7 + n.energy * 9;
                const cos = Math.cos(n.angle) * len;
                const sin = Math.sin(n.angle) * len;

                ctx.beginPath();
                ctx.moveTo(n.ox - cos * 0.5, n.oy - sin * 0.5);
                ctx.lineTo(n.ox + cos * 0.5, n.oy + sin * 0.5);

                if (n.energy > 0.08) {
                    ctx.strokeStyle = `rgba(255, 77, 28, ${(0.22 + n.energy * 0.75).toFixed(2)})`;
                    ctx.lineWidth = 1.6;
                } else {
                    ctx.strokeStyle = baseStroke;
                    ctx.lineWidth = 1;
                }
                ctx.stroke();
            }

            // Draw active denoising wave rings
            for (let w = 0; w < waves.length; w++) {
                const wave = waves[w];
                ctx.beginPath();
                ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 77, 28, ${(wave.alpha * 0.35).toFixed(2)})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            if (telemetryEl && Math.random() < 0.25) {
                const normE = Math.min(99.9, (totalEnergy / (nodes.length || 1)) * 600).toFixed(1);
                telemetryEl.textContent = `LATENT FIELD // σ=${normE}%`;
            }

            requestAnimationFrame(render);
        };

        requestAnimationFrame(render);
    };

    /* ----------------------------------------------------------------------
       6. HERO FLASK EASTER EGG (Shake the Platypus Flask)
       ---------------------------------------------------------------------- */
    const initFlaskEasterEgg = () => {
        const stage = document.getElementById('flask-trigger');
        const box = document.getElementById('flask-box');
        const statusEl = document.getElementById('flask-status-text');
        if (!stage || !box) return;

        const messages = [
            'LAB STATUS: ESTABLE',
            'ORNITORRINCO: HIDRATADO',
            'EMBEDDINGGEMMA: ONLINE',
            'UPNA PHD: ENTRENANDO DIFUSIÓN',
            'BEENET-8 CQT: < 0.8 CENTS',
            '4.180 CARTAS EN MEMORIA'
        ];
        let idx = 0;

        stage.addEventListener('click', () => {
            box.classList.remove('shaking');
            void box.offsetWidth;
            box.classList.add('shaking');
            idx = (idx + 1) % messages.length;
            if (statusEl) statusEl.textContent = messages[idx];
        });
    };

    /* ----------------------------------------------------------------------
       7. CATALOG FILTER TABS & LABORATORY TABLE PINS
       ---------------------------------------------------------------------- */
    const initCatalogAndPins = () => {
        // Filter buttons on index.html
        const filterBtns = document.querySelectorAll('.filter-pill-btn');
        const cards = document.querySelectorAll('.app-editorial-card');
        const groupHeaders = document.querySelectorAll('.catalog-group-header');

        if (filterBtns.length && cards.length) {
            filterBtns.forEach((btn) => {
                btn.addEventListener('click', () => {
                    const filter = btn.dataset.filter;
                    filterBtns.forEach((b) => b.classList.toggle('active', b === btn));

                    cards.forEach((card) => {
                        const status = card.dataset.status;
                        const show = filter === 'all' || status === filter;
                        card.style.display = show ? '' : 'none';
                    });

                    groupHeaders.forEach((header) => {
                        const grp = header.dataset.group;
                        if (filter === 'all') {
                            header.style.display = '';
                        } else if (filter === 'beta') {
                            header.style.display = grp === 'beta' ? '' : 'none';
                        } else {
                            header.style.display = grp === 'prod' ? '' : 'none';
                        }
                    });
                });
            });
        }

        // Interactive pins on the 7 Laboratory Tables map (/BuildAPlatypus/)
        const labPins = document.querySelectorAll('.lab-pin');
        if (labPins.length) {
            labPins.forEach((pin) => {
                pin.addEventListener('mouseenter', () => {
                    labPins.forEach((p) => p.classList.remove('active'));
                    pin.classList.add('active');
                });
                pin.addEventListener('click', () => {
                    labPins.forEach((p) => p.classList.remove('active'));
                    pin.classList.add('active');
                });
            });
        }
    };

    /* ----------------------------------------------------------------------
       BOOT ALL MODULES ON DOM READY
       ---------------------------------------------------------------------- */
    document.addEventListener('DOMContentLoaded', () => {
        initThemeToggle();
        initLiveClock();
        initCustomCursor();
        initRevealAndSpotlights();
        initLatentCanvas();
        initFlaskEasterEgg();
        initCatalogAndPins();
    });
})();
