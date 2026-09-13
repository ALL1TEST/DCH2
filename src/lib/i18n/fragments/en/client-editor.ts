// ============================================================
// i18n — FRAGMENT: TipTap rich-text editor (English)
// ============================================================
// Every user-facing string of src/components/editor/tiptap-editor.tsx:
// toolbar tooltips/titles, dropdown labels, placeholders, table
// context menu, find/replace bar, media/link/comment bars, emoji
// picker, color picker and the toggle-block template text. Keys
// follow the 'editor.<camelCaseName>' convention. en = source of
// truth; the t() fallback chain renders these for every locale
// that lacks a curated translation.
// ============================================================

export const clientEditorEn: Record<string, string> = {
  // ---- Editor mode ----
  'editor.editing': 'Editing',
  'editor.viewing': 'Viewing',

  // ---- History & clipboard ----
  'editor.undo': 'Undo (Ctrl+Z)',
  'editor.redo': 'Redo (Ctrl+Y)',
  'editor.copy': 'Copy',
  'editor.paste': 'Paste',
  'editor.pastePlain': 'Paste without formatting (Shift+Paste)',

  // ---- Import / Export ----
  'editor.import': 'Import',
  'editor.importFromFiles': 'From HTML / Markdown / Text',
  'editor.importFromWord': 'From Word (.docx)',
  'editor.export': 'Export',
  'editor.exportHtml': 'Export as HTML',
  'editor.exportMarkdown': 'Export as Markdown',
  'editor.exportPdf': 'Export as PDF',
  'editor.exportImage': 'Export as Image',
  'editor.exportWord': 'Export as Word (.doc)',

  // ---- Font family / size / line height ----
  'editor.font': 'Font',
  'editor.fontDefault': 'Default',
  'editor.smallerFont': 'Smaller font',
  'editor.largerFont': 'Larger font',
  'editor.size': 'Size',
  'editor.line': 'Line',
  'editor.lineSingle': 'Single (1)',
  'editor.lineOneHalf': '1.5x',
  'editor.lineDouble': 'Double (2)',
  'editor.textColor': 'Text Color',
  'editor.backgroundColor': 'Background Color',

  // ---- Color picker ----
  'editor.defaultColors': 'Default Colors',
  'editor.customColor': 'Custom Color',
  'editor.apply': 'Apply',
  'editor.clear': 'Clear',

  // ---- Color names (swatch tooltips) ----
  'editor.colorDefault': 'Default',
  'editor.colorNone': 'None',
  'editor.colorRed': 'Red',
  'editor.colorOrange': 'Orange',
  'editor.colorAmber': 'Amber',
  'editor.colorYellow': 'Yellow',
  'editor.colorGreen': 'Green',
  'editor.colorTeal': 'Teal',
  'editor.colorBlue': 'Blue',
  'editor.colorIndigo': 'Indigo',
  'editor.colorPurple': 'Purple',
  'editor.colorPink': 'Pink',
  'editor.colorSlate': 'Slate',
  'editor.colorWhite': 'White',

  // ---- Turn into (block type) ----
  'editor.turnInto': 'Turn into',
  'editor.text': 'Text',
  'editor.paragraph': 'Paragraph',
  'editor.bulletedList': 'Bulleted list',
  'editor.numberedListLabel': 'Numbered list',
  'editor.heading1': 'Heading 1',
  'editor.heading2': 'Heading 2',
  'editor.heading3': 'Heading 3',
  'editor.heading4': 'Heading 4',
  'editor.heading5': 'Heading 5',
  'editor.heading6': 'Heading 6',

  // ---- Inline formatting ----
  'editor.bold': 'Bold',
  'editor.boldTooltip': 'Bold (Ctrl+B)',
  'editor.italic': 'Italic',
  'editor.italicTooltip': 'Italic (Ctrl+I)',
  'editor.underline': 'Underline',
  'editor.underlineTooltip': 'Underline (Ctrl+U)',
  'editor.strikethrough': 'Strikethrough',
  'editor.superscript': 'Superscript',
  'editor.subscript': 'Subscript',
  'editor.highlight': 'Highlight',
  'editor.link': 'Link',
  'editor.clearFormatting': 'Clear Formatting',
  'editor.codeBlock': 'Code Block',

  // ---- Lists ----
  'editor.bulletList': 'Bullet List',
  'editor.numberedList': 'Numbered List',
  'editor.listStyleOptions': 'List style options',
  'editor.numberingStyleOptions': 'Numbering style options',
  'editor.checklist': 'Checklist',
  'editor.increaseIndent': 'Increase Indent',
  'editor.decreaseIndent': 'Decrease Indent',
  'editor.listStyleDecimal': 'Decimal',
  'editor.listStyleLowerAlpha': 'Lower Alpha',
  'editor.listStyleUpperAlpha': 'Upper Alpha',
  'editor.listStyleLowerRoman': 'Lower Roman',
  'editor.listStyleUpperRoman': 'Upper Roman',
  'editor.listStyleDefaultDisc': 'Default (Disc)',
  'editor.listStyleCircle': 'Circle',
  'editor.listStyleSquare': 'Square',

  // ---- Alignment ----
  'editor.align': 'Align',
  'editor.alignLeft': 'Align Left',
  'editor.alignCenter': 'Align Center',
  'editor.alignRight': 'Align Right',
  'editor.alignJustify': 'Justify',

  // ---- Insert menu / media buttons ----
  'editor.insert': 'Insert',
  'editor.keyboardInput': 'Keyboard Input',
  'editor.insertLink': 'Insert Link',
  'editor.insertImage': 'Insert Image',
  'editor.insertVideo': 'Insert Video',
  'editor.insertAudio': 'Insert Audio',
  'editor.mention': 'Mention (@)',

  // ---- Emoji picker ----
  'editor.emoji': 'Emoji',
  'editor.searchEmoji': 'Search by keyword (smile, heart, ...)',
  'editor.noEmojisFoundFor': 'No emojis found for',
  'editor.emojiCatSmileys': 'Smileys & People',
  'editor.emojiCatAnimals': 'Animals & Nature',
  'editor.emojiCatFood': 'Food & Drink',
  'editor.emojiCatActivity': 'Activity',
  'editor.emojiCatTravel': 'Travel & Places',
  'editor.emojiCatObjects': 'Objects',
  'editor.emojiCatSymbols': 'Symbols',
  'editor.emojiCatFlags': 'Flags',

  // ---- Find & Replace ----
  'editor.findReplace': 'Find & Replace (Ctrl+F)',
  'editor.find': 'Find...',
  'editor.replace': 'Replace...',
  'editor.found': 'found',
  'editor.next': 'Next',
  'editor.replaceButton': 'Replace',
  'editor.all': 'All',

  // ---- Fullscreen ----
  'editor.fullscreen': 'Fullscreen',
  'editor.exitFullscreen': 'Exit Fullscreen',

  // ---- Link / image / video / audio / media bars ----
  'editor.invalidUrl': 'Invalid URL',
  'editor.pasteImageUrl': 'Paste image URL...',
  'editor.pasteVideoUrl': 'Paste video URL or upload a file...',
  'editor.pasteAudioUrl': 'Paste audio URL or upload a file...',
  'editor.upload': 'Upload',
  'editor.searchMedia': 'Search media...',
  'editor.noMediaFound': 'No media found. Upload or search for images.',
  'editor.remove': 'Remove',

  // ---- Comments ----
  'editor.addComment': 'Add Comment',
  'editor.writeComment': 'Write a comment on the selected text...',
  'editor.saveComment': 'Save Comment',
  'editor.cancel': 'Cancel',

  // ---- Table menu & context menu ----
  'editor.table': 'Table',
  'editor.insertTable': 'Insert Table (3 × 3)',
  'editor.insertTable3x3': 'Insert 3×3 Table',
  'editor.customSizeGrid': 'Custom Size Grid',
  'editor.hoverToSelect': 'Hover to select',
  'editor.quickPresets': 'Quick Presets',
  'editor.table2x2': '2 × 2 Table',
  'editor.table3x3': '3 × 3 Table',
  'editor.table4x4': '4 × 4 Table',
  'editor.table5x5': '5 × 5 Table',
  'editor.cell': 'Cell',
  'editor.row': 'Row',
  'editor.column': 'Column',
  'editor.borders': 'Borders',
  'editor.mergeCells': 'Merge Cells',
  'editor.splitCell': 'Split Cell',
  'editor.insertRowBefore': 'Insert Row Before',
  'editor.insertRowAfter': 'Insert Row After',
  'editor.deleteRow': 'Delete Row',
  'editor.insertColumnBefore': 'Insert Column Before',
  'editor.insertColumnAfter': 'Insert Column After',
  'editor.deleteColumn': 'Delete Column',
  'editor.move': 'Move',
  'editor.moveUp': 'Move Up',
  'editor.moveDown': 'Move Down',
  'editor.deleteTable': 'Delete Table',
  'editor.borderAll': 'All Borders',
  'editor.borderOutside': 'Outside Borders',
  'editor.borderNone': 'No Border',
  'editor.borderTop': 'Top Border',
  'editor.borderBottom': 'Bottom Border',
  'editor.borderLeft': 'Left Border',
  'editor.borderRight': 'Right Border',

  // ---- Drag handle ----
  'editor.dragToReorder': 'Drag to reorder block',

  // ---- Toggle block template (inserted document text) ----
  'editor.toggleTitle': 'Toggle title — click to expand',
  'editor.hiddenContent': 'Hidden content here...',
};
