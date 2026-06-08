import type { ResumeAnalysis } from '../types.js'
import { analyzeResumeHeuristic } from './heuristicAnalyzer.js'
import { parseJobDescription } from './jobParser.js'
import { parseResume } from './resumeParser.js'
import {
  chatJson,
  chatText,
  getErrorMessage,
  getLlmInfo,
  isLlmEnabled,
} from './llmClient.js'

export { getLlmInfo, isLlmEnabled }

function sanitizeText(text: string): string {
  return text
    .replace(/\u0000/g, '')
    .replace(/\r/g, '')
    .trim()
}

function parseAiJson(content: string): Record<string, unknown> {
  const trimmed = content.trim()
  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI returned invalid JSON.')
    return JSON.parse(match[0]) as Record<string, unknown>
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export async function analyzeResumeWithAi(
  resumeText: string,
  jobDescription: string,
): Promise<ResumeAnalysis> {
  const text = sanitizeText(resumeText)
  const jobText = sanitizeText(jobDescription)
  const baseline = analyzeResumeHeuristic(text, jobText)

  if (!isLlmEnabled()) {
    return baseline
  }

  const resume = parseResume(text)
  const job = parseJobDescription(jobText)
  const context = buildAnalysisContext(resume, job, baseline)

  const prompt = `You are a strict ATS resume evaluator. Review the structured resume analysis below.
Return ONLY valid JSON with this exact shape:
{
  "summary": "string",
  "suggestions": ["string"],
  "scoreAdjustment": 0
}

Rules:
- "summary": 2-3 sentences about THIS specific resume's strengths and gaps.
- "suggestions": up to 3 resume-specific improvements not already covered below.
- "scoreAdjustment": integer from -3 to +8 adjusting the baseline ATS score. If the resume has good content but low baseline (likely PDF parsing), add +3 to +6. Most strong resumes: +2 to +5. Only subtract for clear quality issues.

Baseline ATS score: ${baseline.score}
Experience: ${resume.experiences.length} roles, ~${resume.totalExperienceYears ?? 'unknown'} years
Quantified bullets: ${resume.quantifiedBulletCount}/${resume.allBullets.length}
Skills listed: ${resume.skillsListed.slice(0, 12).join(', ') || 'none in skills section'}
Job match: ${baseline.jobKeywordsMatched.length} matched, ${baseline.jobKeywordsMissing.length} missing

Existing suggestions (do not repeat):
${baseline.suggestions.map((s) => `- ${s}`).join('\n')}

RESUME EXCERPT:
${text.slice(0, 5000)}

JOB DESCRIPTION:
${jobText.slice(0, 2500) || '(none provided)'}

STRUCTURED CONTEXT:
${context}`

  try {
    const content = await chatJson(prompt, { label: 'analyzeResumeWithAi' })
    let parsed: Record<string, unknown>
    try {
      parsed = parseAiJson(content)
    } catch {
      console.warn('[analyzeResumeWithAi] Could not parse AI JSON, using partial response.')
      parsed = { summary: content.slice(0, 500), suggestions: [], scoreAdjustment: 2 }
    }

    const adjustment = clamp(toNumber(parsed.scoreAdjustment), -3, 8)
    const aiSuggestions = toStringArray(parsed.suggestions)
    const summary =
      typeof parsed.summary === 'string' ? parsed.summary.trim() : undefined

    const mergedSuggestions = [
      ...baseline.suggestions,
      ...aiSuggestions.filter(
        (suggestion) =>
          !baseline.suggestions.some(
            (existing) => existing.toLowerCase() === suggestion.toLowerCase(),
          ),
      ),
    ].slice(0, 8)

    return {
      ...baseline,
      score: clamp(baseline.score + adjustment, 0, 100),
      summary,
      suggestions: mergedSuggestions,
      source: 'ai',
    }
  } catch (err) {
    const { message, retryable } = getErrorMessage(err)
    console.error('[analyzeResumeWithAi] AI fallback:', message)

    return {
      ...baseline,
      aiFallbackReason: message,
      aiRetryable: retryable,
      suggestions: [
        `AI analysis unavailable (${message}) — showing rule-based results.`,
        ...baseline.suggestions,
      ],
    }
  }
}

function buildAnalysisContext(
  resume: ReturnType<typeof parseResume>,
  job: ReturnType<typeof parseJobDescription>,
  baseline: ResumeAnalysis,
): string {
  const roles = resume.experiences
    .slice(0, 4)
    .map(
      (exp) =>
        `- ${exp.title || exp.header}${exp.company ? ` @ ${exp.company}` : ''}${exp.dateRange ? ` (${exp.dateRange})` : ''}: ${exp.bullets.length} bullets`,
    )
    .join('\n')

  return [
    `Sections: ${resume.sectionsFound.join(', ') || 'none detected'}`,
    `Missing: ${baseline.sectionsMissing.join(', ') || 'none'}`,
    `Education entries: ${resume.educationEntries.length}`,
    `Roles:\n${roles || '- none parsed'}`,
    job
      ? `Job requires ~${job.requiredYears ?? '?'} years; priority terms: ${job.priorityTerms.slice(0, 8).join(', ') || 'none flagged'}`
      : 'No job description provided',
    baseline.scoreBreakdown
      ? `Score breakdown — contact: ${baseline.scoreBreakdown.contact}, structure: ${baseline.scoreBreakdown.structure}, experience: ${baseline.scoreBreakdown.experience}, education: ${baseline.scoreBreakdown.education}, skills: ${baseline.scoreBreakdown.skills}, job/quality: ${baseline.scoreBreakdown.jobMatch}`
      : '',
  ].join('\n')
}

export async function generateCoverLetter(input: {
  resume: string
  jobDescription: string
  company?: string
  applicantName: string
}): Promise<{ letter: string; source: 'ai' | 'template' }> {
  const { resume, jobDescription, company, applicantName } = input

  if (!isLlmEnabled()) {
    return {
      source: 'template',
      letter: buildTemplateCoverLetter(applicantName, company, jobDescription),
    }
  }

  const prompt = `Write a professional cover letter (3-4 paragraphs) for ${applicantName}.
Company: ${company || 'the company'}
Use the resume and job posting. Be specific, confident, not generic.
Return only the letter text, no markdown fences.

RESUME:
${sanitizeText(resume).slice(0, 5000)}

JOB:
${sanitizeText(jobDescription).slice(0, 4000)}`

  try {
    const letter = (await chatText(prompt, { label: 'generateCoverLetter' })).trim()
    if (!letter) throw new Error('Empty cover letter')
    return { letter, source: 'ai' }
  } catch (err) {
    console.error('[generateCoverLetter] AI fallback:', getErrorMessage(err).message)
    return {
      source: 'template',
      letter: buildTemplateCoverLetter(applicantName, company, jobDescription),
    }
  }
}

function buildTemplateCoverLetter(
  name: string,
  company: string | undefined,
  jobDescription: string,
): string {
  const target = company || 'your organization'
  const roleHint = jobDescription.split('\n')[0]?.slice(0, 120) || 'the open role'

  return `Dear Hiring Manager,

I am writing to express my interest in ${roleHint} at ${target}. My background aligns with the responsibilities outlined in your posting, and I am motivated to contribute to your team's goals.

In my recent roles, I have delivered measurable results by combining technical execution with clear communication. I would welcome the opportunity to bring that same focus to ${target}.

Thank you for considering my application. I look forward to discussing how I can add value to your team.

Sincerely,
${name}`
}
