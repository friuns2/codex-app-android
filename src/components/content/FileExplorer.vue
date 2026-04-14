<template>
  <section class="file-explorer-root">
    <header class="file-explorer-toolbar">
      <div class="file-explorer-breadcrumbs">
        <button
          v-for="crumb in breadcrumbs"
          :key="crumb.path"
          type="button"
          class="file-explorer-crumb"
          @click="openPath(crumb.path)"
        >
          {{ crumb.label }}
        </button>
      </div>
      <div class="file-explorer-toolbar-actions">
        <a
          v-if="selectedFileRawHref !== '#'"
          class="file-explorer-toolbar-link"
          :href="selectedFileRawHref"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open raw
        </a>
        <button type="button" class="file-explorer-toolbar-button" :disabled="isLoading" @click="reload">
          {{ isLoading ? 'Refreshing…' : 'Refresh' }}
        </button>
      </div>
    </header>

    <div v-if="locationError" class="file-explorer-error-card">
      <p class="file-explorer-error-title">Unable to open this path</p>
      <p class="file-explorer-error-text">{{ locationError }}</p>
      <div class="file-explorer-error-actions">
        <button
          v-if="fallbackParentPath"
          type="button"
          class="file-explorer-toolbar-button"
          @click="openPath(fallbackParentPath)"
        >
          Open parent
        </button>
        <button type="button" class="file-explorer-toolbar-button" @click="router.push({ name: 'home' })">
          Go home
        </button>
      </div>
    </div>

    <div v-else class="file-explorer-layout">
      <aside class="file-explorer-sidebar">
        <div class="file-explorer-sidebar-header">
          <div>
            <p class="file-explorer-eyebrow">Directory</p>
            <p class="file-explorer-sidebar-title">
              {{ currentDirectoryLabel }}
            </p>
          </div>
          <span class="file-explorer-sidebar-count">{{ entries.length }} items</span>
        </div>

        <p v-if="listingError" class="file-explorer-sidebar-error">{{ listingError }}</p>
        <p v-else-if="isLoading" class="file-explorer-sidebar-empty">Loading files…</p>
        <p v-else-if="entries.length === 0" class="file-explorer-sidebar-empty">This directory is empty.</p>

        <ul v-else class="file-explorer-entry-list">
          <li v-for="entry in entries" :key="entry.path" class="file-explorer-entry-item">
            <button
              type="button"
              class="file-explorer-entry-button"
              :data-active="entry.path === selectedPath"
              @click="openPath(entry.path)"
            >
              <span class="file-explorer-entry-icon">{{ entry.isDirectory ? 'DIR' : 'FILE' }}</span>
              <span class="file-explorer-entry-name">{{ entry.name }}</span>
            </button>
          </li>
        </ul>
      </aside>

      <section class="file-explorer-preview">
        <template v-if="preview.kind === 'directory'">
          <div class="file-explorer-preview-card">
            <p class="file-explorer-eyebrow">Folder</p>
            <h2 class="file-explorer-preview-title">{{ selectedLabel }}</h2>
            <p class="file-explorer-preview-text">
              {{ preview.entryCount }} item{{ preview.entryCount === 1 ? '' : 's' }} in this directory.
            </p>
            <p v-if="selectedMetadataSummary" class="file-explorer-preview-meta">{{ selectedMetadataSummary }}</p>
          </div>
        </template>

        <template v-else-if="preview.kind === 'text'">
          <div class="file-explorer-preview-header">
            <div>
              <p class="file-explorer-eyebrow">Preview</p>
              <h2 class="file-explorer-preview-title">{{ selectedLabel }}</h2>
            </div>
            <span class="file-explorer-language">{{ preview.language }}</span>
          </div>
          <div class="file-explorer-code-wrap">
            <pre class="file-explorer-code-pre"><code class="hljs" v-html="renderHighlightedCodeAsHtml(preview.language, preview.text)"></code></pre>
          </div>
        </template>

        <template v-else-if="preview.kind === 'image'">
          <div class="file-explorer-preview-header">
            <div>
              <p class="file-explorer-eyebrow">Image</p>
              <h2 class="file-explorer-preview-title">{{ selectedLabel }}</h2>
            </div>
            <span class="file-explorer-language">{{ preview.mimeType }}</span>
          </div>
          <div class="file-explorer-image-wrap">
            <img class="file-explorer-image" :src="preview.src" :alt="selectedLabel" />
          </div>
        </template>

        <template v-else-if="preview.kind === 'unsupported'">
          <div class="file-explorer-preview-card">
            <p class="file-explorer-eyebrow">Preview unavailable</p>
            <h2 class="file-explorer-preview-title">{{ selectedLabel }}</h2>
            <p class="file-explorer-preview-text">{{ preview.reason }}</p>
            <a
              v-if="selectedFileRawHref !== '#'"
              class="file-explorer-toolbar-link"
              :href="selectedFileRawHref"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open raw file
            </a>
          </div>
        </template>

        <template v-else-if="preview.kind === 'error'">
          <div class="file-explorer-error-card">
            <p class="file-explorer-error-title">Preview failed</p>
            <p class="file-explorer-error-text">{{ preview.message }}</p>
          </div>
        </template>

        <template v-else>
          <div class="file-explorer-preview-card">
            <p class="file-explorer-eyebrow">Files</p>
            <h2 class="file-explorer-preview-title">Choose a file or folder</h2>
            <p class="file-explorer-preview-text">Select an entry from the left panel to inspect it.</p>
          </div>
        </template>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useFileExplorer } from '../../composables/useFileExplorer'
import {
  buildFilesRouteLocation,
  buildRawFileHref,
  getParentFilePath,
  getPathBreadcrumbs,
  getPathLeafName,
} from '../../utils/fileExplorer'

type HighlightJsModule = (typeof import('highlight.js/lib/common'))['default']

const props = defineProps<{
  path: string
  cwd: string
}>()

const router = useRouter()
const {
  currentDirectoryPath,
  entries,
  isLoading,
  listingError,
  locationError,
  preview,
  reload,
  resolvedPath,
  selectedMetadata,
  selectedPath,
} = useFileExplorer({
  path: toRef(props, 'path'),
  cwd: toRef(props, 'cwd'),
})

const highlightJsModule = ref<HighlightJsModule | null>(null)
let highlightJsLoader: Promise<void> | null = null

function ensureHighlightJs(): Promise<void> {
  if (highlightJsModule.value) return Promise.resolve()
  if (!highlightJsLoader) {
    highlightJsLoader = import('highlight.js/lib/common')
      .then((module) => {
        highlightJsModule.value = module.default
      })
      .finally(() => {
        highlightJsLoader = null
      })
  }
  return highlightJsLoader
}

watch(
  () => preview.value.kind,
  (kind) => {
    if (kind === 'text') {
      void ensureHighlightJs()
    }
  },
  { immediate: true },
)

const breadcrumbs = computed(() => getPathBreadcrumbs(currentDirectoryPath.value || resolvedPath.value))
const currentDirectoryLabel = computed(() => currentDirectoryPath.value || 'No directory selected')
const selectedLabel = computed(() => getPathLeafName(selectedPath.value || resolvedPath.value) || 'Selected path')
const selectedFileRawHref = computed(() => {
  const metadata = selectedMetadata.value
  if (!metadata?.isFile) return '#'
  return buildRawFileHref(metadata.path)
})
const fallbackParentPath = computed(() => getParentFilePath(resolvedPath.value))
const selectedMetadataSummary = computed(() => {
  const metadata = selectedMetadata.value
  if (!metadata) return ''
  const parts: string[] = []
  if (metadata.modifiedAtMs > 0) {
    parts.push(`Modified ${formatTimestamp(metadata.modifiedAtMs)}`)
  }
  if (metadata.createdAtMs > 0) {
    parts.push(`Created ${formatTimestamp(metadata.createdAtMs)}`)
  }
  return parts.join(' · ')
})

function formatTimestamp(value: number): string {
  return new Date(value).toLocaleString()
}

function openPath(pathValue: string): void {
  if (!pathValue.trim()) return
  void router.push(buildFilesRouteLocation(pathValue, { cwd: props.cwd }))
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;')
}

function renderHighlightedCodeAsHtml(language: string, value: string): string {
  const highlighter = highlightJsModule.value
  if (!highlighter) return escapeHtml(value)

  try {
    const normalizedLanguage = language.trim().toLowerCase()
    if (normalizedLanguage && highlighter.getLanguage(normalizedLanguage)) {
      return highlighter.highlight(value, { language: normalizedLanguage }).value
    }
  } catch {
    // Fall back to escaped text when highlighting fails.
  }

  return escapeHtml(value)
}
</script>

<style scoped>
@reference "tailwindcss";

.file-explorer-root {
  @apply h-full min-h-0 min-w-0 flex flex-col bg-white;
}

.file-explorer-toolbar {
  @apply flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 max-sm:flex-col max-sm:items-start;
}

.file-explorer-breadcrumbs {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}

.file-explorer-crumb {
  @apply rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 transition hover:bg-slate-100;
}

.file-explorer-toolbar-actions {
  @apply flex items-center gap-2;
}

.file-explorer-toolbar-button,
.file-explorer-toolbar-link {
  @apply inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50;
}

.file-explorer-toolbar-link {
  @apply no-underline;
}

.file-explorer-layout {
  @apply grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)] max-sm:grid-cols-1;
}

.file-explorer-sidebar {
  @apply flex min-h-0 flex-col border-r border-slate-200 bg-slate-50/60 max-sm:border-r-0 max-sm:border-b;
}

.file-explorer-sidebar-header {
  @apply flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3;
}

.file-explorer-eyebrow {
  @apply text-xs font-medium uppercase tracking-[0.12em] text-slate-500;
}

.file-explorer-sidebar-title,
.file-explorer-preview-title {
  @apply mt-1 text-base font-semibold text-slate-900 break-all;
}

.file-explorer-sidebar-count,
.file-explorer-language,
.file-explorer-preview-meta {
  @apply text-xs text-slate-500;
}

.file-explorer-sidebar-error {
  @apply m-4 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700;
}

.file-explorer-sidebar-empty {
  @apply px-4 py-5 text-sm text-slate-500;
}

.file-explorer-entry-list {
  @apply min-h-0 flex-1 overflow-y-auto p-2;
}

.file-explorer-entry-item {
  @apply m-0;
}

.file-explorer-entry-button {
  @apply flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-white;
}

.file-explorer-entry-button[data-active='true'] {
  @apply bg-white shadow-sm ring-1 ring-slate-200;
}

.file-explorer-entry-icon {
  @apply inline-flex min-w-10 justify-center rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-slate-600;
}

.file-explorer-entry-name {
  @apply min-w-0 flex-1 truncate text-sm text-slate-800;
}

.file-explorer-preview {
  @apply min-h-0 overflow-y-auto p-5;
}

.file-explorer-preview-header {
  @apply mb-4 flex items-start justify-between gap-3;
}

.file-explorer-preview-card,
.file-explorer-error-card {
  @apply rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-5;
}

.file-explorer-preview-text,
.file-explorer-error-text {
  @apply mt-2 text-sm leading-6 text-slate-600;
}

.file-explorer-error-title {
  @apply text-base font-semibold text-rose-700;
}

.file-explorer-error-actions {
  @apply mt-4 flex items-center gap-2;
}

.file-explorer-code-wrap {
  @apply overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950;
}

.file-explorer-code-pre {
  @apply m-0 overflow-x-auto p-5 text-sm leading-6 text-slate-100;
}

.file-explorer-code-pre :deep(.hljs) {
  @apply bg-transparent p-0;
}

.file-explorer-image-wrap {
  @apply overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 p-4;
}

.file-explorer-image {
  @apply mx-auto max-h-[70vh] w-auto max-w-full rounded-2xl object-contain;
}
</style>
