import type { Application, ApplicationStatus, ResumeAnalysis, User } from '../types'
import { getToken, setToken } from './tokenStorage'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(path, { ...options, headers })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string }).error ?? res.statusText,
      res.status,
    )
  }

  return data as T
}

export const api = {
  health: () =>
    request<{
      ok: boolean
      llmEnabled: boolean
      llmProvider?: string | null
      llmModel?: string | null
      llmLabel?: string
      llmSetupHint?: string
    }>('/api/health'),

  register: (body: { name: string; email: string; password: string }) =>
    request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: () => request<{ user: User }>('/api/auth/me'),

  analyzeResume: (body: { resume: string; jobDescription?: string }) =>
    request<{
      analysis: ResumeAnalysis
      llmEnabled: boolean
      llmLabel?: string
      llmProvider?: string | null
      aiAttempted?: boolean
    }>('/api/analyze/resume', { method: 'POST', body: JSON.stringify(body) }),

  generateCoverLetter: (body: {
    resume: string
    jobDescription: string
    company?: string
  }) =>
    request<{ letter: string; source: 'ai' | 'template'; llmEnabled: boolean }>(
      '/api/cover-letter/generate',
      { method: 'POST', body: JSON.stringify(body) },
    ),

  listApplications: () =>
    request<{ applications: Application[] }>('/api/applications'),

  createApplication: (body: {
    company: string
    role: string
    status?: ApplicationStatus
    appliedAt?: string | null
    notes?: string
    jobUrl?: string
  }) =>
    request<{ application: Application }>('/api/applications', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateApplication: (
    id: string,
    body: Partial<{
      company: string
      role: string
      status: ApplicationStatus
      appliedAt: string | null
      notes: string
      jobUrl: string
    }>,
  ) =>
    request<{ application: Application }>(`/api/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteApplication: (id: string) =>
    fetch(`/api/applications/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    }),
}

export function persistSession(user: User, token: string) {
  setToken(token)
  return user
}

export function clearSession() {
  setToken(null)
}
