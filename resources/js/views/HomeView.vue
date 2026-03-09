<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import { buildCommandSuggestions, executeCommandPrompt, getAvailableCommands } from '../services/commands';
import type { ConsoleTab } from '../types/console';

const tabs = ref<ConsoleTab[]>([
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
]);

const activeTabId = ref(tabs.value[0].id);
const commandInput = ref('');
const commandInputRef = ref<HTMLTextAreaElement | null>(null);
const commandHistoryIndex = ref<number | null>(null);
const commandHistoryDraft = ref('');
const historyContainerRef = ref<HTMLElement | null>(null);
const editingTabId = ref<string | null>(null);
const editingTabName = ref('');
const copiedKey = ref<string | null>(null);
const commandDefinitions = getAvailableCommands();
const tabVariables = ref<Record<string, Record<string, string>>>({
    [tabs.value[0].id]: {},
});

const activeTab = computed(() => tabs.value.find((tab) => tab.id === activeTabId.value) ?? tabs.value[0]);
const activeVariables = computed(() => tabVariables.value[activeTabId.value] ?? {});

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
}

function clearActiveTabHistory(): void {
    if (!activeTab.value) {
        return;
    }

    activeTab.value.entries = [];
    commandHistoryIndex.value = null;
    commandHistoryDraft.value = '';
}

function removeEntry(entryId: string): void {
    if (!activeTab.value) {
        return;
    }

    activeTab.value.entries = activeTab.value.entries.filter((entry) => entry.id !== entryId);

    commandHistoryIndex.value = null;
    commandHistoryDraft.value = '';
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
}

function cancelTabRename(): void {
    editingTabId.value = null;
    editingTabName.value = '';
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

    commandInput.value = '';
    commandHistoryIndex.value = null;
    commandHistoryDraft.value = '';

    nextTick(() => {
        autoResizeCommandInput();
        scrollHistoryToBottom();
    });
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
    if (!commandInputRef.value) {
        return;
    }

    const position = commandInputRef.value.value.length;
    commandInputRef.value.selectionStart = position;
    commandInputRef.value.selectionEnd = position;
}

function autoResizeCommandInput(): void {
    if (!commandInputRef.value) {
        return;
    }

    commandInputRef.value.style.height = 'auto';
    commandInputRef.value.style.height = `${commandInputRef.value.scrollHeight}px`;
}

function scrollHistoryToBottom(): void {
    if (!historyContainerRef.value) {
        return;
    }

    const target = historyContainerRef.value;

    target.scrollTop = target.scrollHeight;

    const lastRow = target.querySelector('article:last-of-type');
    lastRow?.scrollIntoView({ block: 'end' });

    requestAnimationFrame(() => {
        target.scrollTop = target.scrollHeight;
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

watch(commandInput, () => {
    nextTick(() => {
        autoResizeCommandInput();
    });
});

watch(activeTabId, () => {
    commandHistoryIndex.value = null;
    commandHistoryDraft.value = '';
});
</script>

<template>
    <main class="h-screen overflow-hidden bg-zinc-950 font-mono text-zinc-100">
        <div class="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden">
            <header class="border-b border-zinc-800 p-4">
                <div class="flex items-center justify-between gap-3">
                    <div>
                        <h1 class="text-base font-semibold text-emerald-400 md:text-lg">PWACommands</h1>
                        <p class="text-xs text-zinc-400 md:text-sm">Console Workspace</p>
                    </div>
                    <div class="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300">
                        Synced
                    </div>
                </div>
            </header>

            <section class="border-b border-zinc-800 p-3">
                <div class="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                        v-for="tab in tabs"
                        :key="tab.id"
                        type="button"
                        class="cursor-pointer inline-flex items-center gap-2 rounded border px-3 py-1.5 text-xs md:text-sm"
                        :class="tab.id === activeTabId ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-300'"
                        @click="activeTabId = tab.id"
                    >
                        <template v-if="editingTabId === tab.id">
                            <input
                                v-model="editingTabName"
                                :data-tab-rename="tab.id"
                                type="text"
                                class="w-24 rounded border border-zinc-600 bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-100 outline-none focus:border-emerald-500 md:w-32 md:text-sm"
                                @click.stop
                                @keydown.enter.prevent="saveTabRename(tab.id)"
                                @keydown.esc.prevent="cancelTabRename"
                                @blur="saveTabRename(tab.id)"
                            >
                        </template>
                        <span
                            v-else
                            class="cursor-text"
                            @click.stop="startTabRename(tab)"
                        >
                            {{ tab.name }}
                        </span>
                        <span
                            v-if="tabs.length > 1"
                            class="cursor-pointer text-zinc-500 hover:text-red-400"
                            @click.stop="removeTab(tab.id)"
                        >
                            ×
                        </span>
                    </button>

                    <button
                        type="button"
                        class="cursor-pointer rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 md:text-sm"
                        @click="addTab"
                    >
                        + New Tab
                    </button>
                </div>
            </section>

            <section ref="historyContainerRef" class="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
                <div class="mb-3 flex items-center justify-end">
                    <button
                        type="button"
                        class="cursor-pointer rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:border-red-500 hover:text-red-400 md:text-sm"
                        @click="clearActiveTabHistory"
                    >
                        Clear Tab History
                    </button>
                </div>
                <div class="space-y-4">
                    <article
                        v-for="entry in activeTab.entries"
                        :key="entry.id"
                        class="space-y-1"
                    >
                        <div class="group flex items-start gap-2 rounded border border-transparent px-2 py-1 hover:border-zinc-700">
                            <div class="relative">
                                <span class="cursor-help text-emerald-400">&gt;</span>
                                <span class="pointer-events-none absolute -left-4 -top-6 hidden whitespace-nowrap rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300 group-hover:block">
                                    {{ new Date(entry.timestamp).toLocaleString() }}
                                </span>
                            </div>
                            <pre class="flex-1 pt-0.5 whitespace-pre-wrap wrap-break-word text-xs text-emerald-300 md:text-sm">{{ entry.command }}</pre>
                            <button
                                type="button"
                                class="cursor-pointer pt-0.5  opacity-0 transition-opacity text-xs text-zinc-400 hover:text-zinc-200 group-hover:opacity-100"
                                @click="copyText(entry.command, `${entry.id}:prompt`)"
                            >
                                {{ copiedKey === `${entry.id}:prompt` ? 'Copied' : 'Copy' }}
                            </button>
                            <button
                                type="button"
                                class="cursor-pointer pt-0.5 opacity-0 transition-opacity text-xs text-zinc-400 hover:text-red-400 group-hover:opacity-100"
                                @click="removeEntry(entry.id)"
                            >
                                Remove
                            </button>
                        </div>

                        <div class="group flex items-start gap-2 rounded border border-transparent px-2 py-1 hover:border-zinc-700">
                            <span class=" text-zinc-500">&lt;</span>
                            <pre
                                class="pt-0.5 flex-1 whitespace-pre-wrap wrap-break-word text-xs md:text-sm"
                                :class="{
                                    'text-emerald-400': entry.status === 'success',
                                    'text-red-400': entry.status === 'error',
                                    'text-sky-400': entry.status === 'info',
                                }"
                            >{{ entry.response }}</pre>
                            <button
                                type="button"
                                class="cursor-pointer pt-0.5 opacity-0 transition-opacity text-xs text-zinc-400 hover:text-zinc-200 group-hover:opacity-100"
                                @click="copyText(entry.response, `${entry.id}:response`)"
                            >
                                {{ copiedKey === `${entry.id}:response` ? 'Copied' : 'Copy' }}
                            </button>
                        </div>
                    </article>
                </div>
            </section>

            <section class="border-t border-zinc-800 bg-zinc-950/95 p-3 md:p-4">
                <label class="mb-2 block text-xs text-zinc-400">Command Input</label>
                <textarea
                    ref="commandInputRef"
                    v-model="commandInput"
                    placeholder='Try: list:unique --list="1,2,2,3"'
                    class="w-full overflow-hidden rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
                    @keydown="handleCommandInputKeydown"
                />

                <div class="mt-3 flex items-center justify-between gap-3">
                    <div class="hidden text-xs text-zinc-500 md:block">
                        Tab variables:
                        <span
                            v-if="Object.keys(activeVariables).length === 0"
                            class="text-zinc-600"
                        > none </span>
                        <span
                            v-for="variable in Object.keys(activeVariables)"
                            :key="variable"
                            class="group relative ml-1 inline-flex"
                        >
                            <button
                                type="button"
                                class="cursor-pointer text-emerald-400 hover:text-emerald-300"
                                @click="copyText(activeVariables[variable], `var:${variable}`)"
                            >
                                {{ copiedKey === `var:${variable}` ? 'Copied' : `$${variable}` }}
                            </button>
                            <span class="pointer-events-none absolute bottom-full left-0 z-10 mb-1 hidden max-w-80 whitespace-pre-wrap wrap-break-workd rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-200 group-hover:block">
                                {{ activeVariables[variable] || '(empty)' }}
                            </span>
                        </span>
                    </div>
                    <button
                        type="button"
                        class="rounded border border-emerald-600 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/20"
                        @click="submitCommand"
                    >
                        Run Command
                    </button>
                </div>

                <div class="mt-3 rounded border border-zinc-800 bg-zinc-900/80 p-2">
                    <p class="mb-1 text-xs text-zinc-400">Suggestions</p>
                    <div class="flex flex-wrap gap-2">
                        <button
                            v-for="suggestion in tabSuggestions"
                            :key="suggestion"
                            type="button"
                            class="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500"
                            @click="commandInput = suggestion"
                        >
                            {{ suggestion }}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    </main>
</template>
