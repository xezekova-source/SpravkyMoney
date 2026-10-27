/* Russian prose: keep short words with the word that follows them. */
(() => {
  'use strict';

  const NO_BREAK_SPACE = '\u00a0';
  // Leave authored line breaks and sentence boundaries intact. The Unicode
  // letter boundary also prevents changing the end of a longer word.
  const shortWord = /(?<![\p{L}\p{N}_])([А-Яа-яЁё]{1,3})([»”"'’)\]]*[,;:]?)[ \t]+(?=\S)/gu;
  const excluded = [
    'script', 'style', 'textarea', 'noscript', 'code', 'pre', 'kbd', 'samp',
    'svg', 'canvas', 'video', 'audio', 'input', 'select', 'option',
    '[contenteditable="true"]', '[data-no-typography]', '[data-typography="off"]',
    '.text-type', '.manifesto-reserve', '#typed-manifesto'
  ].join(',');

  function keepWordsTogether(value) {
    return String(value ?? '').replace(shortWord, `$1$2${NO_BREAK_SPACE}`);
  }

  function polishTypography(root = document.body) {
    if (!root || typeof root.nodeType !== 'number') return root;
    const documentRoot = root.ownerDocument || document;
    const walker = documentRoot.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.parentElement || node.parentElement.closest(excluded)) return NodeFilter.FILTER_REJECT;
        return /[А-Яа-яЁё]/u.test(node.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    let node;
    while ((node = walker.nextNode())) {
      const polished = keepWordsTogether(node.data);
      if (polished !== node.data) node.data = polished;
    }
    return root;
  }

  window.keepWordsTogether = keepWordsTogether;
  window.polishTypography = polishTypography;
})();
