<template>
  <form class="thread-composer" @submit.prevent="onSubmit('steer')">
    <div class="thread-composer-shell" :class="{ 'thread-composer-shell--no-top-radius': hasQueueAbove }">
      <div v-if="selectedImages.length > 0" class="thread-composer-attachments">
        <div v-for="image in selectedImages" :key="image.id" class="thread-composer-attachment">
          <img class="thread-composer-attachment-image" :src="image.url" :alt="image.name || 'Selected image'" />
          <button
            class="thread-composer-attachment-remove"
            type="button"
            :aria-label="`Remove ${image.name || 'image'}`"
            :disabled="isInteractionDisabled"
            @click="removeImage(image.id)"
          >
            x
          </button>
        </div>
      </div>

      <div v-if="selectedSkills.length > 0" class="thread-composer-skill-chips">
        <span v-for="skill in selectedSkills" :key="skill.path" class="thread-composer-skill-chip">
          <span class="thread-composer-skill-chip-name">{{ skill.name }}</span>
          <button
            class="thread-composer-skill-chip-remove"
            type="button"
            :aria-label="`Remove skill ${skill.name}`"
            @click="removeSkill(skill.path)"
          >×</button>
        </span>
      </div>

      <div class="thread-composer-input-wrap">
        <input
          ref="inputRef"
          v-model="draft"
          class="thread-composer-input"
          type="text"
          :placeholder="placeholderText"
          :disabled="isInteractionDisabled"
          @keydown.enter.exact.prevent="onSubmit('steer')"
          @input="onInputChange"
          @keydown="onInputKeydown"
        />
        <ComposerSkillPicker
          :skills="skillOptions"
          :visible="isSlashMenuOpen"
          :anchor-bottom="44"
          :anchor-left="0"
          @select="onSlashSkillSelect"
          @close="closeSlashMenu"
        />
      </div>

      <div class="thread-composer-controls">
        <div ref="attachMenuRootRef" class="thread-composer-attach">
          <button
            class="thread-composer-attach-trigger"
            type="button"
            aria-label="Add photos & files"
            :disabled="isInteractionDisabled"
            @click="toggleAttachMenu"
          >
            +
          </button>

          <div v-if="isAttachMenuOpen" class="thread-composer-attach-menu">
            <button
              class="thread-composer-attach-item"
              type="button"
              :disabled="isInteractionDisabled"
              @click="triggerPhotoLibrary"
            >
              Add photos & files
            </button>
            <button
              class="thread-composer-attach-item"
              type="button"
              :disabled="isInteractionDisabled"
              @click="triggerCameraCapture"
            >
              Take photo
            </button>
          </div>
        </div>

        <ComposerDropdown
          class="thread-composer-control"
          :model-value="selectedModel"
          :options="modelOptions"
          placeholder="Model"
          open-direction="up"
          :disabled="disabled || !activeThreadId || models.length === 0 || isTurnInProgress"
          @update:model-value="onModelSelect"
        />

        <ComposerSearchDropdown
          class="thread-composer-control"
          :options="skillDropdownOptions"
          :selected-values="selectedSkillPaths"
          placeholder="Skills"
          search-placeholder="Search skills..."
          open-direction="up"
          :disabled="disabled || !activeThreadId || isTurnInProgress || (skills ?? []).length === 0"
          @toggle="onSkillDropdownToggle"
        />

        <ComposerDropdown
          class="thread-composer-control"
          :model-value="selectedReasoningEffort"
          :options="reasoningOptions"
          placeholder="Thinking"
          open-direction="up"
          :disabled="disabled || !activeThreadId || isTurnInProgress"
          @update:model-value="onReasoningEffortSelect"
        />

        <div class="thread-composer-actions">
          <button
            v-if="isDictationSupported && !isTurnInProgress"
            class="thread-composer-mic"
            :class="{ 'thread-composer-mic--active': dictationState !== 'idle' }"
            type="button"
            :aria-label="dictationState === 'idle' ? 'Hold to dictate' : dictationState === 'recording' ? 'Stop dictation' : 'Transcribing...'"
            :title="dictationState === 'idle' ? 'Hold to dictate' : dictationState === 'recording' ? 'Release to transcribe' : 'Transcribing...'"
            :disabled="isInteractionDisabled || dictationState === 'transcribing'"
            @mousedown.prevent="startRecording"
            @mouseup="stopRecording"
            @mouseleave="dictationState === 'recording' && stopRecording()"
            @touchstart.prevent="startRecording"
            @touchend="stopRecording"
          >
            <IconTablerMicrophone class="thread-composer-mic-icon" />
          </button>

          <button
            v-if="isTurnInProgress"
            class="thread-composer-stop"
            type="button"
            aria-label="Stop"
            :disabled="disabled || !activeThreadId || isInterruptingTurn"
            @click="onInterrupt"
          >
            <IconTablerPlayerStopFilled class="thread-composer-stop-icon" />
          </button>
          <button
            class="thread-composer-submit"
            :class="{ 'thread-composer-submit--queue': isTurnInProgress }"
            type="button"
            :aria-label="isTurnInProgress ? 'Queue message' : 'Send message'"
            :title="isTurnInProgress ? 'Queue (button) · Enter to steer' : 'Send'"
            :disabled="!canSubmit"
            @click="onSubmit(isTurnInProgress ? 'queue' : 'steer')"
          >
            <IconTablerArrowUp class="thread-composer-submit-icon" />
          </button>
        </div>
      </div>
    </div>
    <input
      ref="photoLibraryInputRef"
      class="thread-composer-hidden-input"
      type="file"
      accept="image/*"
      multiple
      :disabled="isInteractionDisabled"
      @change="onPhotoLibraryChange"
    />
    <input
      ref="cameraCaptureInputRef"
      class="thread-composer-hidden-input"
      type="file"
      accept="image/*"
      capture="environment"
      :disabled="isInteractionDisabled"
      @change="onCameraCaptureChange"
    />
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ReasoningEffort } from '../../types/codex'
import { useDictation } from '../../composables/useDictation'
import IconTablerArrowUp from '../icons/IconTablerArrowUp.vue'
import IconTablerMicrophone from '../icons/IconTablerMicrophone.vue'
import IconTablerPlayerStopFilled from '../icons/IconTablerPlayerStopFilled.vue'
import ComposerDropdown from './ComposerDropdown.vue'
import ComposerSearchDropdown from './ComposerSearchDropdown.vue'
import ComposerSkillPicker from './ComposerSkillPicker.vue'

type SkillItem = { name: string; description: string; path: string }

const props = defineProps<{
  activeThreadId: string
  models: string[]
  selectedModel: string
  selectedReasoningEffort: ReasoningEffort | ''
  skills?: SkillItem[]
  isTurnInProgress?: boolean
  isInterruptingTurn?: boolean
  disabled?: boolean
  hasQueueAbove?: boolean
}>()

export type SubmitPayload = {
  text: string
  imageUrls: string[]
  skills: Array<{ name: string; path: string }>
  mode: 'steer' | 'queue'
}

const emit = defineEmits<{
  submit: [payload: SubmitPayload]
  interrupt: []
  'update:selected-model': [modelId: string]
  'update:selected-reasoning-effort': [effort: ReasoningEffort | '']
}>()

type SelectedImage = {
  id: string
  name: string
  url: string
}

const draft = ref('')
const selectedImages = ref<SelectedImage[]>([])
const selectedSkills = ref<SkillItem[]>([])

const { state: dictationState, isSupported: isDictationSupported, startRecording, stopRecording } = useDictation({
  onTranscript: (text) => { draft.value = draft.value ? `${draft.value} ${text}` : text },
})
const attachMenuRootRef = ref<HTMLElement | null>(null)
const photoLibraryInputRef = ref<HTMLInputElement | null>(null)
const cameraCaptureInputRef = ref<HTMLInputElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const isAttachMenuOpen = ref(false)
const isSlashMenuOpen = ref(false)

const reasoningOptions: Array<{ value: ReasoningEffort; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'xhigh', label: 'Extra high' },
]
const modelOptions = computed(() =>
  props.models.map((modelId) => ({ value: modelId, label: modelId })),
)

const skillOptions = computed<SkillItem[]>(() => props.skills ?? [])
const selectedSkillPaths = computed(() => selectedSkills.value.map((s) => s.path))
const skillDropdownOptions = computed(() =>
  (props.skills ?? []).map((s) => ({
    value: s.path,
    label: s.name,
    description: s.description,
  })),
)

const canSubmit = computed(() => {
  if (props.disabled) return false
  if (!props.activeThreadId) return false
  return draft.value.trim().length > 0 || selectedImages.value.length > 0
})
const isInteractionDisabled = computed(() => props.disabled || !props.activeThreadId)

const placeholderText = computed(() =>
  props.activeThreadId ? 'Type a message... (/ for skills)' : 'Select a thread to send a message',
)

function onSubmit(mode: 'steer' | 'queue' = 'steer'): void {
  const text = draft.value.trim()
  if (!canSubmit.value) return
  emit('submit', {
    text,
    imageUrls: selectedImages.value.map((image) => image.url),
    skills: selectedSkills.value.map((s) => ({ name: s.name, path: s.path })),
    mode,
  })
  draft.value = ''
  selectedImages.value = []
  selectedSkills.value = []
  isAttachMenuOpen.value = false
  isSlashMenuOpen.value = false
  nextTick(() => inputRef.value?.focus())
}

function onInterrupt(): void {
  emit('interrupt')
}

function onModelSelect(value: string): void {
  emit('update:selected-model', value)
}

function onReasoningEffortSelect(value: string): void {
  emit('update:selected-reasoning-effort', value as ReasoningEffort)
}

function toggleAttachMenu(): void {
  if (isInteractionDisabled.value) return
  isAttachMenuOpen.value = !isAttachMenuOpen.value
}

function triggerPhotoLibrary(): void {
  photoLibraryInputRef.value?.click()
}

function triggerCameraCapture(): void {
  cameraCaptureInputRef.value?.click()
}

function removeImage(id: string): void {
  selectedImages.value = selectedImages.value.filter((image) => image.id !== id)
}

function removeSkill(path: string): void {
  selectedSkills.value = selectedSkills.value.filter((s) => s.path !== path)
}

function addFiles(files: FileList | null): void {
  if (!files || files.length === 0) return
  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/')) continue
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      selectedImages.value.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        url: reader.result,
      })
    }
    reader.readAsDataURL(file)
  }
}

function clearInputValue(inputRefEl: HTMLInputElement | null): void {
  if (inputRefEl) inputRefEl.value = ''
}

function onPhotoLibraryChange(event: Event): void {
  const input = event.target as HTMLInputElement | null
  addFiles(input?.files ?? null)
  clearInputValue(input)
  isAttachMenuOpen.value = false
}

function onCameraCaptureChange(event: Event): void {
  const input = event.target as HTMLInputElement | null
  addFiles(input?.files ?? null)
  clearInputValue(input)
  isAttachMenuOpen.value = false
}

function onInputChange(): void {
  const text = draft.value
  if (text === '/') {
    isSlashMenuOpen.value = true
  } else if (isSlashMenuOpen.value && !text.startsWith('/')) {
    isSlashMenuOpen.value = false
  }
}

function onInputKeydown(event: KeyboardEvent): void {
  if (isSlashMenuOpen.value) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeSlashMenu()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      return
    }
  }
}

function closeSlashMenu(): void {
  isSlashMenuOpen.value = false
  inputRef.value?.focus()
}

function onSlashSkillSelect(skill: SkillItem): void {
  if (!selectedSkills.value.some((s) => s.path === skill.path)) {
    selectedSkills.value = [...selectedSkills.value, skill]
  }
  draft.value = draft.value.startsWith('/') ? '' : draft.value
  isSlashMenuOpen.value = false
  inputRef.value?.focus()
}

function onSkillDropdownToggle(path: string, checked: boolean): void {
  if (checked) {
    const skill = (props.skills ?? []).find((s) => s.path === path)
    if (skill && !selectedSkills.value.some((s) => s.path === path)) {
      selectedSkills.value = [...selectedSkills.value, skill]
    }
  } else {
    selectedSkills.value = selectedSkills.value.filter((s) => s.path !== path)
  }
}

function onDocumentClick(event: MouseEvent): void {
  if (!isAttachMenuOpen.value) return
  const root = attachMenuRootRef.value
  if (!root) return
  const target = event.target as Node | null
  if (!target || root.contains(target)) return
  isAttachMenuOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})

watch(
  () => props.activeThreadId,
  () => {
    draft.value = ''
    selectedImages.value = []
    selectedSkills.value = []
    isAttachMenuOpen.value = false
    isSlashMenuOpen.value = false
  },
)
</script>

<style scoped>
@reference "tailwindcss";

.thread-composer {
  @apply w-full max-w-175 mx-auto px-6;
}

.thread-composer-shell {
  @apply relative rounded-2xl border border-zinc-300 bg-white p-3 shadow-sm;
}

.thread-composer-shell--no-top-radius {
  @apply rounded-t-none border-t-0;
}

.thread-composer-attachments {
  @apply mb-2 flex flex-wrap gap-2;
}

.thread-composer-attachment {
  @apply relative h-14 w-14 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50;
}

.thread-composer-attachment-image {
  @apply h-full w-full object-cover;
}

.thread-composer-attachment-remove {
  @apply absolute right-0.5 top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border-0 bg-black/70 text-xs leading-none text-white;
}

.thread-composer-skill-chips {
  @apply mb-2 flex flex-wrap gap-1.5;
}

.thread-composer-skill-chip {
  @apply inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700;
}

.thread-composer-skill-chip-name {
  @apply font-medium;
}

.thread-composer-skill-chip-remove {
  @apply ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border-0 bg-transparent text-emerald-500 transition hover:bg-emerald-200 hover:text-emerald-700 text-xs leading-none p-0;
}

.thread-composer-input-wrap {
  @apply relative;
}

.thread-composer-input {
  @apply w-full min-w-0 h-11 rounded-xl border-0 bg-transparent px-1 text-sm text-zinc-900 outline-none transition;
}

.thread-composer-input:focus {
  @apply ring-0;
}

.thread-composer-input:disabled {
  @apply bg-zinc-100 text-zinc-500 cursor-not-allowed;
}

.thread-composer-controls {
  @apply mt-3 flex items-center gap-4;
}

.thread-composer-attach {
  @apply relative shrink-0;
}

.thread-composer-attach-trigger {
  @apply inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-none border-0 bg-transparent text-xl leading-none text-zinc-700 transition hover:text-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-400;
}

.thread-composer-attach-menu {
  @apply absolute bottom-11 left-0 z-20 min-w-44 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg;
}

.thread-composer-attach-item {
  @apply block w-full rounded-lg border-0 bg-transparent px-3 py-2 text-left text-sm text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400;
}

.thread-composer-control {
  @apply shrink-0;
}

.thread-composer-actions {
  @apply ml-auto flex items-center gap-2;
}

.thread-composer-mic {
  @apply inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-400;
}

.thread-composer-mic--active {
  @apply bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700;
}

.thread-composer-mic-icon {
  @apply h-5 w-5;
}

.thread-composer-submit {
  @apply inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-zinc-900 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500;
}

.thread-composer-submit--queue {
  @apply bg-amber-600 hover:bg-amber-700;
}

.thread-composer-submit-icon {
  @apply h-5 w-5;
}

.thread-composer-stop {
  @apply inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-zinc-900 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500;
}

.thread-composer-stop-icon {
  @apply h-5 w-5;
}

.thread-composer-hidden-input {
  @apply hidden;
}
</style>
