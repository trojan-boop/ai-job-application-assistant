import { type CSSProperties, type ReactNode } from 'react'
import type { ResumeAnalysis } from '../types'

function scoreGrade(score: number): { label: string; className: string } {
  if (score >= 80) return { label: 'Excellent', className: 'grade-excellent' }
  if (score >= 65) return { label: 'Good', className: 'grade-good' }
  if (score >= 45) return { label: 'Fair', className: 'grade-fair' }
  return { label: 'Needs work', className: 'grade-poor' }
}

function ScoreGauge({ score }: { score: number }) {
  const color =
    score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)'
  const grade = scoreGrade(score)
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="score-gauge-card">
      <div className="score-gauge" style={{ '--score-color': color } as CSSProperties}>
        <svg viewBox="0 0 120 120" aria-hidden>
          <circle className="score-gauge-track" cx="60" cy="60" r="54" />
          <circle
            className="score-gauge-fill"
            cx="60"
            cy="60"
            r="54"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="score-gauge-center">
          <span className="score-gauge-value">{score}</span>
          <span className="score-gauge-label">ATS score</span>
        </div>
      </div>
      <span className={`score-grade ${grade.className}`}>{grade.label}</span>
    </div>
  )
}

function ResultSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string
  count?: number
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details className="result-section" open={defaultOpen}>
      <summary className="result-section-summary">
        <span>{title}</span>
        {count != null && count > 0 && (
          <span className="result-section-count">{count}</span>
        )}
      </summary>
      <div className="result-section-body">{children}</div>
    </details>
  )
}

function analysisBadgeLabel(
  analysis: ResumeAnalysis,
  llmEnabled?: boolean,
  aiAttempted?: boolean,
): string {
  if (analysis.source === 'ai') return 'AI analysis'
  if (aiAttempted || (llmEnabled && analysis.aiFallbackReason)) {
    return 'AI failed — rules used'
  }
  return 'Rule-based analysis'
}

export function AnalysisResults({
  analysis,
  llmEnabled,
  llmLabel,
  aiAttempted,
  hasJobDescription,
  onRetryAi,
  retrying,
}: {
  analysis: ResumeAnalysis
  llmEnabled?: boolean
  llmLabel?: string
  aiAttempted?: boolean
  hasJobDescription?: boolean
  onRetryAi?: () => void
  retrying?: boolean
}) {
  return (
    <div className="analysis-results">
      <div className="result-top">
        <ScoreGauge score={analysis.score} />
        <div className="result-badges">
          <span
            className={`badge badge-${analysis.source} ${analysis.aiFallbackReason ? 'badge-fallback' : ''}`}
          >
            {analysisBadgeLabel(analysis, llmEnabled, aiAttempted)}
          </span>
          {llmLabel && analysis.source === 'ai' && (
            <span className="muted small">via {llmLabel}</span>
          )}
          {llmEnabled === false && (
            <span className="muted small">Add GROQ_API_KEY for free AI</span>
          )}
        </div>
      </div>

      {llmEnabled && analysis.source === 'rules' && analysis.aiFallbackReason && (
        <div className="analysis-fallback-banner" role="status">
          <p className="analysis-fallback-hint">{analysis.aiFallbackReason}</p>
          {analysis.aiRetryable && onRetryAi && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onRetryAi}
              disabled={retrying}
            >
              {retrying ? 'Retrying…' : 'Retry AI analysis'}
            </button>
          )}
        </div>
      )}

      {analysis.summary && (
        <div className="result-summary-card">
          <h3>AI summary</h3>
          <p>{analysis.summary}</p>
        </div>
      )}

      <div className="result-stats">
        <div className="result-stat">
          <strong>{analysis.wordCount}</strong>
          <span>Words</span>
        </div>
        <div className="result-stat">
          <strong>{analysis.roleCount ?? analysis.sectionsFound.length}</strong>
          <span>{analysis.roleCount != null ? 'Roles' : 'Sections'}</span>
        </div>
        <div className="result-stat">
          <strong>
            {analysis.experienceYears != null
              ? `${analysis.experienceYears}y`
              : analysis.skillsDetected.length}
          </strong>
          <span>{analysis.experienceYears != null ? 'Experience' : 'Skills'}</span>
        </div>
        <div className="result-stat">
          <strong>{analysis.jobKeywordsMatched.length}</strong>
          <span>Keywords hit</span>
        </div>
      </div>

      {analysis.scoreBreakdown && (
        <ResultSection title="Score breakdown" defaultOpen>
          <ul className="score-breakdown">
            {(
              [
                ['Contact', analysis.scoreBreakdown.contact, 10],
                ['Structure', analysis.scoreBreakdown.structure, 22],
                ['Experience', analysis.scoreBreakdown.experience, 25],
                ['Education', analysis.scoreBreakdown.education, 10],
                ['Skills', analysis.scoreBreakdown.skills, 18],
                ['Job match', analysis.scoreBreakdown.jobMatch, 30],
              ] as const
            ).map(([label, value, max]) => (
              <li key={label}>
                <div className="score-breakdown-label">
                  <span>{label}</span>
                  <span>{value}/{max}</span>
                </div>
                <div className="score-breakdown-bar">
                  <span style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </ResultSection>
      )}

      {!hasJobDescription && (
        <p className="result-nudge muted small">
          Add a job description and re-analyze for keyword-specific scoring.
        </p>
      )}

      <ResultSection
        title="Suggestions"
        count={analysis.suggestions.length}
        defaultOpen
      >
        <ol className="suggestion-cards">
          {analysis.suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </ResultSection>

      <ResultSection title="Sections" count={analysis.sectionsFound.length}>
        {analysis.sectionsFound.length > 0 ? (
          <ul className="tag-list">
            {analysis.sectionsFound.map((s) => (
              <li key={s} className="tag tag-ok">{s}</li>
            ))}
          </ul>
        ) : (
          <p className="muted small">No standard section headings detected.</p>
        )}
        {analysis.sectionsMissing.length > 0 && (
          <>
            <p className="muted small section-gap-label">Consider adding:</p>
            <ul className="tag-list">
              {analysis.sectionsMissing.map((s) => (
                <li key={s} className="tag tag-warn">{s}</li>
              ))}
            </ul>
          </>
        )}
      </ResultSection>

      {analysis.skillsDetected.length > 0 && (
        <ResultSection title="Skills detected" count={analysis.skillsDetected.length} defaultOpen={false}>
          <ul className="tag-list">
            {analysis.skillsDetected.map((s) => (
              <li key={s} className="tag">{s}</li>
            ))}
          </ul>
        </ResultSection>
      )}

      {(analysis.jobKeywordsMatched.length > 0 || analysis.jobKeywordsMissing.length > 0) && (
        <ResultSection title="Job keywords" defaultOpen={hasJobDescription}>
          {analysis.jobKeywordsMatched.length > 0 && (
            <>
              <p className="muted small section-gap-label">Matched</p>
              <ul className="tag-list">
                {analysis.jobKeywordsMatched.map((s) => (
                  <li key={s} className="tag tag-ok">{s}</li>
                ))}
              </ul>
            </>
          )}
          {analysis.jobKeywordsMissing.length > 0 && (
            <>
              <p className="muted small section-gap-label">Missing</p>
              <ul className="tag-list">
                {analysis.jobKeywordsMissing.map((s) => (
                  <li key={s} className="tag tag-warn">{s}</li>
                ))}
              </ul>
            </>
          )}
        </ResultSection>
      )}
    </div>
  )
}
