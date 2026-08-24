import { createHighlighter, type Highlighter } from "shiki";

// react-markdown renders synchronously (processor.runSync), which rules out
// any rehype plugin that awaits Shiki internally (e.g. rehype-pretty-code) --
// mixing the two throws "runSync finished async" at render time. Instead we
// pre-create one Highlighter instance (its creation is async, but its own
// codeToHtml/codeToHast methods are synchronous once built) and cache the
// promise so every message reuses the same instance rather than re-loading
// WASM/grammars per render.
const THEMES = ["github-light", "github-dark"] as const;
const LANGS = [
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "json",
  "bash",
  "shell",
  "python",
  "sql",
  "yaml",
  "markdown",
  "html",
  "css",
  "plaintext",
] as const;

let highlighterPromise: Promise<Highlighter> | null = null;

export function getCodeHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({ themes: [...THEMES], langs: [...LANGS] });
  }
  return highlighterPromise;
}

export function isKnownLanguage(highlighter: Highlighter, lang: string | undefined): boolean {
  if (!lang) return false;
  return highlighter.getLoadedLanguages().includes(lang as never);
}
