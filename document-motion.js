/* A quiet, fixed document beside the insight; no entrance or exit sequence. */
(() => {
  'use strict';

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smooth = progress => progress * progress * (3 - 2 * progress);

  class DocumentFlight {
    constructor(section, overlay, options = {}) {
      this.section = section;
      this.overlay = overlay;
      this.options = {
        reduceMotion: () => false,
        anchorX: .8,
        landingY: .56,
        offsetX: 0,
        offsetY: -100,
        parallax: .12,
        ...options,
      };
      this.frame = 0;
      this.destroyed = false;
      this.startedAt = performance.now();
      this.requestFrame = this.requestFrame.bind(this);
      this.render = this.render.bind(this);
      this.onVisibilityChange = this.onVisibilityChange.bind(this);

      if (!section || !overlay) return;
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.visibility = 'hidden';
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      overlay.style.willChange = 'transform, opacity';
      overlay.style.left = `${clamp(this.options.anchorX) * 100}%`;

      window.addEventListener('scroll', this.requestFrame, { passive: true });
      window.addEventListener('resize', this.requestFrame, { passive: true });
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      this.observer = new IntersectionObserver(this.requestFrame, {
        threshold: [0, .5, .65, .85, 1],
      });
      this.observer.observe(section);
      this.requestFrame();
    }

    requestFrame() {
      if (this.destroyed || !this.section || !this.overlay || document.hidden || this.frame) return;
      this.frame = requestAnimationFrame(this.render);
    }

    onVisibilityChange() {
      if (document.hidden) {
        cancelAnimationFrame(this.frame);
        this.frame = 0;
      } else {
        this.requestFrame();
      }
    }

    render(now) {
      this.frame = 0;
      if (this.destroyed || !this.section || !this.overlay) return;

      const height = window.innerHeight;
      const rect = this.section.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(rect.bottom, height) - Math.max(rect.top, 0));
      const visibleFraction = visibleHeight / Math.max(1, Math.min(rect.height, height));
      // Only soften the section boundary. At rest the document is already in
      // place; it never flies in, flies away, or waits for an entrance sequence.
      const opacity = smooth(clamp((visibleFraction - .5) / .35));
      if (opacity <= .001) {
        this.overlay.style.visibility = 'hidden';
        this.overlay.style.opacity = '0';
        return;
      }

      const reduceMotion = Boolean(this.options.reduceMotion());
      const phase = (now - this.startedAt) / 4400 * Math.PI * 2;
      const x = this.options.offsetX + (reduceMotion ? 0 : Math.sin(phase) * 9);
      const y = height * this.options.landingY + this.options.offsetY +
        (reduceMotion ? 0 : Math.sin(phase * .8) * 12 + rect.top * this.options.parallax);
      const rotation = reduceMotion ? 0 : 2 + Math.sin(phase) * 1.65;

      this.overlay.style.visibility = 'visible';
      this.overlay.style.opacity = opacity.toFixed(3);
      this.overlay.style.transform = `translate3d(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${y.toFixed(2)}px), 0) rotate(${rotation.toFixed(3)}deg)`;
      if (!reduceMotion) this.requestFrame();
    }

    refresh() {
      this.requestFrame();
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.observer?.disconnect();
      window.removeEventListener('scroll', this.requestFrame);
      window.removeEventListener('resize', this.requestFrame);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      if (this.overlay) {
        this.overlay.style.visibility = 'hidden';
        this.overlay.style.opacity = '0';
        this.overlay.style.willChange = '';
      }
    }
  }

  window.DocumentFlight = DocumentFlight;
})();
