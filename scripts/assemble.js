const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const bundle = fs.readFileSync(path.join(root, 'bundle.js'), 'utf8');

const htmlPath = path.join(root, 'CasinoOps.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Replace the inline <script>...</script> block (the one containing the bundle)
// Identify it as the <script> after the react CDN scripts — it's the last large <script> block
const updated = html.replace(
  /(<script>)([\s\S]*?)(<\/script>)(\s*<\/body>)/,
  `<script>\n${bundle}\n</script>\n</body>`
);

if (updated === html) {
  console.error('assemble.js: Could not find inline script block to replace');
  process.exit(1);
}

fs.writeFileSync(htmlPath, updated, 'utf8');
console.log('✅ CasinoOps.html updated with new bundle');
