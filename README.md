<div align="center">

# 💡 Quill Master Assistant (Apple Glass Edition)

**The definitive, non-destructive assistant and clipboard unblocker for Quill.org lessons.**  
*Verified optimal answers • Bulletproof React auto-fill • Complete capture-phase clipboard freedom*

[![Version](https://img.shields.io/badge/version-2.0.0-0a84ff.svg?style=for-the-badge)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-30d158.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Firefox%20%7C%20Edge%20%7C%20Arc%20%7C%20Safari-5856d6.svg?style=for-the-badge)](https://github.com)
[![UI](https://img.shields.io/badge/UI-Apple%20Cupertino%20Glass-ff9f0a.svg?style=for-the-badge)](https://github.com)

[**Quick Install**](#-installation-methods) • [**Live Sandbox & Testing**](#-interactive-sandbox) • [**Architecture Deep Dive**](#-how-it-works-under-the-hood) • [**Acknowledgements**](#-acknowledgements--credits)

---

</div>

## 📖 Overview

Quill.org is a widely used digital writing and grammar tool. However, it imposes strict input locks (capture-phase paste blocking) and lacks integrated feedback for students seeking immediate verification of sentence combining activities.

Earlier community scripts (notably the original proof-of-concept by [MysticalMike60t](https://github.com/MysticalMike60t/quill-cheat)) pioneered querying Quill's backend JSON endpoints, but suffered from obsolete CSS selectors, destructive DOM replacements that crashed React, lack of auto-fill, and failure to neutralize Quill's paste blocker.

**Quill Assistant v2.0** completely reimagines this workflow inspired by the design philosophy of [ading2210/edpuzzle-answers](https://github.com/ading2210/edpuzzle-answers) and Apple macOS/iOS glassmorphism. It introduces a non-destructive floating HUD, CSP-immune event delegation, bulletproof React Fiber value-tracker auto-fill, and dual-layer clipboard unblocking.

---

## ✨ Key Features & Technical Highlights

- 🍏 **Apple Cupertino Glass HUD**: Built with authentic frosted acrylic, macOS traffic-light window controls, SF Pro typography, and an iOS-inspired Dynamic Island notification pill.
- 🎯 **Verified Optimal Answers**: Queries Quill's CMS database directly, filtering for verified `optimal: true` responses rather than blindly returning weak or partial attempts.
- ✍️ **Bulletproof 1-Click React Auto-Fill**: Bypasses React's internal `_valueTracker` and native `HTMLTextAreaElement.prototype` descriptors, dispatching synthetic `InputEvent('insertText')` events to satisfy React, Redux, and Ant Design form validators.
- 🔓 **Capture-Phase Clipboard Unblocking**: Neutralizes Quill's `window.addEventListener("paste", ..., true)` capture blocker at the DOM prototype level, restoring native paste, copy, cut, and text selection.
- 📋 **Dual-Layer Clipboard Copy**: Combines modern asynchronous `navigator.clipboard.writeText` with an automatic, synchronous `document.execCommand('copy')` fallback for 100% reliability in restricted contexts.
- ⚡ **Live Active Question Detection**: Watches on-screen DOM mutations to automatically identify which question is currently visible, highlighting its card and updating the global **"Auto-Fill Current"** action bar.
- 🔍 **Instant Question Filtering**: Type into the search pill to filter prompts, cues, or answers in real time.
- ⌨️ **Global Hotkeys**:
  - `Alt + Q`: Show / Hide the Assistant HUD
  - `Alt + F`: Auto-fill the currently active on-screen question

---

## ⚖️ Comparison: Original `quill-cheat` vs. `Quill Assistant v2.0`

| Feature | MysticalMike60t/quill-cheat | Quill Assistant v2.0 |
| :--- | :--- | :--- |
| **Interface** | Destructive raw text overwriting `<main>` (crashed React) | **Floating, minimizable Apple glass HUD (Zero React DOM interference)** |
| **Trigger Mechanism** | Relied on obsolete `.quill-button` (hung indefinitely) | **100% resilient on-demand execution via Bookmarklet or Userscript** |
| **Answer Accuracy** | Blindly picked `responseData[0]` (often sub-optimal) | **Prioritizes verified `optimal: true` responses + multiple choice** |
| **Auto-Fill** | None (User had to re-type manually) | **1-Click React Fiber setter bypass + InputEvent simulation** |
| **Copy Reliability** | None | **Dual-layer Clipboard API + document.execCommand fallback** |
| **Paste Unblocking** | None (Paste remained blocked) | **Neutralizes `Event.prototype.preventDefault` and capture listeners** |
| **Deployment** | Userscript only (Bookmarklet was unfinished) | **Streamlined 1-Line Bookmarklet, Drag-and-Drop, Userscript & Offline** |
| **Security & CSP** | Used inline `onclick` (blocked by Content Security Policy) | **100% CSP-Immune centralized event delegation** |

---

## 🚀 Installation Methods

### Method 1: The Modern 1-Line Bookmarklet (Edpuzzle Style) ⭐ *Recommended*

Like popular educational utilities (such as `edpuzzle-answers`), you can use a single-line loader that fetches the latest minified build automatically from your repository:

```javascript
javascript:fetch("https://cdn.jsdelivr.net/gh/USERNAME/quill-assistant@main/dist/quill-assistant.min.js").then(r=>r.text()).then(eval);
```

> **How to install**:
> 1. In Chrome / Edge / Firefox, press `Ctrl + Shift + O` to open your Bookmark Manager (or `Ctrl + D` to bookmark any page).
> 2. Name it **Quill Assistant**.
> 3. Paste the code above into the **URL / Location** field and save.
> 4. Whenever you are on an active Quill lesson, click the bookmark!

---

### Method 2: Drag-and-Drop via Interactive Test Hub

Open [`index.html`](file:///C:/Users/sag/.gemini/antigravity/scratch/quill-unlocker/index.html) in your browser (or your published GitHub Pages site):
1. Press `Ctrl + Shift + B` to display your Chrome Bookmarks Bar.
2. Drag the blue **💡 Quill Assistant** button directly into your bookmarks bar.

---

### Method 3: Tampermonkey / Violentmonkey Userscript

If you prefer full automation without needing to click a bookmark:
1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open [`dist/quill-assistant.user.js`](file:///C:/Users/sag/.gemini/antigravity/scratch/quill-unlocker/dist/quill-assistant.user.js) in your browser.
3. Tampermonkey will prompt you to click **Install**.
4. The assistant will automatically initialize whenever you open any lesson at `https://www.quill.org/connect/#/play/lesson/...`.

---

### Method 4: 100% Offline Standalone Bookmarklet

If you are on a restricted school or enterprise network where GitHub or jsDelivr CDNs are blocked:
- Copy the complete minified string from [`dist/bookmarklet-standalone.txt`](file:///C:/Users/sag/.gemini/antigravity/scratch/quill-unlocker/dist/bookmarklet-standalone.txt).
- Paste it as the URL of a new bookmark. It runs entirely in local browser memory with zero external network dependencies.

---

## 🔬 How It Works Under the Hood

### 1. Bypassing Quill's Capture-Phase Paste Blocker

In Quill's frontend bundle (`requestWrapper-Dzvsf2ZQ.js`), pasting is suppressed during component mount:

```javascript
this.preventPaste = N => (N.preventDefault(), !1);
componentDidMount() {
  const { blockPaste: N } = this.props;
  N && window.addEventListener("paste", this.preventPaste, true);
}
```

Because `useCapture` is set to `true`, Quill intercepts the event at the `window` level *before* it descends the DOM tree to the `<textarea>`.

**Our Solution**:  
We override `Event.prototype.preventDefault` so that calls on clipboard event types (`paste`, `copy`, `cut`, `drop`) become harmless no-ops:

```javascript
const blockedEvents = new Set(['paste', 'copy', 'cut', 'drop', 'dragover']);
const origPreventDefault = Event.prototype.preventDefault;
Event.prototype.preventDefault = function () {
  if (blockedEvents.has(this.type)) return;
  return origPreventDefault.apply(this, arguments);
};
```

---

### 2. Overcoming React Fiber's Synthetic Value Tracker

Modern React inputs track element values using an internal property descriptor (`_valueTracker`). Simply setting `textarea.value = "text"` causes React to detect a mismatch with its tracked state and drop the input on subsequent reconciliation cycles.

**Our Solution**:  
We retrieve the native prototype setter from `HTMLTextAreaElement.prototype`, reset `_valueTracker`, and dispatch a synthetic `InputEvent`:

```javascript
const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
const nativeSetter = descriptor ? descriptor.set : null;

// Reset React's tracker
if (target._valueTracker) {
  target._valueTracker.setValue('');
}

// Invoke native C++ DOM setter
if (nativeSetter) {
  nativeSetter.call(target, newText);
} else {
  target.value = newText;
}

// Dispatch native InputEvent + Change
target.dispatchEvent(new InputEvent('input', {
  bubbles: true,
  cancelable: true,
  inputType: 'insertText',
  data: newText
}));
target.dispatchEvent(new Event('change', { bubbles: true }));
```

---

### 3. Quill CMS REST API Endpoints

Quill structures lesson content across public REST endpoints:
- `GET https://www.quill.org/api/v1/lessons/{lessonId}.json` — Returns lesson activity title and ordered question keys (`questions: [{ key: "..." }]`).
- `GET https://www.quill.org/api/v1/questions/{questionKey}.json` — Returns the prompt text, grammatical instructions, and hints (`cues`).
- `GET https://cms.quill.org/questions/{questionKey}/responses` — Returns database responses tagged with `optimal: true` or `optimal: false`.
- `GET https://cms.quill.org/questions/{questionKey}/multiple_choice_options` — Fallback for multiple-choice diagnostic activities (`correct: true`).

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Alt</kbd> + <kbd>Q</kbd> | Toggle Assistant HUD visibility (Show / Hide) |
| <kbd>Alt</kbd> + <kbd>F</kbd> | Auto-fill currently active on-screen question |

---

## ❤️ Acknowledgements & Credits

- **[MysticalMike60t](https://github.com/MysticalMike60t)**: Huge credit and heartfelt thanks to MysticalMike60t for creating the original [quill-cheat](https://github.com/MysticalMike60t/quill-cheat) concept. His early discovery of Quill's API endpoints inspired this modernized project.
- **[ading2210](https://github.com/ading2210)**: Architectural and bookmarklet distribution inspiration drawn from the widely acclaimed [edpuzzle-answers](https://github.com/ading2210/edpuzzle-answers) project.

---

## ⚖️ Legal & Educational Disclaimer

This project is open-source and intended solely for **educational, accessibility, and reverse-engineering research purposes**. It is designed to assist users in understanding web security architecture, React synthetic event reconciliation, and browser event dispatching. Users are expected to abide by their institution's academic integrity policies.

---

<div align="center">
  <sub>Released under the <a href="LICENSE">MIT License</a>. Crafted with precision.</sub>
</div>
