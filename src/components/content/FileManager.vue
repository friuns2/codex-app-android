<template>
  <div class="fm-root">
    <!-- Toolbar -->
    <div class="fm-toolbar">
      <button class="fm-toolbar-btn" type="button" :disabled="!parentPath" @click="navigateUp" :title="$t('fileManager.goUp')">
        <IconTablerChevronLeft class="fm-toolbar-icon" />
      </button>
      <div class="fm-breadcrumb" :title="currentPath">
        <template v-for="(seg, idx) in breadcrumbSegments" :key="idx">
          <span v-if="idx > 0" class="fm-breadcrumb-sep">{{ detectSep(currentPath) }}</span>
          <button class="fm-breadcrumb-btn" type="button" @click="fetchEntries(seg.path)">{{ seg.label }}</button>
        </template>
      </div>
      <div class="fm-toolbar-actions">
        <button class="fm-toolbar-btn" type="button" @click="onRefresh" :title="$t('common.refresh')">↻</button>
        <button class="fm-toolbar-btn" type="button" @click.stop="showNewMenu = !showNewMenu" :title="$t('fileManager.newItem')">+</button>
        <button class="fm-toolbar-btn" type="button" @click="triggerUpload" :title="$t('fileManager.uploadFiles')">↑</button>
        <button class="fm-toolbar-btn" type="button" @click="triggerFolderUpload" :title="$t('fileManager.uploadFolder')">
          <IconFolder class="fm-toolbar-icon" />
        </button>
      </div>
    </div>

    <!-- New item menu -->
    <div v-if="showNewMenu" class="fm-new-menu" @click.stop>
      <button class="fm-new-menu-item" type="button" @click="startCreateFile">{{ $t('fileManager.newFile') }}</button>
      <button class="fm-new-menu-item" type="button" @click="startCreateFolder">{{ $t('fileManager.newFolder') }}</button>
    </div>

    <!-- Inline create input -->
    <div v-if="createMode" class="fm-create-row">
      <component :is="createMode === 'file' ? IconFile : IconFolder" class="fm-create-icon" />
      <input
        ref="createInputRef"
        v-model="createName"
        class="fm-create-input"
        type="text"
        :placeholder="createMode === 'file' ? $t('fileManager.fileNamePlaceholder') : $t('fileManager.folderNamePlaceholder')"
        @keydown.enter="confirmCreate"
        @keydown.escape="cancelCreate"
      />
      <button class="fm-create-confirm" type="button" @click="confirmCreate">✓</button>
      <button class="fm-create-cancel" type="button" @click="cancelCreate">✕</button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="fm-loading">{{ $t('common.loading') }}...</div>

    <!-- Error -->
    <div v-if="error" class="fm-error">{{ error }}</div>

    <!-- Empty -->
    <div v-if="!isLoading && !error && entries.length === 0" class="fm-empty">{{ $t('fileManager.emptyFolder') }}</div>

    <!-- File list -->
    <div v-if="!isLoading && entries.length > 0" class="fm-list">
      <div
        v-for="entry in entries"
        :key="entry.path"
        class="fm-entry"
        :class="{ 'is-selected': selectedPath === entry.path }"
        @click="onEntryClick(entry)"
        @dblclick="onEntryDblClick(entry)"
        @contextmenu.prevent="onContextMenu($event, entry)"
      >
        <component :is="entryIcon(entry)" class="fm-entry-icon" />
        <span v-if="renamingPath === entry.path" class="fm-entry-rename-wrap">
          <input
            ref="renameInputRef"
            v-model="renameValue"
            class="fm-entry-rename-input"
            type="text"
            @keydown.enter="confirmRename(entry)"
            @keydown.escape="cancelRename"
            @blur="confirmRename(entry)"
          />
        </span>
        <span v-else class="fm-entry-name">{{ entry.name }}</span>
        <span class="fm-entry-meta">{{ entry.isDirectory ? '' : formatSize(entry.size) }}</span>
      </div>
    </div>

    <!-- Context menu -->
    <Teleport to="body">
      <div
        v-if="contextMenu"
        ref="contextMenuRef"
        class="fm-context-menu"
        :style="contextMenuStyle"
        @click.stop
      >
        <button v-if="!contextMenu.entry.isDirectory" class="fm-context-item" type="button" @click="downloadEntry(contextMenu.entry)">
          {{ $t('fileManager.download') }}
        </button>
        <button class="fm-context-item" type="button" @click="startRename(contextMenu.entry)">
          {{ $t('home.rename') }}
        </button>
        <button class="fm-context-item fm-context-item-danger" type="button" @click="deleteEntry(contextMenu.entry)">
          {{ $t('home.delete') }}
        </button>
      </div>
    </Teleport>

    <!-- Hidden upload inputs -->
    <input
      ref="uploadInputRef"
      class="fm-hidden-input"
      type="file"
      multiple
      @change="onUploadChange"
    />
    <input
      ref="folderUploadInputRef"
      class="fm-hidden-input"
      type="file"
      webkitdirectory
      directory
      multiple
      @change="onFolderUploadChange"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * Reusable file manager component.
 * Displays directory contents and provides CRUD operations.
 */
import { computed, type Component, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IconFolder,
  IconFile,
  IconFileTypeTs,
  IconFileTypeJs,
  IconFileTypeJsx,
  IconFileTypeCss,
  IconFileTypeHtml,
  IconFileTypeVue,
  IconJson,
  IconMarkdown,
  IconPhoto,
  IconFileTypePdf,
  IconBrandPython,
  IconSettings,
  IconFileZip,
} from '@tabler/icons-vue'
import IconTablerChevronLeft from '../icons/IconTablerChevronLeft.vue'

type FileEntry = {
  name: string
  path: string
  isDirectory: boolean
  size: number
  mtimeMs: number
  extension: string
}

type ContextMenuState = {
  x: number
  y: number
  entry: FileEntry
} | null

const props = defineProps<{
  cwd: string
}>()


const { t } = useI18n()

/** Extract error message from a failed fetch response. */
async function extractApiError(resp: Response, fallbackKey: string): Promise<string> {
  try {
    const data = (await resp.json()) as { error?: string }
    if (data.error?.trim()) {
      // Map known server errors to i18n
      if (data.error.includes('outside allowed workspace')) return t('fileManager.outsideWorkspace')
      if (data.error.includes('absolute')) return t('fileManager.invalidPath')
      if (data.error.includes('not a directory')) return t('fileManager.notADirectory')
      if (data.error.includes('not a file')) return t('fileManager.notAFile')
      if (data.error.includes('not found')) return t('fileManager.notFound')
      return data.error
    }
  } catch { /* ignore parse failure */ }
  return t(fallbackKey)
}

const currentPath = ref('')
const parentPath = ref('')
const entries = ref<FileEntry[]>([])
const isLoading = ref(false)
const error = ref('')
const selectedPath = ref('')
const showNewMenu = ref(false)
const createMode = ref<'file' | 'folder' | null>(null)
const createName = ref('')
const createInputRef = ref<HTMLInputElement | null>(null)
const renamingPath = ref('')
const renameValue = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)
const contextMenu = ref<ContextMenuState>(null)
const contextMenuRef = ref<HTMLElement | null>(null)
const contextMenuStyle = ref<Record<string, string>>({})
const uploadInputRef = ref<HTMLInputElement | null>(null)
const folderUploadInputRef = ref<HTMLInputElement | null>(null)

/** Detect platform path separator from a server-returned path. */
function detectSep(p: string): string {
  return p.includes('\\') ? '\\' : '/'
}

const breadcrumbSegments = computed(() => {
  const p = currentPath.value
  if (!p) return []
  // Normalize to forward slashes for uniform splitting
  const normalized = p.replace(/\\/g, '/')
  const isWin = /^[A-Za-z]:/.test(normalized)
  const isUnc = p.startsWith('\\\\') || p.startsWith('//')
  const parts = normalized.split('/').filter(Boolean)
  const segments: Array<{ label: string; path: string }> = []
  const sep = detectSep(p)

  if (isUnc && parts.length >= 2) {
    // UNC path: \\server\share\...
    const uncRoot = `${sep}${sep}${parts[0]}${sep}${parts[1]}`
    segments.push({ label: `${sep}${sep}${parts[0]}${sep}${parts[1]}`, path: uncRoot })
    let accumulated = uncRoot
    for (let i = 2; i < parts.length; i++) {
      accumulated = `${accumulated}${sep}${parts[i]}`
      segments.push({ label: parts[i], path: accumulated })
    }
  } else if (isWin) {
    // Windows drive: C:\Users\...  — first part is "C:", path must be "C:\"
    const driveRoot = `${parts[0]}${sep}`
    segments.push({ label: driveRoot, path: driveRoot })
    let accumulated = driveRoot
    for (let i = 1; i < parts.length; i++) {
      accumulated = `${accumulated}${parts[i]}`
      segments.push({ label: parts[i], path: accumulated })
      if (i < parts.length - 1) accumulated += sep
    }
  } else {
    // Unix: /home/user/...
    segments.push({ label: '/', path: '/' })
    let accumulated = ''
    for (const part of parts) {
      accumulated = `${accumulated}/${part}`
      segments.push({ label: part, path: accumulated })
    }
  }
  return segments
})

/** Fetch directory listing from the API. */
async function fetchEntries(dirPath: string): Promise<void> {
  isLoading.value = true
  error.value = ''
  try {
    const resp = await fetch(`/codex-api/files?path=${encodeURIComponent(dirPath)}&showHidden=1`)
    if (!resp.ok) throw new Error(await extractApiError(resp, 'fileManager.loadError'))
    const data = (await resp.json()) as { path: string; parentPath: string; entries: FileEntry[] }
    currentPath.value = data.path
    parentPath.value = data.parentPath
    entries.value = data.entries
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('fileManager.loadError')
    entries.value = []
  } finally {
    isLoading.value = false
  }
}

function navigateUp(): void {
  if (parentPath.value && parentPath.value !== currentPath.value) {
    void fetchEntries(parentPath.value)
  }
}

function onRefresh(): void {
  void fetchEntries(currentPath.value || props.cwd)
}

function onEntryClick(entry: FileEntry): void {
  selectedPath.value = entry.path
  closeContextMenu()
}

function onEntryDblClick(entry: FileEntry): void {
  if (entry.isDirectory) {
    void fetchEntries(entry.path)
  }
}

function onContextMenu(event: MouseEvent, entry: FileEntry): void {
  selectedPath.value = entry.path
  contextMenu.value = { x: event.clientX, y: event.clientY, entry }
  // Default position, then adjust after render
  contextMenuStyle.value = { top: `${event.clientY}px`, left: `${event.clientX}px` }
  nextTick(() => {
    const el = contextMenuRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    const viewH = window.innerHeight
    const viewW = window.innerWidth
    let y = event.clientY
    let x = event.clientX
    if (y + rect.height > viewH - 8) y = Math.max(8, y - rect.height)
    if (x + rect.width > viewW - 8) x = Math.max(8, x - rect.width)
    contextMenuStyle.value = { top: `${y}px`, left: `${x}px` }
  })
}

function closeContextMenu(): void {
  contextMenu.value = null
}

// --- Create file/folder ---
function startCreateFile(): void {
  createMode.value = 'file'
  createName.value = ''
  showNewMenu.value = false
  nextTick(() => createInputRef.value?.focus())
}

function startCreateFolder(): void {
  createMode.value = 'folder'
  createName.value = ''
  showNewMenu.value = false
  nextTick(() => createInputRef.value?.focus())
}

async function confirmCreate(): Promise<void> {
  const name = createName.value.trim()
  if (!name || !currentPath.value) return
  const sep = currentPath.value.includes('\\') ? '\\' : '/'
  const fullPath = `${currentPath.value}${sep}${name}`
  const endpoint = createMode.value === 'folder' ? '/codex-api/files/mkdir' : '/codex-api/files/create'
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: fullPath }),
    })
    if (!resp.ok) throw new Error(await extractApiError(resp, 'fileManager.createError'))
    cancelCreate()
    void fetchEntries(currentPath.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('fileManager.createError')
  }
}

function cancelCreate(): void {
  createMode.value = null
  createName.value = ''
}

// --- Rename ---
function startRename(entry: FileEntry): void {
  closeContextMenu()
  renamingPath.value = entry.path
  renameValue.value = entry.name
  nextTick(() => {
    const input = renameInputRef.value
    if (Array.isArray(input)) {
      (input[0] as HTMLInputElement | undefined)?.focus()
    } else {
      input?.focus()
    }
  })
}

async function confirmRename(entry: FileEntry): Promise<void> {
  const newName = renameValue.value.trim()
  if (!newName || newName === entry.name) { cancelRename(); return }
  const dir = entry.path.substring(0, entry.path.length - entry.name.length)
  const newPath = dir + newName
  try {
    const resp = await fetch('/codex-api/files/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: entry.path, to: newPath }),
    })
    if (!resp.ok) throw new Error(await extractApiError(resp, 'fileManager.renameError'))
    cancelRename()
    void fetchEntries(currentPath.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('fileManager.renameError')
    cancelRename()
  }
}

function cancelRename(): void {
  renamingPath.value = ''
  renameValue.value = ''
}

// --- Delete ---
async function deleteEntry(entry: FileEntry): Promise<void> {
  closeContextMenu()
  try {
    const resp = await fetch(`/codex-api/files?path=${encodeURIComponent(entry.path)}`, { method: 'DELETE' })
    if (!resp.ok) throw new Error(await extractApiError(resp, 'fileManager.deleteError'))
    void fetchEntries(currentPath.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('fileManager.deleteError')
  }
}

// --- Download ---
function downloadEntry(entry: FileEntry): void {
  closeContextMenu()
  const a = document.createElement('a')
  a.href = `/codex-api/files/download?path=${encodeURIComponent(entry.path)}`
  a.download = entry.name
  a.click()
}

// --- Upload ---
function triggerUpload(): void {
  showNewMenu.value = false
  uploadInputRef.value?.click()
}

function triggerFolderUpload(): void {
  showNewMenu.value = false
  folderUploadInputRef.value?.click()
}

async function uploadFiles(files: FileList): Promise<void> {
  const formData = new FormData()
  for (const file of Array.from(files)) {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
    formData.append('files', file, relativePath)
  }
  try {
    const resp = await fetch(`/codex-api/files/upload?path=${encodeURIComponent(currentPath.value)}`, {
      method: 'POST',
      body: formData,
    })
    if (!resp.ok) throw new Error(await extractApiError(resp, 'fileManager.uploadError'))
    void fetchEntries(currentPath.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('fileManager.uploadError')
  }
}

async function onUploadChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) await uploadFiles(input.files)
  input.value = ''
}

async function onFolderUploadChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) await uploadFiles(input.files)
  input.value = ''
}

// --- Helpers ---
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const FILE_ICON_MAP: Record<string, Component> = {
  '.ts': IconFileTypeTs, '.tsx': IconFileTypeTs,
  '.js': IconFileTypeJs, '.jsx': IconFileTypeJsx,
  '.json': IconJson, '.md': IconMarkdown, '.mdx': IconMarkdown,
  '.html': IconFileTypeHtml, '.css': IconFileTypeCss,
  '.vue': IconFileTypeVue, '.py': IconBrandPython,
  '.toml': IconSettings, '.yaml': IconSettings, '.yml': IconSettings,
  '.png': IconPhoto, '.jpg': IconPhoto, '.jpeg': IconPhoto, '.gif': IconPhoto, '.svg': IconPhoto, '.webp': IconPhoto,
  '.pdf': IconFileTypePdf,
  '.zip': IconFileZip, '.tar': IconFileZip, '.gz': IconFileZip, '.7z': IconFileZip, '.rar': IconFileZip,
}

function entryIcon(entry: FileEntry): Component {
  if (entry.isDirectory) return IconFolder
  return FILE_ICON_MAP[entry.extension] || IconFile
}

function onWindowClick(): void {
  closeContextMenu()
  showNewMenu.value = false
}

// --- Lifecycle ---
watch(() => props.cwd, (cwd) => {
  if (cwd) void fetchEntries(cwd)
}, { immediate: true })

onMounted(() => {
  window.addEventListener('click', onWindowClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', onWindowClick)
})
</script>

<style scoped>
@reference "tailwindcss";

.fm-root {
  @apply flex flex-col h-full min-h-0 overflow-hidden;
}

.fm-toolbar {
  @apply flex items-center gap-1 px-2 py-1.5 border-b border-zinc-200 shrink-0;
}

.fm-toolbar-btn {
  @apply h-7 w-7 rounded-md border border-zinc-200 bg-white text-zinc-600 flex items-center justify-center text-sm transition hover:bg-zinc-50 disabled:opacity-40;
}

.fm-toolbar-icon {
  @apply w-4 h-4;
}

.fm-breadcrumb {
  @apply flex-1 min-w-0 px-1 flex items-center overflow-x-auto gap-0;
  scrollbar-width: none;
}

.fm-breadcrumb::-webkit-scrollbar {
  display: none;
}

.fm-breadcrumb-sep {
  @apply text-[10px] text-zinc-400 shrink-0 px-0.5;
}

.fm-breadcrumb-btn {
  @apply shrink-0 rounded px-1 py-0.5 text-xs text-zinc-500 font-mono transition hover:bg-zinc-100 hover:text-zinc-800 border-0 bg-transparent whitespace-nowrap;
}

.fm-toolbar-actions {
  @apply flex items-center gap-1;
}

.fm-new-menu {
  @apply flex gap-1 px-2 py-1.5 border-b border-zinc-100;
}

.fm-new-menu-item {
  @apply rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 transition hover:bg-zinc-50;
}

.fm-create-row {
  @apply flex items-center gap-1.5 px-2 py-1.5 border-b border-zinc-100;
}

.fm-create-icon {
  @apply w-3.5 h-3.5 shrink-0 text-zinc-400;
}

.fm-create-input {
  @apply flex-1 min-w-0 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 outline-none focus:border-zinc-400;
}

.fm-create-confirm, .fm-create-cancel {
  @apply h-6 w-6 rounded text-xs flex items-center justify-center transition;
}

.fm-create-confirm {
  @apply text-emerald-600 hover:bg-emerald-50;
}

.fm-create-cancel {
  @apply text-zinc-400 hover:bg-zinc-100;
}

.fm-loading, .fm-empty, .fm-error {
  @apply px-3 py-6 text-center text-xs;
}

.fm-loading, .fm-empty {
  @apply text-zinc-400;
}

.fm-error {
  @apply text-rose-600;
}

.fm-list {
  @apply flex-1 overflow-y-auto;
}

.fm-entry {
  @apply flex items-center gap-2 px-2.5 py-1.5 text-sm cursor-pointer transition hover:bg-zinc-50;
}

.fm-entry.is-selected {
  @apply bg-zinc-100;
}

.fm-entry-icon {
  @apply w-3.5 h-3.5 shrink-0 text-zinc-400;
}

.fm-entry-name {
  @apply flex-1 min-w-0 truncate text-zinc-800 text-xs;
}

.fm-entry-meta {
  @apply shrink-0 text-[10px] text-zinc-400 tabular-nums;
}

.fm-entry-rename-wrap {
  @apply flex-1 min-w-0;
}

.fm-entry-rename-input {
  @apply w-full rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs text-zinc-800 outline-none focus:border-zinc-500;
}

.fm-context-menu {
  @apply fixed z-[100] min-w-36 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg;
}

.fm-context-item {
  @apply block w-full rounded-md px-2.5 py-1.5 text-left text-xs text-zinc-700 transition hover:bg-zinc-100;
}

.fm-context-item-danger {
  @apply text-rose-600 hover:bg-rose-50;
}

.fm-hidden-input {
  @apply hidden;
}
</style>
