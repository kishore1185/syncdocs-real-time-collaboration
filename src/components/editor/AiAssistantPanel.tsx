import { X, Sparkles, Copy, Loader2, Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import type { Editor } from '@tiptap/react';

export interface AiAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  editor?: Editor | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AiAssistantPanel({ isOpen, onClose, editor }: AiAssistantPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    const userMessage = prompt.trim();
    setPrompt('');
    
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setIsGenerating(true);

    try {
      const context = editor?.getText() || undefined;
      const res = await api.aiChat(newMessages, context);
      
      setMessages([...newMessages, { role: 'assistant', content: res.result }]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to get AI response');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-zinc-200 shadow-xl z-20 flex flex-col transform transition-transform duration-300 ease-in-out dark:bg-zinc-900 dark:border-zinc-800">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">AI Workspace</h3>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-4">
            How can I help you with this document?
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-3 py-2 rounded-lg text-sm max-w-[90%] whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
              }`}>
                {msg.content}
              </div>
              {msg.role === 'assistant' && (
                <button 
                  onClick={() => handleCopy(msg.content)}
                  className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 ml-1"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
              )}
            </div>
          ))
        )}
        
        {isGenerating && (
          <div className="flex items-start">
            <div className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="relative">
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message AI..."
            disabled={isGenerating}
            className="w-full h-12 min-h-[48px] max-h-32 resize-none rounded-md border border-zinc-300 bg-transparent pl-3 pr-10 py-3 text-sm shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:placeholder:text-zinc-600 disabled:opacity-50"
          />
          <button 
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="absolute right-2 bottom-2 p-1.5 text-white bg-indigo-600 hover:bg-indigo-500 rounded-md disabled:opacity-50 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="text-[10px] text-center text-zinc-500 mt-2">
          AI has access to your current document context.
        </div>
      </div>
    </div>
  );
}
