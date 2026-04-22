<template>
  <div class="fmp-wrapper" :class="{ 'is-open': visible }" @transitionend="onTransitionEnd">
    <section v-if="showContent" class="fmp-root" @click.stop>
      <header class="fmp-header">
        <h3 class="fmp-title">{{ $t('fileManager.title') }}</h3>
        <button type="button" class="fmp-close" :aria-label="$t('common.close')" @click="$emit('close')">
          <IconTablerX class="fmp-close-icon" />
        </button>
      </header>
      <div class="fmp-body">
        <FileManager :cwd="cwd" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * Side panel wrapper for the FileManager component.
 * Animates width open/close; content mounts after transition starts.
 */
import { ref, watch } from 'vue'
import FileManager from './FileManager.vue'
import IconTablerX from '../icons/IconTablerX.vue'

const props = defineProps<{
  visible: boolean
  cwd: string
}>()

defineEmits<{
  close: []
}>()

const showContent = ref(false)

watch(() => props.visible, (v) => {
  if (v) showContent.value = true
})

function onTransitionEnd(): void {
  if (!props.visible) showContent.value = false
}
</script>

<style scoped>
@reference "tailwindcss";

.fmp-wrapper {
  @apply h-full shrink-0 overflow-hidden;
  max-width: 0;
  transition: max-width 200ms ease-out;
}

.fmp-wrapper.is-open {
  max-width: 320px;
}

.fmp-root {
  @apply flex h-full min-h-0 w-80 flex-col overflow-hidden rounded-l-2xl rounded-r-none border border-zinc-200 border-r-0 bg-white;
}

.fmp-header {
  @apply flex items-center justify-between gap-3 border-b border-zinc-200 px-3 py-2.5 shrink-0;
}

.fmp-title {
  @apply m-0 text-sm font-medium text-zinc-900;
}

.fmp-close {
  @apply h-7.5 w-7.5 rounded-full border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 transition hover:bg-zinc-50;
}

.fmp-close-icon {
  @apply w-3.5 h-3.5;
}

.fmp-body {
  @apply flex-1 min-h-0 overflow-hidden;
}
</style>
