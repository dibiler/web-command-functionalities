<script setup lang="ts">
import type { ConsoleSettings } from '../../types/settings';

const props = defineProps<{
    isOpen: boolean;
    settings: ConsoleSettings;
    isAuthenticated: boolean;
    isOnline: boolean;
    isSyncing: boolean;
}>();

const emit = defineEmits<{
    (event: 'toggle'): void;
    (event: 'reset'): void;
    (event: 'update:settings', value: ConsoleSettings): void;
}>();

function patchSettings(patch: Partial<ConsoleSettings>): void {
    emit('update:settings', {
        ...props.settings,
        ...patch,
    });
}
</script>

<template>
    <div class="relative">
        <button
            type="button"
            class="rounded border px-3 py-1 text-xs transition-colors"
            style="border-color: var(--console-border); background-color: var(--console-panel); color: var(--console-text);"
            @click="emit('toggle')"
        >
            {{ props.isOpen ? 'Close Settings' : 'Settings' }}
        </button>

        <div
            v-if="props.isOpen"
            class="absolute right-0 top-full z-20 mt-2 w-80 rounded border p-3 shadow-2xl"
            style="border-color: var(--console-border); background-color: var(--console-panel); color: var(--console-text);"
        >
            <div class="mb-3 flex items-start justify-between gap-3">
                <div>
                    <h2 class="text-sm font-semibold">Console Settings</h2>
                    <p class="text-[11px]" style="color: var(--console-muted);">
                        {{ props.isAuthenticated ? (props.isOnline ? 'Saved locally and synced to your account.' : 'Saved locally. Sync resumes when back online.') : 'Saved locally for guest mode only.' }}
                    </p>
                    <p
                        class="mt-1 text-[11px]"
                        :style="{ color: props.isOnline ? (props.isSyncing ? '#fcd34d' : '#86efac') : 'var(--console-muted)' }"
                    >
                        {{ props.isOnline ? (props.isSyncing ? 'Saving settings...' : 'Settings up to date') : 'Offline: settings saved locally' }}
                    </p>
                </div>
                <button
                    type="button"
                    class="text-xs underline-offset-2 hover:underline"
                    style="color: var(--console-muted);"
                    @click="emit('reset')"
                >
                    Reset
                </button>
            </div>

            <div class="grid gap-3">
                <label class="grid gap-1 text-xs">
                    <span style="color: var(--console-muted);">Background color</span>
                    <input
                        :value="props.settings.themeBackgroundColor"
                        type="color"
                        class="h-10 w-full cursor-pointer rounded border p-1"
                        style="border-color: var(--console-border); background-color: var(--console-surface);"
                        @input="patchSettings({ themeBackgroundColor: ($event.target as HTMLInputElement).value })"
                    >
                </label>

                <label class="grid gap-1 text-xs">
                    <span style="color: var(--console-muted);">Font color</span>
                    <input
                        :value="props.settings.themeFontColor"
                        type="color"
                        class="h-10 w-full cursor-pointer rounded border p-1"
                        style="border-color: var(--console-border); background-color: var(--console-surface);"
                        @input="patchSettings({ themeFontColor: ($event.target as HTMLInputElement).value })"
                    >
                </label>

                <label class="grid gap-1 text-xs">
                    <span style="color: var(--console-muted);">Font family</span>
                    <select
                        :value="props.settings.fontFamily"
                        class="rounded border px-2 py-2"
                        style="border-color: var(--console-border); background-color: var(--console-surface); color: var(--console-text);"
                        @change="patchSettings({ fontFamily: ($event.target as HTMLSelectElement).value })"
                    >
                        <option value="Fira Code, Consolas, monospace">Fira Code</option>
                        <option value="Consolas, Monaco, monospace">Consolas</option>
                        <option value="JetBrains Mono, Consolas, monospace">JetBrains Mono</option>
                        <option value="Courier New, monospace">Courier New</option>
                    </select>
                </label>

                <label class="grid gap-1 text-xs">
                    <span style="color: var(--console-muted);">Font size: {{ props.settings.fontSize }}px</span>
                    <input
                        :value="props.settings.fontSize"
                        type="range"
                        min="12"
                        max="24"
                        step="1"
                        class="w-full"
                        @input="patchSettings({ fontSize: Number(($event.target as HTMLInputElement).value) })"
                    >
                </label>

                <label class="grid gap-1 text-xs">
                    <span style="color: var(--console-muted);">Line height: {{ props.settings.lineHeight.toFixed(2) }}</span>
                    <input
                        :value="props.settings.lineHeight"
                        type="range"
                        min="1"
                        max="2"
                        step="0.05"
                        class="w-full"
                        @input="patchSettings({ lineHeight: Number(($event.target as HTMLInputElement).value) })"
                    >
                </label>
            </div>
        </div>
    </div>
</template>
