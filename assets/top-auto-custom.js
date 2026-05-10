/* =====================================================================
   Top Auto Aesthetics — Premium redesign interactions
   Custom cursor · Preloader · Reveals · Counters · Magnetic buttons
   Tilt · Reviews marquee · Gallery lightbox · Form mock · Nav effects
   ===================================================================== */

(function () {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = matchMedia('(pointer: coarse)').matches || innerWidth < 900;

  /* --------------------- Preloader --------------------- */
  function initPreloader() {
    const pre = $('#preloader');
    if (!pre) return;
    const fill = $('.ta-preloader__bar span', pre);
    const num  = $('[data-count]', pre);
    let p = 0;
    const tick = () => {
      p = Math.min(100, p + Math.random() * 9 + 3);
      if (fill) fill.style.width = p + '%';
      if (num) num.textContent = String(Math.floor(p)).padStart(2, '0');
      if (p < 100) setTimeout(tick, 90 + Math.random() * 90);
      else setTimeout(() => {
        pre.classList.add('is-done');
        setTimeout(() => pre.remove(), 900);
      }, 350);
    };
    // wait for first paint + fonts
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => requestAnimationFrame(tick));
    } else {
      requestAnimationFrame(tick);
    }
  }

  /* --------------------- Custom cursor (light-emitting) --------------------- */
  function initCursor() {
    if (isCoarse) return;
    const cur = $('#cursor');
    if (!cur) return;
    const dot   = $('.ta-cursor__dot',  cur);
    const ring  = $('.ta-cursor__ring', cur);
    const aura  = $('.ta-cursor__aura', cur);
    const halo  = $('.ta-cursor__halo', cur);

    // target (mouse)
    let tx = innerWidth / 2, ty = innerHeight / 2;
    // each layer has its own lag → spreading-light feel
    let dx = tx, dy = ty;       // dot   – tight
    let rx = tx, ry = ty;       // ring  – mid
    let ax = tx, ay = ty;       // aura  – soft
    let hx = tx, hy = ty;       // halo  – trailing big light

    addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    addEventListener('mouseleave', () => cur.classList.add('is-hidden'));
    addEventListener('mouseenter', () => cur.classList.remove('is-hidden'));

    const loop = () => {
      dx += (tx - dx) * 0.65;
      dy += (ty - dy) * 0.65;
      rx += (tx - rx) * 0.22;
      ry += (ty - ry) * 0.22;
      ax += (tx - ax) * 0.14;
      ay += (ty - ay) * 0.14;
      hx += (tx - hx) * 0.08;
      hy += (ty - hy) * 0.08;
      if (dot)  dot.style.transform  = `translate3d(${dx}px, ${dy}px, 0)`;
      if (ring) ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      if (aura) aura.style.transform = `translate3d(${ax}px, ${ay}px, 0)`;
      if (halo) halo.style.transform = `translate3d(${hx}px, ${hy}px, 0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    // hover targets — broader light spread when over interactive elements
    const hoverSel = 'a, button, [data-cursor="hover"], input, select, textarea, [data-lightbox], .ta-card, .ta-grid__item, .ta-nav__burger, .ta-step';
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest(hoverSel);
      if (t) cur.classList.add('is-hover');
    });
    document.addEventListener('pointerout', (e) => {
      const t = e.target.closest(hoverSel);
      if (t) cur.classList.remove('is-hover');
    });

    // pulse on click — burst of light
    addEventListener('mousedown', () => cur.classList.add('is-click'));
    addEventListener('mouseup',   () => cur.classList.remove('is-click'));
  }

  /* --------------------- Scroll reveal --------------------- */
  function initReveal() {
    const items = $$('[data-reveal]');
    if (!items.length) return;
    items.forEach(el => {
      const d = el.getAttribute('data-reveal-delay');
      if (d) el.style.setProperty('--rev-delay', d + 'ms');
    });
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    items.forEach(el => io.observe(el));
  }

  /* --------------------- Counters --------------------- */
  function initCounters() {
    const items = $$('.ta-counter');
    if (!items.length) return;
    const run = (el) => {
      const target = parseFloat(el.dataset.target || '0');
      const suffix = el.dataset.suffix || '';
      const precision = parseInt(el.dataset.precision || '0', 10);
      const dur = 1600;
      const start = performance.now();
      const from = 0;
      const step = (now) => {
        const t = Math.min(1, (now - start) / dur);
        // easeOutCubic
        const e = 1 - Math.pow(1 - t, 3);
        const v = from + (target - from) * e;
        el.textContent = (precision ? v.toFixed(precision) : Math.round(v)) + suffix;
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = (precision ? target.toFixed(precision) : Math.round(target)) + suffix;
      };
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) { items.forEach(run); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    items.forEach(el => io.observe(el));
  }

  /* --------------------- Magnetic buttons --------------------- */
  function initMagnetic() {
    if (isCoarse) return;
    const items = $$('[data-magnetic]');
    items.forEach(el => {
      const strength = 0.28;
      let rect;
      const onEnter = () => { rect = el.getBoundingClientRect(); };
      const onMove = (e) => {
        if (!rect) rect = el.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      };
      const onLeave = () => { el.style.transform = ''; rect = null; };
      el.addEventListener('pointerenter', onEnter);
      el.addEventListener('pointermove',  onMove);
      el.addEventListener('pointerleave', onLeave);
    });
  }

  /* --------------------- Tilt --------------------- */
  function initTilt() {
    if (isCoarse || prefersReducedMotion) return;
    const items = $$('[data-tilt]');
    items.forEach(el => {
      const max = 6;
      let rect;
      const enter = () => { rect = el.getBoundingClientRect(); el.style.transition = 'transform .15s var(--ease)'; };
      const move  = (e) => {
        if (!rect) rect = el.getBoundingClientRect();
        const dx = (e.clientX - rect.left) / rect.width - 0.5;
        const dy = (e.clientY - rect.top)  / rect.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${dx * max}deg) rotateX(${-dy * max}deg) translateZ(0)`;
      };
      const leave = () => { el.style.transition = 'transform .6s var(--ease)'; el.style.transform = ''; rect = null; };
      el.addEventListener('pointerenter', enter);
      el.addEventListener('pointermove',  move);
      el.addEventListener('pointerleave', leave);
    });
  }

  /* --------------------- NAV: scroll + burger --------------------- */
  function initNav() {
    const nav = $('#nav');
    if (!nav) return;
    const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 12);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const burger = $('#burger');
    const sheet = $('#navSheet');
    if (burger && sheet) {
      burger.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', String(open));
        sheet.setAttribute('aria-hidden', String(!open));
      });
      sheet.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
          nav.classList.remove('is-open');
          burger.setAttribute('aria-expanded', 'false');
          sheet.setAttribute('aria-hidden', 'true');
        }
      });
    }
  }

  /* --------------------- Reviews marquee --------------------- */
  function initReviews() {
    const rail = $('#revTrack .ta-rev-rail');
    if (!rail) return;

    const reviews = [
      { q: "Best paint protection film specialists in CT. The finish came out clean and the team was easy to work with.", n: "Erick", s: "Paint Protection Film" },
      { q: "Got tints all around and the windshield done on my Acura RSX. Great work, no bubbles, and high-quality tint.", n: "Adalberto Maura", s: "Window Tint" },
      { q: "Finally, a local shop that does it all correctly and with integrity. Full PPF, windshield, and tint done here.", n: "Michael Morningstar", s: "Full Protection" },
      { q: "Honest, knowledgeable, and they actually take the time to explain what’s going on. Quality is elite.", n: "Daniel K.", s: "Ceramic Coating" },
      { q: "My M4 looks better than the day I picked it up from the dealer. The ceramic gloss is unreal.", n: "Jordan R.", s: "Ceramic + PPF" },
      { q: "Clean, precise, done right the first time. They treat every car like it's their own.", n: "Priya S.", s: "Premium Detailing" },
      { q: "Fair pricing, meticulous work, and a facility that feels more like a showroom than a shop.", n: "Marc T.", s: "Full Front PPF" }
    ];

    const toCard = (r) => `
      <article class="ta-rev">
        <div class="ta-rev__stars">★★★★★</div>
        <p class="ta-rev__quote">“${r.q}”</p>
        <div class="ta-rev__meta">
          <div class="ta-rev__ava">${r.n.slice(0,1)}</div>
          <div>
            <div class="ta-rev__name">${r.n}</div>
            <div class="ta-rev__svc">${r.s}</div>
          </div>
        </div>
      </article>`;

    const html = reviews.concat(reviews).map(toCard).join('');
    rail.innerHTML = html;
  }

  /* --------------------- Team slider --------------------- */
  function initTeam() {
    const slider = $('[data-team-slider]');
    if (!slider) return;
    const track = $('[data-team-track]', slider);
    const cards = $$('.ta-team__card', track);
    const prev  = $('[data-team-prev]',  slider);
    const next  = $('[data-team-next]',  slider);
    const bar   = $('[data-team-progress]', slider);
    const count = $('[data-team-count]',    slider);
    if (!track || !cards.length) return;

    /* ---------- state ---------- */
    const visibleCount = () => (innerWidth <= 680 ? 1 : innerWidth <= 1024 ? 2 : 3);
    const pad = n => String(n + 1).padStart(2, '0');

    let index = 0;
    let visible = visibleCount();
    let maxIndex = Math.max(0, cards.length - visible);
    let cardW = 0, gap = 0, stepW = 0;
    let currentOffset = 0;

    /* ---------- measure / paint ---------- */
    const measure = () => {
      visible  = visibleCount();
      maxIndex = Math.max(0, cards.length - visible);
      if (index > maxIndex) index = maxIndex;
      const cs = getComputedStyle(track);
      gap   = parseFloat(cs.columnGap || cs.gap || '0') || 0;
      cardW = cards[0].getBoundingClientRect().width;
      stepW = cardW + gap;
    };

    const indexToOffset = i => -i * stepW;

    const setOffset = (offset, animate) => {
      track.style.transition = animate ? '' : 'none';
      track.style.transform  = `translate3d(${offset}px, 0, 0)`;
      currentOffset = offset;
    };

    const apply = (animate = true) => {
      measure();
      setOffset(indexToOffset(index), animate);

      if (bar) {
        const winFrac = visible / cards.length;
        bar.style.width = (winFrac * 100) + '%';
        const travel = maxIndex > 0 ? (index / maxIndex) * (1 - winFrac) * 100 : 0;
        bar.style.transform = `translateX(${travel / Math.max(winFrac, 0.0001)}%)`;
      }
      if (count) {
        const b  = $('b',  count);
        const em = $('em', count);
        if (b)  b.textContent  = pad(index);
        if (em) em.textContent = '/ ' + pad(maxIndex);
      }
      prev && prev.toggleAttribute('disabled', index <= 0);
      next && next.toggleAttribute('disabled', index >= maxIndex);
    };

    const go = n => { index = Math.max(0, Math.min(maxIndex, n)); apply(true); };

    /* ---------- buttons + keyboard ---------- */
    prev && prev.addEventListener('click', () => go(index - 1));
    next && next.addEventListener('click', () => go(index + 1));

    slider.tabIndex = 0;
    slider.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); go(index - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    });

    /* ---------- premium drag handler ----------
       Reliability strategy:
         - pointerdown on track, pointermove/up on WINDOW (no capture quirks)
         - rAF-batched transform writes (one paint per frame, smooth)
         - axis lock cooperates with CSS touch-action: pan-y instead of fighting it
         - velocity from rolling 80ms window of samples
         - rubber-band past edges, momentum projection on release
         - drag suppresses synthetic click on cards
    ----------------------------------------------*/
    const RUBBER       = 0.35;  // resistance factor past edge (lower = stiffer)
    const FLICK_FACTOR = 220;   // momentum projection (ms of velocity carried)
    const AXIS_LOCK_PX = 6;     // movement before axis decided
    const CLICK_THRESH = 6;     // px to count as drag (suppress click)
    const VEL_WINDOW   = 80;    // ms of samples kept for velocity calc

    let isDragging  = false;
    let dragStartX  = 0,
        dragStartY  = 0,
        baseOffset  = 0,
        axis        = null,
        didDrag     = false,
        activePointerId = null,
        pendingTarget   = null,
        rafId           = 0;

    const samples = []; // {t, x}

    const minOffset = () => indexToOffset(maxIndex);
    const maxOffset = () => 0;

    const rubberBand = (target) => {
      const lo = minOffset(), hi = maxOffset();
      if (target > hi) return hi + (target - hi) * RUBBER;
      if (target < lo) return lo + (target - lo) * RUBBER;
      return target;
    };

    const scheduleFrame = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (pendingTarget != null) {
          setOffset(pendingTarget, false);
          pendingTarget = null;
        }
      });
    };

    const cancelFrame = () => {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      pendingTarget = null;
    };

    const computeVelocity = () => {
      if (samples.length < 2) return 0;
      const last  = samples[samples.length - 1];
      const first = samples[0];
      const dt = last.t - first.t;
      if (dt <= 0) return 0;
      return (last.x - first.x) / dt; // px/ms
    };

    const onDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // ignore drags that start on interactive children (buttons/links/form)
      if (e.target.closest('button, a, input, textarea, select')) return;

      measure();
      isDragging      = true;
      didDrag         = false;
      axis            = null;
      dragStartX      = e.clientX;
      dragStartY      = e.clientY;
      baseOffset      = indexToOffset(index);
      activePointerId = e.pointerId;
      samples.length  = 0;
      samples.push({ t: performance.now(), x: e.clientX });

      track.style.transition = 'none';
      slider.classList.add('is-dragging');

      // window-level listeners — survive pointer leaving the track / iframe edges
      window.addEventListener('pointermove',   onMove,   { passive: false });
      window.addEventListener('pointerup',     onUp,     { passive: true });
      window.addEventListener('pointercancel', onUp,     { passive: true });
      // mouse fallback in case pointer events get suppressed
      window.addEventListener('blur', onUp);
    };

    const onMove = (e) => {
      if (!isDragging) return;
      if (activePointerId != null && e.pointerId !== activePointerId) return;

      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      // decide axis on first meaningful movement
      if (!axis) {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (axis === 'y') {
          // hand control back to the page for vertical scroll
          finishDrag(/* settle */ true, /* skipMomentum */ true);
          return;
        }
      }

      // only block default once we know it's a horizontal drag (works with touch-action: pan-y)
      if (axis === 'x' && e.cancelable) e.preventDefault();

      if (Math.abs(dx) > CLICK_THRESH) didDrag = true;

      // sample velocity (rolling window)
      const now = performance.now();
      samples.push({ t: now, x: e.clientX });
      while (samples.length > 2 && now - samples[0].t > VEL_WINDOW) samples.shift();

      // schedule rAF write — no direct style writes per pointermove
      pendingTarget = rubberBand(baseOffset + dx);
      scheduleFrame();
    };

    function finishDrag(settle, skipMomentum) {
      if (!isDragging) return;
      isDragging = false;
      activePointerId = null;
      cancelFrame();
      slider.classList.remove('is-dragging');

      window.removeEventListener('pointermove',   onMove,   { passive: false });
      window.removeEventListener('pointerup',     onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onUp);

      if (!settle) return;

      // Decide target index based on current position + projected momentum
      const v = skipMomentum ? 0 : computeVelocity();
      const projected = currentOffset + v * FLICK_FACTOR;
      let nearest = Math.round(-projected / stepW);
      nearest = Math.max(0, Math.min(maxIndex, nearest));
      index = nearest;
      apply(true);

      // suppress the synthetic click after a real drag
      if (didDrag) {
        const block = ev => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        track.addEventListener('click', block, { capture: true, once: true });
        // safety net — release after a tick if no click fires
        setTimeout(() => track.removeEventListener('click', block, true), 60);
      }
    }

    const onUp = () => finishDrag(true, false);

    track.addEventListener('pointerdown', onDown);
    // kill native HTML5 image drag (the ghost preview)
    $$('img', track).forEach(img => img.addEventListener('dragstart', e => e.preventDefault()));
    // and on the track itself, in case anything else tries to start a drag
    track.addEventListener('dragstart', e => e.preventDefault());

    /* ---------- resize ---------- */
    let rs;
    addEventListener('resize', () => {
      clearTimeout(rs);
      rs = setTimeout(() => apply(true), 120);
    });

    /* ---------- initial paint ---------- */
    requestAnimationFrame(() => apply(false));
  }

  /* --------------------- Gallery lightbox --------------------- */
  function initLightbox() {
    const lb = $('#lightbox');
    if (!lb) return;
    const img = $('.ta-lightbox__stage img', lb);
    const btnClose = $('.ta-lightbox__close', lb);
    const btnPrev  = $('.ta-lightbox__prev',  lb);
    const btnNext  = $('.ta-lightbox__next',  lb);

    const links = $$('[data-lightbox]');
    if (!links.length) return;
    const list = links.map(a => ({ href: a.getAttribute('href'), alt: a.querySelector('img')?.alt || '' }));
    let idx = 0;

    const show = (i) => {
      idx = (i + list.length) % list.length;
      img.src = list[idx].href;
      img.alt = list[idx].alt;
    };

    const open = (i) => { show(i); lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; };
    const close = () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };

    links.forEach((a, i) => {
      a.addEventListener('click', (e) => { e.preventDefault(); open(i); });
    });
    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click',  () => show(idx - 1));
    btnNext.addEventListener('click',  () => show(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft')  show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* --------------------- Form mock --------------------- */
  function initForm() {
    const form = $('.ta-form');
    const ok = $('#formOk');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      ok.textContent = 'Thank you — we will reach out within 24 hours.';
      form.reset();
      setTimeout(() => (ok.textContent = ''), 6000);
    });
  }

  /* --------------------- Parallax orbs --------------------- */
  function initOrbsParallax() {
    if (prefersReducedMotion) return;
    const orbs = $$('.ta-orb');
    if (!orbs.length) return;
    let tx = 0, ty = 0;
    addEventListener('pointermove', (e) => {
      tx = (e.clientX / innerWidth - 0.5);
      ty = (e.clientY / innerHeight - 0.5);
      orbs[0] && (orbs[0].style.transform = `translate(${tx * 30}px, ${ty * 30}px)`);
      orbs[1] && (orbs[1].style.transform = `translate(${tx * -40}px, ${ty * -20}px)`);
      orbs[2] && (orbs[2].style.transform = `translate(${tx * 20}px, ${ty * -30}px)`);
    }, { passive: true });

    // subtle scroll shift
    addEventListener('scroll', () => {
      const y = scrollY * 0.05;
      orbs.forEach((o, i) => {
        const dir = i % 2 === 0 ? 1 : -1;
        o.style.translate = `0 ${y * dir}px`;
      });
    }, { passive: true });
  }

  /* --------------------- Year --------------------- */
  function initYear() {
    const y = $('#yr');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* --------------------- Steering-wheel contact dial --------------------- */
  function initSteer() {
    const root   = $('#steer');
    if (!root) return;
    const toggle = $('[data-steer-toggle]', root);
    const links  = $$('.ta-steer__item a', root);
    if (!toggle) return;

    const setOpen = (open) => {
      root.dataset.open = open ? 'true' : 'false';
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      const menu = $('.ta-steer__menu', root);
      if (menu) menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    };

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(root.dataset.open !== 'true');
    });

    // close on outside click
    document.addEventListener('click', (e) => {
      if (root.dataset.open !== 'true') return;
      if (!root.contains(e.target)) setOpen(false);
    });

    // close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && root.dataset.open === 'true') setOpen(false);
    });

    // close once a contact option is chosen
    links.forEach(a => a.addEventListener('click', () => setOpen(false)));
  }

  /* --------------------- boot --------------------- */
  const boot = () => {
    initPreloader();
    initCursor();
    initReveal();
    initCounters();
    initMagnetic();
    initTilt();
    initNav();
    initReviews();
    initTeam();
    initLightbox();
    initForm();
    initOrbsParallax();
    initSteer();
    initYear();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
