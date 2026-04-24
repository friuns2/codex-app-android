<template>
  <section class="command-center" aria-label="Visual Command Center">
    <div class="command-center-header">
      <div>
        <p class="command-center-eyebrow">Visual Command Center</p>
        <h2 class="command-center-title">System state at a glance</h2>
      </div>
      <p class="command-center-meta">{{ systemStatus }}</p>
    </div>

    <div class="command-center-grid">
      <article class="command-card">
        <div class="command-card-header">
          <p class="command-card-label">System Status</p>
          <span class="command-card-status">{{ systemStatus }}</span>
        </div>
        <p class="command-card-value">{{ systemSummary }}</p>
        <ul class="command-card-list">
          <li>Provider: {{ providerLabel }}</li>
          <li>Skills loaded: {{ installedSkillsCount }}</li>
        </ul>
      </article>

      <article class="command-card">
        <div class="command-card-header">
          <p class="command-card-label">Active Task</p>
          <span class="command-card-status">{{ activeTaskStatus }}</span>
        </div>
        <p class="command-card-value">{{ activeTaskTitle }}</p>
        <ul class="command-card-list">
          <li>{{ activeTaskLocation }}</li>
          <li>Pending requests: {{ pendingRequests }}</li>
          <li>Queued follow-ups: {{ queuedMessages }}</li>
        </ul>
      </article>

      <article class="command-card">
        <div class="command-card-header">
          <p class="command-card-label">Review Status</p>
          <span class="command-card-status">{{ reviewStatus }}</span>
        </div>
        <p class="command-card-value">{{ reviewBranch }}</p>
        <ul class="command-card-list">
          <li>Review pane: {{ isReviewOpen ? 'Open' : 'Closed' }}</li>
        </ul>
      </article>

      <article class="command-card command-card-control">
        <div class="command-card-header">
          <p class="command-card-label">Alfred Control</p>
          <span class="command-card-status">{{ alfredStatus }}</span>
        </div>
        <p class="command-card-value">{{ alfredSummary }}</p>
        <ul class="command-card-list">
          <li>Send mode: {{ sendMode }}</li>
          <li>Enter sends: {{ sendWithEnter ? 'On' : 'Cmd+Enter required' }}</li>
          <li>Dictation: {{ dictationMode }}</li>
        </ul>
        <div class="command-card-actions">
          <button class="command-card-action command-card-action-primary" type="button" @click="$emit('new-thread')">
            New thread
          </button>
          <button class="command-card-action" type="button" :disabled="!canContinueTask" @click="$emit('continue-task')">
            Continue task
          </button>
          <button class="command-card-action" type="button" @click="$emit('open-skills')">
            Skills hub
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  systemStatus: string
  systemSummary: string
  providerLabel: string
  installedSkillsCount: number
  activeTaskStatus: string
  activeTaskTitle: string
  activeTaskLocation: string
  pendingRequests: number
  queuedMessages: number
  reviewStatus: string
  reviewBranch: string
  isReviewOpen: boolean
  alfredStatus: string
  alfredSummary: string
  sendMode: string
  sendWithEnter: boolean
  dictationMode: string
  canContinueTask: boolean
}>()

defineEmits<{
  'new-thread': []
  'continue-task': []
  'open-skills': []
}>()
</script>

<style scoped>
@reference "tailwindcss";

.command-center {
  @apply w-full max-w-6xl rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 px-3 py-3 sm:px-4 sm:py-4;
}

.command-center-header {
  @apply flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between;
}

.command-center-eyebrow {
  @apply m-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500;
}

.command-center-title {
  @apply mt-1 text-base font-medium tracking-tight text-zinc-950 sm:text-lg;
}

.command-center-meta {
  @apply m-0 inline-flex items-center self-start rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-600;
}

.command-center-grid {
  @apply mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4;
}

.command-card {
  @apply flex min-h-32 flex-col gap-2 rounded-[1.25rem] border border-zinc-200 bg-white p-3 shadow-sm;
}

.command-card-control {
  @apply sm:col-span-2 xl:col-span-1;
}

.command-card-header {
  @apply flex items-center justify-between gap-2;
}

.command-card-label {
  @apply m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500;
}

.command-card-status {
  @apply inline-flex items-center rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700;
}

.command-card-value {
  @apply m-0 text-sm font-medium leading-5 text-zinc-950;
}

.command-card-list {
  @apply m-0 flex list-none flex-col gap-1.5 p-0 text-sm leading-5 text-zinc-600;
}

.command-card-actions {
  @apply mt-auto flex flex-wrap gap-2 pt-1;
}

.command-card-action {
  @apply inline-flex h-8.5 items-center justify-center rounded-full border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-default disabled:opacity-60;
}

.command-card-action-primary {
  @apply border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800;
}
</style>
