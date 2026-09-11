# ICDesign Lab Fullstack Starter

## Folder structure

```text
icdesign-lab/
|-- client/
|   |-- src/
|   |   |-- lib/
|   |   |   `-- api.js
|   |   |-- App.jsx
|   |   |-- main.jsx
|   |   `-- index.css
|   |-- tailwind.config.js
|   |-- postcss.config.js
|   `-- package.json
|-- server/
|   |-- config/
|   |   `-- db.js
|   |-- index.js
|   |-- .env.example
|   `-- package.json
|-- package.json
`-- README.md
```

## Installation

1. Install dependencies in root, client, and server:

   ```bash
   npm install
   npm install --prefix client
   npm install --prefix server
   ```

2. Setup environment variables for backend:

   - Copy `server/.env.example` to `server/.env`
   - Update `MONGO_URI` if needed

## Run scripts

- Run both frontend and backend:

  ```bash
  npm run dev
  ```

- Run frontend only:

  ```bash
  npm run client
  ```

- Run backend only:

  ```bash
  npm run server
  ```

## Routes

Every item that has its own content has its own URL, so it can be linked to,
bookmarked and shared.

### Public

| Path | Page |
| --- | --- |
| `/` | Home |
| `/people/professor`, `/people/students`, `/people/alumni` | People directories |
| `/people/:category/:id` | One member's profile |
| `/research/project` | Projects |
| `/research/project/:id` | One project |
| `/research/publications` | Publications archive |
| `/research/publications/:id` | One publication (abstract, citation, BibTeX) |
| `/lab-event/event` | Events |
| `/lab-event/event/:id` | One event |
| `/lab-event/gallery` | Photo albums |
| `/lab-event/gallery/:id` | One album |
| `/lab-event/gallery/:id/photo/:n` | One photo, opened in the lightbox (1-based) |
| `/documents` | Book and document catalogue |
| `/lectures`, `/lectures/:id` | Lecture portal (members only) |
| `/news/world-news`, `/news/vietnam-news`, `/news/jobs` | News and jobs feeds |
| `/contact` | Contact and open positions |
| `/login` | Sign in |
| `*` | Not found |

### Admin (`/admin`, admin role required)

`dashboard`, `people`, `research`, `lab-event`, `documents`, `lectures`,
`accounts`, `news`, `contact`.

### List state lives in the query string

Every public list keeps its page — and its filters — in the URL, so a view can be
reloaded, bookmarked and shared:

| Path | Params |
| --- | --- |
| `/people/:category`, `/research/project`, `/research/publications`, `/lab-event/event`, `/lab-event/gallery` | `page` |
| `/documents` | `page`, `search`, `type`, `owned` |
| `/news/*` | `page`, `from`, `to` |

Handled by `hooks/useListParams.js`. Rules it enforces:

- **Defaults are omitted.** Page 1 with no filters is `/documents`, never
  `/documents?page=1&type=All`.
- **Changing a filter drops the page.** Page 4 of the old result set is usually
  past the end of the new one.
- **Typing replaces, paging pushes.** Six characters in the search box leave one
  history entry, so Back leaves the list instead of retyping the query backwards.
- **Page numbers are untrusted.** `?page=99` on a two-page list renders the empty
  state and the paginator clamps — it never offers a page that does not exist.

Pagination renders real `<a>` elements, so pages can be middle-clicked and opened
in a new tab.

The news feeds previously paginated through a path segment. `/news/world-news/page/3`
still works and redirects to `?page=3` (`routes/LegacyPageRedirect.jsx`).

### Notes

- A detail route reads `GET /api/<resource>/:id`. A missing or malformed id
  answers 404, and the page renders a "not found" state pointing back at the
  list rather than an error.
- News and job entries deliberately have no detail page: they are links to the
  publisher, and a local copy of someone else's article is not ours to host.
- The gallery lightbox is a URL, not component state. That makes a photo
  shareable, makes the browser Back button close it, and keeps it open across a
  reload. `ScrollToTop` and the error boundary both ignore the trailing
  `/photo/:n` segment so the album underneath is neither scrolled nor remounted.

## Architecture notes

### Design system

The visual language follows academic research-lab convention (MIT CSAIL, Stanford
SAIL, university department pages) rather than a marketing site: a near-white
ground, a neutral grey text ramp, one institutional accent (HUST crimson), a
serif for headings paired with a neutral sans for body, restrained heading sizes
and hairline rules.

All of it is expressed as tokens, not ad-hoc classes:

- `client/tailwind.config.js` — colour ramps (`ink`, `paper`, `accent`,
  `signal`), the type stack, display sizes, shadows and keyframes.
- `client/src/index.css` — base layer plus the component classes every page
  reuses: `.shell`, `.eyebrow`, `.lede`, `.btn-*`, `.surface*`, `.badge-*`,
  `.field`, `.section-rule`, `.skeleton`, `.media-frame`.
- `client/src/components/ui/index.jsx` — the React primitives: `Shell`,
  `Section`, `PageHeader`, `SectionHeading`, `Skeleton*`, `EmptyState`,
  `ErrorState`, `Media`, `Badge`, `QuietLink`, `Icon`, `formatDate`.

Nothing outside these three files should introduce a raw colour or spacing value.

### Client data layer

`client/src/hooks/useApiQuery.js` is a small stale-while-revalidate cache built
on `useSyncExternalStore`:

- a cached response renders instantly with no loading state;
- entries older than `staleTime` revalidate in the background;
- identical in-flight GETs are collapsed into one (`lib/api.js`);
- `invalidateQueries(prefix)` drops entries after a write.

### Performance

- **Route-level code splitting.** Every page is a `React.lazy` chunk; only the
  homepage is eager. `xlsx`/`jszip`/`file-saver` (~525 kB) are isolated into a
  `sheets` chunk that only the two admin screens that need them pull in.
- **Server caching.** Public GET endpoints set `Cache-Control` with
  `stale-while-revalidate` and are backed by a short in-process response cache
  (`server/middleware/cache.js`). Every write purges its namespace, so admin
  edits appear immediately.
- **Database indexes.** Declared on every model and matched to the actual query
  shapes. Production runs with `autoIndex: false` — see below.
- **`gzip` + immutable asset caching** in `client/nginx.conf`; hashed `/assets/`
  files are cached for a year, `index.html` never.

### Database indexes in production

`config/db.js` disables `autoIndex` when `NODE_ENV=production` so boots stay
fast. After deploying a schema change, run once:

```bash
npm run sync-indexes --prefix server
```

## Security notes

### MongoDB is no longer published to the host

`docker-compose.yml` used to map `27017:27017`. Because Docker writes its own
iptables rules, a published port is reachable from the internet **even when UFW
reports it as closed** — and the container runs without authentication by
default. The mapping is gone; the backend reaches the database over the compose
network as `mongodb:27017`, which needs no published port.

To inspect the database from the host, go through the container rather than
republishing the port:

```bash
docker compose exec mongodb mongosh -u "$MONGO_ROOT_USER" -p --authenticationDatabase admin
```

### Enabling MongoDB auth

The official image only creates the root user when it initialises an **empty**
data directory. On a deployment that already has data, `MONGO_INITDB_ROOT_*` is
ignored and the server keeps starting without auth — so this needs one manual
pass. Do it once, on the server:

```bash
# 1. Create the user against the still-unauthenticated instance.
docker compose exec mongodb mongosh --eval '
  db.getSiblingDB("admin").createUser({
    user: "icdesign",
    pwd: "<strong password>",
    roles: [{ role: "root", db: "admin" }]
  })'

# 2. Put the same credentials in the repository-root .env (see .env.example)
#    and point server/.env at them:
#    MONGO_URI=mongodb://icdesign:<password>@mongodb:27017/icdesign_lab?authSource=admin

# 3. Recreate the stack. The image starts mongod with --auth once the root
#    credentials are present.
docker compose up -d --force-recreate mongodb backend
```

Verify afterwards that an unauthenticated connection is refused:

```bash
docker compose exec mongodb mongosh --quiet --eval 'db.adminCommand("listDatabases")'
# expect: MongoServerError: command listDatabases requires authentication
```

### CORS refuses by default

An empty `CORS_ORIGINS` used to allow *every* origin, while the API also sets
`credentials: true` — any site could call it with a visitor's session cookie
attached. An empty list now refuses all cross-origin browser requests. Requests
with no `Origin` header still pass, which covers same-origin traffic (how nginx
serves it in production), curl and uptime probes.

Set `CORS_ORIGINS` only when the frontend is served from a different domain than
the API.

### Session lifetime

`SESSION_TTL_HOURS` (default 24) governs the JWT expiry and the cookie lifetime
together, from `server/constants/auth.js`. They were previously set
independently — a 7-day token inside a 1-day cookie — so a captured token stayed
valid for six days after the user appeared to be signed out.

The sign-out route clears the cookie with the same attributes it was set with; a
browser ignores a clearing response whose attributes do not match.

### Chat spending limits

`POST /api/chat` is unauthenticated by design but every call is a paid AI
completion, so it has its own budget rather than sharing the general 1000/15min
API limit:

- `CHAT_RATE_LIMIT` (default 15) messages per IP per 10 minutes;
- a single request is capped at 2000 characters and 8 turns of history
  (`server/constants/chat.js`), enforced server-side — the rate limit alone
  still permits one enormous, expensive request.

### Background jobs run once, not once per instance

The daily news fetch is claimed through a lease in the `joblocks` collection
(`server/utils/jobLock.js`) before it runs. Every API process schedules it, so
without the lease several instances would wake at the same minute and each
scrape every source and pay for its own AI summarisation. The admin console's
"fetch now" button takes the same lease and answers `409` when a run is already
in progress.

The lease expires, so a process that crashes mid-run does not block the job
permanently.

### The news schedule lives in the database

It used to be `server/config/cronTime.json`, written with `fs.writeFileSync`.
That file was tracked in git and the deploy runs `git reset --hard origin/main`,
so changing the schedule from the admin console was silently reverted on the
next deploy — and the file was baked into the image rather than a volume, so a
rebuild lost it too. It is now the `news_cron_time` setting, like every other
setting.

### Rate limiting

`express-rate-limit` counts in process memory by default, which means N
instances give N times the configured allowance. The limiters where that matters
— sign-in attempts and the chat spend cap — use a shared store backed by Mongo
(`server/middleware/mongoRateLimitStore.js`).

The general `/api` flood guard deliberately stays in memory: it is coarse by
design, and a database write in front of every request is not worth the latency.

### The chat assistant is switched off

It was an experiment, and every message is a paid AI completion on an endpoint
that has to stay unauthenticated to be useful. Both sides are gated rather than
deleted:

- server: `CHATBOT_ENABLED=true` remounts the route (it answers `503` while off);
- client: `VITE_CHATBOT_ENABLED=true` renders the widget, which is lazily
  imported so its code is not downloaded at all while disabled.

Both must be `true`.

## CI/CD

One workflow, `.github/workflows/ci.yml`. Checks run on every push and pull
request; deployment is the last job and only fires for a push to `main`, so
nothing reaches the server that has not been built and smoke tested. Previously
the only workflow was the deploy itself.

### What the checks cover

| Job | Gate |
| --- | --- |
| `client` | eslint, production build, and a 1600 kB budget on total JS |
| `server` | every file parses, then the API is booted against a real MongoDB and probed |
| `compose` | `docker compose config` is valid, and still refuses to start without database credentials |

There is no test suite yet, so the server job is the substitute: it starts the
app and asserts the behaviour that a build cannot catch — public reads answer
200 against an empty database, CORS refuses an origin outside the allowlist and
accepts one inside it, the chat endpoint is disabled, unknown routes 404, and a
protected route rejects an unauthenticated request. Each of those was a real
defect at some point; the checks exist so they stay fixed.

The bundle budget guards the code splitting. A static import of a heavy
dependency in a shared module silently pulls it into the initial payload, and
nothing else in CI would notice.

### What deployment does differently

- **Pre-flight before anything stops.** It verifies `.env` and `server/.env`
  exist on the server first. The compose file requires database credentials, so
  discovering they are missing *after* stopping the containers turns a refused
  deploy into an outage.
- **No `docker compose down`.** `up` recreates only the services whose image or
  configuration changed, so most deploys no longer take the site down for the
  duration of the build.
- **Health check, then rollback.** If the new revision does not answer
  `/api/health` within a minute, the previous commit is restored and rebuilt, and
  the job fails.
- **Index sync and image prune** afterwards, since production runs with
  `autoIndex` off and every build otherwise leaves its predecessor on disk.

### Required repository secrets

`HOST`, `USERNAME`, `SSH_KEY` — the same three the old workflow used. The deploy
job targets a `production` environment, which is where to add a manual approval
step if you ever want one.

## Deployment guide (step-by-step)

### 1) Prepare MongoDB (Atlas)

1. Create a MongoDB Atlas cluster.
2. Create a database user with username/password.
3. In Network Access, allow your backend host IP (or `0.0.0.0/0` for quick setup).
4. Copy connection string and set:

   - `MONGO_URI=mongodb+srv://...`

### 2) Deploy backend (Render/Railway/Fly.io)

1. Create a new Web Service from `server` folder.
2. Build command:

   ```bash
   npm install
   ```

3. Start command:

   ```bash
   npm start
   ```

4. Set environment variables:

   - `PORT=5000` (or platform default)
   - `MONGO_URI=<your atlas uri>`
   - `JWT_SECRET=<strong random secret>`
   - `CORS_ORIGINS=<your frontend domain>`
   - `GROQ_API_KEY=<your groq api key>`

5. After deploy, test:

   - `GET https://<your-backend-domain>/api/health`

### 3) Deploy frontend (Vercel/Netlify)

1. Import project and use `client` as root directory.
2. Build command:

   ```bash
   npm run build
   ```

3. Output directory:

   ```bash
   dist
   ```

4. Set frontend environment variable:

   - `VITE_API_URL=https://<your-backend-domain>/api`

5. Deploy and open app URL.

### 4) Connect frontend <-> backend

1. Copy frontend production URL.
2. Add it to backend CORS:

   - `CORS_ORIGINS=https://<your-frontend-domain>`

   If using multiple domains:

   - `CORS_ORIGINS=https://<frontend1>,https://<frontend2>`

3. Redeploy backend.
4. Verify login and CRUD work in browser.

### 5) Local .env templates

- `server/.env.example` already includes:
  - `PORT`
  - `MONGO_URI`
  - `JWT_SECRET`
  - `CORS_ORIGINS`
  - `GROQ_API_KEY`
- `client/.env.example` includes:
  - `VITE_API_URL`
