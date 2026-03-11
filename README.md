# PWACommands

PWACommands is an offline-first console-style Progressive Web App built with Laravel, Vue 3, TypeScript, Tailwind CSS, Pinia, and Vue Router. It provides a terminal-like interface where users can run custom commands, keep per-tab command history, work offline, and synchronize their workspace when authenticated.

## Product Summary

The target product defined in `agents.md` is:

- a mobile-first PWA command console
- local-first with offline persistence and later synchronization
- authenticated per-user workspaces
- extensible command registry with grouped commands
- multi-tab command history and tab-scoped variables
- customizable console appearance and behavior

## Current Implementation Status

This section reflects the current codebase, not just the original plan.

### Implemented

- Laravel API with Sanctum token authentication
- User registration, login, logout, and current-user fetch
- Per-user workspace persistence on the backend
- Vue single-page app with a console-style main screen
- Command registry and abstract command contract
- Grouped commands using names such as `list:*`, `string:*`, and `help`
- Command parsing for:
	- long flags (`--param`)
	- short flags (`-p`)
	- quoted strings with single quotes, double quotes, and backticks
	- multiline backtick values
	- tab-scoped variable assignment (`$var << ...`)
	- variable references (`--list=$var`)
	- nested command substitution with `<<`
- Multi-tab workspace UI
- Tab rename, tab delete, history clear, entry delete
- Offline local persistence and queued workspace sync using `localStorage`
- Online/offline detection and sync status badge
- Console settings for background color, font color, font family, font size, and line height
- PWA manifest, offline shell, and service worker caching
- Responsive layout usable on mobile and desktop

### Partially Implemented

- Command discovery:
	- `help` exists and supports global and group-scoped output
	- the UI shows suggestion chips
	- inline autocomplete while typing is not implemented yet
	- parameter-specific live suggestions are not implemented yet
- Offline sync:
	- local-first persistence and queueing exist
	- sync currently saves the full workspace snapshot
	- deterministic conflict handling and conflict recovery UI are not implemented
- Command history rendering:
	- entries are stacked and copyable
	- history currently uses `<pre>` blocks plus copy buttons, not textareas for prompt and response

### Not Implemented Yet

- Advanced personalization options such as cursor style, compact mode, and export/import settings
- Refresh tokens or remember-me flow
- Dedicated tabs, entries, variables, settings, and sync endpoints from the original API plan
- IndexedDB/Dexie local persistence
- Sync revisions, conflict logs, and pull/push delta APIs
- Backend-managed command metadata and command suggestion endpoints
- Dedicated parameter autocomplete dropdown
- Delete-tab confirmation dialog

## Requirements Checklist Against `agents.md`

### 1. Authentication and Accounts

- Register with name/email/password: implemented
- Login and logout: implemented
- Isolated user tabs and command history: implemented
- Isolated user settings: implemented for console appearance
- Remember me / refresh tokens: not implemented

### 2. Console-Like Command Interface

- Console-style main screen: implemented
- Prompt execution creates history entries with command, response, timestamp, and status: implemented
- Structured parsed metadata stored in entries: not implemented
- Prompt and response shown in textareas: not implemented
- Stacked history in active tab: implemented
- Semantic status colors: implemented
- Semantic token coloring for command parts inside the prompt/output text: not implemented

### 3. Generic Command Model + Custom Commands

- Generic abstract command contract: implemented
- Custom command registry: implemented
- Namespaced command names: implemented
- Key/value params: implemented
- Short and long flags: implemented
- Quoted strings: implemented
- Required and optional parameters: implemented at command level
- Nested command substitution with `<<`: implemented
- Tab-scoped variable assignment and reuse: implemented
- Structured validation errors in console output: partially implemented

### 4. Command Discovery and Assistance

- Built-in `help` command: implemented
- Group-scoped help: implemented
- Help output with descriptions and aliases: implemented
- Autocomplete while typing: not implemented
- Parameter suggestions for selected command: not implemented

### 5. Multi-Tab History Management

- Create tabs: implemented
- Switch tabs: implemented
- Independent per-tab history: implemented
- Delete tabs: implemented
- Rename tabs: implemented
- Delete confirmation: not implemented

### 6. Offline-First and Synchronization

- Local-first writes: implemented
- Offline queue: implemented in simplified form
- Automatic sync on reconnect: implemented in simplified form
- Visible sync status: implemented
- Deterministic conflict resolution strategy: not implemented

### 7. Settings and Customization

- User-configurable theme and typography options: partially implemented

### 8. PWA Behavior

- Installable manifest: implemented
- Service worker caching: implemented
- Offline shell: implemented
- Runtime asset caching: implemented

## Current Command Set

### Core

- `help`

### Date

- `date:format`

### List

- `list:changeSeparator`
- `list:count`
- `list:filter`
- `list:fromRange`
- `list:random`
- `list:sort`
- `list:unique`

### String

- `string:hash`
- `string:password`
- `string:replace`

## Command Usage Examples

### Basic commands

```txt
help
help list
list:unique --list="1,2,2,3,3"
list:count --list="apple,banana,cherry"
string:replace --text="banana" --search="a" --target="o"
```

### Variable assignment and reuse

```txt
$tempList << list:sort --list="5,3,2,1"
list:unique --list=$tempList
```

### Nested command substitution

```txt
list:count --list=<< list:unique --list="1,2,2,3,3"
```

### Multiline input with backticks

```txt
string:replace --text=`first line
second line
third line` --search=`
` --target=,
```

## Architecture Overview

### Frontend

- Vue 3 + TypeScript SPA
- Pinia installed and app bootstrapped with Vue Router
- Command execution happens in the frontend for offline-first behavior
- Workspace persistence is currently stored in `localStorage`

### Backend

- Laravel 12 API
- Sanctum token authentication
- Workspace save/load endpoints persist tabs and entries per user
- Current backend stores full workspace snapshots instead of granular sync entities

## API Surface in the Current Build

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Workspace

- `GET /api/workspace`
- `POST /api/workspace`
- `PUT /api/workspace`

### Settings

- `GET /api/settings`
- `PATCH /api/settings`
- `PUT /api/settings`

### Commands metadata

- `GET /api/commands`

Note: `/api/commands` currently returns an empty list and explicitly states that command definitions are frontend-managed.

## Installation

### Prerequisites

- PHP 8.2+
- Composer
- Node.js 20+ recommended
- npm
- A database supported by Laravel configured in `.env`

### Quick setup

```bash
composer run setup
```

This script installs PHP dependencies, creates `.env` if missing, generates the app key, runs migrations, installs npm packages, and builds the frontend.

### Manual setup

```bash
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
npm install
```

If you are not on Windows, replace `copy` with `cp`.

## Running the App

### Full development mode

```bash
composer run dev
```

This starts:

- the Laravel development server
- the Laravel queue listener
- the Vite dev server

### Alternative manual run

```bash
php artisan serve
npm run dev
```

### Production build assets

```bash
npm run build
```

### Type checking

```bash
npm run typecheck
```

### Backend tests

```bash
composer test
```

## Usage

### 1. Authenticate or use guest mode

- Open the app in the browser
- Register a new account or log in
- If not authenticated, the app still works locally in guest scope

### 2. Work with tabs

- Create a tab with `+ New Tab`
- Rename a tab by clicking its label
- Remove a tab with the `×` control

### 3. Run commands

- Type a command in the command input area
- Press `Enter` to execute
- Press `Ctrl+Enter` or `Cmd+Enter` to insert a newline in the input

### 4. Work offline

- The current workspace is written locally first
- If you are offline, changes are queued locally
- When the app comes back online while authenticated, the workspace is pushed to the backend

### 5. Install as a PWA

- Open the app in a supported browser
- Use the browser install prompt or install action
- After installation, the app can load its cached shell offline

## Data Storage Notes

- Authentication token and current user are stored in `localStorage`
- Guest and authenticated workspaces are stored separately in `localStorage`
- Offline queueing is also stored in `localStorage`
- This differs from the original target design, which called for IndexedDB and stronger token storage protections

## Known Gaps Relative to the Original Specification

- No advanced settings yet for cursor style, compact mode, export/import, or entry spacing
- No refresh tokens or remember-me flow
- No inline autocomplete dropdown while typing
- No parameter hint engine
- No per-entity sync outbox or delta sync
- No conflict-resolution UI or revision tracking
- No dedicated settings, variables, tabs, or entries CRUD API set
- History items are not rendered with textareas yet

## Suggested Next Milestones

1. Expand settings beyond appearance into cursor style, compact mode, spacing, and export/import.
2. Replace `localStorage` workspace persistence with IndexedDB.
3. Implement true autocomplete and parameter hinting in the command input.
4. Evolve sync from full-workspace save to granular push/pull with conflict handling.
5. Align the UI with the remaining acceptance criteria, especially textareas for history items and tab delete confirmation.
