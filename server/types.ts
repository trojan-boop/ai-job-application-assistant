export type User = {
  id: string
  email: string
  name: string
  passwordHash: string
  createdAt: string
}

export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'

export type Application = {
  id: string
  userId: string
  company: string
  role: string
  status: ApplicationStatus
  appliedAt: string | null
  notes: string
  jobUrl: string
  createdAt: string
  updatedAt: string
}

export type ScoreBreakdown = {
  contact: number
  structure: number
  experience: number
  education: number
  skills: number
  jobMatch: number
}

export type ResumeAnalysis = {
  score: number
  wordCount: number
  sectionsFound: string[]
  sectionsMissing: string[]
  skillsDetected: string[]
  jobKeywordsMatched: string[]
  jobKeywordsMissing: string[]
  suggestions: string[]
  summary?: string
  aiFallbackReason?: string
  aiRetryable?: boolean
  scoreBreakdown?: ScoreBreakdown
  experienceYears?: number | null
  roleCount?: number
  source: 'ai' | 'rules'
}

export type Database = {
  users: User[]
  applications: Application[]
}
