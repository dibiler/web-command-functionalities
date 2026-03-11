import type { ConsoleSettings } from '../types/settings';

import { httpRequest } from './http';

type SettingsResponse = {
    settings: ConsoleSettings;
};

export function getDefaultConsoleSettings(): ConsoleSettings {
    return {
        themeBackgroundColor: '#09090b',
        themeFontColor: '#f4f4f5',
        fontFamily: 'Fira Code, Consolas, monospace',
        fontSize: 14,
        lineHeight: 1.5,
    };
}

export async function fetchSettings(token: string): Promise<ConsoleSettings> {
    const response = await httpRequest<SettingsResponse>('/settings', {
        method: 'GET',
    }, token);

    return normalizeConsoleSettings(response.settings);
}

export async function saveSettings(token: string, settings: ConsoleSettings): Promise<ConsoleSettings> {
    const response = await httpRequest<SettingsResponse>('/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
    }, token);

    return normalizeConsoleSettings(response.settings);
}

export function normalizeConsoleSettings(settings: Partial<ConsoleSettings> | null | undefined): ConsoleSettings {
    const defaults = getDefaultConsoleSettings();

    return {
        themeBackgroundColor: isHexColor(settings?.themeBackgroundColor) ? settings!.themeBackgroundColor : defaults.themeBackgroundColor,
        themeFontColor: isHexColor(settings?.themeFontColor) ? settings!.themeFontColor : defaults.themeFontColor,
        fontFamily: typeof settings?.fontFamily === 'string' && settings.fontFamily.trim().length > 0
            ? settings.fontFamily
            : defaults.fontFamily,
        fontSize: clampInteger(settings?.fontSize, 12, 24, defaults.fontSize),
        lineHeight: clampNumber(settings?.lineHeight, 1, 2, defaults.lineHeight),
    };
}

function isHexColor(value: unknown): value is string {
    return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
    const parsed = typeof value === 'number' ? value : Number(value);

    if (!Number.isInteger(parsed)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, parsed));
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    const parsed = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, Number(parsed.toFixed(2))));
}
