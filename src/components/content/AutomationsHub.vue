<template>
  <div class="automations-hub">
    <div class="automations-hub-header">
      <div>
        <h2 class="automations-hub-title">Automations</h2>
        <p class="automations-hub-subtitle">Run recurring Codex tasks in the background with official `codex exec`.</p>
      </div>
      <div class="automations-hub-actions">
        <button class="automations-hub-button" type="button" :disabled="loading" @click="refreshAll">
          {{ loading ? 'Refreshing…' : 'Refresh' }}
        </button>
        <button class="automations-hub-button is-primary" type="button" @click="startCreate">
          New automation
        </button>
      </div>
    </div>

    <div v-if="toast" class="automations-hub-toast" :class="toast.type === 'error' ? 'is-error' : 'is-success'">
      {{ toast.text }}
    </div>

    <div class="automations-hub-capability-row">
      <span class="automations-hub-capability is-enabled">Local scheduler</span>
      <span class="automations-hub-capability is-enabled">`codex exec` runner</span>
      <span class="automations-hub-capability">{{ defaults.model || 'default model' }}</span>
    </div>

    <div class="automations-hub-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="automations-hub-tab"
        :class="{ 'is-active': activeTab === tab.value }"
        type="button"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeTab === 'triage'" class="automations-hub-split">
      <section class="automations-hub-panel automations-hub-panel--list">
        <div class="automations-hub-section-header">
          <h3 class="automations-hub-section-title">Inbox</h3>
          <div class="automations-hub-pill-row">
            <button
              v-for="filter in triageFilters"
              :key="filter.value"
              class="automations-hub-pill"
              :class="{ 'is-active': triageFilter === filter.value }"
              type="button"
              @click="triageFilter = filter.value"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>

        <div v-if="filteredRuns.length === 0" class="automations-hub-empty">
          No triage items for the current filter.
        </div>

        <div v-else class="automations-hub-run-list">
          <button
            v-for="run in filteredRuns"
            :key="run.id"
            class="automations-hub-run-card"
            :class="{ 'is-active': selectedRunId === run.id, 'is-unread': run.unread }"
            type="button"
            @click="selectedRunId = run.id"
          >
            <div class="automations-hub-run-top">
              <span class="automations-hub-run-title">{{ run.automationTitle }}</span>
              <span class="automations-hub-run-status" :class="`is-${run.status}`">{{ runStatusLabel(run) }}</span>
            </div>
            <p class="automations-hub-run-meta">{{ shortPath(run.projectPath) }} · {{ formatDateTime(run.startedAtIso) }}</p>
            <p class="automations-hub-run-summary">{{ run.summary || (run.error || 'Run finished.') }}</p>
          </button>
        </div>
      </section>

      <section class="automations-hub-panel automations-hub-panel--detail">
        <template v-if="selectedRun">
          <div class="automations-hub-section-header">
            <div>
              <h3 class="automations-hub-section-title">{{ selectedRun.automationTitle }}</h3>
              <p class="automations-hub-detail-meta">{{ shortPath(selectedRun.projectPath) }} · {{ runStatusLabel(selectedRun) }}</p>
            </div>
            <div class="automations-hub-inline-actions">
              <button
                v-if="selectedRun.unread"
                class="automations-hub-inline-link"
                type="button"
                @click="markRunRead(selectedRun.id)"
              >
                Mark read
              </button>
              <button
                class="automations-hub-inline-link"
                type="button"
                @click="setRunArchived(selectedRun.id, !selectedRun.archived)"
              >
                {{ selectedRun.archived ? 'Restore' : 'Archive' }}
              </button>
              <button class="automations-hub-inline-link" type="button" @click="openRunWorkspace(selectedRun)">
                Open project
              </button>
            </div>
          </div>

          <div class="automations-hub-detail-grid">
            <div class="automations-hub-stat">
              <span class="automations-hub-stat-label">Started</span>
              <span class="automations-hub-stat-value">{{ formatDateTime(selectedRun.startedAtIso) }}</span>
            </div>
            <div class="automations-hub-stat">
              <span class="automations-hub-stat-label">Completed</span>
              <span class="automations-hub-stat-value">{{ selectedRun.completedAtIso ? formatDateTime(selectedRun.completedAtIso) : 'Running…' }}</span>
            </div>
            <div class="automations-hub-stat">
              <span class="automations-hub-stat-label">Mode</span>
              <span class="automations-hub-stat-value">{{ selectedRun.effectiveRunMode }}</span>
            </div>
            <div class="automations-hub-stat">
              <span class="automations-hub-stat-label">Model</span>
              <span class="automations-hub-stat-value">{{ selectedRun.model || defaults.model || 'default' }}</span>
            </div>
          </div>

          <p v-if="selectedRun.error" class="automations-hub-callout is-error">{{ selectedRun.error }}</p>
          <p v-else-if="selectedRun.archived" class="automations-hub-callout">Auto-archived because the run did not report notable findings.</p>

          <pre class="automations-hub-output">{{ selectedRun.finalMessage || 'No final message recorded yet.' }}</pre>
        </template>
        <div v-else class="automations-hub-empty">Select a triage item to inspect the latest run output.</div>
      </section>
    </div>

    <div v-else class="automations-hub-split">
      <section class="automations-hub-panel automations-hub-panel--list">
        <div class="automations-hub-section-header">
          <h3 class="automations-hub-section-title">Automations</h3>
          <span class="automations-hub-section-count">{{ automations.length }}</span>
        </div>

        <div v-if="automations.length === 0" class="automations-hub-empty">
          No automations yet. Create one to schedule recurring work.
        </div>

        <div v-else class="automations-hub-automation-list">
          <article
            v-for="automation in automations"
            :key="automation.id"
            class="automations-hub-automation-card"
            :class="{ 'is-selected': editingId === automation.id }"
          >
            <div class="automations-hub-run-top">
              <span class="automations-hub-run-title">{{ automation.title }}</span>
              <span class="automations-hub-run-status" :class="automation.enabled ? 'is-completed' : 'is-archived'">
                {{ automation.enabled ? 'Enabled' : 'Paused' }}
              </span>
            </div>
            <p class="automations-hub-run-meta">
              {{ automation.projectPaths.length }} project{{ automation.projectPaths.length === 1 ? '' : 's' }} · {{ automation.runMode }}
            </p>
            <p class="automations-hub-run-summary">{{ automation.prompt }}</p>
            <div class="automations-hub-chip-row">
              <span class="automations-hub-chip">cron: {{ automation.cronExpression }}</span>
              <span v-if="automation.nextRunAtIso" class="automations-hub-chip">next: {{ formatRelative(automation.nextRunAtIso) }}</span>
              <span v-if="automation.skillNames.length > 0" class="automations-hub-chip">{{ automation.skillNames.length }} skills</span>
            </div>
            <div class="automations-hub-inline-actions">
              <button class="automations-hub-inline-link" type="button" @click="startEdit(automation)">Edit</button>
              <button class="automations-hub-inline-link" type="button" :disabled="runningAutomationId === automation.id" @click="triggerRun(automation.id)">
                {{ runningAutomationId === automation.id ? 'Running…' : 'Run now' }}
              </button>
              <button class="automations-hub-inline-link" type="button" @click="toggleAutomation(automation)">
                {{ automation.enabled ? 'Pause' : 'Enable' }}
              </button>
              <button class="automations-hub-inline-link is-danger" type="button" :disabled="deletingAutomationId === automation.id" @click="removeAutomation(automation.id)">
                {{ deletingAutomationId === automation.id ? 'Deleting…' : 'Delete' }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <section class="automations-hub-panel automations-hub-panel--detail">
        <div class="automations-hub-section-header">
          <div>
            <h3 class="automations-hub-section-title">{{ editingId ? 'Edit automation' : 'New automation' }}</h3>
            <p class="automations-hub-detail-meta">Matches the official app model: recurring background runs with project-scoped context.</p>
          </div>
          <button v-if="editingId" class="automations-hub-inline-link" type="button" @click="startCreate">Create new instead</button>
        </div>

        <div class="automations-hub-form">
          <label class="automations-hub-field">
            <span class="automations-hub-label">Title</span>
            <input v-model="form.title" class="automations-hub-input" type="text" placeholder="Weekly PR triage" />
          </label>

          <label class="automations-hub-field">
            <span class="automations-hub-label">Prompt</span>
            <textarea
              v-model="form.prompt"
              class="automations-hub-textarea"
              rows="8"
              placeholder="Review incoming pull requests and report only issues that need attention."
            />
          </label>

          <div class="automations-hub-field">
            <span class="automations-hub-label">Projects</span>
            <ComposerSearchDropdown
              class="automations-hub-picker"
              :options="projectDropdownOptions"
              :selected-values="form.projectPaths"
              placeholder="Select projects"
              search-placeholder="Search projects..."
              @toggle="onProjectToggle"
            />
          </div>

          <div class="automations-hub-field-grid">
            <label class="automations-hub-field">
              <span class="automations-hub-label">Run mode</span>
              <ComposerDropdown
                class="automations-hub-dropdown"
                :model-value="form.runMode"
                :options="runModeOptions"
                placeholder="Run mode"
                @update:model-value="onRunModeSelect"
              />
            </label>

            <label class="automations-hub-field">
              <span class="automations-hub-label">Schedule</span>
              <ComposerDropdown
                class="automations-hub-dropdown"
                :model-value="form.schedulePreset"
                :options="presetOptions"
                placeholder="Schedule"
                @update:model-value="onPresetChange"
              />
            </label>
          </div>

          <label class="automations-hub-field">
            <span class="automations-hub-label">Cron</span>
            <input v-model="form.cronExpression" class="automations-hub-input" type="text" placeholder="0 9 * * 1" />
          </label>

          <div class="automations-hub-field-grid">
            <label class="automations-hub-field">
              <span class="automations-hub-label">Model</span>
              <ComposerDropdown
                class="automations-hub-dropdown"
                :model-value="form.model"
                :options="modelOptions"
                placeholder="Default model"
                @update:model-value="(value) => form.model = value"
              />
            </label>

            <label class="automations-hub-field">
              <span class="automations-hub-label">Thinking</span>
              <ComposerDropdown
                class="automations-hub-dropdown"
                :model-value="form.reasoningEffort"
                :options="reasoningOptions"
                placeholder="Default thinking"
                @update:model-value="onReasoningEffortSelect"
              />
            </label>
          </div>

          <div class="automations-hub-field-grid">
            <label class="automations-hub-field">
              <span class="automations-hub-label">Sandbox</span>
              <ComposerDropdown
                class="automations-hub-dropdown"
                :model-value="form.sandboxMode"
                :options="sandboxOptions"
                placeholder="Default sandbox"
                @update:model-value="onSandboxModeSelect"
              />
            </label>

            <div class="automations-hub-field">
              <span class="automations-hub-label">Skills</span>
              <ComposerSearchDropdown
                class="automations-hub-picker"
                :options="skillDropdownOptions"
                :selected-values="form.skillNames"
                placeholder="Optional skills"
                search-placeholder="Search skills..."
                @toggle="onSkillToggle"
              />
            </div>
          </div>

          <label class="automations-hub-switch">
            <input v-model="form.autoArchiveEmpty" type="checkbox" />
            <span>Archive runs automatically when the result looks empty or “nothing to report”.</span>
          </label>

          <label class="automations-hub-switch">
            <input v-model="form.enabled" type="checkbox" />
            <span>Enable immediately after saving.</span>
          </label>

          <div class="automations-hub-inline-actions">
            <button class="automations-hub-button is-primary" type="button" :disabled="saving" @click="saveAutomation">
              {{ saving ? 'Saving…' : editingId ? 'Save automation' : 'Create automation' }}
            </button>
            <button v-if="editingId" class="automations-hub-button" type="button" @click="startCreate">Cancel edit</button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ComposerDropdown from './ComposerDropdown.vue'
import ComposerSearchDropdown from './ComposerSearchDropdown.vue'
import {
  createAutomation,
  deleteAutomation,
  getAutomationsState,
  getAvailableModelIds,
  getSkillsList,
  getWorkspaceRootsState,
  markAutomationRunRead,
  runAutomationNow,
  setAutomationEnabled,
  setAutomationRunArchived,
  type UiAutomation,
  type UiAutomationDefaults,
  type UiAutomationRun,
  updateAutomation,
} from '../../api/codexGateway'
import type { ReasoningEffort } from '../../types/codex'
import { buildFilesRouteLocation } from '../../utils/fileExplorer'

const tabs = [
  { value: 'triage', label: 'Triage' },
  { value: 'automations', label: 'Automations' },
] as const

const triageFilters = [
  { value: 'unread', label: 'Unread' },
  { value: 'active', label: 'Needs attention' },
  { value: 'all', label: 'All' },
  { value: 'archived', label: 'Archived' },
] as const

const router = useRouter()
const activeTab = ref<(typeof tabs)[number]['value']>('triage')
const triageFilter = ref<(typeof triageFilters)[number]['value']>('unread')
const loading = ref(false)
const saving = ref(false)
const runningAutomationId = ref('')
const deletingAutomationId = ref('')
const editingId = ref('')
const toast = ref<{ text: string; type: 'success' | 'error' } | null>(null)
const automations = ref<UiAutomation[]>([])
const runs = ref<UiAutomationRun[]>([])
const defaults = ref<UiAutomationDefaults>({ model: '', reasoningEffort: '', sandboxMode: '' })
const models = ref<string[]>([])
const skills = ref<Array<{ name: string; description: string; path: string }>>([])
const projects = ref<Array<{ path: string; label: string }>>([])
const selectedRunId = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null
let toastTimer: ReturnType<typeof setTimeout> | null = null

const form = reactive({
  title: '',
  prompt: '',
  projectPaths: [] as string[],
  skillNames: [] as string[],
  enabled: true,
  runMode: 'worktree' as 'local' | 'worktree',
  schedulePreset: 'weekly' as 'hourly' | 'daily' | 'weekly' | 'custom',
  cronExpression: '0 9 * * 1',
  model: '',
  reasoningEffort: '' as ReasoningEffort | '',
  sandboxMode: 'default' as 'default' | 'read-only' | 'workspace-write' | 'danger-full-access',
  autoArchiveEmpty: true,
})

const presetOptions = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
]

const runModeOptions = [
  { value: 'local', label: 'Local' },
  { value: 'worktree', label: 'Worktree' },
]

const sandboxOptions = [
  { value: 'default', label: 'Use defaults' },
  { value: 'read-only', label: 'Read-only' },
  { value: 'workspace-write', label: 'Workspace write' },
  { value: 'danger-full-access', label: 'Danger full access' },
]

const reasoningOptions = [
  { value: '', label: 'Use defaults' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'xhigh', label: 'Extra high' },
]

const modelOptions = computed(() => [
  { value: '', label: 'Use defaults' },
  ...models.value.map((model) => ({ value: model, label: model })),
])

const projectDropdownOptions = computed(() =>
  projects.value.map((project) => ({
    value: project.path,
    label: project.label,
    description: project.path,
  })),
)

const skillDropdownOptions = computed(() =>
  skills.value.map((skill) => ({
    value: skill.name,
    label: skill.name,
    description: skill.description,
  })),
)

const filteredRuns = computed(() => {
  if (triageFilter.value === 'unread') {
    return runs.value.filter((run) => run.unread)
  }
  if (triageFilter.value === 'active') {
    return runs.value.filter((run) => !run.archived && (run.status === 'failed' || run.hasFindings || run.unread))
  }
  if (triageFilter.value === 'archived') {
    return runs.value.filter((run) => run.archived)
  }
  return runs.value
})

const selectedRun = computed(() =>
  filteredRuns.value.find((run) => run.id === selectedRunId.value)
    ?? runs.value.find((run) => run.id === selectedRunId.value)
    ?? filteredRuns.value[0]
    ?? null,
)

function showToast(text: string, type: 'success' | 'error' = 'success'): void {
  toast.value = { text, type }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 3200)
}

function resetForm(): void {
  editingId.value = ''
  form.title = ''
  form.prompt = ''
  form.projectPaths = projects.value[0] ? [projects.value[0].path] : []
  form.skillNames = []
  form.enabled = true
  form.runMode = 'worktree'
  form.schedulePreset = 'weekly'
  form.cronExpression = '0 9 * * 1'
  form.model = ''
  form.reasoningEffort = ''
  form.sandboxMode = 'default'
  form.autoArchiveEmpty = true
}

function hydrateForm(automation: UiAutomation): void {
  editingId.value = automation.id
  form.title = automation.title
  form.prompt = automation.prompt
  form.projectPaths = [...automation.projectPaths]
  form.skillNames = [...automation.skillNames]
  form.enabled = automation.enabled
  form.runMode = automation.runMode
  form.schedulePreset = automation.schedulePreset
  form.cronExpression = automation.cronExpression
  form.model = automation.model
  form.reasoningEffort = automation.reasoningEffort as ReasoningEffort | ''
  form.sandboxMode = automation.sandboxMode
  form.autoArchiveEmpty = automation.autoArchiveEmpty
}

async function refreshAll(): Promise<void> {
  loading.value = true
  try {
    const [automationState, workspaceState, modelIds, installedSkills] = await Promise.all([
      getAutomationsState(),
      getWorkspaceRootsState(),
      getAvailableModelIds().catch(() => []),
      getSkillsList().catch(() => []),
    ])

    automations.value = automationState.automations
    runs.value = automationState.runs
    defaults.value = automationState.defaults
    models.value = modelIds
    skills.value = installedSkills
    projects.value = workspaceState.order.map((path) => ({
      path,
      label: workspaceState.labels[path] || shortPath(path),
    }))

    if (!editingId.value) {
      resetForm()
    }
    if (!selectedRunId.value && automationState.runs[0]) {
      selectedRunId.value = automationState.runs[0].id
    }
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Failed to refresh automations', 'error')
  } finally {
    loading.value = false
  }
}

function onPresetChange(value: string): void {
  const preset = value === 'hourly' || value === 'daily' || value === 'weekly' ? value : 'custom'
  form.schedulePreset = preset
  if (preset === 'hourly') form.cronExpression = '0 * * * *'
  if (preset === 'daily') form.cronExpression = '0 9 * * *'
  if (preset === 'weekly') form.cronExpression = '0 9 * * 1'
}

function onRunModeSelect(value: string): void {
  form.runMode = value === 'local' ? 'local' : 'worktree'
}

function onSandboxModeSelect(value: string): void {
  if (value === 'read-only' || value === 'workspace-write' || value === 'danger-full-access') {
    form.sandboxMode = value
    return
  }
  form.sandboxMode = 'default'
}

function onReasoningEffortSelect(value: string): void {
  if (value === 'minimal' || value === 'low' || value === 'medium' || value === 'high' || value === 'xhigh') {
    form.reasoningEffort = value
    return
  }
  form.reasoningEffort = ''
}

function onProjectToggle(value: string, checked: boolean): void {
  if (checked) {
    if (!form.projectPaths.includes(value)) form.projectPaths = [...form.projectPaths, value]
    return
  }
  form.projectPaths = form.projectPaths.filter((item) => item !== value)
}

function onSkillToggle(value: string, checked: boolean): void {
  if (checked) {
    if (!form.skillNames.includes(value)) form.skillNames = [...form.skillNames, value]
    return
  }
  form.skillNames = form.skillNames.filter((item) => item !== value)
}

function startCreate(): void {
  activeTab.value = 'automations'
  resetForm()
}

function startEdit(automation: UiAutomation): void {
  activeTab.value = 'automations'
  hydrateForm(automation)
}

async function saveAutomation(): Promise<void> {
  saving.value = true
  try {
    const payload = {
      title: form.title,
      prompt: form.prompt,
      projectPaths: form.projectPaths,
      skillNames: form.skillNames,
      enabled: form.enabled,
      runMode: form.runMode,
      schedulePreset: form.schedulePreset,
      cronExpression: form.cronExpression,
      model: form.model,
      reasoningEffort: form.reasoningEffort,
      sandboxMode: form.sandboxMode,
      autoArchiveEmpty: form.autoArchiveEmpty,
    }
    if (editingId.value) {
      await updateAutomation(editingId.value, payload)
      showToast('Automation updated.')
    } else {
      await createAutomation(payload)
      showToast('Automation created.')
    }
    await refreshAll()
    activeTab.value = 'automations'
    resetForm()
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Failed to save automation', 'error')
  } finally {
    saving.value = false
  }
}

async function triggerRun(id: string): Promise<void> {
  runningAutomationId.value = id
  try {
    await runAutomationNow(id)
    showToast('Automation started.')
    await refreshAll()
    activeTab.value = 'triage'
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Failed to start automation', 'error')
  } finally {
    runningAutomationId.value = ''
  }
}

async function toggleAutomation(automation: UiAutomation): Promise<void> {
  try {
    await setAutomationEnabled(automation.id, !automation.enabled)
    showToast(automation.enabled ? 'Automation paused.' : 'Automation enabled.')
    await refreshAll()
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Failed to toggle automation', 'error')
  }
}

async function removeAutomation(id: string): Promise<void> {
  deletingAutomationId.value = id
  try {
    await deleteAutomation(id)
    showToast('Automation deleted.')
    await refreshAll()
    if (editingId.value === id) resetForm()
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Failed to delete automation', 'error')
  } finally {
    deletingAutomationId.value = ''
  }
}

async function markRunRead(id: string): Promise<void> {
  try {
    await markAutomationRunRead(id)
    await refreshAll()
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Failed to mark run as read', 'error')
  }
}

async function setRunArchived(id: string, archived: boolean): Promise<void> {
  try {
    await setAutomationRunArchived(id, archived)
    await refreshAll()
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Failed to update triage item', 'error')
  }
}

function shortPath(path: string): string {
  const normalized = path.replace(/\/+$/, '')
  const segments = normalized.split('/').filter(Boolean)
  return segments[segments.length - 1] || path
}

function formatDateTime(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatRelative(value: string): string {
  if (!value) return ''
  const diffMs = new Date(value).getTime() - Date.now()
  const totalMinutes = Math.round(diffMs / 60000)
  if (Math.abs(totalMinutes) < 60) return `${totalMinutes}m`
  const totalHours = Math.round(totalMinutes / 60)
  if (Math.abs(totalHours) < 48) return `${totalHours}h`
  const totalDays = Math.round(totalHours / 24)
  return `${totalDays}d`
}

function runStatusLabel(run: UiAutomationRun): string {
  if (run.status === 'running') return 'Running'
  if (run.status === 'failed') return 'Failed'
  if (run.status === 'archived') return 'Archived'
  if (run.hasFindings) return 'Findings'
  return 'Completed'
}

function openRunWorkspace(run: UiAutomationRun): void {
  const targetPath = run.worktreeCwd || run.projectPath
  void router.push(buildFilesRouteLocation(targetPath, { cwd: targetPath }))
}

watch(selectedRun, (run) => {
  if (run && selectedRunId.value !== run.id) {
    selectedRunId.value = run.id
  }
})

onMounted(() => {
  void refreshAll()
  pollTimer = setInterval(() => {
    void refreshAll()
  }, 15_000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<style scoped>
@reference "tailwindcss";

.automations-hub {
  @apply mx-auto flex h-full w-full max-w-7xl flex-col gap-4 overflow-y-auto p-3 sm:p-6;
}

.automations-hub-header {
  @apply flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between;
}

.automations-hub-title {
  @apply m-0 text-2xl font-semibold text-zinc-900;
}

.automations-hub-subtitle {
  @apply m-0 text-sm text-zinc-500;
}

.automations-hub-actions {
  @apply flex flex-wrap gap-2;
}

.automations-hub-button {
  @apply inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60;
}

.automations-hub-button.is-primary {
  @apply border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800;
}

.automations-hub-toast {
  @apply rounded-2xl border px-3 py-2 text-sm font-medium;
}

.automations-hub-toast.is-success {
  @apply border-emerald-200 bg-emerald-50 text-emerald-700;
}

.automations-hub-toast.is-error {
  @apply border-rose-200 bg-rose-50 text-rose-700;
}

.automations-hub-capability-row {
  @apply flex flex-wrap gap-2;
}

.automations-hub-capability {
  @apply rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500;
}

.automations-hub-capability.is-enabled {
  @apply border-sky-200 bg-sky-50 text-sky-700;
}

.automations-hub-tabs {
  @apply flex flex-wrap gap-2;
}

.automations-hub-tab {
  @apply rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50;
}

.automations-hub-tab.is-active {
  @apply border-zinc-900 bg-zinc-900 text-white;
}

.automations-hub-split {
  @apply grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)];
}

.automations-hub-panel {
  @apply flex min-h-0 flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-4;
}

.automations-hub-panel--list,
.automations-hub-panel--detail {
  @apply overflow-hidden;
}

.automations-hub-section-header {
  @apply flex flex-wrap items-start justify-between gap-3;
}

.automations-hub-section-title {
  @apply m-0 text-sm font-semibold text-zinc-900;
}

.automations-hub-section-count {
  @apply rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-500;
}

.automations-hub-pill-row {
  @apply flex flex-wrap gap-2;
}

.automations-hub-pill {
  @apply rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-500 transition hover:bg-zinc-100;
}

.automations-hub-pill.is-active {
  @apply border-zinc-900 bg-zinc-900 text-white;
}

.automations-hub-empty {
  @apply rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500;
}

.automations-hub-run-list,
.automations-hub-automation-list {
  @apply flex min-h-0 flex-col gap-3 overflow-y-auto pr-1;
}

.automations-hub-run-card,
.automations-hub-automation-card {
  @apply flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-left transition hover:border-zinc-300 hover:bg-white;
}

.automations-hub-run-card.is-active,
.automations-hub-automation-card.is-selected {
  @apply border-zinc-900 bg-white shadow-sm;
}

.automations-hub-run-card.is-unread {
  @apply border-sky-300;
}

.automations-hub-run-top {
  @apply flex flex-wrap items-center justify-between gap-2;
}

.automations-hub-run-title {
  @apply text-sm font-semibold text-zinc-900;
}

.automations-hub-run-status {
  @apply rounded-full border px-2 py-0.5 text-[10px] font-medium;
}

.automations-hub-run-status.is-running {
  @apply border-amber-200 bg-amber-50 text-amber-700;
}

.automations-hub-run-status.is-failed {
  @apply border-rose-200 bg-rose-50 text-rose-700;
}

.automations-hub-run-status.is-archived {
  @apply border-zinc-200 bg-zinc-100 text-zinc-500;
}

.automations-hub-run-status.is-completed {
  @apply border-emerald-200 bg-emerald-50 text-emerald-700;
}

.automations-hub-run-meta,
.automations-hub-detail-meta {
  @apply m-0 text-xs text-zinc-500;
}

.automations-hub-run-summary {
  @apply m-0 text-sm leading-6 text-zinc-600 line-clamp-3;
}

.automations-hub-inline-actions {
  @apply flex flex-wrap gap-2;
}

.automations-hub-inline-link {
  @apply inline-flex w-fit items-center rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50;
}

.automations-hub-inline-link.is-danger {
  @apply text-rose-700;
}

.automations-hub-detail-grid {
  @apply grid gap-3 sm:grid-cols-2;
}

.automations-hub-stat {
  @apply rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2;
}

.automations-hub-stat-label {
  @apply block text-[11px] uppercase tracking-[0.08em] text-zinc-500;
}

.automations-hub-stat-value {
  @apply mt-1 block text-sm font-medium text-zinc-900;
}

.automations-hub-callout {
  @apply m-0 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600;
}

.automations-hub-callout.is-error {
  @apply border-rose-200 bg-rose-50 text-rose-700;
}

.automations-hub-output {
  @apply min-h-0 flex-1 overflow-auto rounded-2xl border border-zinc-200 bg-zinc-950 p-4 text-xs leading-6 text-zinc-100;
}

.automations-hub-chip-row {
  @apply flex flex-wrap gap-2;
}

.automations-hub-chip {
  @apply rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-600;
}

.automations-hub-form {
  @apply flex min-h-0 flex-col gap-3 overflow-y-auto pr-1;
}

.automations-hub-field {
  @apply flex flex-col gap-1.5;
}

.automations-hub-field-grid {
  @apply grid gap-3 md:grid-cols-2;
}

.automations-hub-label {
  @apply text-xs font-medium uppercase tracking-[0.08em] text-zinc-500;
}

.automations-hub-input,
.automations-hub-textarea {
  @apply w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-300 focus:bg-white;
}

.automations-hub-textarea {
  @apply resize-y leading-6;
}

.automations-hub-picker,
.automations-hub-dropdown {
  @apply rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2;
}

.automations-hub-switch {
  @apply flex items-start gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700;
}

.automations-hub-switch input {
  @apply mt-0.5;
}
</style>
