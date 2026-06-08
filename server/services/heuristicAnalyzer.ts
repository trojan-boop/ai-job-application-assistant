import type { ResumeAnalysis } from '../types.js'
import { parseJobDescription } from './jobParser.js'
import { parseResume, CRITICAL_SECTIONS } from './resumeParser.js'
import { buildResumeSuggestions, scoreResume } from './resumeScorer.js'

export function analyzeResumeHeuristic(
  resumeText: string,
  jobDescription = '',
): ResumeAnalysis {
  const text = resumeText.trim()
  const resume = parseResume(text)
  const job = parseJobDescription(jobDescription)
  const { score, breakdown, jobKeywordsMatched, jobKeywordsMissing } = scoreResume(
    resume,
    job,
    text,
  )

  const suggestions = buildResumeSuggestions(resume, job, jobKeywordsMissing)

  return {
    score,
    wordCount: resume.wordCount,
    sectionsFound: resume.sectionsFound,
    sectionsMissing: resume.sectionsMissing.filter((section) =>
      ['Summary', ...CRITICAL_SECTIONS].includes(section),
    ),
    skillsDetected: resume.skillsInResume,
    jobKeywordsMatched,
    jobKeywordsMissing,
    suggestions,
    scoreBreakdown: breakdown,
    experienceYears: resume.totalExperienceYears,
    roleCount: resume.experiences.length,
    source: 'rules',
  }
}
