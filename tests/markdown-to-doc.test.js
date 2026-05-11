'use strict';

const fs   = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { loadPlugin, runDetect, runExecute } = require('./helpers');

const INPUT_DIR    = path.resolve(__dirname, 'resources/markdown-to-doc/input');
const BASELINE_DIR = path.resolve(__dirname, 'resources/markdown-to-doc/baseline');

describe('markdown-to-doc plugin', () => {
  let plugin;

  beforeAll(() => {
    plugin = loadPlugin('markdown-to-doc').plugin;
  });

  // ── schema ────────────────────────────────────────────────────────────
  describe('plugin schema', () => {
    test('has correct id and type', () => {
      expect(plugin.id).toBe('markdown-to-doc');
      expect(plugin.type).toBe('detector');
    });

    test('output extension is docx', () => {
      expect(plugin.outputExtension).toBe('docx');
    });
  });

  // ── detectCode ────────────────────────────────────────────────────────
  describe('detectCode', () => {
    const detect = (input) => runDetect(plugin.detectCode, input);

    test('returns 0 for empty string', () => {
      expect(detect('')).toBe(0);
    });

    test('returns high score for markdown with heading', () => {
      const score = detect('# Hello World\n\nSome paragraph text.');
      expect(score).toBeGreaterThanOrEqual(0.6);
    });

    test('returns high score when heading + table present', () => {
      const md = '# Title\n\n| A | B |\n|---|---|\n| 1 | 2 |';
      expect(detect(md)).toBeGreaterThanOrEqual(0.8);
    });

    test('returns max 0.97 even for rich markdown', () => {
      const md = '# Title\n\n**bold**\n\n| A | B |\n|---|---|\n\n- item\n\n> quote';
      expect(detect(md)).toBeLessThanOrEqual(0.97);
    });

    test('returns at least 0.3 for plain non-empty text', () => {
      expect(detect('Just some plain text without any markdown syntax.')).toBeGreaterThanOrEqual(0.3);
    });

    test('returns higher score when bold is present', () => {
      const withBold    = '# Title\n\n**bold**';
      const withoutBold = '# Title\n\nplain';
      expect(detect(withBold)).toBeGreaterThan(detect(withoutBold));
    });
  });

  /**
   * The plugin runtime serialises binary Uint8Array output as a base64 string.
   * When eval-ing the code directly we receive that base64 string back, so we
   * decode it to a Buffer before inspecting the ZIP.
   */
  function outputToBuffer(output) {
    if (typeof output === 'string') {
      return Buffer.from(output, 'base64');
    }
    return Buffer.from(output);
  }

  // ── executeCode — structural tests ────────────────────────────────────
  describe('executeCode — output structure', () => {
    const execute = (input) => runExecute(plugin.executeCode, input);

    test('returns non-empty output (base64 string or binary)', () => {
      const { output } = execute('# Hello\n\nWorld');
      expect(output).toBeTruthy();
      const buf = outputToBuffer(output);
      expect(buf.length).toBeGreaterThan(0);
    });

    test('output starts with ZIP local file header signature (PK\\x03\\x04)', () => {
      const { output } = execute('# Test\n\nParagraph.');
      const buf = outputToBuffer(output);
      expect(buf[0]).toBe(0x50); // P
      expect(buf[1]).toBe(0x4B); // K
      expect(buf[2]).toBe(0x03);
      expect(buf[3]).toBe(0x04);
    });

    test('no error for valid markdown', () => {
      const { error } = execute('# Hello\n\nSome **bold** text.');
      expect(error).toBeUndefined();
    });

    test('contains required OOXML parts (ZIP entries)', async () => {
      const { output } = execute('# Hello\n\nTest.');
      const zip = await JSZip.loadAsync(outputToBuffer(output));
      const names = Object.keys(zip.files);
      expect(names).toContain('[Content_Types].xml');
      expect(names).toContain('word/document.xml');
      expect(names).toContain('word/_rels/document.xml.rels');
    });

    test('document.xml contains the heading text', async () => {
      const { output } = execute('# My Heading\n\nBody text.');
      const zip = await JSZip.loadAsync(outputToBuffer(output));
      const xml = await zip.file('word/document.xml').async('string');
      expect(xml).toContain('My Heading');
    });

    test('document.xml contains bold text', async () => {
      const { output } = execute('This has **bold words** inside.');
      const zip = await JSZip.loadAsync(outputToBuffer(output));
      const xml = await zip.file('word/document.xml').async('string');
      expect(xml).toContain('bold words');
      // Bold is marked with <w:b/>
      expect(xml).toContain('<w:b/>');
    });

    test('document.xml contains italic text', async () => {
      const { output } = execute('This has *italic words* here.');
      const zip = await JSZip.loadAsync(outputToBuffer(output));
      const xml = await zip.file('word/document.xml').async('string');
      expect(xml).toContain('italic words');
      expect(xml).toContain('<w:i/>');
    });

    test('document.xml contains table markup for markdown table', async () => {
      const md = '| Col1 | Col2 |\n|------|------|\n| A    | B    |';
      const { output } = execute(md);
      const zip = await JSZip.loadAsync(outputToBuffer(output));
      const xml = await zip.file('word/document.xml').async('string');
      expect(xml).toContain('<w:tbl>');
      expect(xml).toContain('Col1');
      expect(xml).toContain('Col2');
    });

    test('document.xml contains hyperlink for [text](url)', async () => {
      const { output } = execute('Visit [OpenCode](https://opencode.ai) now.');
      const zip = await JSZip.loadAsync(outputToBuffer(output));
      const xml = await zip.file('word/document.xml').async('string');
      expect(xml).toContain('OpenCode');
    });

    test('document.xml contains blockquote content', async () => {
      const { output } = execute('> This is a quote.');
      const zip = await JSZip.loadAsync(outputToBuffer(output));
      const xml = await zip.file('word/document.xml').async('string');
      expect(xml).toContain('This is a quote.');
    });

    test('handles empty input gracefully', () => {
      const result = execute('');
      // Should either return a valid (minimal) docx or an error — but not throw
      expect(result).toBeDefined();
    });
  });

  // ── executeCode — baseline binary comparison ───────────────────────────
  describe('executeCode — baseline docx comparison', () => {
    /**
     * We compare the XML content of the produced docx against the baseline.
     * We use XML-level comparison (not raw bytes) to be resilient to
     * non-functional differences (e.g. ordering of ZIP entries).
     */
    const FIXTURES = ['basic', 'full-features', 'tables', 'chinese-auction-report'];

    for (const name of FIXTURES) {
      test(`matches baseline for "${name}.md"`, async () => {
        const mdPath       = path.join(INPUT_DIR,    `${name}.md`);
        const baselinePath = path.join(BASELINE_DIR, `${name}.docx`);

        const input    = fs.readFileSync(mdPath, 'utf8');
        const baseline = fs.readFileSync(baselinePath);

        const { output, error } = runExecute(plugin.executeCode, input);

        expect(error).toBeUndefined();

        // Parse both ZIPs and compare document.xml content
        const [actualZip, baselineZip] = await Promise.all([
          JSZip.loadAsync(outputToBuffer(output)),
          JSZip.loadAsync(baseline),
        ]);

        const [actualXml, baselineXml] = await Promise.all([
          actualZip.file('word/document.xml').async('string'),
          baselineZip.file('word/document.xml').async('string'),
        ]);

        expect(actualXml).toBe(baselineXml);
      });
    }
  });

  // ── executeCode — Chinese text (auction report) ───────────────────────
  describe('executeCode — Chinese text (auction report)', () => {
    let xml;

    beforeAll(async () => {
      const input = fs.readFileSync(
        path.join(INPUT_DIR, 'chinese-auction-report.md'),
        'utf8'
      );
      const { output } = runExecute(plugin.executeCode, input);
      const zip = await JSZip.loadAsync(outputToBuffer(output));
      xml = await zip.file('word/document.xml').async('string');
    });

    test('document.xml contains the Chinese H1 title', () => {
      expect(xml).toContain('书画专场系统性汇总与横向对比分析报告');
    });

    test('document.xml contains H2 section headings', () => {
      expect(xml).toContain('报告说明');
      expect(xml).toContain('拍品总规模概览');
      expect(xml).toContain('三场共性规律');
    });

    test('document.xml contains H3 sub-headings', () => {
      expect(xml).toContain('分析范围');
      expect(xml).toContain('数据依据');
      expect(xml).toContain('标注不规范');
    });

    test('document.xml contains table cell data (auction counts)', () => {
      expect(xml).toContain('2642件');
      expect(xml).toContain('2561件');
      expect(xml).toContain('2340件');
    });

    test('document.xml contains table cell data (author names)', () => {
      expect(xml).toContain('吴昌硕');
      expect(xml).toContain('黄宾虹');
      expect(xml).toContain('齐白石');
    });

    test('document.xml contains table cell data (artwork names)', () => {
      expect(xml).toContain('墨花八段卷');
      expect(xml).toContain('秋林闲居图');
    });

    test('document.xml contains bold conclusion text', () => {
      expect(xml).toContain('核心结论');
    });

    test('document.xml contains ordered list items', () => {
      expect(xml).toContain('供给结构稳定');
      expect(xml).toContain('价格结构一致');
    });
  });
});
