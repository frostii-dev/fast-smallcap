// Monaco's ESM worker entry points have no bundled type declarations.
// These ambient declarations exist so the side-effect imports in
// src/lib/workers/*.ts typecheck. Subpaths follow the package's exports
// map ("monaco-editor/<path>.js" -> "esm/vs/<path>.js").
declare module "monaco-editor/editor/editor.worker.js";
declare module "monaco-editor/language/json/json.worker.js";
