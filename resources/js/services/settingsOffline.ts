import type { AuthUser } from '../types/auth';
import type { ConsoleSettings } from '../types/settings';

import { getDefaultConsoleSettings, normalizeConsoleSettings } from './settings';

const SETTINGS_PREFIX = 'pwacommands.settings';

export function getSettingsScope(user: AuthUser | null): string {
    return user ? `user:${user.id}` : 'guest';
}

export function readLocalSettings(scope: string): ConsoleSettings {
    const raw = localStorage.getItem(buildKey(scope));

    if (!raw) {
        return getDefaultConsoleSettings();
    }

    try {
        return normalizeConsoleSettings(JSON.parse(raw) as Partial<ConsoleSettings>);
    } catch {
        return getDefaultConsoleSettings();
    }
}

export function writeLocalSettings(scope: string, settings: ConsoleSettings): void {
    localStorage.setItem(buildKey(scope), JSON.stringify(normalizeConsoleSettings(settings)));
}

function buildKey(scope: string): string {
    return `${SETTINGS_PREFIX}.${scope}`;
}
