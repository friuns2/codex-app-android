<template>
  <div ref="rootRef" class="composer-dropdown">
    <button
      class="composer-dropdown-trigger"
      type="button"
      :disabled="disabled"
      @click="onToggle"
    >
      <component :is="selectedPrefixIcon" v-if="selectedPrefixIcon" class="composer-dropdown-prefix-icon" />
      <span class="composer-dropdown-value">{{ selectedLabel }}</span>
      <IconTablerChevronDown class="composer-dropdown-chevron" />
    </button>

    <div
      v-if="isOpen"
      class="composer-dropdown-menu-wrap"
      :class="{
        'composer-dropdown-menu-wrap-up': openDirection === 'up',
        'composer-dropdown-menu-wrap-down': openDirection === 'down',
      }"
    >
      <div class="composer-dropdown-menu">
        <div v-if="enableSearch" class="composer-dropdown-search-wrap">
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            class="composer-dropdown-search-input"
            type="text"
            :placeholder="searchPlaceholderText"
            @keydown.esc.prevent="onEscapeSearch"
          />
        </div>

        <ul class="composer-dropdown-options" role="listbox">
          <li v-for="option in filteredOptions" :key="option.value">
            <button
              class="composer-dropdown-option"
              :class="{ 'is-selected': option.value === modelValue }"
              type="button"
              @click="onSelect(option.value)"
            >
              {{ option.label }}
            </button>
          </li>
          <li v-if="filteredOptions.length === 0" class="composer-dropdown-empty">
            No matching projects
          </li>
        </ul>

        <div v-if="showAddAction" class="composer-dropdown-add-wrap">
          <template v-if="isAdding">
            <input
              ref="addInputRef"
              v-model="addDraft"
              class="composer-dropdown-add-input"
              type="text"
              :placeholder="addPlaceholderText"
              @keydown.enter.prevent="onConfirmAdd"
              @keydown.esc.prevent="onCancelAdd"
            />
            <div class="composer-dropdown-add-actions">
              <button type="button" class="composer-dropdown-add-btn" @click="onConfirmAdd">Open</button>
              <button type="button" class="composer-dropdown-add-btn" @click="onCancelAdd">Cancel</button>
            </div>
          </template>
          <button
            v-else
            type="button"
            class="composer-dropdown-add"
            @click="onStartAdd"
          >
            {{ addActionLabelText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import IconTablerChevronDown from '../icons/IconTablerChevronDown.vue'

type DropdownOption = {
  value: string
  label: string
}

const props = defineProps<{
  modelValue: string
  options: DropdownOption[]
  placeholder?: string
  disabled?: boolean
  selectedPrefixIcon?: Component | null
  openDirection?: 'up' | 'down'
  enableSearch?: boolean
  searchPlaceholder?: string
  showAddAction?: boolean
  addActionLabel?: string
  addActionMode?: 'inline' | 'event'
  defaultAddValue?: string
  addPlaceholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  add: [value: string]
  'add-action': []
}>()

const rootRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const addInputRef = ref<HTMLInputElement | null>(null)
const isOpen = ref(false)
const searchQuery = ref('')
const isAdding = ref(false)
const addDraft = ref('')

const selectedLabel = computed(() => {
  const selected = props.options.find((option) => option.value === props.modelValue)
  if (selected) return selected.label
  return props.placeholder?.trim() || ''
})

const openDirection = computed(() => props.openDirection ?? 'down')
const enableSearch = computed(() => props.enableSearch === true)
const showAddAction = computed(() => props.showAddAction === true)
const searchPlaceholderText = computed(() => props.searchPlaceholder?.trim() || 'Quick search projects')
const addActionLabelText = computed(() => props.addActionLabel?.trim() || 'Add new project')
const addActionMode = computed(() => props.addActionMode ?? 'inline')
const addPlaceholderText = computed(() => props.addPlaceholder?.trim() || 'Project name or absolute path')
const filteredOptions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return props.options
  return props.options.filter((option) => {
    return option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query)
  })
})

function onToggle(): void {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

function onSelect(value: string): void {
  emit('update:modelValue', value)
  isOpen.value = false
  searchQuery.value = ''
}

function onStartAdd(): void {
  if (addActionMode.value === 'event') {
    emit('add-action')
    isOpen.value = false
    searchQuery.value = ''
    return
  }
  isAdding.value = true
  addDraft.value = props.defaultAddValue?.trim() || ''
  nextTick(() => addInputRef.value?.focus())
}

function onEscapeSearch(): void {
  if (searchQuery.value.length > 0) {
    searchQuery.value = ''
    return
  }
  isOpen.value = false
}

function onConfirmAdd(): void {
  const value = addDraft.value.trim()
  if (!value) return
  emit('add', value)
  isAdding.value = false
  addDraft.value = ''
  isOpen.value = false
  searchQuery.value = ''
}

function onCancelAdd(): void {
  isAdding.value = false
  addDraft.value = ''
  isOpen.value = false
  searchQuery.value = ''
}

function onDocumentPointerDown(event: PointerEvent): void {
  if (!isOpen.value) return
  const root = rootRef.value
  if (!root) return

  const target = event.target
  if (!(target instanceof Node)) return
  if (root.contains(target)) return
  isOpen.value = false
  searchQuery.value = ''
  isAdding.value = false
  addDraft.value = ''
}

watch(isOpen, (open) => {
  if (!open) {
    isAdding.value = false
    addDraft.value = ''
    return
  }
  if (!enableSearch.value) return
  nextTick(() => searchInputRef.value?.focus())
})

onMounted(() => {
  window.addEventListener('pointerdown', onDocumentPointerDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onDocumentPointerDown)
})
</script>

<style scoped>
@reference "tailwindcss";

.composer-dropdown {
  @apply relative inline-flex min-w-0;
}

.composer-dropdown-trigger {
  @apply inline-flex min-h-7 min-w-0 items-center gap-1 border-0 bg-transparent px-0 py-0.5 text-sm leading-tight text-zinc-500 outline-none transition;
}

.composer-dropdown-prefix-icon {
  @apply h-3.5 w-3.5 shrink-0 text-amber-500;
}

.composer-dropdown-trigger:disabled {
  @apply cursor-not-allowed text-zinc-500;
}

.composer-dropdown-value {
  @apply whitespace-nowrap text-left truncate pb-px;
}

.composer-dropdown-chevron {
  @apply mt-px h-3.5 w-3.5 shrink-0 text-zinc-500;
}

.composer-dropdown-menu-wrap {
  @apply absolute left-0 z-50;
}

.composer-dropdown-menu-wrap-down {
  @apply top-[calc(100%+8px)];
}

.composer-dropdown-menu-wrap-up {
  @apply bottom-[calc(100%+8px)];
}

.composer-dropdown-menu {
  @apply m-0 min-w-56 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg;
}

.composer-dropdown-search-wrap {
  @apply px-1 pb-1;
}

.composer-dropdown-search-input {
  @apply w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 outline-none transition focus:border-zinc-400;
}

.composer-dropdown-options {
  @apply m-0 max-h-56 list-none overflow-y-auto p-0;
}

.composer-dropdown-option {
  @apply flex w-full items-center rounded-lg border-0 bg-transparent px-2 py-1.5 text-left text-sm text-zinc-700 transition hover:bg-zinc-100;
}

.composer-dropdown-option.is-selected {
  @apply bg-zinc-100;
}

.composer-dropdown-empty {
  @apply px-2 py-1.5 text-xs text-zinc-500;
}

.composer-dropdown-add {
  @apply mt-1 flex w-full items-center rounded-lg border-0 border-t border-zinc-200 bg-transparent px-2 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-100;
}

.composer-dropdown-add-wrap {
  @apply mt-1 border-t border-zinc-200 pt-1;
}

.composer-dropdown-add-input {
  @apply w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 outline-none transition focus:border-zinc-400;
}

.composer-dropdown-add-actions {
  @apply mt-1 flex items-center gap-1;
}

.composer-dropdown-add-btn {
  @apply rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-700 transition hover:bg-zinc-100;
}
</style>
