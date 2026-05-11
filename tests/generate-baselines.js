/**
 * generate-baselines.js
 *
 * Runs the markdown-to-doc executeCode against every .md file in
 * tests/resources/markdown-to-doc/input/ and writes the resulting .docx
 * bytes to tests/resources/markdown-to-doc/baseline/.
 *
 * Run once (or whenever a fixture intentionally changes) to refresh baselines:
 *   node tests/generate-baselines.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { loadPlugin, runExecute } = require('./helpers');

const PLUGIN = loadPlugin('markdown-to-doc').plugin;

const INPUT_DIR  = path.resolve(__dirname, 'resources/markdown-to-doc/input');
const OUTPUT_DIR = path.resolve(__dirname, 'resources/markdown-to-doc/baseline');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith('.md'));

for (const file of files) {
  const mdPath   = path.join(INPUT_DIR,  file);
  const docxPath = path.join(OUTPUT_DIR, file.replace(/\.md$/, '.docx'));

  const input  = fs.readFileSync(mdPath, 'utf8');
  const result = runExecute(PLUGIN.executeCode, input);

  if (result.error) {
    console.error(`ERROR processing ${file}: ${result.error}`);
    process.exit(1);
  }

  // result.output may be a base64 string (runtime serialisation) or a Uint8Array
  const buf = typeof result.output === 'string'
    ? Buffer.from(result.output, 'base64')
    : Buffer.from(result.output);
  fs.writeFileSync(docxPath, buf);
  console.log(`Generated: ${path.relative(process.cwd(), docxPath)}`);
}

console.log('All baselines generated.');
