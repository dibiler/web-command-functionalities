<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    isOnline: boolean;
    isSyncing: boolean;
}>();

const statusLabel = computed(() => {
    if (!props.isOnline) {
        return 'Offline';
    }

    if (props.isSyncing) {
        return 'Syncing';
    }

    return 'Online';
});

const statusClass = computed(() => {
    if (!props.isOnline) {
        return 'border-red-700 bg-red-500/10 text-red-300';
    }

    if (props.isSyncing) {
        return 'border-amber-700 bg-amber-500/10 text-amber-300';
    }

    return 'border-emerald-700 bg-emerald-500/10 text-emerald-300';
});
</script>

<template>
    <div
        class="rounded border px-2 py-1 text-xs"
        :class="statusClass"
    >
        {{ statusLabel }}
    </div>
</template>
