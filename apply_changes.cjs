const fs = require('fs');

let css = fs.readFileSync('src/App.css', 'utf8');

// 1. Bring CTA button closer to value props: reduce gap in .landing-content
css = css.replace(
    '.landing-content {\n  width: 100%;\n  max-width: 600px;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 25px;\n}',
    '.landing-content {\n  width: 100%;\n  max-width: 600px;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 10px;\n}'
);

// 2. Reduce carousel margin to also close vertical space
css = css.replace(
    '.carousel-3d-scene {\n  width: 500px;\n  height: 300px;\n  perspective: 1500px;\n  margin: 40px auto;\n  position: relative;\n}',
    '.carousel-3d-scene {\n  width: 500px;\n  height: 300px;\n  perspective: 1500px;\n  margin: 10px auto;\n  position: relative;\n}'
);

// 3. Reduce brand-logo (navbar) height so it looks like a back button, not a huge image
css = css.replace(
    '.brand-logo {\n  height: 200px;',
    '.brand-logo {\n  height: 52px;'
);

fs.writeFileSync('src/App.css', css, 'utf8');
console.log('Done - CSS updated.');
