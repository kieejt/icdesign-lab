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
- **Images are re-encoded on upload** (`routes/uploadRoutes.js`): EXIF-rotated,
  capped at 2000px and saved as WebP (GIFs untouched). Pages request
  `/uploads/<file>?w=<320|480|768|1024|1600>` through `client/src/lib/image.js`
  (`srcSet`/`sizes`); `middleware/imageVariants.js` generates each width once into
  `uploads/_w/`, so images uploaded before this change are covered too.
- **One request for the homepage.** `GET /api/home` returns everything the page
  shows (projects, people, news, recruitment, stats) instead of nine calls. Its
  cache entry is dropped whenever any of those resources is written.
- **Indexed search.** Members and documents carry `searchTokens`
  (`models/plugins/searchTokens.js`): lower-cased, accent-stripped words. A query
  matches when every word is the *prefix* of a token, so `nguyen` finds `Nguyễn`
  and the lookup uses an index instead of scanning with a regex. Existing rows are
  backfilled at boot (and by `npm run sync-indexes`). Search matches word starts,
  not arbitrary substrings. List endpoints cap `limit` at 100.
- **Self-hosted fonts** (`@fontsource*`, `client/src/fonts.css`): no Google Fonts
  connection, and only the latin/vietnamese files a page uses are downloaded.
- **Pre-compressed assets.** The build writes `.br` and `.gz` beside every text
  asset; nginx serves them with `brotli_static`/`gzip_static`. The image is based
  on Alpine because the official nginx image has no Brotli module.
- **Edge cache in nginx** for public `/api` GETs and for `/uploads` (including
  resized variants). Only responses the backend marks `Cache-Control: public` are
  stored, and any request carrying a session cookie or `Authorization` header
  bypasses the cache, so admins always see their own edits. `X-Edge-Cache`
  reports HIT/MISS.
- **Link prefetch.** Hovering, focusing or touching an internal link starts
  downloading that page's chunk (`client/src/routes/routePrefetch.js`).
- **`gzip` + immutable asset caching** in `client/nginx.conf`; hashed `/assets/`
  files are cached for a year, `index.html` never.

### SEO and link previews

- `usePageMeta` sets the title, description, canonical URL, Open Graph tags and
  schema.org JSON-LD (`ScholarlyArticle`, `Person`, `ResearchProject`) per page.
- `/sitemap.xml` and `/robots.txt` are generated by the backend
  (`routes/seoRoutes.js`) from the database. Set `SITE_URL` in `server/.env` to
  the public origin.
- Preview crawlers that don't run JavaScript (Facebook, Zalo, Slack, LinkedIn,
  ...) are routed by nginx to `/api/seo/page`, which returns a page-specific
  card. Search engines are deliberately not routed there; they render the SPA.
- A `Content-Security-Policy` is set in `client/nginx/csp.conf`. If you embed a
  new third-party frame, script or image host, add it there.

### The news and jobs agent

`services/agent.service.js` runs daily (and from the admin "Fetch Sources Now"
button): it reads every source, picks the most relevant items per category, has
Groq summarise and judge a wider shortlist, and saves the best as pending review.

- **Sources** are listed in `services/sources.js`; each group runs in parallel with
  its own time budget, and inside a group requests run with bounded concurrency
  (`services/scrapers/http.js`: retry with backoff, `Retry-After`, abort signal).
  A full run takes about 20 s (it was 45 s for the jobs sources alone).
- **Every run is recorded** (`FetchRun`): per-source status, item count, time and
  error, per-category results, and whether the AI worked. The admin News page shows
  it, so a dead source or a failing AI step is visible instead of only meaning
  fewer articles.
- **Selection.** Items are scored by keyword, source and recency; items older than
  14 days (jobs: 60) are ignored; duplicates are removed by canonical URL, by
  near-identical title, and for jobs by company. The top 10 per category go to the
  AI, which rates relevance 0-10; off-topic items (< 3) are dropped, the rest are
  ranked by relevance with at most 3 per source (2 for jobs).
- **Auto-approve** (opt-in) now needs the keyword score to reach 7 **and** the AI to
  rate the article 7+. A keyword score alone could be reached by recency and source
  bonuses for an off-topic story.
- **Handled URLs are remembered** (`SeenUrl`, 60 days) independently of the 200-item
  news retention, so a rejected or off-topic article is not offered again and the AI
  is not paid to judge it twice.
- **The manual fetch runs in the background**: `POST /api/news/fetch` answers 202
  at once and the console polls `GET /api/news/fetch-status`. Waiting on one request
  used to time out after 60 s and report an error while the fetch carried on.
- **Catch-up.** If the last successful run is over 26 h old at boot (the server was
  down at the scheduled minute, a deploy restarted it), one runs a minute later.
  Production only unless `NEWS_CATCH_UP=true`.
- **Model.** Set with `GROQ_MODEL` (default `openai/gpt-oss-20b`). The previous
  hard-coded `llama-3.3-70b-versatile` was retired and returned 404, so summaries
  and ranking had silently not worked at all.

Tests: `npm test --prefix server` (Node's built-in runner). They cover URL
canonicalisation, de-duplication, AI reply validation, selection, retries, every
parser (fixtures) and a full run against MongoDB with fake sources and a fake
ranker; no network or key.

#### Sources (53 per run)

Every candidate was measured before it was added (reachable? parseable? fresh? how
many items are actually on topic?). The outlets' own technology feeds turned out to
hold almost no semiconductor stories, so the weight moved to topic-filtered sources.

| Kind | Sources | Notes |
|---|---|---|
| Keyword search feeds | Google News (5 Vietnamese + 2 English queries), Bing News (2) | 94-100 of 100 results on topic across *all* Vietnamese outlets. Google links are redirects and carry a headline only |
| Vietnamese topic pages (HTML) | Tia Sáng, Tuổi Trẻ, Sài Gòn Giải Phóng, Báo Chính phủ, CafeF, Mekong ASEAN | No usable feed. Listings are read for headlines; the article page is fetched only for the shortlist (description, real date, image) |
| General feeds | VnExpress, VietnamNet, Dân trí, VnEconomy, VietnamPlus, Genk, Tinh tế, VnExpress International | Broad tech sections; kept for coverage |
| English IC / semiconductor | Semiconductor Engineering, SemiWiki, EE Times, EDN, IEEE Spectrum, Semiconductor Today, Chips and Cheese, Electronics Weekly, Semiconductor Digest, Siemens EDA, arXiv cs.AR, Tom's Hardware, others | |
| Jobs | LinkedIn, VietnamWorks, Careerlink, CareerViet (HTML), NVIDIA / Marvell / Intel careers (Workday API) | Workday gives direct, dated postings from the employers |

Tried and **not usable**: TopCV, JobsGO, Glints, Indeed, VOV (403), DIGITIMES (access
denied page), ICDREC / NIC / VNU-HCM (JavaScript challenge or app shell, no HTML to
read), ITviec (404). Other Workday tenants (Synopsys, Renesas, Qualcomm, AMD, ...)
answered 422/401 or had no Vietnam postings.

**Adding a source.** An RSS feed is one line in `worldNews/sources/rssSources.js` or
`vietnamNews/sources/rssSources.js`. A site without a feed: add its tag or search
page to `LISTINGS` in `vietnamNews/sources/htmlListings.js` with a `hrefPattern`
describing what an article URL looks like. A Workday employer: add `{ company,
tenant, wd, site }` to `COMPANIES` in `jobs/sources/workday.js` (all three come from
its careers URL). Each run's source report in the admin News page shows immediately
whether the new source returns anything.

### Database indexes in production

`config/db.js` disables `autoIndex` when `NODE_ENV=production` so boots stay
fast. After deploying a schema change, run once:

```bash
npm run sync-indexes --prefix server
```

`sync-indexes` also **drops** indexes that are no longer declared on a model,
which is how redundant ones are cleaned up on deploy.

### Database health and index policy

```bash
npm run db-audit --prefix server
```

Read-only report: collection sizes, the query plan of each hot read (a missing
index shows as `COLLSCAN` or a docs-examined count far above the rows returned)
and per-index usage. Run it after adding a query, and against production data
before dropping an index.

Rules the models follow:

- An index exists because a route filters or sorts on it. Every index costs a
  write on each insert, so redundant ones were removed (`PageView.createdAt` is
  covered by the TTL index; `Member.name` and `Research(category, date)` were
  unused).
- **Page views are written in batches** (`routes/analyticsRoutes.js`): buffered
  in memory, flushed every 5 s, at 200 rows and on shutdown. Bots, crawlers and
  uptime probes are not counted. A crash loses at most a few seconds of
  analytics.
- The admin dashboard counts visitors with separate indexed pipelines and caches
  the result for a minute. Measured on 300 000 views: ~1.1 s before, ~0.15 s now.

### Backups

The `backup` service in `docker-compose.yml` writes a gzip archive of the whole
instance to the `backups_data` volume every `BACKUP_INTERVAL_HOURS` (default 24)
and keeps `BACKUP_KEEP_DAYS` (default 14) of them. **That volume lives on the same
machine as the database**, so it protects against mistakes and corruption, not
against losing the server. Copy the archives off the machine as well, e.g. with a
cron job on the host:

```bash
docker cp icdesign-backup:/backups ./backups && rclone sync ./backups remote:icdesign-backups
```

Restore (replaces the current data):

```bash
docker compose cp ./backups/icdesign-YYYYmmdd-HHMMSS.archive.gz mongodb:/tmp/restore.gz
docker compose exec mongodb sh -c 'mongorestore --drop --gzip --archive=/tmp/restore.gz -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin'
```

Try a restore into a scratch environment once, before you need it.

### Upgrading MongoDB

The stack now runs `mongo:7.0` (6.0 reached end of life in July 2025). A data
directory created by 6.0 opens directly under 7.0 and stays in compatibility
mode 6.0 until you confirm. After a deploy, once the site has run correctly on 7.0:

```bash
docker compose exec mongodb mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin \
  --eval 'db.adminCommand({ setFeatureCompatibilityVersion: "7.0", confirm: true })'
```

Until that command runs, rolling back to 6.0 is still possible; afterwards it is
not. Take a backup first. To move on to 8.0 later, repeat one major version at a
time (7.0 → 8.0); MongoDB does not support skipping a version.

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

## Hosting on AWS EC2 (single server)

The production deploy target is one EC2 instance running the compose stack, with
Caddy in front for HTTPS.

```
browser --HTTPS--> Caddy (host, :443) --> nginx container (127.0.0.1:3000) --> API container (:5000) --> MongoDB
```

| | |
|---|---|
| Region | `ap-southeast-2` (Sydney) |
| Instance | `t3.small` (2 vCPU, 2 GB) + 2 GB swap, 20 GB encrypted gp3, Ubuntu 24.04 |
| Network | Elastic IP; security group opens only 22 (key-only SSH, needed by CI), 80, 443 |
| Cost | about 19 USD instance + 3.7 IPv4 + 2 disk per month (Sydney, on-demand) |

**The AWS Free plan is not "12 months free".** It is 100 USD of credits, valid until
the plan's expiry date (6 months from sign-up). At about 25 USD a month the credits
last roughly four months; check `aws freetier get-account-plan-state` and AWS
Settings > Billing. When they run out the project pauses until it is upgraded.

### Why there is a proxy in front

The session cookie is `Secure` in production, so login only works over HTTPS. Caddy
gets and renews the certificate by itself. `client/nginx.conf` trusts
`X-Forwarded-For` / `X-Forwarded-Proto` from private addresses only, so the API
still sees the real visitor address (rate limits, analytics) and scheme. Both app
ports are published on `127.0.0.1` only (`docker-compose.yml`).

### First-time setup of a new server

1. Launch Ubuntu 24.04 with Docker, the compose plugin and Caddy (`docker`, `caddy`,
   2 GB swap, Docker log rotation); allow ports 22/80/443 only.
2. Point the domain's A record at the server's address.
3. On the server: `git clone https://github.com/kieejt/icdesign-lab.git`, then create
   `.env` (MongoDB root credentials) and `server/.env` (`MONGO_URI` using those
   credentials with `@mongodb:27017/icdesign_lab?authSource=admin`, `JWT_SECRET`,
   `CORS_ORIGINS=https://<domain>`, `SITE_URL=https://<domain>`, `GROQ_API_KEY`).
   Generate secrets with `openssl rand -base64 32`.
4. Install `deploy/Caddyfile` as `/etc/caddy/Caddyfile` (set the domain) and create the two files it imports; see "Cloudflare in front". Then `sudo systemctl reload caddy`.
5. `docker compose up -d --build --wait`. The first build takes several minutes.
6. Create the first admin: `POST /api/auth/register` works only while no admin exists.
7. Set the repository secrets `HOST`, `USERNAME`, `SSH_KEY` (a key used only by CI);
   from then on every push to `main` deploys.

### Cloudflare in front

The domain's DNS is on Cloudflare with the records **proxied** (orange cloud), so
visitors never talk to the server directly.

| Layer | Setting |
|---|---|
| TLS | SSL mode **Full (strict)**, minimum TLS 1.2, "Always Use HTTPS" on |
| WAF | Cloudflare's managed Free ruleset and DDoS protection (on by default); custom rules block probes for `.env`, `.git`, `wp-*`, `phpmyadmin`, `*.php`, `vendor/` and unused HTTP methods, and challenge path-traversal attempts |
| Rate limit | `POST /api/auth/login` and `/register`: more than 5 per 10 s per address is blocked (the API has its own limiter on top) |
| Bots | Bot Fight Mode on (it was already enabled). It challenges clients that are not browsers; verified crawlers such as Googlebot pass, but a link-preview bot it does not recognise (Zalo, for one) may be challenged |
| Origin lock | Caddy requires Cloudflare's client certificate (Authenticated Origin Pulls), and the AWS security group allows ports 80/443 from Cloudflare's ranges only; a request straight to the server's address cannot complete the TLS handshake |
| Real client IP | Caddy trusts `CF-Connecting-IP` from Cloudflare's ranges only and forwards a single `X-Forwarded-For`; nginx and the API see the visitor |
| Mail | The domain sends no mail: SPF `-all`, DMARC `reject`, null DKIM and a null MX stop anyone spoofing it. Change these before using the domain for email |
| Injected scripts | Email obfuscation, Rocket Loader and Web Analytics auto-injection are off: the Content-Security-Policy only allows the site's own scripts |
| DNSSEC | Enabled at Cloudflare; **it is only effective once the DS record is added at the registrar** (Cloudflare dashboard > DNS > Settings shows it) |

Files on the server: `/etc/caddy/Caddyfile` (from `deploy/Caddyfile`),
`/etc/caddy/cloudflare-ips.caddy` and `/etc/caddy/cloudflare-origin-pull-ca.pem`.
Cloudflare changes its address ranges rarely. When it does, run
`sudo /opt/icdesign/refresh-cloudflare-ips.sh` (Caddy) and add the new ranges to the
security group's rules for ports 80 and 443.

**Switching the proxy off** (grey cloud) breaks the site until you also (1) remove the
`tls { client_auth ... }` block from the Caddyfile and reload Caddy, and (2) reopen
ports 80/443 to `0.0.0.0/0` in the security group. Do both first, then change the DNS.

Day to day: `ssh ubuntu@<host>` then `docker compose ps`, `docker compose logs -f backend`.
Backups are written by the `backup` service; copy them off the machine (see Backups).

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
