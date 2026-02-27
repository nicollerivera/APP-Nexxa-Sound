const { execSync } = require('child_process');
const fs = require('fs');

const appJsx = execSync('git show 958b87c:src/App.jsx');
fs.writeFileSync('src/App.jsx', appJsx);
console.log('OK -', appJsx.length, 'bytes -> src/App.jsx');

const appCss = execSync('git show 958b87c:src/App.css');
fs.writeFileSync('src/App.css', appCss);
console.log('OK -', appCss.length, 'bytes -> src/App.css');
