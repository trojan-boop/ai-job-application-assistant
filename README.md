# AI Job Application Assistant

Full-stack MVP: React frontend + Express API with JWT auth, resume analysis, cover letter generation, and application tracking.

## Documentation

| Doc | Purpose |
|-----|---------|
| **[Architecture & Interview Guide](docs/ARCHITECTURE.md)** | Full system design, flows, diagrams, interview Q&A |
| **[API Reference](docs/API.md)** | All endpoints with request/response examples |

## Features

| Feature | Description |
|---------|-------------|
| **Auth** | Register/login with bcrypt-hashed passwords and JWT (7-day tokens) |
| **Resume analyzer** | AI analysis via Groq/Gemini/OpenAI when configured, else rule-based scoring |
| **Cover letters** | AI draft or template fallback |
| **Application tracker** | CRUD per user (JSON file DB for local dev) |

## Quick start

```bash
npm install
cp .env.example .env   # edit JWT_SECRET; add a free GROQ_API_KEY or GEMINI_API_KEY
npm run dev
```

- Frontend: http://localhost:5173 (proxies `/api` → backend)
- API: http://localhost:3001

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `JWT_SECRET` | Yes (16+ chars) | Signs access tokens |
| `PORT` | No (default 3001) | API port |
| `CLIENT_ORIGIN` | No | CORS origin |
| `LLM_PROVIDER` | No | `auto` (default), `groq`, `gemini`, or `openai` |
| `GROQ_API_KEY` | No | **Free** — [console.groq.com](https://console.groq.com/keys) |
| `GROQ_MODEL` | No | Default `llama-3.3-70b-versatile` |
| `GEMINI_API_KEY` | No | **Free** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | No | Default `gemini-2.0-flash` |
| `OPENAI_API_KEY` | No | Paid — requires OpenAI billing |
| `OPENAI_MODEL` | No | Default `gpt-4o-mini` |

**Free AI setup (recommended):** add `GROQ_API_KEY` to `.env`. Remove or leave blank `OPENAI_API_KEY` if you have no OpenAI credits.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API + Vite together |
| `npm run dev:client` | Frontend only |
| `npm run dev:server` | API only |
| `npm run build` | Production frontend build |

## API (authenticated routes use `Authorization: Bearer <token>`)

- `POST /api/auth/register` — `{ name, email, password }`
- `POST /api/auth/login` — `{ email, password }`
- `GET /api/auth/me`
- `POST /api/analyze/resume` — `{ resume, jobDescription? }`
- `POST /api/cover-letter/generate` — `{ resume, jobDescription, company? }`
- `GET/POST/PATCH/DELETE /api/applications`

## Stack

- **Frontend:** React 19, TypeScript, Vite, React Router
- **Backend:** Express 5, JWT, bcrypt, OpenAI SDK, JSON file store

## Project structure (monorepo)

```
src/      → Frontend (React + Vite)
server/   → Backend (Express API)
docs/     → Architecture & API documentation
```

Both FE and BE share one `package.json`. `npm run dev` starts both.

## Production notes

Replace the JSON file store with PostgreSQL/MongoDB, use HTTP-only cookies or refresh tokens, rate-limit AI routes, and never commit `.env`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full production checklist.
