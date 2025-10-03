// obfuscate.js
// Usage: node obfuscate.js input.html output.html

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

if (process.argv.length < 4) {
  console.error('Usage: node obfuscate.js input.html output.html');
  process.exit(1);
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!fs.existsSync(inputPath)) {
  console.error('Input file not found:', inputPath);
  process.exit(1);
}

let html = fs.readFileSync(inputPath, 'utf8');

// Regex to match <script ...>...</script> but skip scripts with src attribute
// It captures opening tag (group1), inner JS (group2), and closing tag.
const scriptRegex = /(<script\b(?:(?!\bsrc\b)[\s\S])*?>)([\s\S]*?)(<\/script>)/gi;

let changed = false;

html = html.replace(scriptRegex, (fullMatch, openTag, innerJS, closeTag) => {
  // If innerJS is empty or only whitespace, leave as-is
  if (!innerJS || !innerJS.trim()) return fullMatch;

  // Basic safety: do not obfuscate if it's a small config or contains "DO-NOT-OBFUSCATE" marker
  if (innerJS.includes('DO-NOT-OBFUSCATE')) {
    return fullMatch;
  }

  // Obfuscation options - tweak as desired
  const obfOptions = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: false,
    stringArray: true,
    stringArrayThreshold: 0.75,
    transformObjectKeys: true,
    simplify: true,
    // disableConsoleOutput: true
  };

  try {
    const obfuscated = JavaScriptObfuscator.obfuscate(innerJS, obfOptions).getObfuscatedCode();

    // Prevent accidental "</script>" sequence inside the inserted obfuscated code:
    const safeObf = obfuscated.replace(/<\/script>/gi, '<\\/script>');

    changed = true;
    // Keep the original opening tag attributes (like type, nonce, etc.)
    return `${openTag}\n/* obfuscated */\n${safeObf}\n${closeTag}`;
  } catch (err) {
    console.error('Obfuscation error for a script block — leaving original. Error:', err);
    // on error return original block (avoid breaking HTML)
    return fullMatch;
  }
});

if (!changed) {
  console.log('No inline scripts were obfuscated (no matching inline <script> blocks found).');
}

// Ensure output directory exists
const outDir = path.dirname(outputPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(outputPath, html, 'utf8');
console.log('Obfuscated file written to', outputPath);
