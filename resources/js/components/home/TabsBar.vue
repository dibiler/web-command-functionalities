<script setup lang="ts">
import type { ConsoleTab } from '../../types/console';

const props = defineProps<{
    tabs: ConsoleTab[];
    activeTabId: string;
    editingTabId: string | null;
    editingTabName: string;
}>();

const emit = defineEmits<{
    (event: 'activate-tab', tabId: string): void;
    (event: 'add-tab'): void;
    (event: 'remove-tab', tabId: string): void;
    (event: 'start-rename', tab: ConsoleTab): void;
    (event: 'save-rename', tabId: string): void;
    (event: 'cancel-rename'): void;
    (event: 'update:editingTabName', value: string): void;
}>();
</script>

<template>
    <section class="border-b p-3" style="border-color: var(--console-border); background-color: var(--console-panel);">
        <div class="flex items-center gap-2 overflow-x-auto pb-1">
            <button
                v-for="tab in props.tabs"
                :key="tab.id"
                type="button"
                class="cursor-pointer inline-flex items-center gap-2 rounded border px-3 py-1.5 text-xs md:text-sm"
                :class="tab.id === props.activeTabId ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : ''"
                :style="tab.id === props.activeTabId ? undefined : { borderColor: 'var(--console-border)', backgroundColor: 'var(--console-surface)', color: 'var(--console-text)' }"
                @click="emit('activate-tab', tab.id)"
            >
                <template v-if="props.editingTabId === tab.id">
                    <input
                        :model-value="props.editingTabName"
                        :data-tab-rename="tab.id"
                        type="text"
                        class="w-24 rounded border px-1.5 py-0.5 text-xs outline-none focus:border-emerald-500 md:w-32 md:text-sm"
                        style="border-color: var(--console-border); background-color: var(--console-surface); color: var(--console-text);"
                        @click.stop
                        @update:model-value="emit('update:editingTabName', String($event))"
                        @input="emit('update:editingTabName', ($event.target as HTMLInputElement).value)"
                        @keydown.enter.prevent="emit('save-rename', tab.id)"
                        @keydown.esc.prevent="emit('cancel-rename')"
                        @blur="emit('save-rename', tab.id)"
                    >
                </template>
                <span
                    v-else
                    class="cursor-text"
                    @click.stop="emit('start-rename', tab)"
                >
                    {{ tab.name }}
                </span>
                <span
                    v-if="props.tabs.length > 1"
                    class="cursor-pointer text-zinc-500 hover:text-red-400"
                    @click.stop="emit('remove-tab', tab.id)"
                >
                    ×
                </span>
            </button>

            <button
                type="button"
                class="cursor-pointer rounded border px-3 py-1.5 text-xs md:text-sm"
                style="border-color: var(--console-border); background-color: var(--console-surface); color: var(--console-text);"
                @click="emit('add-tab')"
            >
                + New Tab
            </button>
        </div>
    </section>
</template>
