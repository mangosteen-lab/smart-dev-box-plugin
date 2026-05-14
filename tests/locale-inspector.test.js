'use strict';

const { loadPlugin, runDetect, runExecute } = require('./helpers');

describe('locale-inspector plugin', () => {
  let plugin;

  beforeAll(() => {
    plugin = loadPlugin('locale-inspector').plugin;
  });

  // ── schema ────────────────────────────────────────────────────────────────
  describe('plugin schema', () => {
    test('has correct id and type', () => {
      expect(plugin.id).toBe('locale-inspector');
      expect(plugin.type).toBe('detector');
    });

    test('output extension is txt', () => {
      expect(plugin.outputExtension).toBe('txt');
    });

    test('has detectCode and executeCode', () => {
      expect(typeof plugin.detectCode).toBe('string');
      expect(typeof plugin.executeCode).toBe('string');
    });
  });

  // ── detectCode ────────────────────────────────────────────────────────────
  describe('detectCode', () => {
    const detect = (input) => runDetect(plugin.detectCode, input);

    test('detects a BCP-47 tag like en-US', () => {
      expect(detect('en-US')).toBeGreaterThan(0);
    });

    test('detects a locale number like 1033', () => {
      expect(detect('1033')).toBeGreaterThan(0);
    });

    test('detects a language name like French', () => {
      expect(detect('French')).toBeGreaterThan(0);
    });

    test('detects a country name like Japan', () => {
      expect(detect('Japan')).toBeGreaterThan(0);
    });

    test('returns 0 for empty input', () => {
      expect(detect('')).toBe(0);
    });
  });

  // ── executeCode ───────────────────────────────────────────────────────────
  describe('executeCode', () => {
    const execute = (input) => runExecute(plugin.executeCode, input);

    // ── Locale number lookup ─────────────────────────────────────────────
    describe('locale number lookup', () => {
      test('1033 → English (United States)', () => {
        const { output } = execute('1033');
        expect(output).toContain('English');
        expect(output).toContain('United States');
        expect(output).toContain('1033');
      });

      test('1036 → French (France)', () => {
        const { output } = execute('1036');
        expect(output).toContain('French');
        expect(output).toContain('France');
        expect(output).toContain('1036');
      });

      test('1041 → Japanese (Japan)', () => {
        const { output } = execute('1041');
        expect(output).toContain('Japanese');
        expect(output).toContain('Japan');
        expect(output).toContain('1041');
      });
    });

    // ── BCP-47 tag lookup ────────────────────────────────────────────────
    describe('BCP-47 tag lookup', () => {
      test('en-US → English (United States)', () => {
        const { output } = execute('en-US');
        expect(output).toContain('English');
        expect(output).toContain('United States');
        expect(output).toContain('en-US');
      });

      test('zh-CN → Chinese Simplified (China)', () => {
        const { output } = execute('zh-CN');
        expect(output).toContain('Chinese');
        expect(output).toContain('China');
      });

      test('pt-BR → Portuguese (Brazil)', () => {
        const { output } = execute('pt-BR');
        expect(output).toContain('Portuguese');
        expect(output).toContain('Brazil');
      });

      test('fr-FR → French (France)', () => {
        const { output } = execute('fr-FR');
        expect(output).toContain('French');
        expect(output).toContain('France');
      });
    });

    // ── Language name lookup ─────────────────────────────────────────────
    describe('language name lookup', () => {
      test('"Japanese" → Japanese (Japan)', () => {
        const { output } = execute('Japanese');
        expect(output).toContain('Japanese');
        expect(output).toContain('Japan');
      });

      test('"German" → German (Germany)', () => {
        const { output } = execute('German');
        expect(output).toContain('German');
        expect(output).toContain('Germany');
      });

      test('"Korean" → Korean (Korea)', () => {
        const { output } = execute('Korean');
        expect(output).toContain('Korean');
        expect(output).toContain('Korea');
      });

      test('"French" → French (France)', () => {
        const { output } = execute('French');
        expect(output).toContain('French');
        expect(output).toContain('France');
      });
    });

    // ── Country/region name lookup ────────────────────────────────────────
    describe('country/region name lookup', () => {
      test('"Japan" → Japanese (Japan)', () => {
        const { output } = execute('Japan');
        expect(output).toContain('Japanese');
        expect(output).toContain('Japan');
      });

      test('"Brazil" → Portuguese (Brazil)', () => {
        const { output } = execute('Brazil');
        expect(output).toContain('Portuguese');
        expect(output).toContain('Brazil');
      });

      test('"China" → Chinese (China)', () => {
        const { output } = execute('China');
        expect(output).toContain('China');
      });
    });

    // ── Output fields ─────────────────────────────────────────────────────
    describe('output fields', () => {
      test('output contains all expected fields', () => {
        const { output } = execute('en-US');
        expect(output).toContain('Locale ID');
        expect(output).toContain('Language');
        expect(output).toContain('Country');
        expect(output).toContain('Locale Code');
      });

      test('outputLanguage is text', () => {
        const { outputLanguage } = execute('en-US');
        expect(outputLanguage).toBe('text');
      });
    });

    // ── Unknown / empty input ─────────────────────────────────────────────
    describe('unknown / empty input', () => {
      test('unknown identifier reports an error', () => {
        const result = execute('zzz-XX-unknown-9999');
        const message = result.error || result.output || '';
        expect(message.toLowerCase()).toMatch(/no (locale|input|match)|not found/i);
      });

      test('empty input reports an error', () => {
        const result = execute('');
        const message = result.error || result.output || '';
        expect(message).toBeTruthy();
      });
    });
  });
});
