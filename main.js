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

        // Mouse spotlight tracking on .project-showcase and .bento-panel
        document.querySelectorAll('.project-showcase, .bento-panel').forEach((card) => {
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
       7. SANDBOX 01: HOW TO BUILD A PLATYPUS (7 Laboratory Tables Pins)
       ---------------------------------------------------------------------- */
    const initPlatypusSandbox = () => {
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
       8. SANDBOX 02: SOY UNA LÍNEA (Interactive Notebook Stick-Runner)
       ---------------------------------------------------------------------- */
    const initSoyUnaLineaSandbox = () => {
        const canvas = document.getElementById('linea-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const timerEl = document.getElementById('linea-timer');

        let w = 0, h = 0, dpr = 1;
        const resize = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = rect.width;
            h = rect.height;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize, { passive: true });

        const groundY = () => h - 34;
        const player = { x: 64, y: 0, vy: 0, jumping: false, flyMode: false };
        const obstacles = [{ x: 260, w: 16, h: 24 }, { x: 440, w: 18, h: 28 }];
        const lasers = [];
        let pointer = { x: 220, y: 80, active: false };
        let startTime = performance.now();

        const jump = () => {
            if (!player.jumping) {
                player.vy = -8.2;
                player.jumping = true;
            }
        };

        canvas.parentElement.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const tx = e.clientX - rect.left;
            const ty = e.clientY - rect.top;
            jump();
            lasers.push({ x: player.x + 6, y: player.y - 36, tx, ty, life: 1 });
        });

        canvas.parentElement.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            pointer.x = e.clientX - rect.left;
            pointer.y = e.clientY - rect.top;
            pointer.active = true;
        }, { passive: true });

        canvas.parentElement.addEventListener('mouseleave', () => {
            pointer.active = false;
        });

        let tickCount = 0;
        const loop = (now) => {
            tickCount++;
            ctx.clearRect(0, 0, w, h);

            // 1. Notebook grid background
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, w, h);

            ctx.strokeStyle = 'rgba(59, 130, 246, 0.16)';
            ctx.lineWidth = 1;
            const grid = 20;
            for (let gx = (tickCount * -2.2) % grid; gx < w; gx += grid) {
                ctx.beginPath();
                ctx.moveTo(gx, 0);
                ctx.lineTo(gx, h);
                ctx.stroke();
            }
            for (let gy = 0; gy < h; gy += grid) {
                ctx.beginPath();
                ctx.moveTo(0, gy);
                ctx.lineTo(w, gy);
                ctx.stroke();
            }

            // Red notebook margin line
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
            ctx.beginPath();
            ctx.moveTo(36, 0);
            ctx.lineTo(36, h);
            ctx.stroke();

            const gy = groundY();

            // Hand-drawn ground line
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(w, gy);
            ctx.stroke();

            // Update & draw spikes
            for (let i = 0; i < obstacles.length; i++) {
                const ob = obstacles[i];
                ob.x -= 3.2;
                if (ob.x < -30) {
                    ob.x = w + 60 + Math.random() * 90;
                }
                // Auto-reflex jump if user isn't manually jumping right now
                if (ob.x - player.x > 18 && ob.x - player.x < 52 && !player.jumping) {
                    jump();
                }

                // Draw hand-drawn triangle spike
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(ob.x, gy);
                ctx.lineTo(ob.x + ob.w * 0.5, gy - ob.h);
                ctx.lineTo(ob.x + ob.w, gy);
                ctx.closePath();
                ctx.stroke();
            }

            // Player physics
            if (player.y === 0) player.y = gy;
            player.vy += 0.44;
            player.y += player.vy;
            if (player.y >= gy) {
                player.y = gy;
                player.vy = 0;
                player.jumping = false;
            }

            // Draw stick figure (matching soy_linea_icon.png)
            const px = player.x;
            const py = player.y;
            const stride = player.jumping ? 7 : Math.sin(tickCount * 0.28) * 9;

            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';

            // Head
            ctx.beginPath();
            ctx.arc(px, py - 38, 9, 0, Math.PI * 2);
            ctx.stroke();

            // Eyes
            ctx.beginPath();
            ctx.moveTo(px + 2, py - 41);
            ctx.lineTo(px + 2, py - 36);
            ctx.moveTo(px + 5, py - 40);
            ctx.lineTo(px + 5, py - 37);
            ctx.stroke();

            // Torso
            ctx.beginPath();
            ctx.moveTo(px, py - 29);
            ctx.lineTo(px, py - 10);
            ctx.stroke();

            // Arms
            ctx.beginPath();
            ctx.moveTo(px, py - 23);
            ctx.lineTo(px + 11, py - 18 + stride * 0.3);
            ctx.moveTo(px, py - 21);
            ctx.lineTo(px - 9, py - 16 - stride * 0.3);
            ctx.stroke();

            // Legs
            ctx.beginPath();
            ctx.moveTo(px, py - 10);
            ctx.lineTo(px + stride, py);
            ctx.moveTo(px, py - 10);
            ctx.lineTo(px - stride, py);
            ctx.stroke();

            // Eye laser if pointer is active or clicked
            if (pointer.active && tickCount % 45 < 8) {
                lasers.push({ x: px + 5, y: py - 38, tx: pointer.x, ty: pointer.y, life: 0.7 });
            }

            for (let i = lasers.length - 1; i >= 0; i--) {
                const l = lasers[i];
                ctx.strokeStyle = `rgba(239, 68, 68, ${l.life.toFixed(2)})`;
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(px + 5, py - 38);
                ctx.lineTo(l.tx, l.ty);
                ctx.stroke();
                l.life -= 0.08;
                if (l.life <= 0) lasers.splice(i, 1);
            }

            // Update speedrun timer
            if (timerEl) {
                const elapsed = ((now - startTime) / 1000) % 60;
                timerEl.textContent = `00:${elapsed.toFixed(3).padStart(6, '0')}`;
            }

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    };

    /* ----------------------------------------------------------------------
       9. SANDBOX 03: BEETUNE (Polyphonic 6-String Tuner + Web Audio Synth)
       ---------------------------------------------------------------------- */
    const initBeeTuneSandbox = () => {
        const rows = document.querySelectorAll('.guitar-string-row');
        const noteEl = document.getElementById('tuner-note');
        const freqEl = document.getElementById('tuner-freq');
        const centsBar = document.getElementById('tuner-cents-dot');
        const strumBtn = document.getElementById('strum-all-btn');
        if (!rows.length) return;

        let audioCtx = null;

        const playPluck = (freq) => {
            try {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (!AudioContextClass) return;
                if (!audioCtx) audioCtx = new AudioContextClass();
                if (audioCtx.state === 'suspended') audioCtx.resume();

                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

                gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0008, audioCtx.currentTime + 1.15);

                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 1.2);
            } catch (_) {
                // Ignore audio errors if blocked by browser autoplay policy
            }
        };

        const activateString = (row, withSound = false, tuneOnClick = false) => {
            const note = row.dataset.note;
            const baseFreq = parseFloat(row.dataset.freq);
            let cents = parseFloat(row.dataset.cents || '0');
            const statusEl = row.querySelector('.string-status');

            // If user clicks an out-of-tune string directly, calibrate it to OK (0c)
            if (tuneOnClick && cents !== 0) {
                cents = 0;
                row.dataset.cents = '0';
                row.dataset.state = 'ok';
                if (statusEl) {
                    statusEl.textContent = 'OK';
                    statusEl.className = 'string-status ok';
                }
            }

            row.classList.remove('plucked');
            void row.offsetWidth;
            row.classList.add('plucked');

            const actualFreq = baseFreq * Math.pow(2, cents / 1200);
            const centsLabel = cents === 0 ? 'OK (0.0c)' : (cents > 0 ? `+${cents}c` : `${cents}c`);

            if (noteEl) noteEl.textContent = note;
            if (freqEl) freqEl.textContent = `${actualFreq.toFixed(1)} Hz · ${centsLabel}`;
            if (centsBar) {
                const offsetPx = Math.max(-42, Math.min(42, cents * 2.2));
                centsBar.style.transform = `translateX(${offsetPx.toFixed(1)}px)`;
                centsBar.style.backgroundColor =
                    cents === 0 ? 'var(--emerald)' : (cents < 0 ? 'var(--amber)' : 'var(--accent)');
            }
            if (withSound && actualFreq) playPluck(actualFreq);
        };

        rows.forEach((row) => {
            row.addEventListener('mouseenter', () => activateString(row, false, false));
            row.addEventListener('click', () => activateString(row, true, true));
        });

        if (strumBtn) {
            strumBtn.addEventListener('click', () => {
                // Reset polyphonic showcase state on full strum (-11c on D3, +14c on B3)
                rows.forEach((row) => {
                    const note = row.dataset.note;
                    const statusEl = row.querySelector('.string-status');
                    if (note === 'D3') {
                        row.dataset.cents = '-11';
                        row.dataset.state = 'flat';
                        if (statusEl) { statusEl.textContent = '-11c'; statusEl.className = 'string-status flat'; }
                    } else if (note === 'B3') {
                        row.dataset.cents = '14';
                        row.dataset.state = 'sharp';
                        if (statusEl) { statusEl.textContent = '+14c'; statusEl.className = 'string-status sharp'; }
                    } else {
                        row.dataset.cents = '0';
                        row.dataset.state = 'ok';
                        if (statusEl) { statusEl.textContent = 'OK'; statusEl.className = 'string-status ok'; }
                    }
                });
                rows.forEach((row, idx) => {
                    setTimeout(() => activateString(row, true, false), idx * 65);
                });
            });
        }
    };

    /* ----------------------------------------------------------------------
       10. SANDBOX 04: BIRDIA (Real-Time Acoustic Spectrogram Canvas)
       ---------------------------------------------------------------------- */
    const initBirdiaSpectrogram = () => {
        const canvas = document.getElementById('birdia-spec-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const commonEl = document.getElementById('birdia-common-name');
        const latinEl = document.getElementById('birdia-latin-name');
        const confEl = document.getElementById('birdia-conf');

        const species = [
            { common: 'Petirrojo europeo', latin: 'Erithacus rubecula', conf: '98.4%', peak: 0.35 },
            { common: 'Ruiseñor común', latin: 'Luscinia megarhynchos', conf: '96.9%', peak: 0.55 },
            { common: 'Mirlo común', latin: 'Turdus merula', conf: '95.2%', peak: 0.22 },
            { common: 'Herrerillo común', latin: 'Cyanistes caeruleus', conf: '94.7%', peak: 0.78 }
        ];

        let w = 0, h = 0, dpr = 1;
        const resize = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = rect.width;
            h = rect.height;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize, { passive: true });

        let targetPeak = 0.35;
        canvas.parentElement.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const ratio = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
            targetPeak = ratio;
            const idx = Math.min(species.length - 1, Math.floor(ratio * species.length));
            const sp = species[idx];
            if (commonEl) commonEl.textContent = sp.common;
            if (latinEl) latinEl.textContent = sp.latin;
            if (confEl) confEl.textContent = sp.conf;
        }, { passive: true });

        let phase = 0;
        const bars = 42;
        const draw = () => {
            phase += 0.06;
            ctx.clearRect(0, 0, w, h);

            // Subtle frequency reference lines
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.1)';
            ctx.lineWidth = 1;
            for (let y = 24; y < h; y += 28) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }

            const barW = (w - 24) / bars;
            for (let i = 0; i < bars; i++) {
                const norm = i / bars;
                const dist = Math.abs(norm - targetPeak);
                const harmonic = Math.exp(-dist * dist * 18);
                const chirp = Math.sin(phase * 2.2 + i * 0.45) * 0.5 + 0.5;
                const amp = Math.max(0.08, Math.min(0.95, harmonic * 0.68 + chirp * 0.28));

                const bh = amp * (h - 28);
                const x = 12 + i * barW;
                const y = h - bh - 10;

                const grad = ctx.createLinearGradient(0, y, 0, h);
                grad.addColorStop(0, '#34d399');
                grad.addColorStop(0.6, '#10b981');
                grad.addColorStop(1, 'rgba(16, 185, 129, 0.15)');

                ctx.fillStyle = grad;
                ctx.fillRect(x, y, Math.max(2, barW - 3), bh);
            }

            requestAnimationFrame(draw);
        };
        requestAnimationFrame(draw);
    };

    /* ----------------------------------------------------------------------
       11. SANDBOX 05: DAYLI (RAE Word of the Day & Ephemeris Switcher)
       ---------------------------------------------------------------------- */
    const initDayliSandbox = () => {
        const card = document.getElementById('dayli-interactive-card');
        const dateEl = document.getElementById('dayli-date-badge');
        const kindEl = document.getElementById('dayli-kind-badge');
        const wordEl = document.getElementById('dayli-title');
        const defEl = document.getElementById('dayli-desc');
        if (!card || !wordEl || !defEl) return;

        // Dynamic real current date
        if (dateEl) {
            const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
            const d = new Date();
            dateEl.textContent = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
        }

        const entries = [
            {
                kind: 'PALABRA DEL DÍA · RAE',
                title: 'Serendipia',
                desc: 'f. Hallazgo valioso que se produce de manera accidental o casual, como descubrir un ornitorrinco buscando nutrias.'
            },
            {
                kind: 'PALABRA DEL DÍA · RAE',
                title: 'Arrebol',
                desc: 'm. Color rojo que se advierte en las nubes iluminadas por los rayos del sol, especialmente al amanecer o a la caída de la tarde.'
            },
            {
                kind: 'EFEMÉRIDE CIENTÍFICA',
                title: '1867 · Marie Curie',
                desc: 'Nace en Varsovia la física y química pionera en el estudio de la radiactividad y primera persona en recibir dos Premios Nobel.'
            },
            {
                kind: 'PALABRA DEL DÍA · RAE',
                title: 'Ataraxia',
                desc: 'f. Fil. Imperturbabilidad, serenidad de ánimo frente al código que compila a la primera.'
            }
        ];

        let idx = 0;
        card.addEventListener('click', () => {
            idx = (idx + 1) % entries.length;
            const item = entries[idx];
            if (kindEl) kindEl.textContent = item.kind;
            wordEl.textContent = item.title;
            defEl.textContent = item.desc;
        });
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
        initPlatypusSandbox();
        initSoyUnaLineaSandbox();
        initBeeTuneSandbox();
        initBirdiaSpectrogram();
        initDayliSandbox();
    });
})();
