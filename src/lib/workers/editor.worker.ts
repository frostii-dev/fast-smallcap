// Wrapped so Vite can bundle Monaco's worker via monaco-setup's ?worker
// import (rolldown cannot resolve "?worker" directly inside the package's
// exports map).
import "monaco-editor/editor/editor.worker.js";
