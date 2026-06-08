const SECTION_KEYWORDS: Record<string, RegExp[]> = {
  Summary: [/\b(summary|profile|objective|about me)\b/i],
  Experience: [/\b(experience|work history|employment|professional experience)\b/i],
  Education: [/\b(education|academic background)\b/i],
  Skills: [/\b(skills|technical skills|core competencies|competencies)\b/i],
  Projects: [/\bprojects?\b/i],
  Certifications: [/\b(certifications?|licenses?|credentials?)\b/i],
}

export const CRITICAL_SECTIONS = ['Experience', 'Education', 'Skills'] as const

export const COMMON_SKILLS = [
  'javascript', 'typescript', 'react', 'node', 'python', 'java', 'sql',
  'aws', 'docker', 'kubernetes', 'git', 'agile', 'communication',
  'leadership', 'project management', 'machine learning', 'data analysis',
  'excel', 'figma', 'graphql', 'rest', 'html', 'css', 'vue', 'angular',
  'postgresql', 'mongodb', 'redis', 'ci/cd', 'testing', 'next.js', 'express',
  'terraform', 'linux', 'scrum', 'jira', 'tableau', 'power bi', 'salesforce',
]

export const SKILL_PHRASES = [
  'machine learning', 'project management', 'data analysis', 'ci/cd',
  'react native', 'node.js', 'next.js', 'power bi', 'deep learning',
  'cloud computing', 'software engineering', 'full stack', 'full-stack',
  'cross-functional', 'stakeholder management', 'product management',
]

export const ACTION_VERBS = [
  'achieved', 'built', 'created', 'delivered', 'designed', 'developed',
  'drove', 'implemented', 'improved', 'increased', 'led', 'managed',
  'optimized', 'produced', 'reduced', 'resolved', 'spearheaded', 'streamlined',
  'architected', 'automated', 'collaborated', 'coordinated', 'established',
  'executed', 'generated', 'launched', 'mentored', 'migrated', 'scaled',
]

const DATE_RANGE = /(\d{4})\s*[-–—]\s*(present|current|\d{4})/i
const BULLET_PREFIX = /^[-•*▪◦‣►]\s*/
const METRIC_PATTERN =
  /\b\d+%|\$\d[\d,]*|\d[\d,]*\+?\s*(years?|yrs?|months?|people|users|clients|customers|team members?|projects?|k|m\b)/i

export type ParsedBullet = {
  text: string
  hasMetric: boolean
  startsWithActionVerb: boolean
}

export type ParsedExperience = {
  header: string
  title: string
  company: string
  dateRange: string | null
  bullets: ParsedBullet[]
}

export type ParsedResume = {
  wordCount: number
  lines: string[]
  contact: {
    hasEmail: boolean
    hasPhone: boolean
    hasLinkedIn: boolean
    hasGitHub: boolean
    hasPortfolio: boolean
  }
  sectionsFound: string[]
  sectionsMissing: string[]
  sectionContent: Record<string, string>
  experiences: ParsedExperience[]
  educationEntries: string[]
  skillsListed: string[]
  skillsInResume: string[]
  allBullets: ParsedBullet[]
  totalExperienceYears: number | null
  quantifiedBulletCount: number
  actionVerbBulletCount: number
}

function isLikelyHeading(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > 55) return false
  if (/^[-•*#|]/.test(trimmed)) return false
  if (DATE_RANGE.test(trimmed)) return false

  if (
    trimmed.length >= 3 &&
    trimmed.length <= 40 &&
    trimmed === trimmed.toUpperCase() &&
    /^[A-Z0-9\s/&-]+$/.test(trimmed)
  ) {
    return true
  }

  const words = trimmed.split(/\s+/).length
  if (words > 8) return false
  if (trimmed.endsWith('.') && words > 2) return false
  return true
}

function parseBullet(text: string): ParsedBullet {
  const cleaned = text.trim()
  const firstWord = cleaned.split(/\s+/)[0]?.toLowerCase() ?? ''
  return {
    text: cleaned,
    hasMetric: METRIC_PATTERN.test(cleaned),
    startsWithActionVerb: ACTION_VERBS.some((verb) => firstWord.startsWith(verb)),
  }
}

function splitSectionContent(lines: string[]) {
  const headings: { index: number; section: string }[] = []

  lines.forEach((line, index) => {
    if (!line || !isLikelyHeading(line)) return
    for (const [section, patterns] of Object.entries(SECTION_KEYWORDS)) {
      if (patterns.some((pattern) => pattern.test(line))) {
        if (!headings.some((h) => h.section === section && h.index === index)) {
          headings.push({ index, section })
        }
        break
      }
    }
  })

  const sectionContent: Record<string, string> = {}
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].index + 1
    const end = headings[i + 1]?.index ?? lines.length
    sectionContent[headings[i].section] = lines.slice(start, end).filter(Boolean).join('\n')
  }

  const sectionsFound = Object.keys(sectionContent).filter(
    (section) => sectionContent[section].trim().length > 0,
  )
  const sectionsMissing = Object.keys(SECTION_KEYWORDS).filter(
    (section) => !sectionsFound.includes(section),
  )

  return { sectionContent, sectionsFound, sectionsMissing }
}

function parseSkillsList(content: string): string[] {
  const items = content
    .split(/[\n,|•·;]/)
    .map((item) => item.replace(BULLET_PREFIX, '').trim())
    .filter((item) => item.length > 1 && item.length < 45)

  const seen = new Set<string>()
  const skills: string[] = []
  for (const item of items) {
    const key = item.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    skills.push(item)
  }
  return skills
}

function looksLikeBulletLine(line: string): boolean {
  if (BULLET_PREFIX.test(line) || line.startsWith('•')) return true
  const firstWord = line.split(/\s+/)[0]?.toLowerCase() ?? ''
  if (ACTION_VERBS.some((verb) => firstWord.startsWith(verb))) return true
  if (METRIC_PATTERN.test(line) && line.length < 220) return true
  return false
}

function parseExperiences(content: string): ParsedExperience[] {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean)
  const experiences: ParsedExperience[] = []
  let current: ParsedExperience | null = null

  for (const line of lines) {
    const dateMatch = line.match(DATE_RANGE)
    const isRoleHeader = dateMatch !== null || looksLikeRoleHeader(line)

    if (isRoleHeader) {
      if (current && (current.bullets.length > 0 || current.title || current.header)) {
        experiences.push(current)
      }
      current = parseRoleHeader(line, dateMatch?.[0] ?? null)
      continue
    }

    if (looksLikeBulletLine(line)) {
      if (!current) {
        current = { header: '', title: '', company: '', dateRange: null, bullets: [] }
      }
      current.bullets.push(parseBullet(line.replace(BULLET_PREFIX, '')))
      continue
    }

    if (current?.title && line.length > 20 && !looksLikeRoleHeader(line)) {
      current.bullets.push(parseBullet(line))
      continue
    }

    if (current && !current.company) {
      current.company = line
    }
  }

  if (current && (current.bullets.length > 0 || current.title || current.header)) {
    experiences.push(current)
  }

  return experiences
}

function inferSections(
  text: string,
  sectionsFound: string[],
  experiences: ParsedExperience[],
  educationEntries: string[],
  skillsListed: string[],
  skillsInResume: string[],
): string[] {
  const found = new Set(sectionsFound)

  if (experiences.length > 0) found.add('Experience')
  if (
    educationEntries.length > 0 ||
    /\b(bachelor|master|b\.s\.|b\.a\.|m\.s\.|degree|university|college|diploma)\b/i.test(text)
  ) {
    found.add('Education')
  }
  if (skillsListed.length > 0 || skillsInResume.length >= 4) found.add('Skills')
  if (/\b(summary|profile|objective)\b/i.test(text)) found.add('Summary')

  return [...found]
}

function looksLikeRoleHeader(line: string): boolean {
  if (DATE_RANGE.test(line)) return true
  if (line.includes('|') && line.split('|').length >= 2) return true
  if (/\b(intern|engineer|developer|manager|analyst|designer|consultant|director|lead|specialist|coordinator|associate)\b/i.test(line)) {
    return line.length < 90
  }
  return false
}

function parseRoleHeader(line: string, dateRange: string | null): ParsedExperience {
  const parts = line.split('|').map((part) => part.trim()).filter(Boolean)
  let title = line
  let company = ''

  if (parts.length >= 2) {
    title = parts[0]
    company = parts[1].replace(DATE_RANGE, '').trim()
    if (!dateRange) {
      const match = parts.slice(1).join(' | ').match(DATE_RANGE)
      dateRange = match?.[0] ?? null
    }
  } else {
    const match = line.match(DATE_RANGE)
    dateRange = dateRange ?? match?.[0] ?? null
    title = line.replace(DATE_RANGE, '').trim()
  }

  return {
    header: line,
    title,
    company,
    dateRange,
    bullets: [],
  }
}

function estimateExperienceYears(experiences: ParsedExperience[]): number | null {
  const ranges: { start: number; end: number }[] = []

  for (const exp of experiences) {
    if (!exp.dateRange) continue
    const match = exp.dateRange.match(/(\d{4})\s*[-–—]\s*(present|current|(\d{4}))/i)
    if (!match) continue
    const start = Number(match[1])
    const end =
      /present|current/i.test(match[2]) ? new Date().getFullYear() : Number(match[3] ?? match[2])
    if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
      ranges.push({ start, end })
    }
  }

  if (ranges.length === 0) return null

  ranges.sort((a, b) => a.start - b.start)
  let total = 0
  let currentStart = ranges[0].start
  let currentEnd = ranges[0].end

  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i].start <= currentEnd + 1) {
      currentEnd = Math.max(currentEnd, ranges[i].end)
    } else {
      total += currentEnd - currentStart
      currentStart = ranges[i].start
      currentEnd = ranges[i].end
    }
  }
  total += currentEnd - currentStart
  return Math.max(1, total)
}

function detectSkillsInText(text: string): string[] {
  const lower = text.toLowerCase()
  const found = new Set<string>()

  for (const phrase of SKILL_PHRASES) {
    if (lower.includes(phrase)) found.add(phrase)
  }
  for (const skill of COMMON_SKILLS) {
    if (lower.includes(skill)) found.add(skill)
  }

  return [...found]
}

function parseEducationEntries(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 3)
}

export function parseResume(text: string): ParsedResume {
  const normalized = text.trim()
  const lines = normalized.split(/\n/).map((line) => line.trim())
  const nonEmptyLines = lines.filter(Boolean)
  const wordCount = normalized ? normalized.split(/\s+/).filter(Boolean).length : 0

  const { sectionContent, sectionsFound: parsedSections } = splitSectionContent(nonEmptyLines)

  const experienceContent =
    sectionContent.Experience ??
    nonEmptyLines.slice(0, Math.min(50, nonEmptyLines.length)).join('\n')
  const experiences = parseExperiences(experienceContent)

  const skillsListed = sectionContent.Skills
    ? parseSkillsList(sectionContent.Skills)
    : parseSkillsList(normalized)
  const skillsInResume = detectSkillsInText(normalized)

  const allBullets = experiences.flatMap((exp) => exp.bullets)
  const educationEntries = sectionContent.Education
    ? parseEducationEntries(sectionContent.Education)
    : parseEducationEntries(
        nonEmptyLines
          .filter((line) =>
            /\b(education|university|college|bachelor|master|degree|b\.s\.|m\.s\.)\b/i.test(line),
          )
          .join('\n'),
      )

  const sectionsFound = inferSections(
    normalized,
    parsedSections,
    experiences,
    educationEntries,
    skillsListed,
    skillsInResume,
  )
  const sectionsMissing = Object.keys(SECTION_KEYWORDS).filter(
    (section) => !sectionsFound.includes(section),
  )

  return {
    wordCount,
    lines: nonEmptyLines,
    contact: {
      hasEmail: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/.test(normalized),
      hasPhone: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(normalized),
      hasLinkedIn: /linkedin\.com/i.test(normalized),
      hasGitHub: /github\.com/i.test(normalized),
      hasPortfolio: /\b(portfolio|behance|dribbble)\b/i.test(normalized),
    },
    sectionsFound,
    sectionsMissing,
    sectionContent,
    experiences,
    educationEntries,
    skillsListed,
    skillsInResume,
    allBullets,
    totalExperienceYears: estimateExperienceYears(experiences),
    quantifiedBulletCount: allBullets.filter((bullet) => bullet.hasMetric).length,
    actionVerbBulletCount: allBullets.filter((bullet) => bullet.startsWithActionVerb).length,
  }
}
