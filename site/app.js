/* Havbruksforvaltning 2.0 – interaktive visninger. Ingen avhengigheter. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const nf = new Intl.NumberFormat('nb-NO');
  const nf1 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });
  const fmt = (n) => nf.format(Math.round(n));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Designsystemet-tagg. color: neutral | accent | info | success | warning | danger
  const tag = (text, color = 'neutral', outline = false) =>
    `<span class="ds-tag" data-size="sm" data-color="${color}"${outline ? ' data-variant="outline"' : ''}>${esc(text)}</span>`;
  // Velger i en ds-toggle-group: valgt knapp får aria-checked og primærvariant.
  const selectToggle = (buttons, active) => buttons.forEach((b) => {
    b.setAttribute('aria-checked', String(b === active));
    b.dataset.variant = b === active ? 'primary' : 'tertiary';
  });

  const ICON = {
    check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7"/></svg>',
    cross: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="m4.5 4.5 7 7m0-7-7 7"/></svg>',
    dash: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4.5 8h7"/></svg>',
    spark: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.5 9.6 6.4 14.5 8 9.6 9.6 8 14.5 6.4 9.6 1.5 8 6.4 6.4z"/></svg>',
    pen: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 2.5 13.5 5.5 5.5 13.5H2.5V10.5z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15m-5-5 5 5-5 5"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5"/></svg>',
    play: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>',
    pause: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5h3v11H4zm5 0h3v11H9z"/></svg>',
  };

  /* ---------------- Tema ---------------- */
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem('hf2-theme');
    if (saved === 'dark' || saved === 'light') root.dataset.colorScheme = saved;
  } catch (e) { /* lagring ikke tilgjengelig */ }
  $('#theme-toggle').addEventListener('click', () => {
    const scheme = root.dataset.colorScheme;
    const current = scheme === 'dark' || scheme === 'light' ? scheme : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    root.dataset.colorScheme = next;
    try { localStorage.setItem('hf2-theme', next); } catch (e) { /* ignorer */ }
  });

  /* ---------------- Verktøytips ---------------- */
  const tip = $('#tip');
  let tipFor = null;
  function showTip(el, x, y) {
    tip.innerHTML = el.dataset.tip;
    tip.classList.add('on');
    tipFor = el;
    placeTip(x, y);
  }
  function placeTip(x, y) {
    const r = tip.getBoundingClientRect();
    let left = x + 14, top = y + 16;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - 12;
    tip.style.left = Math.max(8, left) + 'px';
    tip.style.top = Math.max(8, top) + 'px';
  }
  function hideTip() { tip.classList.remove('on'); tipFor = null; }
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el) showTip(el, e.clientX, e.clientY);
    else if (tipFor) hideTip();
  });
  document.addEventListener('pointermove', (e) => { if (tipFor) placeTip(e.clientX, e.clientY); });
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el) { const r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2, r.bottom); }
  });
  document.addEventListener('focusout', hideTip);
  window.addEventListener('scroll', () => { if (tipFor && tipFor.matches(':not(:focus)')) hideTip(); }, { passive: true });

  /* ---------------- Navigasjon og presentasjonsmodus ---------------- */
  const navLinks = $$('.chapters a');
  const chapterIds = navLinks.map((a) => a.getAttribute('href').slice(1));
  const progress = $('#progress');
  function onScroll() {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    let current = null;
    for (const id of chapterIds) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top < window.innerHeight * 0.35) current = id;
    }
    navLinks.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + current)));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const slides = $$('[data-slide]');
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t.closest('input, select, textarea, [contenteditable="true"]')) return;
    let dir = 0;
    if (e.key === 'ArrowRight' || e.key === 'j') dir = 1;
    if (e.key === 'ArrowLeft' || e.key === 'k') dir = -1;
    if (!dir) return;
    e.preventDefault();
    const offset = 80;
    const tops = slides.map((s) => s.getBoundingClientRect().top - offset);
    let idx;
    if (dir > 0) idx = tops.findIndex((top) => top > 4);
    else { idx = -1; tops.forEach((top, i) => { if (top < -4) idx = i; }); }
    if (idx < 0) idx = dir > 0 ? slides.length - 1 : 0;
    slides[idx].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------------- 1. Frist mot faktisk ---------------- */
  (function deadlines() {
    const MAX = 208;
    const rows = [
      { etat: 'Mattilsynet', kind: 'Uttalelse, standard saksgang', frist: 4, lo: 19, src: 'KS 2025, snitt for 2024' },
      { etat: 'Mattilsynet', kind: 'Uttalelse, spesielle omstendigheter', frist: 4, lo: 41, src: 'KS 2025, snitt for 2024' },
      { etat: 'Statsforvalterne', kind: 'Uttalelse, standard saksgang', frist: 4, lo: 29, src: 'KS 2025, snitt for 2024' },
      { etat: 'Statsforvalterne', kind: 'Uttalelse, spesielle omstendigheter', frist: 4, lo: 57, src: 'KS 2025, snitt for 2024' },
      { etat: 'Lokalitetssøknader, Nordland', kind: 'Hele saken', frist: 30, lo: 100, hi: 150, src: 'SinkabergHansen via iLaks, 2024', fristTxt: 'ca. 30 uker etter forskriften' },
      { etat: 'Mattilsynet, Møre og Romsdal', kind: 'Klagebehandling', lo: 104, upto: true, label: 'opptil 2 år', src: 'KS 2025' },
      { etat: 'Store lokaliteter', kind: 'Konsekvensutredning, 4 saker 2006–2011', lo: 156, hi: 208, label: '3–4 år hver', src: 'Nofima, 2011' },
    ];
    const pct = (w) => (w / MAX) * 100;
    const chart = $('#deadline-chart');
    let html = '';
    for (const r of rows) {
      const end = r.hi || r.lo;
      const ratio = r.frist ? (r.hi ? `${nf1.format(r.lo / r.frist)}–${nf1.format(r.hi / r.frist)} × rammen` : `${nf1.format(r.lo / r.frist)} × fristen`) : 'ingen frist';
      const valTxt = r.label || (r.hi ? `${r.lo}–${r.hi} uker` : `${r.lo} uker`);
      const tipHtml = `<b>${esc(r.etat)}</b><br>${esc(r.kind)}<br>Frist: ${r.frist ? esc(r.fristTxt || r.frist + ' uker') : 'ingen'}<br>Faktisk: ${esc(valTxt)}<br><span class="muted">Kilde: ${esc(r.src)}</span>`;
      let bars = '';
      if (r.frist) {
        bars += `<div class="dl-bar within" style="left:0;width:${pct(r.frist)}%"></div>`;
        bars += `<div class="dl-bar" style="left:${pct(r.frist)}%;width:${pct(r.lo - r.frist)}%"></div>`;
      } else {
        bars += `<div class="dl-bar${r.upto ? ' fade' : ''}" style="left:0;width:${pct(r.lo)}%"></div>`;
      }
      if (r.hi) bars += `<div class="dl-bar range" style="left:${pct(r.lo)}%;width:${pct(r.hi - r.lo)}%"></div>`;
      if (r.frist) bars += `<div class="dl-frist" style="left:${pct(r.frist)}%"></div>`;
      const inside = pct(end) > 80;
      const valStyle = inside
        ? `right:${100 - pct(r.lo)}%;padding:0 .45rem;margin-right:.35rem;background:var(--surface);border-radius:3px`
        : `left:${pct(end)}%`;
      let grid = '<div class="dl-grid" aria-hidden="true">';
      for (let w = 26; w < MAX; w += 26) grid += `<i class="${w % 52 ? 'minor' : ''}" style="left:${pct(w)}%"></i>`;
      grid += '</div>';
      html += `<div class="dl-row">
        <div class="dl-label"><b>${esc(r.etat)}</b><span>${esc(r.kind)}</span></div>
        <div class="dl-track" tabindex="0" data-tip="" aria-label="${esc(r.etat)}, ${esc(r.kind)}: ${esc(valTxt)}, ${esc(ratio)}">
          ${grid}${bars}
          <div class="dl-val" style="${valStyle}"><b>${esc(valTxt)}</b><span>${esc(ratio)}</span></div>
        </div>
      </div>`;
      r.tipHtml = tipHtml;
    }
    html += `<div class="dl-axis" aria-hidden="true">${[0, 52, 104, 156, 208].map((w, i) => `<span style="left:${pct(w)}%">${i === 0 ? '0' : i + ' år'}</span>`).join('')}</div>`;
    chart.innerHTML = html;
    $$('.dl-track', chart).forEach((el, i) => { el.dataset.tip = rows[i].tipHtml; });
  })();

  /* ---------------- 1b. Samme sak, to systemer ---------------- */
  (function timeline() {
    const D1 = 1 / 7;
    const TODAY = [
      { label: 'Kommunen', sub: 'Offentlig ettersyn', bars: [{ s: 0, e: 4, cls: 'neutral', txt: '4 uker' }] },
      { label: 'Mattilsynet', sub: 'Uttalelse, snitt 19 uker', bars: [{ s: 4, e: 8, cls: 'neutral' }, { s: 8, e: 23, cls: 'late', txt: '15 uker over fristen' }], frist: 8 },
      { label: 'Stats\u00ADforvalteren', sub: 'Uttalelse, snitt 29 uker', bars: [{ s: 23, e: 27, cls: 'neutral' }, { s: 27, e: 52, cls: 'late', txt: '25 uker over fristen' }], frist: 27 },
      { label: 'Fylkes\u00ADkommunen', sub: 'Vedtak', bars: [{ s: 52, e: 54, cls: 'neutral' }] },
    ];
    const etat = (label, sub) => ({ label, sub, bars: [{ s: D1, e: 2, cls: 'ok', txt: '10 virkedager' }] });
    const NEW = [
      { label: 'Søker', sub: 'Søknad validert', ms: [0] },
      { label: 'Fylkes\u00ADkommunen', sub: 'Sporvalg, avklaring, vedtak', ms: [D1], bars: [{ s: 4, e: 5, cls: 'ok', txt: 'avklaring' }, { s: 5, e: 6, cls: 'ok', txt: 'vedtak' }] },
      etat('Kommunen', 'Uttalelse'),
      etat('Fiskeri\u00ADdirektoratet', 'Uttalelse'),
      etat('Mattilsynet', 'Uttalelse'),
      etat('Kystverket', 'Uttalelse'),
      etat('Stats\u00ADforvalteren', 'Inkl. utslippstillatelse'),
      { label: 'Publikum', sub: 'Offentlig ettersyn', bars: [{ s: D1, e: 4, cls: 'neutral', txt: '4 uker' }] },
      { label: 'Klageinstans', sub: 'Tre ukers klagefrist', bars: [{ s: 6, e: 9, cls: 'dashed', txt: 'klagefrist' }] },
    ];
    const MARKS = {
      today: [{ x: 30, label: 'Forskriftens ramme ≈ 30 uker', dash: true }],
      new: [{ x: 6, label: 'Vedtak uke 6', dash: true }],
    };

    let D = 56;
    let week = 12;
    const input = $('#tl-week');
    const readout = $('#tl-readout');
    const panels = { today: $('#tl-today'), new: $('#tl-new') };

    const xp = (w) => Math.min(Math.max(w / D, 0), 1);
    function build(sys, rows) {
      const p = panels[sys];
      const body = $('.g-body', p);
      body.style.paddingTop = '1.4rem';
      let html = '';
      for (const r of rows) {
        let inner = '';
        for (const b of r.bars || []) {
          inner += `<div class="g-bar ${b.cls}" data-s="${b.s}" data-e="${b.e}" data-txt="${b.txt || ''}"></div>`;
        }
        for (const t of r.ms || []) inner += `<div class="g-ms" data-t="${t}"></div>`;
        if (r.frist) inner += `<div class="g-mark" data-x="${r.frist}" data-tip="" title=""></div>`;
        html += `<div class="g-row"><div class="g-label">${esc(r.label)}<small>${esc(r.sub || '')}</small></div><div class="g-track">${inner}</div></div>`;
      }
      for (const m of MARKS[sys]) {
        html += `<div class="g-mark ${m.dash ? 'dash' : ''} overlay" data-x="${m.x}" style="top:1.1rem;bottom:0"></div><div class="g-anno" data-x="${m.x}">${esc(m.label)}</div>`;
      }
      html += '<div class="g-playhead"></div>';
      body.innerHTML = html;
      $$('.g-mark[data-tip]', body).forEach((el) => { el.dataset.tip = `<b>Frist</b><br>Fire uker etter at etaten fikk saken (uke ${el.dataset.x})`; });
    }
    build('today', TODAY);
    build('new', NEW);

    function layout() {
      for (const sys of ['today', 'new']) {
        const p = panels[sys];
        $$('.g-bar', p).forEach((el) => {
          const s = +el.dataset.s, e = +el.dataset.e;
          const l = xp(s) * 100, w = (xp(e) - xp(s)) * 100;
          el.style.left = l + '%';
          el.style.width = Math.max(w, 0) + '%';
          el.textContent = (e - s) / D > 0.13 ? el.dataset.txt : '';
          el.hidden = s >= D;
        });
        $$('.g-ms', p).forEach((el) => { el.style.left = `max(.5rem, ${xp(+el.dataset.t) * 100}%)`; });
        $$('.g-track .g-mark', p).forEach((el) => { el.style.left = xp(+el.dataset.x) * 100 + '%'; el.hidden = +el.dataset.x > D; });
        $$('.g-mark.overlay, .g-anno', p).forEach((el) => {
          const x = +el.dataset.x;
          el.hidden = x > D;
          el.style.left = `calc(var(--lw) + (100% - var(--lw)) * ${xp(x)})`;
        });
        const ticks = $('.g-axis .ticks', p);
        const narrow = $('.g-track', p).clientWidth < 420;
        const step = D > 20 ? (narrow ? 16 : 8) : (narrow ? 2 : 1);
        let t = '';
        for (let w = 0; w <= D - step * 0.75; w += step) t += `<span style="left:${xp(w) * 100}%">${w}</span>`;
        t += `<span style="left:100%;transform:translateX(-100%)">${D} uker</span>`;
        ticks.innerHTML = t;
      }
    }

    function whoToday(w) {
      if (w < 4) return 'kommunen';
      if (w < 23) return 'Mattilsynet';
      if (w < 52) return 'Statsforvalteren';
      if (w < 54) return 'fylkeskommunen';
      return null;
    }
    function statusToday(w) {
      const wk = Math.floor(w);
      if (w < 4) return 'Offentlig ettersyn i kommunen. Sektoretatene har ikke fått saken ennå.';
      if (w < 8) return 'Saken ligger hos Mattilsynet. Fristen på fire uker løper.';
      if (w < 23) return `Saken ligger fortsatt hos Mattilsynet. Fristen gikk ut i uke 8, for ${wk - 8 || 'under én'} ${wk - 8 === 1 ? 'uke' : 'uker'} siden. Ingen konsekvens.`;
      if (w < 27) return 'Mattilsynet har svart. Saken går videre til Statsforvalteren, og en ny frist på fire uker begynner.';
      if (w < 52) return `Saken ligger hos Statsforvalteren. Fristen gikk ut i uke 27.${w >= 30 ? ' Forskriftens ramme for hele saken, ca. 30 uker, er passert.' : ''}`;
      if (w < 54) return 'Fylkeskommunen skriver vedtak, ett år etter søknaden.';
      return 'Vedtak i uke 54. I Nordland har slike saker tatt 100–150 uker.';
    }
    function statusNew(w) {
      if (w < D1) return 'Søknaden er sendt og validert automatisk. Den kan ikke erklæres ufullstendig på grunn av formalia.';
      if (w < 2) return 'Alle fem etater vurderer samtidig i samme sakmappe, med frist på 10 virkedager. Høringen er i gang.';
      if (w < 4) return 'Etatene har svart. Offentlig ettersyn pågår til uke 4.';
      if (w < 5) return 'Fylkeskommunen avklarer motstrid mellom etatene og svarer på innspill.';
      if (w < 6) return 'Vedtaket skrives, kontrolleres juridisk og signeres av en navngitt saksbehandler.';
      if (w < 9) return 'Vedtak fattet i uke 6 og publisert i eInnsyn og Akvakulturregisteret. Klagefristen løper til uke 9.';
      const who = whoToday(w);
      return `Vedtaket er endelig. ${who ? `I dagens system ligger den samme saken fortsatt hos ${who}.` : 'Dagens system har også fattet vedtak nå, 48 uker senere.'}`;
    }

    function setWeek(w) {
      week = Math.min(Math.max(w, 0), D);
      input.value = week;
      readout.textContent = week < 1 ? `Dag ${Math.round(week * 7)}` : `Uke ${Math.floor(week)}`;
      for (const sys of ['today', 'new']) {
        const p = panels[sys];
        p.style.setProperty('--p', xp(week));
        $$('.g-bar', p).forEach((el) => {
          const s = +el.dataset.s, e = +el.dataset.e;
          el.classList.toggle('future', s > week);
          el.classList.toggle('active', s <= week && week < e);
        });
        $$('.g-ms', p).forEach((el) => el.classList.toggle('future', +el.dataset.t > week));
      }
      $('.tl-status .txt', panels.today).textContent = statusToday(week);
      $('.tl-status .txt', panels.new).textContent = statusNew(week);
    }

    let raf = null, last = 0;
    const playBtn = $('#tl-play');
    function setPlayUi(on) {
      playBtn.innerHTML = (on ? ICON.pause : ICON.play) + `<span>${on ? 'Pause' : 'Spill av'}</span>`;
    }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = null; setPlayUi(false); }
    function tick(ts) {
      if (!last) last = ts;
      const dt = Math.min((ts - last) / 1000, 0.1);
      last = ts;
      const speed = D > 20 ? 7 : 1.4; // uker per sekund
      setWeek(week + dt * speed);
      if (week >= D) { stop(); return; }
      raf = requestAnimationFrame(tick);
    }
    playBtn.addEventListener('click', () => {
      if (raf) { stop(); return; }
      if (week >= D - 0.01) setWeek(0);
      last = 0;
      setPlayUi(true);
      raf = requestAnimationFrame(tick);
    });
    input.addEventListener('input', () => { stop(); setWeek(+input.value); });
    $$('#timeline [data-zoom]').forEach((btn) => btn.addEventListener('click', () => {
      selectToggle($$('#timeline [data-zoom]'), btn);
      D = +btn.dataset.zoom;
      input.max = D;
      layout();
      setWeek(Math.min(week, D));
    }));
    layout();
    setWeek(week);
    let rz;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 150); });
  })();

  /* ---------------- 2. Sakene ---------------- */
  (function cases() {
    const MAXY = 9;
    const CASES = [
      {
        id: 'watermoon', name: 'Watermoon', sub: 'Lukket anlegg, Hardangerfjorden',
        bar: { lo: 3.3, hold: [0.35, 2.92] }, todayTxt: '3,3 år, herav 2,5 år på vent',
        newBar: [0, 1 / 52], newTxt: 'svar dag 1 fra resipientregnskapet',
        title: 'Watermoon: svaret kom etter 3,3 år, men kunnskapen kunne ligget klar',
        story: [
          'Eide Fjordbruk søkte om å utvide lokaliteten Brandaskuta i Hardangerfjorden fra 2 340 til 5 940 tonn MTB, med fire lukkede Watermoon-enheter i tillegg til de åpne merdene. Kommunen anbefalte innvilgelse, og høringen ga ingen merknader.',
          'Avslaget kan være faglig riktig. Poenget er at 2,5 år gikk med til å vente på kunnskap som et løpende resipientregnskap ville hatt klar, og at regelverket ikke tilbyr noen rask vei for å bytte åpne merder med lukkede.',
        ],
        events: [
          { d: 'Desember 2022', t: 'Søknad om utvidelse fra 2 340 til 5 940 tonn MTB, med lukkede Watermoon-enheter.' },
          { d: 'Våren 2023', t: 'Statsforvalteren setter alle søknader i fjorden på vent til HI har levert ny kunnskap om fjordens tåleevne.', bad: true },
          { d: 'November 2025', t: 'HI leverer kunnskapen.' },
          { d: 'Mars 2026', t: 'Avslag fordi samlet utslipp ville øke. Lukkede anlegg krever individuell utslippstillatelse, mens åpne merder følger standardkrav i forskrift. Eide varsler klage.', end: true },
        ],
        newSys: 'Svar på dag 1 fra resipientregnskapet om økningen får plass i fjorden. En variant som bytter åpne merder mot lukkede uten økt samlet utslipp, kunne gått som rask vei i spor A.',
        src: 'Statsforvalteren i Vestland, vedtak 26.03.2026; iLaks 29.03.2026',
      },
      {
        id: 'blar', name: 'Blár', sub: 'Utviklingstillatelser, Octopus',
        bar: { lo: 8 }, todayTxt: 'om lag 8 år',
        newTxt: 'avklaring på måneder',
        title: 'Blár: om lag åtte år og kritikk fra Sivilombudet',
        story: [
          'Roxel Aqua, i dag Blár, søkte 16. november 2017 om 14 utviklingstillatelser for havbrukskonseptet Octopus, dagen før ordningen stengte.',
        ],
        events: [
          { d: 'November 2017', t: 'Søknad om 14 utviklingstillatelser.' },
          { d: 'November 2018', t: 'Fiskeridirektoratet avslår.' },
          { d: '2021–2022', t: 'Nærings- og fiskeridepartementet opphever avslaget i mars 2021, men omgjør sitt eget vedtak i november 2022.', bad: true },
          { d: '31. mai 2024', t: 'Sivilombudet konkluderer med at departementet ikke hadde grunnlag for omgjøringen. Departementet lar deretter flere svarfrister fra ombudet gå ut.', bad: true },
          { d: '28. november 2025', t: 'Etter at departementet har gjort om omgjøringen, får Blár 9,3 av 14 omsøkte utviklingstillatelser fra Fiskeridirektoratet.', end: true },
        ],
        newSys: 'Frist for klageinstansen og sporbar saksgang. Avklaring på måneder.',
        src: 'Sivilombudet, sak 2022/6056; Stortinget, Dokument 15:544 (2024–2025); iLaks 02.12.2025',
      },
      {
        id: 'sjomat', name: 'Norsk Sjømat', sub: 'Visningstillatelser, Stranda',
        bar: { lo: 3, open: true }, todayTxt: 'over 3 år uten svar',
        newTxt: 'status synlig, frist med konsekvens',
        title: 'Norsk Sjømat: tre år uten svar',
        story: [
          'Norsk Sjømat på Stranda søkte om to visningstillatelser. Tre år senere var saken fortsatt uavklart.',
        ],
        events: [
          { d: 'Mai 2016', t: 'Søknad om to visningstillatelser.' },
          { d: 'Januar 2019', t: 'Saken er fortsatt uavklart. Fiskeriministeren kan ikke gi noen tidsramme, med henvisning til arbeidsbelastning i direktorat og departement.', bad: true },
          { d: 'Juni 2019', t: 'Betinget tilsagn om én visningstillatelse. Tilsagnet faller senere bort etter at Fylkesmannen går imot kommunens dispensasjon for lokalitetene.' },
          { d: 'Februar 2021', t: 'Saken om nye lokaliteter er fortsatt uavklart i departementet.', bad: true },
        ],
        newSys: 'Søkeren ser hvor saken ligger. Fristene har konsekvens, og tid per etat publiseres.',
        src: 'iLaks 30.01.2019 og 19.06.2019; Stortinget, Dokument 15:1356 (2020–2021)',
      },
      {
        id: 'nordland', name: 'Nordland', sub: 'Lokalitetssøknader',
        bar: { lo: 100 / 52, hi: 150 / 52 }, todayTxt: '100–150 uker',
        newBar: [6 / 52, 8 / 52], newTxt: '6–8 uker i spor B',
        title: 'Nordland: samme lov, svært ulik praksis',
        story: [
          'SinkabergHansen oppga i 2024 saksbehandlingstider på 100–150 uker. Lovundlaks visste ikke hvor høstsmolten skulle settes ut, og oppdrettere måtte slakte ut fisk for tidlig fordi økt MTB ikke ble behandlet i tide.',
          'Etter hvert ble saker fordelt til statsforvaltere i andre fylker. At køen kan løses ved å flytte saker, viser at problemet er kapasitet og praksis, ikke regelverket.',
        ],
        mini: {
          title: 'Andel søknader om store lokaliteter klarert siden 2019',
          note: 'Bård Ludvig Thorheim, 2023',
          rows: [['Nordland', 4, true], ['Trøndelag', 75], ['Troms og Finnmark', 85]],
        },
        events: [
          { d: '2023', t: 'Bare 4 % av søknadene om store lokaliteter siden 2019 er klarert i Nordland.', bad: true },
          { d: '2024', t: 'Saksbehandlingstid på 100–150 uker, mot forskriftens ca. 30 uker.', bad: true },
          { d: 'Senere', t: 'Saker fordeles til statsforvaltere i andre fylker.' },
        ],
        newSys: 'Felles regler og sakmappe. Saker fordeles automatisk mellom embeter når køen vokser.',
        src: 'iLaks 03.05.2024; Statsforvalteren i Nordland',
      },
      {
        id: 'p15', name: 'Akvakulturloven § 15', sub: 'Parallell som ikke brukes',
        todayTxt: 'plan først, så lokalitet',
        newTxt: 'parallell som standard',
        title: 'Akvakulturloven § 15: parallell behandling som ikke brukes',
        story: [
          'Loven lar kommunen samtykke til at en lokalitetssøknad behandles mens dispensasjon eller planendring pågår. Advokatene Lars S. Alsaker og Halfdan Mellbye skrev i 2021 at flere fylkeskommuner likevel venter til planspørsmålet er avklart.',
          'Resultatet er behandling i sekvens der Stortinget har åpnet for parallell.',
        ],
        schematic: true,
        events: [],
        newSys: 'Parallell behandling er standard i plattformen. Sekvens krever begrunnelse.',
        src: 'iLaks 22.10.2021',
      },
    ];

    const list = $('#case-list');
    const detail = $('#case-detail');
    const pct = (y) => (y / MAXY) * 100;

    list.innerHTML = CASES.map((c) => {
      let t = '';
      if (c.bar) {
        const b = c.bar;
        if (b.hold) {
          t += `<i class="t" style="left:0;width:${pct(b.hold[0])}%"></i><i class="t hold" style="left:${pct(b.hold[0])}%;width:${pct(b.hold[1] - b.hold[0])}%"></i><i class="t" style="left:${pct(b.hold[1])}%;width:${pct(b.lo - b.hold[1])}%"></i>`;
        } else {
          t += `<i class="t${b.open ? ' open' : ''}" style="left:0;width:${pct(b.lo)}%"></i>`;
          if (b.hi) t += `<i class="t range" style="left:${pct(b.lo)}%;width:${pct(b.hi - b.lo)}%"></i>`;
        }
        const end = b.hi || b.lo;
        t += pct(end) > 70
          ? `<em style="right:${100 - pct(end)}%;padding:0 .35rem;background:var(--surface);border-radius:3px;top:-.1rem;line-height:1rem">${esc(c.todayTxt)}</em>`
          : `<em style="left:${pct(end)}%">${esc(c.todayTxt)}</em>`;
      } else {
        t += `<em style="left:0;padding-left:0">${esc(c.todayTxt)}</em>`;
      }
      let n = '';
      if (c.newBar) n = `<i class="n" style="left:0;width:${pct(c.newBar[1])}%"></i><em class="newtxt" style="left:${pct(c.newBar[1])}%">${esc(c.newTxt)}</em>`;
      else n = `<em class="newtxt" style="left:0;padding-left:0">${esc(c.newTxt)}</em>`;
      return `<button type="button" class="case-btn" data-id="${c.id}" aria-pressed="false">
        <span class="nm">${esc(c.name)}<small>${esc(c.sub)}</small></span>
        <span class="case-bars"><span class="cb">${t}</span><span class="cb">${n}</span></span>
      </button>`;
    }).join('');

    $('#case-ticks').innerHTML = [0, 2, 4, 6, 8].map((y) => `<span style="left:${pct(y)}%">${y ? y + ' år' : '0'}</span>`).join('');

    function show(id) {
      const c = CASES.find((x) => x.id === id);
      $$('.case-btn', list).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
      let html = `<p class="eyebrow">Sak</p><h3>${esc(c.title)}</h3>`;
      html += c.story.map((s) => `<p class="story">${esc(s)}</p>`).join('');
      if (c.mini) {
        html += `<div class="mini-bars" role="table" aria-label="${esc(c.mini.title)}"><p class="small" style="grid-template-columns:none;display:block">${esc(c.mini.title)} <span style="color:var(--ink-3)">(${esc(c.mini.note)})</span></p>`;
        html += c.mini.rows.map(([n, v, hl]) => `<div role="row"><span role="cell">${esc(n)}</span><span class="b" role="cell"><i class="${hl ? 'hl' : ''}" style="width:${v}%"></i></span><span class="v" role="cell">${v} %</span></div>`).join('');
        html += '</div>';
      }
      if (c.schematic) {
        html += `<div class="mini-bars" aria-label="Sekvens mot parallell">
          <p class="small" style="display:block">Skjematisk, uten tidsskala</p>
          <div><span>I dag: plan</span><span class="b"><i style="width:50%"></i></span><span></span></div>
          <div><span>I dag: lokalitet</span><span class="b"><i class="hl" style="left:50%;width:50%"></i></span><span></span></div>
          <div><span>Nytt: plan</span><span class="b"><i style="width:50%;background:var(--new)"></i></span><span></span></div>
          <div><span>Nytt: lokalitet</span><span class="b"><i style="width:50%;background:var(--new)"></i></span><span></span></div>
        </div>`;
      }
      if (c.events.length) {
        html += '<ol class="events">' + c.events.map((e) => `<li class="${e.bad ? 'bad' : ''}${e.end ? ' end' : ''}"><time>${esc(e.d)}</time>${esc(e.t)}</li>`).join('') + '</ol>';
      }
      html += `<div class="ds-alert newbox" data-color="info" data-size="sm"><p><strong>I nytt system:</strong> ${esc(c.newSys)}</p></div>`;
      html += `<p class="small" style="margin-top:1rem">Kilde: ${esc(c.src)}</p>`;
      detail.innerHTML = html;
    }
    list.addEventListener('click', (e) => {
      const b = e.target.closest('.case-btn');
      if (b) show(b.dataset.id);
    });
    show('watermoon');
  })();

  /* ---------------- 3. Årsaker og prinsipper ---------------- */
  (function causes() {
    const ROWS = [
      ['Frister uten konsekvens', 'Tidsfristforskriften § 7 gjør oversittede frister rettslig kostnadsfrie. Det gjelder også klageinstanser, inkludert departementet.',
        'Frister med konsekvens og full åpenhet', 'Søkeren ser hvor saken ligger. Saksbehandlingstid per etat og embete publiseres løpende.'],
      ['Sekvens i stedet for parallell', 'Søknaden går gjennom kommune og etater etter tur, og planspørsmål avklares ofte før resten starter, selv der loven tillater parallell behandling.',
        'Parallell som hovedregel', 'Alle etater og kommunen jobber samtidig. Sekvens krever begrunnelse.'],
      ['Kunnskap settes sammen sak for sak', 'Dataene om fjordenes tilstand finnes i Vannmiljø, TEOTIL og HIs modeller, men settes sammen for hånd. Når kunnskapen mangler, stanser alle saker i området.',
        'Kunnskap på forhånd', 'Hva fjordene tåler og hvor sårbar natur finnes, holdes løpende oppdatert og er åpent tilgjengelig.'],
      ['Søknader som ikke er komplette', 'Klokken nullstilles når en søknad erklæres ufullstendig, og den samme dokumentasjonen sendes som separate vedlegg til flere etater.',
        'Én søknad, data én gang. Komplett før start.', 'Alt som finnes i offentlige registre, hentes automatisk. Krav som kan sjekkes maskinelt, sjekkes før innsending.'],
      ['Tyngre prosess for renere teknologi', 'Åpne merder er regulert av standardkrav; lukkede anlegg trenger individuell tillatelse. Det finnes ingen standard vei for å bytte åpent mot lukket.',
        'Proporsjonalitet', 'Enkle saker og saker som reduserer belastningen, får en rask vei. Kompliserte saker får den tiden de trenger, men med frister.'],
      ['Ingen ser helheten', 'Fylkeskommunen koordinerer, men har ingen myndighet over sektoretatene. Ingen publiserer saksbehandlingstid per etat og embete.',
        'Felles sakmappe og åpne nøkkeltall', 'Etatene deler samme sakmappe. Saker kan fordeles mellom embeter når køen vokser.'],
    ];
    $('#causes').innerHTML = ROWS.map(([c, cp, f, fp], i) => `<div class="cause">
      <span class="i">${String(i + 1).padStart(2, '0')}</span>
      <div><h4>${esc(c)}</h4><p>${esc(cp)}</p></div>
      <span class="arrow">${ICON.arrow}</span>
      <div class="fix"><h4>${esc(f)}</h4><p>${esc(fp)}</p></div>
    </div>`).join('');
  })();

  /* ---------------- Felles modell for resipientregnskapet (eksempeldata) ---------------- */
  const STOFF = [
    { k: 'N', name: 'Nitrogen', coef: 0.04 },
    { k: 'P', name: 'Fosfor', coef: 0.006 },
    { k: 'O', name: 'Organisk stoff', coef: 0.2 },
  ];
  const BODIES = [
    { id: 'ytre', name: 'Ytre kyst', type: 'Åpen kyst', cap: { N: 900, P: 120, O: 4000 }, load: { N: 380, P: 44, O: 1500 }, site: 3900 },
    { id: 'ytrefj', name: 'Ytre fjord', type: 'Fjord, god vannutskiftning', cap: { N: 520, P: 70, O: 2400 }, load: { N: 300, P: 41, O: 1500 }, site: 2340 },
    { id: 'midt', name: 'Midtfjorden', type: 'Fjord', cap: { N: 400, P: 52, O: 1800 }, load: { N: 290, P: 38, O: 1250 }, site: 3120 },
    { id: 'nord', name: 'Nordarmen', type: 'Sidearm', cap: { N: 180, P: 24, O: 800 }, load: { N: 120, P: 19, O: 600 }, site: 1560 },
    { id: 'indre', name: 'Indre fjord', type: 'Smal fjordarm', cap: { N: 220, P: 30, O: 900 }, load: { N: 205, P: 29, O: 880 }, site: 2340 },
    { id: 'pollen', name: 'Sørpollen', type: 'Terskelfjord, svak utskiftning', cap: { N: 60, P: 8, O: 250 }, load: { N: 66, P: 8.5, O: 270 }, site: 1170 },
  ];
  function applyAction(body, act, mtb, rens) {
    const r = rens / 100;
    const out = {};
    for (const s of STOFF) {
      let add = 0;
      if (act === 'open') add = mtb * s.coef;
      else if (act === 'closed') add = mtb * s.coef * (1 - r);
      else if (act === 'swap') add = -body.site * s.coef * r;
      const after = body.load[s.k] + add;
      out[s.k] = { add, after, pct: (after / body.cap[s.k]) * 100, basePct: (body.load[s.k] / body.cap[s.k]) * 100 };
    }
    out.max = Math.max(...STOFF.map((s) => out[s.k].pct));
    return out;
  }
  function maxMtb(body, factor) {
    let m = Infinity;
    for (const s of STOFF) m = Math.min(m, (body.cap[s.k] - body.load[s.k]) / (s.coef * factor));
    return Math.max(0, Math.floor(m / 390) * 390);
  }

  /* ---------------- 4a. Søkerens side ---------------- */
  (function application() {
    const body = BODIES.find((b) => b.id === 'midt');
    const f = {
      type: $('#f-type'), mtb: $('#f-mtb'), tech: $('#f-tech'),
      strom: $('#a-strom'), bunn: $('#a-bunn'), fort: $('#a-fort'), rens: $('#a-rens'),
    };
    const rulesEl = $('#rules');
    const submit = $('#app-submit');
    const badge = $('#track-badge');
    const statusBox = $('#app-status');
    const stepper = $('#stepper');
    let submitted = false, step = 0, prevType = f.type.value;

    function state() {
      const type = f.type.value;
      if (type === 'bytte') { f.mtb.value = 0; f.tech.value = 'closed'; }
      else if (prevType === 'bytte') { f.mtb.value = 1560; f.tech.value = 'open'; }
      prevType = type;
      if (!submitted) {
        f.mtb.disabled = type === 'bytte';
        f.tech.disabled = type === 'bytte';
      }
      const mtb = Math.max(0, +f.mtb.value || 0);
      const tech = f.tech.value;
      const act = type === 'bytte' ? 'swap' : tech === 'closed' ? 'closed' : 'open';
      const res = applyAction(body, act, mtb, 60);
      const within = STOFF.every((s) => res[s.k].after <= body.cap[s.k] + 1e-9);
      const worst = STOFF.reduce((a, s) => (res[s.k].pct > res[a.k].pct ? s : a), STOFF[0]);
      const rules = [
        { ok: true, t: 'Lokaliteten ligger i område avsatt til akvakultur', s: 'Kystsoneplan, hentet automatisk' },
        {
          ok: within,
          t: type === 'bytte' ? 'Tiltaket reduserer samlet utslipp' : 'Søkt MTB er innenfor resipientens handlingsrom',
          s: `Resipientregnskap Midtfjorden: ${fmt(res[worst.k].pct)} % av kapasiteten for ${worst.name.toLowerCase()} brukt etter tiltaket${tech === 'closed' ? ' (60 % rensegrad)' : ''}`,
        },
        { ok: f.strom.checked, na: type === 'bytte', t: 'Strømmåling er vedlagt', s: 'Akvakulturforskriften' },
        { ok: f.bunn.checked, na: type === 'bytte', t: 'Bunnundersøkelse er vedlagt', s: 'NS 9410' },
        { ok: f.fort.checked, t: 'Fortøyningsanalyse er vedlagt', s: 'NS 9415' },
        { ok: f.rens.checked, na: tech !== 'closed', t: 'Rensegrad for lukket anlegg er dokumentert', s: 'Standard for måling og verifisering' },
      ];
      if (type !== 'bytte' && mtb <= 0) { rules[1].ok = false; rules[1].s = 'Oppgi en økning i MTB større enn 0'; }
      return { type, mtb, tech, rules, within };
    }

    function render() {
      const st = state();
      const active = st.rules.filter((r) => !r.na);
      const passed = active.filter((r) => r.ok).length;
      rulesEl.innerHTML = st.rules.map((r) => {
        const cls = r.na ? 'na' : r.ok ? 'pass' : 'fail';
        const ic = r.na ? ICON.dash : r.ok ? ICON.check : ICON.cross;
        return `<li class="${cls}"><span class="ic">${ic}</span><span>${esc(r.t)}<small>${r.na ? 'Gjelder ikke for denne søknaden' : esc(r.s)}</small></span></li>`;
      }).join('');
      $('#rule-count').textContent = `${passed} av ${active.length} krav oppfylt`;
      const ready = passed === active.length;
      submit.disabled = !ready || submitted;
      submit.textContent = submitted ? 'Søknaden er sendt' : ready ? 'Send søknad' : 'Rett opp før innsending';
      const spor = st.type === 'bytte' ? ['A', '1–2 uker'] : ['B', '6–8 uker'];
      if (!st.within) badge.innerHTML = '<div class="ds-alert" data-color="danger" data-size="sm"><p>Over handlingsrommet i resipientregnskapet. Prøv lavere MTB eller lukket anlegg.</p></div>';
      else badge.innerHTML = `<div class="ds-alert" data-color="info" data-size="sm"><p><strong>Spor ${spor[0]}:</strong> forventet vedtak innen ${spor[1]}.</p></div>`;
      if (submitted) renderSteps(st);
    }

    function steps(st) {
      if (st.type === 'bytte') {
        return [
          ['Sendt og validert', 'Dag 0', 'Alle krav oppfylt før innsending'],
          ['Sakmappe åpnet, spor A', 'Dag 1', 'Resipientsjekk: tiltaket reduserer belastningen'],
          ['Varsling til berørte og etatenes frist', 'Uke 1', 'Ligger hos: alle etater samtidig'],
          ['Vedtak', 'Uke 1–2', 'Signert av navngitt saksbehandler'],
        ];
      }
      return [
        ['Sendt og validert', 'Dag 0', 'Alle krav oppfylt før innsending'],
        ['Sakmappe åpnet, spor B', 'Dag 1', 'Resipientsjekk bestått, høringsvarsel sendt'],
        ['Etatene vurderer parallelt', 'Dag 1–14', 'Ligger hos: kommunen og fire sektoretater'],
        ['Offentlig ettersyn', 'Uke 1–4', 'Innspill kommer inn via app og web'],
        ['Motstrid avklares', 'Uke 5', 'Ligger hos: fylkeskommunen'],
        ['Vedtak', 'Uke 6', 'Signert av navngitt saksbehandler, publisert i eInnsyn'],
      ];
    }
    function renderSteps(st) {
      const list = steps(st);
      step = Math.min(step, list.length - 1);
      stepper.innerHTML = list.map(([t, when, sub], i) => {
        const cls = i < step || (i === step && i === list.length - 1) ? 'done' : i === step ? 'now' : '';
        return `<li class="${cls}"><span class="dot">${i < step || cls === 'done' ? ICON.check : i + 1}</span><span class="t">${esc(t)}<small>${esc(sub)}</small></span><span class="when">${esc(when)}</span></li>`;
      }).join('');
      const nextBtn = $('#step-next');
      nextBtn.disabled = step >= list.length - 1;
      nextBtn.textContent = step >= list.length - 1 ? 'Vedtak fattet' : 'Neste steg';
    }

    $('#app-form').addEventListener('input', render);
    $('#app-form').addEventListener('change', render);
    $('#app-form').addEventListener('submit', (e) => e.preventDefault());
    submit.addEventListener('click', () => {
      submitted = true; step = 1;
      $$('#app-form input, #app-form select').forEach((el) => { if (!el.readOnly) el.disabled = true; });
      statusBox.hidden = false;
      render();
    });
    $('#step-next').addEventListener('click', () => { step++; render(); });
    $('#step-reset').addEventListener('click', () => {
      submitted = false; step = 0;
      $$('#app-form input, #app-form select').forEach((el) => { el.disabled = false; });
      statusBox.hidden = true;
      render();
    });
    render();
  })();

  /* ---------------- 4b. Sakmappe ---------------- */
  (function folder() {
    const ETATER = [
      { id: 'kommune', name: 'Kommunen', law: 'Plan- og bygningsloven · kystsoneplan',
        draft: 'Kommunen anbefaler innvilgelse. Lokaliteten ligger i område avsatt til akvakultur i vedtatt kystsoneplan, og utvidelsen er innenfor arealformålet.',
        srcs: ['Kystsoneplan, arealformål A', 'Akvakulturloven § 15'] },
      { id: 'fdir', name: 'Fiskeridirektoratet', law: 'Akvakulturloven § 16', flag: true,
        draft: 'Ingen innvendinger til arealbruken slik den er søkt. Registrert gytefelt for torsk ligger sør for lokaliteten; fortøyninger må ikke legges i feltet.',
        srcs: ['Akvakulturloven § 16', 'Kartdata: gytefelt'] },
      { id: 'mt', name: 'Mattilsynet', law: 'Matloven · etableringsforskriften',
        draft: 'Ingen innvendinger. Smittestatus og avstand til nabolokaliteter er vurdert, og lusenivået i området siste 12 måneder er tatt med.',
        srcs: ['Etableringsforskriften', 'BarentsWatch: lus og sykdom'] },
      { id: 'kv', name: 'Kystverket', law: 'Havne- og farvannsloven § 14', flag: true, objection: true,
        draft: 'Innvending: nordre fortøyningsline krysser en biled. Fortøyningen bes flyttet 120 m sørover for å holde leia fri.',
        srcs: ['Havne- og farvannsloven § 14', 'Kystverket: farledsdata'] },
      { id: 'sf', name: 'Statsforvalteren', law: 'Forurensningsloven § 11', active: true,
        draft: 'Utkast til utslippstillatelse: tiltaket ligger innenfor resipientregnskapet for Midtfjorden, med 88 % av handlingsrommet for nitrogen brukt etterpå. Vilkår om miljøovervåking etter NS 9410.',
        srcs: ['Forurensningsloven § 11', 'Resipientregnskap: Midtfjorden', 'Naturmangfoldloven §§ 8–12'] },
    ];
    const state = { day: 7, signed: { kommune: 4 }, editing: null };
    const cols = $('#cols');

    function render() {
      const { day } = state;
      cols.innerHTML = ETATER.map((e) => {
        const signed = state.signed[e.id];
        const lapsed = day > 10 && !signed && !e.active;
        let chip;
        if (signed) chip = e.objection ? tag('Innvending sendt', 'warning') : tag('Uttalelse sendt', 'success');
        else if (lapsed) chip = tag('Ingen innvendinger, frist passert');
        else if (day > 10 && e.active) chip = tag('Krever aktivt vedtak', 'warning');
        else chip = tag('Under vurdering', 'info');
        const shown = Math.min(day, 10);
        const countLbl = day > 10 ? '<span>Fristen gikk ut</span><span>dag 10</span>' : `<span>Virkedag ${shown} av 10</span><span>${10 - shown} igjen</span>`;
        const who = signed ? `${ICON.pen} Signert uttalelse` : `${ICON.spark} AI-utkast · ikke sendt`;
        const editing = state.editing === e.id;
        let acts = '';
        if (!signed && !lapsed) {
          acts = `<div class="acts"><button type="button" class="ds-button" data-variant="primary" data-size="sm" data-act="sign" data-id="${e.id}">Godkjenn og signer</button><button type="button" class="ds-button" data-variant="secondary" data-size="sm" data-act="edit" data-id="${e.id}">${editing ? 'Ferdig' : 'Rediger'}</button></div>`;
        }
        const foot = signed
          ? `<span class="signed">${ICON.check} Signert av saksbehandler, dag ${signed}</span>`
          : lapsed ? '<span class="small">Utkastet ble ikke sendt. Uttalelsen regnes som ingen innvendinger.</span>' : '';
        return `<div class="col${e.flag && !lapsed ? ' flag' : ''}">
          <div><h4>${esc(e.name)}</h4><div class="law">${esc(e.law)}</div></div>
          <div class="count${day > 10 ? ' over' : ''}"><div class="lbl">${countLbl}</div><div class="bar"><i style="width:${shown * 10}%"></i></div></div>
          <div>${chip}</div>
          <div class="draft${lapsed ? ' lapsed' : ''}"><div class="who">${who}</div><div class="txt" data-id="${e.id}" ${editing ? 'contenteditable="true"' : ''}>${esc(e.draft)}</div>
            <div class="srcs">${e.srcs.map((s) => tag(s, 'neutral', true)).join('')}</div></div>
          ${acts}${foot}
        </div>`;
      }).join('');
      if (state.editing) {
        const t = $(`.txt[data-id="${state.editing}"]`, cols);
        if (t) t.focus();
      }
      const kvLive = state.signed.kv || day <= 10;
      $('#conflict').hidden = !kvLive;
      const open = ETATER.filter((e) => !state.signed[e.id]).length;
      $('#folder-note').textContent = day <= 10
        ? `${open} av 5 etater har ikke sendt uttalelse. Fristen er 10 virkedager, og alle ser den samme nedtellingen.`
        : 'Etater som ikke meldte innvendinger innen fristen, regnes å ikke ha innvendinger. Statsforvalterens utslippstillatelse krever alltid et aktivt vedtak og kan ikke passere på frist.';
    }
    cols.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-act]');
      if (!b) return;
      const id = b.dataset.id;
      const e = ETATER.find((x) => x.id === id);
      const t = $(`.txt[data-id="${id}"]`, cols);
      if (t && state.editing === id) e.draft = t.textContent.trim() || e.draft;
      if (b.dataset.act === 'sign') { state.signed[id] = Math.min(state.day, 10); state.editing = null; }
      else state.editing = state.editing === id ? null : id;
      render();
    });
    $$('#sakmappe [data-day]').forEach((btn) => btn.addEventListener('click', () => {
      selectToggle($$('#sakmappe [data-day]'), btn);
      if (state.editing) {
        const t = $(`.txt[data-id="${state.editing}"]`, cols);
        const e = ETATER.find((x) => x.id === state.editing);
        if (t && e) e.draft = t.textContent.trim() || e.draft;
        state.editing = null;
      }
      state.day = +btn.dataset.day;
      render();
    }));
    render();
  })();

  /* ---------------- 4c. Resipientregnskap ---------------- */
  (function recipient() {
    const svg = $('#map');
    const NS = 'http://www.w3.org/2000/svg';
    const cs = [[125, 120, 250], [180, 128, 236], [240, 134, 226], [290, 140, 222], [350, 150, 216], [420, 158, 212], [480, 168, 212], [540, 180, 214], [600, 190, 214], [630, 199, 207]];
    const strip = (a, b) => {
      const s = cs.slice(a, b + 1);
      return s.map(([x, t]) => [x, t]).concat(s.slice().reverse().map(([x, , bt]) => [x, bt]));
    };
    const SHAPES = {
      nord: [[333, 156], [322, 110], [330, 70], [346, 36], [362, 18], [380, 22], [376, 50], [368, 84], [372, 120], [390, 162]],
      pollen: [[205, 222], [198, 262], [206, 300], [228, 326], [256, 334], [272, 318], [262, 292], [250, 262], [252, 218]],
      ytre: [[0, 0], [112, 0], [118, 60], [125, 120], [125, 250], [116, 320], [104, 380], [0, 380]],
      ytrefj: strip(0, 3),
      midt: strip(3, 5),
      indre: strip(5, 9),
    };
    const LABELS = { ytre: [60, 140], ytrefj: [196, 176], midt: [400, 184], nord: [352, 64], indre: [548, 199], pollen: [236, 296] };
    const SITES = [[318, 205, 'Nordneset'], [190, 160], [250, 196], [462, 190], [505, 197], [356, 112], [230, 280], [70, 268]];
    const order = ['nord', 'pollen', 'ytre', 'ytrefj', 'midt', 'indre'];

    let out = `<defs><pattern id="over" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="7" height="7" style="fill:var(--seq-5)"/><rect width="2.5" height="7" style="fill:var(--crit)"/></pattern></defs>
      <rect width="640" height="380" style="fill:var(--land)"/>`;
    for (const id of order) {
      const b = BODIES.find((x) => x.id === id);
      const pts = SHAPES[id].map((p) => p.join(',')).join(' ');
      out += `<polygon class="wb" data-id="${id}" points="${pts}" tabindex="0" role="button" aria-label="${esc(b.name)}"/>`;
    }
    out += '<ellipse class="isle" cx="52" cy="92" rx="20" ry="11"/><ellipse class="isle" cx="78" cy="304" rx="24" ry="12"/><ellipse class="isle" cx="30" cy="198" rx="13" ry="8"/><ellipse class="isle" cx="98" cy="176" rx="9" ry="6"/>';
    for (const [x, y, name] of SITES) {
      out += `<circle class="site${name ? ' app' : ''}" cx="${x}" cy="${y}" r="${name ? 5.5 : 3.5}"/>`;
      if (name) out += `<text class="sitelbl" x="${x - 9}" y="${y + 16}" text-anchor="end">${esc(name)}</text>`;
    }
    for (const id of order) {
      const [x, y] = LABELS[id];
      const b = BODIES.find((q) => q.id === id);
      out += `<text class="lbl" x="${x}" y="${y}" text-anchor="middle">${esc(b.name)}</text><text class="lbl pct" data-pct="${id}" x="${x}" y="${y + 14}" text-anchor="middle"></text>`;
    }
    out += `<g transform="translate(600 46)"><circle class="compass" r="16"/><path d="M0 -13 4 4 0 1 -4 4z" style="fill:var(--ink-2)"/><text class="compass-t" y="-20" text-anchor="middle">N</text></g>
      <text class="compass-t" x="630" y="370" text-anchor="end">Skjematisk · tenkt fjord</text>`;
    svg.innerHTML = out;

    const BINS = [[50, 1, 'under 50 %'], [65, 2, '50–65 %'], [80, 3, '65–80 %'], [90, 4, '80–90 %'], [100, 5, '90–100 %']];
    const fillFor = (p) => {
      if (p > 100) return 'url(#over)';
      const bin = BINS.find(([lim]) => p < lim) || BINS[BINS.length - 1];
      return `var(--seq-${bin[1]})`;
    };
    $('#map-legend').innerHTML = '<span>Brukt av kapasiteten, høyeste stoff:</span>' + BINS.map(([, i, l]) => `<span><i style="background:var(--seq-${i})"></i>${l}</span>`).join('') + '<span><i class="over"></i>over kapasitet</span>';

    const sel = $('#r-body'), act = $('#r-act'), mtb = $('#r-mtb'), rens = $('#r-rens');
    sel.innerHTML = BODIES.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join('');
    sel.value = 'midt';

    function render() {
      const body = BODIES.find((b) => b.id === sel.value);
      const a = act.value, m = +mtb.value, r = +rens.value;
      $('#r-mtb-f').hidden = a === 'swap' || a === 'none';
      $('#r-rens-f').hidden = !(a === 'closed' || a === 'swap');
      $('#r-mtb-o').textContent = `${fmt(m)} t`;
      $('#r-rens-o').textContent = `${r} %`;
      $('#wb-name').textContent = body.name;
      $('#wb-type').textContent = body.type + (a === 'swap' ? ` · eksisterende anlegg ${fmt(body.site)} t MTB` : '');

      for (const b of BODIES) {
        const res = applyAction(b, b.id === body.id ? a : 'none', m, r);
        const poly = $(`.wb[data-id="${b.id}"]`, svg);
        poly.style.fill = fillFor(res.max);
        poly.classList.toggle('sel', b.id === body.id);
        $(`[data-pct="${b.id}"]`, svg).textContent = `${fmt(res.max)} %`;
      }

      const res = applyAction(body, a, m, r);
      const S = 130;
      $('#loads').innerHTML = STOFF.map((s) => {
        const x = res[s.k];
        const lo = Math.min(x.basePct, x.pct), hi = Math.max(x.basePct, x.pct);
        const w = (v) => Math.min(v, S) / S * 100;
        let bars = `<i class="base" style="width:${w(lo)}%"></i>`;
        if (x.add > 0.0001) bars += `<i class="add" style="left:${w(lo)}%;width:${w(hi) - w(lo)}%"></i>`;
        if (x.add < -0.0001) bars += `<i class="cut" style="left:${w(lo)}%;width:${w(hi) - w(lo)}%"></i>`;
        const tipHtml = `<b>${s.name}</b><br>Kapasitet: ${fmt(body.cap[s.k])} t/år<br>I dag: ${nf1.format(body.load[s.k])} t/år<br>Etter tiltaket: ${nf1.format(x.after)} t/år (${x.add >= 0 ? '+' : '−'}${nf1.format(Math.abs(x.add))})`;
        return `<div class="load"><div class="top"><b>${s.name}</b><span class="num">${nf1.format(x.after)} / ${fmt(body.cap[s.k])} t/år · ${fmt(x.pct)} %</span></div>
          <div class="bar" tabindex="0" data-tip="${esc(tipHtml)}" aria-label="${s.name}: ${fmt(x.pct)} prosent av kapasiteten">${bars}<span class="cap" style="left:${100 / S * 100}%"></span></div></div>`;
      }).join('');

      const v = $('#verdict');
      const over = STOFF.filter((s) => res[s.k].after > body.cap[s.k] + 1e-9);
      if (a === 'none') {
        v.dataset.color = 'info';
        v.innerHTML = `<b>Gjenværende handlingsrom</b><span>${STOFF.map((s) => `${s.name}: ${nf1.format(Math.max(0, body.cap[s.k] - body.load[s.k]))} t/år`).join(' · ')}</span><span class="small">Søkeren ser dette før søknaden skrives.</span>`;
      } else if (a === 'swap') {
        if (r === 0) {
          v.dataset.color = 'info';
          v.innerHTML = '<b>Ingen endring</b><span>Uten målt rensing endrer ikke byttet belastningen.</span>';
        } else {
          v.dataset.color = 'success';
          v.innerHTML = `<b>Reduserer belastningen · spor A, 1–2 uker</b><span>Nitrogen ned ${nf1.format(-res.N.add)} t/år. Bytte fra åpen til lukket uten økt MTB går rett i rask vei.</span><span class="small">I dag finnes ingen standard vei for dette. Watermoon-saken tok 3,3 år.</span>`;
        }
      } else if (m === 0) {
        v.dataset.color = 'info';
        v.innerHTML = '<b>Velg en økning i MTB</b><span>Flytt glidebryteren for å se hva søknaden gjør med regnskapet.</span>';
      } else if (!over.length) {
        v.dataset.color = 'success';
        v.innerHTML = `<b>Innenfor handlingsrommet · spor B, 6–8 uker</b><span>Etter tiltaket er ${fmt(res.max)} % av kapasiteten brukt for stoffet med minst margin. Svaret er klart dag 1, uten å vente på nye utredninger.</span>`;
      } else {
        const factor = a === 'closed' ? 1 - r / 100 : 1;
        const maxSame = factor > 0 ? maxMtb(body, factor) : Infinity;
        const altR = a === 'open' ? 60 : Math.min(90, r + 20);
        const maxAlt = maxMtb(body, 1 - altR / 100);
        let hint;
        if (maxSame <= 0 && maxAlt <= 0) hint = 'Ingen økning er mulig i denne vannforekomsten. Bytte fra åpen til lukket teknologi går derimot i spor A.';
        else {
          hint = `Største økning innenfor: ${fmt(maxSame)} t med ${a === 'open' ? 'åpen merd' : `${r} % rensegrad`}.`;
          if (maxAlt > maxSame) hint += ` Med lukket anlegg og ${altR} % rensegrad: ${fmt(maxAlt)} t.`;
        }
        v.dataset.color = 'danger';
        v.innerHTML = `<b>Over kapasitet for ${over.map((s) => s.name.toLowerCase()).join(' og ')}</b><span>Søknaden kan ikke innvilges slik den er.</span><span>${hint}</span>`;
      }
    }
    svg.addEventListener('click', (e) => {
      const p = e.target.closest('.wb');
      if (p) { sel.value = p.dataset.id; render(); }
    });
    svg.addEventListener('keydown', (e) => {
      const p = e.target.closest('.wb');
      if (p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); sel.value = p.dataset.id; render(); }
    });
    [sel, act, mtb, rens].forEach((el) => el.addEventListener('input', render));
    render();
  })();

  /* ---------------- 4d. Høringsappen ---------------- */
  (function hearing() {
    const GROUPS = [
      { id: 'fiske', name: 'Fiske og ferdsel', count: 12, kw: ['garn', 'fiskeplass', 'fiskar', 'fiske', 'båt', 'led', 'ferdsel', 'fortøyning', 'sjark', 'teine', 'krabbe'],
        quotes: [['Vi setter garn ved Nordneset hver høst. Fortøyningene må ikke gå inn i fiskeplassen.', 'Fiskar, Nordneset'], ['Leia nord for neset brukes av fritidsbåter hele sommeren.', 'Båtforening']] },
      { id: 'jobb', name: 'Arbeidsplasser og ringvirkninger', count: 10, kw: ['jobb', 'arbeid', 'stilling', 'ringvirkning', 'leverandør', 'bygd', 'skatt', 'næring', 'lokal'],
        quotes: [['Utvidelsen betyr tre nye helårsstillinger i bygda.', 'Næringsforening'], ['Lokale leverandører trenger at anlegget har aktivitet hele året.', 'Nabo']] },
      { id: 'villfisk', name: 'Villaks og lus', count: 9, kw: ['villaks', 'laks', 'lus', 'sjøaure', 'sjøørret', 'elv', 'rømming', 'rømt'],
        quotes: [['Elva innerst i fjorden har en sårbar laksebestand. Hva gjør dere med lusa?', 'Elveeierlag'], ['Jeg vil se lusetallene fra anlegget før det utvides.', 'Grunneier']] },
      { id: 'naer', name: 'Lys, støy og utsikt', count: 7, kw: ['lys', 'støy', 'utsikt', 'lukt', 'hytte', 'friluft', 'bad'],
        quotes: [['Fôrflåten lyser rett inn i stua om vinteren.', 'Nabo, 1,2 km'], ['Støy fra servicebåter tidlig om morgenen er allerede et problem.', 'Hytteeier']] },
      { id: 'tek', name: 'Teknologivalg', count: 3, kw: ['lukket', 'teknologi', 'åpen merd', 'åpne merder', 'rensing', 'slam'],
        quotes: [['Hvorfor ikke lukket anlegg når de først utvider?', 'Naturvernforbund, lokallag']] },
    ];
    const ORDER = ['tek', 'villfisk', 'naer', 'jobb', 'fiske'];
    const open = new Set();
    const groupsEl = $('#groups');

    function render(flashId) {
      const max = Math.max(...GROUPS.map((g) => g.count));
      const total = GROUPS.reduce((a, g) => a + g.count, 0);
      $('#h-summary').textContent = `${total} innspill i ${GROUPS.length} grupper. Gruppene er sortert etter antall.`;
      const sorted = GROUPS.slice().sort((a, b) => b.count - a.count);
      groupsEl.innerHTML = sorted.map((g) => {
        const isOpen = open.has(g.id);
        return `<div class="group${g.id === flashId ? ' flash' : ''}" data-id="${g.id}">
          <button type="button" aria-expanded="${isOpen}" aria-controls="q-${g.id}">
            <span class="gname">${esc(g.name)}</span>
            <span><span class="gbar" style="display:block;width:${(g.count / max) * 100}%"></span></span>
            <span class="gcount">${g.count}</span>${ICON.chev}
          </button>
          <div class="quotes" id="q-${g.id}" ${isOpen ? '' : 'hidden'}>
            ${g.quotes.map(([q, who, fresh]) => `<blockquote class="${fresh ? 'fresh' : ''}">«${esc(q)}»<cite>${esc(who)}</cite></blockquote>`).join('')}
          </div>
        </div>`;
      }).join('');
    }
    groupsEl.addEventListener('click', (e) => {
      const b = e.target.closest('.group > button');
      if (!b) return;
      const id = b.parentElement.dataset.id;
      open.has(id) ? open.delete(id) : open.add(id);
      render();
    });

    function classify(text) {
      const t = text.toLowerCase();
      for (const id of ORDER) {
        const g = GROUPS.find((x) => x.id === id);
        if (g.kw.some((k) => t.includes(k))) return g;
      }
      let other = GROUPS.find((x) => x.id === 'andre');
      if (!other) { other = { id: 'andre', name: 'Andre innspill', count: 0, kw: [], quotes: [] }; GROUPS.push(other); }
      return other;
    }
    const toast = $('#h-toast');
    $('#h-send').addEventListener('click', () => {
      const ta = $('#h-text');
      const text = ta.value.trim();
      if (!text) {
        toast.hidden = false;
        toast.dataset.color = 'warning';
        $('.msg', toast).textContent = 'Skriv et innspill først, så sender du det.';
        ta.focus();
        return;
      }
      const g = classify(text);
      g.count += 1;
      g.quotes.unshift([text, 'Ditt innspill · nå', true]);
      open.add(g.id);
      ta.value = '';
      toast.hidden = false;
      toast.dataset.color = 'success';
      $('.msg', toast).textContent = `Innspillet er registrert og foreslått i gruppen «${g.name}». Du får varsel når saken avgjøres.`;
      render(g.id);
    });
    render();
  })();

  /* ---------------- 4e. AI-modenhet ---------------- */
  (function ai() {
    const ROWS = [
      ['Sjekke preskriptive krav som regler i kode', 'Moden', 4, 'Etter mønster fra DiBKs Fellestjenester plan og bygg'],
      ['Spredning, lus og eutrofiering', 'I drift', 4, 'HIs modeller brukes allerede i trafikklyssystemet og i fjordvurderinger'],
      ['Gruppere høringsinnspill', 'Bevist i stor skala', 4, 'Britiske i.AI Consult er et kjent eksempel'],
      ['Lese søknadsdokumenter og tegninger', 'Moden for tekst, delvis for tegninger', 3, 'Strukturert innsending gjør mye av dette unødvendig'],
      ['Utkast til uttalelser og vedtak med kildehenvisning', 'Brukbar med kontroll', 2, 'Søk i Lovdata og vedtaksarkiv, obligatoriske henvisninger, menneskelig redigering'],
      ['Skjønnsvurderinger', 'Ikke egnet', 0, '«Miljømessig forsvarlig», naturmangfoldloven §§ 8–12. Gjøres av mennesker.'],
    ];
    $('#ai-list').innerHTML = ROWS.map(([t, lvl, n, note]) => `<tr><td>${esc(t)}</td><td>${n ? `<span class="meter" aria-hidden="true">${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>${esc(lvl)}` : tag(lvl, 'danger')}</td><td>${esc(note)}</td></tr>`).join('');
  })();

  /* ---------------- 5. Veien dit ---------------- */
  (function road() {
    const MAX = 5;
    const ROWS = [
      ['Åpne tall for saksbehandlingstid', 'Fylkeskommunene rapporterer allerede', 0.75, 1, 'under 1 år', true],
      ['Resipientregnskap for prioriterte fjorder', 'Data og modeller finnes; jobben er å drifte dem', 1, 2, '1–2 år', true],
      ['Fellestjenester akvakultur, første versjon', 'Bygger på Akvakulturportalen og DiBKs erfaring', 2, 3, '2–3 år'],
      ['Lovendringer', 'Utredning og stortingsbehandling etter havbruksforliket i 2025', 2, 4, '2–4 år'],
      ['Full drift i alle fylker', 'Erfaring: nederlandske Omgevingswet, lang overgang', 4, 5, '4–5 år'],
    ];
    const pct = (y) => (y / MAX) * 100;
    $('#road').innerHTML = ROWS.map(([n, sub, lo, hi, lbl, noLaw]) => {
      const inside = pct(hi) > 85;
      const em = inside
        ? `<em style="right:${100 - pct(lo)}%;margin-right:.3rem;padding:0 .4rem;background:var(--surface);border-radius:3px;top:.2rem;line-height:1.2rem">${lbl}</em>`
        : `<em style="left:${pct(hi)}%">${lbl}</em>`;
      return `<div class="road-row">
        <div class="nm">${esc(n)}${noLaw ? ' ' + tag('Uten lovendring', 'success') : ''}<small>${esc(sub)}</small></div>
        <div class="road-track"><i class="solid" style="width:${pct(lo)}%"></i>${hi > lo ? `<i class="maybe" style="left:${pct(lo)}%;width:${pct(hi - lo)}%"></i>` : ''}${em}</div>
      </div>`;
    }).join('') + `<div class="road-axis" aria-hidden="true"><span></span><div class="ticks">${[0, 1, 2, 3, 4, 5].map((y) => `<span style="left:${pct(y)}%">${y ? y + ' år' : 'Start'}</span>`).join('')}</div></div>`;
  })();
})();
