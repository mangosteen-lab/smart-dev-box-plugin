#!/usr/bin/env node
/**
 * generate-index.js
 *
 * Reads every *.plugin.json file in ./plugins/ and writes ./index.json.
 *
 * Run manually after adding or updating a plugin:
 *   node generate-index.js
 *
 * The output index.json is the file that SmartDevBox fetches to populate
 * the Plugin Store.  Each entry is a StorePlugin object:
 *   { id, name, category, description, keywords, outputExtension?,
 *     detectCode, executeCode, updatedAt, author, publishedAt, downloads }
 *
 * Fields that are not in the .plugin.json source (author, publishedAt,
 * downloads) are kept from the existing index.json when available, so
 * install counts are not reset on every rebuild.
 */

const fs   = require('fs');
const path = require('path');

const PLUGINS_DIR = path.join(__dirname, 'plugins');
const INDEX_FILE  = path.join(__dirname, 'index.json');

// Load existing index so we can preserve mutable metadata (downloads, publishedAt)
let existing = {};
if (fs.existsSync(INDEX_FILE)) {
  try {
    const prev = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    for (const p of (prev.plugins ?? [])) existing[p.id] = p;
  } catch { /* start fresh if malformed */ }
}

const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.plugin.json'));
const plugins = [];

for (const file of files) {
  const filePath = path.join(PLUGINS_DIR, file);
  let bundle;
  try {
    bundle = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.warn(`  [skip] ${file}: invalid JSON — ${err.message}`);
    continue;
  }

  if (bundle.schemaVersion !== '1.0') {
    console.warn(`  [skip] ${file}: unsupported schemaVersion "${bundle.schemaVersion}"`);
    continue;
  }

  const defs = bundle.plugin  ? [bundle.plugin]
             : bundle.plugins ? bundle.plugins
             : [];

  for (const def of defs) {
    if (!def.id || !def.name) {
      console.warn(`  [skip] ${file}: plugin "${def.id ?? '(no id)'}" missing required fields (id, name)`);
      continue;
    }

    const isGenerator = def.type === 'generator';

    // Validate type-specific required fields
    if (isGenerator && !def.generateCode) {
      console.warn(`  [skip] ${file}: generator plugin "${def.id}" missing generateCode`);
      continue;
    }
    if (!isGenerator && (!def.detectCode || !def.executeCode)) {
      console.warn(`  [skip] ${file}: detector plugin "${def.id}" missing detectCode or executeCode`);
      continue;
    }

    const prev = existing[def.id] ?? {};

    const entry = {
      // Common fields
      id:              def.id,
      name:            def.name,
      description:     def.description ?? '',
      outputExtension: def.outputExtension,
      updatedAt:       def.updatedAt ?? new Date().toISOString(),
      // Mutable metadata
      author:          bundle.author ?? prev.author ?? '',
      publishedAt:     prev.publishedAt ?? def.updatedAt ?? new Date().toISOString(),
      downloads:       prev.downloads ?? 0,
      // Audience tags (e.g. Programmer, Student, Officer Worker)
      tags:            def.tags ?? [],
    };

    if (isGenerator) {
      entry.type         = 'generator';
      entry.options      = def.options ?? [];
      entry.generateCode = def.generateCode;
    } else {
      entry.category     = def.category ?? 'Inspection';
      entry.keywords     = def.keywords ?? [];
      entry.detectCode   = def.detectCode;
      entry.executeCode  = def.executeCode;
    }

    plugins.push(entry);
    console.log(`  [ok]   ${def.id}  (${def.name})  [${isGenerator ? 'generator' : 'detector'}]`);
  }
}

// Sort by id for stable diffs
plugins.sort((a, b) => a.id.localeCompare(b.id));

const output = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  plugins,
};

fs.writeFileSync(INDEX_FILE, JSON.stringify(output, null, 2) + '\n', 'utf-8');
console.log(`\nWrote ${plugins.length} plugin(s) to index.json`);
