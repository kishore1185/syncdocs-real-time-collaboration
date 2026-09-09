# SyncDocs: Real-Time Collaboration

Build a complete full-stack web application called:

SYNC DOCS
Real-Time Collaborative Document Editor

This is a college major project and must be developed as a serious, polished, production-style application rather than a simple CRUD demo.

The application is inspired by the collaborative experience of Google Docs and the document-editing experience of Microsoft Word, but it must have its own SyncDocs branding, visual identity, and implementation.

IMPORTANT:
Treat this prompt as the master product and architecture specification.

Do not remove required functionality.
Do not invent conflicting functionality.
Do not add features that were explicitly removed.
Do not replace the specified technology choices with unrelated technologies.
Do not use PostgreSQL, Supabase, Firebase, or another database.
Use ONE MongoDB Atlas database only.

==================================================
1. PROJECT OBJECTIVE
==================================================

SyncDocs is a real-time collaborative document editor where multiple authenticated users can work on the SAME document simultaneously.

Users should be able to:

- Register and log in using an independent SyncDocs account.
- Create multiple documents.
- Give documents titles.
- Open documents in a Word-like multi-page editor.
- Generate or use a collaboration Room ID.
- Share the Room ID with other authorized users.
- Allow collaborators to join the same document.
- See collaborators currently present.
- See collaborators' live cursors and usernames.
- Edit the same document simultaneously.
- Work on different pages simultaneously.
- See other users' edits essentially immediately.
- Use rich text formatting.
- Lock individual pages.
- Unlock locked pages using the correct lock password.
- Share documents with owner/editor/viewer permissions.
- View an activity log.
- Receive notifications.
- Use an AI writing assistant.
- Search documents and relevant content.
- Export documents.
- Autosave document/page state.
- See clear save status.

The final application should feel like a modern collaborative productivity platform.

==================================================
2. TECHNOLOGY STACK
==================================================

Frontend:
- React
- TypeScript
- HTML5
- CSS3
- Context API for appropriate application state

Backend:
- Node.js
- TypeScript
- NestJS architecture preferred for the backend/API
- REST API for normal application operations
- WebSocket for real-time collaboration

Database:
- MongoDB Atlas
- One database:
  syncdocs

ODM:
- Mongoose

Authentication:
- JWT
- bcrypt/password hashing

Real-time collaboration:
- Yjs
- CRDT-based synchronization
- WebSocket transport

AI:
- Design an AI service abstraction so OpenAI or Gemini can be connected through environment variables/configuration.
- Do not hard-code API keys.
- Do not expose AI API keys to the frontend.

Version control:
- Git-friendly project structure.

DO NOT introduce Redis at this stage.
Do not introduce another database simply to make the architecture appear more advanced.

==================================================
3. MONGODB ATLAS — FINAL DATABASE
==================================================

Use exactly ONE MongoDB Atlas database:

syncdocs

The database contains exactly these six application collections:

1. users
2. documents
3. pages
4. permissions
5. activity_logs
6. notifications

Do NOT create:

- comments
- version_history
- PostgreSQL tables
- Supabase tables
- Firebase collections
- a separate room collection
- a separate lock collection

The Room ID belongs to the documents collection.

Page locking belongs to the pages collection.

Activity logging replaces Version History.

==================================================
4. USERS COLLECTION
==================================================

Collection:

users

Purpose:
Store SyncDocs user accounts.

Logical schema:

_id
fullName
email
passwordHash
createdAt
updatedAt

Requirements:

- fullName is required.
- email is required and unique.
- passwordHash is required.
- Password must NEVER be stored in plain text.
- Hash passwords using bcrypt.
- Login must use the independent SyncDocs password.
- Do NOT use Gmail passwords.
- Do NOT implement Google OAuth unless explicitly requested later.
- Do not store sensitive authentication information unnecessarily.

Authentication flow:

Registration:
- Full Name
- Email
- Create SyncDocs Password
- Confirm Password

Login:
- Email
- SyncDocs Password

After successful login:
- issue JWT
- securely maintain authenticated session
- retrieve current user information
- route user to dashboard/document area

==================================================
5. DOCUMENTS COLLECTION
==================================================

Collection:

documents

Purpose:
Store permanent document identity and metadata.

Logical schema:

_id
title
ownerId
roomId
createdAt
updatedAt
lastSavedAt

Relationships:

ownerId → users._id

Requirements:

- A user can own multiple documents.
- Every document has a permanent MongoDB _id.
- Every document has a unique roomId for collaboration.
- roomId is NOT the document _id.
- roomId is NOT the only security mechanism.
- Document access must also be checked against permissions.

Example:

Document:
_id: MongoDB ObjectId
title: "BCA Project Report"
ownerId: Jyoti's user ID
roomId: "SYNC-A7K29P"

Room IDs should be sufficiently unique.

==================================================
6. PAGES COLLECTION
==================================================

Collection:

pages

Purpose:
Store individual logical pages belonging to documents.

Logical schema:

_id
documentId
pageNumber
content
isLocked
lockedBy
lockPasswordHash
createdAt
updatedAt

Relationships:

documentId → documents._id
lockedBy → users._id

Requirements:

- A document can contain multiple pages.
- Pages must have page numbers.
- Page number is unique within a document.
- Each page has its own content.
- Pages must be independently editable.
- Different collaborators must be able to work on different pages simultaneously.
- isLocked defaults to false.
- lockedBy is null when the page is unlocked.
- lockPasswordHash is null when the page is unlocked.
- Never store the page lock password in plain text.

Page lock behavior:

Any authorized collaborator who has editing rights can lock a page.

When locked:
- page becomes read-only for EVERYONE
- clearly show:
  "Locked by Jyoti"
- prevent editing of the locked page
- preserve the page content

Unlock:
- user enters the lock password
- compare against stored bcrypt hash
- unlock only if password is correct
- restore editability

The user who originally locked the page does NOT have an exclusive unlock privilege.
Anyone who knows the lock password may unlock it.

==================================================
7. PERMISSIONS COLLECTION
==================================================

Collection:

permissions

Purpose:
Control document access.

Logical schema:

_id
documentId
userId
role
grantedBy
createdAt
updatedAt

Relationships:

documentId → documents._id
userId → users._id
grantedBy → users._id

Allowed roles:

owner
editor
viewer

Behavior:

OWNER:
- full control
- edit document
- manage collaborators
- change permissions
- share document
- lock/unlock pages
- rename document
- access all document features

EDITOR:
- edit document
- participate in real-time collaboration
- lock/unlock pages when they have the lock password
- view document
- cannot arbitrarily take ownership

VIEWER:
- view document
- cannot edit
- cannot modify content
- cannot modify formatting
- cannot lock pages

The backend MUST enforce permissions.
Do not rely only on hiding buttons in the frontend.

==================================================
8. ACTIVITY_LOGS COLLECTION
==================================================

Collection:

activity_logs

Purpose:
Record important document/collaboration actions.

IMPORTANT:
This is NOT Version History.

Do not store previous document versions.

Logical schema:

_id
documentId
pageId
userId
action
details
timestamp

Possible actions include:

DOCUMENT_CREATED
DOCUMENT_RENAMED
PAGE_UPDATED
PAGE_LOCKED
PAGE_UNLOCKED
COLLABORATOR_JOINED
COLLABORATOR_LEFT
DOCUMENT_SHARED
PERMISSION_UPDATED

Examples:

Jyoti created a document.

Kishore joined the collaboration room.

Kishore updated Page 1.

Jyoti locked Page 2.

Rahul joined the document.

Jyoti shared the document with Rahul.

Kishore's permission was changed.

The activity log should allow the UI to show:

- user
- action
- relevant document/page
- time
- useful details

Do not turn this into a version restoration system.

==================================================
9. NOTIFICATIONS COLLECTION
==================================================

Collection:

notifications

Purpose:
Store user-facing notifications.

Logical schema:

_id
userId
documentId
type
message
isRead
createdAt

Possible types:

DOCUMENT_SHARED
PERMISSION_CHANGED
COLLABORATOR_JOINED
MENTION

Examples:

"Jyoti shared BCA Project Report with you."

"Your permission for BCA Project Report was changed to Editor."

"Kishore joined the document."

Notifications should have:
- unread/read state
- timestamp
- meaningful message
- ability to mark as read

==================================================
10. NO COMMENTS / NO VERSION HISTORY
==================================================

These two modules were deliberately removed from the project.

DO NOT IMPLEMENT:

- comments
- comment threads
- replies
- comment mentions
- version history
- previous saved versions
- version restore
- version comparison

The final feature set contains Activity Logs instead of Version History.

==================================================
11. DOCUMENT CREATION AND ROOM SYSTEM
==================================================

The application should support the following collaboration workflow.

A user logs in.

They can create a new document.

When creating a document:

- ask for document title
- create permanent MongoDB document identity
- generate a unique Room ID automatically
- create initial Page 1
- assign creator as owner
- create corresponding owner permission

The editor should show the Room ID prominently near the top.

Preferred UI:

ROOM ID
[ SYNC-A7K29P ] [Copy] [Join]

Also provide a clear Generate/Create Room capability when appropriate.

The Room ID should be automatically generated rather than forcing the creator to invent an ID.

Users should be able to:

- copy the Room ID
- share it with collaborators
- enter a Room ID manually
- click Join

Example:

[ Room ID: SYNC-A7K29P ] [Join]

When another authenticated user enters the Room ID:

1. Find document associated with Room ID.
2. Verify the user has permission to access the document.
3. If authorized, establish the collaboration session.
4. Load current document/page state.
5. Connect the user to the Yjs/WebSocket collaboration room.
6. Show the user in the participant list.
7. Record collaborator joined activity.

If unauthorized:
- do not allow access
- show a clear access-denied message

The Room ID must not bypass document permissions.

==================================================
12. REAL-TIME COLLABORATION
==================================================

This is one of the most important modules.

Use:

Yjs
+
CRDT
+
WebSocket

Do NOT implement collaboration using periodic page refreshes.

Do NOT make users press Save before collaborators see changes.

Expected behavior:

If Jyoti types:

"Hello"

Kishore should see the change essentially immediately over the collaboration connection.

If Kishore deletes a character while Jyoti is editing elsewhere:
- both clients should converge to the same document state.

If:
- Kishore edits Page 1
- Jyoti edits Page 2

both users should see each other's changes live.

Use Yjs/CRDT principles to resolve concurrent edits.

Important:
Do not promise literally zero milliseconds.
The expected behavior is:
- local edits appear immediately
- Yjs update is sent through WebSocket
- remote clients receive updates with normal network latency
- clients converge to the same state

==================================================
13. LIVE PRESENCE
==================================================

The editor should show:

Participants (3)

Kishore
Jyoti
Rahul

Show only usernames in the participant list.

Do not expose unnecessary personal information.

When a user joins:
- participant count updates
- participant list updates
- activity log records join

When a user leaves:
- participant count updates
- participant list updates
- activity log records leave

==================================================
14. LIVE CURSORS
==================================================

Show each collaborator's active cursor/selection where technically feasible.

Display their username near their cursor.

Example:

Kishore
  |
  cursor

Jyoti
  |
  cursor

Use Yjs awareness/presence mechanisms where appropriate.

The cursor system must remain visually clean and should not interfere with editing.

==================================================
15. EDITOR DESIGN
==================================================

The editor must NOT look like:

- a small textarea
- one giant white content box
- a basic HTML input
- a simple contenteditable demo

It must look like a modern Word-like document editor.

Use a multi-page A4-style workspace.

Example:

            SyncDocs
Room ID: [SYNC-A7K29P] [Copy] [Join]

Document Title: BCA Project Report

Participants (3): Kishore, Jyoti, Rahul

------------------------------------------------
Ribbon / Toolbar
------------------------------------------------

                    PAGE 1

             ┌──────────────────────┐
             │                      │
             │   document content   │
             │                      │
             │                      │
             └──────────────────────┘

                    PAGE 2

             ┌──────────────────────┐
             │                      │
             │   document content   │
             │                      │
             │                      │
             └──────────────────────┘

                    PAGE 3
                    ...

The pages should visually resemble real sheets of paper with:
- A4 proportions
- margins
- page separation
- white document surface
- subtle shadow
- professional editor workspace
- smooth scrolling

Do NOT fake pagination using only horizontal lines.

The editor should have real logical pages.

==================================================
16. FUTURISTIC VISUAL DESIGN
==================================================

The product should look technologically advanced because SyncDocs is a real-time collaborative system.

Use a polished futuristic productivity-app aesthetic.

Do NOT make it look like:
- a generic Bootstrap dashboard
- a basic student CRUD application
- an old-fashioned Word clone

Design direction:

- modern dark/light interface support if practical
- elegant glass/soft-surface elements where appropriate
- subtle gradients
- tasteful glowing accents
- sophisticated cards
- smooth micro-interactions
- subtle animated presence indicators
- modern typography
- clean iconography
- professional spacing
- excellent visual hierarchy
- responsive design
- accessible contrast

However, the actual document page itself should remain clean, white, paper-like and readable.

The futuristic styling should primarily appear in:
- application shell
- navigation
- toolbar
- collaboration indicators
- room information
- status indicators
- AI assistant
- dashboard
- notifications
- side panels

Do not sacrifice usability for visual effects.

Avoid excessive neon, excessive animations, or gaming-style visuals.

The final result should feel like:

"Microsoft Word + Google Docs collaboration + modern AI productivity platform"

with an original SyncDocs identity.

==================================================
17. TOP APPLICATION HEADER
==================================================

Create a polished header for the editor.

Include:

- SyncDocs logo/brand
- Room ID
- Copy Room ID button
- Join button
- document title
- current user
- participant count/list
- notification indicator
- user/profile menu

The Room ID should be clearly visible.

Example:

SyncDocs

Room ID
[ SYNC-A7K29P ] [Copy] [Join]

BCA Project Report

Participants (3)
Kishore • Jyoti • Rahul

==================================================
18. WORD-LIKE RIBBON
==================================================

Create a professional document-editor ribbon.

Include:

File
AI
Font Family
Font Size
Bold
Italic
Underline
Strikethrough
Text Color
Highlight if practical
Align Left
Center
Align Right
Justify
Line Spacing
Text Spacing
Borders
Page Lock
Export
Save/Autosave status

Font family should provide several useful/common choices.

Font size should provide multiple useful sizes.

The ribbon should be organized logically into groups rather than becoming one extremely long uncontrolled row.

On smaller screens, use responsive grouping or overflow menus.

==================================================
19. FILE MENU
==================================================

Provide document actions such as:

- New Document
- Rename
- Save status
- Export
- Close / Back to Documents

Do not implement version history.

==================================================
20. AI WRITING ASSISTANT
==================================================

Include an "AI" button in the ribbon.

When clicked:
- open a modern side panel
- panel may slide/fade in from the left or right
- keep the document visible

The AI panel should contain:
- request/input box
- send button
- clear result area
- copy button

Example requests:

"Improve this paragraph."

"Summarize this text."

"Rewrite this professionally."

"Make this more concise."

"Generate an introduction."

"Fix grammar."

The AI response can be copied and pasted into the document.

Do not require persistent AI conversation history.

Do not create an AI history collection unless absolutely necessary.

AI API credentials must remain server-side.

Provide a clean abstraction so an OpenAI or Gemini API can be connected later through environment variables.

If no API key is configured, show a graceful configuration message instead of crashing the application.

==================================================
21. PAGE LOCK
==================================================

Provide a Page Lock control.

Any authorized editor can lock a page.

When locking:
- ask for a password
- confirm password if appropriate
- hash password using bcrypt
- store only hash
- set isLocked = true
- set lockedBy
- record PAGE_LOCKED in activity log

Locked page:
- visually indicate lock
- show "Locked by [username]"
- prevent editing

Unlock:
- request password
- compare securely
- unlock on success
- record PAGE_UNLOCKED

Incorrect password:
- show a clear error
- do not unlock page

==================================================
22. AUTOSAVE
==================================================

Implement autosave.

Do NOT write to MongoDB on every keystroke.

Live typing should use:
Yjs + WebSocket.

Persistence should use controlled autosave/debounced saves.

Show visible save status:

Saving...
Saved
Last saved at 10:32 PM

The latest persisted state must be recoverable if the user closes and reopens the document.

==================================================
23. DOCUMENT DASHBOARD
==================================================

Create a polished dashboard after login.

Show:

- Welcome message
- Create New Document button
- My Documents
- Shared With Me
- recent documents
- document title
- owner
- last updated time
- collaboration/room information where useful

Users can own multiple documents.

Example:

My Documents

BCA Project Report
Last saved: 2 minutes ago

Research Paper
Last saved: yesterday

Seminar Notes
Last saved: Sep 5

Shared With Me

Project Documentation
Owner: Jyoti
Role: Editor

==================================================
24. DOCUMENT SHARING
==================================================

Implement document sharing UI.

Owner/editor as appropriate can share a document.

Allow:
- select/find user by email
- assign role
- owner
- editor
- viewer

Display existing collaborators.

Example:

Share Document

Email:
[ kishore@example.com ]

Role:
[ Editor ▼ ]

[ Share ]

Collaborators:

Jyoti — Owner
Kishore — Editor
Rahul — Viewer

Changes must be stored in permissions collection.

Generate appropriate notification records.

==================================================
25. SEARCH
==================================================

Implement Search & Notification functionality.

Search should support useful searches such as:
- document title
- collaborators
- relevant document content where practical

Create a polished search UI.

Results should clearly identify:
- document
- matching content/context if available
- owner
- relevant page if applicable

Do not build an unnecessarily complicated search infrastructure for the first implementation.

==================================================
26. NOTIFICATIONS UI
==================================================

Create a notification bell/icon.

Show unread count.

Notification dropdown/panel should show:
- message
- timestamp
- read/unread state

Allow:
- mark individual notification as read
- mark all as read

Use the notifications collection.

==================================================
27. ACTIVITY LOG UI
==================================================

Provide a document Activity Log panel/menu.

Show activities such as:

Jyoti created the document
Kishore joined
Kishore updated Page 1
Jyoti locked Page 2
Rahul joined
Jyoti shared the document

Each activity should show:
- user
- action
- page/document context
- time

This is an audit/activity feature, NOT Version History.

==================================================
28. EXPORT
==================================================

Provide an Export menu in the ribbon.

Support:

PDF
DOCX
HTML
Markdown
TXT

Export should represent the complete document across all pages.

Preserve relevant formatting as reasonably as possible.

At minimum, PDF export must produce a usable document containing all pages/content.

Do not export only the currently visible page unless the user explicitly chooses that behavior.

==================================================
29. RESPONSIVE DESIGN
==================================================

Desktop is the primary target because this is a document editor.

Still make the interface responsive.

For smaller screens:
- toolbar can collapse into menus
- sidebar can become a drawer
- participant list can collapse
- AI panel can become an overlay
- document pages should remain readable

Do not make the desktop editor look cramped.

==================================================
30. SECURITY
==================================================

Security is important.

Implement:

- bcrypt password hashing
- JWT authentication
- authenticated API routes
- authorization checks
- document permission checks
- role-based access control
- page lock authorization
- lock password hashing
- server-side validation
- input validation
- secure environment variables
- CORS configuration
- no secrets in source code

Never expose:
- MongoDB password
- MongoDB connection string
- JWT secret
- AI API key

Do not commit .env files.

Create a safe .env.example containing placeholders only.

Example:

MONGODB_URI=
JWT_SECRET=
AI_API_KEY=

Do not put real values into source code.

==================================================
31. API / BACKEND ARCHITECTURE
==================================================

Keep frontend and backend clearly separated.

Preferred structure:

frontend/
backend/

The backend should have organized modules/services/controllers/models.

Suggested backend modules:

auth
users
documents
pages
permissions
activity-logs
notifications
collaboration
ai
export

Do not make one enormous backend file.

Use clean service/controller/module separation.

The collaboration WebSocket layer should be separate from ordinary REST controllers.

==================================================
32. CONTEXT API / FRONTEND STATE
==================================================

Use React Context API where appropriate for:

- authenticated user
- authentication state
- document state
- collaboration/session state
- notifications where useful

Do not put every tiny UI state into global context.

Keep components maintainable.

==================================================
33. ERROR HANDLING
==================================================

The application should gracefully handle:

- invalid login
- duplicate registration email
- incorrect password
- expired JWT
- unauthorized document
- invalid Room ID
- missing Room ID
- disconnected WebSocket
- collaboration reconnect
- failed autosave
- failed export
- failed AI request
- incorrect page lock password
- document not found

Use user-friendly error messages.

Do not expose raw stack traces to users.

==================================================
34. COLLABORATION RECONNECTION
==================================================

If a WebSocket connection temporarily drops:

- show a subtle connection status
- attempt reconnection
- preserve local editing state where technically possible
- resynchronize with the collaboration session after reconnect
- avoid silently losing user edits

Possible status indicators:

LIVE
RECONNECTING
OFFLINE

Use subtle visual indicators.

==================================================
35. DATA RELATIONSHIPS
==================================================

Implement these logical relationships:

users
  ↓
documents.ownerId

documents
  ↓
pages.documentId

documents
  ↓
permissions.documentId

users
  ↓
permissions.userId

users
  ↓
activity_logs.userId

documents
  ↓
activity_logs.documentId

pages
  ↓
activity_logs.pageId

users
  ↓
notifications.userId

documents
  ↓
notifications.documentId

Remember:

Room ID is stored in documents.

Page locking is stored in pages.

There is no room collection.

There is no lock collection.

==================================================
36. INDEXING / DATA INTEGRITY
==================================================

Create appropriate database indexes.

At minimum consider:

users.email → unique

documents.roomId → unique

permissions:
documentId + userId → unique combination

pages:
documentId + pageNumber → unique combination

Add indexes that genuinely improve common queries.

Do not create unnecessary indexes.

==================================================
37. DOCUMENT LIFECYCLE
==================================================

New document:

User clicks Create Document
↓
Enter title
↓
Backend creates document
↓
Generate unique Room ID
↓
Create Page 1
↓
Create owner permission
↓
Record DOCUMENT_CREATED
↓
Open editor

Opening document:

Authenticate
↓
Check permission
↓
Load document metadata
↓
Load pages
↓
Initialize Yjs state
↓
Connect WebSocket
↓
Join collaboration room
↓
Show participants
↓
Show editor

Editing:

Local edit
↓
Yjs
↓
CRDT update
↓
WebSocket
↓
Other clients
↓
Debounced persistence
↓
MongoDB

==================================================
38. UI ROUTES
==================================================

Create a sensible routing structure such as:

/
Login / landing

/register
Registration

/login
Login

/dashboard
Document dashboard

/documents/:documentId
Document/editor

/editor/:documentId
Editor route if needed

Use whichever routing structure is technically cleaner, but keep URLs meaningful.

Protected routes must require authentication.

==================================================
39. LANDING / LOGIN DESIGN
==================================================

Create a strong SyncDocs landing/login experience.

Brand:
SyncDocs

Tagline suggestion:

"Write together. Create together. In real time."

Hero concept:
A collaborative document editor where ideas move instantly between people.

Visual:
- futuristic collaborative interface preview
- subtle animated cursor/presence concept
- modern glass/surface elements
- professional technology aesthetic

Do not overdo the landing page if it affects the actual application.

==================================================
40. REGISTRATION SCREEN
==================================================

Fields:

Full Name
Email
Create SyncDocs Password
Confirm Password

Validation:
- required fields
- valid email
- password requirements
- password confirmation
- duplicate email handling

Password is the independent SyncDocs password.

Clearly communicate that users are creating a SyncDocs account.

==================================================
41. LOGIN SCREEN
==================================================

Fields:

Email
SyncDocs Password

Actions:

Login
Forgot password can be left as a future enhancement unless fully implemented safely.

Provide:
- link to registration
- useful error messages

==================================================
42. DASHBOARD VISUAL STYLE
==================================================

Dashboard should feel like a modern productivity application.

Include:
- sidebar/navigation
- document cards/table
- create document CTA
- recent documents
- shared documents
- notifications
- profile

Possible navigation:

Dashboard
My Documents
Shared With Me
Activity
Notifications
Settings

Do not create unnecessary functionality just for the sake of navigation.

==================================================
43. EDITOR VISUAL STYLE
==================================================

The editor is the centerpiece.

Use a workspace background around the document.

The paper itself should be:
- white
- A4 proportion
- readable
- realistic margins
- subtle shadow

The surrounding application can use the futuristic SyncDocs design language.

Add subtle visual indicators for:
- collaborators
- live connection
- save state
- locked pages
- AI
- notifications

==================================================
44. ACCESSIBILITY
==================================================

Use:
- semantic HTML
- keyboard-accessible controls
- tooltips for unfamiliar icons
- readable contrast
- visible focus states
- accessible labels

Do not make important actions icon-only without tooltips/labels.

==================================================
45. PERFORMANCE
==================================================

Avoid:
- unnecessary re-renders
- saving to MongoDB on every keystroke
- recreating WebSocket connections unnecessarily
- loading every document/page repeatedly

Use:
- debounced persistence
- efficient React rendering
- sensible API calls
- proper WebSocket lifecycle management

==================================================
46. CODE QUALITY
==================================================

Generate maintainable code.

Avoid:
- giant components
- duplicate logic
- hard-coded user names
- hard-coded Room IDs
- fake collaboration
- fake database calls
- fake save states
- placeholder buttons that appear functional but do nothing

If a feature cannot be fully implemented in one pass, create a clean service/interface and clearly isolate the unfinished integration rather than pretending it works.

==================================================
47. IMPORTANT — DO NOT FAKE REAL-TIME COLLABORATION
==================================================

The collaboration functionality must be architected around:

Yjs
CRDT
WebSocket

Do NOT simulate collaboration with:
- setInterval
- polling
- localStorage
- fake users
- hard-coded cursor positions
- manually duplicated text
- page refresh

Multiple browser windows/users should eventually be able to connect to the same Room ID.

==================================================
48. IMPORTANT — DO NOT FAKE MONGODB
==================================================

The application must be designed to use the actual MongoDB Atlas database.

Do not make localStorage the primary database.

Do not use mock arrays as the permanent application data layer.

Do not create fake MongoDB collections with unrelated names.

Use the exact database/collection design specified above.

==================================================
49. DEVELOPMENT CONFIGURATION
==================================================

Create:

.env.example

with placeholders for:

MONGODB_URI=
JWT_SECRET=
AI_API_KEY=
CLIENT_URL=
SERVER_PORT=

The real .env must remain local and private.

Do not print secrets in logs.

==================================================
50. INITIAL DATA
==================================================

Do not preload sample data into MongoDB.

The database currently contains the six empty collections:

users
documents
pages
permissions
activity_logs
notifications

The application should populate them naturally when real users interact with SyncDocs.

==================================================
51. FINAL FEATURE CHECKLIST
==================================================

The generated application should be structured to support all of these:

AUTHENTICATION
✓ Register
✓ Login
✓ JWT
✓ bcrypt
✓ Independent SyncDocs password

DOCUMENTS
✓ Create multiple documents
✓ Rename
✓ Persistent document identity
✓ Room ID
✓ Autosave

EDITOR
✓ Word-like
✓ A4 pages
✓ Multiple logical pages
✓ Rich text
✓ Formatting ribbon
✓ Font family
✓ Font size
✓ Bold
✓ Italic
✓ Underline
✓ Strikethrough
✓ Alignment
✓ Line spacing
✓ Text spacing
✓ Borders
✓ Page lock

COLLABORATION
✓ Room ID
✓ Generate Room ID
✓ Copy Room ID
✓ Join Room
✓ Multiple users
✓ Yjs
✓ CRDT
✓ WebSocket
✓ Live editing
✓ Concurrent edits
✓ Presence
✓ Participant list
✓ Live cursors
✓ Cursor usernames

SHARING
✓ Owner
✓ Editor
✓ Viewer
✓ Permission management
✓ Access control

ACTIVITY
✓ Activity log
✓ User actions
✓ Page/document context
✓ Timestamps

NOTIFICATIONS
✓ Sharing notification
✓ Permission notification
✓ Collaboration notification
✓ Read/unread

AI
✓ AI button
✓ Side panel
✓ Request box
✓ AI response
✓ Copy result
✓ Server-side API key

SEARCH
✓ Document search
✓ Collaborator search
✓ Content search where practical

EXPORT
✓ PDF
✓ DOCX
✓ HTML
✓ Markdown
✓ TXT

REMOVED FEATURES
✗ Comments
✗ Version History
✗ Version restoration

DATABASE
✓ MongoDB Atlas
✓ One database
✓ Six collections
✓ Correct relationships

==================================================
52. IMPORTANT DEVELOPMENT APPROACH
==================================================

Even though this is one comprehensive request, build the project in a logically staged manner internally.

Recommended order:

1. Project foundation
2. Authentication
3. MongoDB models
4. Dashboard/document management
5. Editor shell and multi-page document layout
6. Rich text editing
7. Room system
8. Yjs + WebSocket collaboration
9. Presence/cursors
10. Permissions/sharing
11. Page locking
12. Autosave
13. Activity logs
14. Notifications
15. AI assistant
16. Search
17. Export
18. Error handling
19. Responsive polish
20. Testing and cleanup

Do not break existing working features when adding later modules.

==================================================
53. IMPORTANT — PRESERVE ARCHITECTURE
==================================================

Do not silently replace:

MongoDB Atlas → with another database.

Yjs/CRDT → with simple polling.

WebSocket → with page refresh.

JWT → with Google login.

bcrypt → with plaintext passwords.

Activity Log → with Version History.

Pages collection → with a single giant document blob.

Room ID → with document _id.

Do not merge all functionality into one component or one backend file.

==================================================
54. FINAL UI QUALITY BAR
==================================================

The final application should look impressive enough for:

- college project demonstration
- project review
- viva
- screenshots in the project report
- live multi-user demonstration

A coordinator should immediately understand:

"This is a collaborative document editor."

The first impression should communicate:
- real-time collaboration
- document editing
- multiple users
- modern technology
- professional software design

Use realistic example labels such as:

Kishore
Jyoti
Rahul

when demonstrating participant UI, but the actual application must use real authenticated users dynamically.

Do NOT use the name Kushali anywhere in the UI, mock data, examples, seed data, or demonstrations.

==================================================
55. FINAL INSTRUCTION TO LOVABLE
==================================================

Build SyncDocs according to this complete specification.

Prioritize correctness, maintainability, real functionality, polished UI, and clean architecture.

Do not simplify the project into a basic text editor.

Do not remove the multi-page Word-like editor.

Do not remove real-time collaboration architecture.

Do not introduce comments or version history.

Do not introduce additional databases.

Do not use Redis unless a later explicit architectural decision requires it.

Use the exact six MongoDB collections specified.

Keep secrets in environment variables.

Create a clean, professional, futuristic but usable interface.

After implementation, inspect the entire project for:
- broken imports
- TypeScript errors
- routing errors
- missing dependencies
- API mismatch
- authentication errors
- MongoDB configuration problems
- WebSocket lifecycle problems
- obvious UI overflow
- responsive issues
- console errors

Run the appropriate build/type-check/test commands available in the generated project and fix errors before considering the initial implementation complete.

The result should be a strong working foundation for SyncDocs that can subsequently be refined and tested feature-by-feature using an engineering agent/IDE.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9d1ddc3e-f785-4e69-8b99-b56d1fc61014).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
