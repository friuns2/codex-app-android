import type {
  ReasoningEffort,
  UiCodexModel,
  UiCodexModelReasoningOption,
} from '../types/codex'

const ALL_REASONING_EFFORTS: ReasoningEffort[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh']

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function readBoolean(value: unknown): boolean {
  return value === true
}

function normalizeReasoningEffort(value: unknown): ReasoningEffort | null {
  return value === 'none'
    || value === 'minimal'
    || value === 'low'
    || value === 'medium'
    || value === 'high'
    || value === 'xhigh'
    ? value
    : null
}

export function labelReasoningEffort(value: ReasoningEffort): string {
  if (value === 'none') return 'None'
  if (value === 'minimal') return 'Minimal'
  if (value === 'low') return 'Low'
  if (value === 'medium') return 'Medium'
  if (value === 'high') return 'High'
  return 'Extra high'
}

function buildDefaultReasoningOptions(): UiCodexModelReasoningOption[] {
  return ALL_REASONING_EFFORTS.map((value) => ({
    value,
    label: labelReasoningEffort(value),
    description: '',
  }))
}

function normalizeSupportedReasoningEfforts(value: unknown): UiCodexModelReasoningOption[] {
  if (!Array.isArray(value)) return buildDefaultReasoningOptions()

  const normalized: UiCodexModelReasoningOption[] = []
  const seen = new Set<ReasoningEffort>()

  for (const row of value) {
    const record = asRecord(row)
    if (!record) continue
    const effort = normalizeReasoningEffort(record.reasoningEffort)
    if (!effort || seen.has(effort)) continue
    seen.add(effort)
    normalized.push({
      value: effort,
      label: labelReasoningEffort(effort),
      description: readString(record.description),
    })
  }

  return normalized.length > 0 ? normalized : buildDefaultReasoningOptions()
}

export function normalizeCodexModels(rows: unknown[]): UiCodexModel[] {
  if (!Array.isArray(rows)) return []

  const normalized: UiCodexModel[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const record = asRecord(row)
    if (!record) continue

    const id = readString(record.id) || readString(record.model)
    if (!id || seen.has(id)) continue

    const supportedReasoningEfforts = normalizeSupportedReasoningEfforts(record.supportedReasoningEfforts)
    const defaultReasoningEffort = normalizeReasoningEffort(record.defaultReasoningEffort)
      ?? supportedReasoningEfforts[0]?.value
      ?? 'medium'

    seen.add(id)
    normalized.push({
      id,
      model: readString(record.model) || id,
      displayName: readString(record.displayName) || id,
      description: readString(record.description),
      hidden: readBoolean(record.hidden),
      defaultReasoningEffort,
      supportedReasoningEfforts,
      isDefault: readBoolean(record.isDefault),
    })
  }

  return normalized
}

export function findCodexModel(models: UiCodexModel[], modelId: string): UiCodexModel | null {
  const normalizedModelId = modelId.trim()
  if (!normalizedModelId) return null
  return models.find((model) => model.id === normalizedModelId) ?? null
}

export function resolveFallbackModelId(models: UiCodexModel[]): string {
  return (models.find((model) => model.isDefault) ?? models[0])?.id ?? ''
}

export function isReasoningEffortSupported(
  models: UiCodexModel[],
  modelId: string,
  effort: ReasoningEffort | '',
): boolean {
  if (!effort) return true
  const model = findCodexModel(models, modelId)
  if (!model) return ALL_REASONING_EFFORTS.includes(effort)
  return model.supportedReasoningEfforts.some((option) => option.value === effort)
}

export function resolveReasoningEffortForModel(
  models: UiCodexModel[],
  modelId: string,
  currentEffort: ReasoningEffort | '',
): ReasoningEffort | '' {
  if (isReasoningEffortSupported(models, modelId, currentEffort)) {
    return currentEffort
  }

  return findCodexModel(models, modelId)?.defaultReasoningEffort ?? currentEffort
}

export function buildReasoningEffortOptions(
  models: UiCodexModel[],
  modelId: string,
  includeDefaultOption: boolean,
): Array<{ value: ReasoningEffort | ''; label: string }> {
  const model = findCodexModel(models, modelId)
  const options = (model?.supportedReasoningEfforts ?? buildDefaultReasoningOptions())
    .map((option) => ({ value: option.value, label: option.label }))

  return includeDefaultOption
    ? [{ value: '', label: 'Use defaults' }, ...options]
    : options
}

export function getModelDisplayName(models: UiCodexModel[], modelId: string): string {
  return findCodexModel(models, modelId)?.displayName ?? modelId.trim()
}
