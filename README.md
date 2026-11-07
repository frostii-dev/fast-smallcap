# Fast SmallCaps

A syntax-aware, string-value-only small caps converter for Minecraft configuration files.

## Features

- **Format-aware conversion**: Only converts actual string values in YAML, JSON, and Properties files
- **Preserves structure**: Keys, numbers, booleans, null, comments, and formatting remain unchanged
- **Minecraft-aware protection**: Placeholders (`{player}`, `<player>`, `%player%`), formatting codes (`&a`, `§c`), and hex colors (`#FF00AA`, `&#FF00AA`, `§x§R§R§G§G§B§B`) are preserved by default
- **Configurable protection rules**: Toggle individual protection rules via the Conversion Rules dropdown
- **Monaco Editor**: Full syntax highlighting, line numbers, word wrap, font size control
- **Dark theme**: Developer-friendly dark UI with teal/emerald accents
- **File operations**: Open, copy, download, and clear with original filename preservation

## Supported Formats

- `.yaml` / `.yml`
- `.json`
- `.properties`

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run test     # Run unit tests (vitest)
npm run typecheck # TypeScript type checking
npm run lint     # ESLint
npm run format   # Prettier formatting
```

## Tech Stack

- Vite 8 (rolldown) + React 19 + TypeScript
- shadcn/ui with @base-ui/react
- Tailwind CSS v4
- Monaco Editor (bundled locally)
- yaml (YAML parsing) + @humanwhocodes/momoa (JSON parsing) + dot-properties (Properties parsing)
- Vitest for testing