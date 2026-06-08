import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import type { Application, Database, User } from '../types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const DB_PATH = join(DATA_DIR, 'db.json')

const emptyDb = (): Database => ({ users: [], applications: [] })

function readDb(): Database {
  if (!existsSync(DB_PATH)) {
    return emptyDb()
  }
  try {
    return JSON.parse(readFileSync(DB_PATH, 'utf-8')) as Database
  } catch {
    return emptyDb()
  }
}

function writeDb(db: Database): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8')
}

export function findUserByEmail(email: string): User | undefined {
  const db = readDb()
  return db.users.find((u) => u.email === email)
}

export function findUserById(id: string): User | undefined {
  const db = readDb()
  return db.users.find((u) => u.id === id)
}

export function createUser(user: User): User {
  const db = readDb()
  db.users.push(user)
  writeDb(db)
  return user
}

export function listApplications(userId: string): Application[] {
  const db = readDb()
  return db.applications
    .filter((a) => a.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function findApplication(
  userId: string,
  id: string,
): Application | undefined {
  const db = readDb()
  return db.applications.find((a) => a.userId === userId && a.id === id)
}

export function createApplication(app: Application): Application {
  const db = readDb()
  db.applications.push(app)
  writeDb(db)
  return app
}

export function updateApplication(app: Application): Application | undefined {
  const db = readDb()
  const index = db.applications.findIndex(
    (a) => a.id === app.id && a.userId === app.userId,
  )
  if (index === -1) return undefined
  db.applications[index] = app
  writeDb(db)
  return app
}

export function deleteApplication(userId: string, id: string): boolean {
  const db = readDb()
  const before = db.applications.length
  db.applications = db.applications.filter(
    (a) => !(a.userId === userId && a.id === id),
  )
  if (db.applications.length === before) return false
  writeDb(db)
  return true
}
