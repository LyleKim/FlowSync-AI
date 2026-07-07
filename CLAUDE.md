# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FlowSyncAI is a task/issue tracker aimed at team projects: it records work as discrete "tasks" with status history, role-based reviews, and an activity log, and uses an LLM (Groq) to suggest a subtask checklist from a task's title/description/reviews. Backend is Django (REST-ish, no DRF), frontend is React + TypeScript + Vite. See `README.md` for the full product rationale and the "Backend Design" section for the reasoning behind several non-obvious choices (summarized below, don't re-derive these from scratch).

## Commands

### Backend (Django, `backend/`)
```bash
# Run full stack (MySQL + Django) via Docker — this is the primary way to run the backend
docker compose up --build

# Manual/local backend workflow (uses backend/.venv)
cd backend
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
python manage.py makemigrations <app>   # after model changes, e.g. tasks/reviews/activities
```
There are no automated tests in this repo (no `test*.py` files beyond Django's default app-per-test scaffolding is not even present) — don't assume a test suite exists.

### Frontend (`frontend/`, run from repo root)
```bash
npm install        # first time only
npm run dev         # Vite dev server on :3000, proxies /api -> http://127.0.0.1:8000
npm run lint        # tsc --noEmit (no eslint configured)
npm run build
```
The frontend expects the backend already running on :8000 (via Vite's `/api` proxy in `vite.config.ts`); there is no mock/offline mode.

### Environment
Copy `.env.example` to `.env`. A `GROQ_API_KEY` (from https://groq.com) is required for AI checklist generation to work; DB credentials must match what `docker-compose.yml` passes to the `db` service.

## Architecture

### Backend: plain Django views, not DRF
There is no Django REST Framework. Every endpoint is a hand-rolled view wrapped in `@api_view` (`backend/api/decorators.py`, just CSRF-exempt) and `@require_http_methods`. Request/response shaping is done manually in each app's `serializers.py` (parsing JSON body → model fields and back), not via serializer classes. Follow this pattern for new endpoints rather than introducing DRF.

Django apps and their roles:
- **`tasks`** — core domain: `Task` (kanban card) and `SubTask` (AI-generated checklist items). `views.py` exposes `GET/POST /api/v1/tasks/` and `PATCH/DELETE /api/v1/tasks/<pk>/`. `serializers.py` maps frontend camelCase JSON ↔ Django model fields (`map_body_to_model_data`, `serialize_task`) and also owns the idempotency/diffing logic (see below).
- **`ai_services`** — calls the Groq API (`llama-3.1-8b-instant`, OpenAI-compatible chat completions endpoint) to generate a subtask checklist from a task's title/description/role reviews. Exposed at `POST /api/v1/generate-checklist/`. Raises/handles Groq-specific errors distinctly (`ValueError` → 502, other exceptions → 500).
- **`reviews`** — `RoleReview` model: per-role review comments/acceptance/urgency attached to a task via a plain `task_id` string field (not a FK — see design note below).
- **`activities`** — `ActivityLog` model for the activity feed; append-only history of create/update/delete/complete/review actions.
- **`api`** — shared infra used by every app's views:
  - `http.py`: `conditional_json_response` implements ETag (sha256 of canonical JSON) + `Last-Modified` based 304 handling for GET.
  - `idempotency.py` + `IdempotencyRecord` model: `Idempotency-Key` header support for POST — replays a stored response instead of re-executing side effects.
  - `decorators.py`: `api_view` (CSRF-exempt JSON views; no auth yet).
- **`config`** — Django settings/URL root. New app URL includes go in `config/urls.py` under `/api/v1/`.

### Key backend design decisions (don't relitigate without reading `README.md` first)
1. **No FK for `RoleReview`/`ActivityLog` → `Task`.** They store `task_id` as a plain string because they're only ever queried in the context of a task detail page — deliberately avoiding join overhead/complexity for data that has no independent access pattern.
2. **PATCH-based partial updates with change detection.** `update_task_from_body` (`tasks/serializers.py`) diffs incoming scalars/subtasks/reviews against the DB before writing, so idempotent PATCH retries don't cause redundant writes or bump `updated_at` unnecessarily.
3. **Idempotency keys on POST**, specifically for task creation and AI checklist generation — both are either expensive (LLM call) or must not double-create on client retry.
4. **AI response flow**: the checklist is generated and returned directly from the POST response; the frontend is responsible for persisting it via a subsequent PATCH to the task. The backend does not save AI output automatically.
5. **Groq chosen over Gemini/GPT/Claude** specifically for LPU-inference latency (cuts AI response time from ~3-7s to ~2-3s) — this is a deliberate tradeoff, not an oversight.

### Frontend structure (`frontend/src/`)
- `App.tsx` — top-level state (active view, task list, polling loop).
- `services/taskSync.ts` — polls `GET /api/v1/tasks/` every `TASKS_POLL_INTERVAL_MS` (3 min), sending `If-None-Match`/`If-Modified-Since` from `localStorage` and short-circuiting on `304`. This is the client half of the backend's conditional-GET design — keep both sides in sync if you touch either.
- `components/dashboard/{TaskBoard,TaskList,AnalyticsView,ActivityFeed}.tsx` — kanban view, table view, `recharts`-based stats, activity log respectively.
- `components/common/TaskModal.tsx` — task detail/create/edit modal; also where AI checklist generation and role reviews are triggered from.
- `components/layout/Sidebar.tsx` — view switcher + per-status counts.
- `types/index.ts` — shared `Task`/`SubTask`/`RoleReview`/`Activity` types; keep in sync with backend serializer field names (camelCase on the wire).

### Request flow example (task update)
`TaskModal` → PATCH `/api/v1/tasks/<id>/` → `tasks/views.py:task_detail` → `tasks/serializers.py:update_task_from_body` (diff + save via `TaskForm`/`SubTaskForm`/`RoleReviewForm`) → `updated_at` bumped only if something actually changed → next poll's conditional GET picks it up via a new ETag.
