import type { IncomingMessage, ServerResponse } from 'node:http'
import { request as httpsRequest } from 'node:https'

const ZEN_UPSTREAM = 'https://opencode.ai/zen/v1'

interface ResponsesApiInput {
  type: string
  role?: string
  content?: string | Array<{ type: string; text?: string }>
  text?: string
}

interface ResponsesApiRequest {
  model: string
  input: string | ResponsesApiInput[]
  instructions?: string
  temperature?: number
  top_p?: number
  max_output_tokens?: number
  stream?: boolean
  [key: string]: unknown
}

interface ChatMessage {
  role: string
  content: string
}

interface ChatCompletionsRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  top_p?: number
  max_tokens?: number
  stream?: boolean
  [key: string]: unknown
}

function responsesInputToMessages(input: string | ResponsesApiInput[], instructions?: string): ChatMessage[] {
  const messages: ChatMessage[] = []
  if (instructions) {
    messages.push({ role: 'system', content: instructions })
  }
  if (typeof input === 'string') {
    messages.push({ role: 'user', content: input })
    return messages
  }
  for (const item of input) {
    if (item.type === 'message' && item.role && item.content) {
      const text = typeof item.content === 'string'
        ? item.content
        : item.content
            .filter((c) => c.type === 'input_text' && c.text)
            .map((c) => c.text)
            .join('\n')
      const role = item.role === 'developer' ? 'system' : item.role
      messages.push({ role, content: text })
    }
  }
  return messages
}

function chatCompletionToResponsesFormat(chatResponse: Record<string, unknown>, model: string): Record<string, unknown> {
  const choices = (chatResponse.choices ?? []) as Array<{
    message?: { content?: string; reasoning?: string; reasoning_details?: Array<{ text?: string }> }
    index?: number
    finish_reason?: string
  }>
  const output: Array<Record<string, unknown>> = []
  for (const choice of choices) {
    if (!choice.message?.content) continue
    output.push({
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text: choice.message.content }],
      status: 'completed',
    })
  }
  const usage = chatResponse.usage as Record<string, number> | undefined
  return {
    id: chatResponse.id ?? `resp_${Date.now()}`,
    object: 'response',
    created_at: chatResponse.created ?? Math.floor(Date.now() / 1000),
    status: 'completed',
    model,
    output,
    usage: usage ? {
      input_tokens: usage.prompt_tokens ?? 0,
      output_tokens: usage.completion_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0,
    } : undefined,
  }
}

function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function forwardStreamingResponse(
  upstreamRes: IncomingMessage,
  res: ServerResponse,
  model: string,
): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  let buffer = ''
  const contentParts: string[] = []
  let responseId = `resp_${Date.now()}`

  res.write(`data: {"type":"response.created","response":{"id":"${responseId}","object":"response","status":"in_progress","model":"${model}","output":[]}}\n\n`)
  res.write(`data: {"type":"response.output_item.added","output_index":0,"item":{"type":"message","role":"assistant","content":[],"status":"in_progress"}}\n\n`)
  res.write(`data: {"type":"response.content_part.added","output_index":0,"content_index":0,"part":{"type":"output_text","text":""}}\n\n`)

  upstreamRes.on('data', (chunk: Buffer) => {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data) as {
          id?: string
          choices?: Array<{ delta?: { content?: string; reasoning?: string } }>
        }
        if (parsed.id) responseId = `resp_${parsed.id}`
        const delta = parsed.choices?.[0]?.delta
        if (delta?.content) {
          contentParts.push(delta.content)
          const escaped = JSON.stringify(delta.content).slice(1, -1)
          res.write(`data: {"type":"response.output_text.delta","output_index":0,"content_index":0,"delta":"${escaped}"}\n\n`)
        }
      } catch {
        // skip malformed SSE chunks
      }
    }
  })

  upstreamRes.on('end', () => {
    const fullText = contentParts.join('')
    const escapedFull = JSON.stringify(fullText).slice(1, -1)
    res.write(`data: {"type":"response.output_text.done","output_index":0,"content_index":0,"text":"${escapedFull}"}\n\n`)
    res.write(`data: {"type":"response.content_part.done","output_index":0,"content_index":0,"part":{"type":"output_text","text":"${escapedFull}"}}\n\n`)
    res.write(`data: {"type":"response.output_item.done","output_index":0,"item":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"${escapedFull}"}],"status":"completed"}}\n\n`)
    res.write(`data: {"type":"response.completed","response":{"id":"${responseId}","object":"response","status":"completed","model":"${model}","output":[{"type":"message","role":"assistant","content":[{"type":"output_text","text":"${escapedFull}"}],"status":"completed"}]}}\n\n`)
    res.end()
  })

  upstreamRes.on('error', () => {
    if (!res.writableEnded) res.end()
  })
}

export function handleZenProxyRequest(req: IncomingMessage, res: ServerResponse, bearerToken: string): void {
  void (async () => {
    try {
      const body = await readRequestBody(req)
      const parsed = JSON.parse(body.toString()) as ResponsesApiRequest
      const isStreaming = parsed.stream === true
      const messages = responsesInputToMessages(parsed.input, parsed.instructions)

      const chatReq: ChatCompletionsRequest = {
        model: parsed.model,
        messages,
        stream: isStreaming,
      }
      if (parsed.temperature != null) chatReq.temperature = parsed.temperature
      if (parsed.top_p != null) chatReq.top_p = parsed.top_p
      if (parsed.max_output_tokens != null) chatReq.max_tokens = parsed.max_output_tokens

      const payload = JSON.stringify(chatReq)
      const url = new URL(`${ZEN_UPSTREAM}/chat/completions`)

      const proxyReq = httpsRequest({
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'Authorization': `Bearer ${bearerToken}`,
        },
      }, (upstreamRes) => {
        const upstreamStatus = upstreamRes.statusCode ?? 500

        if (isStreaming && upstreamStatus >= 200 && upstreamStatus < 300) {
          forwardStreamingResponse(upstreamRes, res, parsed.model)
          return
        }

        const chunks: Buffer[] = []
        upstreamRes.on('data', (chunk: Buffer) => chunks.push(chunk))
        upstreamRes.on('end', () => {
          const rawBody = Buffer.concat(chunks).toString()
          try {
            const upstream = JSON.parse(rawBody) as Record<string, unknown>
            if (upstream.error || upstreamStatus >= 400) {
              res.writeHead(upstreamStatus, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify(upstream))
              return
            }
            const translated = chatCompletionToResponsesFormat(upstream, parsed.model)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(translated))
          } catch {
            const detail = rawBody.slice(0, 500).trim()
            res.writeHead(upstreamStatus >= 400 ? upstreamStatus : 502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: { message: detail || 'Bad gateway: failed to parse upstream response' } }))
          }
        })
      })

      proxyReq.on('error', (error) => {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: `Proxy error: ${error.message}` } }))
        }
      })

      proxyReq.write(payload)
      proxyReq.end()
    } catch (error) {
      if (!res.headersSent) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message } }))
      }
    }
  })()
}
