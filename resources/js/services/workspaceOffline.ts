import type { AuthUser } from '../types/auth';
import type { ConsoleTab } from '../types/console';

const LOCAL_PREFIX = 'pwacommands.workspace.local';
const OUTBOX_PREFIX = 'pwacommands.workspace.outbox';

export function getWorkspaceScope(user: AuthUser | null): string {
    return user ? `user:${user.id}` : 'guest';
}

export function readLocalWorkspace(scope: string): ConsoleTab[] | null {
    return readTabs(buildKey(LOCAL_PREFIX, scope));
}

export function writeLocalWorkspace(scope: string, tabs: ConsoleTab[]): void {
    writeTabs(buildKey(LOCAL_PREFIX, scope), tabs);
}

export function readQueuedWorkspace(scope: string): ConsoleTab[] | null {
    return readTabs(buildKey(OUTBOX_PREFIX, scope));
}

export function queueWorkspace(scope: string, tabs: ConsoleTab[]): void {
    writeTabs(buildKey(OUTBOX_PREFIX, scope), tabs);
}

export function clearQueuedWorkspace(scope: string): void {
    localStorage.removeItem(buildKey(OUTBOX_PREFIX, scope));
}

function buildKey(prefix: string, scope: string): string {
    return `${prefix}.${scope}`;
}

function readTabs(key: string): ConsoleTab[] | null {
    const raw = localStorage.getItem(key);
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as ConsoleTab[];

        if (!Array.isArray(parsed)) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

function writeTabs(key: string, tabs: ConsoleTab[]): void {
    localStorage.setItem(key, JSON.stringify(tabs));
}
