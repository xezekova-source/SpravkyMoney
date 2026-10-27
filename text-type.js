/* Local, dependency-free adaptation of the supplied React Bits TextType effect. */
(() => {
  'use strict';

  const NEIGHBORS = {
    й: 'цуф', ц: 'йуфы', у: 'цкыв', к: 'уева', е: 'кнап', н: 'егпр',
    г: 'ншро', ш: 'гщол', щ: 'шзлд', з: 'щхдж', х: 'зъж', ъ: 'хэ',
    ф: 'йцыч', ы: 'фцувчс', в: 'ыукасм', а: 'вкепми', п: 'аенрит',
    р: 'пнгоит', о: 'ргшлт', л: 'ошщдь', д: 'лщзжь', ж: 'дзхэб',
    э: 'жхъю', я: 'фч', ч: 'яфыс', с: 'чывм', м: 'сваи', и: 'мапт',
    т: 'ипрь', ь: 'тролб', б: 'ьлджю', ю: 'бжэ',
    a: 'qwsz', b: 'vghn', c: 'xdfv', d: 'serfcx', e: 'wsdr', f: 'drtgvc',
    g: 'ftyhbv', h: 'gyujnb', i: 'ujko', j: 'huikmn', k: 'jiolm',
    l: 'kop', m: 'njk', n: 'bhjm', o: 'iklp', p: 'ol', q: 'wa',
    r: 'edft', s: 'awedxz', t: 'rfgy', u: 'yhji', v: 'cfgb', w: 'qase',
    x: 'zsdc', y: 'tghu', z: 'asx'
  };

  const splitCharacters = value => {
    if (typeof Intl.Segmenter === 'function') {
      return Array.from(new Intl.Segmenter('ru', { granularity: 'grapheme' }).segment(value), part => part.segment);
    }
    return Array.from(value);
  };

  class TextType {
    constructor(root, options = {}) {
      if (!(root instanceof Element)) throw new TypeError('TextType requires a DOM element.');

      this.root = root;
      this.options = {
        text: root.textContent,
        typingSpeed: 75,
        speedMultiplier: 1,
        initialDelay: 0,
        deletingSpeed: 50,
        pauseDuration: 1500,
        typeEffect: 'fade',
        mistakes: 0.2,
        showCursor: true,
        cursorStyle: 'bar',
        cursorGlide: true,
        loop: false,
        highlightedPhrases: [],
        highlightRanges: [],
        highlightClass: 'text-type__highlight',
        ...options
      };
      this.options.text = Array.isArray(this.options.text)
        ? String(this.options.text[0] || '')
        : String(this.options.text || '');
      if (typeof window.keepWordsTogether === 'function') {
        this.options.text = window.keepWordsTogether(this.options.text);
      }
      // NBSP and regular spaces have the same UTF-16 length, so phrase offsets
      // remain exact after typography has bound a short word to its neighbour.
      const normalizedText = this.options.text.replace(/[\u00a0\u202f]/gu, ' ');
      const highlights = Array.isArray(this.options.highlightRanges)
        ? this.options.highlightRanges.filter(range => Number.isFinite(range.start) && Number.isFinite(range.end))
        : [];
      for (const phrase of Array.isArray(this.options.highlightedPhrases) ? this.options.highlightedPhrases : []) {
        const normalizedPhrase = String(phrase).replace(/[\u00a0\u202f]/gu, ' ');
        if (!normalizedPhrase) continue;
        let start = normalizedText.indexOf(normalizedPhrase);
        while (start !== -1) {
          highlights.push({ start, end: start + normalizedPhrase.length });
          start = normalizedText.indexOf(normalizedPhrase, start + normalizedPhrase.length);
        }
      }
      this.speedMultiplier = Math.max(.01, Number(this.options.speedMultiplier) || 1);
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = Boolean(this.options.reducedMotion ?? this.options.reduceMotion ?? motionQuery.matches);
      this.characters = [];
      this.animations = new Set();
      this.timeouts = new Set();
      this.started = false;
      this.destroyed = false;
      this.complete = false;
      this.count = 0;
      this.cursorCount = 0;
      this.cursorPosition = null;

      this.root.replaceChildren();
      this.root.classList.add('text-type');
      if (getComputedStyle(this.root).position === 'static') this.root.style.position = 'relative';

      this.content = document.createElement('span');
      this.content.className = 'text-type__content';
      this.content.setAttribute('aria-hidden', 'true');

      // Keep complete words in the layout from the outset. Future letters are
      // transparent, so centering and wrapping remain stable while typing.
      let characterOffset = 0;
      for (const token of this.options.text.split(/([ \t\r\n]+)/u).filter(Boolean)) {
        const word = document.createElement('span');
        const isSpace = /^[ \t\r\n]+$/u.test(token);
        word.className = isSpace ? 'text-type__space' : 'text-type__word';
        if (!isSpace) word.style.whiteSpace = 'nowrap';
        for (const character of splitCharacters(token)) {
          const outer = document.createElement('span');
          outer.className = 'text-type__char';
          if (highlights.some(range => characterOffset < range.end && characterOffset + character.length > range.start)) {
            outer.classList.add(this.options.highlightClass);
          }
          outer.style.position = 'relative';
          const glyph = document.createElement('span');
          glyph.className = 'text-type__glyph';
          glyph.style.opacity = '0';
          glyph.textContent = character;
          outer.append(glyph);
          word.append(outer);
          this.characters.push({ character, outer, glyph, typo: null });
          characterOffset += character.length;
        }
        this.content.append(word);
      }
      this.root.append(this.content);

      if (this.options.showCursor) {
        this.cursor = document.createElement('span');
        this.cursor.className = 'text-type__cursor text-type__cursor--bar';
        this.cursor.setAttribute('aria-hidden', 'true');
        Object.assign(this.cursor.style, {
          position: 'absolute', left: '0', top: '0', width: 'max(2px, .055em)',
          height: '.98em', background: 'currentColor', pointerEvents: 'none',
          borderRadius: '1px', opacity: '0', willChange: 'transform'
        });
        this.root.append(this.cursor);
      }

      this.onResize = () => this.placeCursor(true);
      if (typeof ResizeObserver === 'function') {
        this.resizeObserver = new ResizeObserver(this.onResize);
        this.resizeObserver.observe(this.root);
      } else {
        window.addEventListener('resize', this.onResize);
      }
      this.motionQuery = motionQuery;
      this.onMotionChange = event => {
        if (!event.matches || this.destroyed) return;
        this.reducedMotion = true;
        if (this.started) this.finishImmediately();
      };
      motionQuery.addEventListener?.('change', this.onMotionChange);
    }

    later(callback, delay) {
      const id = window.setTimeout(() => {
        this.timeouts.delete(id);
        if (!this.destroyed) callback();
      }, Math.max(0, delay) / this.speedMultiplier);
      this.timeouts.add(id);
    }

    animate(node, keyframes, options) {
      if (this.reducedMotion || typeof node.animate !== 'function') return null;
      const timing = options.iterations === Infinity ? options : { ...options, duration: options.duration / this.speedMultiplier };
      const animation = node.animate(keyframes, timing);
      this.animations.add(animation);
      animation.finished.then(() => this.animations.delete(animation), () => this.animations.delete(animation));
      return animation;
    }

    reveal(node) {
      node.style.opacity = '1';
      if (this.options.typeEffect === 'fade') {
        this.animate(node, [{ opacity: 0 }, { opacity: 1 }], {
          duration: 360, easing: 'cubic-bezier(.25, 1, .5, 1)'
        });
      }
    }

    start() {
      if (this.started || this.destroyed) return this;
      this.started = true;
      this.root.classList.add('text-type--typing');
      if (this.cursor) this.cursor.style.opacity = '1';
      this.placeCursor(true);
      if (this.reducedMotion) {
        this.finishImmediately();
      } else {
        this.later(() => this.tick(), this.options.initialDelay);
      }
      return this;
    }

    tick() {
      if (this.destroyed || this.complete) return;
      if (this.count >= this.characters.length) {
        this.finish();
        return;
      }
      const part = this.characters[this.count];
      const lower = part.character.toLowerCase();
      const neighbors = NEIGHBORS[lower];
      const chance = Math.min(1, Math.max(0, this.options.mistakes)) * 0.16;
      const makeMistake = this.count > 0 && neighbors && Math.random() < chance;
      const delay = Math.max(1, Number(this.options.typingSpeed) || 75);

      this.later(() => {
        if (makeMistake) {
          const candidate = neighbors[Math.floor(Math.random() * neighbors.length)];
          const typo = document.createElement('span');
          typo.className = 'text-type__typo';
          typo.textContent = lower === part.character ? candidate : candidate.toUpperCase();
          Object.assign(typo.style, { position: 'absolute', left: '0', top: '0', opacity: '0' });
          part.typo = typo;
          part.outer.append(typo);
          this.reveal(typo);
          this.cursorCount = this.count + 1;
          this.placeCursor();
          this.later(() => {
            typo.remove();
            part.typo = null;
            this.cursorCount = this.count;
            this.placeCursor();
            this.later(() => this.typeCorrect(part), Math.max(45, this.options.deletingSpeed));
          }, 280 + Math.random() * 160);
        } else {
          this.typeCorrect(part);
        }
      }, delay);
    }

    typeCorrect(part) {
      this.reveal(part.glyph);
      this.count += 1;
      this.cursorCount = this.count;
      this.placeCursor();
      this.tick();
    }

    placeCursor(instant = false) {
      if (!this.cursor || !this.started || this.destroyed || !this.characters.length) return;
      const previous = this.characters[Math.max(0, this.cursorCount - 1)];
      const next = this.characters[this.cursorCount];
      let rect;
      let x;
      if (this.cursorCount === 0) {
        rect = this.characters[0].outer.getBoundingClientRect();
        x = rect.left;
      } else if (/\s/u.test(previous.character) && next) {
        rect = next.outer.getBoundingClientRect();
        x = rect.left;
      } else {
        rect = previous.outer.getBoundingClientRect();
        x = rect.right;
      }
      const bounds = this.root.getBoundingClientRect();
      const fontSize = Number.parseFloat(getComputedStyle(this.root).fontSize) || 16;
      const destination = { x: x - bounds.left + fontSize * .025, y: rect.top - bounds.top + Math.max(0, (rect.height - fontSize) / 2) };
      const last = this.cursorPosition;
      const lineChanged = last && Math.abs(last.y - destination.y) > 2;
      this.cursor.style.transition = !instant && last && !lineChanged && this.options.cursorGlide && !this.reducedMotion
        ? `transform ${Math.min(180, Math.max(60, this.options.typingSpeed * 1.6)) / this.speedMultiplier}ms cubic-bezier(.22, 1, .36, 1)`
        : 'none';
      this.cursor.style.transform = `translate(${destination.x}px, ${destination.y}px)`;
      this.cursorPosition = destination;
    }

    finishImmediately() {
      for (const timeout of this.timeouts) window.clearTimeout(timeout);
      this.timeouts.clear();
      for (const animation of this.animations) animation.cancel();
      this.animations.clear();
      for (const part of this.characters) {
        part.typo?.remove();
        part.typo = null;
        part.glyph.style.opacity = '1';
      }
      this.count = this.characters.length;
      this.cursorCount = this.count;
      this.placeCursor(true);
      this.finish();
    }

    finish() {
      if (this.complete || this.destroyed) return;
      this.complete = true;
      this.root.classList.remove('text-type--typing');
      this.root.classList.add('text-type--complete');
      if (this.cursor && !this.reducedMotion) {
        this.animate(this.cursor, [
          { opacity: 1, offset: 0 }, { opacity: 1, offset: .3 },
          { opacity: 0, offset: .55 }, { opacity: 0, offset: .7 }, { opacity: 1, offset: 1 }
        ], { duration: 1250, iterations: Infinity, easing: 'ease-in-out' });
      }
      this.options.onComplete?.(this.options.text);
      this.root.dispatchEvent(new CustomEvent('texttype:complete'));
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      for (const timeout of this.timeouts) window.clearTimeout(timeout);
      this.timeouts.clear();
      for (const animation of this.animations) animation.cancel();
      this.animations.clear();
      this.resizeObserver?.disconnect();
      window.removeEventListener('resize', this.onResize);
      this.motionQuery.removeEventListener?.('change', this.onMotionChange);
      if (this.cursor) this.cursor.style.opacity = '0';
      this.root.classList.remove('text-type--typing');
    }
  }

  window.TextType = TextType;
})();
