import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { createUser, findUserByEmail, findUserById } from '../db/store.js'
import { requireAuth, signToken } from '../middleware/auth.js'

const router = Router()

function toPublicUser(user: { id: string; email: string; name: string }) {
  return { id: user.id, email: user.email, name: user.name }
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body as {
    name?: string
    email?: string
    password?: string
  }

  const trimmedName = name?.trim()
  const normalizedEmail = email?.trim().toLowerCase()

  if (!trimmedName || !normalizedEmail || !password || password.length < 6) {
    res.status(400).json({ error: 'Name, email, and password (6+ chars) required.' })
    return
  }

  if (findUserByEmail(normalizedEmail)) {
    res.status(409).json({ error: 'Email already registered.' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = createUser({
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name: trimmedName,
    passwordHash,
    createdAt: new Date().toISOString(),
  })

  const token = signToken({ userId: user.id, email: user.email })
  res.status(201).json({ user: toPublicUser(user), token })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }
  const normalizedEmail = email?.trim().toLowerCase()

  if (!normalizedEmail || !password) {
    res.status(400).json({ error: 'Email and password required.' })
    return
  }

  const user = findUserByEmail(normalizedEmail)
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password.' })
    return
  }

  const token = signToken({ userId: user.id, email: user.email })
  res.json({ user: toPublicUser(user), token })
})

router.get('/me', requireAuth, (req, res) => {
  const user = findUserById(req.auth!.userId)
  if (!user) {
    res.status(401).json({ error: 'User not found.' })
    return
  }
  res.json({ user: toPublicUser(user) })
})

export default router
