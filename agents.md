# PWACommands — Project Specification (`agents.md`)

## 1) Project Summary
PWACommands is an offline-first Progressive Web App (PWA) that emulates a command-console experience with custom commands.

Core goals:
- Build with **TypeScript + Vue.js + Tailwind CSS**.
- Mobile-first responsive UI that works on both phone and desktop.
- Work fully offline for core usage (command execution UI, command log browsing, tab management, user data access on current device).
- Persist all user content locally first, then synchronize with backend when internet becomes available.
- Provide secure user accounts (register/login) so each user owns their own tabs and command history.
- Offer deep personalization (theme colors, fonts, console behavior options).

---

## 2) Product Requirements (Functional)

### 2.1 Authentication and Accounts
- Users can register with username/email + password.
- Users can log in and log out.
- Each authenticated user has isolated data:
  - tabs
  - command prompts
  - command responses
  - settings
- Optional “remember me” with refresh tokens.

### 2.2 Console-Like Command Interface
- Main screen behaves like a command console.
- Commands are entered as prompt text.
- Each execution creates a stack entry (like terminal history) containing:
  - prompt/command input
  - parsed command metadata
  - response output
  - timestamps
  - status (pending/success/error/synced)
- Prompt and response are shown in **textareas** so users can copy full content.
- Entries remain visible as a vertically stacked history in current tab.
- Console text uses semantic colors to improve readability:
  - command names
  - parameter keys and values
  - response states (success/error/info)

### 2.3 Generic Command Model + Custom Commands
- A generic `Command` abstraction defines:
  - command name
  - description
  - schema for parameters
  - validation rules
  - execution strategy
- Custom commands inherit/implement this abstraction.
- Command parser should support:
  - namespaced/grouped command names (e.g., `list:random`, `list:unique`, `list:filter`)
  - command name + key/value params
  - short and long flags (e.g., `-v` and `--version`)
  - quoted strings
  - optional and required parameters
  - command substitution/nesting (e.g., `list:sortAsc --list=<< list:unique --list="1,2,345,4,3,"`)
  - tab-scoped variable assignment and references (e.g., `$tempList << list::sort --list="5,3,2,1"` then `list::unique --list=$tempList`)
- Invalid command usage should return structured errors in the console output.

### 2.4 Command Discovery and Assistance
- Autocomplete while typing command names.
- Parameter suggestions for the currently selected command.
- Built-in `help` command for global command listing.
- Group-scoped help/search (e.g., `help list` shows only `list:*` commands).
- Help output includes command description, parameters, and short/long aliases.

### 2.5 Multi-Tab History Management
- Users can create multiple tabs (sessions/workspaces).
- Each tab keeps independent history.
- Users can switch tabs to inspect old prompt/response logs.
- Users can add/delete tabs (with confirmation on delete).
- Optionally rename tabs.

### 2.6 Offline-First and Synchronization
- All writes happen locally first.
- If offline:
  - data is queued in a sync outbox.
  - app remains fully usable.
- If online:
  - pending local changes sync to backend.
  - conflicts are resolved by deterministic strategy.
- Sync status visible in UI (e.g., offline, syncing, synced, conflict).

### 2.7 Settings and Customization
User-configurable options (minimum):
- font color
- background color
- font family

Recommended additional options:
- font size
- line height
- console cursor style
- entry spacing
- timestamp visibility
- command auto-scroll behavior
- compact mode
- export/import settings

### 2.8 PWA Behavior
- Installable app (manifest + icons).
- Service worker with caching strategy.
- Offline shell must load even without network.
- Runtime caching for static assets and optionally API fallback behavior.

---

## 3) Non-Functional Requirements
- **Performance:** first screen interactive quickly (<2s on modern hardware for cached app shell).
- **Reliability:** no data loss from offline usage; pending operations persist across app restarts.
- **Security:** hashed passwords backend-side; secure token handling; HTTPS-only in production.
- **Accessibility:** keyboard-first navigation, readable contrast options, focus visibility.
- **Scalability:** architecture supports many commands and long histories.

---

## 4) Recommended Technical Stack

### Frontend
- Vue 3 + TypeScript
- Vite
- Pinia (state management)
- Vue Router
- Tailwind CSS
- PWA plugin for Vite (Workbox-based service worker generation)
- IndexedDB wrapper (e.g., Dexie) for offline storage

### Backend (preferred)
- PHP + Laravel (primary recommendation)
- Plain PHP (acceptable for a lightweight MVP with clear architecture boundaries)
- PostgreSQL (or equivalent relational DB)
- Redis (optional for queues/session optimization)
- Laravel Sanctum/Passport or JWT with refresh tokens

### Sync/Transport
- REST or GraphQL APIs
- Optional WebSocket channel for near-real-time sync feedback

---

## 5) High-Level Architecture

### 5.1 Client Architecture
Modules:
- Auth module
- Console module
- Command engine module
- Tabs module
- Settings/theme module
- Offline storage + sync module

Data flow:
1. User submits command in active tab.
2. Command parser validates against command schema.
3. Entry is written to local DB immediately.
4. UI updates instantly from local state.
5. Sync engine pushes unsynced records when online.

### 5.2 Backend Architecture
Boundaries:
- `auth` (register/login/token refresh)
- `users` (profile/preferences)
- `tabs` (CRUD + ownership)
- `entries` (history items)
- `commands` (optional server-managed command metadata)
- `sync` (delta endpoints and conflict handling)

---

## 6) Data Model (Conceptual)

### 6.1 Entities

#### User
- id
- username
- email
- passwordHash
- createdAt, updatedAt

#### UserSettings
- id
- userId
- themeBackgroundColor
- themeFontColor
- fontFamily
- fontSize
- lineHeight
- otherConsoleOptions (JSON)
- updatedAt

#### CommandTab
- id
- userId
- name
- position
- createdAt, updatedAt, deletedAt

#### CommandEntry
- id
- userId
- tabId
- commandName
- rawPrompt
- parsedParams (JSON)
- responseText
- status (pending|success|error)
- syncState (local|queued|synced|conflict)
- localRevision
- serverRevision
- createdAt, updatedAt

#### TabVariable
- id
- userId
- tabId
- name
- value (JSON or string)
- sourceEntryId
- createdAt, updatedAt

#### SyncOutboxItem
- id
- userId
- entityType
- entityId
- operation (create|update|delete)
- payload (JSON)
- retryCount
- lastError
- createdAt

---

## 7) Command System Design

### 7.1 Generic Command Contract
```ts
export interface CommandParameterSchema {
  name: string;
  shortAlias?: string;
  longAlias?: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface CommandExecutionContext {
  userId: string;
  tabId: string;
  timestamp: string;
  isOffline: boolean;
}

export interface CommandResult {
  ok: boolean;
  output: string;
  metadata?: Record<string, unknown>;
}

export interface Command {
  name: string;
  group?: string;
  description: string;
  parameters: CommandParameterSchema[];
  validate(input: Record<string, unknown>): { valid: boolean; errors?: string[] };
  execute(input: Record<string, unknown>, context: CommandExecutionContext): Promise<CommandResult>;
}
```

### 7.2 Registry Pattern
- `CommandRegistry` keeps all available commands.
- New custom commands register themselves at app startup.
- Parser resolves command name to instance in registry.
- Registry indexes commands by `group` and name for fast scoped help/search.

### 7.3 Help and Autocomplete Engine
- `help` command renders:
  - all commands (global mode)
  - only commands from a group (scoped mode, e.g., `help list`)
- Autocomplete source is the same registry to keep behavior consistent.
- Parameter suggestions include required/optional indicator and alias hints (`-v`, `--version`).

### 7.4 Execution Lifecycle
1. Parse raw prompt
2. Resolve command
3. Resolve variable references from tab scope
4. Validate params
5. Persist pending entry locally
6. Execute
7. Persist variable assignment if command output is assigned (e.g., `$tempList << ...`)
8. Update response + status
9. Queue sync operation

### 7.5 Advanced Parsing Notes
- Support both long and short options:
  - `cmd --version`
  - `cmd -v`
- Support nested command execution with substitution marker `<<` before main command execution.
- Support variable assignment syntax:
  - `$tempList << list::sort --list="5,3,2,1"`
- Support variable references in params:
  - `list::unique --list=$tempList`
- Variable scope is per-tab and per-user.
- Parse command groups as namespace prefix split by `:`.

---

## 8) Offline-First & Sync Strategy

### 8.1 Local-First Writes
- Every mutation writes to IndexedDB first.
- Sync queue stores operations to replay when online.

### 8.2 Online Detection
- Use browser online/offline events + periodic health checks.
- Sync engine resumes automatically when connectivity returns.

### 8.3 Conflict Resolution (recommended baseline)
- Track `localRevision` and `serverRevision`.
- Use deterministic default: last-write-wins by server timestamp.
- Preserve losing version in conflict log for manual recovery.

### 8.4 Sync API Pattern
- `POST /sync/push` for client queued changes
- `GET /sync/pull?since=...` for remote updates
- return acknowledgements and conflict payloads

---

## 9) UI/UX Requirements (Console Aesthetic)
- Monospaced-friendly default theme.
- Mobile-first responsive layout for small screens first, then desktop enhancements.
- Stacked prompt/response blocks in chronological order.
- Prompt and output each in dedicated textarea for easy full-copy.
- Visual syntax coloring for command token types (command, parameter, values, outputs).
- Suggestion dropdown for command autocomplete and parameter hints.
- Keyboard-first interactions:
  - Enter to submit (with modifier for multiline if desired)
  - tab switching shortcuts (optional)
- No visual clutter; focus on text interaction and legibility.

Screen regions:
- Header: user, connectivity/sync status, quick settings access
- Left/Top tab bar: add/delete/switch tabs
- Main console panel: stacked history entries
- Bottom command input area

---

## 10) Security Requirements
- Passwords hashed with Argon2/bcrypt on backend.
- Access tokens short-lived; refresh token rotation.
- API authorization on every tab/history operation by user ownership.
- Sensitive local data protections:
  - avoid storing plaintext secrets in local storage
  - use secure cookie or hardened token storage strategy

---

## 11) Suggested API Endpoints (MVP)

Auth:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

Tabs:
- `GET /tabs`
- `POST /tabs`
- `PATCH /tabs/:id`
- `DELETE /tabs/:id`

Entries:
- `GET /tabs/:id/entries`
- `POST /tabs/:id/entries`
- `PATCH /entries/:id`
- `DELETE /entries/:id`

Variables:
- `GET /tabs/:id/variables`
- `POST /tabs/:id/variables`
- `PATCH /tabs/:id/variables/:name`
- `DELETE /tabs/:id/variables/:name`

Settings:
- `GET /settings`
- `PATCH /settings`

Sync:
- `POST /sync/push`
- `GET /sync/pull`

Commands metadata:
- `GET /commands` (global list + metadata)
- `GET /commands/groups/:group` (group-filtered commands)
- `GET /commands/suggest?q=...` (autocomplete and parameter hints)

---

## 12) State Management (Frontend)
Pinia stores:
- `useAuthStore`
- `useTabsStore`
- `useConsoleStore`
- `useVariablesStore`
- `useSettingsStore`
- `useSyncStore`

Principles:
- source of truth from local DB and cached store state
- optimistic UI updates
- retryable sync queue with exponential backoff

---

## 13) MVP Roadmap

### Phase 1 — Foundation
- Vue + TS + Tailwind + PWA setup
- register/login
- local DB setup

### Phase 2 — Console Core
- command input + parser
- command registry + sample custom commands
- stacked prompt/response rendering via textareas
- colorized command/output rendering + status colors
- help command (global + group mode)
- autocomplete and parameter suggestion engine
- short/long parameter aliases + command substitution support
- tab-scoped variable assignment/reference support

### Phase 3 — Tabs + History
- multi-tab creation/deletion/switch
- per-tab local history persistence

### Phase 4 — Sync
- outbox queue
- push/pull endpoints
- online recovery and conflict handling

### Phase 5 — Settings + Polish
- theme and typography customization
- accessibility + installability checks
- performance optimization

---

## 14) Acceptance Criteria (MVP)
1. User can register and login.
2. User can create/delete/switch tabs.
3. Commands execute and produce stacked prompt/response entries.
4. Prompt and response are always copyable via textareas.
5. App works offline and preserves history across reloads.
6. Offline-created changes sync automatically when back online.
7. User settings for console appearance persist and apply correctly.
8. User A cannot access User B data.
9. `help` command lists all commands with descriptions and parameters.
10. Group-scoped help/search returns only commands in that namespace/group.
11. Autocomplete and parameter suggestions are available while typing.
12. Parser accepts short and long flags (e.g., `-v` and `--version`).
13. Parser supports nested command substitution using `<<`.
14. UI is usable on mobile and desktop with mobile-first design.
15. User can assign command output to a tab variable and reuse it in later commands within the same tab.

---

## 15) Risks and Mitigations
- **Sync complexity:** start with simple deterministic conflict strategy.
- **Large local history:** paginate/virtualize long lists.
- **Theme readability:** enforce minimum contrast checks.
- **Token/session edge cases offline:** define graceful fallback and re-auth flows.

---

## 16) Future Enhancements (Post-MVP)
- Command auto-complete and inline hints
- Import/export tab histories
- Encrypted local storage option
- Multi-device near-real-time sync
- Shared read-only tab snapshots

---

## 17) Definition of Done
- Functional requirements implemented and manually validated.
- Offline scenarios tested (airplane mode, reconnect sync).
- Basic security checks complete.
- Build passes; PWA install and offline shell verified.
- Documentation updated (README + architecture notes + setup instructions).
