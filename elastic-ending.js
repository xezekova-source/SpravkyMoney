/* A bounded stretch at the final screen without adding document height. */
(() => {
  'use strict';

  class ElasticEnding {
    constructor(section, image, options = {}) {
      this.section = section;
      this.image = image;
      this.options = { reduceMotion: () => false, maxPull: 64, releaseDelay: 140, ...options };
      this.pull = 0;
      this.releaseTimer = 0;
      this.destroyed = false;
      this.onWheel = this.onWheel.bind(this);
      this.refresh = this.refresh.bind(this);
      this.onVisibilityChange = this.onVisibilityChange.bind(this);

      if (!section || !image) return;
      image.style.setProperty('--ending-pull', '0px');
      window.addEventListener('wheel', this.onWheel, { passive: false });
      window.addEventListener('scroll', this.refresh, { passive: true });
      window.addEventListener('resize', this.refresh, { passive: true });
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }

    atEnding() {
      if (!this.section?.classList.contains('is-active')) return false;
      const scroller = document.scrollingElement || document.documentElement;
      return scroller.scrollHeight - window.innerHeight - scroller.scrollTop <= 3;
    }

    onWheel(event) {
      if (this.destroyed || event.defaultPrevented || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (!this.atEnding() || event.deltaY <= 0) {
        this.release();
        return;
      }

      // Consume only the gesture beyond the document's real bottom.
      if (event.cancelable) event.preventDefault();
      if (this.options.reduceMotion()) {
        this.release();
        return;
      }

      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const delta = Math.min(240, event.deltaY * unit);
      const maxPull = Math.max(0, this.options.maxPull);
      this.pull += (maxPull - this.pull) * (1 - Math.exp(-delta / 180));
      this.pull = Math.min(maxPull, this.pull);
      this.section.classList.add('is-pulling');
      this.image.style.setProperty('--ending-pull', `${(-this.pull).toFixed(2)}px`);
      clearTimeout(this.releaseTimer);
      this.releaseTimer = setTimeout(() => this.release(), this.options.releaseDelay);
    }

    release() {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = 0;
      this.pull = 0;
      this.section?.classList.remove('is-pulling');
      this.image?.style.setProperty('--ending-pull', '0px');
    }

    refresh() {
      if (!this.atEnding() || this.options.reduceMotion()) this.release();
    }

    onVisibilityChange() {
      if (document.hidden) this.release();
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this.release();
      window.removeEventListener('wheel', this.onWheel);
      window.removeEventListener('scroll', this.refresh);
      window.removeEventListener('resize', this.refresh);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  window.ElasticEnding = ElasticEnding;
})();
