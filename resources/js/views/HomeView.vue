<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { CSSProperties } from 'vue';

import CommandInputPanel from '../components/home/CommandInputPanel.vue';
import HistoryPanel from '../components/home/HistoryPanel.vue';
import SettingsPanel from '../components/home/SettingsPanel.vue';
import SyncStatusBadge from '../components/home/SyncStatusBadge.vue';
import TabsBar from '../components/home/TabsBar.vue';
import { clearStoredAuth, getStoredToken, getStoredUser, login, logout, me, register } from '../services/auth';
import { buildCommandSuggestions, executeCommandPrompt, getAvailableCommands } from '../services/commands';
import { fetchSettings, getDefaultConsoleSettings, normalizeConsoleSettings, saveSettings } from '../services/settings';
import { getSettingsScope, readLocalSettings, writeLocalSettings } from '../services/settingsOffline';
import { fetchWorkspace, saveWorkspace } from '../services/workspace';
import {
    clearQueuedWorkspace,
    getWorkspaceScope,
    queueWorkspace,
    readLocalWorkspace,
    readQueuedWorkspace,
    writeLocalWorkspace,
} from '../services/workspaceOffline';
import type { AuthUser } from '../types/auth';
import type { ConsoleTab } from '../types/console';
import type { ConsoleSettings } from '../types/settings';

type HistoryPanelExposed = {
    scrollToBottom: () => void;
};

type CommandInputPanelExposed = {
    autoResize: () => void;
    moveCursorToEnd: () => void;
};

function createDefaultTabs(): ConsoleTab[] {
    return [
        {
            id: crypto.randomUUID(),
            name: 'Main',
            entries: [
                {
                    id: crypto.randomUUID(),
                    command: 'help list',
                    response: 'Available commands in list group: list:random, list:unique, list:filter, list:sort',
                    status: 'info',
                    timestamp: new Date().toISOString(),
                },
            ],
        },
    ];
}

const tabs = ref<ConsoleTab[]>(createDefaultTabs());

const activeTabId = ref(tabs.value[0].id);
const commandInput = ref('');
const commandInputPanelRef = ref<CommandInputPanelExposed | null>(null);
const commandHistoryIndex = ref<number | null>(null);
const commandHistoryDraft = ref('');
const historyPanelRef = ref<HistoryPanelExposed | null>(null);
const editingTabId = ref<string | null>(null);
const editingTabName = ref('');
const copiedKey = ref<string | null>(null);
const showSettingsPanel = ref(false);
const isOnline = ref(navigator.onLine);
const isSyncing = ref(false);
const syncPulseTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
const authToken = ref<string | null>(getStoredToken());
const authUser = ref<AuthUser | null>(getStoredUser());
const authMode = ref<'login' | 'register'>('login');
const authName = ref('');
const authEmail = ref('');
const authPassword = ref('');
const authPasswordConfirmation = ref('');
const authError = ref<string | null>(null);
const authLoading = ref(false);
const syncError = ref<string | null>(null);
const consoleSettings = ref<ConsoleSettings>(getDefaultConsoleSettings());
const hasLoadedSettings = ref(false);
const hasLoadedWorkspace = ref(false);
const saveSettingsTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
const saveWorkspaceTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
const commandDefinitions = getAvailableCommands();
const tabVariables = ref<Record<string, Record<string, string>>>({
    [tabs.value[0].id]: {},
});

const activeTab = computed(() => tabs.value.find((tab) => tab.id === activeTabId.value) ?? tabs.value[0]);
const activeVariables = computed(() => tabVariables.value[activeTabId.value] ?? {});
const isAuthenticated = computed(() => authUser.value !== null && authToken.value !== null);
const shellStyle = computed<CSSProperties>(() => ({
    '--console-bg': consoleSettings.value.themeBackgroundColor,
    '--console-panel': shiftHexColor(consoleSettings.value.themeBackgroundColor, 10),
    '--console-surface': shiftHexColor(consoleSettings.value.themeBackgroundColor, 18),
    '--console-border': withAlpha(consoleSettings.value.themeFontColor, 0.18),
    '--console-text': consoleSettings.value.themeFontColor,
    '--console-muted': withAlpha(consoleSettings.value.themeFontColor, 0.68),
    backgroundColor: consoleSettings.value.themeBackgroundColor,
    color: consoleSettings.value.themeFontColor,
    fontFamily: consoleSettings.value.fontFamily,
    fontSize: `${consoleSettings.value.fontSize}px`,
    lineHeight: String(consoleSettings.value.lineHeight),
}));

function shiftHexColor(hex: string, amount: number): string {
    const rgb = hexToRgb(hex);

    if (!rgb) {
        return hex;
    }

    const next = [rgb.red, rgb.green, rgb.blue].map((value) => Math.max(0, Math.min(255, value + amount)));

    return `#${next.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function withAlpha(hex: string, alpha: number): string {
    const rgb = hexToRgb(hex);

    if (!rgb) {
        return hex;
    }

    return `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${alpha})`;
}

function hexToRgb(hex: string): { red: number; green: number; blue: number } | null {
    const normalized = hex.replace('#', '');

    if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) {
        return null;
    }

    return {
        red: Number.parseInt(normalized.slice(0, 2), 16),
        green: Number.parseInt(normalized.slice(2, 4), 16),
        blue: Number.parseInt(normalized.slice(4, 6), 16),
    };
}

function applyConsoleSettings(nextSettings: Partial<ConsoleSettings> | ConsoleSettings): void {
    const normalized = normalizeConsoleSettings(nextSettings);

    if (areSettingsEqual(consoleSettings.value, normalized)) {
        return;
    }

    consoleSettings.value = normalized;
}

function areSettingsEqual(left: ConsoleSettings, right: ConsoleSettings): boolean {
    return left.themeBackgroundColor === right.themeBackgroundColor
        && left.themeFontColor === right.themeFontColor
        && left.fontFamily === right.fontFamily
        && left.fontSize === right.fontSize
        && left.lineHeight === right.lineHeight;
}

function applyWorkspaceTabs(nextTabs: ConsoleTab[]): void {
    const safeTabs = nextTabs.length > 0 ? nextTabs : createDefaultTabs();
    tabs.value = safeTabs;

    if (!safeTabs.some((tab) => tab.id === activeTabId.value)) {
        activeTabId.value = safeTabs[0].id;
    }

    tabVariables.value = Object.fromEntries(safeTabs.map((tab) => [tab.id, tabVariables.value[tab.id] ?? {}]));
}

function hydrateLocalWorkspaceForCurrentScope(): void {
    const cachedTabs = readLocalWorkspace(getWorkspaceScope(authUser.value));
    if (cachedTabs && cachedTabs.length > 0) {
        applyWorkspaceTabs(cachedTabs);
    }
}

function hydrateLocalSettingsForCurrentScope(): void {
    applyConsoleSettings(readLocalSettings(getSettingsScope(authUser.value)));
}

function triggerSyncPulse(duration = 700): void {
    if (!isOnline.value) {
        isSyncing.value = false;
        return;
    }

    isSyncing.value = true;

    if (syncPulseTimeout.value) {
        clearTimeout(syncPulseTimeout.value);
    }

    syncPulseTimeout.value = setTimeout(() => {
        isSyncing.value = false;
        syncPulseTimeout.value = null;
    }, duration);
}

function updateOnlineStatus(): void {
    const wasOffline = !isOnline.value;
    isOnline.value = navigator.onLine;

    if (!isOnline.value) {
        isSyncing.value = false;
        if (syncPulseTimeout.value) {
            clearTimeout(syncPulseTimeout.value);
            syncPulseTimeout.value = null;
        }
        return;
    }

    if (wasOffline && isOnline.value) {
        triggerSyncPulse(1000);
    }
}

const tabSuggestions = computed(() => buildCommandSuggestions(commandDefinitions));

function addTab(): void {
    const nextTab: ConsoleTab = {
        id: crypto.randomUUID(),
        name: `Tab ${tabs.value.length + 1}`,
        entries: [],
    };

    tabs.value.push(nextTab);
    tabVariables.value[nextTab.id] = {};
    activeTabId.value = nextTab.id;

    scheduleWorkspaceSave();
}

function removeTab(tabId: string): void {
    if (tabs.value.length <= 1) {
        return;
    }

    tabs.value = tabs.value.filter((tab) => tab.id !== tabId);
    delete tabVariables.value[tabId];

    if (activeTabId.value === tabId) {
        activeTabId.value = tabs.value[0].id;
    }

    scheduleWorkspaceSave();
}

function clearActiveTabHistory(): void {
    if (!activeTab.value) {
        return;
    }

    activeTab.value.entries = [];
    commandHistoryIndex.value = null;
    commandHistoryDraft.value = '';

    scheduleWorkspaceSave(true);
}

function removeEntry(entryId: string): void {
    if (!activeTab.value) {
        return;
    }

    activeTab.value.entries = activeTab.value.entries.filter((entry) => entry.id !== entryId);

    commandHistoryIndex.value = null;
    commandHistoryDraft.value = '';

    scheduleWorkspaceSave();
}

function startTabRename(tab: ConsoleTab): void {
    editingTabId.value = tab.id;
    editingTabName.value = tab.name;

    nextTick(() => {
        const input = document.querySelector<HTMLInputElement>(`input[data-tab-rename="${tab.id}"]`);
        input?.focus();
        input?.select();
    });
}

function saveTabRename(tabId: string): void {
    const newName = editingTabName.value.trim();

    if (!newName) {
        cancelTabRename();
        return;
    }

    tabs.value = tabs.value.map((tab) => {
        if (tab.id !== tabId) {
            return tab;
        }

        return {
            ...tab,
            name: newName,
        };
    });

    cancelTabRename();
    scheduleWorkspaceSave();
}

function cancelTabRename(): void {
    editingTabId.value = null;
    editingTabName.value = '';
}

function resetConsoleSettings(): void {
    applyConsoleSettings(getDefaultConsoleSettings());
    scheduleSettingsSave(true);
}

function handleConsoleSettingsUpdate(nextSettings: ConsoleSettings): void {
    applyConsoleSettings(nextSettings);
    scheduleSettingsSave();
}

function submitCommand(): void {
    const value = commandInput.value.trim();

    if (!value || !activeTab.value) {
        return;
    }

    const { result, assignedVariable } = executeCommandPrompt(value, activeVariables.value);

    if (assignedVariable && result.ok) {
        tabVariables.value[activeTabId.value] = {
            ...activeVariables.value,
            [assignedVariable]: result.output,
        };
    }

    activeTab.value.entries.push({
        id: crypto.randomUUID(),
        command: value,
        response: result.output,
        status: result.ok ? 'success' : 'error',
        timestamp: new Date().toISOString(),
    });

    if (isOnline.value) {
        triggerSyncPulse();
    }

    commandInput.value = '';
    commandHistoryIndex.value = null;
    commandHistoryDraft.value = '';

    nextTick(() => {
        autoResizeCommandInput();
        scrollHistoryToBottom();
    });

    scheduleWorkspaceSave();
}

function handleCommandInputKeydown(event: KeyboardEvent): void {
    const isPlainArrowNavigation =
        (event.key === 'ArrowUp' || event.key === 'ArrowDown')
        && !event.ctrlKey
        && !event.metaKey
        && !event.shiftKey
        && !event.altKey;

    if (isPlainArrowNavigation) {
        const history = activeTab.value?.entries.map((entry) => entry.command) ?? [];

        if (history.length === 0) {
            return;
        }

        event.preventDefault();

        if (event.key === 'ArrowUp') {
            if (commandHistoryIndex.value === null) {
                commandHistoryDraft.value = commandInput.value;
                commandHistoryIndex.value = history.length - 1;
            } else {
                commandHistoryIndex.value = Math.max(0, commandHistoryIndex.value - 1);
            }

            commandInput.value = history[commandHistoryIndex.value];
            nextTick(() => {
                moveCursorToInputEnd();
            });
            return;
        }

        if (commandHistoryIndex.value === null) {
            return;
        }

        if (commandHistoryIndex.value < history.length - 1) {
            commandHistoryIndex.value += 1;
            commandInput.value = history[commandHistoryIndex.value];
        } else {
            commandHistoryIndex.value = null;
            commandInput.value = commandHistoryDraft.value;
        }

        nextTick(() => {
            moveCursorToInputEnd();
        });
        return;
    }

    if (event.key !== 'Enter') {
        return;
    }

    const textarea = event.target as HTMLTextAreaElement | null;

    if (event.ctrlKey || event.metaKey) {
        event.preventDefault();

        if (!textarea) {
            commandInput.value += '\n';
            return;
        }

        const start = textarea.selectionStart ?? commandInput.value.length;
        const end = textarea.selectionEnd ?? commandInput.value.length;

        commandInput.value = `${commandInput.value.slice(0, start)}\n${commandInput.value.slice(end)}`;

        nextTick(() => {
            textarea.selectionStart = start + 1;
            textarea.selectionEnd = start + 1;
        });

        return;
    }

    event.preventDefault();
    submitCommand();
}

function moveCursorToInputEnd(): void {
    commandInputPanelRef.value?.moveCursorToEnd();
}

function autoResizeCommandInput(): void {
    commandInputPanelRef.value?.autoResize();
}

function scrollHistoryToBottom(): void {
    historyPanelRef.value?.scrollToBottom();
}

function selectSuggestion(value: string): void {
    commandInput.value = value;

    nextTick(() => {
        moveCursorToInputEnd();
    });
}

async function copyText(value: string, key: string): Promise<void> {
    await navigator.clipboard.writeText(value);
    copiedKey.value = key;

    setTimeout(() => {
        if (copiedKey.value === key) {
            copiedKey.value = null;
        }
    }, 1200);
}

async function submitAuth(): Promise<void> {
    authError.value = null;
    authLoading.value = true;

    try {
        if (authMode.value === 'register') {
            const response = await register({
                name: authName.value.trim(),
                email: authEmail.value.trim(),
                password: authPassword.value,
                password_confirmation: authPasswordConfirmation.value,
            });

            authToken.value = response.token;
            authUser.value = response.user;
        } else {
            const response = await login({
                email: authEmail.value.trim(),
                password: authPassword.value,
            });

            authToken.value = response.token;
            authUser.value = response.user;
        }

        authPassword.value = '';
        authPasswordConfirmation.value = '';

        await loadSettingsFromServer(true, true);
        await loadWorkspaceFromServer(true, true);
    } catch (error) {
        authError.value = error instanceof Error ? error.message : 'Authentication failed.';
    } finally {
        authLoading.value = false;
    }
}

async function logoutUser(): Promise<void> {
    if (!authToken.value) {
        return;
    }

    await logout(authToken.value);

    authToken.value = null;
    authUser.value = null;
    hasLoadedSettings.value = false;
    hasLoadedWorkspace.value = false;
    showSettingsPanel.value = false;

    const guestTabs = readLocalWorkspace(getWorkspaceScope(null));
    applyWorkspaceTabs(guestTabs && guestTabs.length > 0 ? guestTabs : createDefaultTabs());
    hydrateLocalSettingsForCurrentScope();
}

async function loadSettingsFromServer(force = false, prioritizeRemote = false): Promise<void> {
    if (!authToken.value || !isOnline.value) {
        return;
    }

    if (hasLoadedSettings.value && !force) {
        return;
    }

    isSyncing.value = true;
    syncError.value = null;

    try {
        const scope = getSettingsScope(authUser.value);
        const remoteSettings = await fetchSettings(authToken.value);
        const nextSettings = prioritizeRemote ? remoteSettings : normalizeConsoleSettings(remoteSettings);

        applyConsoleSettings(nextSettings);
        writeLocalSettings(scope, consoleSettings.value);
        hasLoadedSettings.value = true;
    } catch (error) {
        syncError.value = error instanceof Error ? error.message : 'Failed loading settings.';
    } finally {
        isSyncing.value = false;
    }
}

async function loadWorkspaceFromServer(force = false, prioritizeRemote = false): Promise<void> {
    if (!authToken.value || !isOnline.value) {
        return;
    }

    if (hasLoadedWorkspace.value && !force) {
        return;
    }

    isSyncing.value = true;
    syncError.value = null;

    try {
        const scope = getWorkspaceScope(authUser.value);
        const queuedTabs = readQueuedWorkspace(scope);
        const remoteTabs = await fetchWorkspace(authToken.value);

        if (prioritizeRemote && remoteTabs.length > 0) {
            applyWorkspaceTabs(remoteTabs);
            writeLocalWorkspace(scope, tabs.value);
            clearQueuedWorkspace(scope);
            hasLoadedWorkspace.value = true;
            return;
        }

        if (queuedTabs && queuedTabs.length > 0) {
            applyWorkspaceTabs(queuedTabs);
            await saveWorkspace(authToken.value, queuedTabs);
            clearQueuedWorkspace(scope);
        }

        const nextTabs = remoteTabs.length > 0
            ? remoteTabs
            : (queuedTabs && queuedTabs.length > 0 ? queuedTabs : tabs.value);

        applyWorkspaceTabs(nextTabs);
        writeLocalWorkspace(scope, tabs.value);
        hasLoadedWorkspace.value = true;
    } catch (error) {
        syncError.value = error instanceof Error ? error.message : 'Failed loading workspace.';
    } finally {
        isSyncing.value = false;
    }
}

async function persistWorkspaceNow(scope: string): Promise<void> {
    if (!authToken.value) {
        return;
    }

    isSyncing.value = true;
    syncError.value = null;

    try {
        await saveWorkspace(authToken.value, tabs.value);
        clearQueuedWorkspace(scope);
    } catch (error) {
        syncError.value = error instanceof Error ? error.message : 'Failed saving workspace.';
        queueWorkspace(scope, tabs.value);
    } finally {
        isSyncing.value = false;
    }
}

async function persistSettingsNow(scope: string): Promise<void> {
    if (!authToken.value) {
        return;
    }

    isSyncing.value = true;
    syncError.value = null;

    try {
        const savedSettings = await saveSettings(authToken.value, consoleSettings.value);
        applyConsoleSettings(savedSettings);
        writeLocalSettings(scope, consoleSettings.value);
        hasLoadedSettings.value = true;
        triggerSyncPulse(500);
    } catch (error) {
        syncError.value = error instanceof Error ? error.message : 'Failed saving settings.';
    } finally {
        isSyncing.value = false;
    }
}

function scheduleWorkspaceSave(immediate = false): void {
    const scope = getWorkspaceScope(authUser.value);
    writeLocalWorkspace(scope, tabs.value);

    if (!authToken.value || !authUser.value) {
        return;
    }

    if (!isOnline.value || !hasLoadedWorkspace.value) {
        queueWorkspace(scope, tabs.value);
        return;
    }

    if (saveWorkspaceTimeout.value) {
        clearTimeout(saveWorkspaceTimeout.value);
        saveWorkspaceTimeout.value = null;
    }

    if (immediate) {
        void persistWorkspaceNow(scope);
        return;
    }

    saveWorkspaceTimeout.value = setTimeout(async () => {
        await persistWorkspaceNow(scope);
    }, 500);
}

function scheduleSettingsSave(immediate = false): void {
    const scope = getSettingsScope(authUser.value);
    writeLocalSettings(scope, consoleSettings.value);

    if (!authToken.value || !authUser.value || !isOnline.value) {
        return;
    }

    if (saveSettingsTimeout.value) {
        clearTimeout(saveSettingsTimeout.value);
        saveSettingsTimeout.value = null;
    }

    if (immediate) {
        void persistSettingsNow(scope);
        return;
    }

    saveSettingsTimeout.value = setTimeout(async () => {
        await persistSettingsNow(scope);
    }, 400);
}

watch(activeTabId, () => {
    commandHistoryIndex.value = null;
    commandHistoryDraft.value = '';
});

watch(isOnline, async (online) => {
    if (online && isAuthenticated.value) {
        if (!hasLoadedSettings.value) {
            await loadSettingsFromServer();
        } else {
            scheduleSettingsSave();
        }

        if (!hasLoadedWorkspace.value) {
            await loadWorkspaceFromServer();
            return;
        }

        scheduleWorkspaceSave();
    }
});

onMounted(() => {
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    hydrateLocalWorkspaceForCurrentScope();
    hydrateLocalSettingsForCurrentScope();

    if (authToken.value && !authUser.value) {
        me(authToken.value)
            .then((user) => {
                authUser.value = user;
                hydrateLocalWorkspaceForCurrentScope();
                hydrateLocalSettingsForCurrentScope();
                void loadSettingsFromServer(false, true);
                return loadWorkspaceFromServer(false, true);
            })
            .catch(() => {
                clearStoredAuth();
                authToken.value = null;
                authUser.value = null;
            });
    } else if (isAuthenticated.value) {
        hydrateLocalWorkspaceForCurrentScope();
        hydrateLocalSettingsForCurrentScope();
        void loadSettingsFromServer(false, true);
        void loadWorkspaceFromServer(false, true);
    }
});

onBeforeUnmount(() => {
    window.removeEventListener('online', updateOnlineStatus);
    window.removeEventListener('offline', updateOnlineStatus);

    if (syncPulseTimeout.value) {
        clearTimeout(syncPulseTimeout.value);
        syncPulseTimeout.value = null;
    }

    if (saveWorkspaceTimeout.value) {
        clearTimeout(saveWorkspaceTimeout.value);
        saveWorkspaceTimeout.value = null;
    }

    if (saveSettingsTimeout.value) {
        clearTimeout(saveSettingsTimeout.value);
        saveSettingsTimeout.value = null;
    }
});
</script>

<template>
    <main class="h-screen overflow-hidden" :style="shellStyle">
        <div class="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden">
            <header class="border-b p-4" style="border-color: var(--console-border); background-color: var(--console-panel);">
                <div class="flex items-center justify-between gap-3">
                    <div>
                        <h1 class="text-base font-semibold text-emerald-400 md:text-lg">PWACommands</h1>
                        <p class="text-xs md:text-sm" style="color: var(--console-muted);">Console Workspace</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <div v-if="isAuthenticated" class="text-right text-xs" style="color: var(--console-muted);">
                            <p style="color: var(--console-text);">{{ authUser?.name }}</p>
                            <p>{{ authUser?.email }}</p>
                            <button class="mt-1 text-red-400 hover:text-red-300" @click="logoutUser">Logout</button>
                        </div>
                        <SettingsPanel
                            :is-open="showSettingsPanel"
                            :settings="consoleSettings"
                            :is-authenticated="isAuthenticated"
                            :is-online="isOnline"
                            :is-syncing="isSyncing"
                            @toggle="showSettingsPanel = !showSettingsPanel"
                            @reset="resetConsoleSettings"
                            @update:settings="handleConsoleSettingsUpdate($event)"
                        />
                        <SyncStatusBadge :is-online="isOnline" :is-syncing="isSyncing" />
                    </div>
                </div>
                <div v-if="!isAuthenticated" class="mt-3 flex flex-wrap items-end gap-2">
                    <input
                        v-if="authMode === 'register'"
                        v-model="authName"
                        type="text"
                        placeholder="Name"
                        class="rounded border px-2 py-1 text-xs outline-none focus:border-emerald-500"
                        style="border-color: var(--console-border); background-color: var(--console-surface); color: var(--console-text);"
                    >
                    <input
                        v-model="authEmail"
                        type="email"
                        placeholder="Email"
                        class="rounded border px-2 py-1 text-xs outline-none focus:border-emerald-500"
                        style="border-color: var(--console-border); background-color: var(--console-surface); color: var(--console-text);"
                    >
                    <input
                        v-model="authPassword"
                        type="password"
                        placeholder="Password"
                        class="rounded border px-2 py-1 text-xs outline-none focus:border-emerald-500"
                        style="border-color: var(--console-border); background-color: var(--console-surface); color: var(--console-text);"
                    >
                    <input
                        v-if="authMode === 'register'"
                        v-model="authPasswordConfirmation"
                        type="password"
                        placeholder="Confirm password"
                        class="rounded border px-2 py-1 text-xs outline-none focus:border-emerald-500"
                        style="border-color: var(--console-border); background-color: var(--console-surface); color: var(--console-text);"
                    >
                    <button
                        type="button"
                        class="rounded border border-emerald-600 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20"
                        :disabled="authLoading"
                        @click="submitAuth"
                    >
                        {{ authLoading ? 'Please wait...' : (authMode === 'register' ? 'Register' : 'Login') }}
                    </button>
                    <button
                        type="button"
                        class="rounded border px-3 py-1 text-xs"
                        style="border-color: var(--console-border); background-color: var(--console-surface); color: var(--console-text);"
                        @click="authMode = authMode === 'register' ? 'login' : 'register'"
                    >
                        {{ authMode === 'register' ? 'Use Login' : 'Use Register' }}
                    </button>
                    <p v-if="authError" class="w-full text-xs text-red-400">{{ authError }}</p>
                </div>
                <p v-if="syncError" class="mt-2 text-xs text-red-400">{{ syncError }}</p>
            </header>

            <TabsBar
                :tabs="tabs"
                :active-tab-id="activeTabId"
                :editing-tab-id="editingTabId"
                :editing-tab-name="editingTabName"
                @activate-tab="activeTabId = $event"
                @add-tab="addTab"
                @remove-tab="removeTab"
                @start-rename="startTabRename"
                @save-rename="saveTabRename"
                @cancel-rename="cancelTabRename"
                @update:editing-tab-name="editingTabName = $event"
            />

            <HistoryPanel
                ref="historyPanelRef"
                :entries="activeTab.entries"
                :copied-key="copiedKey"
                @clear-history="clearActiveTabHistory"
                @remove-entry="removeEntry"
                @copy-command="copyText($event.value, $event.key)"
                @copy-response="copyText($event.value, $event.key)"
            />

            <CommandInputPanel
                ref="commandInputPanelRef"
                :command-input="commandInput"
                :tab-suggestions="tabSuggestions"
                :active-variables="activeVariables"
                :copied-key="copiedKey"
                @update:command-input="commandInput = $event"
                @submit="submitCommand"
                @keydown-input="handleCommandInputKeydown"
                @copy-variable="copyText($event.value, $event.key)"
                @select-suggestion="selectSuggestion"
            />
        </div>
    </main>
</template>
