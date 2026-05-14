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

    test('detects a plain locale number', () => {
      expect(detect('1033')).toBeGreaterThan(0);
    });

    test('detects a hex LCID like 0x0409', () => {
      expect(detect('0x0409')).toBeGreaterThan(0);
    });

    test('returns 0 for empty input', () => {
      expect(detect('')).toBe(0);
    });
  });

  // ── executeCode ───────────────────────────────────────────────────────────
  describe('executeCode', () => {
    const execute = (input) => runExecute(plugin.executeCode, input);

    // ── Locale number ────────────────────────────────────────────────────
    describe('locale number lookup', () => {
      test('1024 → English (United States)', () => {
        const { output } = execute('1024');
        expect(output).toContain('English (United States)');
        expect(output).toContain('Locale ID    : 1024');
        expect(output).toContain('BCP-47 Tag   : en-US');
      });

      test('1085 → Chinese Simplified (China)', () => {
        const { output } = execute('1085');
        expect(output).toContain('Chinese Simplified');
        expect(output).toContain('Locale ID    : 1085');
      });

      test('1036 → Japanese (Japan)', () => {
        const { output } = execute('1036');
        expect(output).toContain('Japanese (Japan)');
        expect(output).toContain('BCP-47 Tag   : ja-JP');
      });
    });

    // ── LCID decimal ─────────────────────────────────────────────────────
    // Note: locale IDs overlap with LCID values (1024-1181 range).
    // When a number is in that range, it resolves as locale ID first.
    // Use values outside the range (>1181) to test LCID-only lookup.
    describe('LCID decimal lookup', () => {
      test('1033 resolves as locale 1033 → Hebrew (Israel)', () => {
        // Locale ID 1033 = Hebrew (Israel); LCID 1033 = en-US, but locale ID takes precedence
        const { output } = execute('1033');
        expect(output).toContain('Hebrew (Israel)');
        expect(output).toContain('Locale ID    : 1033');
      });

      test('1041 resolves as locale 1041 → Portuguese (Brazil)', () => {
        // Locale ID 1041 = pt-BR; LCID 1041 = ja-JP, but locale ID takes precedence
        const { output } = execute('1041');
        expect(output).toContain('Portuguese (Brazil)');
        expect(output).toContain('Locale ID    : 1041');
      });
    });

    // ── Hex LCID ─────────────────────────────────────────────────────────
    describe('hex LCID lookup', () => {
      test('0x0409 → English (United States)', () => {
        const { output } = execute('0x0409');
        expect(output).toContain('English (United States)');
        expect(output).toContain('LCID (hex)');
      });

      test('0x0411 → Japanese (Japan)', () => {
        const { output } = execute('0x0411');
        expect(output).toContain('Japanese (Japan)');
      });
    });

    // ── BCP-47 tag ───────────────────────────────────────────────────────
    describe('BCP-47 tag lookup', () => {
      test('en-US → English (United States)', () => {
        const { output } = execute('en-US');
        expect(output).toContain('English (United States)');
        expect(output).toContain('BCP-47 Tag   : en-US');
      });

      test('zh-CN → Chinese Simplified (China)', () => {
        const { output } = execute('zh-CN');
        expect(output).toContain('Chinese Simplified');
      });

      test('pt-BR → Portuguese (Brazil)', () => {
        const { output } = execute('pt-BR');
        expect(output).toContain('Portuguese (Brazil)');
      });

      test('fr-FR → French (France)', () => {
        const { output } = execute('fr-FR');
        expect(output).toContain('French (France)');
      });
    });

    // ── Language name ────────────────────────────────────────────────────
    describe('language name lookup', () => {
      test('"Japanese" → Japanese (Japan)', () => {
        const { output } = execute('Japanese');
        expect(output).toContain('Japanese (Japan)');
      });

      test('"German" → a German locale', () => {
        const { output } = execute('German');
        expect(output).toContain('Language Name');
        expect(output).toContain('Language     : German');
      });

      test('"Korean" → Korean (Korea)', () => {
        const { output } = execute('Korean');
        expect(output).toContain('Korean (Korea)');
      });
    });

    // ── Country/region name ───────────────────────────────────────────────
    describe('country/region name lookup', () => {
      test('"Japan" → Japanese (Japan)', () => {
        const { output } = execute('Japan');
        expect(output).toContain('Japanese (Japan)');
      });

      test('"Brazil" → Portuguese (Brazil)', () => {
        const { output } = execute('Brazil');
        expect(output).toContain('Portuguese (Brazil)');
      });

      test('"China" → a Chinese or Mongolian locale with region China', () => {
        const { output } = execute('China');
        expect(output).toContain('Region       : China');
      });
    });

    // ── Output fields ─────────────────────────────────────────────────────
    describe('output fields', () => {
      test('output contains all expected fields', () => {
        const { output } = execute('en-US');
        expect(output).toContain('Display Name');
        expect(output).toContain('Language');
        expect(output).toContain('Region');
        expect(output).toContain('BCP-47 Tag');
        expect(output).toContain('Locale ID');
        expect(output).toContain('LCID (dec)');
        expect(output).toContain('LCID (hex)');
      });

      test('outputLanguage is text', () => {
        const { outputLanguage } = execute('en-US');
        expect(outputLanguage).toBe('text');
      });
    });

    // ── Multiple inputs ───────────────────────────────────────────────────
    describe('multiple locale inputs', () => {
      test('comma-separated BCP-47 tags return multiple results', () => {
        const { output } = execute('en-US, ja-JP, fr-FR');
        expect(output).toContain('English (United States)');
        expect(output).toContain('Japanese (Japan)');
        expect(output).toContain('French (France)');
      });

      test('newline-separated locale numbers return multiple results', () => {
        const { output } = execute('1024\n1036\n1041');
        // At least two distinct locales should appear
        const sections = output.split('\n\n').filter(Boolean);
        expect(sections.length).toBeGreaterThanOrEqual(2);
      });

      test('duplicate identifiers are deduplicated', () => {
        const { output } = execute('en-US, en-US');
        const matches = output.match(/English \(United States\)/g) || [];
        expect(matches.length).toBe(1);
      });
    });

    // ── Unknown input ─────────────────────────────────────────────────────
    describe('unknown / empty input', () => {
      test('unknown identifier notes no locale found', () => {
        const { output } = execute('zzz-XX-unknown-9999');
        expect(output).toContain('No locale found');
      });

      test('empty input returns no locale identifiers found message', () => {
        const { output } = execute('');
        expect(output).toContain('No locale identifiers found');
      });
    });

    // ── Display name lookup ───────────────────────────────────────────────
    describe('display name lookup', () => {
      test('"English (United States)" by full display name', () => {
        const { output } = execute('English (United States)');
        expect(output).toContain('English (United States)');
        expect(output).toContain('Locale ID    : 1024');
      });
    });
  });
});
