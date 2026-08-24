import { defaultSchema, type Schema } from "hast-util-sanitize";

// rehype-pretty-code (Shiki) inlines per-token colors via `style`, and tags
// code blocks/lines with data-language/data-theme/data-line/data-highlighted-*
// attributes for CSS hooks. The default sanitize schema strips all of that
// (it only allows a language-* className on <code>), which would silently
// kill syntax highlighting -- so this schema adds exactly what rehype-pretty-code
// emits, nothing broader.
export const markdownSanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "figure"],
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span ?? []), "style", "dataLine", "dataHighlightedLine", "dataHighlightedChars"],
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      "style",
      "dataLanguage",
      "dataTheme",
      "dataLineNumbers",
      "dataLineNumbersMaxDigits",
    ],
    pre: [...(defaultSchema.attributes?.pre ?? []), "style", "dataLanguage", "dataTheme"],
    figure: ["dataRehypePrettyCodeFigure"],
  },
};
