import { describe, expect, it } from 'vitest'

import {
  buildReasoningEffortOptions,
  normalizeCodexModels,
  resolveFallbackModelId,
  resolveReasoningEffortForModel,
} from './codexModels'

describe('normalizeCodexModels', () => {
  it('keeps display metadata and removes duplicate ids', () => {
    const models = normalizeCodexModels([
      {
        id: 'gpt-5.4',
        model: 'gpt-5.4',
        displayName: 'gpt-5.4',
        description: 'Strong model for everyday coding.',
        defaultReasoningEffort: 'medium',
        supportedReasoningEfforts: [
          { reasoningEffort: 'low', description: 'Fast' },
          { reasoningEffort: 'medium', description: 'Balanced' },
          { reasoningEffort: 'high', description: 'Deep' },
        ],
        isDefault: true,
      },
      {
        id: 'gpt-5.4-mini',
        model: 'gpt-5.4-mini',
        displayName: 'GPT-5.4-Mini',
        description: 'Small, fast, and cost-efficient.',
        defaultReasoningEffort: 'medium',
        supportedReasoningEfforts: [
          { reasoningEffort: 'low', description: 'Fast' },
          { reasoningEffort: 'medium', description: 'Balanced' },
        ],
        isDefault: false,
      },
      {
        id: 'gpt-5.4',
        model: 'gpt-5.4',
        displayName: 'duplicate should be ignored',
        description: 'duplicate',
        defaultReasoningEffort: 'high',
        supportedReasoningEfforts: [],
        isDefault: false,
      },
    ])

    expect(models).toHaveLength(2)
    expect(models[0]).toMatchObject({
      id: 'gpt-5.4',
      displayName: 'gpt-5.4',
      description: 'Strong model for everyday coding.',
      defaultReasoningEffort: 'medium',
      isDefault: true,
    })
    expect(models[1]).toMatchObject({
      id: 'gpt-5.4-mini',
      displayName: 'GPT-5.4-Mini',
    })
  })
})

describe('resolveFallbackModelId', () => {
  it('prefers the upstream default model over older hardcoded fallbacks', () => {
    const models = normalizeCodexModels([
      {
        id: 'gpt-5.2-codex',
        model: 'gpt-5.2-codex',
        displayName: 'gpt-5.2-codex',
        description: 'Older coding model.',
        defaultReasoningEffort: 'medium',
        supportedReasoningEfforts: [{ reasoningEffort: 'medium', description: 'Balanced' }],
        isDefault: false,
      },
      {
        id: 'gpt-5.4',
        model: 'gpt-5.4',
        displayName: 'gpt-5.4',
        description: 'Current default model.',
        defaultReasoningEffort: 'medium',
        supportedReasoningEfforts: [{ reasoningEffort: 'medium', description: 'Balanced' }],
        isDefault: true,
      },
    ])

    expect(resolveFallbackModelId(models)).toBe('gpt-5.4')
  })
})

describe('resolveReasoningEffortForModel', () => {
  it('snaps unsupported efforts to the selected model default', () => {
    const models = normalizeCodexModels([
      {
        id: 'gpt-5.1-codex-mini',
        model: 'gpt-5.1-codex-mini',
        displayName: 'gpt-5.1-codex-mini',
        description: 'Cheaper, faster, but less capable.',
        defaultReasoningEffort: 'medium',
        supportedReasoningEfforts: [
          { reasoningEffort: 'medium', description: 'Dynamic' },
          { reasoningEffort: 'high', description: 'Deep' },
        ],
        isDefault: false,
      },
    ])

    expect(resolveReasoningEffortForModel(models, 'gpt-5.1-codex-mini', 'xhigh')).toBe('medium')
    expect(resolveReasoningEffortForModel(models, 'gpt-5.1-codex-mini', 'high')).toBe('high')
  })
})

describe('buildReasoningEffortOptions', () => {
  it('returns only the efforts supported by the selected model', () => {
    const models = normalizeCodexModels([
      {
        id: 'gpt-5.3-codex-spark',
        model: 'gpt-5.3-codex-spark',
        displayName: 'GPT-5.3-Codex-Spark',
        description: 'Ultra-fast coding model.',
        defaultReasoningEffort: 'high',
        supportedReasoningEfforts: [
          { reasoningEffort: 'low', description: 'Fast' },
          { reasoningEffort: 'medium', description: 'Balanced' },
          { reasoningEffort: 'high', description: 'Deep' },
          { reasoningEffort: 'xhigh', description: 'Extra high' },
        ],
        isDefault: false,
      },
    ])

    expect(buildReasoningEffortOptions(models, 'gpt-5.3-codex-spark', false)).toEqual([
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'xhigh', label: 'Extra high' },
    ])
  })
})
