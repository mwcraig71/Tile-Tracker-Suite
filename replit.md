# Tile Tracker Suite (FieldTrack)

Equipment tracker that pairs Tile Bluetooth trackers, printable QR labels, and RFID/NFC tags: live GPS locations and history from the Tile cloud, an equipment registry with components and use logs, and a public QR-scan flow for reporting equipment locations from the field. Each equipment record can carry any combination of the three identifiers (Tile, QR, RFID) — all linked to the same record.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env:
  - `DATABASE_URL` — Postgres connection string
  - `APP_API_KEY` — shared access key for the API (all routes except `/healthz` and `/api/scan/:token` require it; server fails closed in production if unset). Enter the same key in the app under Settings → App Access Key.
  - `TILE_EMAIL` / `TILE_PASSWORD` — optional; Tile account credentials (can also be set at runtime via Settings)
  - `ALLOWED_ORIGINS` — optional; comma-separated CORS allowlist for cross-origin frontends (same-origin needs nothing)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server` — Express API (`src/routes/*`, Tile cloud client in `src/lib/tile-client.ts`, auth/rate-limit middleware in `src/middleware/security.ts`)
- `artifacts/equipment-tracker` — React frontend (Vite, wouter, TanStack Query, shadcn/ui, Leaflet maps)
- `lib/db` — Drizzle schema + Zod insert/update schemas (source of truth: `src/schema/equipment.ts`)
- `lib/api-zod`, `lib/api-client-react` — generated from the OpenAPI spec in `lib/api-spec` (regenerate via codegen, do not edit)

## Architecture decisions

- Auth is a single shared API key (`APP_API_KEY`) checked by middleware, not per-user accounts — this is a single-team internal tool. The key is stored in browser localStorage and sent as a Bearer token.
- The QR scan endpoints (`/api/scan/:token`) are deliberately public so anyone scanning a printed label can report a location.
- Writes are validated with the drizzle-zod schemas exported from `@workspace/db` (`insertEquipmentSchema` / `updateEquipmentSchema`), which strip unknown keys — never spread `req.body` into a query.
- Tile cloud timestamps are inconsistent (seconds vs ms); everything is normalized through `toEpochMs()` in `tile-client.ts`.
- Equipment identifiers are all optional and unique where present: `tileUuid` (nullable), `qrToken` (always auto-generated), `customQrCode`, and `rfidTag` (nullable, stored uppercase). `/api/qr/lookup` resolves any of them. RFID scanning uses Web NFC (Chrome on Android) with a keyboard-wedge/manual input fallback for handheld UHF readers and iOS.
- Tile credentials set via Settings live in server memory only and reset on restart.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The rate limiter and Tile session are in-memory — fine for a single autoscale instance, but they reset per instance if scaled out.
- `post-merge.sh` must filter by the full package name `@workspace/db` (a bare `db` filter matches nothing).
- Set-Cookie parsing uses `Headers.getSetCookie()`; do not switch back to `headers.get("set-cookie")` (it comma-folds multiple cookies).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
