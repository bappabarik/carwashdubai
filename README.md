# Car Service API

Backend for a Dubai-based car service booking platform (Node.js + TypeScript + Fastify + PostgreSQL + Prisma).

## Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Fastify 5 (with Zod-based schema validation via `fastify-type-provider-zod`)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT (access + refresh tokens), OTP-based login (no passwords)
- **Testing:** Bruno (collection included in `/bruno`)

## Project structure

```
src/
  config/env.ts          # Validated environment variables (zod)
  plugins/
    prisma.ts            # Prisma client as a Fastify plugin, graceful disconnect
    error-handler.ts      # Centralized error handling -> consistent JSON error shape
  modules/
    health/               # Health check module (first working example)
    auth/                 # (next) OTP login, refresh, logout
  utils/
    errors.ts             # AppError + typed subclasses (BadRequestError, etc.)
  app.ts                  # Builds and configures the Fastify instance
  server.ts               # Entry point — starts server, handles graceful shutdown
prisma/
  schema.prisma           # Full data model (users, otp, tokens, addresses, cars, services, bookings)
bruno/car-service-api/    # Bruno API collection for manual testing
```

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in:
   - `DATABASE_URL` — your local/hosted Postgres connection string
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate strong random strings, e.g.:
     ```bash
     node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
     ```

3. **Generate Prisma client & run migrations**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate -- --name init
   ```

4. **Run the dev server**
   ```bash
   npm run dev
   ```
   Server starts on `http://localhost:4000` (configurable via `PORT` in `.env`).

5. **Test it**
   - Open the `bruno/car-service-api` folder as a collection in Bruno.
   - Select the **Local** environment.
   - Run **Health > Health Check** — should return `{ "success": true, "status": "ok", ... }`.

## Design notes / decisions baked into the schema

- **OTP is stored hashed** (`otp_hash`, not plaintext) — same principle as password hashing, so a DB leak doesn't expose live OTP codes. We'll hash with `argon2` when we build the auth module.
- **Refresh tokens are stored hashed too**, scoped per `device_id` — lets a user be logged in on multiple devices and lets you revoke one device without logging out the others.
- **Services are a self-referencing tree** (`service_categories.parent_id`) — car washing's sub-services (pressure wash, deep clean) are just child rows. Adding a second service line later (e.g. AC repair) needs zero schema changes.
- **Booking prices are always recomputed server-side** from `service_pricing` at booking time — never trust a price sent from the client.
- **UUIDs as primary keys** — safer for a public API (no sequential ID enumeration) and easier for offline-first mobile flows later if needed.

## What's next

Building step by step, in this order:
1. ✅ Project scaffold, Prisma schema, health check
2. ⬜ OTP auth module (`send-otp`, `verify-otp`, `refresh-token`, `logout`)
3. ⬜ Addresses & Cars CRUD
4. ⬜ Services (categories + pricing) endpoints
5. ⬜ Booking validation + checkout + booking history
