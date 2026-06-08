import { COMMON_SKILLS, SKILL_PHRASES } from './resumeParser.js'

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'will', 'our', 'are', 'this',
  'that', 'from', 'have', 'has', 'been', 'able', 'work', 'team', 'role',
  'job', 'position', 'company', 'including', 'required', 'preferred', 'must',
  'should', 'would', 'about', 'into', 'their', 'they', 'them', 'what', 'when',
  'where', 'which', 'while', 'also', 'other', 'such', 'than', 'then', 'more',
  'most', 'some', 'any', 'all', 'can', 'may', 'not', 'but', 'who', 'how',
  'experience', 'years', 'year', 'strong', 'excellent', 'ability', 'skills',
  'looking', 'join', 'help', 'using', 'used', 'use', 'make', 'well', 'within',
])

export type ParsedJob = {
  keywords: string[]
  skillPhrases: string[]
  requiredYears: number | null
  titleHints: string[]
  priorityTerms: string[]
}

function extractRequiredYears(jobDescription: string): number | null {
  const patterns = [
    /(\d+)\+?\s*(?:to|-)?\s*(\d+)?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:professional\s+)?experience/i,
    /minimum\s+of\s+(\d+)\s*(?:years?|yrs?)/i,
    /at least\s+(\d+)\s*(?:years?|yrs?)/i,
  ]

  for (const pattern of patterns) {
    const match = jobDescription.match(pattern)
    if (!match) continue
    const min = Number(match[1])
    if (!Number.isNaN(min) && min > 0) return min
  }
  return null
}

function extractTitleHints(jobDescription: string): string[] {
  const lines = jobDescription
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)

  const hints: string[] = []
  for (const line of lines) {
    if (line.length > 8 && line.length < 80) {
      hints.push(line.toLowerCase())
    }
  }
  return hints
}

function extractPriorityTerms(jobDescription: string): string[] {
  const priority: string[] = []
  const sections = jobDescription.split(/\n(?=[A-Z][a-z]+:)/)

  for (const section of sections) {
    const isRequired =
      /\b(required|must have|minimum|qualifications|requirements)\b/i.test(section)
    if (!isRequired) continue

    for (const phrase of SKILL_PHRASES) {
      if (section.toLowerCase().includes(phrase)) priority.push(phrase)
    }
    for (const skill of COMMON_SKILLS) {
      if (section.toLowerCase().includes(skill)) priority.push(skill)
    }
  }

  return [...new Set(priority)]
}

function extractKeywords(jobDescription: string): string[] {
  const lower = jobDescription.toLowerCase()
  const words = lower
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))

  const seen = new Set<string>()
  const keywords: string[] = []

  for (const word of words) {
    if (seen.has(word)) continue
    seen.add(word)
    if (COMMON_SKILLS.includes(word) || word.length >= 5) keywords.push(word)
  }

  return keywords.slice(0, 35)
}

export function parseJobDescription(jobDescription: string): ParsedJob | null {
  const trimmed = jobDescription.trim()
  if (!trimmed) return null

  const lower = trimmed.toLowerCase()
  const skillPhrases = SKILL_PHRASES.filter((phrase) => lower.includes(phrase))
  const keywords = extractKeywords(trimmed)

  return {
    keywords,
    skillPhrases,
    requiredYears: extractRequiredYears(trimmed),
    titleHints: extractTitleHints(trimmed),
    priorityTerms: extractPriorityTerms(trimmed),
  }
}

export function matchResumeToJob(
  resumeText: string,
  resumeSkills: string[],
  job: ParsedJob,
) {
  const lower = resumeText.toLowerCase()
  const normalizedSkills = new Set(resumeSkills.map((skill) => skill.toLowerCase()))

  const allTerms = [...new Set([...job.skillPhrases, ...job.keywords, ...job.priorityTerms])]
  const matched: string[] = []
  const missing: string[] = []

  for (const term of allTerms) {
    const hit =
      lower.includes(term.toLowerCase()) ||
      normalizedSkills.has(term.toLowerCase()) ||
      [...normalizedSkills].some(
        (skill) => skill.includes(term.toLowerCase()) || term.toLowerCase().includes(skill),
      )

    if (hit) matched.push(term)
    else missing.push(term)
  }

  const priorityMatched = job.priorityTerms.filter((term) => matched.includes(term))
  const priorityMissing = job.priorityTerms.filter((term) => missing.includes(term))

  return {
    matched,
    missing,
    priorityMatched,
    priorityMissing,
    matchRatio: allTerms.length > 0 ? matched.length / allTerms.length : 0,
  }
}
