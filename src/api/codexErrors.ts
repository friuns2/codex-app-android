function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export type CodexErrorCode =
  | 'http_error'
  | 'rpc_error'
  | 'network_error'
  | 'invalid_response'
  | 'unknown_error'

export class CodexApiError extends Error {
  code: CodexErrorCode
  method?: string
  status?: number

  constructor(message: string, options: { code: CodexErrorCode; method?: string; status?: number }) {
    super(message)
    this.name = 'CodexApiError'
    this.code = options.code
    this.method = options.method
    this.status = options.status
  }
}

export function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.length > 0) return payload

  const record = asRecord(payload)
  if (!record) return fallback

  const error = record.error
  if (typeof error === 'string' && error.length > 0) return error

  const nested = asRecord(error)
  if (nested && typeof nested.message === 'string' && nested.message.length > 0) {
    return nested.message
  }

  if (typeof record.message === 'string' && record.message.length > 0) return record.message
  if (typeof record.detail === 'string' && record.detail.length > 0) return record.detail

  return fallback
}

export function normalizeCodexApiError(error: unknown, fallback: string, method?: string): CodexApiError {
  if (error instanceof CodexApiError) {
    return error
  }

  if (error instanceof Error) {
    return new CodexApiError(error.message || fallback, {
      code: 'unknown_error',
      method,
    })
  }

  return new CodexApiError(fallback, {
    code: 'unknown_error',
    method,
  })
}
