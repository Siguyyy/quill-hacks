# Quill Hacks

A lightweight, non-destructive browser utility and bookmarklet for Quill.org lessons. Unblocks clipboard restrictions (paste, copy, drag-and-drop) and retrieves optimal answers directly from Quill's CMS.

Inspired by [ading2210/edpuzzle-answers](https://github.com/ading2210/edpuzzle-answers) and [MysticalMike60t/quill-cheat](https://github.com/MysticalMike60t/quill-cheat).

---

## Features

- 🔓 **Unblocks Paste & Copy**: Neutralizes Quill's capture-phase paste restrictions cleanly at the DOM level without breaking React's input reconciliation.
- 🎯 **Verified Optimal Answers**: Queries Quill's CMS directly, prioritizing verified `optimal: true` responses and multiple-choice options.
- ✍️ **1-Click Auto-Fill**: Bypasses React's internal `_valueTracker` and prototype value setter, dispatching synthetic `InputEvent`, `change`, and keyboard triggers so Quill's Submit button immediately enables.
- 📋 **Resilient Copy**: Dual-layer clipboard copier combining modern `navigator.clipboard` with an automatic synchronous fallback.
- 🔍 **Live Search & Filter**: Filter questions and prompts on the fly.
- ⚡ **Minimalist Design**: Clean, quiet off-white interface (no AI slop, no heavy glassmorphism, no layout freezes).
- ⌨️ **Keyboard Shortcuts**:
  - `Alt + Q`: Show / Hide the overlay HUD
  - `Alt + F`: Auto-fill currently active on-screen question

---

## Installation & Usage

### Method 1: The 1-Line Bookmarklet (Recommended)

Like `edpuzzle-answers`, this one-line loader automatically runs the latest build directly from jsDelivr:

```javascript
javascript:fetch("https://cdn.jsdelivr.net/gh/Siguyyy/quill-hacks@main/dist/quill-assistant.min.js").then(r=>r.text()).then(eval);
```

#### How to Add:
1. In your browser (Chrome, Edge, Firefox, Arc, Brave), press `Ctrl + Shift + O` to open your Bookmark Manager (or press `Ctrl + D` to bookmark this page).
2. Click **Add new bookmark** (or edit the existing one).
3. Set the **Name** to: `Quill Hacks`
4. In the **URL** field, paste the one-line code above.
5. Save.

#### How to Use:
1. Navigate to any active Quill lesson (e.g. `https://www.quill.org/connect/#/play/lesson/...`).
2. Click the **Quill Hacks** bookmark from your bookmarks bar.
3. The clean companion HUD will open with the question list and optimal answers.
4. Click **Auto-Fill** on any card (or click **Auto-Fill Active Question** at the top).

---

### Method 2: Offline Standalone Bookmarklet

If you are on a restricted school or enterprise network where GitHub or jsDelivr is blocked, use the self-contained bookmarklet:

1. Open [`dist/bookmarklet-standalone.txt`](dist/bookmarklet-standalone.txt).
2. Copy the entire line starting with `javascript:...`.
3. Create a bookmark and paste it into the URL field.
4. Runs 100% locally in browser memory with zero external requests.

---

### Method 3: Tampermonkey Userscript

If you prefer the companion to load automatically on every lesson:

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open [`dist/quill-assistant.user.js`](dist/quill-assistant.user.js) in your browser.
3. Tampermonkey will prompt you to install.
4. The assistant will auto-initialize whenever you open a lesson URL (`https://www.quill.org/*`).

---

## How It Works

### 1. Neutralizing Capture-Phase Paste Restrictions
Quill blocks paste by attaching a capture-phase listener to `window`:
```javascript
window.addEventListener("paste", this.preventPaste, true);
```
Because `useCapture` is `true`, it intercepts the paste event before it ever reaches the answer `<textarea>`.

This script overrides `Event.prototype.preventDefault` strictly for `paste` and `drop` events. When Quill calls `e.preventDefault()`, it becomes a no-op, allowing the browser's native paste action to proceed into the input.

### 2. React Value Tracker Bypass
React form elements track changes via an internal `_valueTracker`. Assigning `textarea.value = ...` directly is ignored by React's reconciliation engine.

This script resets `_valueTracker`, invokes the native C++ prototype setter (`HTMLTextAreaElement.prototype.value`), calls React Fiber's internal `onChange`/`onInput` props directly, and dispatches native `InputEvent('insertText')` events to satisfy form validators.

### 3. Quill CMS REST Endpoints
- `GET https://www.quill.org/api/v1/lessons/{lessonId}.json` — Retrieves lesson activity metadata and question keys.
- `GET https://www.quill.org/api/v1/questions/{key}.json` — Retrieves prompt text, instructions, and hints (`cues`).
- `GET https://cms.quill.org/questions/{key}/responses` — Retrieves database responses tagged with `optimal: true`.
- `GET https://cms.quill.org/questions/{key}/multiple_choice_options` — Fallback for multiple-choice questions.

---

## Repository Structure

```
quill-hacks/
├── .gitignore
├── LICENSE
├── README.md
├── index.html                   # Minimalist local testing & installer page
├── build.js                     # Minifier and bookmarklet packager
├── dist/
│   ├── quill-assistant.min.js   # Production minified bundle for CDN loader
│   ├── quill-assistant.user.js  # Tampermonkey userscript
│   ├── bookmarklet-loader.txt   # Convenient 1-line loader bookmarklet
│   └── bookmarklet-standalone.txt # 100% offline standalone bookmarklet
└── src/
    ├── quill-assistant.js       # Unminified, documented source code
    └── unlocker.js              # Standalone paste unlocker source
```

---

## Credits & Acknowledgements

- **[MysticalMike60t](https://github.com/MysticalMike60t)**: Sincere thanks to MysticalMike60t for creating the original [quill-cheat](https://github.com/MysticalMike60t/quill-cheat) proof-of-concept. His early discovery of Quill's API endpoints inspired this project.
- **[ading2210](https://github.com/ading2210)**: Architectural and bookmarklet distribution inspiration drawn from [edpuzzle-answers](https://github.com/ading2210/edpuzzle-answers).

---

## License

This project is licensed under the [MIT License](LICENSE).

*Disclaimer: This repository is intended for educational, accessibility, and reverse-engineering research purposes. Users are expected to comply with their institution's academic guidelines.*
