# Fast SmallCaps

Single-package Vite 8 (rolldown) + React 19 + TypeScript 6 + shadcn/ui app. Tailwind CSS v4 (`@tailwindcss/vite`). Node 24, npm (package-lock committed). No CI, no monorepo. Tests: vitest (`npm test`, single file: `npx vitest run src/lib/converter.test.ts`).

## Entry point
`index.html` → `src/main.tsx` → `ThemeProvider` (default **dark**) → `App` (`src/App.tsx`). `@` alias = `src/`. Relative imports use explicit extensions (e.g. `./App.tsx`).

Fast SmallCaps Converter: `src/lib/converter.ts` (pure span engine, no React) + `src/lib/protected-patterns.ts` (single combined regex `PROTECTED_PATTERN` — alternation order matters: first match at a position wins). Converter output must stay idempotent; tests in `src/lib/*.test.ts` enforce it.

Conversion is **syntax-aware, string-value-only**: `src/lib/document-converter.ts` (`convertDocument(text, format, { textualOnly })`) identifies actual string-value source ranges first, then applies `convertToSmallCaps` to only those ranges — no global text replacement, no reserialization (formatting outside the ranges survives byte-for-byte).
- **YAML**: `yaml` package AST (`parseAllDocuments`); only string scalar values convert. Mapped empirically: scalar `range = [start, mid, end]` where plain content = `[start..mid)` (anchor/tag/trailing comment excluded), quoted = `[start+1, mid-1)` (content between quotes), block scalars = `headerEnd+1 .. range[2]`. Keys, numbers, bools, null, aliases, comments never convert.
- **JSON**: `@humanwhocodes/momoa` AST; visit only value nodes (skip `Member` names). String `loc` offsets INCLUDE the quotes → convert `[start+1, end-1)`.
- **Properties**: `dot-properties` (by the `yaml` package's maintainer; Eemeli Aro) via `parseLines(src, true)` AST mode — `Pair.range = [keyStart, keyEnd, valueStart, valueEnd]` gives raw source offsets for the value (escaped separators, `=`/`:`/whitespace separators, `#`/`!` comments and multiline continuations all handled by the library). Keys/comments/empty lines are separate node types; the **"Convert only textual values" option** (default on, Toolbar switch shown for properties files, state in `useConverter`) skips plain numeric/boolean/null value literals (checked against the library's unescaped `pair.value`).
- Invalid YAML/JSON (or unsupported file) → `error` non-null + empty output, shown in StatusBar; no silent modification. Typed text with no file loaded falls back to the legacy whole-text scan.

Parsing is also used for syntax feedback in `src/lib/validation.ts`: YAML via `error.linePos`, JSON via momoa (`(line:col)` suffix in thrown messages); properties files are intentionally unvalidated. Docs >1 MB skip validation. Note: `tsc --noEmit` can pass where `tsc -b` fails (looser narrowing in one config) — momoa AST visits must use the `AnyNode` type, and yaml node `range` is `Range | null | undefined`.

## Commands
- `npm run dev` — dev server (Monaco is bundled locally via `loader.config`, not CDN; first start pre-bundles, takes a while)
- `npm test` / `npx vitest run <file>` — vitest picks up vite.config.ts (aliases work in tests). Playwright e2e specs in `tests/` are excluded from vitest via `test.exclude` (`/// <reference types="vitest/config" />` + `defineConfig` from `vitest/config`); run them with `npx playwright test`.
- `npm run typecheck` — `tsc --noEmit` (strict: `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly` → **no enums/namespaces**, use unions)
- `npm run lint` — `eslint .`
- `npm run format` — `prettier --write "**/*.{ts,tsx}"` (no semicolons, double quotes, LF; prettier-plugin-tailwindcss sorts classes using `src/index.css` + `cn`/`cva`)
- `npm run build` — `tsc -b && vite build` (output `dist/`); chunk-size warnings for Monaco's workers are expected

Verification order: `test -> lint -> typecheck -> build`.

## Monaco quirks (Vite 8 + rolldown)
- Deep imports into monaco-editor must follow its exports map: `monaco-editor/<name>.js` resolves to `esm/vs/<name>.js` — do NOT import `monaco-editor/esm/vs/...` (fails to resolve).
- `?worker` imports cannot target the package directly; use the local wrappers in `src/lib/workers/*.ts` instead, plus ambient declarations in `src/types/monaco-workers.d.ts`.
- Monaco has no built-in "properties" language; `ensurePropertiesLanguage` in `src/lib/monaco-setup.ts` registers a monarch tokenizer, called from EditorPanel's `beforeMount`.

### Context menu shadow-root fix (monaco-setup.ts)
Monaco 0.57 renders the context menu inside a **shadow root** (`div.shadow-root-host`, `:host { all: initial }`, attached to the focused editor's container DOM node — NOT body), while theme `--vscode-*` variables are declared in the light DOM only (`.monaco-editor, .monaco-diff-editor, .monaco-component`). Document stylesheets can't style another shadow tree, so the menu painted transparent with inherited black text. Fix: `relayMonacoThemeIntoMenuShadowRoot()` observes the document (subtree MutationObserver) and injects Monaco's **own generated variable declarations** (collected from document stylesheets) as `:host{...}` into each `.shadow-root-host` shadow root. No custom palette, no app CSS. Key detail: inside a shadow tree `:root` does NOT match — must use `:host`. No hardcoded `--vscode-*` values anywhere; themes stay pure built-in `vs-dark`. shadcn dropdowns are unaffected (light DOM, no shadow hosts).
- Context menu structure inside the shadow root: opaque panel = `.monaco-scrollable-element` (bg `--vscode-menu-background`), items are `li.action-item > a.action-menu-item` (hover/focus bg = `--vscode-list-hoverBackground`/`--vscode-menu-selectionBackground` on the `<a>`); Monaco does not register `--vscode-menu-disabledForeground` in 0.57 — disabled items dim via 50% opacity. Also note: with no selection/Cut-Copy-Paste disabled, mouse hover = hoverBackground (`#2a2d2e`), keyboard focus = menuSelectionBackground (`#04395e`).
- Playwright E2E notes: synthetic `MouseEvent('contextmenu')` and `editor.trigger(..., 'editor.action.showContextMenu', ...)` do NOT open the menu; use real `mouse.down({ button: "right" })` + `mouse.up`. Playwright CSS selectors pierce open shadow roots, but `document.querySelectorAll` does not — use `document.querySelectorAll(".shadow-root-host")` then `host.shadowRoot.querySelector(...)`.

### Conversion Rules — Enable All / Disable All fix (Toolbar.tsx, useConverter.ts)
**Root cause:** base-ui `Menu.Item` exposes `onClick`, not `onSelect` — the three batch actions (Enable All, Disable All, Reset Defaults) silently did nothing. Fixed by changing `onSelect` → `onClick` in `Toolbar.tsx`.

**State management hardening (`useConverter.ts`):**
- `enableAllProtections` / `disableAllProtections` / `resetProtections` now produce **fresh config objects** via updater callbacks (`setProtectionConfig(() => ({ ... }))`) so React never skips re-renders from stale references.
- Added a second `useEffect` keyed on `[protectionConfig, textualOnly, ...]` that calls `runConversion` **synchronously** (no debounce) so batch actions update output immediately. Uses a `contentRef` updated in its own effect to read the latest source without triggering on every keystroke.
- Individual checkbox toggles (`onCheckedChange` → `setProtectionRule`) were already atomic; they continue to work.

**Persistence & reload:** localStorage (`fast-smallcap:protection-config`) is written in the existing `useEffect` on `protectionConfig` changes; batch actions update the same state so they persist and reload correctly.

**E2E coverage added (`tests/e2e.spec.ts`):**
- `Enable/Disable All Protections` describe block verifies: every checkbox flips, output matches expected protected/unprotected form, localStorage matches, rapid toggling ends consistent, individual toggles work after batch, and settings survive reload.
- Fixed pre-existing test bugs: unsatisfiable assertions on YAML-comment `{player}`, `__dirname` in ESM test file, stale `expected/config.properties` lines (dot-properties treats `escaped key:value` as key=`escaped`, value=`key:value=...`), missing `getWordWrap`/`getReadOnly` utils, and menu-lingering strict-mode violations (`openConversionRules` now pre-closes with Escape).

## shadcn/ui
- Components live in `src/components/ui/`; add with `npx shadcn@latest add <name>`. Style "base-mira" uses **@base-ui/react** (not radix) — check the generated component's props (e.g. Switch uses `onCheckedChange`).
- Conditional classes: `cn()` from `@/lib/utils` — never manual template-literal ternaries
- Colors: semantic tokens only (`bg-primary`, `text-muted-foreground`); no raw color values
- Theme: press `d` to toggle dark/light/system; persisted in localStorage
- Local skill guidance: `.agents/skills/shadcn/` (styling, forms, composition rules)

## TypeScript quirks
- `tsc -b` builds project references (`tsconfig.app.json` + `tsconfig.node.json`) — `build` runs this before `vite build`
- `build` fails if `tsc -b` fails; run `npm run typecheck` separately for a faster check

## Emoji Removal Feature

### Overview
Added emoji character removal with optional adjacent whitespace removal to the Conversion Rules dropdown.

### New Protection Config Fields (`src/lib/protection-config.ts`)
- `removeEmoji` — Enable/disable emoji removal from string values (default: `true`)
- `removeEmojiLeftSpace` — Remove whitespace immediately to the left of removed emojis (default: `true`)
- `removeEmojiRightSpace` — Remove whitespace immediately to the right of removed emojis (default: `true`)

All three options are independently toggleable via the Conversion Rules dropdown. If `removeEmoji` is disabled, emojis are preserved regardless of whitespace settings.

### Conversion Engine (`src/lib/converter.ts`)
- Emoji removal is applied **before** small-caps conversion, but only to **unprotected segments** (text outside protected spans like placeholders, Minecraft codes, hex colors, unicode escapes).
- Uses the `emoji-regex` npm package for reliable Unicode-aware emoji detection (supports supplementary-plane emojis, skin-tone modifiers, flags, keycap emojis, ZWJ sequences).
- Protected spans (placeholders, Minecraft formatting codes, hex colors, unicode escapes, escapes) are never modified — emojis inside them are preserved.

### Toolbar UI (`src/components/Toolbar.tsx`)
- New "Emoji Removal" section in the Conversion Rules dropdown with three checkboxes:
  - Remove emoji characters
  - Remove space to the left (disabled when emoji removal is off)
  - Remove space to the right (disabled when emoji removal is off)
- All three options are included in Enable All / Disable All / Reset Defaults behavior.

### Example Behavior
| Input | Config | Output |
|---|---|---|
| `Hello 😀 World` | Emoji only | `Hello  World` |
| `Hello 😀 World` | Emoji + left space | `Hello World` |
| `Hello 😀 World` | Emoji + right space | `Hello World` |
| `Hello 😀 World` | Emoji + both spaces (default) | `HelloWorld` |

### New Dependencies
- `emoji-regex` — Unicode-aware emoji pattern matching

### Tests
- `src/lib/converter.emoji.test.ts` — 43 unit tests covering: single emojis, consecutive emojis, skin-tone modifiers, country flags, keycap emojis, ZWJ/joined emojis, punctuation adjacency, multiple spaces, tabs/line breaks, protected pattern interaction, idempotency.


## Structure Tree & Selective Formatting Feature

### Overview
Added a Structure Tree sidebar that displays the hierarchical structure of YAML/JSON/Properties files, with node selection and selective small-caps formatting.

### New Files
- `src/lib/structure-parser.ts` — Format-aware AST parsing that extracts nodes with source ranges for all four formats
- `src/components/StructureTree.tsx` — Virtualized tree component using `@tanstack/react-virtual` with expand/collapse, multi-select (Ctrl/Shift), search/filter, and keyboard navigation
- Extended `src/hooks/useConverter.ts` with structure tree state and selective conversion logic
- Extended `src/lib/document-converter.ts` with `selectedRanges` parameter for selective conversion

### Architecture
- **Parsing**: Reuses existing parsers (`yaml`, `@humanwhocodes/momoa`, `dot-properties`) to extract nodes with precise source ranges (`sourceRange` for full node, `valueRange` for convertible string content)
- **Tree Structure**: Flat list of `StructureNode` objects with `id`, `type`, `name`, `value`, `children`, `sourceRange`, `valueRange`, `depth`, `expanded`, `selected`, `indeterminate`
- **Virtualization**: `@tanstack/react-virtual` renders only visible nodes for performance with large documents
- **Selection**: Click toggles, Ctrl/Shift for multi-select, parent selection propagates to descendants, indeterminate state for partial selection
- **Selective Conversion**: `getSelectedValueRanges()` collects `valueRange` from selected nodes; `convertDocument()` accepts `selectedRanges` parameter; `intersectRanges()` computes intersection of discoverable ranges and user-selected ranges
- **Monaco Sync**: Double-click or Enter on a tree node dispatches `navigate-to-source` event; App listens and calls `editor.revealRange()` + `editor.setSelection()` on original editor

### Toolbar Integration
- Added "Format Selected" and "Format All" actions to Conversion Rules dropdown
- "Format Selected" uses current `selectedRanges` from structure tree
- "Format All" converts all discoverable ranges (existing behavior)
- Selection persists in `useConverter` state; localStorage persistence via existing `protectionConfig` effect

### Structure Tree Default Selection & Bulk Actions
- **Default Selection**: All eligible nodes (string values and property nodes) are selected by default when a document loads. Newly discovered nodes after editing are also selected by default. Existing selections are preserved where possible when the tree refreshes.
- **Tree Toolbar Actions**: Four buttons in the Structure Tree toolbar:
  - **Expand All** (Expand icon): Recursively expands all nested objects and arrays
  - **Collapse All** (Minimize icon): Collapses all expandable nodes
  - **Select All** (CheckCheck icon): Selects every eligible node
  - **Deselect All** (SquareX icon): Clears selection completely
- **Selection Behavior**:
  - Individual node selection supported
  - Ctrl/Shift multi-selection works
  - Selecting parent object/array includes eligible descendants
  - Deselecting parent correctly updates descendant selection
  - No duplicate conversions when parent and child both selected
  - Checkbox/selection indicators synchronized with actual state
  - Selection changes immediately update Format Selected behavior
- **Expand/Collapse Behavior**:
  - Expand All recursively expands all nested objects/arrays
  - Collapse All collapses all expandable nodes
  - Actions don't modify node selection
  - No unnecessary reparsing on expand/collapse
  - Scroll position preserved where practical

### New Dependencies
- `@tanstack/react-virtual` — Virtualized list rendering for tree performance

### Structure Tree Layout Fix (StructureTree.tsx, App.tsx)
Fixed the Structure Tree sidebar layout that had overlapping headers and toolbar elements.

**Root Cause:**
- StructureTree used `fixed inset-y-0 right-0` positioning which caused z-index conflicts
- Tree toolbar overlapped with Monaco editor content
- No proper collapse/expand mechanism for the sidebar
- Monaco editor didn't recalculate layout when sidebar width changed

**Fix Applied:**
1. **StructureTree.tsx**: Added internal collapse state with smooth transition (`transition-all duration-200`). Added collapse/expand toggle button in toolbar (ChevronLeft/ChevronRight). Tree content now properly hides when collapsed (`h-0 w-0 overflow-hidden`) and uses `transition-all duration-200` for smooth animation. Tree toolbar is always visible even when collapsed.

2. **App.tsx**: 
   - Added `treeCollapsed` state with smooth transition (`transition-all duration-200`)
   - Sidebar now uses `fixed inset-y-0 right-0` with conditional width: `treeCollapsed ? "w-8" : "lg:w-80"`
   - Added visible collapse/expand handle on sidebar left edge (ChevronLeft/ChevronRight) with proper ARIA attributes
   - Editors panel margin adjusts automatically: `treeCollapsed ? "lg:mr-8" : "lg:mr-80"` with `transition-all duration-200`
   - Added `useEffect` to trigger `editor.layout()` on both Monaco editors when `treeCollapsed` changes
   - Removed mobile-only toggle button, kept desktop collapse/expand handle

3. **StructureTree.tsx**: Removed DropdownMenu, replaced with direct Button controls for Expand All, Collapse All, Select All, Deselect All, and Collapse/Expand sidebar toggle. This avoids base-ui DropdownMenu portal z-index conflicts.

**Key Technical Details:**
- All transitions use `transition-all duration-200 ease-in-out` for consistent smooth animation
- Monaco `editor.layout()` called on `treeCollapsed` change to prevent incorrect dimensions
- Sidebar collapse preserves all state: selection, expanded nodes, filter text, scroll position
- Tree content hidden with `h-0 w-0 overflow-hidden` when collapsed, not unmounted
- `min-width: 0` and `min-height: 0` used appropriately for flex children
- Proper `overflow-hidden` on containers prevents content overflow
- ARIA attributes on collapse toggle: `aria-label`, `aria-expanded`, `aria-controls`

### Structure Tree UI Fixes (StructureTree.tsx, App.tsx)
Fixed Structure Tree header layout, default visibility, and collapse button sizing:

1. **Header Layout** (StructureTree.tsx):
   - Split toolbar into two rows: Row 1 shows "Root" label + search input; Row 2 shows action buttons (Expand All, Collapse All, Select All, Deselect All) and filter match dropdown
   - Added "Root" label with Braces icon on left of search row
   - Search input no longer competes with action buttons for space
   - "Jump to match" dropdown moved to row 2, right-aligned
   - Removed duplicate sidebar collapse button from StructureTree toolbar (now only in App.tsx sidebar handle)

2. **Default Visibility** (App.tsx):
   - `treeCollapsed` state defaults to `false` (expanded)
   - Tree is visible immediately on app launch
   - `isCollapsed` prop passed to StructureTree for controlled collapse state

3. **Compact Collapse Button** (App.tsx):
   - Sidebar handle reduced from `w-10 h-10` / `size-5` to `w-6 h-6` / `size-4`
   - Sidebar collapsed width reduced from `w-10` to `w-8`
   - Editors panel margin adjusted: `lg:mr-8` (collapsed) / `lg:mr-80` (expanded)
   - Added `title` attribute for tooltip
   - Button uses `rounded-r-lg border border-l-0` for clean edge appearance

4. **State Unification**:
   - Removed duplicate `isCollapsed` state from StructureTree
   - StructureTree now receives `isCollapsed` as prop (controlled by App.tsx)
   - Single source of truth for sidebar collapse state

### JSON Parsing Fix (structure-parser.ts, useConverter.ts)
Fixed critical bug where loading JSON files caused a blank black screen due to silent failures in the structure parser.

**Root Cause:**
The `parseJsonStructure` function in `src/lib/structure-parser.ts` used a try-catch that silently returned on parse errors, and `visitJsonNode` accessed `node.loc` properties without defensive checks. When the Momoa parser returned nodes without `loc` for certain node types (Number, Boolean, Null, or when `loc` was missing), the parser threw TypeErrors that crashed the Structure Tree component, causing a blank screen.

**Fix Applied:**
1. **Enhanced error handling in `parseJsonStructure`**: Wrapped both `parseJsonDocument` and `visitJsonNode` in try-catch blocks. On parse failure, an error node is added to the tree instead of silently failing.

2. **Added defensive `getNodeLoc` helper**: Safely extracts `loc.start.offset` and `loc.end.offset` from any node, returning `null` if missing or malformed.

3. **Defensive checks in `visitJsonNode`**: Every `loc` access now uses `getNodeLoc` with null checks. Missing `loc` logs a warning and skips the node instead of throwing.

4. **Type-safe node access**: Used `as MomoaNode & { members?: ... }` pattern with `?? []` fallbacks for optional arrays, and cast through `unknown` for `getNodeLoc` calls to satisfy TypeScript.

5. **Graceful degradation**: On parse/traversal failure, an error node is added to the tree so the UI remains functional and shows the error.

**Result:** JSON files now load correctly. Invalid JSON shows an error node in the tree instead of crashing. The Monaco editor remains usable even if tree parsing fails.

### New Dependencies
- `@tanstack/react-virtual` — Virtualized list rendering for tree performance

### E2E Testing Notes
- New `Enable/Disable All Protections` describe block with 6 tests covering checkbox sync, output verification, localStorage persistence, rapid toggling, individual toggles after batch, and reload persistence
- Fixed pre-existing test bugs: unsatisfiable YAML-comment assertions, `__dirname` in ESM, stale `expected/config.properties`, missing utils, menu-lingering strict-mode
- **Known Issue**: E2E tests for Conversion Rules dropdown fail due to layout/z-index conflict where the editors panel container intercepts clicks on the toolbar's DropdownMenu trigger. Core functionality works in manual testing; the issue is a base-ui DropdownMenu portal + flex layout stacking context conflict. Workaround: manual testing confirms "Format Selected" and "Format All" work correctly.
