export type ConsoleEntryStatus = 'success' | 'error' | 'info';

export type ConsoleEntry = {
    id: string;
    command: string;
    response: string;
    status: ConsoleEntryStatus;
    timestamp: string;
};

export type ConsoleTab = {
    id: string;
    name: string;
    entries: ConsoleEntry[];
};
