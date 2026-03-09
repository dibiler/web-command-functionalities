const API_BASE = '/api';

export async function httpRequest<T>(
    path: string,
    init: RequestInit = {},
    token?: string,
): Promise<T> {
    const headers = new Headers(init.headers ?? {});

    if (!headers.has('Content-Type') && init.body) {
        headers.set('Content-Type', 'application/json');
    }

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
    });

    if (!response.ok) {
        const payload = await safeReadJson(response);
        const payloadMessage = payload && typeof payload.message === 'string' ? payload.message : null;
        const message = payloadMessage ?? `Request failed with status ${response.status}`;
        throw new Error(message);
    }

    return response.json() as Promise<T>;
}

async function safeReadJson(response: Response): Promise<Record<string, unknown> | null> {
    try {
        return await response.json() as Record<string, unknown>;
    } catch {
        return null;
    }
}
