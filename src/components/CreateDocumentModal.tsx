import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Copy, Plus, X } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export function CreateDocumentModal({ 
  open, 
  onOpenChange, 
  onSuccess 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [createdDocId, setCreatedDocId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const doc = await api.createDocument(title.trim());
      setCreatedRoomId(doc.roomId);
      setCreatedDocId(doc.id);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to create document.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (createdRoomId) {
      await navigator.clipboard.writeText(createdRoomId);
      toast.success("Room ID copied to clipboard!");
    }
  };

  const handleOpenDocument = () => {
    if (createdDocId) {
      onOpenChange(false);
      navigate({ to: `/documents/${createdDocId}` });
    }
  };

  const handleReset = (isOpen: boolean) => {
    if (!isOpen) {
      setTimeout(() => {
        setTitle("");
        setCreatedRoomId(null);
        setCreatedDocId(null);
      }, 200);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleReset}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg md:w-full">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              {createdRoomId ? "DOCUMENT CREATED" : "Create Document"}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              {createdRoomId 
                ? "Share this Room ID with your collaborators."
                : "Enter a title to start a new document and create a new room."}
            </Dialog.Description>
          </div>

          {!createdRoomId ? (
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium leading-none">
                  Document Title
                </label>
                <input
                  id="title"
                  placeholder="e.g. Project Proposal"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={loading}
                  autoFocus
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                <Dialog.Close asChild>
                  <button type="button" className="mt-2 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:mt-0">
                    Cancel
                  </button>
                </Dialog.Close>
                <button 
                  type="submit" 
                  disabled={loading || !title.trim()}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Document"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Room ID</label>
                <div className="flex items-center space-x-2">
                  <input
                    readOnly
                    value={createdRoomId}
                    className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background font-mono text-center tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy</span>
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2">
                <Dialog.Close asChild>
                  <button type="button" className="mt-2 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:mt-0">
                    Close
                  </button>
                </Dialog.Close>
                <button 
                  type="button" 
                  onClick={handleOpenDocument}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Open Document
                </button>
              </div>
            </div>
          )}
          
          <Dialog.Close asChild>
            <button className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
