<template>
  <div ref="menuRootRef" class="thread-type-menu-wrap">
    <button class="thread-type-menu-trigger" type="button" title="thread_display_settings" @click="toggleOpen">
      <IconTablerSettings class="thread-type-menu-icon" />
    </button>

    <div v-if="isOpen" class="thread-type-menu-panel" @click.stop>
      <div class="thread-type-menu-actions">
        <button class="thread-type-menu-action-button" type="button" @click="emit('show-all')">Show all</button>
        <button class="thread-type-menu-action-button" type="button" @click="emit('hide-all')">Hide all</button>
      </div>

      <p v-if="types.length === 0" class="thread-type-menu-empty">No types yet</p>

      <label v-for="type in types" :key="type" class="thread-type-menu-option">
        <input
          class="thread-type-menu-checkbox"
          type="checkbox"
          :checked="hiddenByType[type] !== true"
          @change="onCheckboxChange(type)"
        />
        <span class="thread-type-menu-label">{{ type }}</span>
        <span class="thread-type-menu-count">{{ countByType[type] ?? 0 }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import IconTablerSettings from '../icons/IconTablerSettings.vue'

defineProps<{
  types: string[]
  hiddenByType: Record<string, boolean>
  countByType: Record<string, number>
}>()

const emit = defineEmits<{
  toggle: [type: string]
  'show-all': []
  'hide-all': []
}>()

const isOpen = ref(false)
const menuRootRef = ref<HTMLElement | null>(null)

function closeMenu(): void {
  isOpen.value = false
}

function toggleOpen(): void {
  isOpen.value = !isOpen.value
}

function onCheckboxChange(type: string): void {
  emit('toggle', type)
}

function onGlobalPointerDown(event: Event): void {
  if (!isOpen.value) return
  const root = menuRootRef.value
  if (!root) return
  if (event.target instanceof Node && root.contains(event.target)) return
  closeMenu()
}

function onWindowBlur(): void {
  closeMenu()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', onGlobalPointerDown)
  window.addEventListener('blur', onWindowBlur)
}

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('pointerdown', onGlobalPointerDown)
  window.removeEventListener('blur', onWindowBlur)
})
</script>

<style scoped>
@reference "tailwindcss";

.thread-type-menu-wrap {
  @apply relative;
}

.thread-type-menu-trigger {
  @apply h-7 w-7 rounded-md border p-0 flex items-center justify-center;
  border-color: var(--theme-border);
  background: var(--theme-control-bg);
  color: var(--theme-text-secondary);
}

.thread-type-menu-trigger:hover {
  background: var(--theme-control-hover-bg);
  color: var(--theme-text-primary);
}

.thread-type-menu-icon {
  @apply w-4 h-4;
}

.thread-type-menu-panel {
  @apply absolute right-0 top-full mt-1 z-20 min-w-64 max-h-96 overflow-auto rounded-md border p-1;
  border-color: var(--theme-border);
  background: var(--theme-panel-bg);
  box-shadow: var(--theme-shadow-md);
}

.thread-type-menu-actions {
  @apply sticky top-0 z-10 flex items-center gap-1 border-b px-1 py-1;
  border-color: var(--theme-border-soft);
  background: var(--theme-panel-bg);
}

.thread-type-menu-action-button {
  @apply rounded px-2 py-1 text-xs;
  color: var(--theme-text-secondary);
}

.thread-type-menu-action-button:hover {
  background: var(--theme-control-hover-bg);
  color: var(--theme-text-primary);
}

.thread-type-menu-empty {
  @apply m-0 px-2 py-2 text-xs;
  color: var(--theme-text-muted);
}

.thread-type-menu-option {
  @apply grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded px-2 py-1;
}

.thread-type-menu-option:hover {
  background: var(--theme-control-hover-bg);
}

.thread-type-menu-checkbox {
  @apply m-0;
}

.thread-type-menu-label {
  @apply text-xs font-mono;
  color: var(--theme-text-secondary);
}

.thread-type-menu-count {
  @apply text-xs;
  color: var(--theme-text-muted);
}
</style>
