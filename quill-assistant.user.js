// ==UserScript==
// @name         Quill Master Assistant (Apple Glass Edition)
// @namespace    https://github.com/quill-assistant
// @version      2.0.0
// @description  Sleek Apple Cupertino-style HUD for Quill.org with verified optimal answers, 1-click React auto-fill, and capture-phase paste unlocker.
// @author       MysticalMike60t & Contributors
// @match        https://www.quill.org/*
// @icon         https://www.quill.org/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/**
 * Quill Master Assistant v2.0 (Tampermonkey Userscript)
 * 
 * Special thanks to MysticalMike60t for the original proof-of-concept inspiration (quill-cheat).
 * Rebuilt with Apple glassmorphism, CSP-immune event delegation, and bulletproof React Fiber auto-fill.
 */

(function () {
  'use strict';

  // Watch for page transitions in Quill's Single Page App (SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      onUrlChange();
    }
  }).observe(document, { subtree: true, childList: true });

  function onUrlChange() {
    if (location.href.includes('/lesson/')) {
      initQuillAssistant();
    }
  }

  // Also check immediately
  if (location.href.includes('/lesson/')) {
    setTimeout(initQuillAssistant, 1200);
  }

  function initQuillAssistant() {
    // If HUD already mounted, don't recreate
    if (document.getElementById('quill-assistant-hud')) return;

    // Load main assistant script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.textContent = `(${loadAssistant.toString()})();`;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  // Inject assistant logic directly into window scope
  function loadAssistant() {
    // --- Step 1: Neutralize Paste Blocker Immediately ---
    try {
      const blockedEvents = new Set(['paste', 'copy', 'cut', 'drop', 'dragover', 'contextmenu', 'selectstart']);
      const origPreventDefault = Event.prototype.preventDefault;
      Event.prototype.preventDefault = function () {
        if (blockedEvents.has(this.type)) return;
        return origPreventDefault.apply(this, arguments);
      };

      const origAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (type, listener, options) {
        if (type === 'paste' || type === 'drop') return;
        return origAddEventListener.apply(this, arguments);
      };

      ['onpaste', 'oncopy', 'oncut', 'ondrop'].forEach(h => {
        try {
          window[h] = null;
          document[h] = null;
        } catch (e) {}
      });

      const styleId = 'quill-assist-select-fix';
      if (!document.getElementById(styleId)) {
        const s = document.createElement('style');
        s.id = styleId;
        s.textContent = `
          *, *::before, *::after { -webkit-user-select: auto !important; user-select: auto !important; }
          input, textarea, .connect-text-area, [contenteditable="true"] {
            -webkit-user-select: text !important;
            user-select: text !important;
            pointer-events: auto !important;
          }
        `;
        (document.head || document.documentElement).appendChild(s);
      }
    } catch (e) {}

    const HUD_ID = 'quill-assistant-hud';
    const TOAST_ID = 'quill-dynamic-island-toast';
    if (document.getElementById(HUD_ID)) return;

    function getLessonId() {
      const match = window.location.href.match(/\/lesson\/([a-zA-Z0-9\-]+)/i);
      return match ? match[1] : null;
    }

    const lessonId = getLessonId();
    if (!lessonId) return;

    function autoFillQuill(text) {
      if (!text || text === 'No answer found in database') return false;

      // Multiple choice check
      const labels = Array.from(document.querySelectorAll('label, .ant-radio-wrapper, .multiple-choice-option, [role="radio"], button.option'));
      for (const label of labels) {
        const labelText = label.innerText ? label.innerText.trim().toLowerCase() : '';
        const cleanAnswer = text.trim().toLowerCase();
        if (labelText && (labelText === cleanAnswer || labelText.includes(cleanAnswer) || cleanAnswer.includes(labelText))) {
          const input = label.querySelector('input[type="radio"], input[type="checkbox"]');
          if (input) input.click(); else label.click();
          return true;
        }
      }

      const candidates = [
        'textarea.connect-text-area',
        '.connect-text-area textarea',
        'textarea[placeholder*="sentence" i]',
        'textarea[placeholder*="combine" i]',
        'textarea',
        'input[type="text"].connect-input',
        'input[type="text"]',
        '[contenteditable="true"]'
      ];

      let target = null;
      if (document.activeElement && (document.activeElement.tagName === 'TEXTAREA' || (document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'text') || document.activeElement.isContentEditable)) {
        target = document.activeElement;
      }
      if (!target) {
        for (const sel of candidates) {
          const els = Array.from(document.querySelectorAll(sel));
          for (const el of els) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none' && window.getComputedStyle(el).visibility !== 'hidden') {
              target = el;
              break;
            }
          }
          if (target) break;
        }
      }
      if (!target) target = document.querySelector('textarea, input[type="text"], [contenteditable="true"]');
      if (!target) return false;

      target.focus();
      if (target.isContentEditable) {
        target.textContent = text;
        target.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        target.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        return true;
      }

      const isTextArea = target instanceof HTMLTextAreaElement;
      const proto = isTextArea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
      const nativeSetter = descriptor ? descriptor.set : null;

      if (target._valueTracker) {
        try { target._valueTracker.setValue(''); } catch (e) {}
      }

      if (nativeSetter) {
        nativeSetter.call(target, text);
      } else {
        target.value = text;
      }

      try {
        target.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: text
        }));
      } catch (e) {
        target.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      }
      target.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      try {
        target.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
        target.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true }));
      } catch (e) {}
      if (typeof target.setSelectionRange === 'function') {
        target.setSelectionRange(text.length, text.length);
      }
      return true;
    }

    async function copyToClipboard(text) {
      if (!text || text === 'No answer found in database') return false;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch (e) {}
      }
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '-9999px';
        ta.setAttribute('readonly', '');
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, 99999);
        const success = document.execCommand('copy');
        document.body.removeChild(ta);
        return success;
      } catch (e) {
        return false;
      }
    }

    function showToast(message, type = 'info') {
      let toast = document.getElementById(TOAST_ID);
      if (!toast) {
        toast = document.createElement('div');
        toast.id = TOAST_ID;
        toast.style.cssText = `
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(-20px) scale(0.95);
          background: rgba(28, 28, 30, 0.88);
          -webkit-backdrop-filter: blur(25px) saturate(190%);
          backdrop-filter: blur(25px) saturate(190%);
          color: #f5f5f7;
          padding: 9px 20px;
          border-radius: 980px;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.12);
          z-index: 2147483647;
          opacity: 0;
          pointer-events: none;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        `;
        document.body.appendChild(toast);
      }
      const icons = { success: '✨', warning: '⚠️', error: '✕', info: '💡' };
      toast.innerHTML = `<span style="font-size: 14px;">${icons[type] || '✨'}</span><span>${message}</span>`;
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0) scale(1)';
      });
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px) scale(0.95)';
      }, 2400);
    }

    // Build Apple Glass HUD
    const hud = document.createElement('div');
    hud.id = HUD_ID;
    hud.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      width: 440px;
      max-height: 86vh;
      background: rgba(28, 28, 32, 0.82);
      -webkit-backdrop-filter: blur(30px) saturate(190%);
      backdrop-filter: blur(30px) saturate(190%);
      color: #f5f5f7;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      box-shadow: 0 24px 60px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      z-index: 2147483646;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
    `;

    hud.innerHTML = `
      <style>
        #${HUD_ID} * { box-sizing: border-box; margin: 0; padding: 0; }
        .qa-traffic-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; border: none; transition: transform 0.15s ease, filter 0.15s ease; }
        .qa-traffic-dot:hover { filter: brightness(1.15); transform: scale(1.1); }
        .qa-dot-close { background: #ff5f57; border: 1px solid #e0443e; }
        .qa-dot-min { background: #febc2e; border: 1px solid #d89e24; }
        .qa-dot-dock { background: #28c840; border: 1px solid #1aab29; }
        .qa-pill-btn { background: rgba(255, 255, 255, 0.08); color: #f5f5f7; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 980px; padding: 6px 14px; font-size: 12px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); user-select: none; }
        .qa-pill-btn:hover { background: rgba(255, 255, 255, 0.14); border-color: rgba(255, 255, 255, 0.2); transform: translateY(-1px); }
        .qa-pill-btn:active { transform: scale(0.96); }
        .qa-pill-primary { background: linear-gradient(180deg, #0a84ff 0%, #0066cc 100%); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 4px 14px rgba(10, 132, 255, 0.35); }
        .qa-pill-primary:hover { background: linear-gradient(180deg, #1a8eff 0%, #0077ed 100%); box-shadow: 0 6px 18px rgba(10, 132, 255, 0.45); }
        .qa-pill-success { background: linear-gradient(180deg, #30d158 0%, #24a843 100%) !important; color: #ffffff !important; }
        .qa-card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 8px; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        .qa-card:hover { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.14); }
        .qa-card.active-q { border-color: rgba(10, 132, 255, 0.7); background: rgba(10, 132, 255, 0.08); box-shadow: 0 0 24px rgba(10, 132, 255, 0.2), inset 0 0 0 1px rgba(10, 132, 255, 0.3); }
        .qa-badge { font-size: 10px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; padding: 3px 8px; border-radius: 980px; }
        .qa-badge-optimal { background: rgba(48, 209, 88, 0.16); color: #30d158; border: 1px solid rgba(48, 209, 88, 0.25); }
        .qa-badge-active { background: rgba(10, 132, 255, 0.2); color: #64d2ff; border: 1px solid rgba(10, 132, 255, 0.35); }
        .qa-answer-box { background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 10px 12px; color: #64d2ff; font-family: "SF Mono", Monaco, "Courier New", monospace; font-size: 12px; line-height: 1.45; word-break: break-word; }
        .qa-search-input { width: 100%; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 8px 12px 8px 32px; color: #f5f5f7; font-size: 12px; outline: none; }
        .qa-search-input:focus { border-color: #0a84ff; background: rgba(0, 0, 0, 0.5); }
        .qa-search-input::placeholder { color: rgba(245, 245, 247, 0.4); }
        #qa-scroll-area::-webkit-scrollbar { width: 6px; }
        #qa-scroll-area::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.16); border-radius: 980px; }
      </style>
      <div id="qa-chrome" style="padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="display: flex; gap: 7px;">
            <button class="qa-traffic-dot qa-dot-close" id="qa-btn-close"></button>
            <button class="qa-traffic-dot qa-dot-min" id="qa-btn-min"></button>
            <button class="qa-traffic-dot qa-dot-dock" id="qa-btn-dock"></button>
          </div>
          <div style="margin-left: 6px; font-weight: 600; font-size: 13px; color: #f5f5f7;">Quill Assistant</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #30d158; box-shadow: 0 0 8px #30d158;"></span>
          <span style="font-size: 11px; font-weight: 500; color: rgba(245, 245, 247, 0.6);" id="qa-status-pill">Ready</span>
        </div>
      </div>
      <div id="qa-toolbar" style="padding: 12px 18px 8px 18px; display: flex; flex-direction: column; gap: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
        <button class="qa-pill-btn qa-pill-primary" id="qa-btn-fill-active" style="width: 100%; justify-content: center; padding: 8px 16px;">
          <span>⚡</span><span>Auto-Fill Current Question</span>
        </button>
        <div style="position: relative;">
          <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 12px; color: rgba(245, 245, 247, 0.4); pointer-events: none;">🔍</span>
          <input type="text" class="qa-search-input" id="qa-search" placeholder="Search prompts or answers..." autocomplete="off" />
        </div>
      </div>
      <div id="qa-scroll-area" style="padding: 14px 18px; overflow-y: auto; max-height: calc(86vh - 130px); display: flex; flex-direction: column; gap: 12px;">
        <div id="qa-loading" style="text-align: center; padding: 36px 0; color: rgba(245, 245, 247, 0.6);">
          <div style="font-size: 12px; font-weight: 500;">Connecting to Quill CMS...</div>
        </div>
      </div>
      <div id="qa-footer" style="padding: 8px 18px; border-top: 1px solid rgba(255, 255, 255, 0.06); display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: rgba(245, 245, 247, 0.4);">
        <span>🔓 Clipboard Unlocked</span>
        <span>Press <strong>Alt + Q</strong> to toggle</span>
      </div>
    `;

    document.body.appendChild(hud);

    // Draggable Chrome
    const chromeHeader = document.getElementById('qa-chrome');
    let isDragging = false, startX, startY, origLeft, origTop;
    chromeHeader.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = hud.getBoundingClientRect();
      origLeft = rect.left; origTop = rect.top;
      hud.style.right = 'auto'; hud.style.left = `${origLeft}px`; hud.style.top = `${origTop}px`;
      document.body.style.userSelect = 'none';
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      hud.style.left = `${origLeft + (e.clientX - startX)}px`;
      hud.style.top = `${Math.max(10, origTop + (e.clientY - startY))}px`;
    });
    window.addEventListener('mouseup', () => {
      if (isDragging) { isDragging = false; document.body.style.userSelect = ''; }
    });

    // Window Controls
    const scrollArea = document.getElementById('qa-scroll-area');
    const toolbar = document.getElementById('qa-toolbar');
    const footer = document.getElementById('qa-footer');
    let isMinimized = false, isDockedLeft = false;

    document.getElementById('qa-btn-close').addEventListener('click', () => hud.remove());
    document.getElementById('qa-btn-min').addEventListener('click', () => {
      isMinimized = !isMinimized;
      toolbar.style.display = isMinimized ? 'none' : 'flex';
      scrollArea.style.display = isMinimized ? 'none' : 'flex';
      footer.style.display = isMinimized ? 'none' : 'flex';
      hud.style.width = isMinimized ? '220px' : '440px';
    });
    document.getElementById('qa-btn-dock').addEventListener('click', () => {
      isDockedLeft = !isDockedLeft;
      hud.style.top = '24px';
      if (isDockedLeft) { hud.style.left = '24px'; hud.style.right = 'auto'; }
      else { hud.style.right = '24px'; hud.style.left = 'auto'; }
    });

    let lessonQuestions = [];
    let currentActiveQuestionIndex = null;

    hud.addEventListener('click', async (e) => {
      const fillBtn = e.target.closest('.qa-btn-fill');
      if (fillBtn) {
        const idx = parseInt(fillBtn.dataset.index, 10);
        const q = lessonQuestions[idx];
        if (q && q.bestAnswer) {
          const success = autoFillQuill(q.bestAnswer);
          if (success) {
            showToast(`Filled Question ${q.index}!`, 'success');
            fillBtn.innerHTML = '✓ Filled';
            fillBtn.classList.add('qa-pill-success');
            setTimeout(() => {
              fillBtn.innerHTML = 'Auto-Fill';
              fillBtn.classList.remove('qa-pill-success');
            }, 1500);
          } else {
            showToast('Could not find active input field', 'warning');
          }
        }
        return;
      }

      const copyBtn = e.target.closest('.qa-btn-copy');
      if (copyBtn) {
        const idx = parseInt(copyBtn.dataset.index, 10);
        const q = lessonQuestions[idx];
        if (q && q.bestAnswer) {
          const success = await copyToClipboard(q.bestAnswer);
          if (success) {
            showToast(`Copied Answer Q${q.index}!`, 'success');
            copyBtn.innerHTML = '✓ Copied';
            copyBtn.classList.add('qa-pill-success');
            setTimeout(() => {
              copyBtn.innerHTML = 'Copy';
              copyBtn.classList.remove('qa-pill-success');
            }, 1500);
          } else {
            showToast('Copying failed', 'error');
          }
        }
        return;
      }

      if (e.target.closest('#qa-btn-fill-active')) {
        let targetQ = (currentActiveQuestionIndex !== null && lessonQuestions[currentActiveQuestionIndex])
          ? lessonQuestions[currentActiveQuestionIndex]
          : lessonQuestions[0];

        if (targetQ && targetQ.bestAnswer) {
          const success = autoFillQuill(targetQ.bestAnswer);
          if (success) showToast(`Auto-filled Q${targetQ.index}!`, 'success');
          else showToast('No active input detected on screen', 'warning');
        } else {
          showToast('No answer available', 'warning');
        }
      }
    });

    // Search filter
    document.getElementById('qa-search').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      lessonQuestions.forEach((q, idx) => {
        const card = document.getElementById(`qa-card-${idx}`);
        if (!card) return;
        if (!query) { card.style.display = 'flex'; return; }
        const match = (q.promptText && q.promptText.toLowerCase().includes(query)) ||
                      (q.bestAnswer && q.bestAnswer.toLowerCase().includes(query)) ||
                      (q.cues && q.cues.toLowerCase().includes(query)) ||
                      (`q${q.index}`.includes(query));
        card.style.display = match ? 'flex' : 'none';
      });
    });

    // Fetch lesson data
    (async () => {
      try {
        const lessonRes = await fetch(`https://www.quill.org/api/v1/lessons/${lessonId}.json`);
        if (!lessonRes.ok) throw new Error(`Quill Lesson API HTTP ${lessonRes.status}`);
        const lessonData = await lessonRes.json();
        const rawQuestions = lessonData.questions || [];

        if (rawQuestions.length === 0) {
          scrollArea.innerHTML = `<div style="text-align: center; padding: 24px; color: #ff5f57;">No questions found.</div>`;
          return;
        }

        document.getElementById('qa-status-pill').textContent = `${rawQuestions.length} Questions`;

        lessonQuestions = await Promise.all(
          rawQuestions.map(async (item, idx) => {
            const key = item.key;
            let promptText = '', instructions = '', cues = '', answers = [];

            try {
              const qRes = await fetch(`https://www.quill.org/api/v1/questions/${key}.json`);
              if (qRes.ok) {
                const qData = await qRes.json();
                promptText = (qData.prompt || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                instructions = qData.instructions || '';
                cues = qData.cues || '';
              }
            } catch (e) {}

            try {
              const cmsRes = await fetch(`https://cms.quill.org/questions/${key}/responses`);
              if (cmsRes.ok) {
                const cmsData = await cmsRes.json();
                if (Array.isArray(cmsData)) {
                  const optimal = cmsData.filter(r => r.optimal);
                  answers = optimal.length > 0 ? optimal : cmsData.slice(0, 3);
                }
              }
            } catch (e) {}

            if (answers.length === 0) {
              try {
                const mcRes = await fetch(`https://cms.quill.org/questions/${key}/multiple_choice_options`);
                if (mcRes.ok) {
                  const mcData = await mcRes.json();
                  if (Array.isArray(mcData)) {
                    answers = mcData.filter(opt => opt.correct).map(opt => ({ text: opt.text, optimal: true }));
                  }
                }
              } catch (e) {}
            }

            const validAnswers = answers.map(a => a.text).filter(Boolean);
            const bestAnswer = validAnswers[0] || 'No answer found in database';

            return {
              index: idx + 1,
              key,
              promptText,
              instructions,
              cues,
              bestAnswer,
              hasOptimal: answers.some(a => a.optimal)
            };
          })
        );

        let html = '';
        lessonQuestions.forEach((q, idx) => {
          html += `
            <div class="qa-card" id="qa-card-${idx}">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <strong style="color: #64d2ff; font-size: 12px; font-weight: 700;">Q${q.index}</strong>
                  <span class="qa-badge ${q.hasOptimal ? 'qa-badge-optimal' : ''}">
                    ${q.hasOptimal ? 'Optimal' : 'Standard'}
                  </span>
                </div>
                <span class="qa-badge qa-badge-active" id="qa-active-pill-${idx}" style="display: none;">Active</span>
              </div>
              <div style="font-size: 12px; color: #e5e5ea; line-height: 1.45;">
                ${q.promptText || `Question ${q.index}`}
              </div>
              ${q.cues ? `
                <div style="font-size: 11px; color: #ffd60a; display: flex; align-items: center; gap: 4px;">
                  <span>⚡ Hint:</span><em style="font-style: normal; opacity: 0.9;">${q.cues}</em>
                </div>
              ` : ''}
              <div class="qa-answer-box">${q.bestAnswer}</div>
              <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;">
                <button class="qa-pill-btn qa-btn-copy" data-index="${idx}">Copy</button>
                <button class="qa-pill-btn qa-pill-primary qa-btn-fill" data-index="${idx}">Auto-Fill</button>
              </div>
            </div>
          `;
        });

        scrollArea.innerHTML = html;
        showToast(`Loaded ${lessonQuestions.length} Questions!`, 'success');

        function updateActiveQuestion() {
          const pageText = document.body.innerText;
          let foundIndex = null;
          lessonQuestions.forEach((q, idx) => {
            const card = document.getElementById(`qa-card-${idx}`);
            const activePill = document.getElementById(`qa-active-pill-${idx}`);
            if (!card) return;
            const isCurrentlyActive = q.promptText && q.promptText.length > 15 && pageText.includes(q.promptText.slice(0, 32));
            if (isCurrentlyActive && foundIndex === null) {
              foundIndex = idx;
              card.classList.add('active-q');
              if (activePill) activePill.style.display = 'inline-block';
            } else {
              card.classList.remove('active-q');
              if (activePill) activePill.style.display = 'none';
            }
          });

          currentActiveQuestionIndex = foundIndex;
          const fillActiveBtn = document.getElementById('qa-btn-fill-active');
          if (fillActiveBtn) {
            fillActiveBtn.innerHTML = foundIndex !== null
              ? `<span>⚡</span><span>Auto-Fill Q${lessonQuestions[foundIndex].index}</span>`
              : `<span>⚡</span><span>Auto-Fill Current Question</span>`;
          }
        }

        updateActiveQuestion();
        new MutationObserver(updateActiveQuestion).observe(document.body, { childList: true, subtree: true });

      } catch (err) {
        scrollArea.innerHTML = `<div style="color: #ff5f57; padding: 20px; text-align: center;"><strong>Error Loading Activity Data</strong><p style="font-size: 11px; margin-top: 6px;">${err.message}</p></div>`;
      }
    })();

    // Hotkeys
    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        hud.style.display = hud.style.display === 'none' ? 'flex' : 'none';
      }
      if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        const targetQ = (currentActiveQuestionIndex !== null && lessonQuestions[currentActiveQuestionIndex])
          ? lessonQuestions[currentActiveQuestionIndex]
          : lessonQuestions[0];
        if (targetQ && targetQ.bestAnswer) autoFillQuill(targetQ.bestAnswer);
      }
    });
  }
})();
