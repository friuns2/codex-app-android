<template>
  <div class="runtime-toggle" role="radiogroup" :aria-label="t('Continue in')">
    <button
      v-for="option in options"
      :key="option.value"
      class="runtime-toggle-option"
      :class="{ 'is-selected': modelValue === option.value }"
      type="button"
      role="radio"
      :aria-checked="modelValue === option.value"
      @click="onSelect(option.value)"
    >
      <component :is="option.icon" class="runtime-toggle-option-icon" />
      <span class="runtime-toggle-option-label">{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useUiLanguage } from '../../composables/useUiLanguage'
import IconTablerFolder from '../icons/IconTablerFolder.vue'
import IconTablerGitFork from '../icons/IconTablerGitFork.vue'

type RuntimeMode = 'local' | 'worktree'

defineProps<{
  modelValue: RuntimeMode
}>()

const emit = defineEmits<{
  'update:modelValue': [value: RuntimeMode]
}>()
const { t } = useUiLanguage()

const options = [
  { value: 'local' as const, label: t('Local project'), icon: IconTablerFolder },
  { value: 'worktree' as const, label: t('New worktree'), icon: IconTablerGitFork },
]

function onSelect(value: RuntimeMode): void {
  emit('update:modelValue', value)
}
</script>

<style scoped>
@reference "tailwindcss";

.runtime-toggle {
  @apply inline-flex items-center gap-1 rounded-full border p-1;
  border-color: var(--theme-border);
  background: color-mix(in srgb, var(--theme-control-bg) 84%, var(--theme-main-bg));
}

.runtime-toggle-option {
  @apply inline-flex h-8 items-center gap-1.5 rounded-full border border-transparent bg-transparent px-3 text-sm transition;
  color: var(--theme-text-secondary);
}

.runtime-toggle-option:hover {
  background: var(--theme-control-hover-bg);
  color: var(--theme-text-primary);
}

.runtime-toggle-option.is-selected {
  border-color: var(--theme-selection-border);
  background: var(--theme-selection-bg);
  color: var(--theme-selection-text);
  box-shadow: var(--theme-shadow-sm);
}

.runtime-toggle-option:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-selection-border) 82%, transparent);
}

.runtime-toggle-option-icon {
  @apply h-3.5 w-3.5 shrink-0;
  color: var(--theme-text-muted);
}

.runtime-toggle-option.is-selected .runtime-toggle-option-icon {
  color: inherit;
}

.runtime-toggle-option-label {
  @apply whitespace-nowrap;
}
</style>
