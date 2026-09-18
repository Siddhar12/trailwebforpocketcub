/* Pocket Cub: site interactions */
(() => {
  'use strict';

  // Paste the Play Store listing URL here once the app is live.
  const PLAY_URL = '#';

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const reduced = document.documentElement.classList.contains('rm');
  const num = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = n => (n < 0 ? '−' : '') + '$' + num.format(Math.abs(n));
  const signed = n => (n < 0 ? '−' : '+') + '$' + num.format(Math.abs(n));
  const dollars = n => '$' + (Number.isInteger(n) ? n.toLocaleString('en-US') : num.format(n));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };

  const onVisible = (el, cb, opts = {}) => {
    const io = new IntersectionObserver(es => es.forEach(e => cb(e.isIntersecting, e)), opts);
    io.observe(el);
    return io;
  };

  // Run fn every `ms` while `el` is on screen and the tab is visible.
  const visibleLoop = (el, fn, ms) => {
    let timer = 0;
    onVisible(el, v => {
      if (v && !timer) timer = setInterval(() => { if (!document.hidden) fn(); }, ms);
      if (!v && timer) { clearInterval(timer); timer = 0; }
    });
  };

  // Cancellable timeouts/intervals, so a scripted demo can be stopped mid-way.
  const makeTimers = () => {
    const outs = new Set(), ints = new Set();
    return {
      after(ms, fn) { const id = setTimeout(() => { outs.delete(id); fn(); }, ms); outs.add(id); return id; },
      every(ms, fn) { const id = setInterval(fn, ms); ints.add(id); return id; },
      clear() { outs.forEach(clearTimeout); ints.forEach(clearInterval); outs.clear(); ints.clear(); }
    };
  };

  // Animated number text; interrupting continues from what's on screen.
  const counter = (el, value, fmt = money) => {
    let target = value, shown = value, token = 0;
    el.textContent = fmt(value);
    return {
      get value() { return target; },
      set(to, dur = 700) {
        target = to;
        const from = shown, my = ++token;
        if (reduced || dur <= 1) { shown = to; el.textContent = fmt(to); return; }
        const t0 = performance.now();
        const step = now => {
          if (my !== token) return;
          const t = clamp((now - t0) / dur, 0, 1);
          shown = lerp(from, to, easeOut(t));
          el.textContent = fmt(shown);
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    };
  };

  const bump = el => { el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump'); };

  const svgCoin = (green = false) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.innerHTML = `<use href="#${green ? 'coin-green' : 'coin'}"/>`;
    return s;
  };

  const flyCoin = (fromEl, toEl, { green = false, size = 28, dur = 780 } = {}) => new Promise(res => {
    if (reduced) return res();
    const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
    const dx = b.left + b.width / 2 - x0, dy = b.top + b.height / 2 - y0;
    const c = svgCoin(green);
    c.classList.add('flycoin');
    c.style.cssText = `width:${size}px;height:${size}px;left:${x0 - size / 2}px;top:${y0 - size / 2}px`;
    document.body.appendChild(c);
    const cx = dx * .35, cy = Math.min(0, dy) - 80, frames = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, u = 1 - t;
      frames.push({ transform: `translate(${2 * u * t * cx + t * t * dx}px,${2 * u * t * cy + t * t * dy}px) rotate(${t * 540}deg) scale(${i === 0 ? .4 : 1.1 - .55 * t})`, opacity: i === 0 ? 0 : 1 });
    }
    c.animate(frames, { duration: dur, easing: 'cubic-bezier(.35,0,.25,1)' }).onfinish = () => { c.remove(); res(); };
  });

  const floatText = (el, text) => {
    if (reduced) return;
    const r = el.getBoundingClientRect(), s = document.createElement('span');
    s.className = 'plusfloat';
    s.textContent = text;
    s.style.left = `${r.left + r.width / 2 - 16}px`;
    s.style.top = `${r.top - 4}px`;
    document.body.appendChild(s);
    s.animate([{ transform: 'translateY(0)', opacity: 0 }, { transform: 'translateY(-12px)', opacity: 1, offset: .25 }, { transform: 'translateY(-32px)', opacity: 0 }], { duration: 1100, easing: 'ease-out' }).onfinish = () => s.remove();
  };

  const radioGroup = (group, onChange) => {
    const items = $$('[role="radio"]', group);
    const select = (it, focus, byUser = true) => {
      items.forEach(x => { const on = x === it; x.setAttribute('aria-checked', on); x.tabIndex = on ? 0 : -1; });
      if (focus) it.focus();
      onChange(it, byUser);
    };
    items.forEach((it, i) => {
      it.tabIndex = it.getAttribute('aria-checked') === 'true' ? 0 : -1;
      it.addEventListener('click', () => { if (!it.disabled) select(it); });
      it.addEventListener('keydown', e => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        select(items[(i + d + items.length) % items.length], true);
      });
    });
    return (it) => select(it, false, false);
  };

  const entryEl = ({ title, sub, amt, ico, kind }) => {
    const li = document.createElement('li');
    li.className = 'entry';
    li.innerHTML = `<span class="entry__ico ${kind}"><svg><use href="#${ico}"/></svg></span><span class="entry__t"><b></b><small></small></span><b class="entry__a${amt > 0 ? ' in' : ''}">${signed(amt)}</b>`;
    li.querySelector('.entry__t b').textContent = title;
    li.querySelector('.entry__t small').textContent = sub;
    return li;
  };
  const pushEntry = (list, item, max) => {
    const li = entryEl(item);
    if (!reduced) li.classList.add('is-new');
    list.prepend(li);
    $$('.entry', list).slice(max).forEach(old => { old.classList.add('is-leaving'); setTimeout(() => old.remove(), 380); });
  };

  /* ---------- global ---------- */
  $$('[data-play]').forEach(a => {
    a.href = PLAY_URL;
    if (PLAY_URL !== '#') { a.target = '_blank'; a.rel = 'noopener'; }
    else a.addEventListener('click', e => e.preventDefault());
  });
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  let loaded = false;
  const markLoaded = () => { if (!loaded) { loaded = true; document.body.classList.add('is-loaded'); } };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(markLoaded));
  setTimeout(markLoaded, 1200);

  const rio = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); rio.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(el => rio.observe(el));

  $$('.hero .scrawl').forEach(el => onVisible(el, v => { if (v) setTimeout(() => el.classList.add('is-drawn'), 1300); }));

  /* ---------- nav ---------- */
  const nav = $('[data-nav]');
  const setScrolled = () => nav.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', setScrolled, { passive: true });
  setScrolled();
  const navLinks = $$('.nav__links a');
  const sio = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['how', 'savings', 'modes', 'safety', 'faq'].forEach(id => { const s = document.getElementById(id); if (s) sio.observe(s); });

  /* ---------- the kid's name, everywhere ---------- */
  const nameInput = $('[data-name-input]');
  const namer = $('[data-namer]');
  const heroScr = $('.hero__scr');
  const mirror = document.createElement('span');
  mirror.setAttribute('aria-hidden', 'true');
  mirror.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;white-space:pre;font-weight:850;letter-spacing:-.03em;pointer-events:none';
  $('.namer__field').appendChild(mirror);
  let userNamed = false;

  const cleanName = v => v.replace(/[^\p{L}\p{M}' .-]/gu, '').replace(/\s+/g, ' ').replace(/^\s+/, '').slice(0, 14);
  const sizeName = () => { mirror.textContent = nameInput.value || nameInput.placeholder; nameInput.style.width = `${mirror.offsetWidth + 6}px`; };
  const applyName = raw => {
    const v = raw.trim();
    const n = v ? v.charAt(0).toUpperCase() + v.slice(1) : 'Meera';
    $$('[data-name]').forEach(el => { el.textContent = n; });
    $$('[data-initial]').forEach(el => { el.textContent = n.charAt(0).toUpperCase(); });
    sizeName();
  };
  const bumpHero = () => { heroScr.classList.remove('bump'); void heroScr.offsetWidth; heroScr.classList.add('bump'); };

  nameInput.addEventListener('input', () => {
    userNamed = true;
    const v = cleanName(nameInput.value);
    if (v !== nameInput.value) nameInput.value = v;
    applyName(v);
    bumpHero();
    namer.classList.add('is-edited');
    store.set('pc-kid', v);
  });
  nameInput.addEventListener('focus', () => { userNamed = true; });
  namer.addEventListener('submit', e => { e.preventDefault(); nameInput.blur(); document.getElementById('how').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); });

  const saved = store.get('pc-kid');
  if (saved) { nameInput.value = cleanName(saved); applyName(nameInput.value); namer.classList.add('is-edited'); userNamed = true; }
  else applyName(nameInput.value);
  if (document.fonts) document.fonts.ready.then(sizeName);

  // Show off the personalisation once: retype the name as if a parent did.
  if (!saved) {
    const demo = makeTimers();
    const typeName = (target, i = 0) => {
      if (userNamed) return;
      nameInput.value = target.slice(0, i); if (i) { applyName(nameInput.value); bumpHero(); } else sizeName();
      if (i < target.length) demo.after(140, () => typeName(target, i + 1));
    };
    const erase = () => {
      if (userNamed) return;
      if (nameInput.value.length) { nameInput.value = nameInput.value.slice(0, -1); sizeName(); demo.after(70, erase); }
      else demo.after(250, () => typeName('Aarav'));
    };
    demo.after(3200, erase);
  }

  /* ---------- hero: live phone ---------- */
  const heroList = $('[data-hero-entries]');
  if (heroList) {
    const EVENTS = [
      { title: 'Ice cream', sub: 'Spend', amt: -3, ico: 'i-bag', kind: 'out' },
      { title: 'Watered the plants', sub: 'Chore · Weekly', amt: 2, ico: 'i-check', kind: 'in' },
      { title: 'Weekly allowance', sub: 'Allowance · Mon', amt: 10, ico: 'i-cal', kind: 'in' },
      { title: 'Stickers', sub: 'Spend', amt: -4, ico: 'i-bag', kind: 'out' },
      { title: 'Fixed Deposit paid out', sub: 'Investment', amt: 10.5, ico: 'i-lock', kind: 'lock' },
      { title: 'Into College Fund', sub: 'Investment · 60 days', amt: -10, ico: 'i-lock', kind: 'lock' },
      { title: 'Fed the dog', sub: 'Chore · Daily', amt: 1, ico: 'i-check', kind: 'in' },
      { title: 'Comic', sub: 'Spend', amt: -6, ico: 'i-bag', kind: 'out' }
    ];
    const bal = counter($('[data-hero-bal]'), 42);
    const week = counter($('[data-hero-week]'), 12, signed);
    let i = 0;
    visibleLoop($('.hero__stage'), () => {
      const ev = EVENTS[i++ % EVENTS.length];
      pushEntry(heroList, ev, 4);
      bal.set(bal.value + ev.amt, 900);
      week.set(week.value + ev.amt, 900);
    }, 3000);
  }

  /* ---------- why: words light up as you read ---------- */
  const why = $('[data-why]');
  if (why) {
    const wrap = (node, em) => {
      Array.from(node.childNodes).forEach(ch => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const s = document.createElement('span');
            s.className = 'wd' + (em ? ' wd--em' : '');
            s.textContent = part;
            frag.append(s);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && !ch.classList.contains('tok')) wrap(ch, em || ch.tagName === 'EM');
      });
    };
    $$('[data-lit]', why).forEach(p => wrap(p, false));
    const items = $$('.wd, .tok', why);
    let last = -1;
    const update = () => {
      const r = why.getBoundingClientRect();
      const p = clamp((innerHeight * .8 - r.top) / (r.height * .85), 0, 1);
      const n = Math.round(p * items.length);
      if (n === last) return;
      last = n;
      items.forEach((el, k) => el.classList.toggle('is-lit', k < n));
    };
    addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    update();
  }

  /* =========================================================
     TOUR: one phone, scroll drives the app
     ========================================================= */
  const tour = $('[data-tour]');
  if (tour) {
    const phone = $('[data-phone]', tour);
    const wrap = $('[data-phonewrap]', tour);
    const stage = $('[data-stage]', tour);
    const texts = $$('[data-tstep]', tour);
    const bars = $$('.bar', tour);
    const guide = $('[data-guide]', tour);
    const note = $('[data-note]', tour), noteText = $('[data-notetext]', tour);
    const screens = {};
    $$('[data-scr]', phone).forEach(s => { screens[s.dataset.scr] = s; });
    const kidTabs = $$('.tabbar--kid span', phone), kidPill = $('.tabbar__pill', phone);
    const T = makeTimers();
    let cur = -1, curScr = null, visible = false, ctx = {};

    const show = (name, dir = 'fwd') => {
      const next = screens[name];
      if (!next || next === curScr) return;
      const prev = curScr;
      curScr = next;
      if (!prev || dir === 'none') {
        Object.values(screens).forEach(s => s.classList.remove('is-on', 'to-left', 'to-right', 'from-left', 'from-right'));
        next.classList.add('is-on');
      } else {
        next.classList.remove('to-left', 'to-right');
        next.classList.add(dir === 'back' ? 'from-left' : 'from-right');
        void next.offsetWidth;
        next.classList.remove('from-left', 'from-right');
        next.classList.add('is-on');
        prev.classList.remove('is-on');
        prev.classList.add(dir === 'back' ? 'to-right' : 'to-left');
      }
      phone.dataset.tabbar = next.dataset.tabbar || '';
      if (next.dataset.tab) {
        const t = +next.dataset.tab;
        kidPill.style.setProperty('--tab', t);
        kidTabs.forEach((s, k) => s.classList.toggle('is-on', k === t));
      }
      const kid = next.classList.contains('scr--kid');
      tour.dataset.mode = kid ? 'kid' : 'parent';
      syncNav();
    };

    const typeInto = (el, text, speed, done) => {
      el.textContent = '';
      const step = i => {
        el.textContent = text.slice(0, i);
        if (i < text.length) T.after(speed, () => step(i + 1)); else done && done();
      };
      step(0);
    };
    const press = (el, done) => { el.classList.add('is-press'); T.after(190, () => { el.classList.remove('is-press'); done && done(); }); };
    const handover = () => { phone.classList.remove('is-handing'); void phone.offsetWidth; phone.classList.add('is-handing'); };

    /* step 0: sign in → family name → passcode */
    const phoneVal = $('[data-type="phone"]', phone), famVal = $('[data-type="family"]', phone);
    const setDots = $$('[data-setdots] i', phone), setKeys = $$('[data-setkeys] span', phone);
    const stepSignin = dir => {
      const cycle = first => {
        phoneVal.textContent = ''; famVal.textContent = '';
        setDots.forEach(d => d.classList.remove('on'));
        show('signin', first ? dir : 'back');
        T.after(700, () => typeInto(phoneVal, '(415) 555-0132', 70, () =>
          T.after(380, () => press($('[data-press="signin"]', phone), () => {
            show('family');
            T.after(650, () => typeInto(famVal, 'The Sharmas', 85, () =>
              T.after(380, () => press($('[data-press="family"]', phone), () => {
                show('setpass');
                [0, 6, 2, 8].forEach((key, k) => T.after(700 + k * 330, () => {
                  setDots[k].classList.add('on');
                  setKeys[key].classList.add('is-press');
                  T.after(160, () => setKeys[key].classList.remove('is-press'));
                }));
                T.after(700 + 4 * 330 + 1900, () => cycle(false));
              }))));
          }))));
      };
      cycle(true);
    };

    /* step 1: add a child (colour + interest are tappable) */
    const colourBtns = $$('[data-colours] button', phone);
    const seg = $('[data-seg]', phone), segBtns = $$('button', seg);
    const bigAv = $('.a-bigav', phone);
    const setColour = btn => {
      colourBtns.forEach(b => b.setAttribute('aria-checked', b === btn));
      document.documentElement.style.setProperty('--kid', btn.style.getPropertyValue('--c'));
      bump(bigAv);
    };
    const setSeg = k => { segBtns.forEach((b, j) => b.setAttribute('aria-checked', j === k)); seg.style.setProperty('--seg', k); };
    setColour(colourBtns[0]); setSeg(1);
    colourBtns.forEach(b => b.addEventListener('click', () => { ctx.touchedColour = true; setColour(b); }));
    segBtns.forEach((b, k) => b.addEventListener('click', () => { ctx.touchedSeg = true; setSeg(k); }));
    const stepChild = dir => {
      show('child', dir);
      let c = colourBtns.findIndex(b => b.getAttribute('aria-checked') === 'true');
      let k = segBtns.findIndex(b => b.getAttribute('aria-checked') === 'true');
      T.every(1500, () => { if (!ctx.touchedColour) setColour(colourBtns[c = (c + 1) % colourBtns.length]); });
      T.every(1900, () => { if (!ctx.touchedSeg) setSeg(k = (k + 1) % segBtns.length); });
    };

    /* step 2: hand over, flip into Kid Mode */
    const kidSwitch = $('[data-kidswitch]', phone);
    const goKid = () => {
      if (curScr !== screens.parenthome) return;
      kidSwitch.classList.remove('is-pulse');
      kidSwitch.classList.add('is-on');
      T.after(550, () => { handover(); show('kidhome'); });
    };
    kidSwitch.addEventListener('click', () => { if (cur === 2) { ctx.touched = true; goKid(); } });
    const stepHandover = dir => {
      const cycle = first => {
        kidSwitch.classList.remove('is-on', 'is-pulse');
        show('parenthome', first ? dir : 'back');
        T.after(1300, () => { if (!ctx.touched) kidSwitch.classList.add('is-pulse'); });
        T.after(1900, () => { if (!ctx.touched) goKid(); });
        T.after(6400, () => { ctx.touched = false; cycle(false); });
      };
      cycle(true);
    };

    /* step 3: entries arrive */
    const kidList = $('[data-kid-entries]', phone);
    const kidBal = counter($('[data-kidbal]', phone), 42);
    const FEED = [
      { title: 'Weekly allowance', sub: 'Allowance · Mon', amt: 10, ico: 'i-cal', kind: 'in' },
      { title: 'Made the bed', sub: 'Chore · Daily', amt: 1, ico: 'i-check', kind: 'in' },
      { title: 'Pencil box', sub: 'Spend', amt: -5, ico: 'i-bag', kind: 'out' },
      { title: 'Helped wash the car', sub: 'Chore · One-off', amt: 5, ico: 'i-check', kind: 'in' },
      { title: 'Comic', sub: 'Spend', amt: -6, ico: 'i-bag', kind: 'out' },
      { title: 'Fixed Deposit paid out', sub: 'Investment', amt: 10.5, ico: 'i-lock', kind: 'lock' },
      { title: 'Into College Fund', sub: 'Investment · 60 days', amt: -10, ico: 'i-lock', kind: 'lock' }
    ];
    [
      { title: 'Into Fixed Deposit', sub: 'Investment · 14 days', amt: -10, ico: 'i-lock', kind: 'lock' },
      { title: 'Watered the plants', sub: 'Chore · Weekly', amt: 2, ico: 'i-check', kind: 'in' },
      { title: 'Weekly allowance', sub: 'Allowance · Mon', amt: 10, ico: 'i-cal', kind: 'in' },
      { title: 'Starting balance', sub: 'Set up', amt: 40, ico: 'i-up', kind: 'in' }
    ].reverse().forEach(e => kidList.prepend(entryEl(e)));
    let feedI = 0;
    const stepEntries = dir => {
      show('kidhome', dir);
      T.after(900, () => { const e = FEED[feedI++ % FEED.length]; pushEntry(kidList, e, 5); kidBal.set(kidBal.value + e.amt, 800); });
      T.every(2400, () => { const e = FEED[feedI++ % FEED.length]; pushEntry(kidList, e, 5); kidBal.set(kidBal.value + e.amt, 800); });
    };

    /* step 4: chores */
    const chores = $$('.a-chore', phone);
    const choreBalEl = $('[data-chorebal]', phone);
    const choreBal = counter(choreBalEl, 42, dollars);
    const toggleChore = async btn => {
      const on = btn.getAttribute('aria-pressed') !== 'true', r = +btn.dataset.reward;
      btn.setAttribute('aria-pressed', on);
      if (!on) { choreBal.set(choreBal.value - r, 500); return; }
      await flyCoin($('.a-box', btn), choreBalEl, { size: 24 });
      choreBal.set(choreBal.value + r, 500);
      bump(choreBalEl);
      floatText(choreBalEl, `+$${r}`);
    };
    chores.forEach(b => b.addEventListener('click', () => { ctx.touched = true; toggleChore(b); }));
    const resetChores = () => { chores.forEach(b => b.setAttribute('aria-pressed', 'false')); choreBal.set(42, 1); };
    const stepChores = dir => {
      resetChores();
      show('chores', dir);
      const next = () => {
        if (ctx.touched) return;
        const b = chores.find(c => c.getAttribute('aria-pressed') !== 'true');
        if (b) { toggleChore(b); T.after(2100, next); }
        else T.after(2600, () => { if (!ctx.touched) { resetChores(); T.after(1200, next); } });
      };
      T.after(1500, next);
    };

    /* step 5: log a spend (with undo) */
    const beforeEl = $('[data-before]', phone), afterEl = $('[data-after]', phone);
    const logBtn = $('[data-log]', phone), toast = $('[data-toast]', phone), undoBtn = $('[data-undo]', phone);
    const toastWhat = $('[data-toastwhat]', phone), spendNote = $('[data-spendnote]', phone), toastBar = $('.a-toast__bar', phone);
    const before = counter(beforeEl, 42), after = counter(afterEl, 39);
    const sp = { bal: 42, price: 3, item: 'Ice cream', prev: null, timer: 0 };
    const selectItem = radioGroup($('[data-items]', phone), (it, byUser) => {
      if (byUser) ctx.touched = true;
      sp.price = +it.dataset.price; sp.item = it.dataset.item;
      if (sp.prev === null) { before.set(sp.bal, 400); after.set(sp.bal - sp.price, 400); }
    });
    const itemBtns = $$('[data-items] button', phone);
    const commitSpend = msg => {
      clearTimeout(sp.timer);
      sp.prev = null;
      toast.hidden = true;
      logBtn.style.visibility = '';
      before.set(sp.bal, 500); after.set(sp.bal - sp.price, 500);
      if (msg) spendNote.textContent = msg;
    };
    const logSpend = () => {
      if (sp.price > sp.bal) { spendNote.textContent = 'Not enough yet. Saving up is part of the lesson.'; return; }
      sp.prev = sp.bal;
      sp.bal -= sp.price;
      after.set(sp.bal, 500);
      bump(afterEl);
      toastWhat.textContent = `${sp.item} −$${sp.price}`;
      logBtn.style.visibility = 'hidden';
      toast.hidden = false;
      toastBar.style.animation = 'none'; void toastBar.offsetWidth; toastBar.style.animation = '';
      spendNote.textContent = '';
      const item = sp.item;
      sp.timer = setTimeout(() => commitSpend(`${item} is on the record.`), 5000);
    };
    logBtn.addEventListener('click', () => { ctx.touched = true; logSpend(); });
    undoBtn.addEventListener('click', () => { ctx.touched = true; if (sp.prev === null) return; sp.bal = sp.prev; commitSpend('Undone. Nothing was logged.'); });
    const resetSpend = () => { commitSpend(''); sp.bal = 42; selectItem(itemBtns[0]); before.set(42, 1); after.set(39, 1); spendNote.textContent = ''; };
    const stepSpend = dir => {
      resetSpend();
      show('spend', dir);
      const cycle = () => {
        T.after(1400, () => { if (!ctx.touched) selectItem(itemBtns[1]); });
        T.after(2600, () => { if (!ctx.touched) { press(logBtn); logSpend(); } });
        T.after(4300, () => { if (!ctx.touched && sp.prev !== null) { undoBtn.classList.add('is-press'); T.after(200, () => { undoBtn.classList.remove('is-press'); sp.bal = sp.prev; commitSpend('Undone. Nothing was logged.'); }); } });
        T.after(7600, () => { if (!ctx.touched) { resetSpend(); cycle(); } });
      };
      cycle();
    };

    const STEPS = [
      { run: stepSignin, pose: 'pointing-stick', note: '+1 or +91, or just use Google', y: '36%' },
      { run: stepChild, pose: 'pointing', note: 'every child gets their own colour', y: '30%' },
      { run: stepHandover, pose: 'happy', note: 'flip the switch, hand it over', y: '42%' },
      { run: stepEntries, pose: 'pointing', note: 'every dollar lands as an entry', y: '56%' },
      { run: stepChores, pose: 'happy', note: 'tap one. go on.', y: '24%' },
      { run: stepSpend, pose: 'pointing-stick', note: 'oops? undo it right away', y: '50%' }
    ];

    const setPose = pose => {
      guide.src = `explainericons/${pose}@3x.png`;
      guide.classList.remove('is-swap'); void guide.offsetWidth; guide.classList.add('is-swap');
    };
    const setNote = (text, y) => {
      note.classList.add('is-out');
      note.classList.remove('is-drawn');
      setTimeout(() => {
        noteText.textContent = text;
        note.style.setProperty('--ny', y);
        note.classList.remove('is-out');
        void note.offsetWidth;
        note.classList.add('is-drawn');
      }, 220);
    };

    const runStep = dir => {
      T.clear();
      ctx = { touched: false, touchedColour: ctx.touchedColour, touchedSeg: ctx.touchedSeg };
      if (sp.prev !== null) commitSpend('');
      if (!visible || cur < 0) return;
      STEPS[cur].run(dir);
    };

    const setStep = i => {
      const dir = cur < 0 ? 'none' : i > cur ? 'fwd' : 'back';
      cur = i;
      texts.forEach((t, k) => { t.classList.toggle('is-on', k === i); t.classList.toggle('is-past', k < i); });
      setPose(STEPS[i].pose);
      setNote(STEPS[i].note, STEPS[i].y);
      runStep(dir);
    };

    const syncNav = () => {
      const r = tour.getBoundingClientRect();
      nav.classList.toggle('is-kid', r.top <= 0 && r.bottom > innerHeight * .5 && tour.dataset.mode === 'kid');
    };

    const onScroll = () => {
      const r = tour.getBoundingClientRect();
      const total = r.height - innerHeight;
      const p = clamp(-r.top / total, 0, .9999);
      const f = p * STEPS.length, i = Math.floor(f);
      bars.forEach((b, k) => b.style.setProperty('--f', k < i ? 1 : k > i ? 0 : (f - i).toFixed(3)));
      if (i !== cur) setStep(i);
      syncNav();
    };

    const fit = () => {
      const h = stage.clientHeight, w = stage.clientWidth;
      const z = innerWidth > 900 ? Math.min(1, (h - 16) / 620, (w - 40) / 300) : Math.min(1, (h - 8) / 620, (w - 20) / 300);
      wrap.style.setProperty('--pz', Math.max(.42, z).toFixed(3));
    };

    bars.forEach((b, k) => b.addEventListener('click', () => {
      const top = tour.getBoundingClientRect().top + scrollY;
      const total = tour.offsetHeight - innerHeight;
      scrollTo({ top: top + ((k + .35) / STEPS.length) * total, behavior: reduced ? 'auto' : 'smooth' });
    }));

    onVisible(tour, v => {
      visible = v;
      if (v) runStep('none'); else T.clear();
    }, { threshold: .02 });

    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; onScroll(); });
    }, { passive: true });
    addEventListener('resize', () => { fit(); onScroll(); });
    fit();
    onScroll();
  }

  /* =========================================================
     SAVINGS JAR
     ========================================================= */
  const inv = $('[data-invest]');
  if (inv) {
    const st = { amt: 10, days: 14, rate: 5, running: false, open: false };
    const inputs = $$('[data-i]', inv);
    const out = k => $(`[data-o="${k}"]`, inv);
    const jarCoins = $('[data-jar-coins]'), jar = $('.jar', inv);
    const payIn = $('[data-pay-in]'), payOut = $('[data-pay-out]'), payInt = $('[data-pay-int]'), payDate = $('[data-pay-date]');
    const ffBar = $('[data-ff-bar]'), ffDay = $('[data-ff-day]'), ffBtn = $('[data-ff-btn]'), ffLabel = $('[data-ff-label]');
    const plus = $('[data-jar-plus]'), label = $('[data-jar-label]');
    const payOutC = counter(payOut, 10.5);

    const interest = () => Math.round(st.amt * st.rate) / 100;
    const coinCount = () => clamp(Math.round(st.amt / 12) + 1, 1, 15);
    const addCoin = (i, green, delay = 0) => {
      const c = document.createElement('i');
      c.className = 'cs' + (green ? ' cs--green' : '');
      c.style.setProperty('--i', i);
      c.style.setProperty('--x', `${Math.round(Math.sin(i * 2.3) * 7)}px`);
      if (!reduced) { c.classList.add('is-drop'); c.style.setProperty('--dl', `${delay}ms`); }
      jarCoins.appendChild(c);
    };
    const renderJar = () => {
      const want = coinCount();
      const have = $$('.cs:not(.cs--green):not(.is-out)', jarCoins);
      if (have.length < want) for (let i = have.length; i < want; i++) addCoin(i, false, (i - have.length) * 60);
      else have.slice(want).forEach(c => { c.classList.add('is-out'); setTimeout(() => c.remove(), 300); });
    };
    const renderText = () => {
      const r = interest();
      out('amt').textContent = dollars(st.amt);
      out('days').textContent = `${st.days} days`;
      out('rate').textContent = `${st.rate}%`;
      payIn.textContent = money(st.amt);
      payOutC.set(st.amt + r, 400);
      payInt.textContent = `+${money(r)} interest`;
      plus.textContent = `+${money(r)}`;
      payDate.textContent = new Date(Date.now() + st.days * 864e5).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (!st.running && !st.open) {
        ffLabel.textContent = `Fast-forward ${st.days} days`;
        ffDay.textContent = `Locked · day 0 of ${st.days}`;
      }
    };
    const fill = inp => inp.style.setProperty('--fill', `${((inp.value - inp.min) / (inp.max - inp.min)) * 100}%`);
    const reset = () => {
      st.open = false;
      inv.classList.remove('is-open');
      $$('.cs--green', jarCoins).forEach(c => c.remove());
      ffBar.style.setProperty('--ff', 0);
      renderText();
    };
    inputs.forEach(inp => {
      fill(inp);
      inp.addEventListener('input', () => {
        st[inp.dataset.i] = +inp.value;
        fill(inp);
        if (st.open) reset();
        renderText();
        if (inp.dataset.i === 'amt') renderJar();
      });
    });
    radioGroup($('.inst', inv), it => { label.textContent = it.dataset.inst; bump(label); });

    const lockControls = on => {
      inputs.forEach(i => { i.disabled = on; });
      $$('[role="radio"]', inv).forEach(b => { b.disabled = on; });
    };
    ffBtn.addEventListener('click', () => {
      if (st.running) return;
      if (st.open) { reset(); return; }
      st.running = true;
      ffBtn.disabled = true;
      lockControls(true);
      let d = 0;
      const stepMs = reduced ? 0 : clamp(2400 / st.days, 40, 200);
      const finish = () => {
        st.running = false;
        st.open = true;
        inv.classList.add('is-open');
        ffDay.textContent = `Day ${st.days} of ${st.days} · unlocked with interest`;
        const base = coinCount(), n = clamp(Math.round(base * st.rate / 100 * 3), 1, 3);
        for (let k = 0; k < n; k++) addCoin(base + k, true, 450 + k * 160);
        ffLabel.textContent = 'Lock it again';
        ffBtn.disabled = false;
        lockControls(false);
      };
      if (!stepMs) { ffBar.style.setProperty('--ff', 1); finish(); return; }
      const t = setInterval(() => {
        d++;
        ffBar.style.setProperty('--ff', (d / st.days).toFixed(3));
        ffDay.textContent = `Locked · day ${d} of ${st.days}`;
        jar.classList.remove('is-ticking'); void jar.offsetWidth; jar.classList.add('is-ticking');
        if (d >= st.days) { clearInterval(t); setTimeout(finish, 180); }
      }, stepMs);
    });
    renderText();
    const once = onVisible(inv, v => { if (v) { renderJar(); once.disconnect(); } }, { threshold: .3 });
  }

  /* =========================================================
     PARENT MODE vs KID MODE (+ passcode cub)
     ========================================================= */
  const modes = $('[data-modes]');
  if (modes) {
    const tabs = $$('[data-tab]', modes), panels = $$('[data-panel]', modes);
    const overlay = $('[data-passcode]', modes), card = $('.passcode__card', overlay);
    const cub = $('[data-pc-cub]', modes), bubble = $('[data-pc-bubble]', modes), dots = $$('[data-pc-dots] i', overlay);
    const tryHint = $('[data-modes-try]', modes);
    let code = '', busy = false;

    const setMode = m => {
      modes.dataset.mode = m;
      tabs.forEach(t => { const on = t.dataset.tab === m; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      panels.forEach(p => { p.hidden = p.dataset.panel !== m; });
    };
    const renderDots = () => dots.forEach((d, i) => d.classList.toggle('on', i < code.length));
    const say = text => { bubble.textContent = text; };
    const openPass = () => {
      code = ''; busy = false;
      renderDots();
      card.classList.remove('is-wrong', 'is-right');
      cub.classList.remove('is-typing', 'is-happy', 'is-talking');
      say('I’m not looking!');
      overlay.hidden = false;
      $('[data-k="1"]', overlay).focus({ preventScroll: true });
    };
    const closePass = () => { overlay.hidden = true; };
    const press = k => {
      if (busy) return;
      if (k === 'cancel') { closePass(); $('#tab-kid').focus({ preventScroll: true }); return; }
      if (k === 'del') { code = code.slice(0, -1); renderDots(); if (!code) cub.classList.remove('is-typing'); return; }
      if (code.length >= 4) return;
      code += k;
      renderDots();
      cub.classList.remove('is-talking');
      say('I’m not looking!');
      cub.classList.add('is-typing');
      if (code.length === 4) {
        busy = true;
        setTimeout(() => {
          if (code === '1234') {
            card.classList.add('is-right');
            cub.classList.remove('is-typing');
            cub.classList.add('is-happy', 'is-talking');
            say('Welcome back!');
            setTimeout(() => { closePass(); setMode('parent'); $('#tab-parent').focus({ preventScroll: true }); }, 900);
          } else {
            card.classList.add('is-wrong');
            cub.classList.remove('is-typing');
            cub.classList.add('is-talking');
            say('Hmm, not quite!');
            setTimeout(() => { card.classList.remove('is-wrong'); code = ''; renderDots(); busy = false; }, 700);
          }
        }, 260);
      }
    };
    $$('[data-k]', overlay).forEach(b => b.addEventListener('click', () => press(b.dataset.k)));
    overlay.addEventListener('keydown', e => {
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); press('del'); }
      else if (e.key === 'Escape') { e.preventDefault(); press('cancel'); }
      else if (e.key === 'Tab') {
        const f = $$('button', card), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    const choose = m => {
      if (m === modes.dataset.mode) return;
      tryHint.style.opacity = '0';
      if (m === 'parent') openPass(); else setMode('kid');
    };
    tabs.forEach((t, i) => {
      t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
      t.addEventListener('click', () => choose(t.dataset.tab));
      t.addEventListener('keydown', e => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const n = tabs[(i + d + tabs.length) % tabs.length];
        n.focus();
        choose(n.dataset.tab);
      });
    });
  }

  /* ---------- trust: stamps slam in ---------- */
  const stamps = $('[data-stamps]');
  if (stamps) {
    $$('.trow', stamps).forEach((row, i) => row.style.setProperty('--sd', `${i * 170}ms`));
    const once = onVisible(stamps, v => { if (v) { stamps.classList.add('is-in'); once.disconnect(); } }, { threshold: .25 });
  }

  /* ---------- chat: Cub types, then answers ---------- */
  const thread = $('[data-thread]');
  if (thread) {
    $$('.msg--a', thread).forEach(m => m.insertAdjacentHTML('beforeend', '<span class="typing" aria-hidden="true"><i></i><i></i><i></i></span>'));
    let queue = Promise.resolve();
    const wait = ms => new Promise(r => setTimeout(r, reduced ? 0 : ms));
    const cio = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      const m = e.target;
      queue = queue.then(async () => {
        if (m.classList.contains('msg--q')) { m.classList.add('is-in'); await wait(260); }
        else { m.classList.add('is-typing'); await wait(750); m.classList.remove('is-typing'); m.classList.add('is-in'); await wait(200); }
      });
    }), { rootMargin: '0px 0px -10% 0px' });
    $$('.msg', thread).forEach(m => cio.observe(m));
  }
})();
