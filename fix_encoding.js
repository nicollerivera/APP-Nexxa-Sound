const { execSync } = require('child_process');
const fs = require('fs');

// Get clean App.jsx from git as a Buffer (raw bytes)
const appJsx = execSync('git show 958b87c:src/App.jsx');
fs.writeFileSync('src/App.jsx', appJsx);
console.log('OK -', appJsx.length, 'bytes written to src/App.jsx');

// Get clean App.css from git
const appCss = execSync('git show 958b87c:src/App.css');
fs.writeFileSync('src/App.css', appCss);
console.log('OK -', appCss.length, 'bytes written to src/App.css');
