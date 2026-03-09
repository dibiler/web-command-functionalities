import type { ConsoleTab } from '../types/console';

import { httpRequest } from './http';

type WorkspaceResponse = {
    tabs: ConsoleTab[];
};

export async function fetchWorkspace(token: string): Promise<ConsoleTab[]> {
    const response = await httpRequest<WorkspaceResponse>('/workspace', {
        method: 'GET',
    }, token);

    return response.tabs;
}

export async function saveWorkspace(token: string, tabs: ConsoleTab[]): Promise<void> {
    await httpRequest<{ message: string }>('/workspace', {
        method: 'PUT',
        body: JSON.stringify({ tabs }),
    }, token);
}
