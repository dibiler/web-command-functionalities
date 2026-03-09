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

    commandInputRef.value.style.height = 'auto';
    commandInputRef.value.style.height = `${commandInputRef.value.scrollHeight}px`;
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
    <section class="border-t border-zinc-800 bg-zinc-950/95 p-3 md:p-4">
        <label class="mb-2 block text-xs text-zinc-400">Command Input</label>
        <textarea
            ref="commandInputRef"
            :value="props.commandInput"
            placeholder='Try: list:unique --list="1,2,2,3"'
            class="w-full overflow-hidden rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            @input="emit('update:commandInput', ($event.target as HTMLTextAreaElement).value)"
            @keydown="emit('keydown-input', $event)"
        />

        <div class="mt-3 flex items-center justify-between gap-3">
            <div class="hidden text-xs text-zinc-500 md:block">
                Tab variables:
                <span
                    v-if="Object.keys(props.activeVariables).length === 0"
                    class="text-zinc-600"
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
                    <span class="pointer-events-none absolute bottom-full left-0 z-10 mb-1 hidden max-w-80 whitespace-pre-wrap wrap-break-workd rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-200 group-hover:block">
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

        <div class="mt-3 rounded border border-zinc-800 bg-zinc-900/80 p-2">
            <p class="mb-1 text-xs text-zinc-400">Suggestions</p>
            <div class="flex flex-wrap gap-2">
                <button
                    v-for="suggestion in props.tabSuggestions"
                    :key="suggestion"
                    type="button"
                    class="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500"
                    @click="emit('select-suggestion', suggestion)"
                >
                    {{ suggestion }}
                </button>
            </div>
        </div>
    </section>
</template>
