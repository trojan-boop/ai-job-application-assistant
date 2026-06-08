import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import analyzeRoutes from './routes/analyze.js'
import coverLetterRoutes from './routes/coverLetter.js'
import applicationRoutes from './routes/applications.js'
import { getLlmInfo } from './services/llm.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  const llm = getLlmInfo()
  res.json({
    ok: true,
    llmEnabled: llm.enabled,
    llmProvider: llm.provider,
    llmModel: llm.model,
    llmLabel: llm.label,
    llmSetupHint: llm.setupHint,
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/analyze', analyzeRoutes)
app.use('/api/cover-letter', coverLetterRoutes)
app.use('/api/applications', applicationRoutes)

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err)
    res.status(500).json({ error: 'Internal server error.' })
  },
)

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`)
  const llm = getLlmInfo()
  console.log(
    `LLM: ${llm.enabled ? `${llm.label} (${llm.model})` : 'disabled (rules/template fallback)'}`,
  )
})
