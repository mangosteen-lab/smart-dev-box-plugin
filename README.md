# SmartDevBox Plugin Hub

Official community plugin repository for [SmartDevBox](https://smartdevbox.com).

Plugins listed here appear automatically in the **Plugin Store** inside the app — no login required to browse or install.

---

## How to Submit a Plugin

1. **Fork** this repository.
2. Create your plugin file inside the `plugins/` directory:
   - File name must match the plugin `id`, e.g. `plugins/my-tool.plugin.json`
3. Follow the plugin file format below.
4. Run the index generator to verify your plugin is valid:
   ```bash
   node generate-index.js
   ```
5. Commit **both** your `plugins/my-tool.plugin.json` **and** the updated `index.json`.
6. Open a **Pull Request** — a maintainer will review and merge it.

---

## Plugin Types

SmartDevBox supports two plugin types:

| Type | Where it appears | What it does |
|------|-----------------|--------------|
| **Detector** | Main DevBox panel | Auto-detects input and transforms it |
| **Generator** | Generate bar (top of panel) | Produces output on demand, with configurable options |

---

## Plugin File Format

Every plugin file is a `.plugin.json` with `schemaVersion: "1.0"`.

### Detector Plugin

```json
{
  "schemaVersion": "1.0",
  "author": "Your Name / Team",
  "plugin": {
    "id": "my-unique-tool-id",
    "name": "My Tool Name",
    "category": "Inspection",
    "description": "What this tool does.",
    "keywords": ["keyword1", "keyword2"],
    "outputExtension": "txt",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "detectCode": "// return 0–1 confidence; `input` is the raw string\nreturn input.includes('something') ? 0.9 : 0;",
    "executeCode": "// return { output, outputLanguage?, error? }\nreturn { output: input.toUpperCase(), outputLanguage: 'text' };"
  }
}
```

### Generator Plugin

```json
{
  "schemaVersion": "1.0",
  "author": "Your Name / Team",
  "plugin": {
    "type": "generator",
    "id": "my-generator-id",
    "name": "My Generator",
    "description": "What this generator produces.",
    "outputExtension": "txt",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "options": [
      { "type": "number", "key": "count", "label": "Count", "defaultValue": 1, "min": 1, "max": 100 },
      { "type": "select", "key": "fmt",   "label": "Format", "defaultValue": "iso", "choices": ["iso", "unix"] },
      { "type": "toggle", "key": "upper", "label": "Uppercase", "defaultValue": false },
      { "type": "text",   "key": "prefix","label": "Prefix",  "defaultValue": "", "placeholder": "optional" }
    ],
    "generateCode": "// return { output, outputLanguage?, error? }\n// `options` contains the values the user set\nreturn { output: 'hello from generator', outputLanguage: 'text' };"
  }
}
```

### Plugin pack (multiple plugins in one file)

Replace `"plugin": { … }` with `"plugins": [ { … }, { … } ]`.

---

## Field Reference

### Common fields (all plugin types)

| Field | Required | Description |
|---|---|---|
| `id` | yes | Unique slug, e.g. `"my-tool"`. Must be lowercase, hyphenated. |
| `name` | yes | Human-readable display name. |
| `description` | yes | Short description shown in the store. |
| `outputExtension` | no | File extension for downloads, e.g. `"json"`. |
| `updatedAt` | yes | ISO 8601 timestamp of last change. |

### Detector-only fields

| Field | Required | Description |
|---|---|---|
| `category` | yes | One of: `Encoding / Decoding`, `Formatting`, `Conversion`, `Generation`, `Inspection`, `Text`. |
| `keywords` | yes | Array of strings used for search. |
| `detectCode` | yes | JS function body. Receives `input: string`. Must `return` a number `0`–`1`. |
| `executeCode` | yes | JS function body. Receives `input: string`. Must `return { output, outputLanguage?, error? }`. |

### Generator-only fields

| Field | Required | Description |
|---|---|---|
| `type` | yes | Must be `"generator"`. |
| `options` | no | Array of option descriptors (see below). |
| `generateCode` | yes | JS function body. Receives `options: Record<string, unknown>`. Must `return { output, outputLanguage?, error? }`. |

### Option types for generators

| Type | Extra fields | Example |
|------|-------------|---------|
| `text` | `defaultValue`, `placeholder?` | `{ "type": "text", "key": "prefix", "label": "Prefix", "defaultValue": "" }` |
| `number` | `defaultValue`, `min`, `max` | `{ "type": "number", "key": "count", "label": "Count", "defaultValue": 1, "min": 1, "max": 100 }` |
| `select` | `defaultValue`, `choices[]` | `{ "type": "select", "key": "fmt", "label": "Format", "defaultValue": "iso", "choices": ["iso","unix"] }` |
| `toggle` | `defaultValue` | `{ "type": "toggle", "key": "upper", "label": "Uppercase", "defaultValue": false }` |

---

## Tips

### `detectCode` (detector plugins)
- Return a high confidence (`0.9`–`1.0`) only when you are very sure this tool matches the input.
- Return `0` if the input is definitely not for this tool.
- SmartDevBox picks the highest-scoring tool automatically.

### `executeCode` / `generateCode`
- Always wrap in `try/catch` and return `{ output: '', error: err.message }` on failure.
- `outputLanguage` is a syntax-highlighting hint (`"json"`, `"xml"`, `"sql"`, `"text"`, etc.).

---

## Examples

- [`plugins/chat-aba-path-parser.plugin.json`](plugins/chat-aba-path-parser.plugin.json) — detector plugin
- [`plugins/timestamp-generator.plugin.json`](plugins/timestamp-generator.plugin.json) — generator plugin

---

## Maintaining the Index

The [`index.json`](index.json) file is auto-generated — **do not edit it by hand**.  
Always regenerate it after changing any plugin file:

```bash
node generate-index.js
```

The script:
- Reads all `plugins/*.plugin.json` files
- Validates required fields (type-aware for detector vs generator)
- Preserves `downloads` and `publishedAt` from the previous `index.json`
- Writes a sorted, stable `index.json`

