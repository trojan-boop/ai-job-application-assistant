import OpenAI from 'openai'

export type LlmProvider = 'groq' | 'gemini' | 'openai'

type LlmConfig = {
  provider: LlmProvider
  model: string
  label: string
  openaiClient?: OpenAI
  geminiKey?: string
}

export type LlmInfo = {
  enabled: boolean
  provider: LlmProvider | null
  model: string | null
  label: string
  setupHint: string
}

const PROVIDER_ORDER: LlmProvider[] = ['groq', 'gemini', 'openai']

const PROVIDER_META: Record<
  LlmProvider,
  { envKey: string; modelEnv: string; defaultModel: string; label: string; free: boolean }
> = {
  groq: {
    envKey: 'GROQ_API_KEY',
    modelEnv: 'GROQ_MODEL',
    defaultModel: 'llama-3.3-70b-versatile',
    label: 'Groq',
    free: true,
  },
  gemini: {
    envKey: 'GEMINI_API_KEY',
    modelEnv: 'GEMINI_MODEL',
    defaultModel: 'gemini-2.0-flash',
    label: 'Google Gemini',
    free: true,
  },
  openai: {
    envKey: 'OPENAI_API_KEY',
    modelEnv: 'OPENAI_MODEL',
    defaultModel: 'gpt-4o-mini',
    label: 'OpenAI',
    free: false,
  },
}

let cachedConfig: LlmConfig | null | undefined

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function resolveConfig(): LlmConfig | null {
  if (cachedConfig !== undefined) return cachedConfig

  const forced = process.env.LLM_PROVIDER?.trim().toLowerCase()
  const tryOrder =
    forced && forced !== 'auto'
      ? ([forced as LlmProvider].filter((p) => PROVIDER_ORDER.includes(p)) as LlmProvider[])
      : PROVIDER_ORDER

  for (const provider of tryOrder) {
    const meta = PROVIDER_META[provider]
    const key = process.env[meta.envKey]?.trim()
    if (!key) continue

    const model = process.env[meta.modelEnv]?.trim() || meta.defaultModel
    const label = meta.free ? `${meta.label} (free)` : meta.label

    if (provider === 'gemini') {
      cachedConfig = { provider, model, label, geminiKey: key }
      return cachedConfig
    }

    const baseURL =
      provider === 'groq' ? 'https://api.groq.com/openai/v1' : undefined

    cachedConfig = {
      provider,
      model,
      label,
      openaiClient: new OpenAI({ apiKey: key, baseURL }),
    }
    return cachedConfig
  }

  cachedConfig = null
  return null
}

export function getLlmInfo(): LlmInfo {
  const config = resolveConfig()
  if (!config) {
    return {
      enabled: false,
      provider: null,
      model: null,
      label: 'Rule-based mode',
      setupHint:
        'Add GROQ_API_KEY (free at console.groq.com) or GEMINI_API_KEY (free at aistudio.google.com) to your .env file.',
    }
  }

  return {
    enabled: true,
    provider: config.provider,
    model: config.model,
    label: config.label,
    setupHint: `${config.label} powers resume analysis and cover letters.`,
  }
}

export function isLlmEnabled(): boolean {
  return getLlmInfo().enabled
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const maxAttempts = 4
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const status = getErrorStatus(err)
      const retryable = status !== null && isRetryableStatus(status)

      if (!retryable || attempt === maxAttempts - 1) throw err

      const delay = 2000 * 2 ** attempt
      console.warn(
        `[${label}] Request throttled (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delay}ms…`,
      )
      await sleep(delay)
    }
  }

  throw lastError
}

function getErrorStatus(err: unknown): number | null {
  if (err instanceof OpenAI.APIError) return err.status ?? null
  if (err instanceof LlmHttpError) return err.status
  return null
}

class LlmHttpError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function isJsonModeUnsupported(err: unknown): boolean {
  if (!(err instanceof OpenAI.APIError)) return false
  const msg = err.message.toLowerCase()
  return (
    err.status === 400 &&
    (msg.includes('response_format') ||
      msg.includes('json') ||
      msg.includes('not supported'))
  )
}

async function chatOpenAiCompatible(
  config: LlmConfig,
  prompt: string,
  options: { json?: boolean; temperature: number },
): Promise<string> {
  if (!config.openaiClient) throw new Error('OpenAI-compatible client not configured.')

  const jsonHint =
    options.json
      ? '\n\nRespond with valid JSON only. No markdown fences or extra text.'
      : ''

  const request = (useJsonMode: boolean) =>
    config.openaiClient!.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: prompt + jsonHint }],
      temperature: options.temperature,
      ...(useJsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    })

  try {
    const response = await request(Boolean(options.json))
    const content = response.choices[0]?.message?.content
    if (!content) throw new Error(`Empty response from ${config.label}.`)
    return content
  } catch (err) {
    if (!options.json || !isJsonModeUnsupported(err)) throw err
    console.warn(`[${config.label}] JSON mode unsupported, retrying without response_format…`)
    const response = await request(false)
    const content = response.choices[0]?.message?.content
    if (!content) throw new Error(`Empty response from ${config.label}.`)
    return content
  }
}

async function chatGemini(
  config: LlmConfig,
  prompt: string,
  options: { json?: boolean; temperature: number },
): Promise<string> {
  if (!config.geminiKey) throw new Error('Gemini API key not configured.')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.geminiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature,
        ...(options.json ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string }
    }
    throw new LlmHttpError(
      body.error?.message || `Gemini API error (${res.status})`,
      res.status,
    )
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty response from Google Gemini.')
  return text
}

async function chatOnce(
  config: LlmConfig,
  prompt: string,
  options: { json?: boolean; temperature: number },
): Promise<string> {
  if (config.provider === 'gemini') {
    return chatGemini(config, prompt, options)
  }
  return chatOpenAiCompatible(config, prompt, options)
}

export async function chatJson(
  prompt: string,
  options: { temperature?: number; label?: string } = {},
): Promise<string> {
  const config = resolveConfig()
  if (!config) throw new Error('No AI provider configured.')

  const label = options.label ?? 'chatJson'
  return withRetry(
    () => chatOnce(config, prompt, { json: true, temperature: options.temperature ?? 0.2 }),
    label,
  )
}

export async function chatText(
  prompt: string,
  options: { temperature?: number; label?: string } = {},
): Promise<string> {
  const config = resolveConfig()
  if (!config) throw new Error('No AI provider configured.')

  const label = options.label ?? 'chatText'
  return withRetry(
    () => chatOnce(config, prompt, { json: false, temperature: options.temperature ?? 0.6 }),
    label,
  )
}

export function getErrorMessage(err: unknown): { message: string; retryable: boolean } {
  const status = getErrorStatus(err)
  const message = err instanceof Error ? err.message.toLowerCase() : ''

  if (status === 401 || message.includes('invalid api key') || message.includes('api key not valid')) {
    return { message: 'Invalid API key for the configured AI provider.', retryable: false }
  }

  if (
    status === 402 ||
    message.includes('insufficient_quota') ||
    message.includes('exceeded your current quota') ||
    message.includes('billing')
  ) {
    return {
      message:
        'AI provider quota exhausted. Use a free Groq or Gemini key — see README.',
      retryable: false,
    }
  }

  if (status === 429 || status === 503) {
    return {
      message: 'AI rate limit reached. Wait 30–60 seconds, then click Retry AI analysis.',
      retryable: true,
    }
  }

  if (err instanceof Error) return { message: err.message, retryable: false }
  return { message: 'Unknown AI error.', retryable: false }
}
