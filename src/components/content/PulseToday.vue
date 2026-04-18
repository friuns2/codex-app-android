<template>
  <section class="pulse-root" :class="{ 'is-embedded': embedded }">
    <header class="pulse-header">
      <div>
        <p class="pulse-eyebrow">Today</p>
        <h2 v-if="!embedded" class="pulse-title">Pulse</h2>
        <p class="pulse-note">{{ pulseState?.availabilityNote ?? 'Loading Pulse…' }}</p>
      </div>
      <button class="pulse-refresh" type="button" :disabled="isLoading" @click="void loadPulseState()">
        {{ isLoading ? 'Refreshing…' : 'Refresh' }}
      </button>
    </header>

    <div class="pulse-meta">
      <span class="pulse-pill">Web</span>
      <span class="pulse-pill">iOS</span>
      <span class="pulse-pill">Android</span>
      <span class="pulse-pill is-muted">Desktop preview</span>
      <span v-if="pulseState?.planType" class="pulse-pill is-plan">{{ pulseState.planType }}</span>
      <span v-if="pulseState?.lastDeliveredAtIso" class="pulse-meta-text">
        Updated {{ formatTimestamp(pulseState.lastDeliveredAtIso) }}
      </span>
    </div>

    <p v-if="errorMessage" class="pulse-error">{{ errorMessage }}</p>

    <div v-if="pulseState?.status === 'ready' && pulseState.items.length > 0" class="pulse-cards">
      <article v-for="item in pulseState.items" :key="item.id" class="pulse-card">
        <div class="pulse-card-header">
          <div>
            <h3 class="pulse-card-title">{{ item.title }}</h3>
            <p class="pulse-card-summary">{{ item.summary }}</p>
          </div>
          <span class="pulse-card-time">{{ formatTimestamp(item.createdAtIso) }}</span>
        </div>
        <div v-if="item.tags.length > 0" class="pulse-card-tags">
          <span v-for="tag in item.tags" :key="tag" class="pulse-tag">{{ tag }}</span>
        </div>
        <div class="pulse-card-actions">
          <button
            class="pulse-card-button"
            :class="{ 'is-active': item.reaction === 'up' }"
            type="button"
            :disabled="isItemBusy(item.id)"
            @click="void setReaction(item.id, item.reaction === 'up' ? null : 'up')"
          >
            👍
          </button>
          <button
            class="pulse-card-button"
            :class="{ 'is-active': item.reaction === 'down' }"
            type="button"
            :disabled="isItemBusy(item.id)"
            @click="void setReaction(item.id, item.reaction === 'down' ? null : 'down')"
          >
            👎
          </button>
          <button
            class="pulse-card-button"
            type="button"
            :disabled="isItemBusy(item.id) || isActionUnavailable"
            @click="void saveAsChat(item.id)"
          >
            {{ item.savedThreadId ? 'Saved as chat' : 'Save as chat' }}
          </button>
          <button
            class="pulse-card-button"
            type="button"
            :disabled="isItemBusy(item.id)"
            @click="toggleFeedbackEditor(item.id)"
          >
            Give feedback
          </button>
        </div>
        <p v-if="item.savedAtIso || item.followUpAtIso" class="pulse-card-status">
          <span v-if="item.savedAtIso">Saved {{ formatTimestamp(item.savedAtIso) }}</span>
          <span v-if="item.savedAtIso && item.followUpAtIso"> · </span>
          <span v-if="item.followUpAtIso">Follow-up started {{ formatTimestamp(item.followUpAtIso) }}</span>
        </p>
        <details class="pulse-card-details">
          <summary>Expand details</summary>
          <p>{{ item.details }}</p>
        </details>
        <div class="pulse-follow-up">
          <label class="pulse-input-label" :for="`pulse-follow-up-${item.id}`">Ask follow-up</label>
          <div class="pulse-follow-up-row">
            <input
              :id="`pulse-follow-up-${item.id}`"
              v-model="followUpDrafts[item.id]"
              class="pulse-input"
              type="text"
              placeholder="Ask a follow-up question about this summary"
              :disabled="isItemBusy(item.id) || isActionUnavailable"
              @keydown.enter.prevent="void followUp(item.id)"
            />
            <button
              class="pulse-submit"
              type="button"
              :disabled="isItemBusy(item.id) || isActionUnavailable || !followUpDrafts[item.id]?.trim()"
              @click="void followUp(item.id)"
            >
              Ask
            </button>
          </div>
        </div>
        <div v-if="activeFeedbackItemId === item.id" class="pulse-card-feedback">
          <label class="pulse-input-label" :for="`pulse-feedback-${item.id}`">Card feedback</label>
          <textarea
            :id="`pulse-feedback-${item.id}`"
            v-model="cardFeedbackDrafts[item.id]"
            class="pulse-textarea pulse-textarea-compact"
            rows="3"
            maxlength="500"
            placeholder="Tell Pulse what to show more or less of next time."
          />
          <div class="pulse-curation-actions">
            <span class="pulse-count">{{ cardFeedbackDrafts[item.id]?.trim().length || 0 }}/500</span>
            <button
              class="pulse-submit"
              type="button"
              :disabled="isItemBusy(item.id) || !cardFeedbackDrafts[item.id]?.trim()"
              @click="void submitCardFeedback(item.id)"
            >
              Save feedback
            </button>
          </div>
        </div>
      </article>
    </div>
    <div v-else class="pulse-empty">
      <p class="pulse-empty-title">No Pulse cards are cached for today.</p>
      <p class="pulse-empty-body">
        Official Pulse currently ships on web and mobile. This preview keeps the Today surface, settings, and curation flow available in the desktop UI.
      </p>
    </div>

    <p v-if="isActionUnavailable" class="pulse-hint">
      Choose a project or start from a workspace root before saving Pulse cards into chats.
    </p>

    <section class="pulse-curation">
      <div class="pulse-section-header">
        <div>
          <h3 class="pulse-section-title">Curate tomorrow</h3>
          <p class="pulse-section-note">Describe what Pulse should proactively watch or summarize next.</p>
        </div>
      </div>
      <textarea
        v-model="feedbackDraft"
        class="pulse-textarea"
        rows="4"
        maxlength="800"
        placeholder="Example: Watch OpenAI platform changes, Codex releases, and the repos I touched today."
      />
      <div class="pulse-curation-actions">
        <span class="pulse-count">{{ feedbackDraft.trim().length }}/800</span>
        <button
          class="pulse-submit"
          type="button"
          :disabled="isSubmitting || feedbackDraft.trim().length === 0"
          @click="void submitFeedback()"
        >
          {{ isSubmitting ? 'Saving…' : 'Save curation' }}
        </button>
      </div>
    </section>

    <section class="pulse-history">
      <div class="pulse-section-header">
        <div>
          <h3 class="pulse-section-title">Feedback history</h3>
          <p class="pulse-section-note">Recent curation and feedback prompts stored on this Codex host.</p>
        </div>
        <button
          v-if="pulseState && pulseState.feedbackHistory.length > 0"
          class="pulse-clear"
          type="button"
          :disabled="isClearingHistory"
          @click="void clearHistory()"
        >
          {{ isClearingHistory ? 'Clearing…' : 'Clear history' }}
        </button>
      </div>
      <ul v-if="pulseState && pulseState.feedbackHistory.length > 0" class="pulse-history-list">
        <li v-for="entry in pulseState.feedbackHistory" :key="entry.id" class="pulse-history-item">
          <span class="pulse-history-kind">{{ entry.kind === 'feedback' ? 'Feedback' : 'Curate' }}</span>
          <p class="pulse-history-text">{{ entry.text }}</p>
          <span class="pulse-history-time">{{ formatTimestamp(entry.createdAtIso) }}</span>
        </li>
      </ul>
      <p v-else class="pulse-history-empty">No Pulse feedback has been saved yet.</p>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  clearPulseFeedbackHistory,
  createPulseFeedback,
  getPulseState,
  markPulseItemFollowUp,
  markPulseItemSaved,
  setPulseItemReaction,
} from '../../api/codexGateway'
import type { UiPulseItem, UiPulseState } from '../../types/codex'

const props = withDefaults(defineProps<{
  embedded?: boolean
  defaultCwd?: string
  saveItemToChat?: (item: UiPulseItem) => Promise<string>
  followUpOnItem?: (item: UiPulseItem, prompt: string) => Promise<string>
}>(), {
  embedded: false,
  defaultCwd: '',
  saveItemToChat: undefined,
  followUpOnItem: undefined,
})

const pulseState = ref<UiPulseState | null>(null)
const errorMessage = ref('')
const feedbackDraft = ref('')
const isLoading = ref(false)
const isSubmitting = ref(false)
const isClearingHistory = ref(false)
const activeFeedbackItemId = ref('')
const cardFeedbackDrafts = ref<Record<string, string>>({})
const followUpDrafts = ref<Record<string, string>>({})
const busyItemIds = ref<Record<string, boolean>>({})

const isActionUnavailable = computed(() => props.defaultCwd.trim().length === 0)

async function loadPulseState(): Promise<void> {
  isLoading.value = true
  errorMessage.value = ''
  try {
    pulseState.value = await getPulseState()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load Pulse'
  } finally {
    isLoading.value = false
  }
}

async function submitFeedback(): Promise<void> {
  const text = feedbackDraft.value.trim()
  if (!text || isSubmitting.value) return
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    pulseState.value = await createPulseFeedback(text, 'curate')
    feedbackDraft.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to save Pulse feedback'
  } finally {
    isSubmitting.value = false
  }
}

function isItemBusy(itemId: string): boolean {
  return busyItemIds.value[itemId] === true
}

function setItemBusy(itemId: string, busy: boolean): void {
  busyItemIds.value = {
    ...busyItemIds.value,
    [itemId]: busy,
  }
}

function findItem(itemId: string): UiPulseItem | null {
  return pulseState.value?.items.find((item) => item.id === itemId) ?? null
}

function toggleFeedbackEditor(itemId: string): void {
  activeFeedbackItemId.value = activeFeedbackItemId.value === itemId ? '' : itemId
}

async function setReaction(itemId: string, reaction: 'up' | 'down' | null): Promise<void> {
  if (isItemBusy(itemId)) return
  setItemBusy(itemId, true)
  errorMessage.value = ''
  try {
    pulseState.value = await setPulseItemReaction(itemId, reaction)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to update Pulse reaction'
  } finally {
    setItemBusy(itemId, false)
  }
}

async function saveAsChat(itemId: string): Promise<void> {
  if (isItemBusy(itemId) || isActionUnavailable.value || !props.saveItemToChat) return
  const item = findItem(itemId)
  if (!item) return
  setItemBusy(itemId, true)
  errorMessage.value = ''
  try {
    const threadId = await props.saveItemToChat(item)
    pulseState.value = await markPulseItemSaved(itemId, threadId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to save Pulse card as chat'
  } finally {
    setItemBusy(itemId, false)
  }
}

async function followUp(itemId: string): Promise<void> {
  if (isItemBusy(itemId) || isActionUnavailable.value || !props.followUpOnItem) return
  const item = findItem(itemId)
  const prompt = followUpDrafts.value[itemId]?.trim() ?? ''
  if (!item || !prompt) return
  setItemBusy(itemId, true)
  errorMessage.value = ''
  try {
    const threadId = await props.followUpOnItem(item, prompt)
    followUpDrafts.value = {
      ...followUpDrafts.value,
      [itemId]: '',
    }
    pulseState.value = await markPulseItemFollowUp(itemId, threadId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to start Pulse follow-up'
  } finally {
    setItemBusy(itemId, false)
  }
}

async function submitCardFeedback(itemId: string): Promise<void> {
  const item = findItem(itemId)
  const text = cardFeedbackDrafts.value[itemId]?.trim() ?? ''
  if (!item || !text || isItemBusy(itemId)) return
  setItemBusy(itemId, true)
  errorMessage.value = ''
  try {
    pulseState.value = await createPulseFeedback(`${item.title}: ${text}`, 'feedback')
    cardFeedbackDrafts.value = {
      ...cardFeedbackDrafts.value,
      [itemId]: '',
    }
    activeFeedbackItemId.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to save card feedback'
  } finally {
    setItemBusy(itemId, false)
  }
}

async function clearHistory(): Promise<void> {
  if (isClearingHistory.value) return
  isClearingHistory.value = true
  errorMessage.value = ''
  try {
    pulseState.value = await clearPulseFeedbackHistory()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to clear Pulse history'
  } finally {
    isClearingHistory.value = false
  }
}

function formatTimestamp(value: string): string {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return value
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

onMounted(() => {
  void loadPulseState()
})
</script>

<style scoped>
.pulse-root {
  width: 100%;
  border: 1px solid #e4e4e7;
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
  padding: 1rem;
}

.pulse-root.is-embedded {
  flex: 0 0 auto;
}

.pulse-header,
.pulse-section-header,
.pulse-curation-actions,
.pulse-card-header {
  display: flex;
  gap: 0.75rem;
}

.pulse-header,
.pulse-section-header,
.pulse-curation-actions {
  align-items: flex-start;
  justify-content: space-between;
}

.pulse-card-header {
  flex-direction: column;
}

.pulse-eyebrow {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #71717a;
}

.pulse-title {
  margin: 0.35rem 0 0;
  font-size: 1.55rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #09090b;
}

.pulse-note,
.pulse-card-summary,
.pulse-empty-body,
.pulse-section-note,
.pulse-history-empty {
  margin: 0.5rem 0 0;
  font-size: 0.95rem;
  line-height: 1.65;
  color: #52525b;
}

.pulse-refresh,
.pulse-submit,
.pulse-clear {
  border: 1px solid #e4e4e7;
  border-radius: 999px;
  background: #fafafa;
  color: #3f3f46;
  cursor: pointer;
  font-size: 0.92rem;
  line-height: 1;
  padding: 0.7rem 0.95rem;
  transition: background 0.16s ease, border-color 0.16s ease;
}

.pulse-refresh:hover,
.pulse-submit:hover,
.pulse-clear:hover {
  background: #f4f4f5;
}

.pulse-refresh:disabled,
.pulse-submit:disabled,
.pulse-clear:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.pulse-meta,
.pulse-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pulse-meta {
  margin-top: 1rem;
  align-items: center;
}

.pulse-pill,
.pulse-tag,
.pulse-history-kind {
  display: inline-flex;
  align-items: center;
  border: 1px solid #e4e4e7;
  border-radius: 999px;
  background: #fafafa;
  color: #3f3f46;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 0.32rem 0.62rem;
}

.pulse-pill.is-muted {
  border-color: #fde68a;
  background: #fffbeb;
  color: #b45309;
}

.pulse-pill.is-plan {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}

.pulse-meta-text,
.pulse-card-time,
.pulse-history-time,
.pulse-count {
  font-size: 0.78rem;
  color: #71717a;
}

.pulse-error {
  margin-top: 0.9rem;
  border: 1px solid #fecdd3;
  border-radius: 1rem;
  background: #fff1f2;
  color: #be123c;
  font-size: 0.92rem;
  padding: 0.8rem 0.9rem;
}

.pulse-cards,
.pulse-history-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
}

.pulse-card,
.pulse-empty,
.pulse-curation,
.pulse-history,
.pulse-history-item {
  border: 1px solid #e4e4e7;
  border-radius: 1.25rem;
  padding: 1rem;
}

.pulse-card,
.pulse-empty,
.pulse-curation,
.pulse-history {
  margin-top: 1rem;
  background: rgba(250, 250, 250, 0.78);
}

.pulse-history-item {
  background: #fff;
}

.pulse-card-title,
.pulse-section-title,
.pulse-empty-title {
  margin: 0;
  color: #18181b;
  font-size: 1rem;
  font-weight: 600;
}

.pulse-card-tags {
  margin-top: 0.8rem;
}

.pulse-card-actions,
.pulse-follow-up-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.85rem;
}

.pulse-card-button {
  border: 1px solid #e4e4e7;
  border-radius: 999px;
  background: #fff;
  color: #27272a;
  cursor: pointer;
  font-size: 0.84rem;
  line-height: 1;
  padding: 0.62rem 0.82rem;
  transition: background 0.16s ease, border-color 0.16s ease;
}

.pulse-card-button:hover {
  background: #f4f4f5;
}

.pulse-card-button.is-active {
  border-color: #18181b;
  background: #18181b;
  color: #fff;
}

.pulse-card-button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.pulse-card-status,
.pulse-hint {
  margin: 0.75rem 0 0;
  color: #71717a;
  font-size: 0.82rem;
  line-height: 1.5;
}

.pulse-card-details {
  margin-top: 0.85rem;
  color: #3f3f46;
  font-size: 0.92rem;
  line-height: 1.65;
}

.pulse-card-details summary {
  cursor: pointer;
  color: #27272a;
  font-weight: 600;
}

.pulse-card-details p,
.pulse-history-text {
  margin: 0.6rem 0 0;
  white-space: pre-wrap;
  color: #27272a;
  font-size: 0.92rem;
  line-height: 1.65;
}

.pulse-textarea {
  width: 100%;
  min-height: 7rem;
  resize: vertical;
  margin-top: 0.8rem;
  border: 1px solid #e4e4e7;
  border-radius: 1rem;
  background: #fff;
  color: #09090b;
  font: inherit;
  line-height: 1.65;
  padding: 0.85rem 0.95rem;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.pulse-textarea:focus {
  border-color: #a1a1aa;
  box-shadow: 0 0 0 3px rgba(228, 228, 231, 0.8);
  outline: none;
}

.pulse-textarea-compact {
  min-height: 5rem;
}

.pulse-card-feedback,
.pulse-follow-up {
  margin-top: 0.9rem;
}

.pulse-input-label {
  display: block;
  color: #3f3f46;
  font-size: 0.84rem;
  font-weight: 600;
  margin-bottom: 0.45rem;
}

.pulse-input {
  flex: 1 1 16rem;
  min-width: 0;
  border: 1px solid #e4e4e7;
  border-radius: 999px;
  background: #fff;
  color: #09090b;
  font: inherit;
  line-height: 1.2;
  padding: 0.85rem 1rem;
}

.pulse-input:focus {
  border-color: #a1a1aa;
  box-shadow: 0 0 0 3px rgba(228, 228, 231, 0.8);
  outline: none;
}

@media (min-width: 640px) {
  .pulse-root {
    padding: 1.25rem;
  }

  .pulse-card-header {
    align-items: flex-start;
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>
