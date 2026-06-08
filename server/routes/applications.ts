import { Router } from 'express'
import type { ApplicationStatus } from '../types.js'
import {
  createApplication,
  deleteApplication,
  findApplication,
  listApplications,
  updateApplication,
} from '../db/store.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const VALID_STATUSES: ApplicationStatus[] = [
  'saved',
  'applied',
  'interview',
  'offer',
  'rejected',
]

router.get('/', requireAuth, (req, res) => {
  res.json({ applications: listApplications(req.auth!.userId) })
})

router.post('/', requireAuth, (req, res) => {
  const { company, role, status, appliedAt, notes, jobUrl } = req.body as {
    company?: string
    role?: string
    status?: ApplicationStatus
    appliedAt?: string | null
    notes?: string
    jobUrl?: string
  }

  if (!company?.trim() || !role?.trim()) {
    res.status(400).json({ error: 'Company and role are required.' })
    return
  }

  const appStatus = status && VALID_STATUSES.includes(status) ? status : 'saved'
  const now = new Date().toISOString()

  const application = createApplication({
    id: crypto.randomUUID(),
    userId: req.auth!.userId,
    company: company.trim(),
    role: role.trim(),
    status: appStatus,
    appliedAt: appliedAt ?? null,
    notes: notes?.trim() ?? '',
    jobUrl: jobUrl?.trim() ?? '',
    createdAt: now,
    updatedAt: now,
  })

  res.status(201).json({ application })
})

router.patch('/:id', requireAuth, (req, res) => {
  const existing = findApplication(req.auth!.userId, req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Application not found.' })
    return
  }

  const body = req.body as Partial<{
    company: string
    role: string
    status: ApplicationStatus
    appliedAt: string | null
    notes: string
    jobUrl: string
  }>

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    res.status(400).json({ error: 'Invalid status.' })
    return
  }

  const updated = updateApplication({
    ...existing,
    company: body.company?.trim() ?? existing.company,
    role: body.role?.trim() ?? existing.role,
    status: body.status ?? existing.status,
    appliedAt: body.appliedAt !== undefined ? body.appliedAt : existing.appliedAt,
    notes: body.notes !== undefined ? body.notes.trim() : existing.notes,
    jobUrl: body.jobUrl !== undefined ? body.jobUrl.trim() : existing.jobUrl,
    updatedAt: new Date().toISOString(),
  })

  res.json({ application: updated })
})

router.delete('/:id', requireAuth, (req, res) => {
  const ok = deleteApplication(req.auth!.userId, req.params.id)
  if (!ok) {
    res.status(404).json({ error: 'Application not found.' })
    return
  }
  res.status(204).send()
})

export default router
