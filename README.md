# Quill Hacks

A lightweight, non-destructive browser utility and bookmarklet for Quill.org lessons. Unblocks clipboard restrictions (paste, copy, drag-and-drop) and retrieves optimal answers directly from Quill's CMS.\n\n**Live installer page:** [siguyyy.github.io/quill-hacks](https://siguyyy.github.io/quill-hacks/)

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

### Method 1: Hosted Standalone Bookmarklet (Recommended)

The easiest and most reliable method is to use the live installer page:

**[Open the Quill Hacks installer](https://siguyyy.github.io/quill-hacks/)**

1. Open the installer page.
2. Drag the **Quill Assistant** button to your browser's bookmarks bar.
3. Or click **Copy Bookmarklet Code**, create a new bookmark, and paste the full code into the bookmark's URL field.
4. Open an active Quill lesson.
5. Click the **Quill Assistant** bookmark.

This is the recommended method because the full bookmarklet is embedded locally in the bookmark. It does not need to download JavaScript from jsDelivr, so it works with Quill's current Content Security Policy (CSP). The assistant still makes the Quill API requests it needs after it starts.

You can also copy the standalone code directly from dist/bookmarklet-standalone.txt. Copy the entire line beginning with javascript:.

---

### Method 2: CDN Loader (Advanced; requires disabling CSP)

The CDN loader downloads the latest minified build from jsDelivr:

~~~javascript
javascript:fetch("https://cdn.jsdelivr.net/gh/Siguyyy/quill-hacks@main/dist/quill-assistant.min.js").then(r=>r.text()).then(eval);
~~~

On current Quill lesson pages, Quill's Content Security Policy blocks the loader's request to jsDelivr. **For the current Quill CSP, this loader will only work if you temporarily disable CSP for Quill in your browser.** If you do not disable CSP, use the standalone bookmarklet above.

The [edpuzzle-answers project](https://github.com/ading2210/edpuzzle-answers) documents this same workaround. Its README links to these third-party extensions:

- Chromium browsers (Chrome, Edge, Opera, Brave): [Disable Content-Security-Policy](https://chromewebstore.google.com/detail/disable-content-security/ieelmcmcagommplceebfedjlakkhpden)
- Firefox: [Disable CSP for a minute](https://addons.mozilla.org/en-US/firefox/addon/disable-csp-for-a-minute/)

Use a browser extension only if you trust it, review its permissions, enable it only while needed, and disable or remove it afterward. Disabling CSP weakens the browser's protection against untrusted scripts.

After CSP is temporarily disabled:

1. Add the loader code above as a bookmark.
2. Open an active Quill lesson.
3. Click the loader bookmark.
4. Re-enable or disable the CSP extension when finished.

This loader is useful when you want the bookmark to fetch the newest main build automatically, but it is not the normal installation path for Quill.

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
├── build.js                     # Dependency-free artifact builder
├── .github/workflows/pages.yml  # GitHub Pages deployment\n├── .nojekyll                     # Keep Pages as a static site\n├── dist/
│   ├── quill-assistant.min.js   # Production minified bundle for CDN loader
│   ├── quill-assistant.user.js  # Tampermonkey userscript
│   ├── bookmarklet-loader.txt   # Convenient 1-line loader bookmarklet
│   └── bookmarklet-standalone.txt # 100% offline standalone bookmarklet
└── src/
    ├── quill-assistant.js       # Unminified, documented source code
    └── unlocker.js              # Standalone paste unlocker source
```

---

## Development

The repository publishes the static installer page at [siguyyy.github.io/quill-hacks](https://siguyyy.github.io/quill-hacks/) through GitHub Pages. The Pages workflow runs on every push to `main`.

To rebuild the tracked artifacts locally:

```bash
npm run build
```

The build has no third-party dependencies. It regenerates the minified loader, standalone bookmarklet, root bookmarklet copy, and Tampermonkey userscript from `src/quill-assistant.js`.

## Credits & Acknowledgements

- **[MysticalMike60t](https://github.com/MysticalMike60t)**: Sincere thanks to MysticalMike60t for creating the original [quill-cheat](https://github.com/MysticalMike60t/quill-cheat) proof-of-concept. His early discovery of Quill's API endpoints inspired this project.
- **[ading2210](https://github.com/ading2210)**: Architectural and bookmarklet distribution inspiration drawn from [edpuzzle-answers](https://github.com/ading2210/edpuzzle-answers).

---

## License

This project is licensed under the [MIT License](LICENSE).

*Disclaimer: This repository is intended for educational, accessibility, and reverse-engineering research purposes. Users are expected to comply with their institution's academic guidelines.*
