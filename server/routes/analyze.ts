import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { analyzeResumeWithAi, getLlmInfo } from '../services/llm.js'

const router = Router()

router.post('/resume', requireAuth, async (req, res) => {
  const { resume, jobDescription } = req.body as {
    resume?: string
    jobDescription?: string
  }

  if (!resume?.trim()) {
    res.status(400).json({ error: 'Resume text is required.' })
    return
  }

  const analysis = await analyzeResumeWithAi(
    resume.trim(),
    jobDescription?.trim() ?? '',
  )

  const llm = getLlmInfo()
  res.json({
    analysis,
    llmEnabled: llm.enabled,
    llmLabel: llm.label,
    llmProvider: llm.provider,
    aiAttempted: llm.enabled,
  })
})

export default router
