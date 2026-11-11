/**
 * Quill Master Assistant (Minimalist Anti-Slop Edition)
 * 
 * Clean, lightweight, non-destructive assistant for Quill.org lessons.
 * Off-white minimal aesthetic, CSP-immune event delegation, bulletproof React auto-fill.
 */

(async function () {
  'use strict';

  const HUD_ID = 'quill-assistant-hud';
  const existing = document.getElementById(HUD_ID);
  if (existing) {
    existing.style.display = existing.style.display === 'none' ? 'block' : 'none';
    return;
  }

  // 1. Bypass capture-phase paste restrictions
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
      try { window[h] = null; document[h] = null; } catch (e) {}
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

  // 2. Extract lesson ID
  const match = window.location.href.match(/\/lesson\/([a-zA-Z0-9\-]+)/i);
  const lessonId = match ? match[1] : null;
  if (!lessonId) {
    alert('Quill Assistant: Please open an active lesson (/connect/#/play/lesson/...).');
    return;
  }

  // 3. React Fiber auto-fill bypass
  function autoFillQuill(text) {
    if (!text || text === 'No answer found in database') return false;

    // Multiple choice option check
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

    // Locate active or visible textarea
    const candidates = [
      'textarea.connect-text-area',
      '.connect-text-area textarea',
      'textarea[placeholder*="sentence" i]',
      'textarea[placeholder*="combine" i]',
      'textarea[placeholder*="type" i]',
      'textarea',
      'input[type="text"].connect-input',
      'input[type="text"]',
      '[contenteditable="true"]'
    ];

    let target = null;
    if (document.activeElement && (
      document.activeElement.tagName === 'TEXTAREA' ||
      (document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'text') ||
      document.activeElement.isContentEditable
    )) {
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

  // 4. Reliable dual-layer copy
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

  // 5. Minimalist Off-White UI (Anti-Slop)
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
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
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
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.12s, border-color 0.12s;
        user-select: none;
      }
      .qa-btn:hover { background: #f0f0eb; border-color: #c0c0ba; }
      .qa-btn:active { background: #e5e5df; }
      .qa-btn-dark {
        background: #1a1a18;
        color: #ffffff;
        border: 1px solid #1a1a18;
      }
      .qa-btn-dark:hover { background: #333330; border-color: #333330; }
      .qa-card {
        background: #ffffff;
        border: 1px solid #e8e8e3;
        border-radius: 8px;
        padding: 12px;
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
        border-radius: 6px;
        padding: 8px 10px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        color: #111110;
        word-break: break-word;
      }
      .qa-search {
        width: 100%;
        background: #ffffff;
        border: 1px solid #d8d8d2;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 12px;
        color: #1a1a18;
        outline: none;
      }
      .qa-search:focus { border-color: #1a1a18; }
      #qa-scroll::-webkit-scrollbar { width: 5px; }
      #qa-scroll::-webkit-scrollbar-track { background: transparent; }
      #qa-scroll::-webkit-scrollbar-thumb { background: #d0d0c8; border-radius: 4px; }
    </style>

    <!-- Header -->
    <div id="qa-drag" style="padding: 12px 14px; background: #fafaf8; border-bottom: 1px solid #e8e8e3; display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: 600; font-size: 13px;">Quill Assistant</span>
        <span id="qa-count" style="font-size: 11px; background: #eaeae5; color: #555550; padding: 2px 6px; border-radius: 4px;">Loading...</span>
      </div>
      <div style="display: flex; gap: 4px;">
        <button id="qa-min" class="qa-btn" style="padding: 2px 7px; font-size: 11px;" title="Minimize">—</button>
        <button id="qa-close" class="qa-btn" style="padding: 2px 7px; font-size: 11px;" title="Close">✕</button>
      </div>
    </div>

    <!-- Quick action & search -->
    <div id="qa-body" style="display: flex; flex-direction: column; overflow: hidden;">
      <div style="padding: 10px 14px; border-bottom: 1px solid #eeeeea; display: flex; flex-direction: column; gap: 8px;">
        <button id="qa-fill-current" class="qa-btn qa-btn-dark" style="width: 100%; padding: 7px 12px; font-weight: 500;">
          Auto-Fill Active Question
        </button>
        <input type="text" id="qa-filter" class="qa-search" placeholder="Search questions..." />
      </div>

      <!-- Question List -->
      <div id="qa-scroll" style="padding: 12px 14px; overflow-y: auto; max-height: calc(85vh - 125px); display: flex; flex-direction: column; gap: 10px;">
        <div id="qa-loading" style="text-align: center; padding: 24px 0; color: #777770;">
          Fetching lesson answers...
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 6px 14px; border-top: 1px solid #eeeeea; display: flex; justify-content: space-between; font-size: 11px; color: #888880; background: #fafaf8;">
        <span>Clipboard Unlocked 🔓</span>
        <span>Alt+Q: Toggle • Alt+F: Fill</span>
      </div>
    </div>
  `;

  document.body.appendChild(hud);

  // Dragging
  const dragBar = document.getElementById('qa-drag');
  let isDragging = false, startX, startY, origX, origY;
  dragBar.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    isDragging = true;
    startX = e.clientX; startY = e.clientY;
    const rect = hud.getBoundingClientRect();
    origX = rect.left; origY = rect.top;
    hud.style.right = 'auto'; hud.style.left = `${origX}px`; hud.style.top = `${origY}px`;
  });
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    hud.style.left = `${origX + (e.clientX - startX)}px`;
    hud.style.top = `${Math.max(10, origY + (e.clientY - startY))}px`;
  });
  window.addEventListener('mouseup', () => { isDragging = false; });

  // Window Controls
  const bodyEl = document.getElementById('qa-body');
  const minBtn = document.getElementById('qa-min');
  let isMin = false;
  minBtn.onclick = () => {
    isMin = !isMin;
    bodyEl.style.display = isMin ? 'none' : 'flex';
    minBtn.textContent = isMin ? '□' : '—';
  };
  document.getElementById('qa-close').onclick = () => hud.remove();

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

  // Filter input
  const filterInput = document.getElementById('qa-filter');
  filterInput.addEventListener('input', (e) => {
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
    const lessonRes = await fetch(`https://www.quill.org/api/v1/lessons/${lessonId}.json`);
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
          const qRes = await fetch(`https://www.quill.org/api/v1/questions/${key}.json`);
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

    // Active question detection
    function detectActive() {
      const text = document.body.innerText;
      let activeIdx = null;
      lessonQuestions.forEach((q, idx) => {
        const card = document.getElementById(`qa-card-${idx}`);
        if (!card) return;
        const isActive = q.promptText && q.promptText.length > 15 && text.includes(q.promptText.slice(0, 32));
        if (isActive && activeIdx === null) {
          activeIdx = idx;
          card.classList.add('active-q');
        } else {
          card.classList.remove('active-q');
        }
      });
      currentActiveIndex = activeIdx;
      const fillBtn = document.getElementById('qa-fill-current');
      if (fillBtn) {
        fillBtn.textContent = activeIdx !== null
          ? `Auto-Fill Q${lessonQuestions[activeIdx].index}`
          : 'Auto-Fill Active Question';
      }
    }

    detectActive();
    new MutationObserver(detectActive).observe(document.body, { childList: true, subtree: true });

  } catch (err) {
    document.getElementById('qa-scroll').innerHTML = `<div style="color: #c0392b; padding: 12px;">Failed to load lesson: ${err.message}</div>`;
  }

  // Keyboard shortcuts
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
