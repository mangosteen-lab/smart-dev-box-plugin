'use strict';

const { loadPlugin, runGenerate } = require('./helpers');

describe('timestamp-generator plugin', () => {
  let plugin;

  beforeAll(() => {
    plugin = loadPlugin('timestamp-generator').plugin;
  });

  // ── schema ────────────────────────────────────────────────────────────
  describe('plugin schema', () => {
    test('has correct id and type', () => {
      expect(plugin.id).toBe('timestamp-generator');
      expect(plugin.type).toBe('generator');
    });

    test('output extension is txt', () => {
      expect(plugin.outputExtension).toBe('txt');
    });

    test('has format, utc, and count options', () => {
      const keys = plugin.options.map((o) => o.key);
      expect(keys).toContain('format');
      expect(keys).toContain('utc');
      expect(keys).toContain('count');
    });
  });

  // ── generateCode ──────────────────────────────────────────────────────
  describe('generateCode', () => {
    const generate = (options) => runGenerate(plugin.generateCode, options);

    // ── ISO format ───────────────────────────────────────────────────
    describe('format: iso (default)', () => {
      test('returns a single ISO-8601 timestamp by default', () => {
        const { output } = generate({ format: 'iso', utc: true, count: 1 });
        expect(output).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/);
      });

      test('returns multiple lines when count > 1', () => {
        const { output } = generate({ format: 'iso', utc: true, count: 3 });
        const lines = output.split('\n');
        expect(lines).toHaveLength(3);
        lines.forEach((l) => expect(l).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/));
      });

      test('consecutive timestamps are 1 ms apart', () => {
        const { output } = generate({ format: 'unix-ms', utc: true, count: 3 });
        const [a, b, c] = output.split('\n').map(Number);
        expect(b - a).toBe(1);
        expect(c - b).toBe(1);
      });
    });

    // ── unix-ms ───────────────────────────────────────────────────────
    describe('format: unix-ms', () => {
      test('output is a numeric string', () => {
        const { output } = generate({ format: 'unix-ms', utc: true, count: 1 });
        expect(output).toMatch(/^\d+$/);
      });

      test('value is close to Date.now()', () => {
        const before = Date.now();
        const { output } = generate({ format: 'unix-ms', utc: true, count: 1 });
        const after = Date.now();
        const ts = Number(output);
        expect(ts).toBeGreaterThanOrEqual(before);
        expect(ts).toBeLessThanOrEqual(after);
      });
    });

    // ── unix-s ────────────────────────────────────────────────────────
    describe('format: unix-s', () => {
      test('output is a numeric string (seconds)', () => {
        const { output } = generate({ format: 'unix-s', utc: true, count: 1 });
        expect(output).toMatch(/^\d+$/);
        // unix-s should be roughly Date.now()/1000
        expect(Number(output)).toBeCloseTo(Date.now() / 1000, -1);
      });
    });

    // ── rfc2822 ───────────────────────────────────────────────────────
    describe('format: rfc2822', () => {
      test('output looks like a UTC string', () => {
        const { output } = generate({ format: 'rfc2822', utc: true, count: 1 });
        // e.g. "Mon, 12 May 2026 10:30:00 GMT"
        expect(output).toMatch(/GMT$/);
      });
    });

    // ── date-only ─────────────────────────────────────────────────────
    describe('format: date-only', () => {
      test('UTC mode returns YYYY-MM-DD', () => {
        const { output } = generate({ format: 'date-only', utc: true, count: 1 });
        expect(output).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    // ── time-only ─────────────────────────────────────────────────────
    describe('format: time-only', () => {
      test('UTC mode returns HH:MM:SSZ', () => {
        const { output } = generate({ format: 'time-only', utc: true, count: 1 });
        expect(output).toMatch(/^\d{2}:\d{2}:\d{2}Z$/);
      });
    });

    // ── count clamping ────────────────────────────────────────────────
    describe('count clamping', () => {
      test('clamps count at min=1 when 0 is given', () => {
        const { output } = generate({ format: 'iso', utc: true, count: 0 });
        expect(output.split('\n')).toHaveLength(1);
      });

      test('clamps count at max=50 when 100 is given', () => {
        const { output } = generate({ format: 'iso', utc: true, count: 100 });
        expect(output.split('\n')).toHaveLength(50);
      });

      test('produces exactly 50 lines at the boundary', () => {
        const { output } = generate({ format: 'unix-ms', utc: true, count: 50 });
        expect(output.split('\n')).toHaveLength(50);
      });
    });

    // ── defaults ──────────────────────────────────────────────────────
    describe('option defaults', () => {
      test('falls back to iso when format is undefined', () => {
        const { output } = generate({ utc: true, count: 1 });
        expect(output).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });

      test('falls back to count=1 when count is undefined', () => {
        const { output } = generate({ format: 'iso', utc: true });
        expect(output.split('\n')).toHaveLength(1);
      });
    });

    // ── outputLanguage ────────────────────────────────────────────────
    test('outputLanguage is text', () => {
      const { outputLanguage } = generate({ format: 'iso', utc: true, count: 1 });
      expect(outputLanguage).toBe('text');
    });
  });
});
