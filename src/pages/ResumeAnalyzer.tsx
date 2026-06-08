import { useEffect, useRef, useState, type DragEvent } from 'react'
import { AnalysisResults } from '../components/AnalysisResults'
import { AnalyzerLoading } from '../components/AnalyzerLoading'
import {
  IconChart,
  IconClipboard,
  IconDocument,
  IconSparkle,
  IconTarget,
  IconUpload,
} from '../components/icons'
import { api } from '../lib/api'
import { extractTextFromPdf } from '../lib/pdfText'
import type { ResumeAnalysis } from '../types'

const MAX_PDF_BYTES = 5 * 1024 * 1024

type InputMode = 'upload' | 'paste'

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

export function ResumeAnalyzer() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [inputMode, setInputMode] = useState<InputMode>('upload')
  const [resume, setResume] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null)
  const [llmEnabled, setLlmEnabled] = useState<boolean | undefined>()
  const [llmLabel, setLlmLabel] = useState('Rule-based')
  const [aiAttempted, setAiAttempted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [parsingPdf, setParsingPdf] = useState(false)
  const [pdfFileName, setPdfFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.health().then((h) => {
      setLlmEnabled(h.llmEnabled)
      setLlmLabel(h.llmLabel ?? (h.llmEnabled ? 'AI enabled' : 'Rule-based'))
    }).catch(() => setLlmEnabled(false))
  }, [])

  async function handleAnalyze(resumeOverride?: string) {
    const resumeText = (resumeOverride ?? resume).trim()
    if (!resumeText) return
    setError('')
    setLoading(true)
    try {
      const result = await api.analyzeResume({
        resume: resumeText,
        jobDescription,
      })
      setAnalysis(result.analysis)
      setLlmEnabled(result.llmEnabled)
      setLlmLabel(result.llmLabel ?? (result.llmEnabled ? 'AI' : 'Rule-based'))
      setAiAttempted(result.aiAttempted ?? result.llmEnabled)
    } catch (err) {
      setAnalysis(null)
      setError(err instanceof Error ? err.message : 'Analysis failed.')
    } finally {
      setLoading(false)
    }
  }

  async function processPdfFile(file: File) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file.')
      return
    }

    if (file.size > MAX_PDF_BYTES) {
      setError('PDF must be 5 MB or smaller.')
      return
    }

    setError('')
    setParsingPdf(true)
    setAnalysis(null)

    try {
      const text = await extractTextFromPdf(file)
      if (!text.trim()) {
        setError(
          'No readable text found in this PDF. Try a text-based PDF or paste your resume instead.',
        )
        return
      }

      setResume(text)
      setPdfFileName(file.name)
      setInputMode('paste')
      await handleAnalyze(text)
    } catch {
      setError('Could not read the PDF. Try a different file or paste your resume.')
    } finally {
      setParsingPdf(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handlePdfUpload(file: File | undefined) {
    if (!file) return
    void processPdfFile(file)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void processPdfFile(file)
  }

  function handleClear() {
    setResume('')
    setJobDescription('')
    setPdfFileName('')
    setAnalysis(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const busy = loading || parsingPdf
  const resumeWords = wordCount(resume)
  const jobWords = wordCount(jobDescription)
  const hasJob = jobDescription.trim().length > 0

  return (
    <div className="page analyzer-page">
      <header className="analyzer-hero">
        <div className="analyzer-hero-text">
          <p className="analyzer-eyebrow">
            <IconChart className="analyzer-eyebrow-icon" />
            ATS Resume Analyzer
          </p>
          <h1>Optimize your resume for ATS</h1>
          <p className="analyzer-hero-desc">
            Upload a PDF or paste your resume, add a job description, and get a
            detailed score with keyword gaps and actionable improvements.
          </p>
        </div>
        <div className="analyzer-hero-meta">
          <span className={`analyzer-ai-pill ${llmEnabled ? 'on' : ''}`}>
            <IconSparkle className="pill-icon" />
            {llmLabel}
          </span>
          <ol className="analyzer-steps" aria-label="How it works">
            <li className={resume.trim() ? 'done' : 'active'}>
              <span>1</span> Resume
            </li>
            <li className={hasJob ? 'done' : resume.trim() ? 'active' : ''}>
              <span>2</span> Job
            </li>
            <li className={analysis ? 'done' : ''}>
              <span>3</span> Results
            </li>
          </ol>
        </div>
      </header>

      <div className="analyzer-layout">
        <section className="analyzer-panel" aria-label="Resume input">
          <div className="analyzer-panel-head">
            <div>
              <h2>Your resume</h2>
              <p className="muted small">PDF upload or plain text</p>
            </div>
            <div className="input-mode-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={inputMode === 'upload'}
                className={inputMode === 'upload' ? 'active' : ''}
                onClick={() => setInputMode('upload')}
              >
                <IconUpload />
                Upload
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inputMode === 'paste'}
                className={inputMode === 'paste' ? 'active' : ''}
                onClick={() => setInputMode('paste')}
              >
                <IconClipboard />
                Paste
              </button>
            </div>
          </div>

          {inputMode === 'upload' ? (
            <div
              className={`pdf-dropzone ${dragOver ? 'drag-over' : ''} ${pdfFileName ? 'has-file' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                id="resume-pdf"
                type="file"
                accept="application/pdf,.pdf"
                className="pdf-upload-input"
                disabled={busy}
                onChange={(e) => handlePdfUpload(e.target.files?.[0])}
              />
              <label htmlFor="resume-pdf" className="pdf-dropzone-inner">
                <span className="pdf-dropzone-icon" aria-hidden>
                  <IconUpload />
                </span>
                {parsingPdf ? (
                  <>
                    <strong>Reading your PDF…</strong>
                    <span className="muted small">Extracting text from document</span>
                  </>
                ) : pdfFileName ? (
                  <>
                    <strong>{pdfFileName}</strong>
                    <span className="muted small">
                      {resumeWords} words extracted · Click or drop to replace
                    </span>
                  </>
                ) : (
                  <>
                    <strong>Drop your resume PDF here</strong>
                    <span className="muted small">or click to browse · max 5 MB</span>
                  </>
                )}
              </label>
            </div>
          ) : (
            <div className="textarea-field">
              <div className="textarea-field-head">
                <label htmlFor="resume-text">Resume text</label>
                <span className="char-count muted small">{resumeWords} words</span>
              </div>
              <textarea
                id="resume-text"
                value={resume}
                onChange={(e) => {
                  setResume(e.target.value)
                  setPdfFileName('')
                  setAnalysis(null)
                }}
                placeholder="Paste your full resume here — include experience, education, and skills…"
                rows={12}
              />
            </div>
          )}

          <div className="analyzer-panel-section">
            <div className="analyzer-panel-head compact">
              <div>
                <h2>
                  <IconTarget className="section-icon" />
                  Target job
                  <span className="optional-badge">Optional</span>
                </h2>
                <p className="muted small">
                  Paste the job posting for keyword matching and a tailored score
                </p>
              </div>
              <span className="char-count muted small">{jobWords} words</span>
            </div>
            <textarea
              id="job-description"
              className="job-textarea"
              value={jobDescription}
              onChange={(e) => {
                setJobDescription(e.target.value)
                setAnalysis(null)
              }}
              placeholder="Paste the full job description — requirements, skills, and qualifications…"
              rows={7}
            />
            {!hasJob && (
              <p className="analyzer-tip muted small">
                <IconDocument className="tip-icon" />
                Adding a job description typically improves score accuracy by 30%+.
              </p>
            )}
          </div>

          {error && (
            <div className="analyzer-error" role="alert">
              {error}
            </div>
          )}

          <div className="analyzer-actions">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => void handleAnalyze()}
              disabled={!resume.trim() || busy}
            >
              <IconChart className="btn-icon" />
              {loading ? 'Analyzing…' : parsingPdf ? 'Reading PDF…' : 'Run ATS analysis'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleClear}
              disabled={busy || (!resume && !jobDescription && !analysis)}
            >
              Clear all
            </button>
          </div>
        </section>

        <aside className="analyzer-results" aria-label="Analysis results" aria-live="polite">
          <div className="analyzer-results-head">
            <h2>Results</h2>
            {analysis && (
              <span className="muted small">Score & recommendations</span>
            )}
          </div>

          <div className="analyzer-results-body">
            {busy ? (
              <AnalyzerLoading phase={parsingPdf ? 'pdf' : 'analyze'} parsingPdf={parsingPdf} />
            ) : !analysis ? (
              <div className="analyzer-empty">
                <div className="analyzer-empty-icon" aria-hidden>
                  <IconChart />
                </div>
                <h3>Ready when you are</h3>
                <p className="muted">
                  Upload a PDF or paste your resume, then run analysis to see your
                  ATS score, keyword gaps, and improvement tips.
                </p>
                <ul className="analyzer-empty-list muted small">
                  <li>Supports text-based PDF resumes</li>
                  <li>Keyword match when job description is added</li>
                  <li>Section, skills, and experience breakdown</li>
                </ul>
              </div>
            ) : (
              <AnalysisResults
                analysis={analysis}
                llmEnabled={llmEnabled}
                llmLabel={llmLabel}
                aiAttempted={aiAttempted}
                hasJobDescription={hasJob}
                onRetryAi={() => void handleAnalyze()}
                retrying={loading}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
