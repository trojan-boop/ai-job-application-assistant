import type { ParsedJob } from './jobParser.js'
import { matchResumeToJob } from './jobParser.js'
import {
  CRITICAL_SECTIONS,
  type ParsedResume,
} from './resumeParser.js'

export type ScoreBreakdown = {
  contact: number
  structure: number
  experience: number
  education: number
  skills: number
  jobMatch: number
}

function scoreContact(resume: ParsedResume): number {
  let score = 0
  if (resume.contact.hasEmail) score += 4
  if (resume.contact.hasPhone) score += 3
  if (resume.contact.hasLinkedIn || resume.contact.hasGitHub) score += 3
  if (resume.contact.hasPortfolio) score += 1
  return Math.min(10, score)
}

function scoreStructure(resume: ParsedResume): number {
  let score = 0
  for (const section of CRITICAL_SECTIONS) {
    const content = resume.sectionContent[section]
    if (content && content.trim().length > 20) score += 6
    else if (resume.sectionsFound.includes(section)) score += 3
  }
  if (resume.sectionContent.Summary?.trim()) score += 2
  if (resume.sectionContent.Projects?.trim()) score += 1
  if (resume.sectionContent.Certifications?.trim()) score += 1
  return Math.min(22, score)
}

function scoreExperience(resume: ParsedResume): number {
  const { experiences, allBullets } = resume
  if (experiences.length === 0) return 0

  let score = 0
  const rolesWithDates = experiences.filter((exp) => exp.dateRange).length
  const rolesWithBullets = experiences.filter((exp) => exp.bullets.length > 0).length
  const avgBullets =
    experiences.reduce((sum, exp) => sum + exp.bullets.length, 0) / experiences.length

  score += Math.min(6, rolesWithDates * 2)
  score += Math.min(6, rolesWithBullets * 2)

  if (avgBullets >= 3) score += 5
  else if (avgBullets >= 2) score += 3
  else if (avgBullets >= 1) score += 1

  if (allBullets.length > 0) {
    const metricRatio = resume.quantifiedBulletCount / allBullets.length
    const verbRatio = resume.actionVerbBulletCount / allBullets.length
    score += Math.round(metricRatio * 6)
    score += Math.round(verbRatio * 4)
  }

  return Math.min(25, score)
}

function scoreEducation(resume: ParsedResume): number {
  if (resume.educationEntries.length === 0) return 0

  const text = resume.educationEntries.join(' ').toLowerCase()
  let score = 4

  if (/\b(b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?b\.?a\.?|ph\.?d\.?|bachelor|master|degree|diploma)\b/i.test(text)) {
    score += 4
  }
  if (/\b(university|college|institute|school)\b/i.test(text)) score += 3
  if (/\d{4}/.test(text)) score += 1

  return Math.min(10, score)
}

function scoreSkills(resume: ParsedResume, job: ParsedJob | null, jobMatchRatio: number): number {
  let score = 0

  if (resume.skillsListed.length >= 8) score += 6
  else if (resume.skillsListed.length >= 4) score += 4
  else if (resume.skillsListed.length >= 1) score += 2

  if (resume.skillsInResume.length >= 6) score += 4
  else if (resume.skillsInResume.length >= 3) score += 2

  const skillsInBullets = resume.allBullets.some((bullet) =>
    resume.skillsInResume.some((skill) => bullet.text.toLowerCase().includes(skill)),
  )
  if (skillsInBullets) score += 3

  if (job) {
    score += Math.round(jobMatchRatio * 5)
  }

  return Math.min(18, score)
}

function scoreJobMatch(
  resume: ParsedResume,
  job: ParsedJob,
  matchRatio: number,
  priorityMatched: string[],
  priorityMissing: string[],
): number {
  let score = 0

  if (matchRatio >= 0.7) score += 14
  else if (matchRatio >= 0.5) score += 11
  else if (matchRatio >= 0.35) score += 8
  else if (matchRatio >= 0.2) score += 5
  else score += 2

  if (job.priorityTerms.length > 0) {
    const priorityRatio = priorityMatched.length / job.priorityTerms.length
    score += Math.round(priorityRatio * 8)
  }

  if (job.requiredYears !== null && resume.totalExperienceYears !== null) {
    if (resume.totalExperienceYears >= job.requiredYears) score += 6
    else if (resume.totalExperienceYears >= job.requiredYears - 1) score += 3
  } else if (job.requiredYears !== null) {
    score -= 2
  }

  const titleText = resume.experiences.map((exp) => exp.title.toLowerCase()).join(' ')
  if (job.titleHints.some((hint) => titleText.includes(hint.split(' ')[0] ?? ''))) {
    score += 2
  }

  if (priorityMissing.length > 3) score -= 3

  return Math.min(30, Math.max(0, score))
}

function scoreWithoutJob(resume: ParsedResume): number {
  let score = 0
  if (resume.wordCount >= 250 && resume.wordCount <= 700) score += 8
  else if (resume.wordCount >= 150) score += 5
  else if (resume.wordCount >= 80) score += 2

  const contactScore = scoreContact(resume)
  if (contactScore >= 7) score += 5
  else if (contactScore >= 4) score += 2

  if (resume.allBullets.length >= 6) score += 5
  else if (resume.allBullets.length >= 2) score += 3
  if (resume.quantifiedBulletCount >= 3) score += 4
  else if (resume.quantifiedBulletCount >= 1) score += 2

  if (resume.experiences.length >= 1) score += 3

  return Math.min(22, score)
}

function buildPenalties(resume: ParsedResume, job: ParsedJob | null): number {
  let penalty = 0

  for (const section of CRITICAL_SECTIONS) {
    if (!resume.sectionsFound.includes(section)) penalty += 3
  }

  if (resume.wordCount < 80) penalty += 8
  else if (resume.wordCount < 120) penalty += 3

  if (resume.experiences.length === 0 && resume.wordCount > 150) penalty += 5
  if (resume.allBullets.length === 0 && resume.experiences.length > 0) penalty += 2

  if (job?.requiredYears && resume.totalExperienceYears !== null) {
    if (resume.totalExperienceYears < job.requiredYears - 1) penalty += 4
  }

  return Math.min(15, penalty)
}

export function scoreResume(
  resume: ParsedResume,
  job: ParsedJob | null,
  resumeText: string,
): { score: number; breakdown: ScoreBreakdown; jobKeywordsMatched: string[]; jobKeywordsMissing: string[] } {
  const jobMatch = job
    ? matchResumeToJob(resumeText, [...resume.skillsListed, ...resume.skillsInResume], job)
    : null

  const breakdown: ScoreBreakdown = {
    contact: scoreContact(resume),
    structure: scoreStructure(resume),
    experience: scoreExperience(resume),
    education: scoreEducation(resume),
    skills: scoreSkills(resume, job, jobMatch?.matchRatio ?? 0),
    jobMatch: job
      ? scoreJobMatch(
          resume,
          job,
          jobMatch!.matchRatio,
          jobMatch!.priorityMatched,
          jobMatch!.priorityMissing,
        )
      : scoreWithoutJob(resume),
  }

  const raw =
    breakdown.contact +
    breakdown.structure +
    breakdown.experience +
    breakdown.education +
    breakdown.skills +
    breakdown.jobMatch

  const penalty = buildPenalties(resume, job)
  const score = Math.min(100, Math.max(0, Math.round(raw - penalty)))

  return {
    score,
    breakdown,
    jobKeywordsMatched: jobMatch?.matched.slice(0, 15) ?? [],
    jobKeywordsMissing: jobMatch?.missing.slice(0, 10) ?? [],
  }
}

export function buildResumeSuggestions(
  resume: ParsedResume,
  job: ParsedJob | null,
  jobKeywordsMissing: string[],
): string[] {
  const suggestions: string[] = []

  if (!resume.contact.hasEmail) {
    suggestions.push('Add a professional email address at the top of your resume.')
  }
  if (!resume.contact.hasPhone) {
    suggestions.push('Include a phone number so recruiters can reach you easily.')
  }

  const missingCritical = CRITICAL_SECTIONS.filter(
    (section) => !resume.sectionsFound.includes(section),
  )
  if (missingCritical.length > 0) {
    suggestions.push(`Add dedicated sections for: ${missingCritical.join(', ')}.`)
  }

  if (resume.wordCount > 200 && resume.experiences.length === 0) {
    suggestions.push(
      'PDF formatting may hide job titles and bullets — add clear headings (EXPERIENCE, SKILLS) and use - bullet lines for best results.',
    )
  }

  if (resume.experiences.length === 0) {
    suggestions.push('List work experience with job titles, companies, dates, and bullet points.')
  } else {
    const rolesWithoutDates = resume.experiences.filter((exp) => !exp.dateRange).length
    if (rolesWithoutDates > 0) {
      suggestions.push(`${rolesWithoutDates} role(s) are missing date ranges — ATS systems rely on timelines.`)
    }

    const thinRoles = resume.experiences.filter((exp) => exp.bullets.length < 2).length
    if (thinRoles > 0) {
      suggestions.push('Expand thin roles with 2–4 achievement bullets each.')
    }
  }

  if (resume.allBullets.length > 0) {
    const metricRatio = resume.quantifiedBulletCount / resume.allBullets.length
    if (metricRatio < 0.35) {
      suggestions.push(
        `Only ${Math.round(metricRatio * 100)}% of your bullets include metrics — add numbers, percentages, or scale.`,
      )
    }
  }

  if (resume.skillsListed.length < 4) {
    suggestions.push('Add a dedicated skills section listing tools and technologies from your experience.')
  }

  if (job?.requiredYears && resume.totalExperienceYears !== null) {
    if (resume.totalExperienceYears < job.requiredYears) {
      suggestions.push(
        `Job asks for ${job.requiredYears}+ years; your resume shows ~${resume.totalExperienceYears} years of experience.`,
      )
    }
  }

  if (job && jobKeywordsMissing.length > 0) {
    suggestions.push(
      `Missing job-specific terms: ${jobKeywordsMissing.slice(0, 6).join(', ')}.`,
    )
  } else if (!job) {
    suggestions.push('Paste the job description to score keyword alignment for this specific role.')
  }

  if (resume.wordCount > 900) {
    suggestions.push('Resume is long — trim to one page (~400–700 words) for most roles.')
  } else if (resume.wordCount < 150) {
    suggestions.push('Resume is very short — add more detail about your impact in each role.')
  }

  if (suggestions.length === 0) {
    suggestions.push('Solid resume structure — keep tailoring bullets and keywords for each application.')
  }

  return suggestions.slice(0, 7)
}
