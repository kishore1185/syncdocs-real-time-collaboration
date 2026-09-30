import { X, Sparkles, Copy, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export interface AiAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiAssistantPanel({ isOpen, onClose }: AiAssistantPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setResult(null);

    // Simulate AI delay to show honestly that it's unavailable
    setTimeout(() => {
      setIsGenerating(false);
      setResult("AI assistance is not configured yet.");
    }, 1000);
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      toast.success("Copied to clipboard!");
    }
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-zinc-200 shadow-xl z-20 flex flex-col transform transition-transform duration-300 ease-in-out dark:bg-zinc-900 dark:border-zinc-800">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">AI Writing Assistant</h3>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            What do you want to write or edit?
          </label>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Improve this paragraph..."
            className="w-full h-24 resize-none rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:placeholder:text-zinc-600"
          />
          <button 
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </button>
        </div>

        {result && (
          <div className="mt-4 flex flex-col gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Result</span>
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </div>
            <div className="rounded-md bg-zinc-50 dark:bg-zinc-800/50 p-3 text-sm text-zinc-700 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-800/80">
              {result}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
