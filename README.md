# Fast SmallCaps

Convert text values into Unicode small caps while preserving file structure.

Fast SmallCaps is a syntax-aware converter for YAML, JSON, and Properties files.
It transforms eligible string values into small-cap Unicode characters while
leaving keys, numbers, booleans, null, comments, and formatting untouched.

## Features

- **Syntax-aware conversion** — Only actual string values are converted; file
  structure survives byte-for-byte.
- **Three supported formats** — YAML (`.yaml`, `.yml`), JSON (`.json`), and
  Properties (`.properties`).
- **Real-time and manual modes** — Auto Convert updates output automatically as
  you type; switch to manual mode to convert only when you click.
- **14 configurable protection rules** — Preserve placeholders, Minecraft
  formatting codes, hex colors, Unicode escapes, emoji, square brackets, and
  more. Toggle any rule individually or use Enable All / Disable All /
  Reset Defaults.
- **Textual values only** — For Properties files, skip plain numeric, boolean,
  and null values.
- **Dual Monaco Editor panels** — Original and converted views side by side,
  with syntax highlighting, word wrap, and adjustable font size.
- **Persistent workspace** — Documents, converted output, conversion rules, and
  editor preferences survive browser reloads via IndexedDB and localStorage.
- **Copy and download** — Copy converted output to the clipboard or download it
  as a file with the original name and format.

## Getting Started

### Requirements

- Node.js 24+
- npm

### Installation

```bash
npm install
```

### Development server

```bash
npm run dev
```

Starts the Vite dev server. Monaco Editor is bundled locally, so the first
start may take a moment while workers pre-bundle.

### Production build

```bash
npm run build
```

Runs TypeScript project references (`tsc -b`) followed by `vite build`.
Output goes to `dist/`.

### Other scripts

```bash
npm test        # Run unit tests (vitest)
npm run typecheck # TypeScript type checking
npm run lint    # ESLint
npm run format  # Prettier formatting
npm run preview # Preview production build locally
```

## Usage

### Loading documents

Click the folder icon in the toolbar or drag a supported file (`.yaml`, `.yml`,
`.json`, `.properties`) into the app. Unsupported file types are rejected with
an error shown in the status bar.

### Configuring conversion rules

Open the Conversion Rules dropdown from the toolbar to toggle individual
protection rules:

- **Placeholders** — `{example}`, `<example>`, `%example%`
- **Minecraft formatting** — `&` codes, `§` codes, `§x§R§R§G§G§B§B` hex
- **Hex colors** — `&#RRGGBB`, standalone `#RRGGBB`, embedded `#RRGGBB`
- **Escapes** — Unicode escapes (`\uXXXX`) and generic escapes (`\n`, `\t`,
  `\\`, `\"`, etc.)
- **Emoji removal** — Remove emoji characters, with optional left/right space
  removal
- **Square brackets** — Preserve `[...]` content

Use **Enable All**, **Disable All**, or **Reset Defaults** to apply changes to
all rules at once.

### Auto Convert vs manual conversion

Auto Convert is enabled by default. When on, the converted output updates
automatically (debounced 300ms) whenever source content or conversion rules
change, and the Convert button is disabled.

When Auto Convert is off, the Convert button becomes clickable. Editing the
source or changing rules does not update the output until you click Convert.
Switching from manual back to auto performs an immediate fresh conversion.

### Exporting converted content

Use **Copy Output** to copy the converted text to the clipboard, or **Download**
to save it as a file preserving the original name and format.

## Supported Formats and Limitations

| Format | Extensions | Notes |
|--------|------------|-------|
| YAML | `.yaml`, `.yml` | Only string scalar values convert. Keys, numbers, booleans, null, aliases, and comments are untouched. |
| JSON | `.json` | Only string values convert. Member names, numbers, booleans, and null are untouched. Invalid JSON shows an error and produces no output. |
| Properties | `.properties` | Only string values convert. With "Textual values only" enabled, plain numeric, boolean, and null values are skipped. |

Conversion targets eligible textual values only — never keys, structure, or
non-string literals. Formatting outside converted ranges survives byte-for-byte.
Invalid YAML or JSON produces an error and empty output rather than silently
modifying the file.

## Technology Stack

- **React 18** — UI framework
- **TypeScript 5** — Type safety
- **Vite 7** — Build tool and dev server (rolldown)
- **Tailwind CSS v4** — Styling
- **shadcn/ui** — UI components (built on `@base-ui/react`)
- **Monaco Editor** — Code editor (bundled locally, not CDN)
- **`yaml`** — YAML parsing
- **`@humanwhocodes/momoa`** — JSON parsing
- **`dot-properties`** — Properties file parsing
- **`emoji-regex`** — Unicode-aware emoji detection
- **Vitest** — Unit testing
- **Playwright** — End-to-end testing

## Project Structure

```
src/
├── App.tsx              # Application root
├── main.tsx             # Entry point
├── index.css            # Global styles
├── components/          # UI components
│   ├── EditorPanel.tsx  # Monaco Editor wrapper
│   ├── Header.tsx       # App header
│   ├── StatusBar.tsx    # File info and validation status
│   ├── Toolbar.tsx      # Controls and conversion rules
│   └── ui/              # shadcn/ui primitives
├── hooks/
│   └── useConverter.ts  # Conversion logic and persistence
├── lib/
│   ├── converter.ts     # Pure small-caps span engine
│   ├── document-converter.ts # Syntax-aware document conversion
│   ├── protected-patterns.ts # Combined protection regex
│   ├── protection-config.ts  # Protection rule config
│   ├── idb.ts           # IndexedDB persistence wrapper
│   ├── validation.ts    # Syntax validation
│   ├── file-utils.ts    # File format helpers
│   ├── monaco-setup.ts  # Monaco editor configuration
│   └── utils.ts         # Shared utilities
├── types/
│   └── index.ts         # TypeScript type definitions
└── workers/             # Monaco Editor web workers
```

## License

This project is licensed under the MIT License.