// ==UserScript==
// @name         Quill Hacks
// @namespace    https://github.com/Siguyyy/quill-hacks
// @version      2.2.0
// @description  Lightweight assistant for Quill.org lessons with verified optimal answers, 1-click React auto-fill, and clipboard unblocker.
// @author       Siguyyy & Contributors
// @match        https://www.quill.org/*
// @icon         https://www.quill.org/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/**
 * Quill Master Assistant (Minimalist Anti-Freeze & Input-Isolated Edition)
 * 
 * Key Fixes:
 * 1. INPUT ISOLATION: autoFillQuill strictly ignores `#quill-assistant-hud`.
 *    Previously, it matched the HUD's `#qa-filter` search box, filling it with the
 *    answer and causing all other questions to be filtered out (disappear)!
 * 2. REACT FIBER DIRECT INJECTION: Interrogates `__reactProps$` to call React's
 *    internal `onChange` / `onInput` handlers directly, enabling Quill's Submit button.
 * 3. FOCUS TRACKING: Tracks `lastFocusedInput` via window capture phase so the
 *    active Quill answer box is remembered even when focus moves to the HUD button.
 * 4. IFRAME SUPPORT: Can locate answer inputs embedded inside LMS iframes (Canvas, Google Classroom).
 */

(async function () {
  'use strict';

  const HUD_ID = 'quill-assistant-hud';

  // Toggle if already exists
  const existing = document.getElementById(HUD_ID);
  if (existing) {
    existing.style.display = existing.style.display === 'none' ? 'flex' : 'none';
    return;
  }

  // Track the last focused input on Quill's page (ignoring HUD elements)
  let lastFocusedInput = null;
  window.addEventListener('focusin', (e) => {
    if (e.target && (!e.target.closest || !e.target.closest('#' + HUD_ID))) {
      const tag = e.target.tagName ? e.target.tagName.toLowerCase() : '';
      if (tag === 'textarea' || tag === 'input' || e.target.isContentEditable) {
        lastFocusedInput = e.target;
      }
    }
  }, true);

  // 1. Safe capture-phase paste unblock (targeted strictly to paste & drop)
  try {
    const blockedEvents = new Set(['paste', 'drop']);
    const origPrevent = Event.prototype.preventDefault;
    Event.prototype.preventDefault = function () {
      if (blockedEvents.has(this.type)) return;
      return origPrevent.apply(this, arguments);
    };

    const origAdd = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (type === 'paste' || type === 'drop') return;
      return origAdd.apply(this, arguments);
    };

    window.onpaste = null;
    document.onpaste = null;
  } catch (e) {}

  // 2. Extract lesson ID
  const match = window.location.href.match(/\/lesson\/([a-zA-Z0-9\-]+)/i);
  const lessonId = match ? match[1] : null;
  if (!lessonId) {
    alert('Quill Assistant: Please open an active lesson (/connect/#/play/lesson/...).');
    return;
  }

  // 3. Isolated Input Finder (100% immune to finding HUD's own elements)
  function findQuillInput() {
    // Priority 1: User's last focused input on the page
    if (lastFocusedInput && document.contains(lastFocusedInput) && (!lastFocusedInput.closest || !lastFocusedInput.closest('#' + HUD_ID))) {
      return lastFocusedInput;
    }

    // Priority 2: Visible textareas outside HUD
    const textareas = Array.from(document.querySelectorAll('textarea')).filter(el => !el.closest('#' + HUD_ID));
    for (const ta of textareas) {
      if (ta.offsetWidth > 0 || ta.offsetHeight > 0) return ta;
    }
    if (textareas.length > 0) return textareas[0];

    // Priority 3: Visible text inputs outside HUD
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])')).filter(el => !el.closest('#' + HUD_ID));
    for (const inp of inputs) {
      if (inp.offsetWidth > 0 || inp.offsetHeight > 0) return inp;
    }

    // Priority 4: Contenteditable elements outside HUD
    const editables = Array.from(document.querySelectorAll('[contenteditable="true"]')).filter(el => !el.closest('#' + HUD_ID));
    for (const ed of editables) {
      if (ed.offsetWidth > 0 || ed.offsetHeight > 0) return ed;
    }

    // Priority 5: Iframes (Canvas / LMS embeds)
    const iframes = Array.from(document.querySelectorAll('iframe'));
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc) {
          const frameTa = doc.querySelector('textarea, input[type="text"], [contenteditable="true"]');
          if (frameTa) return frameTa;
        }
      } catch (e) {}
    }

    return null;
  }

  // 4. React Fiber Auto-Fill
  function autoFillQuill(text) {
    if (!text || text === 'No answer found in database') return false;

    // A. Multiple choice option check (outside HUD)
    const options = Array.from(document.querySelectorAll('label, .ant-radio-wrapper, .multiple-choice-option, [role="radio"], button.option'))
      .filter(el => !el.closest('#' + HUD_ID));

    for (const opt of options) {
      const optText = (opt.innerText || '').trim().toLowerCase();
      const cleanAnswer = text.trim().toLowerCase();
      if (optText && (optText === cleanAnswer || optText.includes(cleanAnswer) || cleanAnswer.includes(optText))) {
        const input = opt.querySelector('input[type="radio"], input[type="checkbox"]');
        if (input) input.click(); else opt.click();
        return true;
      }
    }

    // B. Locate Quill's actual input field
    const target = findQuillInput();
    if (!target) {
      alert('Quill Assistant: Could not locate answer field. Please click inside the answer box first, then click Auto-Fill.');
      return false;
    }

    target.focus();

    // ContentEditable handling
    if (target.isContentEditable) {
      target.textContent = text;
      target.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      target.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      return true;
    }

    // React Native Prototype Setter
    const isTextArea = target instanceof HTMLTextAreaElement;
    const proto = isTextArea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    const nativeSetter = descriptor ? descriptor.set : null;

    // Reset React 16/17/18 internal tracker
    if (target._valueTracker) {
      try { target._valueTracker.setValue(''); } catch (e) {}
    }

    if (nativeSetter) {
      nativeSetter.call(target, text);
    } else {
      target.value = text;
    }

    // Direct React Fiber Props Notification
    try {
      const reactKey = Object.keys(target).find(k => k.startsWith('__reactProps$') || k.startsWith('__reactEventHandlers$'));
      if (reactKey && target[reactKey]) {
        const props = target[reactKey];
        if (typeof props.onChange === 'function') {
          props.onChange({ target, currentTarget: target, nativeEvent: new Event('change') });
        }
        if (typeof props.onInput === 'function') {
          props.onInput({ target, currentTarget: target, nativeEvent: new Event('input') });
        }
      }
    } catch (e) {}

    // Dispatch full native and synthetic event sequence
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

  // 5. Dual-layer copy
  async function copyToClipboard(text) {
    if (!text || text === 'No answer found in database') return false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {}
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
    } catch (err) {
      return false;
    }
  }

  // 6. Minimalist Off-White UI
  const hud = document.createElement('div');
  hud.id = HUD_ID;
  hud.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 380px;
    max-height: 85vh;
    background: #fafaf8;
    color: #1a1a18;
    border: 1px solid #e2e2de;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 13px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    line-height: 1.45;
  `;

  hud.innerHTML = `
    <style>
      #${HUD_ID} * { box-sizing: border-box; margin: 0; padding: 0; }
      .qa-btn {
        background: #ffffff;
        color: #222220;
        border: 1px solid #d5d5cf;
        border-radius: 5px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        user-select: none;
      }
      .qa-btn:hover { background: #f0f0eb; border-color: #c0c0ba; }
      .qa-btn-dark {
        background: #1a1a18;
        color: #ffffff;
        border: 1px solid #1a1a18;
      }
      .qa-btn-dark:hover { background: #333330; }
      .qa-card {
        background: #ffffff;
        border: 1px solid #e8e8e3;
        border-radius: 6px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .qa-card.active-q {
        border-color: #1a1a18;
        box-shadow: 0 0 0 1px #1a1a18;
      }
      .qa-answer {
        background: #f4f4f0;
        border: 1px solid #e2e2dc;
        border-radius: 5px;
        padding: 6px 8px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
        font-size: 12px;
        color: #111110;
        word-break: break-word;
      }
      .qa-search {
        width: 100%;
        background: #ffffff;
        border: 1px solid #d8d8d2;
        border-radius: 5px;
        padding: 6px 10px;
        font-size: 12px;
        color: #1a1a18;
        outline: none;
      }
      .qa-search:focus { border-color: #1a1a18; }
      #qa-scroll::-webkit-scrollbar { width: 5px; }
      #qa-scroll::-webkit-scrollbar-thumb { background: #d0d0c8; border-radius: 4px; }
    </style>

    <!-- Header -->
    <div id="qa-drag" style="padding: 10px 14px; background: #fafaf8; border-bottom: 1px solid #e8e8e3; display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: 600;">Quill Assistant</span>
        <span id="qa-count" style="font-size: 11px; background: #eaeae5; color: #555550; padding: 2px 6px; border-radius: 4px;">Loading...</span>
      </div>
      <div style="display: flex; gap: 4px;">
        <button id="qa-min" class="qa-btn" style="padding: 2px 7px; font-size: 11px;" title="Minimize">—</button>
        <button id="qa-close" class="qa-btn" style="padding: 2px 7px; font-size: 11px;" title="Close">✕</button>
      </div>
    </div>

    <!-- Body -->
    <div id="qa-body" style="display: flex; flex-direction: column; overflow: hidden;">
      <div style="padding: 10px 14px; border-bottom: 1px solid #eeeeea; display: flex; flex-direction: column; gap: 8px;">
        <button id="qa-fill-current" class="qa-btn qa-btn-dark" style="width: 100%; padding: 7px 12px;">
          Auto-Fill Active Question
        </button>
        <input type="text" id="qa-filter" class="qa-search" placeholder="Filter questions..." autocomplete="off" />
      </div>

      <div id="qa-scroll" style="padding: 12px 14px; overflow-y: auto; max-height: calc(85vh - 125px); display: flex; flex-direction: column; gap: 10px;">
        <div style="text-align: center; padding: 20px 0; color: #777770;">Fetching lesson answers...</div>
      </div>

      <div style="padding: 6px 14px; border-top: 1px solid #eeeeea; display: flex; justify-content: space-between; font-size: 11px; color: #888880; background: #fafaf8;">
        <span>Clipboard Unlocked 🔓</span>
        <span>Alt+Q: Toggle • Alt+F: Fill</span>
      </div>
    </div>
  `;

  document.body.appendChild(hud);

  // Scoped Dragging
  const dragBar = document.getElementById('qa-drag');
  dragBar.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = hud.getBoundingClientRect();
    const origX = rect.left;
    const origY = rect.top;

    hud.style.right = 'auto';
    hud.style.left = `${origX}px`;
    hud.style.top = `${origY}px`;

    function onMouseMove(moveEvent) {
      hud.style.left = `${origX + (moveEvent.clientX - startX)}px`;
      hud.style.top = `${Math.max(10, origY + (moveEvent.clientY - startY))}px`;
    }

    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });

  // Window Controls
  const bodyEl = document.getElementById('qa-body');
  const minBtn = document.getElementById('qa-min');
  let isMin = false;
  minBtn.addEventListener('click', () => {
    isMin = !isMin;
    bodyEl.style.display = isMin ? 'none' : 'flex';
    minBtn.textContent = isMin ? '□' : '—';
  });

  document.getElementById('qa-close').addEventListener('click', () => {
    if (window._qaDetectInterval) clearInterval(window._qaDetectInterval);
    hud.remove();
  });

  // Event Delegation for Buttons
  let lessonQuestions = [];
  let currentActiveIndex = null;

  hud.addEventListener('click', async (e) => {
    const fillBtn = e.target.closest('.qa-card-fill');
    if (fillBtn) {
      const idx = parseInt(fillBtn.dataset.index, 10);
      const q = lessonQuestions[idx];
      if (q && q.bestAnswer) {
        const ok = autoFillQuill(q.bestAnswer);
        if (ok) {
          fillBtn.textContent = 'Filled ✓';
          setTimeout(() => { fillBtn.textContent = 'Auto-Fill'; }, 1200);
        }
      }
      return;
    }

    const copyBtn = e.target.closest('.qa-card-copy');
    if (copyBtn) {
      const idx = parseInt(copyBtn.dataset.index, 10);
      const q = lessonQuestions[idx];
      if (q && q.bestAnswer) {
        const ok = await copyToClipboard(q.bestAnswer);
        if (ok) {
          copyBtn.textContent = 'Copied ✓';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
        }
      }
      return;
    }

    if (e.target.closest('#qa-fill-current')) {
      const targetQ = (currentActiveIndex !== null && lessonQuestions[currentActiveIndex])
        ? lessonQuestions[currentActiveIndex]
        : lessonQuestions[0];
      if (targetQ && targetQ.bestAnswer) {
        autoFillQuill(targetQ.bestAnswer);
      }
    }
  });

  // Search Filter
  document.getElementById('qa-filter').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    lessonQuestions.forEach((q, idx) => {
      const card = document.getElementById(`qa-card-${idx}`);
      if (!card) return;
      if (!term) { card.style.display = 'flex'; return; }
      const match = (q.promptText && q.promptText.toLowerCase().includes(term)) ||
                    (q.bestAnswer && q.bestAnswer.toLowerCase().includes(term)) ||
                    (`q${q.index}`.includes(term));
      card.style.display = match ? 'flex' : 'none';
    });
  });

  // Fetch Questions & Answers
  try {
    const lessonRes = await fetch(`https://www.quill.org/api/v1/lessons/${lessonId}.json`, { credentials: 'include' });
    if (!lessonRes.ok) throw new Error(`Quill API HTTP ${lessonRes.status}`);
    const lessonData = await lessonRes.json();
    const rawQuestions = lessonData.questions || [];

    if (rawQuestions.length === 0) {
      document.getElementById('qa-scroll').innerHTML = '<div style="color: #c0392b; padding: 12px; text-align: center;">No questions found.</div>';
      return;
    }

    document.getElementById('qa-count').textContent = `${rawQuestions.length} Questions`;

    lessonQuestions = await Promise.all(
      rawQuestions.map(async (item, idx) => {
        const key = item.key;
        let promptText = '', cues = '', answers = [];

        try {
          const qRes = await fetch(`https://www.quill.org/api/v1/questions/${key}.json`, { credentials: 'include' });
          if (qRes.ok) {
            const qData = await qRes.json();
            promptText = (qData.prompt || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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
        return {
          index: idx + 1,
          key,
          promptText,
          cues,
          bestAnswer: validAnswers[0] || 'No answer found in database',
          isOptimal: answers.some(a => a.optimal)
        };
      })
    );

    let html = '';
    lessonQuestions.forEach((q, idx) => {
      html += `
        <div class="qa-card" id="qa-card-${idx}">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600; font-size: 12px;">Q${q.index}</span>
            <span style="font-size: 11px; color: ${q.isOptimal ? '#27ae60' : '#7f8c8d'};">
              ${q.isOptimal ? 'Optimal Answer' : 'Standard'}
            </span>
          </div>
          <div style="font-size: 12px; color: #444440;">${q.promptText || `Question ${q.index}`}</div>
          ${q.cues ? `<div style="font-size: 11px; color: #d35400;">Hint: <em>${q.cues}</em></div>` : ''}
          <div class="qa-answer">${q.bestAnswer}</div>
          <div style="display: flex; gap: 6px; justify-content: flex-end; margin-top: 4px;">
            <button class="qa-btn qa-card-copy" data-index="${idx}">Copy</button>
            <button class="qa-btn qa-btn-dark qa-card-fill" data-index="${idx}">Auto-Fill</button>
          </div>
        </div>
      `;
    });

    document.getElementById('qa-scroll').innerHTML = html;

    // Guarded interval check for active question (scans Quill container, NOT document.body)
    function checkActiveQuestion() {
      const container = document.querySelector('.play-lesson, #play-lesson-app, .connect-container, main') || document.body;
      const text = container.innerText || '';
      let foundIdx = null;

      for (let i = 0; i < lessonQuestions.length; i++) {
        const q = lessonQuestions[i];
        if (q.promptText && q.promptText.length > 12 && text.includes(q.promptText.slice(0, 24))) {
          foundIdx = i;
          break;
        }
      }

      if (foundIdx === currentActiveIndex) return;

      if (currentActiveIndex !== null) {
        const prevCard = document.getElementById(`qa-card-${currentActiveIndex}`);
        if (prevCard) prevCard.classList.remove('active-q');
      }

      currentActiveIndex = foundIdx;

      if (foundIdx !== null) {
        const newCard = document.getElementById(`qa-card-${foundIdx}`);
        if (newCard) newCard.classList.add('active-q');
        const fillBtn = document.getElementById('qa-fill-current');
        if (fillBtn) fillBtn.textContent = `Auto-Fill Q${lessonQuestions[foundIdx].index}`;
      } else {
        const fillBtn = document.getElementById('qa-fill-current');
        if (fillBtn) fillBtn.textContent = 'Auto-Fill Active Question';
      }
    }

    checkActiveQuestion();
    if (window._qaDetectInterval) clearInterval(window._qaDetectInterval);
    window._qaDetectInterval = setInterval(checkActiveQuestion, 800);

  } catch (err) {
    document.getElementById('qa-scroll').innerHTML = `<div style="color: #c0392b; padding: 12px;">Failed to load: ${err.message}</div>`;
  }

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
      e.preventDefault();
      hud.style.display = hud.style.display === 'none' ? 'flex' : 'none';
    }
    if (e.altKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      const targetQ = (currentActiveIndex !== null && lessonQuestions[currentActiveIndex])
        ? lessonQuestions[currentActiveIndex]
        : lessonQuestions[0];
      if (targetQ && targetQ.bestAnswer) autoFillQuill(targetQ.bestAnswer);
    }
  });

})();
