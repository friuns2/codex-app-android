<template>
  <div class="runtime-toggle" role="radiogroup" :aria-label="$t('composer.continueIn')">
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
import { computed } from 'vue'
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

import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const options = computed(() => [
  { value: 'local' as const, label: t('composer.runtimeLocal'), icon: IconTablerFolder },
  { value: 'worktree' as const, label: t('composer.runtimeWorktree'), icon: IconTablerGitFork },
])

function onSelect(value: RuntimeMode): void {
  emit('update:modelValue', value)
}
</script>

<style scoped>
@reference "tailwindcss";

.runtime-toggle {
  @apply inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 p-1;
}

.runtime-toggle-option {
  @apply inline-flex h-8 items-center gap-1.5 rounded-full border border-transparent bg-transparent px-3 text-sm text-zinc-600 transition;
}

.runtime-toggle-option:hover {
  @apply bg-zinc-200/70 text-zinc-900;
}

.runtime-toggle-option.is-selected {
  @apply border-zinc-200 bg-white text-zinc-900 shadow-sm;
}

.runtime-toggle-option:focus-visible {
  @apply outline-none ring-2 ring-zinc-300 ring-offset-1 ring-offset-white;
}

.runtime-toggle-option-icon {
  @apply h-3.5 w-3.5 shrink-0 text-zinc-500;
}

.runtime-toggle-option.is-selected .runtime-toggle-option-icon {
  @apply text-zinc-700;
}

.runtime-toggle-option-label {
  @apply whitespace-nowrap;
}
</style>
