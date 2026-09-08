# TaskPulse

TaskPulse is a background job dashboard. Members create long-running jobs
(data processing, bulk email, image resizing, report generation) and watch
them execute in real time. Admins oversee every user and every job across
the whole system.

---

## 1. How it's built, at a glance

| Layer | Technology | Role |
|---|---|---|
| Frontend | React + Vite | The dashboard UI in the browser |
| Backend API | FastAPI (Python) | REST + WebSocket + SSE endpoints |
| Database | PostgreSQL | Durable storage — users, jobs, job logs |
| Task queue | Celery (worker + beat) | Actually runs the long jobs, in the background |
| Message broker / cache | Redis | Celery's queue, plus live progress/status pub-sub |
| Everything above | Docker Compose | Runs all of it together as one stack |

Also included: **Flower** (a web UI for watching Celery tasks), **Adminer**
(a web UI for browsing the Postgres database), and **RedisInsight** (a web
UI for inspecting Redis) — none of these are required for the app to
function, they're just convenient for debugging.

---

## 2. How a job actually flows through the system

This is the part that makes the dashboard feel "live" instead of needing
constant manual refreshing, and it's worth understanding end to end:

1. **You click "New job"** → the frontend sends `POST /api/jobs/createJob`
   → the backend writes a new row to the `jobs` table (status `pending`)
   and hands it off to Celery.
2. **A Celery worker** (running in its own container) picks the job up,
   sets its status to `running`, and works through a fixed list of stages,
   sleeping between each to simulate real work.
3. **At every stage**, the worker does two things at once:
   - writes progress to the database (so a page refresh always shows the
     truth)
   - publishes progress/status/log updates into **Redis pub-sub channels**
4. **The frontend, meanwhile**, opened two live connections the moment the
   job card rendered:
   - a **WebSocket** subscribed to that job's progress channel
   - an **SSE (Server-Sent Events) stream** subscribed to that job's
     status channel
5. As the worker publishes updates, the backend forwards them down these
   two live connections, and the job card's progress bar / status pill
   update instantly — no polling, no manual refresh.
6. **Cancelling a job** sets a flag in Redis; the worker checks that flag
   once per stage and, if set, stops itself and marks the job `cancelled`
   — which is why cancel can take up to ~30 seconds to visibly take
   effect, not instant.

The REST API is used for anything that isn't "watch this one job change
over time" — listing jobs, listing users, dashboard stats, login. The
WebSocket/SSE connections exist *only* for the live per-job updates.

---

## 3. Authentication model

There's no token stored anywhere in the frontend's JavaScript. Logging in
(`POST /api/auth/login`) sets an **HttpOnly cookie** (`access_token`,
a JWT) — the browser attaches it automatically to every subsequent
request, and JavaScript can't read or tamper with it. Every protected
route checks that cookie server-side. Logging out just deletes the cookie.

One consequence: login is by **username**, not email — the backend only
accepts `{ name, password }`.

---

## 4. Project structure

### Frontend (`frontend/src/`)
```
api/         Functions that call the backend — one file per resource
             (auth.js, jobs.js, admin.js, dashboard.js), plus client.js,
             the shared fetch wrapper all of them use.
context/     App-wide state: who's logged in (AuthContext), the global
             error popup (ErrorModalContext), and route guards
             (RequiredAdmin / RequiredMember).
hooks/       Reusable non-visual logic — most importantly
             useJobLiveState.js, which owns a job card's WebSocket + SSE
             connections.
components/  Reusable UI pieces: JobCard, UserCard, modals, the sidebar,
             stat cards, the admin/member Jobs & Users & Dashboard views.
pages/       Full screens assembled from the above: LoginPage,
             RegisterPage, AdminPanel, Memberpanel.
App.jsx      Defines every route and which guard/provider wraps it.
main.jsx     The real entry point — mounts <App/> into index.html.
```

### Backend (`backend/app/`)
```
routers/     One file per group of endpoints (auth, jobs, admin, dashboard)
             — thin: they just validate input and call a service function.
services/    The actual logic — job_service.py (create/cancel/stream jobs),
             admin_service.py, dashboard_service.py, auth_service.py,
             cache_service.py (all Redis key/channel logic in one place),
             worker_service.py (talks to Celery).
tasks/       The Celery jobs themselves — data_processing.py,
             bulk_email.py, image_resize.py, report_generation.py, plus
             utils.py (the cancellation check).
models/      SQLAlchemy table definitions — User, Job, JobLog.
schemas/     Pydantic request/response shapes.
dependencies.py   Auth: get_current_user (reads the cookie), require_role.
main.py      Wires everything together — CORS, all routers mounted under
             `/api`, rate limiting.
```

---

## 5. URL map

### Frontend pages (what you type in the browser)
| URL | Who can see it | What's there |
|---|---|---|
| `/login` | Anyone | Sign in |
| `/register` | Anyone | Create an account |
| `/member` | Members | Personal dashboard stats |
| `/member/jobs` | Members | Your jobs, live-updating |
| `/admin` | Admins | System-wide dashboard stats |
| `/admin/jobs` | Admins | Every user's jobs, filterable |
| `/admin/users` | Admins | Every user, activate/deactivate |

### Backend API (everything under `http://localhost:8000/api`)
| Method & path | Purpose |
|---|---|
| `POST /auth/register` | Create an account |
| `POST /auth/login` | Log in (sets the cookie) |
| `GET /auth/me` | "Am I logged in, and as who" |
| `GET /auth/logout` | Clear the cookie |
| `GET /jobs/getjobs/{page}` | List your own jobs |
| `POST /jobs/createJob` | Start a new job |
| `GET /jobs/jobLogs/{job_id}` | A job's log history |
| `POST /jobs/canceljobs/{job_id}` | Request cancellation |
| `WS /jobs/ws/progress/{job_id}` | Live progress (WebSocket) |
| `GET /jobs/jobstatus/sse/{job_id}` | Live status (SSE) |
| `GET /jobs/logs/sse/{job_id}` | Live logs (SSE) |
| `GET /admin/allUsers` | List every user (admin only) |
| `GET /admin/allProjects` | List every job (admin only) |
| `PUT /admin/users/{id}/activate` \| `/deactivate` | Toggle a user |
| `GET /dashboard/memberStats` | Your stats |
| `GET /dashboard/adminStats` | System-wide stats |

### Other tools (from Docker Compose, not part of the app itself)
| URL | Tool |
|---|---|
| `http://localhost:5555` | Flower — watch Celery tasks run |
| `http://localhost:8080` | Adminer — browse the Postgres database |
| `http://localhost:5540` | RedisInsight — inspect Redis keys |

---

## 6. Environment variables

### `frontend/.env` (create this file — it doesn't exist by default)
```
VITE_API_BASE_URL=http://localhost:8000/api
```
This must use the same hostname (`localhost`) everywhere — mixing
`localhost` and `127.0.0.1` between the browser and this variable breaks
the login cookie, since cookies are tied to the exact hostname used.

### `backend/.env` (required by `docker-compose.yml`'s `env_file:`)
The exact variable names depend on `app/config.py`'s `Settings` class,
which wasn't reviewed line-by-line during this project — confirm names
there before assuming these are exact. Based on how they're referenced
throughout the codebase, you'll need at least:
```
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/taskpulse
REDIS_URL=redis://:redis123@redis:6379/0
JWT_SECRET_KEY=<a long, random, secret string>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
RATE_LIMIT=100/minute
DEBUG=False
```
Two of these matter more than they look:
- **`JWT_SECRET_KEY` must be fixed**, not randomly generated at startup —
  if it changes on every restart, every existing login cookie instantly
  becomes invalid.
- The Postgres/Redis credentials here must match what's set in
  `docker-compose.yml` (`POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`,
  and Redis's `--requirepass`) — and the **hostnames must be the Docker
  service names** (`postgres`, `redis`), not `localhost`, since the
  backend reaches them over the internal Docker network, not the host.

---

## 7. Running it for the first time

```bash
# 1. Clone the repo, then create the two env files above:
#      frontend/.env
#      backend/.env

# 2. Build and start everything
docker compose up -d --build

# 3. Watch the logs until both are stable (Ctrl+C to stop watching, this
#    doesn't stop the containers)
docker compose logs -f api frontend

# 4. Open the app
#    http://localhost:5173/register  → create an account
#    http://localhost:5173/login     → sign in
```

### Everyday commands afterward
```bash
docker compose up -d              # start everything (containers already built)
docker compose down               # stop everything (keeps your data)
docker compose down -v            # stop AND wipe the database/redis data — careful
docker compose restart api        # restart just the backend
docker compose logs -f worker     # watch what the Celery worker is doing
docker compose exec api bash      # get a shell inside the backend container
```

### If you change a dependency
Editing `.py` or `.jsx` files is picked up automatically (both `uvicorn
--reload` and Vite hot-reload watch your files live via the bind mounts
in `docker-compose.yml`). But if you add a new package to
`requirements.txt` or `package.json`, that's baked into the Docker image
at build time, so you need:
```bash
docker compose up -d --build frontend api
```

---

## 8. Known quirks worth knowing about

- **Editing a backend `.py` file kills every open WebSocket/SSE
  connection instantly** — `uvicorn --reload` hard-restarts the whole
  process on every save. The frontend auto-reconnects within ~1.5s, but
  you'll see a brief drop every time you save a backend file during
  development.
- **Cancelling a job isn't instant** — the worker only checks for a
  cancellation request once per stage (every ~30 seconds), so there's a
  visible delay between clicking Cancel and the job actually stopping.
- The Admin Jobs page's Active/Inactive filter currently has no effect on
  the results — it's accepted by the API but not yet applied to the
  underlying query.