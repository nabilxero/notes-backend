# Notes API

REST API for a note-taking app with JWT authentication and role-based access (user / admin).
Stack: Node.js, Express, TypeScript, MongoDB (Mongoose).

## Getting started
Requires Node 20+ and Docker (for a local MongoDB).

```bash
docker compose up -d        # start MongoDB on :27017
cp .env.example .env        # adjust if needed
npm install
npm run dev                 # http://localhost:4000/api
```

### Admin account
Public registration only creates regular users. Create the admin from env vars
(`ADMIN_EMAIL`, `ADMIN_PASSWORD`, optional `ADMIN_NAME`):
```bash
npm run seed:admin
```
Safe to run again: an existing account with that email is promoted to admin and its password reset.

## Scripts
| Script | Purpose |
|---|---|
| `npm run dev` | Start with auto-reload |
| `npm run build` / `npm start` | Compile to `dist/` and run |
| `npm test` | Run tests (needs local MongoDB; uses a separate `notes_test` database) |
| `npm run typecheck` | Type-check without emitting |
| `npm run seed:admin` | Create or promote the admin account from env vars |

## Configuration (env)
| Var | Description |
|---|---|
| `PORT` | HTTP port (default 4000) |
| `MONGODB_URI` | MongoDB connection string |
| `CORS_ORIGIN` | Allowed frontend origin |
| `JWT_SECRET` | HS256 signing secret, at least 32 random characters |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `1d`, `12h` (default `1d`) |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used only by `npm run seed:admin` |

## API
See [docs/API_CONTRACT.md](docs/API_CONTRACT.md).
