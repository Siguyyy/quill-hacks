const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src', 'quill-assistant.js');
let code = fs.readFileSync(srcPath, 'utf8');

// Basic safe JS minification
// 1. Remove leading/trailing whitespace per line
let lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);

// 2. Remove comments that are on their own lines
lines = lines.filter(l => !l.startsWith('//') && !l.startsWith('*') && !l.startsWith('/*'));

let minified = lines.join(' ');
// Replace multiple spaces with single space
minified = minified.replace(/\s{2,}/g, ' ');

// Ensure dist dir exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. Write dist/quill-assistant.min.js
fs.writeFileSync(path.join(distDir, 'quill-assistant.min.js'), minified, 'utf8');
console.log('✓ Created dist/quill-assistant.min.js (' + minified.length + ' bytes)');

// 2. Write Standalone Bookmarklet
const standaloneBookmarklet = 'javascript:' + encodeURI(minified);
fs.writeFileSync(path.join(distDir, 'bookmarklet-standalone.txt'), standaloneBookmarklet, 'utf8');
fs.writeFileSync(path.join(__dirname, 'quill-assistant-bookmarklet.txt'), standaloneBookmarklet, 'utf8');
console.log('✓ Created dist/bookmarklet-standalone.txt & root bookmarklet');

// 3. Write Convenient Edpuzzle-style Loader Bookmarklet
const loaderBookmarklet = `javascript:fetch("https://cdn.jsdelivr.net/gh/USERNAME/quill-assistant@main/dist/quill-assistant.min.js").then(r=>r.text()).then(eval);`;
fs.writeFileSync(path.join(distDir, 'bookmarklet-loader.txt'), loaderBookmarklet, 'utf8');
console.log('✓ Created dist/bookmarklet-loader.txt');
