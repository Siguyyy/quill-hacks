// ==UserScript==
// @name         Quill Hacks
// @namespace    https://github.com/Siguyyy/quill-hacks
// @version      2.1.0
// @description  Lightweight assistant for Quill.org lessons with verified optimal answers, 1-click React auto-fill, and clipboard unblocker.
// @author       Siguyyy & Contributors
// @match        https://www.quill.org/*
// @icon         https://www.quill.org/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/**
 * Quill Hacks (Tampermonkey Userscript)
 * 
 * Special thanks to MysticalMike60t for the original proof-of-concept (quill-cheat).
 * Rebuilt with input isolation, React Fiber direct injection, and clean minimal aesthetic.
 */

(function () {
  'use strict';

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

  if (location.href.includes('/lesson/')) {
    setTimeout(initQuillAssistant, 1000);
  }

  function initQuillAssistant() {
    if (document.getElementById('quill-assistant-hud')) return;
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.textContent = `(${loadAssistant.toString()})();`;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  function loadAssistant() {
    const HUD_ID = 'quill-assistant-hud';
    if (document.getElementById(HUD_ID)) return;

    let lastFocusedInput = null;
    window.addEventListener('focusin', (e) => {
      if (e.target && (!e.target.closest || !e.target.closest('#' + HUD_ID))) {
        const tag = e.target.tagName ? e.target.tagName.toLowerCase() : '';
        if (tag === 'textarea' || tag === 'input' || e.target.isContentEditable) {
          lastFocusedInput = e.target;
        }
      }
    }, true);

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

    const match = window.location.href.match(/\/lesson\/([a-zA-Z0-9\-]+)/i);
    const lessonId = match ? match[1] : null;
    if (!lessonId) return;

    function findQuillInput() {
      if (lastFocusedInput && document.contains(lastFocusedInput) && (!lastFocusedInput.closest || !lastFocusedInput.closest('#' + HUD_ID))) {
        return lastFocusedInput;
      }
      const textareas = Array.from(document.querySelectorAll('textarea')).filter(el => !el.closest('#' + HUD_ID));
      for (const ta of textareas) {
        if (ta.offsetWidth > 0 || ta.offsetHeight > 0) return ta;
      }
      if (textareas.length > 0) return textareas[0];

      const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])')).filter(el => !el.closest('#' + HUD_ID));
      for (const inp of inputs) {
        if (inp.offsetWidth > 0 || inp.offsetHeight > 0) return inp;
      }
      return null;
    }

    function autoFillQuill(text) {
      if (!text || text === 'No answer found in database') return false;

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

      const target = findQuillInput();
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

      if (nativeSetter) nativeSetter.call(target, text); else target.value = text;

      try {
        const reactKey = Object.keys(target).find(k => k.startsWith('__reactProps$') || k.startsWith('__reactEventHandlers$'));
        if (reactKey && target[reactKey]) {
          const props = target[reactKey];
          if (typeof props.onChange === 'function') props.onChange({ target, currentTarget: target, nativeEvent: new Event('change') });
          if (typeof props.onInput === 'function') props.onInput({ target, currentTarget: target, nativeEvent: new Event('input') });
        }
      } catch (e) {}

      try {
        target.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
      } catch (e) {
        target.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      }
      target.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      try {
        target.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
        target.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true }));
      } catch (e) {}
      if (typeof target.setSelectionRange === 'function') target.setSelectionRange(text.length, text.length);
      return true;
    }

    async function copyToClipboard(text) {
      if (!text) return false;
      if (navigator.clipboard && window.isSecureContext) {
        try { await navigator.clipboard.writeText(text); return true; } catch (err) {}
      }
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch (err) { return false; }
    }

    const hud = document.createElement('div');
    hud.id = HUD_ID;
    hud.style.cssText = `position:fixed;top:20px;right:20px;width:380px;max-height:85vh;background:#fafaf8;color:#1a1a18;border:1px solid #e2e2de;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.08);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;z-index:2147483647;display:flex;flex-direction:column;overflow:hidden;line-height:1.45;`;

    hud.innerHTML = `
      <style>
        #${HUD_ID} * { box-sizing: border-box; margin: 0; padding: 0; }
        .qa-btn { background: #fff; color: #222; border: 1px solid #d5d5cf; border-radius: 5px; padding: 4px 10px; font-size: 12px; cursor: pointer; user-select: none; }
        .qa-btn:hover { background: #f0f0eb; border-color: #c0c0ba; }
        .qa-btn-dark { background: #1a1a18; color: #fff; border: 1px solid #1a1a18; }
        .qa-btn-dark:hover { background: #333; }
        .qa-card { background: #fff; border: 1px solid #e8e8e3; border-radius: 6px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
        .qa-card.active-q { border-color: #1a1a18; box-shadow: 0 0 0 1px #1a1a18; }
        .qa-answer { background: #f4f4f0; border: 1px solid #e2e2dc; border-radius: 5px; padding: 6px 8px; font-family: monospace; font-size: 12px; color: #111; word-break: break-word; }
        .qa-search { width: 100%; background: #fff; border: 1px solid #d8d8d2; border-radius: 5px; padding: 6px 10px; font-size: 12px; outline: none; }
        #qa-scroll::-webkit-scrollbar { width: 5px; }
        #qa-scroll::-webkit-scrollbar-thumb { background: #d0d0c8; border-radius: 4px; }
      </style>
      <div id="qa-drag" style="padding: 10px 14px; background: #fafaf8; border-bottom: 1px solid #e8e8e3; display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 600;">Quill Hacks</span>
          <span id="qa-count" style="font-size: 11px; background: #eaeae5; color: #555; padding: 2px 6px; border-radius: 4px;">Loading...</span>
        </div>
        <div style="display: flex; gap: 4px;">
          <button id="qa-min" class="qa-btn" style="padding: 2px 7px; font-size: 11px;">—</button>
          <button id="qa-close" class="qa-btn" style="padding: 2px 7px; font-size: 11px;">✕</button>
        </div>
      </div>
      <div id="qa-body" style="display: flex; flex-direction: column; overflow: hidden;">
        <div style="padding: 10px 14px; border-bottom: 1px solid #eee; display: flex; flex-direction: column; gap: 8px;">
          <button id="qa-fill-current" class="qa-btn qa-btn-dark" style="width: 100%; padding: 7px 12px;">Auto-Fill Active Question</button>
          <input type="text" id="qa-filter" class="qa-search" placeholder="Filter questions..." autocomplete="off" />
        </div>
        <div id="qa-scroll" style="padding: 12px 14px; overflow-y: auto; max-height: calc(85vh - 125px); display: flex; flex-direction: column; gap: 10px;">
          <div style="text-align: center; padding: 20px 0; color: #777;">Fetching answers...</div>
        </div>
        <div style="padding: 6px 14px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 11px; color: #888; background: #fafaf8;">
          <span>Clipboard Unlocked 🔓</span>
          <span>Alt+Q: Toggle • Alt+F: Fill</span>
        </div>
      </div>
    `;
    document.body.appendChild(hud);

    const dragBar = document.getElementById('qa-drag');
    dragBar.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      const startX = e.clientX, startY = e.clientY;
      const rect = hud.getBoundingClientRect();
      const origX = rect.left, origY = rect.top;
      hud.style.right = 'auto'; hud.style.left = `${origX}px`; hud.style.top = `${origY}px`;

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

    const bodyEl = document.getElementById('qa-body');
    const minBtn = document.getElementById('qa-min');
    let isMin = false;
    minBtn.onclick = () => {
      isMin = !isMin;
      bodyEl.style.display = isMin ? 'none' : 'flex';
      minBtn.textContent = isMin ? '□' : '—';
    };
    document.getElementById('qa-close').onclick = () => {
      if (window._qaDetectInterval) clearInterval(window._qaDetectInterval);
      hud.remove();
    };

    let lessonQuestions = [], currentActiveIndex = null;
    hud.onclick = async (e) => {
      const fillBtn = e.target.closest('.qa-card-fill');
      if (fillBtn) {
        const q = lessonQuestions[parseInt(fillBtn.dataset.index, 10)];
        if (q && q.bestAnswer && autoFillQuill(q.bestAnswer)) {
          fillBtn.textContent = 'Filled ✓';
          setTimeout(() => fillBtn.textContent = 'Auto-Fill', 1200);
        }
        return;
      }
      const copyBtn = e.target.closest('.qa-card-copy');
      if (copyBtn) {
        const q = lessonQuestions[parseInt(copyBtn.dataset.index, 10)];
        if (q && q.bestAnswer && await copyToClipboard(q.bestAnswer)) {
          copyBtn.textContent = 'Copied ✓';
          setTimeout(() => copyBtn.textContent = 'Copy', 1200);
        }
        return;
      }
      if (e.target.closest('#qa-fill-current')) {
        const targetQ = (currentActiveIndex !== null && lessonQuestions[currentActiveIndex]) ? lessonQuestions[currentActiveIndex] : lessonQuestions[0];
        if (targetQ && targetQ.bestAnswer) autoFillQuill(targetQ.bestAnswer);
      }
    };

    document.getElementById('qa-filter').oninput = (e) => {
      const term = e.target.value.toLowerCase().trim();
      lessonQuestions.forEach((q, idx) => {
        const card = document.getElementById(`qa-card-${idx}`);
        if (!card) return;
        card.style.display = (!term || q.bestAnswer.toLowerCase().includes(term) || (q.promptText && q.promptText.toLowerCase().includes(term))) ? 'flex' : 'none';
      });
    };

    try {
      const res = await fetch(`https://www.quill.org/api/v1/lessons/${lessonId}.json`);
      const data = await res.json();
      const raw = data.questions || [];
      document.getElementById('qa-count').textContent = `${raw.length} Questions`;

      lessonQuestions = await Promise.all(raw.map(async (item, idx) => {
        let promptText = '', cues = '', answers = [];
        try {
          const qRes = await fetch(`https://www.quill.org/api/v1/questions/${item.key}.json`);
          if (qRes.ok) {
            const qData = await qRes.json();
            promptText = (qData.prompt || '').replace(/<[^>]+>/g, ' ').trim();
            cues = qData.cues || '';
          }
        } catch (e) {}
        try {
          const cmsRes = await fetch(`https://cms.quill.org/questions/${item.key}/responses`);
          if (cmsRes.ok) {
            const cmsData = await cmsRes.json();
            if (Array.isArray(cmsData)) {
              const opt = cmsData.filter(r => r.optimal);
              answers = opt.length > 0 ? opt : cmsData.slice(0, 3);
            }
          }
        } catch (e) {}
        return {
          index: idx + 1,
          promptText, cues,
          bestAnswer: (answers[0] && answers[0].text) || 'No answer found in database',
          isOptimal: answers.some(a => a.optimal)
        };
      }));

      let html = '';
      lessonQuestions.forEach((q, idx) => {
        html += `
          <div class="qa-card" id="qa-card-${idx}">
            <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 12px;">
              <span>Q${q.index}</span>
              <span style="font-size: 11px; color: ${q.isOptimal ? '#27ae60' : '#888'};">${q.isOptimal ? 'Optimal Answer' : 'Standard'}</span>
            </div>
            <div style="font-size: 12px; color: #444;">${q.promptText || `Question ${q.index}`}</div>
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
      document.getElementById('qa-scroll').innerHTML = `<div style="color: #c0392b; padding: 12px;">Failed: ${err.message}</div>`;
    }

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
  }
})();
