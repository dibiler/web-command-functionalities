<script setup lang="ts">
import { computed, ref } from 'vue';

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
                response: 'Available commands in list group: list:random, list:unique, list:filter, list:sortAsc',
                status: 'info',
                timestamp: new Date().toISOString(),
            },
        ],
    },
]);

const activeTabId = ref(tabs.value[0].id);
const commandInput = ref('');
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
}
</script>

<template>
    <main class="min-h-screen bg-zinc-950 font-mono text-zinc-100">
        <div class="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
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
                        class="inline-flex items-center gap-2 rounded border px-3 py-1.5 text-xs md:text-sm"
                        :class="tab.id === activeTabId ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-300'"
                        @click="activeTabId = tab.id"
                    >
                        <span>{{ tab.name }}</span>
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
                        class="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 md:text-sm"
                        @click="addTab"
                    >
                        + New Tab
                    </button>
                </div>
            </section>

            <section class="flex-1 overflow-y-auto p-3 md:p-4">
                <div class="space-y-4">
                    <article
                        v-for="entry in activeTab.entries"
                        :key="entry.id"
                        class="rounded border border-zinc-800 bg-zinc-900/70 p-3"
                    >
                        <div class="mb-2 flex items-center justify-between">
                            <span class="text-xs text-zinc-400">{{ new Date(entry.timestamp).toLocaleString() }}</span>
                            <span
                                class="text-xs"
                                :class="{
                                    'text-emerald-400': entry.status === 'success',
                                    'text-red-400': entry.status === 'error',
                                    'text-sky-400': entry.status === 'info',
                                }"
                            >
                                {{ entry.status }}
                            </span>
                        </div>

                        <label class="mb-1 block text-xs text-zinc-400">Prompt</label>
                        <textarea
                            :value="entry.command"
                            readonly
                            rows="2"
                            class="w-full resize-y rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-emerald-300 md:text-sm"
                        />

                        <label class="mb-1 mt-3 block text-xs text-zinc-400">Response</label>
                        <textarea
                            :value="entry.response"
                            readonly
                            rows="3"
                            class="w-full resize-y rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 md:text-sm"
                        />
                    </article>
                </div>
            </section>

            <section class="border-t border-zinc-800 bg-zinc-950/95 p-3 md:p-4">
                <label class="mb-2 block text-xs text-zinc-400">Command Input</label>
                <textarea
                    v-model="commandInput"
                    rows="3"
                    placeholder='Try: list:unique --list="1,2,2,3"'
                    class="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
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
                            class="ml-1 text-emerald-400"
                        >
                            ${{ variable }}
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
