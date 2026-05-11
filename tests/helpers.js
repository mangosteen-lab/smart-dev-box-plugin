/**
 * Plugin test helpers.
 *
 * Each plugin stores its logic as a code string inside the JSON.
 * These helpers compile and execute those strings in a controlled scope,
 * mirroring how the Smart Dev Box runtime evaluates them.
 *
 *   detectCode  – receives `input` (string), returns a confidence number 0–1
 *   executeCode – receives `input` (string), returns { output, outputLanguage?, error? }
 *   generateCode – receives `options` (object), returns { output, outputLanguage?, error? }
 */

'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Load and parse a plugin JSON file from the plugins/ directory.
 * @param {string} id - plugin id, e.g. 'chat-aba-path-parser'
 */
function loadPlugin(id) {
  const file = path.resolve(__dirname, '..', 'plugins', `${id}.plugin.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Run a plugin's detectCode with the given input.
 * @param {string} code
 * @param {string} input
 * @returns {number} confidence 0–1
 */
function runDetect(code, input) {
  // eslint-disable-next-line no-new-func
  const fn = new Function('input', `${code}`);
  return fn(input);
}

/**
 * Run a plugin's executeCode with the given input.
 * @param {string} code
 * @param {string} input
 * @returns {{ output: string|Uint8Array, outputLanguage?: string, error?: string }}
 */
function runExecute(code, input) {
  // eslint-disable-next-line no-new-func
  const fn = new Function('input', `return (function(input){\n${code}\n})(input)`);
  return fn(input);
}

/**
 * Run a plugin's generateCode with the given options object.
 * @param {string} code
 * @param {object} options
 * @returns {{ output: string, outputLanguage?: string, error?: string }}
 */
function runGenerate(code, options) {
  // eslint-disable-next-line no-new-func
  const fn = new Function('options', `return (function(options){\n${code}\n})(options)`);
  return fn(options);
}

module.exports = { loadPlugin, runDetect, runExecute, runGenerate };
