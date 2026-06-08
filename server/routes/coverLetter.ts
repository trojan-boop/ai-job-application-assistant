import { Router } from 'express'
import { findUserById } from '../db/store.js'
import { requireAuth } from '../middleware/auth.js'
import { generateCoverLetter, isLlmEnabled } from '../services/llm.js'

const router = Router()

router.post('/generate', requireAuth, async (req, res) => {
  const { resume, jobDescription, company } = req.body as {
    resume?: string
    jobDescription?: string
    company?: string
  }

  if (!resume?.trim() || !jobDescription?.trim()) {
    res.status(400).json({
      error: 'Resume and job description are required.',
    })
    return
  }

  const user = findUserById(req.auth!.userId)
  if (!user) {
    res.status(401).json({ error: 'User not found.' })
    return
  }

  const result = await generateCoverLetter({
    resume: resume.trim(),
    jobDescription: jobDescription.trim(),
    company: company?.trim(),
    applicantName: user.name,
  })

  res.json({ ...result, llmEnabled: isLlmEnabled() })
})

export default router
