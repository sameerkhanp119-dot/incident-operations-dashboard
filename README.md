# Signal Desk · Incident Operations Dashboard

[![CI](https://github.com/sameerkhanp119-dot/incident-operations-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/sameerkhanp119-dot/incident-operations-dashboard/actions/workflows/ci.yml)

A React operations workbench with a Java 17 / Spring Boot API. Explore an incident queue, filter by service and priority, inspect history, and move incidents through a controlled lifecycle.

**[Try the browser demo](https://sameerkhanpathan.com/demos/incident-operations/)** · [Architecture and API](docs/architecture.md) · [Tests](https://github.com/sameerkhanp119-dot/incident-operations-dashboard/actions)

The public demo runs entirely in the browser with synthetic data. It does not authenticate real users, connect to a production incident platform or persist changes. The backend is a separate runnable local implementation with server-enforced authorization, CSRF protection and optimistic version checks.

## What to try

1. Search for `payment`, combine filters, and paginate the results.
2. Open an incident, add a note, and advance it one lifecycle state.
3. Inspect the new audit entry and version number.
4. Switch the demo role to Viewer. The interface becomes read-only.
5. Reset the dataset or search for a nonexistent incident to inspect the empty state.

## Run locally

Requires Java 17+, Maven 3.6.3+, Node 22.12+ and npm.

```sh
# Terminal 1
cd backend
mvn spring-boot:run

# Terminal 2
cd frontend
npm ci
npm run dev
```

Open the local Vite URL. Browser demo mode works immediately. Choose **Connect local API**, then use `operator` / `operator-local` or `viewer` / `viewer-local`. These are local development credentials, not secrets. The API binds to loopback by default. Override `OPERATOR_PASSWORD` and `VIEWER_PASSWORD` before sharing an instance; a real deployment requires HTTPS and managed identity.

Vite proxies `/api` to `127.0.0.1:8080`, keeping API requests same-origin. The sign-in response supplies a CSRF token; mutations send it with the authenticated request. Frontend credentials remain in memory and are discarded on reset/reload. The public static demo has no API behind its connection button.

## Verify

```sh
cd backend
mvn verify
cd ../frontend
npm ci
npm test
npm run build
```

Backend tests cover authentication, read/write permissions, CSRF rejection, pagination validation, illegal transitions, audit creation and stale-version conflicts. Frontend domain tests cover filters, pagination, lifecycle rules, roles and summary counts. These checks do not establish browser accessibility conformance, durable storage, production scale or operational readiness.

## Design boundaries

- The backend stores immutable incident snapshots in one JVM. A synchronized update checks the expected version and appends audit history atomically. A real multi-instance service needs transactional database updates and durable audit storage.
- Lifecycle is deliberately linear: `OPEN → INVESTIGATING → MONITORING → RESOLVED`. Reopen/escalation policies are out of scope.
- All owners, incidents and counts are synthetic. Reloading the browser resets demo state; restarting the backend resets API state.
- The browser role switch illustrates UX behavior. Only the running Spring Security backend enforces access control.

## Project map

| Path | Responsibility |
|---|---|
| `frontend/src/main.jsx` | React workbench, dialogs, filters, connection UI |
| `frontend/src/domain.js` | Pure demo model and lifecycle rules |
| `backend/src/main/java/dev/skp/incident` | Authenticated REST API and in-memory domain |
| `backend/src/test` | API behavior and security tests |
| `docs/architecture.md` | Tradeoffs, API contract and deployment gaps |

Independent portfolio project by [Sameer Khan Pathan](https://sameerkhanpathan.com). MIT licensed.
