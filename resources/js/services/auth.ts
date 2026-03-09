import type { AuthUser } from '../types/auth';

import { httpRequest } from './http';

type AuthResponse = {
    token: string;
    user: AuthUser;
};

const TOKEN_KEY = 'pwacommands.auth.token';
const USER_KEY = 'pwacommands.auth.user';

export function getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as AuthUser;
    } catch {
        return null;
    }
}

export function clearStoredAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export async function register(payload: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}): Promise<AuthResponse> {
    const response = await httpRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    persistAuth(response);
    return response;
}

export async function login(payload: { email: string; password: string }): Promise<AuthResponse> {
    const response = await httpRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    persistAuth(response);
    return response;
}

export async function me(token: string): Promise<AuthUser> {
    const response = await httpRequest<{ user: AuthUser }>('/auth/me', {
        method: 'GET',
    }, token);

    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    return response.user;
}

export async function logout(token: string): Promise<void> {
    try {
        await httpRequest<{ message: string }>('/auth/logout', {
            method: 'POST',
        }, token);
    } finally {
        clearStoredAuth();
    }
}

function persistAuth(response: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
}
