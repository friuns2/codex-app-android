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

    <div
      v-if="isOpen"
      ref="menuRef"
      class="search-dropdown-menu-wrap"
      :class="{
        'search-dropdown-menu-wrap-up': openDirection === 'up',
        'search-dropdown-menu-wrap-down': openDirection === 'down',
      }"
    >
      <div class="search-dropdown-search-wrap">
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
      </div>
      <ul v-if="filtered.length > 0" class="search-dropdown-list" role="listbox">
        <li v-for="(opt, idx) in filtered" :key="opt.value">
          <button
            class="search-dropdown-option"
            :class="{
              'is-selected': selected.has(opt.value),
              'is-highlighted': idx === highlightIdx,
            }"
            type="button"
            @click="onSelect(opt)"
            @pointerenter="highlightIdx = idx"
          >
            <span class="search-dropdown-option-check">{{ selected.has(opt.value) ? '✓' : '' }}</span>
            <span class="search-dropdown-option-label">{{ opt.label }}</span>
            <span v-if="opt.description" class="search-dropdown-option-desc">{{ opt.description }}</span>
          </button>
        </li>
      </ul>
      <div v-else class="search-dropdown-empty">No results</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
}>()

const emit = defineEmits<{
  toggle: [value: string, checked: boolean]
}>()

const rootRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)
const isOpen = ref(false)
const searchQuery = ref('')
const highlightIdx = ref(0)

const openDirection = computed(() => props.openDirection ?? 'down')
const selected = computed(() => new Set(props.selectedValues))

const displayLabel = computed(() => {
  if (props.selectedValues.length === 0) return props.placeholder || 'Select...'
  if (props.selectedValues.length === 1) {
    const opt = props.options.find((o) => o.value === props.selectedValues[0])
    return opt?.label || props.placeholder || 'Select...'
  }
  return `${props.selectedValues.length} selected`
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

function positionMenuForMobile(): void {
  const menu = menuRef.value
  const root = rootRef.value
  if (!menu || !root || window.innerWidth >= 640) return
  const rect = root.getBoundingClientRect()
  if (openDirection.value === 'up') {
    menu.style.setProperty('bottom', `${window.innerHeight - rect.top + 8}px`, 'important')
    menu.style.setProperty('top', 'auto', 'important')
  } else {
    menu.style.setProperty('top', `${rect.bottom + 8}px`, 'important')
    menu.style.setProperty('bottom', 'auto', 'important')
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
        positionMenuForMobile()
      })
      searchRef.value?.focus()
    })
  }
}

function onSelect(opt: SearchDropdownOption): void {
  emit('toggle', opt.value, !selected.value.has(opt.value))
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
  if (!root) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (root.contains(target)) return
  isOpen.value = false
}

watch(searchQuery, () => { highlightIdx.value = 0 })

onMounted(() => window.addEventListener('pointerdown', onDocumentPointerDown))
onBeforeUnmount(() => window.removeEventListener('pointerdown', onDocumentPointerDown))
</script>

<style scoped>
@reference "tailwindcss";

.search-dropdown {
  @apply relative inline-flex min-w-0;
}

.search-dropdown-trigger {
  @apply inline-flex h-7 items-center gap-1 border-0 bg-transparent p-0 text-sm leading-none text-zinc-500 outline-none transition;
}

.search-dropdown-trigger:disabled {
  @apply cursor-not-allowed text-zinc-500;
}

.search-dropdown-value {
  @apply whitespace-nowrap text-left;
}

.search-dropdown-chevron {
  @apply mt-px h-3.5 w-3.5 shrink-0 text-zinc-500;
}

.search-dropdown-menu-wrap {
  @apply absolute left-0 z-50 w-64;
}

.search-dropdown-menu-wrap-down {
  @apply top-[calc(100%+8px)];
}

.search-dropdown-menu-wrap-up {
  @apply bottom-[calc(100%+8px)];
}

@media (max-width: 639px) {
  .search-dropdown-menu-wrap {
    position: fixed;
    left: 0.5rem;
    right: 0.5rem;
    width: auto;
  }

  .search-dropdown-menu-wrap-up {
    bottom: auto !important;
  }

  .search-dropdown-menu-wrap-down {
    top: auto !important;
  }
}

.search-dropdown-search-wrap {
  @apply p-1.5 border-b border-zinc-100;
}

.search-dropdown-search {
  @apply w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-sm text-zinc-800 outline-none placeholder-zinc-400 transition focus:border-zinc-300 focus:bg-white;
}

.search-dropdown-list {
  @apply m-0 max-h-48 list-none overflow-y-auto p-1;
}

.search-dropdown-option {
  @apply flex w-full items-start gap-1.5 rounded-lg border-0 bg-transparent px-2 py-1.5 text-left text-sm text-zinc-700 transition hover:bg-zinc-100;
}

.search-dropdown-option.is-highlighted {
  @apply bg-zinc-100;
}

.search-dropdown-option.is-selected {
  @apply text-zinc-900;
}

.search-dropdown-option-check {
  @apply w-4 shrink-0 text-center text-xs leading-5 text-emerald-600;
}

.search-dropdown-option-label {
  @apply flex-1 min-w-0 truncate;
}

.search-dropdown-option-desc {
  @apply text-xs text-zinc-400 truncate max-w-32 max-sm:max-w-none max-sm:flex-1;
}

.search-dropdown-empty {
  @apply p-3 text-center text-sm text-zinc-400;
}

.search-dropdown-menu-wrap-up,
.search-dropdown-menu-wrap-down {
  @apply rounded-xl border border-zinc-200 bg-white shadow-lg;
}
</style>
