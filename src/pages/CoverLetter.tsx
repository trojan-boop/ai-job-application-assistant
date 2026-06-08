import { useEffect, useRef, useState, type DragEvent } from 'react'
import {
  IconClipboard,
  IconCopy,
  IconMail,
  IconSparkle,
  IconTarget,
  IconUpload,
} from '../components/icons'
import { api } from '../lib/api'
import { extractTextFromPdf } from '../lib/pdfText'

const MAX_PDF_BYTES = 5 * 1024 * 1024

type ResumeInputMode = 'upload' | 'paste'

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

export function CoverLetter() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [resumeInputMode, setResumeInputMode] = useState<ResumeInputMode>('upload')
  const [resume, setResume] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [company, setCompany] = useState('')
  const [letter, setLetter] = useState('')
  const [source, setSource] = useState<'ai' | 'template' | null>(null)
  const [llmLabel, setLlmLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsingPdf, setParsingPdf] = useState(false)
  const [pdfFileName, setPdfFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.health().then((h) => setLlmLabel(h.llmLabel ?? '')).catch(() => setLlmLabel(''))
  }, [])

  async function handleGenerate() {
    setError('')
    setCopied(false)
    setLoading(true)
    setLetter('')
    setSource(null)
    try {
      const result = await api.generateCoverLetter({
        resume,
        jobDescription,
        company: company || undefined,
      })
      setLetter(result.letter)
      setSource(result.source)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
      setResumeInputMode('paste')
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

  function handleDownload() {
    const blob = new Blob([letter], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `cover-letter-${company || 'draft'}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const busy = loading || parsingPdf
  const ready = resume.trim() && jobDescription.trim()

  return (
    <div className="page cover-page">
      <header className="analyzer-hero cover-hero">
        <div className="analyzer-hero-text">
          <p className="analyzer-eyebrow">
            <IconMail className="analyzer-eyebrow-icon" />
            Cover Letter Generator
          </p>
          <h1>Write a tailored cover letter in seconds</h1>
          <p className="analyzer-hero-desc">
            Upload a resume PDF or paste text, add the job posting — AI drafts a
            role-specific letter you can edit and send.
          </p>
        </div>
        <div className="analyzer-hero-meta">
          {llmLabel && (
            <span className="analyzer-ai-pill on">
              <IconSparkle className="pill-icon" />
              {llmLabel}
            </span>
          )}
          <ul className="cover-tips muted small">
            <li>Mention the company name for a personal touch</li>
            <li>Include metrics from your resume in the letter</li>
            <li>Edit the draft before sending</li>
          </ul>
        </div>
      </header>

      <div className="analyzer-layout">
        <section className="analyzer-panel" aria-label="Cover letter inputs">
          <div className="analyzer-panel-head">
            <div>
              <h2>Letter details</h2>
              <p className="muted small">Fill in the role context</p>
            </div>
          </div>

          <label className="field-block">
            <span className="field-label">
              <IconTarget className="section-icon" />
              Company name
              <span className="optional-badge">Optional</span>
            </span>
            <input
              type="text"
              className="field-input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
            />
          </label>

          <div className="resume-input-section">
            <div className="textarea-field-head">
              <span className="field-label">Your resume</span>
              <div className="input-mode-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={resumeInputMode === 'upload'}
                  className={resumeInputMode === 'upload' ? 'active' : ''}
                  onClick={() => setResumeInputMode('upload')}
                >
                  <IconUpload />
                  Upload PDF
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={resumeInputMode === 'paste'}
                  className={resumeInputMode === 'paste' ? 'active' : ''}
                  onClick={() => setResumeInputMode('paste')}
                >
                  <IconClipboard />
                  Paste text
                </button>
              </div>
            </div>

            {resumeInputMode === 'upload' ? (
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
                  id="cover-letter-resume-pdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  className="pdf-upload-input"
                  disabled={busy}
                  onChange={(e) => handlePdfUpload(e.target.files?.[0])}
                />
                <label htmlFor="cover-letter-resume-pdf" className="pdf-dropzone-inner">
                  <span className="pdf-dropzone-icon" aria-hidden>
                    <IconUpload />
                  </span>
                  {parsingPdf ? (
                    <>
                      <strong>Reading your PDF…</strong>
                      <span className="muted small">Extracting resume text</span>
                    </>
                  ) : pdfFileName ? (
                    <>
                      <strong>{pdfFileName}</strong>
                      <span className="muted small">
                        {wordCount(resume)} words extracted · Click or drop to replace
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
                  <label htmlFor="cl-resume">Resume text</label>
                  <span className="char-count muted small">{wordCount(resume)} words</span>
                </div>
                <textarea
                  id="cl-resume"
                  value={resume}
                  onChange={(e) => {
                    setResume(e.target.value)
                    setPdfFileName('')
                  }}
                  rows={10}
                  placeholder="Paste your resume — experience, skills, and achievements…"
                />
              </div>
            )}
          </div>

          <div className="textarea-field">
            <div className="textarea-field-head">
              <label htmlFor="cl-job">Job description</label>
              <span className="char-count muted small">{wordCount(jobDescription)} words</span>
            </div>
            <textarea
              id="cl-job"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={9}
              placeholder="Paste the full job posting…"
            />
          </div>

          {error && <div className="analyzer-error" role="alert">{error}</div>}

          <div className="analyzer-actions">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => void handleGenerate()}
              disabled={!ready || busy}
            >
              <IconMail className="btn-icon" />
              {loading ? 'Generating…' : parsingPdf ? 'Reading PDF…' : 'Generate cover letter'}
            </button>
          </div>
        </section>

        <aside className="analyzer-results letter-results" aria-label="Generated letter">
          <div className="analyzer-results-head">
            <h2>Your draft</h2>
            {letter && (
              <span className={`badge badge-${source === 'ai' ? 'ai' : 'rules'}`}>
                {source === 'ai' ? 'AI draft' : 'Template draft'}
              </span>
            )}
          </div>

          <div className="analyzer-results-body">
            {loading ? (
              <div className="letter-loading">
                <div className="analyzer-loading-spinner" aria-hidden>
                  <IconSparkle />
                </div>
                <h3>Writing your letter…</h3>
                <p className="muted small">Tailoring content to the role and your experience.</p>
              </div>
            ) : !letter ? (
              <div className="analyzer-empty">
                <div className="analyzer-empty-icon" aria-hidden>
                  <IconClipboard />
                </div>
                <h3>No letter yet</h3>
                <p className="muted">
                  Add your resume and job description, then generate a professional
                  cover letter draft here.
                </p>
              </div>
            ) : (
              <div className="letter-preview">
                <article className="letter-paper">
                  <pre className="letter-text">{letter}</pre>
                </article>
                <div className="letter-actions">
                  <button type="button" className="btn btn-primary" onClick={() => void handleCopy()}>
                    <IconCopy className="btn-icon" />
                    {copied ? 'Copied!' : 'Copy to clipboard'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={handleDownload}>
                    Download .txt
                  </button>
                </div>
                <p className="muted small letter-hint">
                  Review and personalize before sending. AI drafts are a starting point, not final copy.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
