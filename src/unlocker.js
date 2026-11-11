/**
 * Universal Clipboard & Paste Unlocker Bookmarklet
 * Specifically analyzed and tailored for Quill.org and similar platforms.
 *
 * How Quill blocks pasting:
 * Quill.org attaches a capture-phase listener on window:
 *   window.addEventListener("paste", N => (N.preventDefault(), !1), true);
 * and onDrop handlers on the text area:
 *   onDrop: N => N.preventDefault()
 *
 * How this script disables the unpasteability:
 * 1. Overrides Event.prototype.preventDefault to neutralize preventDefault() on clipboard and drag/drop events.
 * 2. Overrides EventTarget.prototype.addEventListener to prevent new anti-paste/drop listeners from registering.
 * 3. Clears inline onpaste, oncopy, oncut, ondrop, and oncontextmenu attributes.
 * 4. Injects CSS rules overriding user-select: none to re-enable text selection.
 * 5. Shows a clean 2-second confirmation banner.
 */

(function () {
  'use strict';

  const CLIPBOARD_EVENTS = new Set([
    'paste',
    'copy',
    'cut',
    'drop',
    'dragover',
    'contextmenu',
    'selectstart'
  ]);

  // 1. Defeat preventDefault() on all clipboard and selection events
  const originalPreventDefault = Event.prototype.preventDefault;
  Event.prototype.preventDefault = function () {
    if (CLIPBOARD_EVENTS.has(this.type)) {
      return; // Neutralized! Allows native paste/copy to proceed.
    }
    return originalPreventDefault.apply(this, arguments);
  };

  // 2. Prevent scripts from blocking via returnValue = false
  try {
    Object.defineProperty(Event.prototype, 'returnValue', {
      get() {
        return true;
      },
      set() {
        // Discard any attempts by site scripts to set returnValue = false
      },
      configurable: true
    });
  } catch (e) {}

  // 3. Block future anti-paste / anti-drop listeners (e.g. when moving between quiz questions)
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (type === 'paste' || type === 'drop') {
      return; // Discard registration
    }
    return originalAddEventListener.apply(this, arguments);
  };

  // 4. Clear all inline clipboard & contextmenu event handlers
  const inlineProps = [
    'onpaste',
    'oncopy',
    'oncut',
    'ondrop',
    'oncontextmenu',
    'onselectstart'
  ];

  [window, document, document.documentElement, document.body].forEach(target => {
    if (!target) return;
    inlineProps.forEach(prop => {
      try {
        target[prop] = null;
      } catch (e) {}
    });
  });

  document.querySelectorAll('*').forEach(el => {
    inlineProps.forEach(prop => {
      if (el[prop]) el[prop] = null;
    });
  });

  // 5. Restore CSS text selection & pointer interactions
  const styleId = 'quill-clipboard-unlocker-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      *, *::before, *::after {
        -webkit-user-select: auto !important;
        -moz-user-select: auto !important;
        -ms-user-select: auto !important;
        user-select: auto !important;
      }
      input, textarea, [contenteditable="true"], .connect-text-area {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        pointer-events: auto !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // 6. Visual notification toast
  const toastId = 'quill-unlock-toast';
  let toast = document.getElementById(toastId);
  if (!toast) {
    toast = document.createElement('div');
    toast.id = toastId;
    toast.style.cssText = [
      'position: fixed',
      'top: 16px',
      'right: 16px',
      'background: #0d9488',
      'color: #ffffff',
      'padding: 10px 18px',
      'border-radius: 8px',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'font-size: 14px',
      'font-weight: 600',
      'box-shadow: 0 4px 16px rgba(0,0,0,0.2)',
      'z-index: 2147483647',
      'transition: opacity 0.3s ease, transform 0.3s ease',
      'pointer-events: none',
      'opacity: 0',
      'transform: translateY(-8px)'
    ].join(';');
    (document.body || document.documentElement).appendChild(toast);
  }

  toast.textContent = '🔓 Copy & Paste Unlocked!';
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';
    }, 2500);
  });
})();
