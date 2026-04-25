<template>
  <div ref="rootRef" class="search-dropdown">
    <button
      class="search-dropdown-trigger"
      type="button"
      :disabled="disabled"
      @click="onToggle"
    >
      <span class="search-dropdown-value">{{ displayLabel }}</span>
      <IconTablerChevronDown class="search-dropdown-chevron" />
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="search-dropdown-menu-wrap"
        :class="{
          'search-dropdown-menu-wrap-up': openDirection === 'up',
          'search-dropdown-menu-wrap-down': openDirection === 'down',
        }"
        :style="menuStyle"
      >
        <div class="search-dropdown-menu">
          <div class="search-dropdown-search-wrap">
            <div class="search-dropdown-search-row">
              <input
                ref="searchRef"
                v-model="searchQuery"
                class="search-dropdown-search"
                type="text"
                :placeholder="searchPlaceholder"
                @keydown.escape.prevent="isOpen = false"
                @keydown.enter.prevent="selectHighlighted"
                @keydown.arrow-down.prevent="moveHighlight(1)"
                @keydown.arrow-up.prevent="moveHighlight(-1)"
              />
              <button
                v-if="createLabel"
                class="search-dropdown-create-icon"
                type="button"
                :aria-label="createLabel"
                :title="createLabel"
                @click="emit('create')"
              >
                +
              </button>
            </div>
            <button
              v-if="createLabel"
              class="search-dropdown-create"
              type="button"
              @click="emit('create')"
            >
              {{ createLabel }}
            </button>
          </div>
          <ul v-if="filtered.length > 0" class="search-dropdown-list" role="listbox">
            <li v-for="(opt, idx) in filtered" :key="opt.value">
              <div
                class="search-dropdown-option"
                :class="{
                  'is-selected': selected.has(opt.value),
                  'is-highlighted': idx === highlightIdx,
                }"
                @pointerenter="highlightIdx = idx"
              >
                <button
                  class="search-dropdown-option-main"
                  type="button"
                  @click="onSelect(opt)"
                >
                  <span class="search-dropdown-option-check">{{ selected.has(opt.value) ? '✓' : '' }}</span>
                  <span class="search-dropdown-option-copy">
                    <span class="search-dropdown-option-label">{{ opt.label }}</span>
                    <span v-if="opt.description" class="search-dropdown-option-desc">{{ opt.description }}</span>
                  </span>
                </button>
                <button
                  v-if="allowRemove"
                  class="search-dropdown-option-remove"
                  type="button"
                  :aria-label="`${removeLabel} ${opt.label}`"
                  :title="`${removeLabel} ${opt.label}`"
                  @click.stop="emit('remove', opt.value)"
                >
                  ×
                </button>
              </div>
            </li>
          </ul>
          <div v-else class="search-dropdown-empty">{{ t('No results') }}</div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useUiLanguage } from '../../composables/useUiLanguage'
import IconTablerChevronDown from '../icons/IconTablerChevronDown.vue'

export type SearchDropdownOption = {
  value: string
  label: string
  description?: string
}

const props = defineProps<{
  options: SearchDropdownOption[]
  selectedValues: string[]
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  openDirection?: 'up' | 'down'
  createLabel?: string
  allowRemove?: boolean
  removeLabel?: string
  displayLabelOverride?: string
}>()

const emit = defineEmits<{
  toggle: [value: string, checked: boolean]
  create: []
  remove: [value: string]
}>()

const rootRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)
const isOpen = ref(false)
const searchQuery = ref('')
const highlightIdx = ref(0)
const menuStyle = ref<Record<string, string>>({})
const { t } = useUiLanguage()

const openDirection = computed(() => props.openDirection ?? 'down')
const selected = computed(() => new Set(props.selectedValues))

const displayLabel = computed(() => {
  if (props.displayLabelOverride?.trim()) return props.displayLabelOverride.trim()
  if (props.selectedValues.length === 0) return props.placeholder || t('Select...')
  if (props.selectedValues.length === 1) {
    const opt = props.options.find((o) => o.value === props.selectedValues[0])
    return opt?.label || props.placeholder || t('Select...')
  }
  return `${props.selectedValues.length} ${t('selected')}`
})

const filtered = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return props.options
  return props.options.filter(
    (o) =>
      o.label.toLowerCase().includes(q) ||
      (o.description?.toLowerCase().includes(q) ?? false),
  )
})

function updateMenuPosition(): void {
  const menu = menuRef.value
  const root = rootRef.value
  if (!menu || !root) return
  const rect = root.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const desiredWidth = Math.min(384, viewportWidth - 16)
  const left = Math.max(8, Math.min(rect.right - desiredWidth, viewportWidth - desiredWidth - 8))

  if (viewportWidth < 640) {
    menuStyle.value = {
      position: 'fixed',
      left: '0.5rem',
      right: '0.5rem',
      width: 'auto',
      top: openDirection.value === 'up' ? 'auto' : `${rect.bottom + 8}px`,
      bottom: openDirection.value === 'up' ? `${viewportHeight - rect.top + 8}px` : 'auto',
      zIndex: '120',
    }
    return
  }

  menuStyle.value = {
    position: 'fixed',
    width: `${desiredWidth}px`,
    left: `${left}px`,
    top: openDirection.value === 'up' ? 'auto' : `${rect.bottom + 8}px`,
    bottom: openDirection.value === 'up' ? `${viewportHeight - rect.top + 8}px` : 'auto',
    zIndex: '120',
  }
}

function onToggle(): void {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    searchQuery.value = ''
    highlightIdx.value = 0
    nextTick(() => {
      nextTick(() => {
        updateMenuPosition()
      })
      searchRef.value?.focus()
    })
  }
}

function onSelect(opt: SearchDropdownOption): void {
  emit('toggle', opt.value, !selected.value.has(opt.value))
  isOpen.value = false
}

function moveHighlight(delta: number): void {
  if (filtered.value.length === 0) return
  highlightIdx.value = (highlightIdx.value + delta + filtered.value.length) % filtered.value.length
}

function selectHighlighted(): void {
  const opt = filtered.value[highlightIdx.value]
  if (opt) onSelect(opt)
}

function onDocumentPointerDown(event: PointerEvent): void {
  if (!isOpen.value) return
  const root = rootRef.value
  const menu = menuRef.value
  if (!root) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (root.contains(target)) return
  if (menu?.contains(target)) return
  isOpen.value = false
}

watch(searchQuery, () => { highlightIdx.value = 0 })

function onWindowLayoutChange(): void {
  if (!isOpen.value) return
  updateMenuPosition()
}

onMounted(() => {
  window.addEventListener('pointerdown', onDocumentPointerDown)
  window.addEventListener('resize', onWindowLayoutChange)
  window.addEventListener('scroll', onWindowLayoutChange, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onDocumentPointerDown)
  window.removeEventListener('resize', onWindowLayoutChange)
  window.removeEventListener('scroll', onWindowLayoutChange, true)
})
</script>

<style scoped>
@reference "tailwindcss";

.search-dropdown {
  @apply relative inline-flex min-w-0;
}

.search-dropdown-trigger {
  @apply inline-flex min-h-7 min-w-0 items-center gap-1 border-0 bg-transparent px-0 py-0.5 text-sm leading-tight outline-none transition;
  color: var(--theme-text-secondary);
}

.search-dropdown-trigger:disabled {
  @apply cursor-not-allowed;
  color: var(--theme-text-muted);
}

.search-dropdown-value {
  @apply whitespace-nowrap text-left truncate pb-px;
}

.search-dropdown-chevron {
  @apply mt-px h-3.5 w-3.5 shrink-0;
  color: var(--theme-text-muted);
}

.search-dropdown-menu-wrap {
  @apply z-[120];
}

.search-dropdown-menu {
  @apply m-0 min-w-56 rounded-xl border p-1;
  border-color: var(--theme-border);
  background: var(--theme-panel-bg);
  box-shadow: var(--theme-shadow-md);
}

@media (max-width: 639px) {
  .search-dropdown-menu-wrap {
    max-width: none;
  }
}

.search-dropdown-search-wrap {
  @apply border-b p-2;
  border-color: var(--theme-border);
}

.search-dropdown-search-row {
  @apply flex items-center gap-2;
}

.search-dropdown-create {
  @apply hidden;
}

.search-dropdown-create-icon {
  @apply inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-lg leading-none transition;
  border-color: var(--theme-border);
  background: var(--theme-control-bg);
  color: var(--theme-text-secondary);
}

.search-dropdown-create-icon:hover {
  background: var(--theme-control-hover-bg);
  color: var(--theme-text-primary);
}

.search-dropdown-search {
  @apply min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-sm outline-none transition;
  border-color: var(--theme-border);
  background: var(--theme-control-bg);
  color: var(--theme-text-primary);
}

.search-dropdown-search::placeholder {
  color: var(--theme-text-muted);
}

.search-dropdown-search:focus {
  border-color: var(--theme-border-strong);
  background: var(--theme-control-hover-bg);
}

.search-dropdown-list {
  @apply m-0 max-h-64 list-none overflow-y-auto p-1;
}

.search-dropdown-option {
  @apply relative flex min-w-0 items-start gap-1 rounded-lg transition;
  color: var(--theme-text-secondary);
}

.search-dropdown-option.is-highlighted {
  background: var(--theme-control-hover-bg);
  color: var(--theme-text-primary);
}

.search-dropdown-option.is-selected {
  background: var(--theme-selection-bg);
  color: var(--theme-selection-text);
}

.search-dropdown-option-main {
  @apply flex min-w-0 flex-1 items-start gap-2 rounded-lg border-0 bg-transparent px-2.5 py-1.5 pr-8 text-left;
  color: inherit;
}

.search-dropdown-option-main:hover {
  background: var(--theme-control-hover-bg);
  color: var(--theme-text-primary);
}

.search-dropdown-option-check {
  @apply mt-0.5 w-4 shrink-0 text-center text-[10px] leading-4;
  color: var(--theme-success-text);
}

.search-dropdown-option-copy {
  @apply flex min-w-0 flex-1 flex-col overflow-hidden pr-1;
}

.search-dropdown-option-label {
  @apply block min-w-0 truncate text-sm font-medium;
  color: var(--theme-text-primary);
}

.search-dropdown-option.is-selected .search-dropdown-option-label {
  color: inherit;
}

.search-dropdown-option-desc {
  @apply mt-0.5 block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs;
  color: var(--theme-text-muted);
}

.search-dropdown-option-remove {
  @apply absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-md border-0 bg-transparent text-lg font-medium leading-none transition;
  color: var(--theme-text-muted);
}

.search-dropdown-option-remove:hover {
  background: var(--theme-control-hover-bg);
  color: var(--theme-text-primary);
}

.search-dropdown-empty {
  @apply p-3 text-center text-sm;
  color: var(--theme-text-muted);
}
</style>
