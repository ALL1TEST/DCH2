/**
 * Utility to convert Markdown output from AI generators into semantic HTML
 * expected by rich-text visual editors (such as Tiptap / ProseMirror).
 */

import { micromark } from 'micromark';
import { gfmTable, gfmTableHtml } from 'micromark-extension-gfm-table';

export function markdownToEditorHtml(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  let text = markdown.trim();

  // Strip enclosing code fences if the model output the entire article in a code block
  if (text.startsWith('```markdown') && text.endsWith('```')) {
    text = text.slice(11, -3).trim();
  } else if (text.startsWith('```html') && text.endsWith('```')) {
    text = text.slice(7, -3).trim();
  } else if (text.startsWith('```') && text.endsWith('```')) {
    text = text.slice(3, -3).trim();
  }

  // If text already appears to be pure HTML (e.g., starts with block tag and has no markdown headings)
  if (/^\s*<(?:article|section|div|p|h[1-6]|ul|ol|table)\b/i.test(text) && !/(?:^|\n)#{1,6}\s+/m.test(text)) {
    return text;
  }

  try {
    const html = micromark(text, {
      extensions: [gfmTable()],
      htmlExtensions: [gfmTableHtml()],
      allowDangerousHtml: true,
    });

    return html.trim();
  } catch (err) {
    console.error('[MARKDOWN_TO_HTML] Conversion error, falling back to basic conversion:', err);
    // Basic fallback for standard headings and paragraphs
    return text
      .split(/\n\s*\n/)
      .map((block) => {
        const trimmed = block.trim();
        if (/^#\s+(.+)$/.test(trimmed)) return `<h1>${trimmed.replace(/^#\s+/, '')}</h1>`;
        if (/^##\s+(.+)$/.test(trimmed)) return `<h2>${trimmed.replace(/^##\s+/, '')}</h2>`;
        if (/^###\s+(.+)$/.test(trimmed)) return `<h3>${trimmed.replace(/^###\s+/, '')}</h3>`;
        if (/^####\s+(.+)$/.test(trimmed)) return `<h4>${trimmed.replace(/^####\s+/, '')}</h4>`;
        return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
      })
      .join('\n');
  }
}
