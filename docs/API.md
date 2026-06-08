# API Reference

Base URL (development): `http://localhost:3001`  
Frontend proxy: requests to `/api/*` from `http://localhost:5173` are forwarded to the backend.

## Authentication

Protected routes require header:

```
Authorization: Bearer <jwt_token>
```

---

## Health

### `GET /api/health`

No auth required.

**Response:**
```json
{
  "ok": true,
  "llmEnabled": true,
  "llmProvider": "groq",
  "llmModel": "llama-3.3-70b-versatile",
  "llmLabel": "Groq (free)",
  "llmSetupHint": "Groq (free) powers resume analysis and cover letters."
}
```

---

## Auth

### `POST /api/auth/register`

```json
{ "name": "Jane Doe", "email": "jane@example.com", "password": "secret12" }
```

**201:** `{ "user": { "id", "email", "name" }, "token": "..." }`

### `POST /api/auth/login`

```json
{ "email": "jane@example.com", "password": "secret12" }
```

**200:** `{ "user", "token" }`

### `GET /api/auth/me`

**200:** `{ "user": { "id", "email", "name" } }`

---

## Resume Analysis

### `POST /api/analyze/resume`

```json
{
  "resume": "Full resume plain text...",
  "jobDescription": "Optional job posting text..."
}
```

**200:**
```json
{
  "analysis": {
    "score": 72,
    "wordCount": 450,
    "sectionsFound": ["Experience", "Education", "Skills"],
    "sectionsMissing": ["Summary"],
    "skillsDetected": ["react", "node", "sql"],
    "jobKeywordsMatched": ["react", "typescript"],
    "jobKeywordsMissing": ["kubernetes"],
    "suggestions": ["..."],
    "summary": "AI summary if available",
    "scoreBreakdown": {
      "contact": 10,
      "structure": 18,
      "experience": 20,
      "education": 10,
      "skills": 12,
      "jobMatch": 14
    },
    "experienceYears": 5,
    "roleCount": 2,
    "source": "ai",
    "aiFallbackReason": null,
    "aiRetryable": false
  },
  "llmEnabled": true,
  "llmLabel": "Groq (free)",
  "llmProvider": "groq",
  "aiAttempted": true
}
```

`source` is `"ai"` or `"rules"`.

---

## Cover Letter

### `POST /api/cover-letter/generate`

```json
{
  "resume": "Resume text...",
  "jobDescription": "Job posting...",
  "company": "Acme Corp"
}
```

**200:**
```json
{
  "letter": "Dear Hiring Manager,\n\n...",
  "source": "ai",
  "llmEnabled": true
}
```

`source`: `"ai"` or `"template"`.

---

## Applications

### `GET /api/applications`

**200:** `{ "applications": [ ... ] }`

### `POST /api/applications`

```json
{
  "company": "Acme Corp",
  "role": "Software Engineer",
  "status": "saved",
  "jobUrl": "https://...",
  "notes": "",
  "appliedAt": null
}
```

### `PATCH /api/applications/:id`

Partial update of any application fields.

### `DELETE /api/applications/:id`

Deletes application if owned by authenticated user.

---

## Error format

```json
{ "error": "Human-readable message" }
```

Common status codes: `400` validation, `401` auth, `409` duplicate email, `500` server error.
