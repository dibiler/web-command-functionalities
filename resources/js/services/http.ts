const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

function buildApiUrl(path: string): string {
    const normalizedBase = API_BASE.replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${normalizedBase}${normalizedPath}`;
}

export async function httpRequest<T>(
    path: string,
    init: RequestInit = {},
    token?: string,
): Promise<T> {
    const headers = new Headers(init.headers ?? {});

    if (!headers.has('Content-Type') && init.body) {
        headers.set('Content-Type', 'application/json');
    }

    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
    }

    if (!headers.has('X-Requested-With')) {
        headers.set('X-Requested-With', 'XMLHttpRequest');
    }

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(buildApiUrl(path), {
        ...init,
        headers,
    });

    if (!response.ok) {
        const payload = await safeReadJson(response);
        const payloadMessage = payload && typeof payload.message === 'string' ? payload.message : null;
        const fallbackText = await safeReadText(response);
        const message = payloadMessage
            ?? (fallbackText && fallbackText.length > 0 ? fallbackText : null)
            ?? `Request failed with status ${response.status}`;
        throw new Error(message);
    }

    if (response.status === 204) {
        return {} as T;
    }

    const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? '';

    if (!contentType.includes('application/json')) {
        const fallbackText = await safeReadText(response);
        const preview = fallbackText ? fallbackText.slice(0, 120) : 'empty body';
        throw new Error(`Unexpected non-JSON response from ${path}: ${preview}`);
    }

    return response.json() as Promise<T>;
}

async function safeReadJson(response: Response): Promise<Record<string, unknown> | null> {
    try {
        const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? '';
        if (!contentType.includes('application/json')) {
            return null;
        }

        return await response.clone().json() as Record<string, unknown>;
    } catch {
        return null;
    }
}

async function safeReadText(response: Response): Promise<string | null> {
    try {
        const text = await response.clone().text();
        return text.trim();
    } catch {
        return null;
    }
}
