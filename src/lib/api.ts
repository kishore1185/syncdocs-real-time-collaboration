/**
 * Thin client for the SyncDocs NestJS API (backend/ — run it locally).
 * The base URL is configurable so the same build works against any host.
 */
export const API_BASE =
  (import.meta.env['VITE_API_URL'] as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:4000/api";

const TOKEN_KEY = "syncdocs.token";
const USER_KEY = "syncdocs.user";

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
}

export type DocumentRole = "owner" | "editor" | "viewer";

export interface DocumentView {
  id: string;
  roomId: string;
  title: string;
  owner: { id: string; fullName: string };
  role: DocumentRole;
  pageCount: number;
  lastSavedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageView {
  id: string;
  documentId: string;
  pageNumber: number;
  content: string;
  isLocked: boolean;
  lockedBy: { id: string; fullName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveState {
  status: "saving" | "saved";
  lastSavedAt: string | null;
}

export interface OpenDocumentPayload {
  document: DocumentView;
  pages: PageView[];
  saveState: SaveState;
}

export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  getUser: (): PublicUser | null => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    try {
      return raw ? (JSON.parse(raw) as PublicUser) : null;
    } catch {
      return null;
    }
  },
  set: (token: string, user: PublicUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      `Cannot reach the SyncDocs server at ${API_BASE}. Start the backend and try again.`,
      0,
    );
  }

  if (res.status === 204) return undefined as T;
  const body = await res.text();
  const data = body ? safeParse(body) : null;

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data
        ? Array.isArray((data as { message: unknown }).message)
          ? ((data as { message: string[] }).message[0] ?? "")
          : String((data as { message: unknown }).message)
        : "") || `Request failed (${res.status}).`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  register: (input: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) =>
    request<{ accessToken: string; user: PublicUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  login: (input: { email: string; password: string }) =>
    request<{ accessToken: string; user: PublicUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  me: () => request<PublicUser & { userId?: string }>("/auth/me"),

  listDocuments: (q?: string) =>
    request<DocumentView[]>(`/documents${q ? `?q=${encodeURIComponent(q)}` : ""}`),

  createDocument: (title?: string) =>
    request<DocumentView>("/documents", { method: "POST", body: JSON.stringify({ title }) }),

  joinRoom: (roomId: string) =>
    request<DocumentView>("/documents/join", {
      method: "POST",
      body: JSON.stringify({ roomId }),
    }),

  openDocument: (documentId: string) =>
    request<OpenDocumentPayload>(`/documents/${documentId}/open`),

  renameDocument: (documentId: string, title: string) =>
    request<DocumentView>(`/documents/${documentId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),

  deleteDocument: (documentId: string) =>
    request<{ id: string; deleted: true }>(`/documents/${documentId}`, { method: "DELETE" }),

  addPage: (documentId: string) =>
    request<PageView>(`/documents/${documentId}/pages`, { method: "POST" }),

  savePage: (documentId: string, pageId: string, content: string) =>
    request<{ pageId: string; status: "saving" | "saved"; lastSavedAt: string | null }>(
      `/documents/${documentId}/pages/${pageId}/content`,
      { method: "PUT", body: JSON.stringify({ content }) },
    ),

  documentSaveState: (documentId: string) =>
    request<SaveState>(`/documents/${documentId}/pages/save-state`),

  lockPage: (documentId: string, pageId: string, password: string) =>
    request<PageView>(`/documents/${documentId}/pages/${pageId}/lock`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  unlockPage: (documentId: string, pageId: string, password: string) =>
    request<PageView>(`/documents/${documentId}/pages/${pageId}/unlock`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
};
