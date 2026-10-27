/* A single comparison step inside the redesign screen. */
(() => {
  'use strict';

  class RedesignComparison {
    constructor(section, options = {}) {
      this.stage = section.querySelector('.document-comparison');
      this.after = section.querySelector('.redesign-document--after');
      this.reduceMotion = options.reduceMotion || (() => false);
      this.expanded = false;
      this.busy = false;
      this.timer = 0;
      this.set(false, false);
    }

    set(expanded, animate = true) {
      clearTimeout(this.timer);
      const changed = this.expanded !== expanded;
      this.expanded = expanded;
      const moving = animate && changed && !this.reduceMotion();
      if (!moving) this.stage.classList.add('is-resetting');
      this.stage.classList.toggle('is-compared', expanded);
      this.stage.dataset.state = expanded ? 'comparison' : 'before';
      this.after.setAttribute('aria-hidden', String(!expanded));
      this.busy = moving;
      this.stage.classList.toggle('is-transitioning', moving);
      if (!moving) {
        // Apply an offscreen entry state before scrolling to the section.
        void this.stage.offsetWidth;
        this.stage.classList.remove('is-resetting');
      } else {
        this.timer = setTimeout(() => {
          this.busy = false;
          this.stage.classList.remove('is-transitioning');
        }, 1100);
      }
    }

    next() {
      if (this.busy) return true;
      if (this.expanded) return false;
      this.set(true);
      return true;
    }

    previous() {
      if (this.busy) return true;
      if (!this.expanded) return false;
      this.set(false);
      return true;
    }
  }

  window.RedesignComparison = RedesignComparison;
})();
