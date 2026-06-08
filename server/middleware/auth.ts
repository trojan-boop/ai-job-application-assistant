import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export type AuthPayload = { userId: string; email: string }

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload
    }
  }
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET must be set (min 16 characters) in .env')
  }
  return secret
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' })
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' })
    return
  }

  const token = header.slice(7)
  try {
    const decoded = jwt.verify(token, getSecret()) as AuthPayload
    req.auth = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' })
  }
}
