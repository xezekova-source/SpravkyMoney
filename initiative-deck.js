(() => {
  'use strict';

  /** A small presentation deck. Styling belongs to the page, motion lives here. */
  class InitiativeDeck {
    constructor(root, { items, reduceMotion = () => false, onExhausted = () => {} }) {
      this.root = root;
      this.items = items;
      this.reduceMotion = reduceMotion;
      this.onExhausted = onExhausted;
      this._index = 0;
      this._busy = false;
      this._epoch = 0;
      this._animations = new Set();
      this._present = false;
      root.dataset.ready = 'false';
      root.style.visibility = 'hidden';
      this.cards = items.map((item, index) => this._createCard(item, index));
      root.replaceChildren(...this.cards);
      root.dataset.count = String(items.length);
      root.setAttribute('role', 'group');
      root.setAttribute('aria-label', 'Инициативы');

      this.announcement = document.createElement('div');
      this.announcement.className = 'deck-announcement';
      this.announcement.setAttribute('aria-live', 'polite');
      this.announcement.setAttribute('aria-atomic', 'true');
      root.append(this.announcement);

      this._onClick = event => {
        const card = event.target.closest('.initiative-card');
        if (this._present && card === this.cards[this._index]) this.next();
      };
      this._onKeydown = event => {
        if (event.key !== 'Enter' || event.repeat) return;
        if (event.target.closest('.initiative-card') !== this.cards[this._index]) return;
        event.preventDefault();
        this.next();
      };
      root.addEventListener('click', this._onClick);
      root.addEventListener('keydown', this._onKeydown);
      this._render();
    }

    get index() { return this._index; }
    get busy() { return this._busy; }

    _createCard(item, index) {
      const card = document.createElement('article');
      card.className = 'initiative-card';
      card.dataset.index = String(index);
      card.setAttribute('role', 'button');
      card.setAttribute('aria-keyshortcuts', 'Enter Space ArrowRight');

      const price = document.createElement('div');
      price.className = 'deck-card-price';
      price.textContent = item.price || 'Без изменений';
      const title = document.createElement('h3');
      title.className = 'deck-card-title';
      title.textContent = item.title;
      if (item.name === 'Повторный заказ') {
        title.replaceChildren(document.createTextNode('Повторный заказ'), document.createElement('br'), document.createTextNode('справки'));
      }
      const description = document.createElement('p');
      description.className = 'deck-card-description';
      description.textContent = item.description;
      card.append(price, title, description);
      card.setAttribute('aria-label', `${item.title}. ${price.textContent}. ${item.description} Следующая инициатива.`);
      return card;
    }

    _pose(depth) {
      const d = Math.min(Math.max(depth, 0), 5);
      return {
        transform: `translate3d(${-11 * d}px, ${11 * d}px, 0) rotate(${-1.6 * d}deg) scale(${1 - .035 * d})`,
        opacity: '1',
      };
    }

    _apply(card, pose) {
      card.style.transform = pose.transform;
      card.style.opacity = pose.opacity;
    }

    _render({ skip = null } = {}) {
      this.root.dataset.activeIndex = String(this._index);
      this.root.dataset.busy = String(this._busy);
      this.cards.forEach((card, index) => {
        const dismissed = index < this._index;
        const active = index === this._index;
        card.dataset.state = dismissed ? 'dismissed' : active ? 'active' : 'stacked';
        card.tabIndex = active ? 0 : -1;
        card.setAttribute('aria-hidden', String(!active));
        card.style.pointerEvents = active && this._present ? 'auto' : 'none';
        card.style.zIndex = String(this.items.length - index);
        if (card !== skip) this._apply(card, dismissed
          ? { transform: 'translate3d(360px, -20px, 0) rotate(20deg) scale(.98)', opacity: '0' }
          : this._pose(index - this._index));
      });
    }

    _announce() {
      const item = this.items[this._index];
      if (item) this.announcement.textContent = item.title + '. ' + (item.price || 'Без изменений');
    }

    _cancel() {
      this._epoch += 1;
      this._animations.forEach(animation => animation.cancel());
      this._animations.clear();
      this._busy = false;
    }

    _animate(card, from, to, options = {}) {
      this._apply(card, to);
      if (this.reduceMotion() || typeof card.animate !== 'function') return Promise.resolve();
      const animation = card.animate([from, to], {
        duration: 520,
        easing: 'cubic-bezier(.22,.75,.25,1)',
        fill: 'backwards',
        ...options,
      });
      this._animations.add(animation);
      return animation.finished.catch(() => {}).finally(() => this._animations.delete(animation));
    }

    _finish(promises, token, callback) {
      Promise.all(promises).then(() => {
        if (token !== this._epoch) return;
        this._busy = false;
        this._render();
        if (callback) callback();
      });
    }

    enter(index = 0) {
      this.set(index, { animate: false });
      this._present = true;
      this.root.dataset.ready = 'true';
      this.root.style.visibility = 'visible';
      this._render();
      this._announce();
      if (this.reduceMotion()) return;
      this._busy = true;
      this.root.dataset.busy = 'true';
      const token = this._epoch;
      const promises = this.cards.slice(this._index).map((card, depth) => {
        const d = Math.min(depth, 5);
        return this._animate(card, {
          transform: `translate3d(${-11 * d}px, ${28 + 11 * d}px, 0) rotate(${-15 - 1.6 * d}deg) scale(${.84 - .025 * d})`,
          opacity: '0',
        }, this._pose(depth), {
          duration: 620,
          delay: 180 + d * 34,
          easing: 'cubic-bezier(.22,1,.36,1)',
        });
      });
      this._finish(promises, token);
    }

    set(index, { animate = false } = {}) {
      const next = Math.max(0, Math.min(this.items.length - 1, Number(index) || 0));
      if (animate) { this.enter(next); return; }
      this._cancel();
      this._index = next;
      this._render();
      this._announce();
    }

    next() {
      if (this._busy) return true;
      if (this._index >= this.items.length) return true;
      const oldIndex = this._index;
      const outgoing = this.cards[oldIndex];
      const restoreFocus = outgoing.contains(document.activeElement);
      if (restoreFocus) document.activeElement.blur();
      const previousPoses = this.cards.map((_, index) => this._pose(index - oldIndex));
      this._index += 1;
      this._busy = true;
      const token = this._epoch;
      this._render({ skip: outgoing });
      const promises = [this._animate(outgoing, this._pose(0), {
        transform: 'translate3d(360px, -20px, 0) rotate(20deg) scale(.98)',
        opacity: '0',
      }, { easing: 'cubic-bezier(.32,0,.65,.55)' })];
      this.cards.slice(this._index).forEach((card, depth) => {
        promises.push(this._animate(card, previousPoses[this._index + depth], this._pose(depth)));
      });
      this._finish(promises, token, () => {
        this._announce();
        if (this._index === this.items.length) this.onExhausted();
        else if (restoreFocus) this.cards[this._index].focus({ preventScroll: true });
      });
      return true;
    }

    previous() {
      if (this._busy) return true;
      if (this._index <= 0) return false;
      const oldIndex = this._index;
      const focused = this.cards[oldIndex];
      const restoreFocus = focused && focused.contains(document.activeElement);
      if (restoreFocus) document.activeElement.blur();
      this._index -= 1;
      this._busy = true;
      const token = this._epoch;
      const incoming = this.cards[this._index];
      this._render({ skip: incoming });
      const promises = [this._animate(incoming, {
        transform: 'translate3d(360px, -20px, 0) rotate(20deg) scale(.98)',
        opacity: '0',
      }, this._pose(0))];
      this.cards.slice(oldIndex).forEach((card, depth) => {
        promises.push(this._animate(card, this._pose(depth), this._pose(depth + 1)));
      });
      this._finish(promises, token, () => {
        this._announce();
        if (restoreFocus) incoming.focus({ preventScroll: true });
      });
      return true;
    }

    leave() {
      this._cancel();
      this._present = false;
      this.root.dataset.ready = 'false';
      this.root.style.visibility = 'hidden';
      this._index = Math.min(this._index, this.items.length - 1);
      this._render();
    }

    destroy() {
      this.leave();
      this.root.removeEventListener('click', this._onClick);
      this.root.removeEventListener('keydown', this._onKeydown);
    }
  }

  window.InitiativeDeck = InitiativeDeck;
})();
