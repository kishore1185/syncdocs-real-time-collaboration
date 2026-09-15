import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { FontSize } from './extensions/FontSize';
import { BlockBorder } from './extensions/BlockBorder';
import { useEffect } from 'react';

export interface DocumentEditorProps {
  initialContent: string;
  isLocked: boolean;
  lockedBy?: string | null;
  onChange: (content: string) => void;
  onEditorReady: (editor: Editor) => void;
}

export function DocumentEditor({ initialContent, isLocked, lockedBy, onChange, onEditorReady }: DocumentEditorProps) {
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
      BlockBorder,
    ],
    content: initialContent,
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
    <div className="w-full min-h-[1056px] bg-white shadow-md dark:bg-zinc-900 dark:border dark:border-zinc-800 sm:rounded-sm relative mx-auto overflow-hidden">
      {isLocked && (
        <div className="absolute top-6 right-6 z-10 px-3 py-1.5 bg-zinc-100/80 backdrop-blur dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 text-xs font-medium uppercase tracking-wider rounded border border-zinc-200 dark:border-zinc-700 select-none flex items-center gap-2">
          <span>Locked {lockedBy ? `by ${lockedBy}` : ''}</span>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
