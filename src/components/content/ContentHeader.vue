<template>
  <header class="content-header">
    <div class="content-leading">
      <slot name="leading" />
    </div>
    <h1 class="content-title" :title="title">{{ title }}</h1>
    <div class="content-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<style scoped>
@reference "tailwindcss";

.content-header {
  @apply relative z-10 w-full min-w-0 min-h-12 sm:min-h-14 flex items-center gap-2 sm:gap-3 px-2 sm:px-3 pt-3 sm:pt-4 pb-2 bg-white;
}

.content-title {
  @apply m-0 min-w-0 max-w-[min(72ch,100%)] flex-1 truncate text-sm font-medium leading-6 text-slate-900 max-sm:text-xs;
}

.content-actions {
  @apply flex shrink-0 items-center justify-end gap-1;
}

.content-leading {
  @apply flex shrink-0 items-center gap-1;
}
</style>
