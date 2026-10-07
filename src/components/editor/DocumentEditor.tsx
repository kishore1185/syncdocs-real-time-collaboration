import { useEditor, EditorContent, Editor } from '@tiptap/react';
import Collaboration from '@tiptap/extension-collaboration';
import { CollaborationCursor } from './extensions/CollaborationCursor';
import * as Y from 'yjs';
import { StarterKit } from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { FontSize } from './extensions/FontSize';
import { LineHeight } from './extensions/LineHeight';
import { ParagraphSpacing } from './extensions/ParagraphSpacing';
import { Highlight } from './extensions/Highlight';
import { ResizableImage } from './extensions/ResizableImage';
import { Table } from '@tiptap/extension-table';
import { TableRow as TiptapTableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableInteractions } from './extensions/TableInteractions';
import { useEffect } from 'react';

const TableRow = TiptapTableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      height: {
        default: null,
        parseHTML: element => element.style.height || null,
        renderHTML: attributes => {
          if (!attributes['height']) {
            return {};
          }
          return { style: `height: ${attributes['height']}` };
        },
      },
    };
  },
});

export interface DocumentEditorProps {
  initialContent: string;
  isLocked: boolean;
  lockedBy?: string | null;
  pageBorder?: { style: string; width: string; color: string } | null;
  onChange: (content: string) => void;
  onEditorReady: (editor: Editor) => void;
  ydoc: Y.Doc;
  awareness: any;
  currentUser: { name: string; color: string };
}

export function DocumentEditor({ initialContent, isLocked, lockedBy, pageBorder, onChange, onEditorReady, ydoc, awareness, currentUser }: DocumentEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      FontSize,
      LineHeight,
      ParagraphSpacing,
      Highlight,
      ResizableImage,
      TableInteractions,
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'prose-table',
          draggable: true,
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Collaboration.configure({
        document: ydoc,
      }),
      ...(awareness ? [
        CollaborationCursor.configure({
          provider: { awareness },
          user: currentUser,
        }),
      ] : []),
    ],
    // Let Tiptap Collaboration seed the initial document state if the YDoc is completely empty
    ...(ydoc.share.size === 0 ? { content: initialContent } : {}),
    editable: !isLocked,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[1056px] px-[96px] py-[96px]',
      },
    },
  });

  // Pass editor instance up to parent for toolbar
  useEffect(() => {
    if (editor) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Handle lock changes dynamically
  useEffect(() => {
    if (editor && editor.isEditable === isLocked) {
      editor.setEditable(!isLocked);
    }
  }, [editor, isLocked]);

  return (
    <div 
      className="w-full min-h-[1056px] bg-white shadow-md dark:bg-zinc-900 sm:rounded-sm relative mx-auto overflow-hidden transition-all"
    >
      <div 
        className="absolute inset-12 pointer-events-none z-0" 
        style={{
          borderStyle: pageBorder?.style || 'none',
          borderWidth: pageBorder?.width || '0px',
          borderColor: pageBorder?.color || 'transparent',
        }}
      />
      {isLocked && (
        <div className="absolute top-6 right-6 z-10 px-3 py-1.5 bg-zinc-100/80 backdrop-blur dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 text-xs font-medium uppercase tracking-wider rounded border border-zinc-200 dark:border-zinc-700 select-none flex items-center gap-2">
          <span>Locked {lockedBy ? `by ${lockedBy}` : ''}</span>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
