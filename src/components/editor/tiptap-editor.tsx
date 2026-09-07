'use client';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { DOMSerializer } from 'prosemirror-model';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Placeholder } from '@tiptap/extension-placeholder';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Typography } from '@tiptap/extension-typography';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Youtube } from '@tiptap/extension-youtube';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import OrderedList from '@tiptap/extension-ordered-list';
import BulletList from '@tiptap/extension-bullet-list';
import { Extension, Mark, Node } from '@tiptap/core';

const lowlight = createLowlight(common);

// -------------------- Ordered List styles --------------------
export type OrderedListStyle = 'decimal' | 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'upper-roman';
export const ORDERED_LIST_STYLES: { label: string; value: OrderedListStyle; preview: string }[] = [
  { label: 'Decimal', value: 'decimal', preview: '1, 2, 3' },
  { label: 'Lower Alpha', value: 'lower-alpha', preview: 'a, b, c' },
  { label: 'Upper Alpha', value: 'upper-alpha', preview: 'A, B, C' },
  { label: 'Lower Roman', value: 'lower-roman', preview: 'i, ii, iii' },
  { label: 'Upper Roman', value: 'upper-roman', preview: 'I, II, III' },
];

const StyledOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setOrderedListStyle: (style: OrderedListStyle) => ({ commands }) => {
        return commands.updateAttributes('orderedList', { style: `list-style-type: ${style};` });
      },
    } as any;
  },
});

// -------------------- Bullet List styles --------------------
export type BulletListStyle = 'disc' | 'circle' | 'square';
export const BULLET_LIST_STYLES: { label: string; value: BulletListStyle; preview: string }[] = [
  { label: 'Default (Disc)', value: 'disc', preview: '• Item' },
  { label: 'Circle', value: 'circle', preview: '○ Item' },
  { label: 'Square', value: 'square', preview: '▪ Item' },
];

const StyledBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setBulletListStyle: (style: BulletListStyle) => ({ commands }) => {
        return commands.updateAttributes('bulletList', { style: `list-style-type: ${style};` });
      },
    } as any;
  },
});

// -------------------- Toggle Block (collapsible) --------------------
const ToggleBlock = Node.create({
  name: 'toggleBlock',
  group: 'block',
  content: 'block+',
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      expanded: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-expanded') !== 'false',
        renderHTML: (attributes) => ({ 'data-expanded': attributes.expanded ? 'true' : 'false' }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-toggle]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-toggle': 'true' }, 0];
  },
  addCommands() {
    return {
      toggleExpand: () => ({ tr, state, dispatch }) => {
        const { selection } = state;
        let pos = -1;
        let node: any = null;
        state.doc.nodesBetween(selection.from, selection.to, (n, p) => {
          if (n.type.name === 'toggleBlock' && pos < 0) { pos = p; node = n; }
        });
        if (pos >= 0 && node) {
          const tr2 = tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            expanded: !node.attrs.expanded,
          });
          if (dispatch) dispatch(tr2);
          return true;
        }
        return false;
      },
      insertToggleBlock: () => ({ tr, state, dispatch }) => {
        const node = state.schema.nodes.toggleBlock.create(null, [
          state.schema.nodes.paragraph.create(null, [
            state.schema.text('Toggle title — click to expand'),
          ]),
          state.schema.nodes.paragraph.create(null, [
            state.schema.text('Hidden content here...'),
          ]),
        ]);
        const tr2 = tr.replaceSelectionWith(node);
        if (dispatch) dispatch(tr2);
        return true;
      },
    } as any;
  },
  addKeyboardShortcuts() {
    return { Enter: () => this.editor.commands.splitBlock() };
  },
});

// -------------------- Table border styles --------------------
export type TableBorder = 'all' | 'none' | 'outside' | 'top' | 'right' | 'bottom' | 'left';
export const TABLE_BORDERS: { label: string; value: TableBorder }[] = [
  { label: 'All Borders', value: 'all' },
  { label: 'Outside Borders', value: 'outside' },
  { label: 'No Border', value: 'none' },
  { label: 'Top Border', value: 'top' },
  { label: 'Bottom Border', value: 'bottom' },
  { label: 'Left Border', value: 'left' },
  { label: 'Right Border', value: 'right' },
];

const StyledTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      borders: {
        default: 'all',
        parseHTML: (element) => (element.getAttribute('data-borders') as TableBorder) || 'all',
        renderHTML: (attributes) => ({ 'data-borders': attributes.borders || 'all' }),
      },
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setTableBorders: (value: TableBorder) => ({ tr, state, dispatch }) => {
        const { selection } = state;
        let pos = -1;
        state.doc.nodesBetween(selection.from, selection.to, (node, p) => {
          if (node.type.name === 'table' && pos < 0) pos = p;
        });
        // Also resolve from $from ancestry
        if (pos < 0) {
          const $from = state.doc.resolve(selection.from);
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === 'table') { pos = $from.before(d); break; }
          }
        }
        if (pos >= 0) {
          const node = state.doc.nodeAt(pos);
          if (node) {
            const tr2 = tr.setNodeMarkup(pos, undefined, { ...node.attrs, borders: value });
            if (dispatch) dispatch(tr2);
            return true;
          }
        }
        return false;
      },
      moveTableUp: () => ({ tr, state, dispatch }) => {
        return moveTableImpl(state, tr, dispatch, 'up');
      },
      moveTableDown: () => ({ tr, state, dispatch }) => {
        return moveTableImpl(state, tr, dispatch, 'down');
      },
    } as any;
  },
});

function moveTableImpl(state: any, tr: any, dispatch: any, direction: 'up' | 'down'): boolean {
  const { selection } = state;
  let tablePos = -1;
  // Find table containing the selection
  const $from = state.doc.resolve(selection.from);
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'table') { tablePos = $from.before(d); break; }
  }
  if (tablePos < 0) {
    // Maybe selection is exactly the table — scan
    state.doc.nodesBetween(selection.from, selection.to, (node: any, pos: number) => {
      if (node.type.name === 'table' && tablePos < 0) tablePos = pos;
    });
  }
  if (tablePos < 0) return false;
  const tableNode = state.doc.nodeAt(tablePos);
  if (!tableNode) return false;
  const tableSize = tableNode.nodeSize;

  if (direction === 'up') {
    // Find previous top-level block
    const $before = state.doc.resolve(tablePos);
    const topLevelBefore = $before.before(1);
    if (topLevelBefore < 0) return false;
    const prevNode = state.doc.nodeAt(topLevelBefore);
    if (!prevNode) return false;
    const prevSize = prevNode.nodeSize;
    const newTr = tr.delete(topLevelBefore, tablePos + tableSize);
    newTr.insert(topLevelBefore, tableNode);
    newTr.insert(topLevelBefore + tableNode.nodeSize, prevNode);
    if (dispatch) dispatch(newTr);
    return true;
  } else {
    const tableEnd = tablePos + tableSize;
    const nextNode = state.doc.nodeAt(tableEnd);
    if (!nextNode) return false;
    const nextSize = nextNode.nodeSize;
    const newTr = tr.delete(tablePos, tableEnd + nextSize);
    newTr.insert(tablePos, nextNode);
    newTr.insert(tablePos + nextNode.nodeSize, tableNode);
    if (dispatch) dispatch(newTr);
    return true;
  }
}

// -------------------- Comment Mark --------------------
const CommentMark = Mark.create({
  name: 'comment',
  inclusive: false,
  addAttributes() {
    return {
      commentId: { default: null },
      comment: { default: '' },
      author: { default: 'You' },
    };
  },
  parseHTML() {
    return [
      { tag: 'span[data-comment-id]' },
      { tag: 'span.editor-comment' },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, class: 'editor-comment' }, 0];
  },
  addCommands() {
    return {
      addComment: (data: { commentId: string; comment: string; author?: string }) => ({ tr, state, dispatch }) => {
        const { from, to, empty } = state.selection;
        if (empty) return false;
        const text = state.doc.textBetween(from, to, '\n');
        if (!text) return false;
        // Remove any existing comment marks in the range first
        const tr2 = tr.removeMark(from, to, state.schema.marks.comment);
        // Add new comment mark
        const mark = state.schema.marks.comment.create({
          commentId: data.commentId,
          comment: data.comment,
          author: data.author || 'You',
        });
        tr2.addMark(from, to, mark);
        if (dispatch) dispatch(tr2);
        return true;
      },
      removeComment: () => ({ tr, state, dispatch }) => {
        const { from, to } = state.selection;
        const tr2 = tr.removeMark(from, to, state.schema.marks.comment);
        if (dispatch) dispatch(tr2);
        return true;
      },
    } as any;
  },
});

// -------------------- Draggable Blocks Extension --------------------
// Adds `draggable: true` to top-level block nodes via global attributes + a ProseMirror
// plugin that handles drag/drop reordering of entire top-level blocks.
const DraggableBlocks = Extension.create({
  name: 'draggableBlocks',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'blockquote', 'codeBlock', 'bulletList', 'orderedList', 'taskList', 'toggleBlock', 'table'],
        attributes: {
          draggable: {
            default: null,
            parseHTML: () => null,
            renderHTML: () => ({ draggable: 'true' }),
          },
        },
      },
    ];
  },
});

import html2canvas from 'html2canvas';
import mammoth from 'mammoth';

import {
  Undo2, Redo2, Copy, ClipboardPaste, Clipboard,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, Pilcrow,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, ListChecks, Indent, Outdent,
  Quote, Table as TableIcon, ImageIcon, Film, Link2, Unlink,
  SmilePlus, AtSign, RemoveFormatting, Search, ArrowRightLeft,
  Type, ChevronDown, Maximize2, Minimize2, Palette, Highlighter,
  LetterText, Rows3, Columns3, TableProperties, Plus, Minus,
  Download, Upload, FileText, Music, ChevronRight, ToggleLeft,
  Video, MessageSquare, MoreHorizontal, ImagePlus,
  Pencil, Lightbulb, Ruler, Keyboard,
  Paintbrush, GripVertical, ArrowUp, ArrowDown, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip, TooltipTrigger, TooltipContent,
} from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import './editor-styles.css';

// -------------------- Types --------------------

export type EditorMode = 'editing' | 'viewing';

export interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
  /** Called whenever the editor selection changes. Passes the selected text (empty string when nothing is selected). */
  onSelectionChange?: (selectedText: string) => void;
}

export interface TiptapEditorRef {
  editor: Editor | null;
  getSelectedText: () => string;
  getSelectedHtml: () => string;
  /** Replace the current selection with HTML. If a saved range exists (from saveSelectionForReplace), uses that instead. */
  replaceSelection: (html: string) => void;
  /** Insert HTML right after the current (or saved) selection. */
  insertAfterSelection: (html: string) => void;
  hasSelection: () => boolean;
  /** Save the current selection range so it can be used after focus is lost (e.g., clicking an external button). Returns the saved text. */
  saveSelectionForReplace: () => string;
}

// -------------------- Color Palettes --------------------
const TEXT_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Slate', value: '#64748b' },
  { name: 'White', value: '#ffffff' },
];

const HIGHLIGHT_COLORS = [
  { name: 'None', value: '' },
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Purple', value: '#e9d5ff' },
  { name: 'Pink', value: '#fbcfe8' },
  { name: 'Orange', value: '#fed7aa' },
  { name: 'Red', value: '#fecaca' },
];

const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Merriweather', value: 'Merriweather, serif' },
  { label: 'Mono', value: 'ui-monospace, monospace' },
  { label: 'System UI', value: 'system-ui, sans-serif' },
];

// Fix #12: Font sizes 8-96
const FONT_SIZES = ['8px','9px','10px','12px','14px','16px','18px','24px','30px','36px','48px','60px','72px','96px'];

// Fix #15: Line heights
const LINE_HEIGHTS = ['1', '1.2', '1.5', '2', '3'];

const EMOJI_CATEGORIES: Record<string, string[]> = {
  'Smileys & People': [
    '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','🥰','😘','😗','😙','😚','🙂','🤗','🤩','🥳','🤠','🤡','🥴','😈','👿','👹','💀','☠️','👻','👽','🤖','💩','😺','😸','😹','😻','😼','😽','🙀','😿','😾','🙈','🙉','🙊','👦','👧','👨','👩','👴','👵','👶','👼','🎅','🤶','🧑‍💼','🧑‍🎓','🧑‍🍳','🧑‍🔧','🧑‍⚕️','👨‍👩‍👧‍👦','👫','👬','👭','💑','💏','👪','🤝','👏','🙌','👐','🤲','🙏','💪','🦾','🦿','🖕','✌️','🤞','🤟','🤘','👌','🤌','🤏','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👋','🤚','✋','🖖','👏','🤙','🦶','🦵','🦿','💪','🫶','🫡',
  ],
  'Animals & Nature': [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🦭','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔','🐾','🐉','🐲','🌵','🎄','🌲','🌳','🌴','🌱','🌿','☘️','🍀','🎍','🪴','🎋','🍃','🍂','🍁','🪺','🪹','🍄',
  ],
  'Food & Drink': [
    '🍇','🍈','🍉','🍊','🍋','🍌','🍍','🥭','🍎','🍏','🍐','🍑','🍒','🍓','🫐','🥝','🍅','🫒','🥥','🥑','🍆','🥔','🥕','🌽','🌶️','🫑','🥒','🥬','🥦','🧄','🧅','🥜','🫘','🌰','🍞','🥐','🥖','🫓','🥨','🥯','🥞','🧇','🧀','🍖','🍗','🥩','🥓','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🫔','🥙','🧆','🥚','🍳','🥘','🍲','🫕','🥣','🥗','🍿','🧈','🧂','🥫','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣','🍤','🍥','🥮','🍡','🥟','🥠','🥡','🦀','🦞','🦐','🦑','🦪','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍼','🥛','☕','🫖','🍵','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🫗',
  ],
  'Activity': [
    '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','🤺','⛹️','🏊','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🕹️','🧩','🪄','🪅','🎱','🔮','🧿','🎮','🕹️','🎰','🎲','🧩','🪄','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🎸','🎻','🎭','🩰',
  ],
  'Travel & Places': [
    '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🦯','🦽','🦼','🛴','🚲','🛵','🏍️','🛺','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩️','💺','🛰️','🚀','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','🪝','⛽','🚧','🚦','🚥','🗺️','🗿','🗽','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛱️','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️','⛺','🏠','🏡','🏘️','🏚️','🏗️','🏭','🏢','🏬','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏩','💒','🏛️','⛪','🕌','🛕','🕍','⛩️','🕋',
  ],
  'Objects': [
    '⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗜️','💽','💾','💿','📀','📼','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🪫','🔌','💡','🔦','🕯️','🪔','🧯','🛢️','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️','🪤','🧲','🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','🪬','💈','⚗️','🔭','🔬','🕳️','🩹','🩺','🩻','💊','💉','🩸','🧬','🦠','🧫','🧪','🌡️','🧹','🪠','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🧼','🪥','🪒','🧽','🪣','🧴','🛎️','🔑','🗝️','🚪','🪑','🛋️','🛏️','🛌','🧸','🪆','🖼️','🪞','🪟','🛍️','🛒','🎁','🎈','🎏','🎀','🪄','🪅','🎊','🎉','🎎','🏮','🎐','🧧','✉️','📩','📨','📧','💌','📥','📤','📦','🏷️','🪧','📪','📫','📬','📭','📮','📯','📜','📃','📄','📑','🧾','📊','📈','📉','🗒️','🗓️','📆','📅','🗑️','📇','🗃️','🗳️','🗄️','📋','📁','📂','🗂️','🗞️','📰','📓','📔','📒','📕','📗','📘','📙','📚','📖','🔖','🧷','🔗','📎','🖇️','📐','📏','🧮','📌','📍','✂️','🖊️','🖋️','✒️','🖌️','🖍️','📝','✏️','🔍','🔎','🔏','🔐','🔒','🔓',
  ],
  'Symbols': [
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','〽️','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','🈯','💹','❇️','✳️','❎','🌐','💠','Ⓜ️','🌀','💤','🏧','🚾','♿','🅿️','🛗','🈳','🈂️','🛂','🛃','🛄','🛅','🚹','🚺','🚼','⚧️','🚻','🚮','🎦','📶','🈁','🔣','ℹ️','🔤','🔡','🔠','🆖','🆗','🆙','🆒','🆕','🆓','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔢','#️⃣','*️⃣','⏏️','▶️','⏸️','⏯️','⏹️','⏺️','⏭️','⏮️','⏩','⏪','⏫','⏬','◀️','🔼','🔽','➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','↕️','↔️','↪️','↩️','⤴️','⤵️','🔀','🔁','🔂','🔄','🔃','🎵','🎶','➕','➖','➗','✖️','🟰','♾️','💲','💱','™️','©️','®️','👁️‍🗨️','🔚','🔙','🔛','🔝','🔜','〰️','➰','➿','✔️','☑️','🔘','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔸','🔹','🔶','🔷','🔳','🔲','▪️','▫️','◾','◽','◼️','◻️','🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜','🟫','🔈','🔇','🔉','🔊','🔔','🔕','📣','📢','💬','💭','🗯️','♠️','♣️','♥️','♦️','🃏','🎴','🀄','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚','🕛','🕜','🕝','🕞','🕟','🕠','🕡','🕢','🕣','🕤','🕥','🕦','🕧','🏳️','🏴','🏴‍☠️','🏁','🚩','🏳️‍🌈','🏳️‍⚧️',
  ],
  'Flags': [
    '🏁','🚩','🏳️','🏴','🏴‍☠️','🏳️‍🌈','🏳️‍⚧️','🏳️',
    '🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇮🇹','🇪🇸','🇯🇵','🇰🇷','🇨🇳','🇷🇺',
    '🇧🇷','🇮🇳','🇨🇦','🇦🇺','🇲🇽','🇸🇦','🇦🇪','🇿🇦','🇳🇬','🇪🇬',
    '🇹🇷','🇦🇷','🇨🇴','🇨🇱','🇵🇪','🇨🇺','🇯🇲','🇵🇭','🇮🇩','🇲🇾',
    '🇳🇿','🇸🇬','🇹🇭','🇻🇳','🇧🇩','🇰🇪','🇬🇭','🇹🇳','🇲🇦','🇪🇹',
    '🇹🇿','🇺🇬','🇺🇾','🇵🇾','🇧🇴','🇵🇦','🇨🇷','🇭🇳','🇬🇹','🇸🇱',
    '🇳🇮','🇩🇴','🇪🇨','🇨🇭','🇦🇹','🇧🇪','🇧🇬','🇭🇷','🇨🇿','🇩🇰',
    '🇪🇪','🇫🇮','🇬🇷','🇭🇺','🇮🇸','🇮🇪','🇱🇻','🇱🇹','🇲🇹','🇳🇱',
    '🇳🇴','🇵🇱','🇵🇹','🇷🇴','🇷🇸','🇸🇰','🇸🇲','🇸🇪','🇺🇦','🇬🇪',
    '🇦🇲','🇦🇿','🇧🇾','🇰🇿','🇺🇿','🇹🇲','🇰🇬','🇲🇳','🇹🇯','🇹🇰',
    '🇦🇫','🇧🇯','🇧🇲','🇧🇼','🇨🇫','🇹🇩','🇨🇲','🇨🇬','🇨🇩','🇩🇯',
    '🇬🇶','🇪🇷','🇬🇦','🇬🇲','🇬🇳','🇬🇼','🇬🇾','🇨🇲','🇰🇪','🇱🇷',
    '🇲🇷','🇲🇼','🇳🇪','🇸🇳','🇸🇱','🇸🇺','🇿🇲','🇿🇼','🇦🇴','🇨🇻',
    '🇰🇲','🇲🇬','🇲🇺','🇾🇹','🇸🇨','🇸🇽','🇰🇳','🇱🇨','🇻🇳','🇩🇲',
    '🇬🇩','🇰🇵','🇲🇻','🇲🇰','🇵🇸','🇵🇼','🇸🇧','🇹🇻','🇻🇺','🇼🇫',
    '🇹🇱','🇳🇨','🇳🇺','🇳🇫','🇵🇳','🇬🇮','🇪🇭','🇮🇱','🇸🇯','🇧🇲',
    '🇰🇾','🇫🇰','🇱🇻','🇹🇳','🇻🇬','🇻🇮','🇧🇳','🇲🇭','🇵🇫','🇼🇸',
    '🇨🇰','🇳🇿','🇹🇰','🇬🇺','🇲🇸','🇧🇱','🇵🇲','🇸🇷','🇬🇾','🇬🇱',
    '🇦🇼','🇨🇼','🇸🇽','🇨🇺','🇪🇺',
  ],
};

const EMOJI_GRID = Object.values(EMOJI_CATEGORIES).flat();

// Fix #11: Emoji keyword map for keyword-based search
const EMOJI_KEYWORDS: Record<string, string[]> = {
  '😀': ['smile', 'happy', 'grin', 'joy', 'face', 'laugh'],
  '😁': ['smile', 'happy', 'grin', 'beam', 'face'],
  '😂': ['laugh', 'joy', 'lol', 'face', 'cry', 'tears'],
  '🤣': ['laugh', 'rofl', 'joy', 'lol', 'rolling'],
  '😃': ['smile', 'happy', 'joy', 'face'],
  '😄': ['smile', 'happy', 'grin', 'face'],
  '😅': ['sweat', 'smile', 'nervous', 'face'],
  '😆': ['laugh', 'grin', 'squint', 'face'],
  '😉': ['wink', 'face', 'smile'],
  '😊': ['smile', 'blush', 'happy', 'face', 'shy'],
  '😋': ['yum', 'tongue', 'tasty', 'delicious', 'face'],
  '😎': ['cool', 'sunglasses', 'smile', 'face'],
  '😍': ['heart', 'eyes', 'love', 'adore', 'face'],
  '🥰': ['love', 'hearts', 'adore', 'face'],
  '😘': ['kiss', 'love', 'heart', 'face'],
  '🤗': ['hug', 'love', 'care', 'face'],
  '🤩': ['star', 'eyes', 'excited', 'wow', 'face'],
  '🥳': ['party', 'celebrate', 'birthday', 'face'],
  '🤠': ['cowboy', 'hat', 'face'],
  '🤔': ['think', 'hmm', 'wonder', 'face'],
  '🤥': ['lie', 'pinocchio', 'nose', 'face'],
  '😔': ['sad', 'pensive', 'face'],
  '😕': ['confused', 'face'],
  '🙁': ['frown', 'sad', 'face'],
  '☹️': ['frown', 'sad', 'face'],
  '😮': ['oh', 'wow', 'surprised', 'open', 'mouth', 'face'],
  '😯': ['hushed', 'surprised', 'face'],
  '😡': ['angry', 'mad', 'rage', 'face', 'red'],
  '😠': ['angry', 'mad', 'face'],
  '😢': ['cry', 'tear', 'sad', 'face'],
  '😭': ['cry', 'sob', 'tears', 'sad', 'face'],
  '😅': ['sweat', 'smile', 'nervous', 'face'],
  '😱': ['scream', 'fear', 'shock', 'face'],
  '😴': ['sleep', 'tired', 'face'],
  '🤯': ['mind', 'blown', 'shock', 'explode', 'face'],
  '🥶': ['cold', 'freeze', 'face'],
  '🤒': ['sick', 'thermometer', 'face'],
  '🤧': ['sneeze', 'tissue', 'sick', 'face'],
  '🤠': ['cowboy', 'hat', 'face'],
  '😈': ['devil', 'smile', 'evil', 'face'],
  '👿': ['devil', 'angry', 'evil', 'face'],
  '👻': ['ghost', 'spooky', 'halloween'],
  '👽': ['alien', 'ufo', 'space'],
  '🤖': ['robot', 'ai', 'machine'],
  '💩': ['poop', 'shit', 'crap'],
  '❤️': ['heart', 'love', 'red', 'romance'],
  '🧡': ['heart', 'orange', 'love'],
  '💛': ['heart', 'yellow', 'love'],
  '💚': ['heart', 'green', 'love'],
  '💙': ['heart', 'blue', 'love'],
  '💜': ['heart', 'purple', 'love'],
  '🖤': ['heart', 'black', 'love', 'dark'],
  '🤍': ['heart', 'white', 'love'],
  '💔': ['heart', 'broken', 'sad', 'breakup'],
  '👍': ['thumbs', 'up', 'like', 'yes', 'ok', 'agree'],
  '👎': ['thumbs', 'down', 'dislike', 'no', 'disagree'],
  '👌': ['ok', 'okay', 'good', 'yes', 'perfect'],
  '✌️': ['peace', 'victory', 'fingers'],
  '👋': ['wave', 'hello', 'hi', 'bye', 'hand'],
  '👏': ['clap', 'applaud', 'cheer', 'hands'],
  '🙌': ['raise', 'hands', 'celebrate', 'praise'],
  '🙏': ['pray', 'please', 'thanks', 'hands'],
  '💪': ['muscle', 'strong', 'flex', 'arm'],
  '🤝': ['handshake', 'deal', 'agree'],
  '✊': ['fist', 'power', 'fight', 'raised'],
  '👊': ['fist', 'punch', 'fight'],
  '✅': ['check', 'mark', 'done', 'ok', 'green'],
  '❌': ['cross', 'x', 'no', 'wrong', 'cancel'],
  '⭐': ['star', 'favorite', 'rate'],
  '🌟': ['star', 'glow', 'shine', 'glitter'],
  '🔥': ['fire', 'hot', 'lit', 'flame'],
  '💯': ['hundred', '100', 'perfect', 'score'],
  '🎉': ['party', 'celebrate', 'birthday', 'tada'],
  '🎈': ['balloon', 'party', 'celebrate'],
  '🎁': ['gift', 'present', 'box'],
  '💡': ['idea', 'light', 'bulb', 'lamp'],
  '⏰': ['alarm', 'clock', 'time', 'wake'],
  '⚽': ['soccer', 'football', 'ball', 'kick'],
  '🏀': ['basketball', 'ball', 'hoop'],
  '🏈': ['football', 'nfl', 'ball'],
  '⚾': ['baseball', 'ball', 'sport'],
  '🎾': ['tennis', 'racket', 'ball'],
  '🏆': ['trophy', 'win', 'champion', 'award'],
  '🥇': ['gold', 'medal', 'first', 'win'],
  '🥈': ['silver', 'medal', 'second'],
  '🥉': ['bronze', 'medal', 'third'],
  '🐶': ['dog', 'puppy', 'pet'],
  '🐱': ['cat', 'kitten', 'pet', 'meow'],
  '🐭': ['mouse', 'rat'],
  '🐹': ['hamster', 'pet', 'rodent'],
  '🐰': ['rabbit', 'bunny', 'pet'],
  '🦊': ['fox', 'animal'],
  '🐻': ['bear', 'animal', 'teddy'],
  '🐼': ['panda', 'bear', 'animal'],
  '🐨': ['koala', 'bear', 'animal'],
  '🐯': ['tiger', 'animal', 'cat'],
  '🦁': ['lion', 'animal', 'cat', 'king'],
  '🐮': ['cow', 'bull', 'animal'],
  '🐷': ['pig', 'animal'],
  '🐸': ['frog', 'animal', 'amphibian'],
  '🐵': ['monkey', 'ape', 'animal'],
  '🐔': ['chicken', 'hen', 'bird'],
  '🐧': ['penguin', 'bird', 'cold'],
  '🐦': ['bird', 'tweet'],
  '🦅': ['eagle', 'bird'],
  '🦉': ['owl', 'bird', 'night'],
  '🐝': ['bee', 'insect', 'honey'],
  '🐢': ['turtle', 'tortoise', 'animal'],
  '🐙': ['octopus', 'sea', 'animal'],
  '🐳': ['whale', 'sea', 'spout'],
  '🐬': ['dolphin', 'sea', 'animal'],
  '🍎': ['apple', 'fruit', 'red'],
  '🍌': ['banana', 'fruit', 'yellow'],
  '🍊': ['orange', 'fruit', 'citrus'],
  '🍓': ['strawberry', 'fruit', 'berry', 'red'],
  '🍕': ['pizza', 'food', 'slice', 'cheese'],
  '🍔': ['burger', 'hamburger', 'food', 'fast'],
  '🍟': ['fries', 'chips', 'potato', 'food'],
  '🌭': ['hotdog', 'sausage', 'food'],
  '🍿': ['popcorn', 'snack', 'movie'],
  '☕': ['coffee', 'drink', 'hot', 'cup'],
  '🍵': ['tea', 'drink', 'green'],
  '🍺': ['beer', 'drink', 'alcohol', 'mug'],
  '🍷': ['wine', 'drink', 'alcohol', 'red'],
  '🎂': ['cake', 'birthday', 'dessert'],
  '🍦': ['icecream', 'ice', 'cream', 'dessert'],
  '🍫': ['chocolate', 'candy', 'food'],
  '🍩': ['donut', 'doughnut', 'food', 'dessert'],
  '🍪': ['cookie', 'food', 'dessert'],
  '🌻': ['sunflower', 'flower', 'yellow'],
  '🌹': ['rose', 'flower', 'love', 'red'],
  '🌷': ['tulip', 'flower'],
  '🌸': ['cherry', 'blossom', 'flower', 'pink'],
  '🌺': ['hibiscus', 'flower'],
  '🌲': ['tree', 'pine', 'evergreen'],
  '🌳': ['tree', 'forest', 'deciduous'],
  '🌴': ['palm', 'tree', 'tropical'],
  '🌵': ['cactus', 'plant', 'desert'],
  '🌍': ['earth', 'globe', 'world', 'europe'],
  '🌎': ['earth', 'globe', 'world', 'americas'],
  '🌏': ['earth', 'globe', 'world', 'asia'],
  '🌙': ['moon', 'crescent', 'night'],
  '☀️': ['sun', 'sunny', 'weather', 'warm'],
  '⭐': ['star', 'space', 'glow'],
  '☁️': ['cloud', 'weather', 'sky'],
  '🌧️': ['rain', 'cloud', 'weather'],
  '⛈️': ['storm', 'rain', 'thunder', 'weather'],
  '❄️': ['snow', 'cold', 'flake', 'winter'],
  '🌈': ['rainbow', 'colors', 'lgbt'],
  '⚡': ['zap', 'lightning', 'bolt', 'energy'],
  '🌊': ['wave', 'ocean', 'water', 'sea'],
  '🍃': ['leaf', 'leaves', 'plant', 'green'],
  '🍀': ['clover', 'shamrock', 'luck', 'green'],
  '🌺': ['hibiscus', 'flower'],
  '🎵': ['music', 'note', 'song'],
  '🎶': ['music', 'notes', 'song', 'melody'],
  '💎': ['gem', 'diamond', 'jewel', 'blue'],
  '💰': ['money', 'bag', 'cash', 'dollar'],
  '💸': ['money', 'flying', 'wings', 'cash'],
  '🚀': ['rocket', 'launch', 'space', 'fast'],
  '✈️': ['airplane', 'plane', 'flight', 'travel'],
  '🚗': ['car', 'auto', 'vehicle', 'drive'],
  '🏠': ['house', 'home', 'building'],
  '🏡': ['house', 'home', 'garden'],
  '🏫': ['school', 'building', 'education'],
  '🏥': ['hospital', 'medical', 'doctor', 'health'],
  '💻': ['computer', 'laptop', 'tech'],
  '📱': ['phone', 'mobile', 'device', 'cell'],
  '⌨️': ['keyboard', 'type', 'input'],
  '🖥️': ['desktop', 'computer', 'monitor'],
  '📝': ['memo', 'note', 'write', 'pencil'],
  '📌': ['pin', 'pushpin', 'location', 'mark'],
  '📍': ['location', 'pin', 'place', 'map'],
  '📎': ['paperclip', 'attach', 'clip'],
  '✂️': ['scissors', 'cut', 'clip'],
  '🔒': ['lock', 'closed', 'secure', 'private'],
  '🔓': ['unlock', 'open', 'unlock'],
  '🔑': ['key', 'unlock', 'password'],
  '🔔': ['bell', 'notification', 'alert', 'ring'],
  '📢': ['loudspeaker', 'announce', 'megaphone'],
};

// -------------------- Toolbar Button --------------------

function Tb({
  children, tooltip, active = false, onClick, disabled = false, className,
}: {
  children: React.ReactNode; tooltip: string; active?: boolean;
  onClick: () => void; disabled?: boolean; className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onMouseDown={(e) => {
            // Prevent editor from losing focus/selection when clicking toolbar
            e.preventDefault();
          }}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'inline-flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-150 shrink-0',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            disabled && 'opacity-40 pointer-events-none',
            active
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground',
            className,
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4} className="text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function TSep() {
  return <div className="h-5 w-px bg-border/60 mx-1 shrink-0" />;
}

function TDropdown({
  label, icon, active, children, className, triggerClassName,
}: {
  label: string; icon: React.ReactNode; active?: boolean;
  children: React.ReactNode; className?: string; triggerClassName?: string;
}) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              className={cn(
                'inline-flex items-center gap-1 h-8 px-2 rounded-lg transition-all duration-150 shrink-0',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                active
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground',
                triggerClassName,
              )}
            >
              {icon}
              {label && <span className="hidden lg:inline text-xs max-w-[60px] truncate">{label}</span>}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={4} className="text-xs">{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="min-w-[160px]" onMouseDown={(e) => e.preventDefault()}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// -------------------- Color Picker ----------------

function ColorPicker({
  colors, label, icon, onPick, onClear, currentColor, type = 'text',
}: {
  colors: typeof TEXT_COLORS; label: string; icon: React.ReactNode;
  onPick: (val: string) => void; onClear?: () => void; currentColor?: string; type?: 'text' | 'bg';
}) {
  const [tab, setTab] = useState<'default' | 'custom'>('default');
  const [customColor, setCustomColor] = useState('#000000');
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-150 shrink-0',
                'text-muted-foreground hover:bg-accent/80 hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              )}
            >
              <span className="relative">
                {icon}
                {currentColor && currentColor !== '' && (
                  <span className="absolute -bottom-0.5 left-0.5 right-0.5 h-1 rounded-full" style={{ backgroundColor: currentColor }} />
                )}
              </span>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={4} className="text-xs">{label}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-56 p-2.5" align="start">
        <p className="text-[10px] font-medium text-muted-foreground mb-2 px-1">{label}</p>
        <div className="flex gap-1 mb-2">
          <button type="button" onClick={() => setTab('default')} className={cn('text-[10px] px-2 py-0.5 rounded-full border transition-colors', tab === 'default' ? 'bg-accent text-accent-foreground border-transparent' : 'border-border/50 text-muted-foreground hover:bg-muted')}>Default Colors</button>
          <button type="button" onClick={() => setTab('custom')} className={cn('text-[10px] px-2 py-0.5 rounded-full border transition-colors', tab === 'custom' ? 'bg-accent text-accent-foreground border-transparent' : 'border-border/50 text-muted-foreground hover:bg-muted')}>Custom Color</button>
        </div>
        {tab === 'default' ? (
          <div className="grid grid-cols-6 gap-1.5">
            {colors.map((c) => (
              <button
                key={c.name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPick(c.value)}
                className={cn(
                  'h-6 w-6 rounded-md border border-border/60 transition-all hover:scale-110 hover:shadow-sm',
                  !c.value && 'border-dashed bg-muted/40',
                )}
                style={c.value ? { backgroundColor: c.value } : undefined}
                title={c.name}
              >
                {!c.value && <span className="text-[10px] text-muted-foreground">✕</span>}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0 p-0" />
              <Input value={customColor} onChange={(e) => setCustomColor(e.target.value)} className="h-8 text-xs font-mono flex-1" placeholder="#000000" />
              <Button type="button" size="sm" className="h-8 text-xs" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(customColor)}>Apply</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['#000000','#333333','#666666','#999999','#cccccc','#ffffff','#ff0000','#ff6600','#ffcc00','#33cc33','#3399ff','#9933ff','#ff33cc','#ff6666','#ffcc66','#66ff66','#66ccff','#cc66ff','#ff99cc','#993300','#336600','#003366','#330033','#660000'].map(c => (
                <button key={c} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setCustomColor(c); onPick(c); }} className="h-5 w-5 rounded border border-border/60 hover:scale-110 transition-transform" style={{ backgroundColor: c }} title={c} />
              ))}
            </div>
          </div>
        )}
        {onClear && (
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClear} className="mt-2 w-full text-[10px] text-muted-foreground hover:text-foreground py-1 border-t border-border/50 text-center transition-colors">Clear</button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// -------------------- Main Component --------------------

export const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(function TiptapEditor({
  content: initialContent,
  onChange,
  editable: externalEditable = true,
  placeholder = '',
  className,
  onSelectionChange,
}, ref) {
  const [editorMode, setEditorMode] = useState<EditorMode>('editing');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findCount, setFindCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  const [showAudioDialog, setShowAudioDialog] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const findCountRef = useRef(0);

  // Fix #3: Floating toolbar link popover state
  const [showFloatingLinkPopover, setShowFloatingLinkPopover] = useState(false);
  const [floatingLinkUrl, setFloatingLinkUrl] = useState('');

  // Fix #13: Comment popover state
  const [showCommentPopover, setShowCommentPopover] = useState(false);
  const [commentText, setCommentText] = useState('');

  // Media library state
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaItems, setMediaItems] = useState<Array<{ id: string; filename: string; url: string; thumbnailUrl?: string; alt?: string }>>([]);

  // Emoji search
  const [emojiSearch, setEmojiSearch] = useState('');
  const [emojiCategory, setEmojiCategory] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const [currentLineHeight, setCurrentLineHeight] = useState('');
  const [currentFontSizeState, setCurrentFontSizeState] = useState('');

  // Floating toolbar state (positioned above selected text)
  const [floatingToolbar, setFloatingToolbar] = useState<{ x: number; y: number; show: boolean }>({
    x: 0, y: 0, show: false,
  });

  // Fix #4: Table grid selector state
  const [tableGridHover, setTableGridHover] = useState<{ rows: number; cols: number }>({ rows: 0, cols: 0 });

  // Fix #1: Drag handle state — React overlay that follows hovered top-level block
  const [dragHandle, setDragHandle] = useState<{ show: boolean; top: number; left: number; pos: number }>({
    show: false, top: 0, left: 0, pos: 0,
  });
  const dragSourcePosRef = useRef<number | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ show: boolean; top: number }>({ show: false, top: 0 });

  // Table context menu state (right-click on table)
  const [tableCtxMenu, setTableCtxMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    activeSubmenu: string | null;
  }>({ show: false, x: 0, y: 0, activeSubmenu: null });
  const tableCtxMenuRef = useRef<HTMLDivElement>(null);

  const closeTableCtxMenu = useCallback(() => {
    setTableCtxMenu((prev) => ({ ...prev, show: false, activeSubmenu: null }));
  }, []);

  // Close context menu on click outside or scroll
  useEffect(() => {
    if (!tableCtxMenu.show) return;
    const handleClick = () => closeTableCtxMenu();
    const handleScroll = () => closeTableCtxMenu();
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') closeTableCtxMenu(); };
    document.addEventListener('click', handleClick);
    document.addEventListener('scroll', handleScroll, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [tableCtxMenu.show, closeTableCtxMenu]);

  // Keep onSelectionChange ref so the effect always sees the latest callback
  const onSelectionChangeRef = useRef(onSelectionChange);
  useEffect(() => { onSelectionChangeRef.current = onSelectionChange; });

  // Saved selection for use after focus is lost (e.g., clicking AI action buttons outside the editor)
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);

  const isEditable = externalEditable && editorMode !== 'viewing';

  // Custom indent + line-height extension for paragraphs
  const IndentExt = useMemo(() => Extension.create({
    name: 'customIndent',
    addGlobalAttributes() {
      return [
        {
          types: ['paragraph', 'heading'],
          attributes: {
            indent: {
              default: 0,
              parseHTML: (element) => parseInt(element.getAttribute('data-indent') || '0', 10),
              renderHTML: (attributes) => {
                if (!attributes.indent) return {};
                return { 'data-indent': attributes.indent, style: `padding-left: ${attributes.indent}em;` };
              },
            },
            lineHeight: {
              default: null,
              parseHTML: (element) => element.getAttribute('data-line-height'),
              renderHTML: (attributes) => {
                if (!attributes.lineHeight) return {};
                return { 'data-line-height': attributes.lineHeight, style: `line-height: ${attributes.lineHeight};` };
              },
            },
          },
        },
      ];
    },
    addCommands() {
      return {
        indent: () => ({ tr, state, dispatch }) => {
          const { selection } = state;
          let changed = false;
          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (node.isBlock && (node.type.name === 'paragraph' || node.type.name === 'heading')) {
              const current = (node.attrs.indent || 0) + 2;
              if (current <= 20) {
                tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: current });
                changed = true;
              }
            }
          });
          if (dispatch && changed) dispatch(tr);
          return changed;
        },
        outdent: () => ({ tr, state, dispatch }) => {
          const { selection } = state;
          let changed = false;
          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (node.isBlock && (node.type.name === 'paragraph' || node.type.name === 'heading')) {
              const current = (node.attrs.indent || 0) - 2;
              if (current >= 0) {
                tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: Math.max(0, current) });
                changed = true;
              }
            }
          });
          if (dispatch && changed) dispatch(tr);
          return changed;
        },
      };
    },
  }), []);

  const editor = useEditor({
    extensions: [
      // Fix #10: Configure History with depth + newGroupDelay for per-action undo
      StarterKit.configure({
        codeBlock: false,
        orderedList: false,
        bulletList: false,
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        history: { depth: 200, newGroupDelay: 400 },
      }),
      StyledOrderedList,
      StyledBulletList,
      Underline,
      TextStyleKit,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'editor-link' } }),
      StyledTable.configure({ resizable: true, HTMLAttributes: { class: 'editor-table' } }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      Youtube.configure({ HTMLAttributes: { class: 'editor-video' } }),
      Subscript,
      Superscript,
      CodeBlockLowlight.configure({ lowlight }),
      IndentExt,
      ToggleBlock,
      CommentMark,
      DraggableBlocks,
    ],
    content: initialContent || '',
    editable: isEditable,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none editor-content',
      },
      // Fix #8: Toggle Block — clicking the toggle's first child toggles expansion
      handleClickOn(view, pos, node, nodePos, event, direct) {
        const target = event.target as HTMLElement;
        if (!target || !target.closest) return false;
        const toggleEl = target.closest('div[data-toggle="true"]') as HTMLElement | null;
        if (!toggleEl) return false;
        const firstChild = toggleEl.firstElementChild as HTMLElement | null;
        if (!firstChild || !firstChild.contains(target)) return false;
        try {
          const domPos = view.posAtDOM(toggleEl, 0);
          const $pos = view.state.doc.resolve(domPos);
          let toggleDepth = -1;
          for (let d = $pos.depth; d > 0; d--) {
            if ($pos.node(d).type.name === 'toggleBlock') { toggleDepth = d; break; }
          }
          if (toggleDepth < 0) return false;
          const togglePos = $pos.before(toggleDepth);
          const toggleNode = view.state.doc.nodeAt(togglePos);
          if (!toggleNode) return false;
          const expanded = toggleNode.attrs.expanded !== false;
          const tr = view.state.tr.setNodeMarkup(togglePos, undefined, {
            ...toggleNode.attrs,
            expanded: !expanded,
          });
          view.dispatch(tr);
          return true;
        } catch {
          return false;
        }
      },
      handlePaste: (view, event) => {
        // paste without formatting if holding shift
        if (event.shiftKey) {
          const text = event.clipboardData?.getData('text/plain') || '';
          view.dispatch(view.state.tr.insertText(text));
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmittedHtmlRef.current = html;
      onChange(html);
    },
    onSelectionUpdate: () => {
      // handled via dedicated effect below
    },
    immediatelyRender: false,
  });

  // ---- Floating toolbar: listen to selection changes ----
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const { from, to, empty } = editor.state.selection;

      if (empty) {
        setFloatingToolbar((ft) => (ft.show ? { ...ft, show: false } : ft));
        setShowFloatingLinkPopover(false);
        onSelectionChangeRef.current?.('');
        return;
      }

      // Notify parent of new selected text
      onSelectionChangeRef.current?.(editor.state.doc.textBetween(from, to, '\n'));

      // Use rAF so the DOM selection is fully committed before reading getBoundingClientRect
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        if (!rect.width && !rect.height) return;

        const TOOLBAR_H = 40;
        const GAP = 8;
        const viewW = window.innerWidth;

        let x = rect.left + rect.width / 2;
        x = Math.max(120, Math.min(viewW - 120, x));

        let y = rect.top - TOOLBAR_H - GAP;
        if (y < 8) y = rect.bottom + GAP;

        setFloatingToolbar({ x, y, show: true });
      });
    };

    const handleBlur = () => {
      // Small delay so onMouseDown e.preventDefault() on toolbar buttons can fire first
      setTimeout(() => {
        setFloatingToolbar((ft) => ({ ...ft, show: false }));
        // Note: do NOT clear onSelectionChange here — the parent uses a persistent savedSelectedText
        onSelectionChangeRef.current?.('');
      }, 120);
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('blur', handleBlur);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('blur', handleBlur);
    };
  }, [editor]);

  // ---- Sync editable state ----
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditable);
    }
  }, [editor, isEditable]);

  // Fix #1: Drag handle — track hovered top-level block via mousemove
  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view.dom as HTMLElement;
    const scrollContainer = editorDom.parentElement?.parentElement as HTMLElement; // .max-w-4xl > .flex-1.overflow-y-auto

    const findTopLevelBlockInfo = (target: HTMLElement): { pos: number; rectTop: number; rectLeft: number } | null => {
      // Walk up until we find a direct child of the editor dom
      let el: HTMLElement | null = target;
      while (el && el.parentElement !== editorDom) {
        el = el.parentElement;
      }
      if (!el) return null;
      try {
        const pos = editor.view.posAtDOM(el, 0);
        // Ensure pos is at the start of a top-level block (depth 0)
        const $pos = editor.state.doc.resolve(pos);
        // If pos is inside a deeper block, get the top-level block start
        const topLevelStart = $pos.before(1);
        const realPos = topLevelStart >= 0 ? topLevelStart : pos;
        const node = editor.state.doc.nodeAt(realPos);
        if (!node) return null;
        const dom = editor.view.nodeDOM(realPos) as HTMLElement | null;
        if (!dom) return null;
        const rect = dom.getBoundingClientRect();
        return { pos: realPos, rectTop: rect.top, rectLeft: rect.left };
      } catch {
        return null;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !editorDom.contains(target)) {
        setDragHandle((dh) => (dh.show ? { ...dh, show: false } : dh));
        return;
      }
      const info = findTopLevelBlockInfo(target);
      if (!info) {
        setDragHandle((dh) => (dh.show ? { ...dh, show: false } : dh));
        return;
      }
      // Only show if mouse is in the left margin area (within 60px of block left edge)
      const blockLeft = info.rectLeft;
      if (e.clientX > blockLeft + 40) {
        // Still hide if cursor moved away from left margin
        setDragHandle((dh) => (dh.show ? { ...dh, show: false } : dh));
        return;
      }
      setDragHandle({ show: true, top: info.rectTop, left: blockLeft - 28, pos: info.pos });
    };

    const handleMouseLeave = () => {
      setDragHandle({ show: false, top: 0, left: 0, pos: 0 });
    };

    editorDom.addEventListener('mousemove', handleMouseMove);
    editorDom.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      editorDom.removeEventListener('mousemove', handleMouseMove);
      editorDom.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [editor]);

  // Fix #1: Drag handle drag/drop handlers
  const handleDragHandleDragStart = useCallback((e: React.DragEvent) => {
    if (!editor) return;
    dragSourcePosRef.current = dragHandle.pos;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'drag-block');
    }
    // Hide the drag handle during drag
    setDragHandle((dh) => ({ ...dh, show: false }));
  }, [editor, dragHandle.pos]);

  const handleEditorDragOver = useCallback((e: React.DragEvent) => {
    if (dragSourcePosRef.current == null) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const target = e.target as HTMLElement;
    if (!editor) return;
    const editorDom = editor.view.dom as HTMLElement;
    if (!editorDom.contains(target)) return;
    // Find the hovered top-level block
    let el: HTMLElement | null = target;
    while (el && el.parentElement !== editorDom) {
      el = el.parentElement;
    }
    if (!el) return;
    try {
      const pos = editor.view.posAtDOM(el, 0);
      const $pos = editor.state.doc.resolve(pos);
      const topLevelStart = $pos.before(1);
      const realPos = topLevelStart >= 0 ? topLevelStart : pos;
      if (realPos === dragSourcePosRef.current) {
        setDropIndicator({ show: false, top: 0 });
        return;
      }
      const rect = el.getBoundingClientRect();
      // Show drop indicator at the top of the hovered block (or bottom if cursor is in lower half)
      const isLowerHalf = e.clientY > rect.top + rect.height / 2;
      setDropIndicator({ show: true, top: isLowerHalf ? rect.bottom : rect.top });
    } catch {
      // ignore
    }
  }, [editor]);

  const handleEditorDrop = useCallback((e: React.DragEvent) => {
    if (dragSourcePosRef.current == null || !editor) return;
    e.preventDefault();
    const srcPos = dragSourcePosRef.current;
    const target = e.target as HTMLElement;
    const editorDom = editor.view.dom as HTMLElement;
    if (!editorDom.contains(target)) {
      dragSourcePosRef.current = null;
      setDropIndicator({ show: false, top: 0 });
      return;
    }
    let el: HTMLElement | null = target;
    while (el && el.parentElement !== editorDom) {
      el = el.parentElement;
    }
    if (!el) {
      dragSourcePosRef.current = null;
      setDropIndicator({ show: false, top: 0 });
      return;
    }
    try {
      const pos = editor.view.posAtDOM(el, 0);
      const $pos = editor.state.doc.resolve(pos);
      const topLevelStart = $pos.before(1);
      let targetPos = topLevelStart >= 0 ? topLevelStart : pos;
      const srcNode = editor.state.doc.nodeAt(srcPos);
      if (!srcNode) return;
      const rect = el.getBoundingClientRect();
      const isLowerHalf = e.clientY > rect.top + rect.height / 2;
      const targetNode = editor.state.doc.nodeAt(targetPos);
      if (!targetNode) return;
      if (isLowerHalf) {
        targetPos = targetPos + targetNode.nodeSize;
      }
      if (targetPos === srcPos || targetPos === srcPos + srcNode.nodeSize) {
        dragSourcePosRef.current = null;
        setDropIndicator({ show: false, top: 0 });
        return;
      }
      // Perform the reorder transaction
      const tr = editor.state.tr;
      const srcNodeCopy = srcNode.toJSON();
      tr.delete(srcPos, srcPos + srcNode.nodeSize);
      // Adjust targetPos if we deleted before it
      let adjustedTarget = targetPos;
      if (targetPos > srcPos) {
        adjustedTarget -= srcNode.nodeSize;
      }
      tr.insert(adjustedTarget, editor.state.schema.nodeFromJSON(srcNodeCopy));
      editor.view.dispatch(tr);
    } catch (err) {
      // ignore
    } finally {
      dragSourcePosRef.current = null;
      setDropIndicator({ show: false, top: 0 });
    }
  }, [editor]);

  const handleEditorDragEnd = useCallback(() => {
    dragSourcePosRef.current = null;
    setDropIndicator({ show: false, top: 0 });
  }, []);

  // Expose editor instance and selection helpers to parent via ref
  useImperativeHandle(ref, () => ({
    editor,
    getSelectedText: () => {
      if (!editor) return '';
      const { from, to, empty } = editor.state.selection;
      if (empty) return '';
      return editor.state.doc.textBetween(from, to, '\n');
    },
    getSelectedHtml: () => {
      if (!editor) return '';
      const { from, to, empty } = editor.state.selection;
      if (empty) return '';
      const slice = editor.state.doc.slice(from, to);
      const tmp = document.createElement('div');
      const fragment = DOMSerializer.fromSchema(editor.state.schema).serializeFragment(slice.content);
      tmp.appendChild(fragment);
      return tmp.innerHTML;
    },
    saveSelectionForReplace: () => {
      if (!editor) return '';
      const { from, to, empty } = editor.state.selection;
      // Fix #2: When the editor has lost focus/selection (e.g., user clicked the AI textarea),
      // DO NOT clear the previously saved range — keep it so AI actions can still operate on it.
      if (empty) {
        // Return the previously saved text if any (range stays intact for later replaceSelection)
        if (savedSelectionRef.current) {
          return editor.state.doc.textBetween(savedSelectionRef.current.from, savedSelectionRef.current.to, '\n');
        }
        return '';
      }
      savedSelectionRef.current = { from, to };
      return editor.state.doc.textBetween(from, to, '\n');
    },
    replaceSelection: (html: string) => {
      if (!editor) return;
      const range = savedSelectionRef.current;
      if (!range) {
        editor.chain().focus().insertContent(html).run();
        return;
      }
      savedSelectionRef.current = null;
      editor.chain().focus().deleteRange({ from: range.from, to: range.to }).insertContent(html).run();
    },
    insertAfterSelection: (html: string) => {
      if (!editor) return;
      const range = savedSelectionRef.current;
      if (!range) {
        editor.chain().focus().insertContent(`<p>${html}</p>`).run();
        return;
      }
      savedSelectionRef.current = null;
      editor.chain()
        .focus()
        .insertContentAt(range.to, `<p>${html}</p>`)
        .run();
    },
    hasSelection: () => {
      if (!editor) return false;
      const { empty } = editor.state.selection;
      return !empty;
    },
  }), [editor]);

  // ---- Table context menu handler (right-click on table cell) ----
  const handleTableContextMenu = useCallback((e: React.MouseEvent) => {
    if (!editor || !isEditable) return;
    const target = e.target as HTMLElement;
    const cell = target.closest('td, th');
    if (!cell) return;
    e.preventDefault();
    setTableCtxMenu({ show: true, x: e.clientX, y: e.clientY, activeSubmenu: null });
  }, [editor, isEditable]);

  // Sync content from outside (e.g. loading saved article, AI generation).
  const lastEmittedHtmlRef = useRef(initialContent);
  useEffect(() => {
    if (!editor) return;
    if (initialContent !== lastEmittedHtmlRef.current) {
      editor.commands.setContent(initialContent || '', false);
      lastEmittedHtmlRef.current = initialContent || '';
    }
  });

  // ---- Computed stats ----
  const stats = useMemo(() => {
    if (!editor) return { words: 0, chars: 0, readingTime: '< 1 min' };
    const chars = editor.storage.characterCount?.characters() ?? 0;
    const words = editor.storage.characterCount?.words() ?? 0;
    const mins = Math.ceil(words / 200);
    return { words, chars, readingTime: mins < 1 ? '< 1 min' : `${mins} min` };
  }, [editor, editor?.storage.characterCount?.characters()]);

  // ---- Format helpers ----
  const handleCopy = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, '\n');
    navigator.clipboard.writeText(text);
  }, [editor]);

  const handlePaste = useCallback(async () => {
    if (!editor) return;
    try {
      const text = await navigator.clipboard.readText();
      editor.commands.insertContent(text);
    } catch {
      // clipboard access denied
    }
  }, [editor]);

  const handlePastePlain = useCallback(async () => {
    if (!editor) return;
    try {
      const text = await navigator.clipboard.readText();
      editor.commands.insertContent(text);
    } catch {
      // clipboard access denied
    }
  }, [editor]);

  // ---- Find/Replace ----
  const handleFind = useCallback(() => {
    setShowFindReplace((v) => !v);
    setFindText('');
    setReplaceText('');
    setFindCount(0);
  }, []);

  const handleFindNext = useCallback(() => {
    if (!editor || !findText) return;
    const { state } = editor;
    const { doc } = state;
    let count = 0;
    const lowerFind = findText.toLowerCase();
    let startFrom = state.selection.from;

    if (findCountRef.current === 0) startFrom = 0;
    else startFrom = state.selection.to;

    doc.descendants((node, pos) => {
      if (node.isText) {
        const text = node.text?.toLowerCase() || '';
        let idx = text.indexOf(lowerFind);
        while (idx !== -1) {
          const absPos = pos + idx;
          if (absPos > startFrom - findText.length) {
            if (count === 0) {
              editor.commands.setTextSelection({
                from: absPos,
                to: absPos + findText.length,
              });
            }
            count++;
          }
          idx = text.indexOf(lowerFind, idx + 1);
        }
      }
    });

    if (count === 0 && startFrom > 0) {
      findCountRef.current = 0;
      doc.descendants((node, pos) => {
        if (node.isText) {
          const text = node.text?.toLowerCase() || '';
          let idx = text.indexOf(lowerFind);
          while (idx !== -1) {
            const absPos = pos + idx;
            if (count === 0) {
              editor.commands.setTextSelection({ from: absPos, to: absPos + findText.length });
            }
            count++;
            idx = text.indexOf(lowerFind, idx + 1);
          }
        }
      });
    }

    findCountRef.current++;
    setFindCount(count);
  }, [editor, findText]);

  const handleReplace = useCallback(() => {
    if (!editor || !findText) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    if (selectedText.toLowerCase() === findText.toLowerCase()) {
      editor.chain().focus().insertContentAt({ from, to }, replaceText).run();
    }
    handleFindNext();
  }, [editor, findText, replaceText, handleFindNext]);

  const handleReplaceAll = useCallback(() => {
    if (!editor || !findText) return;
    const html = editor.getHTML();
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const replaceInTextNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const newText = node.textContent?.replace(regex, replaceText) || '';
        if (newText !== node.textContent) {
          node.textContent = newText;
        }
      } else {
        node.childNodes.forEach(replaceInTextNodes);
      }
    };
    replaceInTextNodes(tempDiv);
    editor.commands.setContent(tempDiv.innerHTML);
    setFindCount(0);
    findCountRef.current = 0;
  }, [editor, findText, replaceText]);

  // ---- URL validation helper ----
  const isValidUrl = useCallback((url: string): boolean => {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }, []);

  // ---- YouTube URL helper ----
  const getYoutubeEmbedUrl = useCallback((url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return `https://www.youtube.com/embed/${m[1]}`;
    }
    return null;
  }, []);

  // ---- Link ----
  const handleSetLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl && !isValidUrl(linkUrl)) return;
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  }, [editor, linkUrl, isValidUrl]);

  // Fix #3: Floating toolbar link popover apply
  const handleFloatingLinkApply = useCallback(() => {
    if (!editor) return;
    if (floatingLinkUrl && !isValidUrl(floatingLinkUrl)) return;
    if (floatingLinkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: floatingLinkUrl }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setShowFloatingLinkPopover(false);
    setFloatingLinkUrl('');
  }, [editor, floatingLinkUrl, isValidUrl]);

  const handleFloatingLinkRemove = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setShowFloatingLinkPopover(false);
    setFloatingLinkUrl('');
  }, [editor]);

  // ---- Image ----
  const handleSetImage = useCallback(() => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setShowImageInput(false);
    setImageUrl('');
  }, [editor, imageUrl]);

  // ---- Emoji ----
  const handleInsertEmoji = useCallback((emoji: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(emoji).run();
    setShowEmojiPicker(false);
  }, [editor]);

  // ---- Table ----
  // Fix #4: Insert table with specified size
  const handleInsertTableSize = useCallback((rows: number, cols: number) => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
  }, [editor]);

  const handleInsertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const handleAddColumnBefore = useCallback(() => { editor?.chain().focus().addColumnBefore().run(); closeTableCtxMenu(); }, [editor, closeTableCtxMenu]);
  const handleAddColumnAfter = useCallback(() => { editor?.chain().focus().addColumnAfter().run(); closeTableCtxMenu(); }, [editor, closeTableCtxMenu]);
  const handleDeleteColumn = useCallback(() => { editor?.chain().focus().deleteColumn().run(); closeTableCtxMenu(); }, [editor, closeTableCtxMenu]);
  const handleAddRowBefore = useCallback(() => { editor?.chain().focus().addRowBefore().run(); closeTableCtxMenu(); }, [editor, closeTableCtxMenu]);
  const handleAddRowAfter = useCallback(() => { editor?.chain().focus().addRowAfter().run(); closeTableCtxMenu(); }, [editor, closeTableCtxMenu]);
  const handleDeleteRow = useCallback(() => { editor?.chain().focus().deleteRow().run(); closeTableCtxMenu(); }, [editor, closeTableCtxMenu]);
  const handleDeleteTable = useCallback(() => { editor?.chain().focus().deleteTable().run(); closeTableCtxMenu(); }, [editor, closeTableCtxMenu]);
  const handleMergeCells = useCallback(() => { editor?.chain().focus().mergeCells().run(); closeTableCtxMenu(); }, [editor, closeTableCtxMenu]);
  const handleSplitCell = useCallback(() => { editor?.chain().focus().splitCell().run(); closeTableCtxMenu(); }, [editor, closeTableCtxMenu]);

  // Fix #4: Table border + move up/down handlers
  const handleSetTableBorders = useCallback((value: TableBorder) => {
    if (!editor) return;
    (editor.chain().focus() as any).setTableBorders(value).run();
    closeTableCtxMenu();
  }, [editor, closeTableCtxMenu]);

  const handleMoveTableUp = useCallback(() => {
    if (!editor) return;
    (editor.chain().focus() as any).moveTableUp().run();
    closeTableCtxMenu();
  }, [editor, closeTableCtxMenu]);

  const handleMoveTableDown = useCallback(() => {
    if (!editor) return;
    (editor.chain().focus() as any).moveTableDown().run();
    closeTableCtxMenu();
  }, [editor, closeTableCtxMenu]);

  // ---- Export ----
  const handleExportHTML = useCallback(() => {
    if (!editor) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Article</title></head><body>${editor.getHTML()}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'article.html'; a.click();
  }, [editor]);

  const handleExportMarkdown = useCallback(() => {
    if (!editor) return;
    const div = document.createElement('div');
    div.innerHTML = editor.getHTML();
    const toMd = (el: Element): string => {
      let md = '';
      el.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) { md += node.textContent || ''; return; }
        const e = node as Element;
        const tag = e.tagName?.toLowerCase();
        const inner = toMd(e);
        if (tag === 'h1') md += `# ${inner}\n\n`;
        else if (tag === 'h2') md += `## ${inner}\n\n`;
        else if (tag === 'h3') md += `### ${inner}\n\n`;
        else if (tag === 'h4') md += `#### ${inner}\n\n`;
        else if (tag === 'h5') md += `##### ${inner}\n\n`;
        else if (tag === 'h6') md += `###### ${inner}\n\n`;
        else if (tag === 'p') md += `${inner}\n\n`;
        else if (tag === 'strong' || tag === 'b') md += `**${inner}**`;
        else if (tag === 'em' || tag === 'i') md += `*${inner}*`;
        else if (tag === 'u') md += `__${inner}__`;
        else if (tag === 's') md += `~~${inner}~~`;
        else if (tag === 'code') md += tag === 'pre' ? `\`\`\`\n${inner}\n\`\`\`` : `\`${inner}\``;
        else if (tag === 'pre') md += `\`\`\`\n${inner}\n\`\`\`\n\n`;
        else if (tag === 'blockquote') md += `> ${inner}\n\n`;
        else if (tag === 'ul') { e.querySelectorAll(':scope > li').forEach((li) => { md += `- ${li.textContent}\n`; }); md += '\n'; }
        else if (tag === 'ol') { let i = 1; e.querySelectorAll(':scope > li').forEach((li) => { md += `${i++}. ${li.textContent}\n`; }); md += '\n'; }
        else if (tag === 'a') md += `[${inner}](${e.getAttribute('href') || ''})`;
        else if (tag === 'img') md += `![${e.getAttribute('alt') || ''}](${e.getAttribute('src') || ''})`;
        else if (tag === 'hr') md += `---\n\n`;
        else md += inner;
      });
      return md;
    };
    const md = toMd(div);
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'article.md'; a.click();
  }, [editor]);

  const handleExportPDF = useCallback(() => {
    if (!editor) return;
    const content = editor.getHTML();
    const win = window.open('', '_blank')!;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Article</title><style>
      body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.8;color:#111;}
      h1,h2,h3,h4,h5,h6{margin-top:1.5em;margin-bottom:0.5em;}
      pre{background:#f5f5f5;padding:1em;border-radius:4px;overflow-x:auto;}
      code{background:#f5f5f5;padding:0.2em 0.4em;border-radius:3px;font-size:0.9em;}
      blockquote{border-left:4px solid #ccc;margin:0;padding-left:1em;color:#666;}
      table{border-collapse:collapse;width:100%;} td,th{border:1px solid #ccc;padding:8px;}
      img{max-width:100%;}
      @media print{body{margin:0;}}
    </style></head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  }, [editor]);

  const handleExportWord = useCallback(() => {
    if (!editor) return;
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='UTF-8'><title>Article</title></head><body>${editor.getHTML()}</body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'article.doc'; a.click();
  }, [editor]);

  const handleExportImage = useCallback(async () => {
    if (!editor) return;
    const editorEl = document.querySelector('.editor-content') as HTMLElement;
    if (!editorEl) return;
    try {
      const canvas = await html2canvas(editorEl, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'article.png';
      a.click();
    } catch (err) {
      console.error('Export image failed:', err);
    }
  }, [editor]);

  // ---- Import ----
  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'docx') {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const buffer = ev.target?.result as ArrayBuffer;
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
          editor.commands.setContent(result.value);
        } catch (err) {
          console.error('Word import failed:', err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        if (ext === 'html' || ext === 'htm') {
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'text/html');
          editor.commands.setContent(doc.body.innerHTML || content);
        } else if (ext === 'md' || ext === 'markdown') {
          const html = content
            .replace(/^###### (.+)$/gm, '<h6>$1</h6>')
            .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
            .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
            .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(?!<[h|l|b|p])(.+)$/gm, '<p>$1</p>');
          editor.commands.setContent(html);
        } else {
          editor.commands.setContent(`<p>${content.replace(/\n/g, '</p><p>')}</p>`);
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
    setShowImportDialog(false);
  }, [editor]);

  // ---- Audio ----
  const handleInsertAudio = useCallback((src: string) => {
    if (!editor || !src) return;
    editor.chain().focus().insertContent(`<p><audio controls src="${src}" style="width:100%;max-width:500px;"></audio></p>`).run();
    setShowAudioDialog(false);
    setAudioUrl('');
  }, [editor]);

  const handleAudioFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const url = URL.createObjectURL(file);
    handleInsertAudio(url);
    e.target.value = '';
  }, [editor, handleInsertAudio]);

  // ---- Video ----
  const handleInsertVideo = useCallback((src: string) => {
    if (!editor || !src) return;
    const isYoutube = src.includes('youtube') || src.includes('youtu.be');
    if (isYoutube) {
      editor.commands.setYoutubeVideo({ src });
    } else {
      editor.chain().focus().insertContent(`<p><video controls src="${src}" style="max-width:100%;border-radius:8px;"></video></p>`).run();
    }
    setShowVideoDialog(false);
    setVideoUrl('');
  }, [editor]);

  const handleVideoFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const url = URL.createObjectURL(file);
    handleInsertVideo(url);
    e.target.value = '';
  }, [editor, handleInsertVideo]);

  // ---- Toggle Block ----
  const handleInsertToggle = useCallback(() => {
    if (!editor) return;
    (editor.chain().focus() as any).insertToggleBlock().run();
  }, [editor]);

  // Fix #13: Comment on selected text — Popover-based, uses CommentMark
  const handleOpenCommentPopover = useCallback(() => {
    if (!editor) return;
    // Save selection first
    savedSelectionRef.current = null;
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      // No selection — do nothing (do not alert)
      return;
    }
    savedSelectionRef.current = { from, to };
    setShowCommentPopover(true);
    setCommentText('');
  }, [editor]);

  const handleSubmitComment = useCallback(() => {
    if (!editor || !commentText.trim()) return;
    const range = savedSelectionRef.current;
    if (!range) {
      setShowCommentPopover(false);
      setCommentText('');
      return;
    }
    const commentId = 'c_' + Date.now();
    // Restore selection in editor then apply the comment mark
    editor.chain().focus().setTextSelection({ from: range.from, to: range.to }).run();
    (editor.chain() as any).addComment({
      commentId,
      comment: commentText.trim(),
      author: 'You',
    }).run();
    savedSelectionRef.current = null;
    setShowCommentPopover(false);
    setCommentText('');
  }, [editor, commentText]);

  // ---- Media Library ----
  const fetchMediaItems = useCallback(async (search = '') => {
    try {
      const params = new URLSearchParams({ limit: '20', type: 'image' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/media?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMediaItems(data.data || data.media || data || []);
      }
    } catch {
      // media fetch failed
    }
  }, []);

  const handleOpenMediaLibrary = useCallback(() => {
    setShowMediaLibrary(true);
    fetchMediaItems();
  }, [fetchMediaItems]);

  const handleMediaSearchChange = useCallback((val: string) => {
    setMediaSearch(val);
    fetchMediaItems(val);
  }, [fetchMediaItems]);

  const handleSelectMediaImage = useCallback((url: string) => {
    if (!editor) return;
    editor.chain().focus().setImage({ src: url }).run();
    setShowMediaLibrary(false);
    setMediaSearch('');
  }, [editor]);

  // ---- Image file upload ----
  const handleImageFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const url = URL.createObjectURL(file);
    editor.chain().focus().setImage({ src: url }).run();
    e.target.value = '';
  }, [editor]);

  // ---- Current state tracking ----
  const currentTextColor = editor?.getAttributes('textStyle').color || '';
  const currentHighlight = editor?.getAttributes('highlight').color || '';
  const currentFontFamily = editor?.getAttributes('textStyle').fontFamily || '';
  const currentFontSize = currentFontSizeState || editor?.getAttributes('textStyle').fontSize || '';
  const currentHeading = editor?.isActive('heading', { level: 1 }) ? 'H1'
    : editor?.isActive('heading', { level: 2 }) ? 'H2'
    : editor?.isActive('heading', { level: 3 }) ? 'H3'
    : editor?.isActive('heading', { level: 4 }) ? 'H4'
    : editor?.isActive('heading', { level: 5 }) ? 'H5'
    : editor?.isActive('heading', { level: 6 }) ? 'H6'
    : 'Paragraph';
  const currentAlign = editor?.isActive({ textAlign: 'center' }) ? 'center'
    : editor?.isActive({ textAlign: 'right' }) ? 'right'
    : editor?.isActive({ textAlign: 'justify' }) ? 'justify'
    : 'left';

  const getOrderedListStyle = (): OrderedListStyle | null => {
    if (!editor?.isActive('orderedList')) return null;
    const attrs = editor.getAttributes('orderedList');
    const style = attrs?.style as string | undefined;
    if (!style) return 'decimal';
    const match = style.match(/list-style-type\s*:\s*([^;]+)/);
    return (match?.[1]?.trim() as OrderedListStyle) || 'decimal';
  };

  const getBulletListStyle = (): BulletListStyle | null => {
    if (!editor?.isActive('bulletList')) return null;
    const attrs = editor.getAttributes('bulletList');
    const style = attrs?.style as string | undefined;
    if (!style) return 'disc';
    const match = style.match(/list-style-type\s*:\s*([^;]+)/);
    return (match?.[1]?.trim() as BulletListStyle) || 'disc';
  };

  // Track current line height (read from active paragraph/heading)
  useEffect(() => {
    if (!editor) return;
    const updateLineHeight = () => {
      const attrs = editor.getAttributes('paragraph');
      const lh = attrs?.lineHeight as string | undefined;
      setCurrentLineHeight(lh || '');
    };
    editor.on('selectionUpdate', updateLineHeight);
    editor.on('transaction', updateLineHeight);
    return () => {
      editor.off('selectionUpdate', updateLineHeight);
      editor.off('transaction', updateLineHeight);
    };
  }, [editor]);

  // Fix #11: Emoji keyword search
  const filteredEmojis = useMemo(() => {
    if (!emojiSearch) return null;
    const term = emojiSearch.toLowerCase().trim();
    if (!term) return null;
    const matched: string[] = [];
    const seen = new Set<string>();
    for (const emoji of EMOJI_GRID) {
      if (seen.has(emoji)) continue;
      const keywords = EMOJI_KEYWORDS[emoji] || [];
      const hit = keywords.some((kw) => kw.includes(term)) || emoji.includes(term);
      if (hit) {
        matched.push(emoji);
        seen.add(emoji);
      }
    }
    return matched;
  }, [emojiSearch]);

  if (!editor) return null;

  // Fix #12: Font size +/- handlers
  const stepFontSize = (direction: 1 | -1) => {
    if (!editor) return;
    const current = currentFontSize ? parseInt(currentFontSize, 10) : 16;
    const numericSizes = FONT_SIZES.map((s) => parseInt(s, 10));
    // Find nearest index
    let idx = numericSizes.findIndex((s) => s === current);
    if (idx < 0) {
      // Find closest
      let bestIdx = 0;
      let bestDiff = Math.abs(numericSizes[0] - current);
      numericSizes.forEach((s, i) => {
        const d = Math.abs(s - current);
        if (d < bestDiff) { bestDiff = d; bestIdx = i; }
      });
      idx = bestIdx;
    }
    const newIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + direction));
    const newSize = FONT_SIZES[newIdx];
    setCurrentFontSizeState(newSize);
    editor.chain().focus().setFontSize(newSize).run();
  };

  return (
    <div className={cn(
      'flex flex-col h-full border border-border/50 rounded-xl overflow-hidden bg-background',
      isFullscreen && 'fixed inset-4 z-50 rounded-xl shadow-2xl',
      className,
    )}>
      {/* ========== TOOLBAR ROW 1 ========== */}
      <div className="shrink-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/50 px-2 py-1.5 flex items-center gap-0.5 flex-wrap">
        {/* Editor Mode */}
        <TDropdown
          label={editorMode === 'editing' ? 'Editing' : 'Viewing'}
          icon={editorMode === 'editing' ? <LetterText className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          active={editorMode !== 'editing'}
        >
          <DropdownMenuRadioGroup value={editorMode} onValueChange={(v) => setEditorMode(v as EditorMode)}>
            <DropdownMenuRadioItem value="editing"><Pencil className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />Editing</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="viewing"><EyeIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />Viewing</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </TDropdown>

        {editorMode === 'viewing' ? (
          <>
            <TSep />
            {/* Highlight */}
            <ColorPicker
              colors={HIGHLIGHT_COLORS}
              label="Highlight"
              icon={<Highlighter className="h-4 w-4" />}
              currentColor={currentHighlight}
              onPick={(val) => val ? editor.chain().focus().toggleHighlight({ color: val }).run() : editor.chain().focus().unsetHighlight().run()}
            />
            {/* Comment */}
            <Tb tooltip="Add Comment" onClick={handleOpenCommentPopover}>
              <MessageSquare className="h-4 w-4" />
            </Tb>
          </>
        ) : (
          <>
        <TSep />

        {/* Import / Export */}
        <input ref={importFileRef} type="file" accept=".html,.htm,.md,.markdown,.txt,.docx" className="hidden" onChange={handleImportFile} />
        <input ref={audioFileRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioFileUpload} />
        <input ref={videoFileRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFileUpload} />
        <input ref={imageFileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileUpload} />
        <TDropdown label="Import" icon={<Upload className="h-4 w-4" />}>
          <DropdownMenuItem className="text-xs" onClick={() => importFileRef.current?.click()}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />From HTML / Markdown / Text
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={() => importFileRef.current?.click()}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />From Word (.docx)
          </DropdownMenuItem>
        </TDropdown>
        <TDropdown label="Export" icon={<Download className="h-4 w-4" />}>
          <DropdownMenuItem className="text-xs" onClick={handleExportHTML}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />Export as HTML
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={handleExportMarkdown}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />Export as Markdown
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={handleExportPDF}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />Export as PDF
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={handleExportImage}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />Export as Image
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={handleExportWord}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />Export as Word (.doc)
          </DropdownMenuItem>
        </TDropdown>

        <TSep />

        {/* History */}
        <Tb tooltip="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo2 className="h-4 w-4" />
        </Tb>
        <Tb tooltip="Redo (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo2 className="h-4 w-4" />
        </Tb>

        <TSep />

        {/* Clipboard */}
        <Tb tooltip="Copy" onClick={handleCopy}>
          <Copy className="h-4 w-4" />
        </Tb>
        <Tb tooltip="Paste" onClick={handlePaste}>
          <Clipboard className="h-4 w-4" />
        </Tb>
        <Tb tooltip="Paste without formatting (Shift+Paste)" onClick={handlePastePlain}>
          <ClipboardPaste className="h-4 w-4" />
        </Tb>

        <TSep />

        {/* Font Family */}
        <TDropdown
          label={FONT_FAMILIES.find((f) => f.value === currentFontFamily)?.label || 'Font'}
          icon={<Type className="h-4 w-4" />}
          active={!!currentFontFamily}
        >
          {FONT_FAMILIES.map((f) => (
            <DropdownMenuItem
              key={f.label}
              onClick={() => f.value ? editor.chain().focus().setFontFamily(f.value).run() : editor.chain().focus().unsetFontFamily().run()}
              className={cn('text-xs', currentFontFamily === f.value && 'bg-accent')}
            >
              <span style={{ fontFamily: f.value || 'inherit' }}>{f.label}</span>
            </DropdownMenuItem>
          ))}
        </TDropdown>

        {/* Fix #12: Font Size grouped control with minus/plus */}
        <div className="inline-flex items-center h-8 rounded-lg border border-border/60 bg-background shrink-0">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => stepFontSize(-1)}
            className="h-8 w-7 flex items-center justify-center rounded-l-lg text-muted-foreground hover:bg-accent/80 hover:text-foreground transition-colors"
            title="Smaller font"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <TDropdown label={currentFontSize || 'Size'} icon={<span className="text-xs font-bold w-4 text-center">{currentFontSize ? currentFontSize.replace('px','') : 'A'}</span>} triggerClassName="border-0 bg-transparent px-2 h-8">
            {FONT_SIZES.map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => { setCurrentFontSizeState(s); editor.chain().focus().setFontSize(s).run(); }}
                className={cn('text-xs', currentFontSize === s && 'bg-accent')}
              >
                <span style={{ fontSize: Math.min(parseInt(s), 20) }}>{s}</span>
                {currentFontSize === s && <Check className="h-3 w-3 ml-auto" />}
              </DropdownMenuItem>
            ))}
          </TDropdown>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => stepFontSize(1)}
            className="h-8 w-7 flex items-center justify-center rounded-r-lg text-muted-foreground hover:bg-accent/80 hover:text-foreground transition-colors"
            title="Larger font"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Fix #15: Line Height with checkmark */}
        <TDropdown
          label={currentLineHeight || 'Line'}
          icon={<Ruler className="h-4 w-4" />}
          active={!!currentLineHeight}
        >
          {LINE_HEIGHTS.map((lh) => (
            <DropdownMenuItem
              key={lh}
              onClick={() => {
                if (!editor) return;
                const { from, to } = editor.state.selection;
                const { tr } = editor.state;
                let changed = false;
                editor.state.doc.nodesBetween(Math.min(from, to), Math.max(from, to), (node, pos) => {
                  if (node.isBlock && (node.type.name === 'paragraph' || node.type.name === 'heading')) {
                    tr.setNodeMarkup(pos, undefined, { ...node.attrs, lineHeight: lh });
                    changed = true;
                  }
                });
                if (changed) editor.view.dispatch(tr);
              }}
              className={cn('text-xs', currentLineHeight === lh && 'bg-accent')}
            >
              <span style={{ lineHeight: lh, display: 'block' }}>{lh === '1' ? 'Single (1)' : lh === '1.5' ? '1.5x' : lh === '2' ? 'Double (2)' : lh}</span>
              {currentLineHeight === lh && <Check className="h-3 w-3 ml-auto" />}
            </DropdownMenuItem>
          ))}
        </TDropdown>

        <TSep />

        {/* Fix #7: Block / Heading Type — restructured as "Turn into" */}
        <TDropdown
          label={currentHeading}
          icon={
            currentHeading === 'H1' ? <Heading1 className="h-4 w-4" />
            : currentHeading === 'H2' ? <Heading2 className="h-4 w-4" />
            : currentHeading === 'H3' ? <Heading3 className="h-4 w-4" />
            : currentHeading === 'H4' ? <Heading4 className="h-4 w-4" />
            : currentHeading === 'H5' ? <Heading5 className="h-4 w-4" />
            : currentHeading === 'H6' ? <Heading6 className="h-4 w-4" />
            : <Pilcrow className="h-4 w-4" />
          }
          active={currentHeading !== 'Paragraph'}
        >
          <DropdownMenuLabel className="text-[10px] text-muted-foreground">Turn into</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()} className={cn('text-xs', currentHeading === 'Paragraph' && 'bg-accent')}>
            <Pilcrow className="h-4 w-4 mr-1.5" />Text
            {currentHeading === 'Paragraph' && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={cn('text-xs font-bold', currentHeading === 'H1' && 'bg-accent')}>
            Heading 1
            {currentHeading === 'H1' && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn('text-sm font-bold', currentHeading === 'H2' && 'bg-accent')}>
            Heading 2
            {currentHeading === 'H2' && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={cn('text-[13px] font-semibold', currentHeading === 'H3' && 'bg-accent')}>
            Heading 3
            {currentHeading === 'H3' && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} className={cn('text-xs font-semibold', currentHeading === 'H4' && 'bg-accent')}>
            Heading 4
            {currentHeading === 'H4' && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()} className={cn('text-xs font-medium', currentHeading === 'H5' && 'bg-accent')}>
            Heading 5
            {currentHeading === 'H5' && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()} className={cn('text-[11px] font-medium', currentHeading === 'H6' && 'bg-accent')}>
            Heading 6
            {currentHeading === 'H6' && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn('text-xs', editor.isActive('bulletList') && 'bg-accent')}>
            <List className="h-4 w-4 mr-1.5" />Bulleted List
            {editor.isActive('bulletList') && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn('text-xs', editor.isActive('orderedList') && 'bg-accent')}>
            <ListOrdered className="h-4 w-4 mr-1.5" />Numbered List
            {editor.isActive('orderedList') && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleTaskList().run()} className={cn('text-xs', editor.isActive('taskList') && 'bg-accent')}>
            <ListChecks className="h-4 w-4 mr-1.5" />To-do List
            {editor.isActive('taskList') && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleInsertToggle} className={cn('text-xs', editor.isActive('toggleBlock') && 'bg-accent')}>
            <ToggleLeft className="h-4 w-4 mr-1.5" />Toggle List
            {editor.isActive('toggleBlock') && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={cn('text-xs font-mono', editor.isActive('codeBlock') && 'bg-accent')}>
            <Code className="h-4 w-4 mr-1.5" />Code Block
            {editor.isActive('codeBlock') && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn('text-xs', editor.isActive('blockquote') && 'bg-accent')}>
            <Quote className="h-4 w-4 mr-1.5" />Block Quote
            {editor.isActive('blockquote') && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
        </TDropdown>

        <TSep />

        {/* Text Formatting (Bold / Italic / Underline / Strikethrough) */}
        <Tb tooltip="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </Tb>
        <Tb tooltip="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </Tb>
        <Tb tooltip="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </Tb>
        <Tb tooltip="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </Tb>

        <TSep />

        {/* Colors */}
        <ColorPicker
          colors={TEXT_COLORS}
          label="Text Color"
          icon={<Palette className="h-4 w-4" />}
          currentColor={currentTextColor}
          onPick={(val) => val ? editor.chain().focus().setColor(val).run() : editor.chain().focus().unsetColor().run()}
          onClear={() => editor.chain().focus().unsetColor().run()}
        />
        <ColorPicker
          colors={HIGHLIGHT_COLORS}
          label="Background Color"
          icon={<Paintbrush className="h-4 w-4" />}
          currentColor={currentHighlight}
          onPick={(val) => val ? editor.chain().focus().toggleHighlight({ color: val }).run() : editor.chain().focus().unsetHighlight().run()}
          onClear={() => editor.chain().focus().unsetHighlight().run()}
        />

        <TSep />

        {/* Fix #5: Bullet List grouped dropdown (disc/circle/square) */}
        <TDropdown
          label="Bullet List"
          icon={<List className="h-4 w-4" />}
          active={editor.isActive('bulletList')}
        >
          {BULLET_LIST_STYLES.map((s) => (
            <DropdownMenuItem
              key={s.value}
              className="text-xs gap-2"
              onClick={() => {
                const cur = getBulletListStyle();
                if (cur === s.value && editor.isActive('bulletList')) {
                  editor.chain().focus().toggleBulletList().run();
                } else {
                  editor.chain().focus().toggleBulletList().run();
                  (editor.chain().focus() as any).setBulletListStyle(s.value).run();
                }
              }}
            >
              <span className="font-mono text-[11px] text-muted-foreground w-16 shrink-0">{s.preview}</span>
              <span>{s.label}</span>
              {getBulletListStyle() === s.value && editor.isActive('bulletList') && (
                <Check className="h-3 w-3 ml-auto" />
              )}
            </DropdownMenuItem>
          ))}
        </TDropdown>

        {/* Fix #6: Numbered List grouped dropdown (verified working) */}
        <TDropdown
          label="Numbered List"
          icon={<ListOrdered className="h-4 w-4" />}
          active={editor.isActive('orderedList')}
        >
          {ORDERED_LIST_STYLES.map((s) => (
            <DropdownMenuItem
              key={s.value}
              className="text-xs gap-2"
              onClick={() => {
                const cur = getOrderedListStyle();
                if (cur === s.value && editor.isActive('orderedList')) {
                  editor.chain().focus().toggleOrderedList().run();
                } else {
                  editor.chain().focus().toggleOrderedList().run();
                  (editor.chain().focus() as any).setOrderedListStyle(s.value).run();
                }
              }}
            >
              <span className="font-mono text-[11px] text-muted-foreground w-16 shrink-0">{s.preview}</span>
              <span>{s.label}</span>
              {getOrderedListStyle() === s.value && editor.isActive('orderedList') && (
                <Check className="h-3 w-3 ml-auto" />
              )}
            </DropdownMenuItem>
          ))}
        </TDropdown>
        <Tb tooltip="Checklist" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}>
          <ListChecks className="h-4 w-4" />
        </Tb>

        <TSep />

        {/* Indent */}
        <Tb tooltip="Increase Indent" onClick={() => editor.chain().focus().indent().run()}>
          <Indent className="h-4 w-4" />
        </Tb>
        <Tb tooltip="Decrease Indent" onClick={() => editor.chain().focus().outdent().run()}>
          <Outdent className="h-4 w-4" />
        </Tb>

        <TSep />

        {/* Alignment */}
        <TDropdown label="Align" icon={<AlignLeft className="h-4 w-4" />} active={currentAlign !== 'left'}>
          <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().setTextAlign('left').run()}>
            <AlignLeft className="h-3.5 w-3.5 mr-1.5" />Align Left
            {currentAlign === 'left' && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().setTextAlign('center').run()}>
            <AlignCenter className="h-3.5 w-3.5 mr-1.5" />Align Center
            {currentAlign === 'center' && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().setTextAlign('right').run()}>
            <AlignRight className="h-3.5 w-3.5 mr-1.5" />Align Right
            {currentAlign === 'right' && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
            <AlignJustify className="h-3.5 w-3.5 mr-1.5" />Justify
            {currentAlign === 'justify' && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
        </TDropdown>

        <TSep />

        {/* Fix #16: Insert dropdown — Keyboard Input, Superscript, Subscript */}
        <TDropdown label="Insert" icon={<Plus className="h-4 w-4" />} triggerClassName="px-2.5">
          <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().insertContent('<kbd class="editor-kbd">Ctrl</kbd>').run()}>
            <Keyboard className="h-3.5 w-3.5 mr-1.5" />Keyboard Input
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().toggleSuperscript().run()}>
            <span className="font-bold mr-1.5 w-4 text-center">X²</span>Superscript
            {editor.isActive('superscript') && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().toggleSubscript().run()}>
            <span className="font-bold mr-1.5 w-4 text-center">X₂</span>Subscript
            {editor.isActive('subscript') && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
        </TDropdown>

        {/* Insert Link / Image / Video / Audio / Comment */}
        <Tb tooltip="Insert Link" active={editor.isActive('link')} onClick={() => {
          const prev = editor.getAttributes('link').href;
          setLinkUrl(prev || '');
          setShowLinkInput(true);
        }}>
          <Link2 className="h-4 w-4" />
        </Tb>
        <Tb tooltip="Insert Image" onClick={() => { setImageUrl(''); setShowImageInput(true); }}>
          <ImageIcon className="h-4 w-4" />
        </Tb>
        <Tb tooltip="Insert Video" onClick={() => { setVideoUrl(''); setShowVideoDialog(true); }}>
          <Film className="h-4 w-4" />
        </Tb>
        <Tb tooltip="Insert Audio" onClick={() => { setAudioUrl(''); setShowAudioDialog(true); }}>
          <Music className="h-4 w-4" />
        </Tb>
        {/* Comment (popover-based) */}
        <Tb tooltip="Add Comment" onClick={handleOpenCommentPopover}>
          <MessageSquare className="h-4 w-4" />
        </Tb>

        {/* Fix #4: Table dropdown with grid selector + border controls + move up/down */}
        <TDropdown label="Table" icon={<TableIcon className="h-4 w-4" />} active={editor.isActive('table')}>
          {/* Grid selector — replaces "Insert Table" single item */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs hover:bg-accent transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <TableIcon className="h-3.5 w-3.5" />Insert Table
                </span>
                <ChevronRight className="h-3 w-3 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start" side="right">
              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-6 gap-0.5">
                  {Array.from({ length: 36 }).map((_, i) => {
                    const r = Math.floor(i / 6) + 1;
                    const c = (i % 6) + 1;
                    const active = r <= tableGridHover.rows && c <= tableGridHover.cols;
                    return (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setTableGridHover({ rows: r, cols: c })}
                        onClick={() => {
                          handleInsertTableSize(r, c);
                          setTableGridHover({ rows: 0, cols: 0 });
                        }}
                        className={cn(
                          'h-5 w-5 rounded-sm border',
                          active ? 'bg-amber-400 border-amber-500' : 'border-border/60 hover:bg-accent/50',
                        )}
                      />
                    );
                  })}
                </div>
                <span className="text-[10px] text-muted-foreground text-center">
                  {tableGridHover.rows > 0 ? `${tableGridHover.rows} × ${tableGridHover.cols}` : 'Hover to select'}
                </span>
              </div>
            </PopoverContent>
          </Popover>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs"><TableProperties className="h-3.5 w-3.5 mr-1.5" />Cell</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={handleMergeCells} className="text-xs"><TableProperties className="h-3.5 w-3.5 mr-1.5" />Merge Cells</DropdownMenuItem>
              <DropdownMenuItem onClick={handleSplitCell} className="text-xs">Split Cell</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs"><Rows3 className="h-3.5 w-3.5 mr-1.5" />Row</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={handleAddRowBefore} className="text-xs"><Rows3 className="h-3.5 w-3.5 mr-1.5" />Insert Row Before</DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddRowAfter} className="text-xs"><Rows3 className="h-3.5 w-3.5 mr-1.5" />Insert Row After</DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeleteRow} className="text-xs">Delete Row</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs"><Columns3 className="h-3.5 w-3.5 mr-1.5" />Column</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={handleAddColumnBefore} className="text-xs"><Columns3 className="h-3.5 w-3.5 mr-1.5" />Insert Column Before</DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddColumnAfter} className="text-xs"><Columns3 className="h-3.5 w-3.5 mr-1.5" />Insert Column After</DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeleteColumn} className="text-xs">Delete Column</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {/* Fix #4: Border submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs"><Pencil className="h-3.5 w-3.5 mr-1.5" />Borders</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {TABLE_BORDERS.map((b) => (
                <DropdownMenuItem
                  key={b.value}
                  onClick={() => handleSetTableBorders(b.value)}
                  className="text-xs"
                >
                  {b.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {/* Fix #4: Move up/down */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs"><ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />Move</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={handleMoveTableUp} className="text-xs"><ArrowUp className="h-3.5 w-3.5 mr-1.5" />Move Up</DropdownMenuItem>
              <DropdownMenuItem onClick={handleMoveTableDown} className="text-xs"><ArrowDown className="h-3.5 w-3.5 mr-1.5" />Move Down</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDeleteTable} className="text-xs text-destructive">Delete table</DropdownMenuItem>
        </TDropdown>

        {/* Code Block (kept) */}
        <Tb tooltip="Code Block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code className="h-4 w-4" />
        </Tb>

        {/* Fix #11: Emoji with keyword search */}
        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-150 shrink-0 text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                  onClick={() => { setShowEmojiPicker(true); setEmojiSearch(''); setEmojiCategory(Object.keys(EMOJI_CATEGORIES)[0]); }}
                >
                  <SmilePlus className="h-4 w-4" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4} className="text-xs">Emoji</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-80 p-2" align="start">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                value={emojiSearch}
                onChange={(e) => setEmojiSearch(e.target.value)}
                placeholder="Search by keyword (smile, heart, ...)"
                className="h-7 pl-7 text-xs"
                autoFocus
              />
            </div>
            {!emojiSearch && (
              <div className="flex flex-wrap gap-0.5 mb-2">
                {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setEmojiCategory(cat); setEmojiSearch(''); }}
                    className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 transition-colors',
                      (emojiCategory === cat && !emojiSearch) ? 'bg-accent text-accent-foreground border-transparent' : 'border-border/50 text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-10 gap-0.5 max-h-48 overflow-y-auto">
              {(filteredEmojis
                ? filteredEmojis
                : (EMOJI_CATEGORIES[emojiCategory] || EMOJI_CATEGORIES[Object.keys(EMOJI_CATEGORIES)[0]] || [])
              ).map((emoji, i) => (
                <button
                  key={emoji + i}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInsertEmoji(emoji)}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent text-base transition-colors"
                >
                  {emoji}
                </button>
              ))}
              {filteredEmojis && filteredEmojis.length === 0 && (
                <div className="col-span-10 text-center text-xs text-muted-foreground py-4">
                  No emojis found for &ldquo;{emojiSearch}&rdquo;
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Mention */}
        <Tb tooltip="Mention (@)" onClick={() => editor.chain().focus().insertContent('@').run()}>
          <AtSign className="h-4 w-4" />
        </Tb>

        <TSep />

        {/* Find/Replace & Clear */}
        <Tb tooltip="Find & Replace (Ctrl+F)" active={showFindReplace} onClick={handleFind}>
          <Search className="h-4 w-4" />
        </Tb>
        <Tb tooltip="Clear Formatting" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
          <RemoveFormatting className="h-4 w-4" />
        </Tb>

        {/* More Options (...) — formatting shortcuts */}
        <TDropdown label="" icon={<MoreHorizontal className="h-4 w-4" />}>
          <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().toggleSuperscript().run()}>
            <span className="font-bold mr-1.5">X²</span>Superscript
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().toggleSubscript().run()}>
            <span className="font-bold mr-1.5">X₂</span>Subscript
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-3.5 w-3.5 mr-1.5" />Bold
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-3.5 w-3.5 mr-1.5" />Italic
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="h-3.5 w-3.5 mr-1.5" />Underline
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="h-3.5 w-3.5 mr-1.5" />Strikethrough
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().setTextAlign('left').run()}>
            <AlignLeft className="h-3.5 w-3.5 mr-1.5" />Align Left
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().setTextAlign('center').run()}>
            <AlignCenter className="h-3.5 w-3.5 mr-1.5" />Align Center
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().setTextAlign('right').run()}>
            <AlignRight className="h-3.5 w-3.5 mr-1.5" />Align Right
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
            <AlignJustify className="h-3.5 w-3.5 mr-1.5" />Justify
          </DropdownMenuItem>
        </TDropdown>
          </>
        )}

        {/* Fullscreen */}
        <div className="ml-auto">
          <Tb tooltip={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Tb>
        </div>
      </div>

      {/* ========== LINK INPUT BAR (toolbar-level) ========== */}
      {showLinkInput && (
        <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-3 py-2">
          <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="h-8 text-sm flex-1"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSetLink(); if (e.key === 'Escape') setShowLinkInput(false); }}
            autoFocus
          />
          {linkUrl && !isValidUrl(linkUrl) && <span className="text-[10px] text-destructive shrink-0">Invalid URL</span>}
          <Button type="button" size="sm" className="h-8" onClick={handleSetLink} disabled={!!linkUrl && !isValidUrl(linkUrl)}>Apply</Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowLinkInput(false)}>
            <span className="text-xs">✕</span>
          </Button>
        </div>
      )}

      {/* ========== VIDEO DIALOG ========== */}
      {showVideoDialog && (
        <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-3 py-2">
          <Film className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Paste video URL or upload a file..." className="h-8 text-sm flex-1"
            onKeyDown={(e) => { if (e.key === 'Enter') handleInsertVideo(videoUrl); if (e.key === 'Escape') setShowVideoDialog(false); }} autoFocus />
          <Button type="button" size="sm" className="h-8" onClick={() => handleInsertVideo(videoUrl)} disabled={!videoUrl.trim() || !isValidUrl(videoUrl)}>Insert</Button>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => videoFileRef.current?.click()}>
            <Upload className="h-3 w-3" />Upload
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowVideoDialog(false)}><span className="text-xs">✕</span></Button>
        </div>
      )}

      {/* ========== AUDIO DIALOG ========== */}
      {showAudioDialog && (
        <div className="flex flex-col gap-2 border-b border-border/50 bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="Paste audio URL or upload a file..." className="h-8 text-sm flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter') handleInsertAudio(audioUrl); if (e.key === 'Escape') setShowAudioDialog(false); }} autoFocus />
            <Button type="button" size="sm" className="h-8" onClick={() => handleInsertAudio(audioUrl)}>Insert</Button>
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => audioFileRef.current?.click()}>
              <Upload className="h-3 w-3" />Upload
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowAudioDialog(false)}><span className="text-xs">✕</span></Button>
          </div>
        </div>
      )}

      {/* ========== IMAGE INPUT BAR ========== */}
      {showImageInput && (
        <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-3 py-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Paste image URL..."
            className="h-8 text-sm flex-1"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSetImage(); if (e.key === 'Escape') setShowImageInput(false); }}
            autoFocus
          />
          <Button type="button" size="sm" className="h-8" onClick={handleSetImage}>Insert</Button>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => imageFileRef.current?.click()}>
            <Upload className="h-3 w-3" />Upload
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowImageInput(false)}>
            <span className="text-xs">✕</span>
          </Button>
        </div>
      )}

      {/* ========== MEDIA LIBRARY DIALOG ========== */}
      {showMediaLibrary && (
        <div className="flex flex-col gap-2 border-b border-border/50 bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input value={mediaSearch} onChange={(e) => handleMediaSearchChange(e.target.value)} placeholder="Search media..." className="h-8 pl-7 text-sm" autoFocus />
            </div>
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => imageFileRef.current?.click()}>
              <Upload className="h-3 w-3" />Upload
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowMediaLibrary(false); setMediaSearch(''); }}>
              <span className="text-xs">✕</span>
            </Button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
            {mediaItems.length === 0 && <p className="text-xs text-muted-foreground col-span-full text-center py-4">No media found. Upload or search for images.</p>}
            {mediaItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectMediaImage(item.url)}
                className="aspect-square rounded-lg border border-border/50 overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                title={item.filename}
              >
                <img src={item.thumbnailUrl || item.url} alt={item.alt || item.filename} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========== FIND/REPLACE BAR ========== */}
      {showFindReplace && (
        <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-3 py-2 flex-wrap">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={findText}
              onChange={(e) => { setFindText(e.target.value); findCountRef.current = 0; setFindCount(0); }}
              placeholder="Find..."
              className="h-8 pl-8 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') handleFindNext(); if (e.key === 'Escape') setShowFindReplace(false); }}
              autoFocus
            />
          </div>
          <div className="relative flex-1 min-w-[150px]">
            <ArrowRightLeft className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replace..."
              className="h-8 pl-8 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') handleReplace(); if (e.key === 'Escape') setShowFindReplace(false); }}
            />
          </div>
          {findCount > 0 && <span className="text-[11px] text-muted-foreground">{findCount} found</span>}
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={handleFindNext}>Next</Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={handleReplace}>Replace</Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={handleReplaceAll}>All</Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowFindReplace(false); findCountRef.current = 0; }}>
            <span className="text-xs">✕</span>
          </Button>
        </div>
      )}

      {/* ========== FLOATING CONTEXTUAL TOOLBAR (position:fixed, above selection) ========== */}
      {floatingToolbar.show && editor && (
        <div
          data-floating-toolbar=""
          style={{
            position: 'fixed',
            left: floatingToolbar.x,
            top: floatingToolbar.y,
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
          className="flex items-center gap-0.5 rounded-lg border border-border bg-popover/95 backdrop-blur-sm shadow-lg px-1.5 py-1 pointer-events-auto"
        >
          {/* Bold */}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"
            className={cn('h-7 w-7 flex items-center justify-center rounded transition-colors', editor.isActive('bold') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground')}>
            <Bold className="h-3.5 w-3.5" />
          </button>
          {/* Italic */}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"
            className={cn('h-7 w-7 flex items-center justify-center rounded transition-colors', editor.isActive('italic') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground')}>
            <Italic className="h-3.5 w-3.5" />
          </button>
          {/* Underline */}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"
            className={cn('h-7 w-7 flex items-center justify-center rounded transition-colors', editor.isActive('underline') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground')}>
            <UnderlineIcon className="h-3.5 w-3.5" />
          </button>
          {/* Strikethrough */}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"
            className={cn('h-7 w-7 flex items-center justify-center rounded transition-colors', editor.isActive('strike') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground')}>
            <Strikethrough className="h-3.5 w-3.5" />
          </button>
          {/* Superscript */}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleSuperscript().run()} title="Superscript"
            className={cn('h-7 w-7 flex items-center justify-center rounded transition-colors text-[10px] font-bold', editor.isActive('superscript') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground')}>
            X²
          </button>
          {/* Subscript */}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleSubscript().run()} title="Subscript"
            className={cn('h-7 w-7 flex items-center justify-center rounded transition-colors text-[10px] font-bold', editor.isActive('subscript') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground')}>
            X₂
          </button>
          <div className="h-4 w-px bg-border mx-0.5 shrink-0" />
          {/* Highlight */}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} title="Highlight"
            className={cn('h-7 w-7 flex items-center justify-center rounded transition-colors', editor.isActive('highlight') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground')}>
            <Highlighter className="h-3.5 w-3.5" />
          </button>
          {/* Fix #3: Link popover (replaces window.prompt) */}
          <Popover open={showFloatingLinkPopover} onOpenChange={(open) => {
            setShowFloatingLinkPopover(open);
            if (open) {
              const prev = editor.getAttributes('link').href;
              setFloatingLinkUrl(prev || '');
            }
          }}>
            <PopoverTrigger asChild>
              <button type="button" onMouseDown={(e) => e.preventDefault()} title="Link"
                className={cn('h-7 w-7 flex items-center justify-center rounded transition-colors', editor.isActive('link') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground')}>
                <Link2 className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="center" sideOffset={6}>
              <div className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Input
                  value={floatingLinkUrl}
                  onChange={(e) => setFloatingLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="h-7 text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleFloatingLinkApply(); }
                    if (e.key === 'Escape') setShowFloatingLinkPopover(false);
                  }}
                  autoFocus
                />
              </div>
              {floatingLinkUrl && !isValidUrl(floatingLinkUrl) && (
                <p className="text-[10px] text-destructive mt-1">Invalid URL</p>
              )}
              <div className="flex items-center gap-1.5 mt-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={handleFloatingLinkApply}
                  disabled={!!floatingLinkUrl && !isValidUrl(floatingLinkUrl)}
                >
                  Apply
                </Button>
                {editor.isActive('link') && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={handleFloatingLinkRemove}
                  >
                    <Unlink className="h-3 w-3 mr-1" />Remove
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {/* Clear Formatting */}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().unsetAllMarks().run()} title="Clear Formatting"
            className="h-7 w-7 flex items-center justify-center rounded transition-colors text-muted-foreground hover:bg-accent/70 hover:text-foreground">
            <RemoveFormatting className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Fix #13: Comment Popover (replaces full-width comment bar) */}
      {showCommentPopover && (
        <Popover open={showCommentPopover} onOpenChange={setShowCommentPopover}>
          <PopoverContent
            className="w-80 p-2"
            align="center"
            // Anchor at top-center of viewport (since there's no trigger visible)
            sideOffset={window.innerHeight - 200}
            style={{ position: 'fixed', left: '50%', top: '40%', transform: 'translateX(-50%)' }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquare className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-xs font-medium">Add Comment</span>
            </div>
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment on the selected text..."
              rows={3}
              className="text-xs resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmitComment(); }
                if (e.key === 'Escape') { setShowCommentPopover(false); setCommentText(''); }
              }}
              autoFocus
            />
            <div className="flex items-center gap-1.5 mt-2">
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs flex-1 bg-amber-500 hover:bg-amber-400 text-white"
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
              >
                Save Comment
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setShowCommentPopover(false); setCommentText(''); }}
              >
                Cancel
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* ========== TABLE CONTEXT MENU (right-click on table) ========== */}
      {tableCtxMenu.show && (
        <div
          ref={tableCtxMenuRef}
          className="table-ctx-menu"
          style={{ position: 'fixed', left: tableCtxMenu.x, top: tableCtxMenu.y, zIndex: 9999 }}
          onContextMenu={(e) => e.preventDefault()}
          onMouseLeave={() => setTableCtxMenu((p) => ({ ...p, activeSubmenu: null }))}
        >
          {/* Table submenu trigger */}
          <div
            className="table-ctx-item"
            onMouseEnter={() => setTableCtxMenu((p) => ({ ...p, activeSubmenu: 'table' }))}
          >
            <span>Table</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            {tableCtxMenu.activeSubmenu === 'table' && (
              <div className="table-ctx-submenu" onMouseEnter={() => setTableCtxMenu((p) => ({ ...p, activeSubmenu: 'table' }))}>
                <div className="table-ctx-item" onClick={(e) => { e.stopPropagation(); handleInsertTable(); closeTableCtxMenu(); }}>
                  <Plus className="h-3.5 w-3.5 mr-2 opacity-70" />Insert 3×3 Table
                </div>
                <div className="table-ctx-item" onClick={(e) => { e.stopPropagation(); handleMoveTableUp(); }}>
                  <ArrowUp className="h-3.5 w-3.5 mr-2 opacity-70" />Move Up
                </div>
                <div className="table-ctx-item" onClick={(e) => { e.stopPropagation(); handleMoveTableDown(); }}>
                  <ArrowDown className="h-3.5 w-3.5 mr-2 opacity-70" />Move Down
                </div>
                <div className="table-ctx-item table-ctx-item-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteTable(); }}>
                  Delete Table
                </div>
              </div>
            )}
          </div>

          {/* Cell submenu trigger */}
          <div
            className="table-ctx-item"
            onMouseEnter={() => setTableCtxMenu((p) => ({ ...p, activeSubmenu: 'cell' }))}
          >
            <span>Cell</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            {tableCtxMenu.activeSubmenu === 'cell' && (
              <div className="table-ctx-submenu" onMouseEnter={() => setTableCtxMenu((p) => ({ ...p, activeSubmenu: 'cell' }))}>
                <div className="table-ctx-item" onClick={(e) => { e.stopPropagation(); handleMergeCells(); }}>
                  <TableProperties className="h-3.5 w-3.5 mr-2 opacity-70" />Merge Cells
                </div>
                <div className="table-ctx-item" onClick={(e) => { e.stopPropagation(); handleSplitCell(); }}>
                  Split Cell
                </div>
              </div>
            )}
          </div>

          {/* Row submenu trigger */}
          <div
            className="table-ctx-item"
            onMouseEnter={() => setTableCtxMenu((p) => ({ ...p, activeSubmenu: 'row' }))}
          >
            <span>Row</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            {tableCtxMenu.activeSubmenu === 'row' && (
              <div className="table-ctx-submenu" onMouseEnter={() => setTableCtxMenu((p) => ({ ...p, activeSubmenu: 'row' }))}>
                <div className="table-ctx-item" onClick={(e) => { e.stopPropagation(); handleAddRowBefore(); }}>
                  <Rows3 className="h-3.5 w-3.5 mr-2 opacity-70" />Insert Row Before
                </div>
                <div className="table-ctx-item" onClick={(e) => { e.stopPropagation(); handleAddRowAfter(); }}>
                  <Rows3 className="h-3.5 w-3.5 mr-2 opacity-70" />Insert Row After
                </div>
                <div className="table-ctx-item table-ctx-item-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteRow(); }}>
                  Delete Row
                </div>
              </div>
            )}
          </div>

          {/* Column submenu trigger */}
          <div
            className="table-ctx-item"
            onMouseEnter={() => setTableCtxMenu((p) => ({ ...p, activeSubmenu: 'column' }))}
          >
            <span>Column</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            {tableCtxMenu.activeSubmenu === 'column' && (
              <div className="table-ctx-submenu" onMouseEnter={() => setTableCtxMenu((p) => ({ ...p, activeSubmenu: 'column' }))}>
                <div className="table-ctx-item" onClick={(e) => { e.stopPropagation(); handleAddColumnBefore(); }}>
                  <Columns3 className="h-3.5 w-3.5 mr-2 opacity-70" />Insert Column Before
                </div>
                <div className="table-ctx-item" onClick={(e) => { e.stopPropagation(); handleAddColumnAfter(); }}>
                  <Columns3 className="h-3.5 w-3.5 mr-2 opacity-70" />Insert Column After
                </div>
                <div className="table-ctx-item table-ctx-item-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteColumn(); }}>
                  Delete Column
                </div>
              </div>
            )}
          </div>

          {/* Borders submenu (right-click) */}
          <div
            className="table-ctx-item"
            onMouseEnter={() => setTableCtxMenu((p) => ({ ...p, activeSubmenu: 'borders' }))}
          >
            <span>Borders</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            {tableCtxMenu.activeSubmenu === 'borders' && (
              <div className="table-ctx-submenu" onMouseEnter={() => setTableCtxMenu((p) => ({ ...p, activeSubmenu: 'borders' }))}>
                {TABLE_BORDERS.map((b) => (
                  <div
                    key={b.value}
                    className="table-ctx-item"
                    onClick={(e) => { e.stopPropagation(); handleSetTableBorders(b.value); }}
                  >
                    {b.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="table-ctx-separator" />

          {/* Delete table (direct action) */}
          <div
            className="table-ctx-item table-ctx-item-destructive"
            onClick={(e) => { e.stopPropagation(); handleDeleteTable(); }}
          >
            Delete table
          </div>
        </div>
      )}

      {/* ========== EDITOR CONTENT ========== */}
      <div
        className="flex-1 overflow-y-auto min-h-0 relative"
        onContextMenu={handleTableContextMenu}
        onDragOver={handleEditorDragOver}
        onDrop={handleEditorDrop}
        onDragEnd={handleEditorDragEnd}
      >
        {/* Fix #1: Drag handle overlay (real DOM, draggable) */}
        {dragHandle.show && (
          <div
            draggable
            onDragStart={handleDragHandleDragStart}
            style={{
              position: 'fixed',
              top: dragHandle.top,
              left: dragHandle.left,
              zIndex: 50,
              cursor: 'grab',
            }}
            className="h-6 w-6 rounded-md bg-popover border border-border/60 shadow-sm flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Drag to reorder block"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        )}
        {/* Drop indicator line */}
        {dropIndicator.show && (
          <div
            style={{
              position: 'fixed',
              top: dropIndicator.top - 1.5,
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: 'oklch(0.75 0.18 75)',
              zIndex: 49,
              pointerEvents: 'none',
            }}
          />
        )}
        <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-16 py-8">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* ========== STATUS BAR ========== */}
      <div className="border-t border-border/30 px-4 py-1.5 flex items-center gap-4 text-[11px] text-muted-foreground bg-muted/20 shrink-0">
        <span>{stats.words} words</span>
        <span>·</span>
        <span>{stats.readingTime}</span>
        <span>·</span>
        <span>{stats.chars} characters</span>
        <div className="ml-auto hidden sm:flex items-center gap-2">
          {editorMode !== 'editing' && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
              {editorMode}
            </Badge>
          )}
          <span className="font-mono">{currentFontFamily ? currentFontFamily.split(',')[0].replace(/['"]+/g, '') : 'Default'}</span>
          {currentFontSize && <span>· {currentFontSize}</span>}
        </div>
      </div>
    </div>
  );
});

// -------------------- Placeholder icon components --------------------
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
