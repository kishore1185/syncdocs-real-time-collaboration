import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type DocumentView } from "../lib/api";
import { useRequireAuth, useAuth } from "../lib/auth";
import { CreateDocumentModal } from "../components/CreateDocumentModal";
import { JoinDocumentModal } from "../components/JoinDocumentModal";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Hexagon, LogOut, Plus, ArrowUpRight, FileText, Clock, Users, MoreVertical, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useRequireAuth();
  const { signOut } = useAuth();
  const [documents, setDocuments] = useState<DocumentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    try {
      await api.deleteAccount();
      signOut();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;
    try {
      await api.deleteDocument(documentToDelete);
      setDocuments(docs => docs.filter(d => d.id !== documentToDelete));
      toast.success("Document deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document");
    } finally {
      setDocumentToDelete(null);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const docs = await api.listDocuments();
      setDocuments(docs);
    } catch (err: any) {
      toast.error("Failed to load documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <Hexagon className="h-6 w-6 text-zinc-900 dark:text-white" />
          <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">SYNCDOCS</span>
        </div>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800">
                <span className="hidden sm:inline">{user.fullName}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {user.email}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setDeleteAccountOpen(true)}
                className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-500 dark:focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950/50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete Account</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user.fullName.split(' ')[0]}
          </h1>
          <p className="mt-2 text-lg text-zinc-500 dark:text-zinc-400">
            Your collaborative workspace
          </p>
        </div>

        {/* Primary Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="group relative flex flex-col items-start justify-between rounded-xl border border-zinc-200 bg-white p-8 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-colors dark:bg-zinc-800 dark:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-900">
              <Plus className="h-6 w-6" />
            </div>
            <div className="mt-6 text-left">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">Create Document</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                Start a new document and create a new room. Share the generated Room ID to collaborate.
              </p>
            </div>
          </button>

          <button
            onClick={() => setJoinModalOpen(true)}
            className="group relative flex flex-col items-start justify-between rounded-xl border border-zinc-200 bg-white p-8 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-colors dark:bg-zinc-800 dark:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-900">
              <ArrowUpRight className="h-6 w-6" />
            </div>
            <div className="mt-6 text-left">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">Join Document</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                Enter an existing Room ID provided by a collaborator to join their workspace.
              </p>
            </div>
          </button>
        </div>

        {/* Document List */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">Recent Documents</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-xl border border-zinc-200 bg-zinc-50 animate-pulse dark:border-zinc-800 dark:bg-zinc-900/50"></div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 py-16 px-4 text-center dark:border-zinc-800 dark:bg-zinc-900/20">
              <FileText className="h-12 w-12 text-zinc-400 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">No documents yet</h3>
              <p className="mt-2 text-sm text-zinc-500 max-w-sm dark:text-zinc-400">
                Create your first document or join a room shared by a collaborator to get started.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Create Document
                </button>
                <button
                  onClick={() => setJoinModalOpen(true)}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Join Document
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <Link
                  key={doc.id}
                  to="/documents/$documentId"
                  params={{ documentId: doc.id }}
                  className="group flex flex-col rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
                >
                  <div className="flex-1 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                        <span className="font-mono">{doc.roomId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                          {doc.role}
                        </span>
                        {doc.role === "owner" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                className="h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDocumentToDelete(doc.id);
                                }}
                                className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-500 dark:focus:text-red-500"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete document</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-900 line-clamp-1 dark:text-white mb-1">
                      {doc.title || "Untitled Document"}
                    </h3>
                  </div>
                  <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-3 flex items-center justify-between text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400 rounded-b-xl">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{doc.owner.id === user.id ? "Me" : doc.owner.fullName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {doc.lastSavedAt
                          ? formatDistanceToNow(new Date(doc.lastSavedAt), { addSuffix: true })
                          : "Never"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateDocumentModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen} 
        onSuccess={fetchDocuments}
      />
      
      <JoinDocumentModal 
        open={joinModalOpen} 
        onOpenChange={setJoinModalOpen} 
        onSuccess={fetchDocuments}
      />

      <AlertDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account, documents you own, and remove your access from shared documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700 dark:text-white">
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the document and all its pages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocument} className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700 dark:text-white">
              Delete Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
