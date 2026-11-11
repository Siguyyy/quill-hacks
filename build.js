const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src', 'quill-assistant.js');
const code = fs.readFileSync(srcPath, 'utf8');

// Keep the packager dependency-free so it can run in GitHub Actions or locally.
const lines = code
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0)
  .filter(line => !line.startsWith('//') && !line.startsWith('*') && !line.startsWith('/*'));

const minified = lines.join(' ').replace(/\s{2,}/g, ' ');
const distDir = path.join(__dirname, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const standaloneBookmarklet = 'javascript:' + encodeURI(minified);
const loaderBookmarklet = 'javascript:fetch("https://cdn.jsdelivr.net/gh/Siguyyy/quill-hacks@main/dist/quill-assistant.min.js").then(r=>r.text()).then(eval);';

fs.writeFileSync(path.join(distDir, 'quill-assistant.min.js'), minified, 'utf8');
fs.writeFileSync(path.join(distDir, 'bookmarklet-standalone.txt'), standaloneBookmarklet, 'utf8');
fs.writeFileSync(path.join(__dirname, 'quill-assistant-bookmarklet.txt'), standaloneBookmarklet, 'utf8');
fs.writeFileSync(path.join(distDir, 'bookmarklet-loader.txt'), loaderBookmarklet, 'utf8');

const userScriptHeader = `// ==UserScript==
// @name         Quill Hacks
// @namespace    https://github.com/Siguyyy/quill-hacks
// @version      2.2.0
// @description  Lightweight assistant for Quill.org lessons with verified optimal answers, 1-click React auto-fill, and clipboard unblocker.
// @author       Siguyyy & Contributors
// @match        https://www.quill.org/*
// @icon         https://www.quill.org/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==`;

fs.writeFileSync(path.join(distDir, 'quill-assistant.user.js'), userScriptHeader + '\n\n' + code, 'utf8');

console.log('Built dist/quill-assistant.min.js, dist/quill-assistant.user.js, dist/bookmarklet-standalone.txt, dist/bookmarklet-loader.txt, and quill-assistant-bookmarklet.txt');
