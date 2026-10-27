(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const screens = Array.from(document.querySelectorAll('main > .screen'));
  const data = window.PRESENTATION_DATA;
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const motionOff = new URLSearchParams(location.search).get('motion') === 'off';
  const reduceMotion = { get matches() { return motionOff || motionPreference.matches; } };
  if (motionOff) document.documentElement.classList.add('motion-off');
  const number = (value, digits = 0) => new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: digits, minimumFractionDigits: digits,
  }).format(value);

  const initiatives = [
    { name: 'Приоритет', title: 'Приоритетная справка', price: '2 000 ₽', description: 'Получение нетиповой справки за 3 часа вместо 3 рабочих дней.' },
    { name: 'Доставка', title: 'Доставка клиенту или третьей стороне', price: '2 000 ₽', description: 'Доставка готового экземпляра домой или указанному получателю.' },
    { name: 'Онлайн-оплата', title: 'Доступность текущих платных справок в каналах', price: 'Без изменений', description: 'Онлайн-заказ и оплата существующих платных справок. Без отдельной комиссии за оплату онлайн.' },
    { name: 'Новый дизайн', title: 'Редизайн бумажных справок', price: 'Бесплатно', description: 'Обновлённое оформление бумажных справок. Дизайн уже подготовлен командой.' },
    { name: 'Комплект', title: 'Комплект под требования получателя', price: '49 ₽', description: 'Банковские документы для визы, учёбы или налогового вычета в одном заказе.' },
    { name: 'Особая форма', title: 'Перевод или специальная форма', price: '1 500 ₽', description: 'Подготовка справки на нужном языке или по форме получателя.' },
    { name: 'Повторный заказ', title: 'Повторный заказ справки', price: '10 ₽', description: 'Четвёртый и каждый следующий экземпляр за день — платно. Лимит учитывает дополнительные копии.' },
    { name: 'Бумажная справка', title: 'Бумажная справка', price: '200 ₽', description: 'Две трети бумажных экземпляров выдаются по 200 ₽, одна треть (клиенты\u00a0Prime) — бесплатно.' },
  ];

  const rowNames = ['Приоритет', 'Доставка клиенту', 'Третьей стороне', 'Онлайн-оплата', 'Комплект', 'Особая форма', 'Повторный заказ', 'Бумажная справка'];
  const economics = data.economics.map(row => ({
    ...row,
    unitProfit: row.price - row.cost,
    contribution: (row.price - row.cost) * row.annual,
  }));
  const totalAnnualProfit = economics.reduce((sum, row) => sum + row.contribution, 0);
  economics.forEach((row, index) => {
    const tr = document.createElement('tr');
    const percent = row.share * 100;
    const share = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(percent) + '%';
    const cells = [rowNames[index], number(row.base), share, number(row.monthly), row.price ? number(row.price) : '—', row.cost ? number(row.cost) : '—', row.price ? number(row.unitProfit) : '—', row.contribution ? number(row.contribution / 1e6, 2) : '—'];
    cells.forEach(value => { const td = document.createElement('td'); td.textContent = value; tr.append(td); });
    $('#economics-rows').append(tr);
  });
  $('#economics-monthly').textContent = number(data.totals.monthly) + ' шт.';
  $('#economics-contribution').textContent = number(totalAnnualProfit / 1e6, 2) + ' млн ₽';

  data.timeline.forEach(row => {
    const tr = document.createElement('tr');
    const label = document.createElement('td'); label.textContent = row.label; tr.append(label);
    if (row.highlight) label.className = 'timeline-highlight';
    row.phases.forEach((phase, index) => {
      const td = document.createElement('td');
      const tag = row.phaseTags?.[index];
      if (tag) {
        const start = phase.toLocaleLowerCase('ru').indexOf(tag.toLocaleLowerCase('ru'));
        const detail = start < 0 ? phase : (phase.slice(0, start) + phase.slice(start + tag.length)).replace(/[\s·,]+$/, '').trim();
        const chip = document.createElement('span'); chip.className = 'phase-launch'; chip.textContent = tag; td.append(chip);
        if (detail) { const text = document.createElement('span'); text.className = 'phase-detail'; text.textContent = detail; td.append(text); }
      } else td.textContent = phase;
      tr.append(td);
    });
    $('#timeline-rows').append(tr);
  });

  const projection = data.projection2027;
  $('#result-baseline').textContent = number(projection.baselineRevenueAnnual / 1e6);
  $('#result-additional').textContent = number(projection.additionalRevenue / 1e6, 2);
  $('#result-revenue').textContent = number(projection.revenueTotal / 1e6, 2);
  projection.services.forEach(service => {
    const item = document.createElement('div'); item.className = 'result-service';
    const title = document.createElement('h3'); title.textContent = service.name;
    const amount = document.createElement('p');
    const millions = service.contribution2027 / 1e6;
    amount.textContent = millions < .01 ? number(service.contribution2027, 2) + ' ₽' : number(millions, 2) + ' млн ₽';
    const label = document.createElement('div'); label.className = 'result-profit-label'; label.textContent = 'Прибыль с 1 июля по 31 декабря до постоянных расходов и налогов';
    item.append(title, amount, label); $('#result-services').append(item);
  });

  const documentFlight = new window.DocumentFlight($('#insight'), $('#flying-document'), {
    reduceMotion: () => reduceMotion.matches,
    anchorX: .80,
    landingY: .56,
    offsetX: 0,
    offsetY: -100,
  });
  document.querySelectorAll('video').forEach(video => {
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    if (video.hasAttribute('src')) video.play().catch(() => {});
  });

  let activeScreen = 0, navigating = false, navigationToken = 0;
  const initiativeScreen = screens.findIndex(screen => screen.id === 'initiatives');
  const redesignScreen = screens.findIndex(screen => screen.id === 'redesign');
  const redesignComparison = new window.RedesignComparison(screens[redesignScreen], {
    reduceMotion: () => reduceMotion.matches,
  });
  const initiativeDeck = new window.InitiativeDeck($('#initiative-deck'), {
    items: initiatives,
    reduceMotion: () => reduceMotion.matches,
    onExhausted: () => goTo(initiativeScreen + 1),
  });

  function activateScreen(index) {
    if (index === redesignScreen && activeScreen !== index) {
      redesignComparison.set(activeScreen > index, false);
    }
    activeScreen = index;
  }
  function goTo(index) {
    if (index < 0 || index >= screens.length) return;
    const token = ++navigationToken; navigating = true;
    activateScreen(index);
    screens[index].scrollIntoView({ behavior: reduceMotion.matches ? 'instant' : 'smooth', block: 'start' });
    const started = performance.now();
    function settle() {
      if (token !== navigationToken) return;
      if (Math.abs(screens[index].getBoundingClientRect().top) < 3 || performance.now() - started > 1500) { navigating = false; return; }
      requestAnimationFrame(settle);
    }
    requestAnimationFrame(settle);
  }
  let lastStep = -Infinity;
  function step(direction) {
    if (navigating || performance.now() - lastStep < 220) return;
    lastStep = performance.now();
    if (activeScreen === initiativeScreen) {
      if (direction > 0) { initiativeDeck.next(); return; }
      if (initiativeDeck.previous()) return;
    }
    if (activeScreen === redesignScreen) {
      if (direction > 0 ? redesignComparison.next() : redesignComparison.previous()) return;
    }
    const next = activeScreen + direction;
    if (next === initiativeScreen) initiativeDeck.set(direction < 0 ? initiatives.length - 1 : 0);
    goTo(next);
  }
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (event.code === 'Space' && event.target.closest('button,a')) return;
    const forward = ['ArrowRight', 'ArrowDown', 'PageDown']; const backward = ['ArrowLeft', 'ArrowUp', 'PageUp'];
    if (event.code === 'Space' || forward.includes(event.key) || backward.includes(event.key)) {
      event.preventDefault(); step(backward.includes(event.key) || (event.code === 'Space' && event.shiftKey) ? -1 : 1);
    }
    if (event.key === 'Home') { event.preventDefault(); goTo(0); }
    if (event.key === 'End') { event.preventDefault(); goTo(screens.length - 1); }
  });
  let wheelLast = -Infinity, wheelTotal = 0, wheelSpent = false;
  addEventListener('wheel', event => {
    if (event.defaultPrevented || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return;
    const now = performance.now();
    if (now - wheelLast > 180) { wheelSpent = false; wheelTotal = 0; }
    wheelLast = now;
    // One scroll gesture advances one internal step, including its inertia.
    if (wheelSpent) { event.preventDefault(); return; }
    const controlled = activeScreen === initiativeScreen || activeScreen === redesignScreen;
    const top = screens[activeScreen].getBoundingClientRect().top;
    if (controlled && Math.abs(top) < innerHeight * .2) {
      event.preventDefault();
      const busy = activeScreen === initiativeScreen ? initiativeDeck.busy : redesignComparison.busy;
      if (busy || navigating) { wheelSpent = true; return; }
      if (Math.abs(top) > 3) { wheelSpent = true; goTo(activeScreen); return; }
      wheelTotal += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (Math.abs(wheelTotal) >= 28) { wheelSpent = true; step(Math.sign(wheelTotal)); }
      return;
    }
    navigating = false; navigationToken++;
  }, { passive: false });
  addEventListener('touchstart', () => { navigating = false; navigationToken++; }, { passive: true });
  const activeObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting && !navigating) activateScreen(screens.indexOf(entry.target));
  }, { rootMargin: '-35% 0px -60% 0px', threshold: 0 });
  screens.forEach(screen => activeObserver.observe(screen));

  const ideaReserve = $('#idea .manifesto-reserve');
  ideaReserve.textContent = window.keepWordsTogether(ideaReserve.textContent);
  const quote = ideaReserve.textContent;
  const quoteTyping = new window.TextType($('#typed-manifesto'), {
    text: quote, typingSpeed: 75, deletingSpeed: 50, speedMultiplier: 3, typeEffect: 'fade', mistakes: .2,
    showCursor: true, cursorStyle: 'bar', cursorGlide: true, loop: false, reducedMotion: reduceMotion.matches,
    highlightedPhrases: ['справки приносили дополнительный доход банку', 'увеличения полезных функций', 'без урезания'],
  });
  function typeManifesto() { quoteTyping.start(); }
  const pilotReserve = $('#pilot-reserve');
  pilotReserve.textContent = window.keepWordsTogether(pilotReserve.textContent);
  const pilotTyping = new window.TextType($('#typed-pilot'), {
    text: pilotReserve.textContent, typingSpeed: 75, deletingSpeed: 50, speedMultiplier: 3, typeEffect: 'fade', mistakes: .2,
    showCursor: true, cursorStyle: 'bar', cursorGlide: true, loop: false, reducedMotion: reduceMotion.matches,
    highlightedPhrases: ['доход покрывает затраты', 'разработка окупится в согласованный срок', 'не должны ухудшиться'],
  });
  const counterTarget = Math.round(totalAnnualProfit / 1e6);
  const multiplier = $('.goal-multiplier');
  const goalUnit = $('.goal-unit');
  const growthRatio = Math.round(counterTarget / 20 * 10) / 10;
  const growthWord = ['few', 'other'].includes(new Intl.PluralRules('ru').select(growthRatio)) ? 'раза' : 'раз';
  const additionalProfitWord = document.createElement('span');
  additionalProfitWord.className = 'goal-accent';
  additionalProfitWord.textContent = 'дополнительную';
  multiplier.replaceChildren(`К ${data.context.targetYear} году увеличить `, additionalProfitWord, ` прибыль в ${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(growthRatio)} ${growthWord}`);
  let counterTimer = null, counterFrame = null, counterVisible = false;
  function showMultiplier(visible) {
    for (const part of [multiplier, goalUnit]) {
      part.classList.toggle('is-visible', visible);
      part.setAttribute('aria-hidden', String(!visible));
    }
  }
  function cancelCounter() { clearTimeout(counterTimer); cancelAnimationFrame(counterFrame); showMultiplier(false); }
  function paintCounter(value, progress) {
    $('#goal-counter').textContent = String(value);
    $('.goal-display').style.setProperty('--counter-blue', `${progress * 100}%`);
  }
  function animateCounter() {
    cancelCounter();
    paintCounter(reduceMotion.matches ? counterTarget : 20, reduceMotion.matches ? 1 : 0);
    if (reduceMotion.matches) { showMultiplier(true); return; }
    // A brief pause keeps 20 readable, then value and colour move together.
    counterTimer = setTimeout(() => {
      const start = performance.now(); const duration = 3100;
      function frame(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = (1 - Math.cos(Math.PI * progress)) / 2;
        const value = Math.round(20 + (counterTarget - 20) * eased);
        paintCounter(value, value >= counterTarget ? 1 : eased);
        if (progress < 1) counterFrame = requestAnimationFrame(frame);
        else showMultiplier(true);
      }
      counterFrame = requestAnimationFrame(frame);
    }, 150);
  }
  const counterObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const visible = entry.isIntersecting && entry.intersectionRatio >= .75;
      if (visible && !counterVisible) animateCounter();
      if (!visible && counterVisible) { cancelCounter(); paintCounter(reduceMotion.matches ? counterTarget : 20, reduceMotion.matches ? 1 : 0); }
      counterVisible = visible;
    }
  }, { threshold: [0, .75] });
  counterObserver.observe($('#goal'));
  const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('is-revealed');
      if (entry.target.closest('.screen').id === 'idea') typeManifesto();
      if (entry.target.closest('.screen').id === 'pilot') pilotTyping.start();
      revealObserver.unobserve(entry.target);
    }
  }, { threshold: .2 });
  if (!reduceMotion.matches) document.documentElement.classList.add('js-motion');
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
  let initiativeVisible = false;
  const initiativeObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const visible = entry.isIntersecting && entry.intersectionRatio >= .65;
      if (visible && !initiativeVisible) initiativeDeck.enter(initiativeDeck.index);
      if (!visible && initiativeVisible) initiativeDeck.leave();
      initiativeVisible = visible;
    }
  }, { threshold: [0, .65] });
  initiativeObserver.observe(screens[initiativeScreen]);
  const closingObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const entered = entry.isIntersecting && entry.boundingClientRect.top <= innerHeight * .4;
      entry.target.classList.toggle('is-active', entered);
    }
  }, { threshold: [0, .6] });
  closingObserver.observe($('#closing'));
  new window.ElasticEnding($('#closing'), $('.closing-document'), {
    reduceMotion: () => reduceMotion.matches,
  });

  window.polishTypography(document.body);

  if (reduceMotion.matches) { quoteTyping.start(); pilotTyping.start(); paintCounter(counterTarget, 1); showMultiplier(true); }

  if (location.hash) {
    const index = screens.findIndex(screen => '#' + screen.id === location.hash);
    if (index >= 0) { activeScreen = index; screens[index].scrollIntoView({ behavior: 'instant', block: 'start' }); }
  }
  const backToTop = $('#back-to-top');
  function updateBackToTop() { backToTop.hidden = window.scrollY < innerHeight * .45; }
  backToTop.addEventListener('click', () => { goTo(0); backToTop.blur(); });
  addEventListener('scroll', updateBackToTop, { passive: true });
  addEventListener('resize', updateBackToTop, { passive: true });
  updateBackToTop();
})();
