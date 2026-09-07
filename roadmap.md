# SyncDocs — build roadmap

Target: local-run monorepo (`backend/` NestJS + MongoDB Atlas, `frontend/` React + Vite).
The Lovable preview only serves a setup/overview page — the real app runs locally.

## Stage 1 — Foundation
- [x] Repo layout, env examples, tsconfigs, package manifests
- [x] Mongoose schemas for the six collections + indexes

## Stage 2 — Editor + collaboration (priority)
- [x] Yjs WebSocket gateway (y-websocket protocol, awareness, debounced persistence)
- [x] Tiptap A4 multi-page editor, ribbon, live cursors, presence
- [x] Room ID create / copy / join

## Stage 3 — Platform
- [x] Auth (JWT + bcrypt), permissions guard, RBAC
- [x] Documents / pages REST
- [x] Page lock (bcrypt lock password)
- [x] Autosave + save status
- [x] Sharing, activity logs, notifications
- [x] AI assistant abstraction (OpenAI / Gemini via env)
- [x] Search
- [x] Export (PDF client-side, DOCX/HTML/MD/TXT server-side)

## Stage 4 — Polish
- [x] Landing / login / register / dashboard UI
- [x] Responsive + accessibility pass
- [x] Preview overview page in the Lovable app
