import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const mapping = {
  'node_modules/@codemirror/state/dist/index.js': 'vendor/codemirror/state.js',
  'node_modules/@codemirror/view/dist/index.js': 'vendor/codemirror/view.js',
  'node_modules/@codemirror/commands/dist/index.js': 'vendor/codemirror/commands.js',
  'node_modules/@codemirror/language/dist/index.js': 'vendor/codemirror/language.js',
  'node_modules/@codemirror/lint/dist/index.js': 'vendor/codemirror/lint.js',
  'node_modules/@codemirror/autocomplete/dist/index.js': 'vendor/codemirror/autocomplete.js',
  'node_modules/@codemirror/search/dist/index.js': 'vendor/codemirror/search.js',
  'node_modules/@lezer/highlight/dist/index.js': 'vendor/codemirror/lezer-highlight.js',
  'node_modules/@lezer/common/dist/index.js': 'vendor/codemirror/lezer-common.js',
  'node_modules/@lezer/lr/dist/index.js': 'vendor/codemirror/lezer-lr.js',
  'node_modules/@marijn/find-cluster-break/src/index.js': 'vendor/codemirror/find-cluster-break.js',
  'node_modules/style-mod/src/style-mod.js': 'vendor/codemirror/style-mod.js',
  'node_modules/w3c-keyname/index.js': 'vendor/codemirror/w3c-keyname.js',
  'node_modules/crelt/index.js': 'vendor/codemirror/crelt.js'
};

const vendorDir = path.join(root, 'vendor', 'codemirror');
fs.mkdirSync(vendorDir, { recursive: true });

console.log('Vendoring CodeMirror 6 and Lezer ESM client modules...');
for (const [srcRel, dstRel] of Object.entries(mapping)) {
  const src = path.join(root, srcRel);
  const dst = path.join(root, dstRel);
  if (!fs.existsSync(src)) {
    throw new Error(`Source file missing: ${src}`);
  }
  fs.copyFileSync(src, dst);
  const size = (fs.statSync(dst).size / 1024).toFixed(1);
  console.log(`  ✓ ${dstRel} (${size} KB)`);
}
console.log('Vendoring completed successfully.');
