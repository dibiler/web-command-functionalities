<script setup lang="ts">
import { ref } from 'vue';

import type { ConsoleEntry } from '../../types/console';

const props = defineProps<{
    entries: ConsoleEntry[];
    copiedKey: string | null;
}>();

const emit = defineEmits<{
    (event: 'clear-history'): void;
    (event: 'remove-entry', entryId: string): void;
    (event: 'copy-command', payload: { value: string; key: string }): void;
    (event: 'copy-response', payload: { value: string; key: string }): void;
}>();

const historyContainerRef = ref<HTMLElement | null>(null);

function scrollToBottom(): void {
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

defineExpose({
    scrollToBottom,
});
</script>

<template>
    <section ref="historyContainerRef" class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 md:p-4">
        <div class="mb-3 flex items-center justify-end">
            <button
                type="button"
                class="cursor-pointer rounded border px-3 py-1.5 text-xs hover:border-red-500 hover:text-red-400 md:text-sm"
                style="border-color: var(--console-border); background-color: var(--console-surface); color: var(--console-text);"
                @click="emit('clear-history')"
            >
                Clear Tab History
            </button>
        </div>
        <div class="space-y-4">
            <article
                v-for="entry in props.entries"
                :key="entry.id"
                class="space-y-1"
            >
                <div class="group flex items-start gap-2 rounded border border-transparent px-2 py-1 hover:border-zinc-700">
                    <div class="relative">
                        <span class="cursor-help text-emerald-400">&gt;</span>
                        <span class="pointer-events-none absolute -left-4 -top-6 hidden whitespace-nowrap rounded border px-2 py-1 text-[10px] group-hover:block" style="border-color: var(--console-border); background-color: var(--console-surface); color: var(--console-text);">
                            {{ new Date(entry.timestamp).toLocaleString() }}
                        </span>
                    </div>
                    <pre class="flex-1 pt-0.5 whitespace-pre-wrap break-all text-xs text-emerald-300 md:text-sm">{{ entry.command }}</pre>
                    <button
                        type="button"
                        class="cursor-pointer pt-0.5 opacity-0 transition-opacity text-xs text-zinc-400 hover:text-zinc-200 group-hover:opacity-100"
                        @click="emit('copy-command', { value: entry.command, key: `${entry.id}:prompt` })"
                    >
                        {{ props.copiedKey === `${entry.id}:prompt` ? 'Copied' : 'Copy' }}
                    </button>
                    <button
                        type="button"
                        class="cursor-pointer pt-0.5 opacity-0 transition-opacity text-xs text-zinc-400 hover:text-red-400 group-hover:opacity-100"
                        @click="emit('remove-entry', entry.id)"
                    >
                        Remove
                    </button>
                </div>

                <div class="group flex items-start gap-2 rounded border border-transparent px-2 py-1 hover:border-zinc-700">
                    <span class="text-zinc-500">&lt;</span>
                    <pre
                        class="pt-0.5 flex-1 whitespace-pre-wrap break-all text-xs md:text-sm"
                        :class="{
                            'text-emerald-400': entry.status === 'success',
                            'text-red-400': entry.status === 'error',
                            'text-sky-400': entry.status === 'info',
                        }"
                    >{{ entry.response }}</pre>
                    <button
                        type="button"
                        class="cursor-pointer pt-0.5 opacity-0 transition-opacity text-xs text-zinc-400 hover:text-zinc-200 group-hover:opacity-100"
                        @click="emit('copy-response', { value: entry.response, key: `${entry.id}:response` })"
                    >
                        {{ props.copiedKey === `${entry.id}:response` ? 'Copied' : 'Copy' }}
                    </button>
                </div>
            </article>
        </div>
    </section>
</template>
