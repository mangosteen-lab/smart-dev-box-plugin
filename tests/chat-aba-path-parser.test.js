'use strict';

const { loadPlugin, runDetect, runExecute } = require('./helpers');

describe('chat-aba-path-parser plugin', () => {
  let plugin;

  beforeAll(() => {
    plugin = loadPlugin('chat-aba-path-parser').plugin;
  });

  // ── schema ────────────────────────────────────────────────────────────
  describe('plugin schema', () => {
    test('has correct id and type', () => {
      expect(plugin.id).toBe('chat-aba-path-parser');
      expect(plugin.type).toBe('detector');
    });

    test('output extension is txt', () => {
      expect(plugin.outputExtension).toBe('txt');
    });
  });

  // ── detectCode ────────────────────────────────────────────────────────
  describe('detectCode', () => {
    const detect = (input) => runDetect(plugin.detectCode, input);

    test('returns 0.98 for a valid ChatABA URL', () => {
      expect(detect('http://10.27.8.5:8080/temp/commands/abc123def456/result.json')).toBe(0.98);
    });

    test('returns 0.98 for URL with uppercase hex job id', () => {
      expect(detect('http://192.168.1.10:9090/temp/commands/DEADBEEF/output.txt')).toBe(0.98);
    });

    test('returns 0.98 for https variant', () => {
      expect(detect('https://10.0.0.1:443/temp/commands/cafebabe/data')).toBe(0.98);
    });

    test('returns 0.98 when input has leading/trailing whitespace', () => {
      expect(detect('  http://10.0.0.1:8080/temp/commands/abc123/file  ')).toBe(0.98);
    });

    test('returns 0 for a plain HTTP URL that is not ChatABA', () => {
      expect(detect('http://example.com/foo/bar')).toBe(0);
    });

    test('returns 0 for an empty string', () => {
      expect(detect('')).toBe(0);
    });

    test('returns 0 for arbitrary text', () => {
      expect(detect('just some random text')).toBe(0);
    });

    test('returns 0 for URL missing port', () => {
      expect(detect('http://10.0.0.1/temp/commands/abc123/')).toBe(0);
    });

    test('returns 0 for URL with non-hex job id', () => {
      expect(detect('http://10.0.0.1:8080/temp/commands/my-job-id/file')).toBe(0);
    });
  });

  // ── executeCode ───────────────────────────────────────────────────────
  describe('executeCode', () => {
    const execute = (input) => runExecute(plugin.executeCode, input);

    describe('valid URL', () => {
      let result;
      const url = 'http://10.27.8.5:8080/temp/commands/abc123def456/result.json';

      beforeAll(() => {
        result = execute(url);
      });

      test('returns no error', () => {
        expect(result.error).toBeUndefined();
      });

      test('output contains the original URL', () => {
        expect(result.output).toContain(url);
      });

      test('output contains the host IP', () => {
        expect(result.output).toContain('10.27.8.5');
      });

      test('output contains the port', () => {
        expect(result.output).toContain('8080');
      });

      test('output contains the job ID', () => {
        expect(result.output).toContain('abc123def456');
      });

      test('output contains the UNC path', () => {
        expect(result.output).toContain('\\\\10.27.8.5\\Soil_Share\\commands\\abc123def456');
      });

      test('outputLanguage is text', () => {
        expect(result.outputLanguage).toBe('text');
      });
    });

    describe('URL with whitespace padding', () => {
      test('trims and parses correctly', () => {
        const result = execute('  http://192.168.0.1:9090/temp/commands/deadbeef/out  ');
        expect(result.error).toBeUndefined();
        expect(result.output).toContain('192.168.0.1');
        expect(result.output).toContain('deadbeef');
      });
    });

    describe('invalid / edge-case inputs', () => {
      test('returns error for completely invalid URL', () => {
        const result = execute('not-a-url');
        expect(result.error).toBeDefined();
        expect(result.output).toBe('');
      });

      test('returns error when pathname does not match /temp/commands/<id>', () => {
        const result = execute('http://10.0.0.1:8080/other/path');
        expect(result.error).toContain('job_id');
        expect(result.output).toBe('');
      });

      test('returns error for empty string', () => {
        const result = execute('');
        expect(result.error).toBeDefined();
      });
    });
  });
});
