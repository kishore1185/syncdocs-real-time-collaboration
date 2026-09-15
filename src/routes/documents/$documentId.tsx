import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { api, type OpenDocumentPayload, type PageView } from "../../lib/api";
import { useRequireAuth } from "../../lib/auth";
import { Hexagon, Share2, ChevronLeft, FilePlus, Users, Lock, Unlock, X } from "lucide-react";
import { toast } from "sonner";
import * as Popover from "@radix-ui/react-popover";
import * as Dialog from "@radix-ui/react-dialog";
import { Editor } from '@tiptap/react';

import { DocumentEditor } from "../../components/editor/DocumentEditor";
import { EditorToolbar } from "../../components/editor/EditorToolbar";
import { AiAssistantPanel } from "../../components/editor/AiAssistantPanel";

export const Route = createFileRoute("/documents/$documentId")({
  component: DocumentWorkspace,
});

function DocumentWorkspace() {
  const { user } = useRequireAuth();
  const { documentId } = useParams({ from: "/documents/$documentId" });
  
  const [docData, setDocData] = useState<OpenDocumentPayload | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [pages, setPages] = useState<PageView[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const activePage = pages.find(p => p.id === activePageId);
  
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved">("saved");
  
  // Locking state
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [lockPassword, setLockPassword] = useState("");
  const [lockAction, setLockAction] = useState<"lock" | "unlock">("lock");
  const [isLocking, setIsLocking] = useState(false);

  // Debounced save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoading(true);
        const data = await api.openDocument(documentId);
        setDocData(data);
        setPages(data.pages || []);
        if (data.pages && data.pages.length > 0) {
          setActivePageId(data.pages[0].id);
        }
        setSaveStatus(data.saveState?.status || "saved");
      } catch (err: any) {
        toast.error("Failed to load document.");
      } finally {
        setLoading(false);
      }
    };

    if (user && documentId) {
      fetchDoc();
    }
  }, [user, documentId]);

  const handleAddPage = async () => {
    try {
      const newPage = await api.addPage(documentId);
      setPages(prev => [...prev, newPage]);
      setActivePageId(newPage.id);
      toast.success("Page added");
    } catch (err: any) {
      toast.error(err.message || "Unable to create page. Please try again.");
    }
  };

  const saveContent = useCallback(async (pageId: string, content: string) => {
    try {
      setSaveStatus("saving");
      await api.savePage(documentId, pageId, content);
      
      setPages(prev => prev.map(p => p.id === pageId ? { ...p, content } : p));
      setSaveStatus("saved");
    } catch (err: any) {
      toast.error(err.message || "Unable to save changes.");
      setSaveStatus("saved");
    }
  }, [documentId]);

  const handleEditorChange = (content: string) => {
    if (!activePageId) return;
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus("saving");
    
    saveTimeoutRef.current = setTimeout(() => {
      saveContent(activePageId, content);
    }, 1500);
  };

  const handleLockUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePageId || !lockPassword) return;
    
    setIsLocking(true);
    try {
      if (lockAction === "lock") {
        const updatedPage = await api.lockPage(documentId, activePageId, lockPassword);
        setPages(prev => prev.map(p => p.id === activePageId ? updatedPage : p));
        toast.success("Page locked");
      } else {
        const updatedPage = await api.unlockPage(documentId, activePageId, lockPassword);
        setPages(prev => prev.map(p => p.id === activePageId ? updatedPage : p));
        toast.success("Page unlocked");
      }
      setIsLockModalOpen(false);
      setLockPassword("");
    } catch (err: any) {
      toast.error(err.message || (lockAction === "unlock" ? "Incorrect password." : "Failed to lock page."));
    } finally {
      setIsLocking(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Hexagon className="h-8 w-8 animate-spin text-zinc-400" />
          <p className="text-sm font-medium text-zinc-500">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!docData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 text-center dark:bg-zinc-950">
        <Hexagon className="mb-4 h-12 w-12 text-zinc-300" />
        <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">Document not found</h1>
        <p className="mb-6 text-zinc-500">The document may have been deleted or you don't have access.</p>
        <Link
          to="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-6 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { document } = docData;

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(document.roomId);
    toast.success("Room ID copied to clipboard!");
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 relative">
      
      {/* Top Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center justify-center rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100" title="Back to Dashboard">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2 border-r border-zinc-200 pr-4 dark:border-zinc-800">
            <Hexagon className="h-5 w-5 text-zinc-900 dark:text-white" />
          </div>
          <div className="flex flex-col">
            <input 
              value={document.title || "Untitled Document"} 
              readOnly
              className="bg-transparent text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-400 rounded px-1 -ml-1 w-64 text-zinc-900 dark:text-white"
            />
            <div className="flex items-center gap-2 mt-0.5">
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-mono font-medium tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {document.roomId}
              </span>
              <span className="text-[10px] text-zinc-400">
                {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Popover.Root>
            <Popover.Trigger asChild>
              <button 
                aria-label="Show participants"
                className="mr-2 flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
              >
                <Users className="h-4 w-4" />
                <span>1</span>
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content 
                align="end"
                sideOffset={8}
                className="z-50 w-64 rounded-md border border-zinc-200 bg-white p-2 shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="px-2 py-1.5 flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 mb-1">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Participants</span>
                  <span className="text-xs font-medium text-zinc-400">1</span>
                </div>
                <div className="flex flex-col mt-1">
                  <div className="flex items-start gap-2 rounded-sm px-2 py-1.5">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-900 dark:text-white leading-tight mb-0.5">{user.fullName}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{document.role}</span>
                    </div>
                  </div>
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
          
          <button 
            onClick={handleCopyRoomId}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-medium text-white shadow transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-700"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </header>

      {/* Editor Toolbar */}
      <EditorToolbar 
        editor={editor} 
        onAiClick={() => setIsAiPanelOpen(true)} 
        disabled={!!activePage?.isLocked} 
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (Pages) */}
        <aside className="w-56 shrink-0 border-r bg-zinc-50 flex flex-col dark:border-zinc-800 dark:bg-zinc-900/50 relative z-10">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pages</span>
            <button onClick={handleAddPage} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" title="Add Page">
              <FilePlus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {pages.map((page, index) => {
              const isActive = activePageId === page.id;
              return (
                <div key={page.id} className="relative group">
                  <button
                    onClick={() => setActivePageId(page.id)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-white text-zinc-900 shadow-sm border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" 
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200"
                    }`}
                  >
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${isActive ? "bg-indigo-100 text-indigo-700" : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"}`}>
                      <span className="text-xs font-medium">{index + 1}</span>
                    </div>
                    <span className="truncate flex-1 text-left">Page {page.pageNumber}</span>
                    
                    {page.isLocked && <Lock className="h-3 w-3 text-zinc-400" />}
                  </button>
                  
                  {/* Page Controls (Lock/Unlock) visible when active or hovered */}
                  {isActive && (
                    <button 
                      onClick={() => {
                        setLockAction(page.isLocked ? "unlock" : "lock");
                        setIsLockModalOpen(true);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 bg-white dark:bg-zinc-800 rounded-md shadow-sm border border-zinc-200 dark:border-zinc-700"
                      title={page.isLocked ? "Unlock Page" : "Lock Page"}
                    >
                      {page.isLocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Editor Canvas Area */}
        <main className="flex-1 overflow-y-auto bg-[#f8f9fa] dark:bg-black p-8 md:p-12 relative flex justify-center">
          {activePage ? (
            <DocumentEditor 
              key={activePage.id} // Forces remount on page switch to ensure independent state
              initialContent={activePage.content}
              isLocked={activePage.isLocked}
              lockedBy={activePage.lockedBy?.fullName || null}
              onChange={handleEditorChange}
              onEditorReady={setEditor}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
              <FilePlus className="h-8 w-8 mb-2 opacity-50" />
              <p>Select or create a page</p>
            </div>
          )}
        </main>

        <AiAssistantPanel isOpen={isAiPanelOpen} onClose={() => setIsAiPanelOpen(false)} />
      </div>

      {/* Lock/Unlock Modal */}
      <Dialog.Root open={isLockModalOpen} onOpenChange={setIsLockModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {lockAction === "lock" ? "Lock Page" : "Unlock Page"}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>
              
              <Dialog.Description className="text-sm text-zinc-500 dark:text-zinc-400">
                {lockAction === "lock" 
                  ? "Enter a password to lock this page. Anyone with this password can unlock it later."
                  : "Enter the password to unlock this page for editing."}
              </Dialog.Description>
              
              <form onSubmit={handleLockUnlockSubmit} className="flex flex-col gap-4 mt-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="lock-password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Password
                  </label>
                  <input
                    id="lock-password"
                    type="password"
                    required
                    value={lockPassword}
                    onChange={(e) => setLockPassword(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:focus-visible:ring-indigo-400"
                    placeholder="Enter password..."
                  />
                </div>
                
                <div className="flex justify-end gap-3 mt-4">
                  <Dialog.Close asChild>
                    <button type="button" className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800/80">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button 
                    type="submit"
                    disabled={isLocking || !lockPassword}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white shadow hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:opacity-50"
                  >
                    {isLocking ? "Please wait..." : lockAction === "lock" ? "Lock Page" : "Unlock Page"}
                  </button>
                </div>
              </form>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
}
