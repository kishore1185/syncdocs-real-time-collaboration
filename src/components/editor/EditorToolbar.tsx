import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Image as ImageIcon,
  Bot
} from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, Check } from 'lucide-react';
import React from 'react';

export interface EditorToolbarProps {
  editor: Editor | null;
  documentId?: string;
  pageBorder?: { style: string; width: string; color: string } | null;
  onUpdatePageBorder?: (border: { style: string; width: string; color: string } | null) => void;
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
const LINE_SPACINGS = [
  { label: '1.0', value: '1.0' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2.0' },
  { label: '2.5', value: '2.5' },
  { label: '3.0', value: '3.0' },
];
const PARAGRAPH_SPACINGS = [
  { label: 'None', value: 'none' },
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
];

export function EditorToolbar({ editor, documentId, pageBorder, onUpdatePageBorder, onAiClick, disabled }: EditorToolbarProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
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

  const isImageSelected = editor.isActive('resizableImage');
  const imageAttrs = editor.getAttributes('resizableImage');
  
  const handleBorderChange = (value: string) => {
    if (isImageSelected) {
      if (value === 'none') {
        editor.chain().focus().updateAttributes('resizableImage', { borderStyle: 'none', borderWidth: '0px', borderColor: 'transparent' }).run();
      } else {
        const parts = value.split('-');
        const style = parts[0] || 'solid';
        const thickness = parts[1] || '1';
        editor.chain().focus().updateAttributes('resizableImage', { borderStyle: style, borderWidth: `${thickness}px`, borderColor: '#000000' }).run();
      }
    } else {
      if (!onUpdatePageBorder) return;
      if (value === 'none') {
        onUpdatePageBorder(null);
      } else {
        const parts = value.split('-');
        const style = parts[0] || 'solid';
        const thickness = parts[1] || '1';
        onUpdatePageBorder({ style, width: `${thickness}px`, color: '#000000' });
      }
    }
  };

  const currentBorderValue = isImageSelected
    ? (!imageAttrs['borderStyle'] || imageAttrs['borderStyle'] === 'none' ? 'none' : `${imageAttrs['borderStyle']}-${parseInt(imageAttrs['borderWidth'] || '1')}`)
    : (!pageBorder || pageBorder.style === 'none' ? 'none' : `${pageBorder.style}-${parseInt(pageBorder.width)}`);

  const handleLineSpacingChange = (value: string) => {
    if (value === '1.0') {
      editor.chain().focus().unsetLineHeight().run();
    } else {
      editor.chain().focus().setLineHeight(value).run();
    }
  };

  const handleParagraphSpacingChange = (value: string) => {
    if (value === 'none') {
      editor.chain().focus().unsetParagraphSpacing().run();
    } else if (value === 'small') {
      editor.chain().focus().setParagraphSpacing({ marginBottom: '0.5em' }).run();
    } else if (value === 'medium') {
      editor.chain().focus().setParagraphSpacing({ marginBottom: '1em' }).run();
    } else if (value === 'large') {
      editor.chain().focus().setParagraphSpacing({ marginBottom: '1.5em' }).run();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert("Image is too large. Please select an image under 5MB.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!documentId) {
      alert("Cannot upload image because document ID is missing.");
      return;
    }

    try {
      import('../../lib/api').then(async ({ api }) => {
        const result = await api.uploadImage(documentId, file);
        editor.chain().focus().setResizableImage({ src: result.url }).run();
      }).catch(err => {
        console.error("Upload error", err);
        alert(err.message || "Failed to upload image");
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
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
        <ToolbarButton 
          active={editor.isActive('highlight')} 
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          icon={<Highlighter className="h-4 w-4" />}
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
        value={currentBorderValue} 
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

      <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

      {/* Alignment Spacing (Combined) */}
      <Popover.Root>
        <Popover.Trigger className="flex h-8 items-center justify-between gap-1 rounded border border-zinc-200 bg-zinc-50 px-2 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
          <span>Alignment</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="z-50 w-48 rounded-md border border-zinc-200 bg-white shadow-md outline-none dark:border-zinc-700 dark:bg-zinc-800 py-1" align="start" sideOffset={4}>
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Line Spacing
            </div>
            {LINE_SPACINGS.map(option => (
              <button
                key={option.value}
                onClick={() => handleLineSpacingChange(option.value)}
                className="relative flex w-full cursor-pointer select-none items-center py-1.5 pl-8 pr-2 text-xs outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
              >
                {(editor.getAttributes('paragraph')['lineHeight'] || '1.0') === option.value && (
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                {option.label}
              </button>
            ))}
            
            <div className="my-1 h-px w-full bg-zinc-200 dark:bg-zinc-700" />
            
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Paragraph Spacing
            </div>
            {PARAGRAPH_SPACINGS.map(option => {
              const currentMargin = editor.getAttributes('paragraph')['marginBottom'];
              const currentOption = currentMargin === '0.5em' ? 'small' : 
                                    currentMargin === '1em' ? 'medium' :
                                    currentMargin === '1.5em' ? 'large' : 'none';
              return (
                <button
                  key={option.value}
                  onClick={() => handleParagraphSpacingChange(option.value)}
                  className="relative flex w-full cursor-pointer select-none items-center py-1.5 pl-8 pr-2 text-xs outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
                >
                  {currentOption === option.value && (
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  {option.label}
                </button>
              );
            })}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

      {/* Image Insert */}
      <div className="flex items-center gap-1">
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleImageUpload} 
        />
        <ToolbarButton 
          active={false}
          onClick={() => fileInputRef.current?.click()}
          icon={<ImageIcon className="h-4 w-4" />}
        />
      </div>

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
