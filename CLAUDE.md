# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FlowSyncAI is a task/issue tracker aimed at team projects: it records work as discrete "tasks" with status history, role-based reviews, and an activity log, and uses an LLM (Groq) to suggest a subtask checklist from a task's title/description/reviews. Backend is Django (REST-ish, no DRF), frontend is React + TypeScript + Vite. See `README.md` for the product rationale and `docs/DECISIONS.md` for the problem/solution/result history behind non-obvious backend choices (summarized below, don't re-derive these from scratch — and don't overwrite old entries there when a decision changes, append a dated one instead).

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
- **`tasks`** — core domain: `Task` (kanban card) and `SubTask` (AI-generated checklist items, real FK to `Task`). Each resource has its own endpoint (see URL table below); `Task`'s own PATCH only touches its own scalar fields, it never reaches into `SubTask`/`RoleReview`. `serializers.py` maps frontend camelCase JSON ↔ Django model fields and owns per-resource idempotent-create/diff-on-update helpers (`create_task_from_body`/`update_task_from_body`, `create_subtask_from_body`/`update_subtask_from_body`).
- **`ai_services`** — calls the Groq API (`llama-3.1-8b-instant`, OpenAI-compatible chat completions endpoint) to generate a subtask checklist from a task's title/description/role reviews. Exposed at `POST /api/v1/generate-checklist/`. Does **not** persist anything itself — it only returns the generated checklist; the frontend then `PUT`s it to the task's subtask collection. Raises/handles Groq-specific errors distinctly (`ValueError` → 502, other exceptions → 500).
- **`reviews`** — `RoleReview` model (per-role review comments/acceptance/urgency), attached to a task via a plain `task_id` string field (not a FK — deliberately, see `docs/DECISIONS.md`). Has its own full CRUD endpoint under `/api/v1/tasks/<task_id>/reviews/`; `reviews/urls.py` is included into `config/urls.py` at the same `api/v1/tasks/` prefix as the `tasks` app.
- **`activities`** — `ActivityLog` model for the activity feed; append-only history. **Not currently exposed via any view/URL** — the frontend's activity feed is `localStorage`-only (see `INITIAL_ACTIVITIES` in `frontend/src/constants/initialData.ts`). If you wire this up, this is where it goes.
- **`api`** — shared infra used by every app's views:
  - `http.py`: `conditional_json_response` implements ETag (sha256 of canonical JSON) + `Last-Modified` based 304 handling for GET.
  - `idempotency.py` + `IdempotencyRecord` model: `Idempotency-Key` header support for POST. This is actually exercised end-to-end — `frontend/src/services/apiClient.ts`'s `postJson()` attaches a fresh `crypto.randomUUID()` on every POST call, and every POST-creating view (`tasks`, `subtasks`, `reviews`, `generate-checklist`) reads it via `replay_idempotent_response`/`finalize_idempotent_response`.
  - `decorators.py`: `api_view` (CSRF-exempt JSON views; no auth yet).
- **`config`** — Django settings/URL root. Note `tasks.urls` and `reviews.urls` are both mounted at the same `api/v1/tasks/` prefix (see URL table) — this works because `tasks.urls`'s `<str:pk>/` pattern only matches a single path segment, so it never intercepts `<task_id>/reviews/...`.

### URL tree
```
GET/POST   /api/v1/tasks/
GET/PATCH/DELETE            /api/v1/tasks/<pk>/                 # scalar Task fields only
GET/POST/PUT                /api/v1/tasks/<task_id>/subtasks/   # PUT = full-collection replace (AI regen)
PATCH/DELETE                /api/v1/tasks/<task_id>/subtasks/<subtask_id>/
GET/POST                    /api/v1/tasks/<task_id>/reviews/
PATCH/DELETE                /api/v1/tasks/<task_id>/reviews/<review_id>/
POST                        /api/v1/generate-checklist/         # ai_services, no persistence
```

### Key backend design decisions (don't relitigate without reading `docs/DECISIONS.md` first)
1. **No FK for `RoleReview`/`ActivityLog` → `Task`.** They store `task_id` as a plain string because they're only ever queried in the context of a task detail page — deliberately avoiding join overhead/complexity for data that has no independent access pattern. (`SubTask` *does* use a real FK.)
2. **Each resource owns its own write endpoint; side effects that belong to a different resource are handled server-side in the handler that causes them, not via a second client-issued request.** E.g. `PUT /tasks/<id>/subtasks/` (checklist regeneration) also stamps `Task.checklist_generated_at`; `POST /tasks/<id>/reviews/` also flips `Task.status` `todo → inprogress` on the task's first review (`reviews/views.py`). The response includes the resulting `taskStatus` so the frontend doesn't need a follow-up PATCH. This pattern replaced an earlier design where the frontend issued a second PATCH to `Task` after every review/subtask write — see `docs/DECISIONS.md` for why.
3. **`hasUnreflectedReview`/`lastReviewAddedAt` are computed, not stored.** `Task` has no columns for these; `serialize_task` (`tasks/serializers.py`) derives them by comparing the max `RoleReview.created_at` against `Task.checklist_generated_at`, reusing the `RoleReview` queryset already fetched for `roleReviews` (zero extra queries). Don't reintroduce these as model fields — that's what caused the extra-PATCH problem in point 2.
4. **Idempotency keys on every creating POST** (tasks, subtasks, reviews, `generate-checklist`) — wired end-to-end (see `api` app above). PATCH/PUT don't use this mechanism: PATCH is naturally idempotent (absolute field-set semantics, some with a diff-and-skip-write optimization), and the one PUT (`subtasks` collection replace) is idempotent as long as the caller supplies stable item ids (the AI-regen flow does).
5. **Groq chosen over Gemini/GPT/Claude** specifically for LPU-inference latency (cuts AI response time from ~3-7s to ~2-3s) — this is a deliberate tradeoff, not an oversight.

### Frontend structure (`frontend/src/`)
- `App.tsx` — top-level state (active view, task list, polling loop) and every resource-mutation handler (`handleAddSubtask`, `handleToggleSubtask`, `handleAddReview`, etc.), each hitting the matching REST endpoint and merging the response back into state via the shared `updateTaskInState` helper.
- `services/taskSync.ts` — polls `GET /api/v1/tasks/` every `TASKS_POLL_INTERVAL_MS` (3 min), sending `If-None-Match`/`If-Modified-Since` from `localStorage` and short-circuiting on `304`. This is the client half of the backend's conditional-GET design — keep both sides in sync if you touch either.
- `services/apiClient.ts` — `postJson()`, the only place POST requests should go through; attaches the `Idempotency-Key` header (see point 4 above). Don't call `fetch(..., {method:'POST'})` directly elsewhere.
- `components/dashboard/{TaskBoard,TaskList,AnalyticsView,ActivityFeed}.tsx` — kanban view, table view, `recharts`-based stats, activity log respectively.
- `components/common/TaskModal.tsx` — task detail/create/edit modal; subtask/review add/toggle/delete and AI checklist generation are all triggered from here, each calling its own resource handler prop rather than a bundled Task PATCH.
- `components/layout/Sidebar.tsx` — view switcher + per-status counts.
- `types/index.ts` — shared `Task`/`SubTask`/`RoleReview`/`Activity` types; keep in sync with backend serializer field names (camelCase on the wire). `hasUnreflectedReview`/`lastReviewAddedAt` are read-only from the API now (server-computed) — don't add UI that PATCHes them directly.

### Request flow examples
- **Task scalar edit**: `TaskModal` → PATCH `/api/v1/tasks/<id>/` → `tasks/views.py:task_detail` → `update_task_from_body` (scalar diff + `TaskForm` save only).
- **Toggle a checklist item**: `TaskModal` → `App.tsx:handleToggleSubtask` → PATCH `/api/v1/tasks/<id>/subtasks/<subtask_id>/` → `subtask_detail` → `update_subtask_from_body`.
- **Add a review**: `TaskModal:addRoleReview` → `App.tsx:handleAddReview` → `postJson` POST `/api/v1/tasks/<id>/reviews/` → `reviews/views.py:review_list_create` (creates the `RoleReview`, and if it's the task's first review, also flips `Task.status` to `inprogress` and returns `taskStatus` in the body) → frontend applies both `roleReviews` and `status` from the one response — no follow-up PATCH.
