import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bot
} from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import React from 'react';

export interface EditorToolbarProps {
  editor: Editor | null;
  onAiClick: () => void;
  disabled?: boolean;
}

const FONTS = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Garamond', value: 'Garamond, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Lucida Console', value: '"Lucida Console", Monaco, monospace' },
  { label: 'Palatino', value: 'Palatino, "Palatino Linotype", "Book Antiqua", serif' },
  { label: 'Book Antiqua', value: '"Book Antiqua", Palatino, serif' },
  { label: 'Cambria', value: 'Cambria, Georgia, serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Candara', value: 'Candara, sans-serif' },
  { label: 'Consolas', value: 'Consolas, monospace' },
  { label: 'Segoe UI', value: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' },
  { label: 'Century Gothic', value: '"Century Gothic", sans-serif' },
  { label: 'Franklin Gothic', value: '"Franklin Gothic Medium", sans-serif' },
  { label: 'Baskerville', value: 'Baskerville, "Baskerville Old Face", "Hoefler Text", Garamond, "Times New Roman", serif' },
  { label: 'Didot', value: 'Didot, "Didot LT STD", "Hoefler Text", Garamond, "Times New Roman", serif' },
  { label: 'Rockwell', value: 'Rockwell, "Courier Bold", Courier, Georgia, Times, "Times New Roman", serif' },
  { label: 'Gill Sans', value: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif' },
  { label: 'Futura', value: 'Futura, "Trebuchet MS", Arial, sans-serif' },
  { label: 'Avenir', value: 'Avenir, "Avenir Next", "Helvetica Neue", Arial, sans-serif' },
  { label: 'Monaco', value: 'Monaco, Consolas, "Lucida Console", monospace' },
  { label: 'Brush Script MT', value: '"Brush Script MT", cursive' },
  { label: 'Copperplate', value: 'Copperplate, "Copperplate Gothic Light", fantasy' },
  { label: 'Impact', value: 'Impact, Charcoal, sans-serif' }
];

const SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '60'];

export function EditorToolbar({ editor, onAiClick, disabled }: EditorToolbarProps) {
  if (!editor) {
    return (
      <div className="flex h-12 shrink-0 items-center gap-1 border-b bg-white px-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-x-auto">
        <div className="animate-pulse h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
      </div>
    );
  }

  const handleStyleChange = (value: string) => {
    if (value === 'body') {
      editor.chain().focus().setParagraph().run();
    } else if (value.startsWith('h')) {
      const level = parseInt(value.charAt(1)) as 1 | 2 | 3;
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  const currentStyle = editor.isActive('heading', { level: 1 }) ? 'h1' :
                       editor.isActive('heading', { level: 2 }) ? 'h2' :
                       editor.isActive('heading', { level: 3 }) ? 'h3' : 'body';

  const handleBorderChange = (value: string) => {
    if (value === 'none') {
      editor.chain().focus().unsetBlockBorder().run();
    } else {
      const [style, thickness] = value.split('-');
      editor.chain().focus().setBlockBorder({ style, thickness: `${thickness}px` }).run();
    }
  };

  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b bg-white px-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-x-auto relative">
      {disabled && (
        <div className="absolute inset-0 z-10 bg-white/50 dark:bg-zinc-900/50 cursor-not-allowed"></div>
      )}
      
      {/* Text Style */}
      <CustomSelect 
        value={currentStyle} 
        onChange={handleStyleChange}
        options={[
          { value: 'body', label: 'Body' },
          { value: 'h1', label: 'Heading 1' },
          { value: 'h2', label: 'Heading 2' },
          { value: 'h3', label: 'Heading 3' },
        ]}
      />

      <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

      {/* Font */}
      <CustomSelect 
        value={editor.getAttributes('textStyle')['fontFamily'] || 'Inter, sans-serif'}
        onChange={(val) => editor.chain().focus().setFontFamily(val).run()}
        options={FONTS}
      />

      <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

      {/* Font Size */}
      <CustomSelect 
        value={editor.getAttributes('textStyle')['fontSize']?.replace('px', '') || '16'}
        onChange={(val) => editor.chain().focus().setFontSize(`${val}px`).run()}
        options={SIZES.map(s => ({ value: s, label: s }))}
      />

      <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

      {/* Formatting */}
      <div className="flex items-center gap-1">
        <ToolbarButton 
          active={editor.isActive('bold')} 
          onClick={() => editor.chain().focus().toggleBold().run()}
          icon={<Bold className="h-4 w-4" />}
        />
        <ToolbarButton 
          active={editor.isActive('italic')} 
          onClick={() => editor.chain().focus().toggleItalic().run()}
          icon={<Italic className="h-4 w-4" />}
        />
        <ToolbarButton 
          active={editor.isActive('underline')} 
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          icon={<Underline className="h-4 w-4" />}
        />
      </div>

      <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

      {/* Alignment */}
      <div className="flex items-center gap-1">
        <ToolbarButton 
          active={editor.isActive({ textAlign: 'left' })} 
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          icon={<AlignLeft className="h-4 w-4" />}
        />
        <ToolbarButton 
          active={editor.isActive({ textAlign: 'center' })} 
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          icon={<AlignCenter className="h-4 w-4" />}
        />
        <ToolbarButton 
          active={editor.isActive({ textAlign: 'right' })} 
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          icon={<AlignRight className="h-4 w-4" />}
        />
        <ToolbarButton 
          active={editor.isActive({ textAlign: 'justify' })} 
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          icon={<AlignJustify className="h-4 w-4" />}
        />
      </div>

      <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

      {/* Borders */}
      <CustomSelect 
        value="Borders" 
        displayValue="Borders"
        onChange={handleBorderChange}
        options={[
          { value: 'none', label: 'None' },
          { value: 'solid-1', label: 'Solid 1px' },
          { value: 'solid-2', label: 'Solid 2px' },
          { value: 'solid-3', label: 'Solid 3px' },
          { value: 'solid-4', label: 'Solid 4px' },
          { value: 'solid-5', label: 'Solid 5px' },
          { value: 'dotted-1', label: 'Dotted 1px' },
          { value: 'dotted-2', label: 'Dotted 2px' },
          { value: 'dotted-3', label: 'Dotted 3px' },
          { value: 'dotted-4', label: 'Dotted 4px' },
          { value: 'dotted-5', label: 'Dotted 5px' },
        ]}
      />

      {/* AI Button */}
      <div className="ml-auto">
        <button 
          onClick={onAiClick}
          className="flex h-8 items-center gap-2 rounded bg-indigo-50 px-3 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
        >
          <Bot className="h-4 w-4" />
          AI
        </button>
      </div>
    </div>
  );
}

function ToolbarButton({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
        active 
          ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100' 
          : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
      }`}
    >
      {icon}
    </button>
  );
}

function CustomSelect({ value, onChange, options, displayValue }: { value: string, onChange: (val: string) => void, options: { value: string, label: string }[], displayValue?: string }) {
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="flex h-8 items-center justify-between gap-1 rounded border border-zinc-200 bg-zinc-50 px-2 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
        <Select.Value>{displayValue || selectedOption?.label}</Select.Value>
        <Select.Icon>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="z-50 max-h-64 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-md dark:border-zinc-700 dark:bg-zinc-800">
          <Select.ScrollUpButton className="flex h-6 cursor-default items-center justify-center bg-white dark:bg-zinc-800">
            <ChevronDown className="h-4 w-4 -rotate-180" />
          </Select.ScrollUpButton>
          <Select.Viewport className="p-1">
            {options.map(option => (
              <Select.Item 
                key={option.value} 
                value={option.value}
                className="relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-xs outline-none transition-colors focus:bg-zinc-100 focus:text-zinc-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-zinc-700 dark:focus:text-zinc-50"
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <Select.ItemIndicator>
                    <Check className="h-3 w-3" />
                  </Select.ItemIndicator>
                </span>
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="flex h-6 cursor-default items-center justify-center bg-white dark:bg-zinc-800">
            <ChevronDown className="h-4 w-4" />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
