<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

const props = defineProps<{
    commandInput: string;
    tabSuggestions: string[];
    activeVariables: Record<string, string>;
    copiedKey: string | null;
}>();

const emit = defineEmits<{
    (event: 'update:commandInput', value: string): void;
    (event: 'submit'): void;
    (event: 'keydown-input', payload: KeyboardEvent): void;
    (event: 'copy-variable', payload: { value: string; key: string }): void;
    (event: 'select-suggestion', value: string): void;
}>();

const commandInputRef = ref<HTMLTextAreaElement | null>(null);

function autoResize(): void {
    if (!commandInputRef.value) {
        return;
    }

    const textarea = commandInputRef.value;
    textarea.style.height = 'auto';

    const computedStyle = window.getComputedStyle(textarea);
    const parsedLineHeight = Number.parseFloat(computedStyle.lineHeight);
    const lineHeight = Number.isFinite(parsedLineHeight) ? parsedLineHeight : 20;
    const maxHeight = lineHeight * 5;

    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

function moveCursorToEnd(): void {
    if (!commandInputRef.value) {
        return;
    }

    commandInputRef.value.focus();

    const position = commandInputRef.value.value.length;
    commandInputRef.value.selectionStart = position;
    commandInputRef.value.selectionEnd = position;
}

watch(() => props.commandInput, () => {
    nextTick(() => {
        autoResize();
    });
}, { immediate: true });

defineExpose({
    autoResize,
    moveCursorToEnd,
});
</script>

<template>
    <section class="border-t p-3 md:p-4" style="border-color: var(--console-border); background-color: var(--console-panel);">
        <label class="mb-2 block text-xs" style="color: var(--console-muted);">Command Input</label>
        <textarea
            ref="commandInputRef"
            :value="props.commandInput"
            placeholder='Try: list:unique --list="1,2,2,3"'
            class="w-full resize-none overflow-hidden rounded border px-3 py-2 text-sm outline-none focus:border-emerald-500"
            style="border-color: var(--console-border); background-color: var(--console-surface); color: var(--console-text);"
            @input="emit('update:commandInput', ($event.target as HTMLTextAreaElement).value)"
            @keydown="emit('keydown-input', $event)"
        />

        <div class="mt-3 flex items-center justify-between gap-3">
            <div class="hidden text-xs md:block" style="color: var(--console-muted);">
                Tab variables:
                <span
                    v-if="Object.keys(props.activeVariables).length === 0"
                    class="opacity-70"
                > none </span>
                <span
                    v-for="variable in Object.keys(props.activeVariables)"
                    :key="variable"
                    class="group relative ml-1 inline-flex"
                >
                    <button
                        type="button"
                        class="cursor-pointer text-emerald-400 hover:text-emerald-300"
                        @click="emit('copy-variable', { value: props.activeVariables[variable], key: `var:${variable}` })"
                    >
                        {{ props.copiedKey === `var:${variable}` ? 'Copied' : `$${variable}` }}
                    </button>
                    <span class="pointer-events-none absolute bottom-full left-0 z-10 mb-1 hidden max-w-80 whitespace-pre-wrap wrap-break-workd rounded border px-2 py-1 text-[10px] group-hover:block" style="border-color: var(--console-border); background-color: var(--console-surface); color: var(--console-text);">
                        {{ props.activeVariables[variable] || '(empty)' }}
                    </span>
                </span>
            </div>
            <button
                type="button"
                class="rounded border border-emerald-600 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/20"
                @click="emit('submit')"
            >
                Run Command
            </button>
        </div>

        <div class="mt-3 rounded border p-2" style="border-color: var(--console-border); background-color: var(--console-surface);">
            <p class="mb-1 text-xs" style="color: var(--console-muted);">Suggestions</p>
            <div class="flex flex-wrap gap-2">
                <button
                    v-for="suggestion in props.tabSuggestions"
                    :key="suggestion"
                    type="button"
                    class="rounded border px-2 py-1 text-xs"
                    style="border-color: var(--console-border); background-color: var(--console-panel); color: var(--console-text);"
                    @click="emit('select-suggestion', suggestion)"
                >
                    {{ suggestion }}
                </button>
            </div>
        </div>
    </section>
</template>
