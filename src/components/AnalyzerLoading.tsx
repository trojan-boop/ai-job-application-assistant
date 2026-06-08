import { IconCheck, IconSparkle } from './icons'

const STEPS = [
  { id: 'extract', label: 'Reading resume content' },
  { id: 'parse', label: 'Parsing structure & sections' },
  { id: 'score', label: 'Calculating ATS score' },
  { id: 'ai', label: 'Generating AI insights' },
] as const

export function AnalyzerLoading({
  phase,
  parsingPdf,
}: {
  phase: 'pdf' | 'analyze'
  parsingPdf: boolean
}) {
  const activeIndex = parsingPdf ? 0 : phase === 'pdf' ? 0 : 2

  return (
    <div className="analyzer-loading" role="status" aria-live="polite">
      <div className="analyzer-loading-spinner" aria-hidden>
        <IconSparkle />
      </div>
      <h3>{parsingPdf ? 'Extracting PDF text…' : 'Running ATS analysis…'}</h3>
      <p className="muted small">
        {parsingPdf
          ? 'Pulling text from your document.'
          : 'Comparing your resume against ATS criteria and job keywords.'}
      </p>
      <ol className="analyzer-loading-steps">
        {STEPS.map((step, index) => {
          const done = index < activeIndex
          const active = index === activeIndex || (parsingPdf && index === 0)
          return (
            <li
              key={step.id}
              className={`loading-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}
            >
              <span className="loading-step-icon" aria-hidden>
                {done ? <IconCheck /> : <span className="loading-step-dot" />}
              </span>
              {step.label}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
