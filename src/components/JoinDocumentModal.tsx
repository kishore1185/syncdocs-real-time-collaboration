import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export function JoinDocumentModal({ 
  open, 
  onOpenChange,
  onSuccess
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) return;

    setLoading(true);
    try {
      const doc = await api.joinRoom(roomId.trim());
      toast.success("Successfully joined the document.");
      onSuccess();
      onOpenChange(false);
      navigate({ to: `/documents/${doc.id}` });
    } catch (err: any) {
      toast.error(err.message || "Failed to join document. Invalid Room ID?");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = (isOpen: boolean) => {
    if (!isOpen) {
      setTimeout(() => setRoomId(""), 200);
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
              Join Document
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Enter an existing Room ID to join a collaborator's document.
            </Dialog.Description>
          </div>

          <form onSubmit={handleJoin} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="roomId" className="text-sm font-medium leading-none">
                Room ID
              </label>
              <input
                id="roomId"
                placeholder="SYNC-XXXXXX"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                disabled={loading}
                autoFocus
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background font-mono file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                disabled={loading || !roomId.trim()}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {loading ? "Joining..." : "Join Document"}
              </button>
            </div>
          </form>
          
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
