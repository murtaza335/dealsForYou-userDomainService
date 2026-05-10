# User Domain Service - Setup & Run Guide

## Prerequisites

- Node.js 18+ (already have it based on tsconfig)
- PostgreSQL 12+ or a Supabase project
- npm 

## Step 1: Install Dependencies ✅

```bash
npm install
```

Status: **Already done** - all 153 packages installed.

---

## Step 2: Setup Database

You can use either Supabase or a local PostgreSQL instance.

### Option A: Supabase (recommended for hosted environments)

1. Create a Supabase project.
2. Open Project Settings → Database.
3. Copy the pooled connection string for runtime and the direct connection string for migrations.

**Set environment variables:**

```env
DATABASE_URL=postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
DIRECT_URL=postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
```

### Option B: Local PostgreSQL (Recommended for Development)

**Create database:**
```bash
createdb user_domain_db
```

If `createdb` is not available, create the database with any PostgreSQL client or Docker.

---

### Option C: Docker PostgreSQL

**Start PostgreSQL container:**
```bash
docker run --name user-domain-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=user_domain_db \
  -p 5432:5432 \
  -d postgres:15-alpine
```

**Check it's running:**
```bash
docker logs user-domain-postgres
```

---

## Step 3: Configure Environment Variables

Edit `.env` file in the root directory:

```bash
# Copy the template
cp .env.local .env

# Then edit .env with your database URL
nano .env
```

**Minimum .env settings:**
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
DIRECT_URL=postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
JWT_SECRET=dev-secret-key-12345
TOKEN_EXPIRY_MINUTES=15
CLERK_SECRET_KEY=sk_test_your_key
CLERK_JWKS_URL=https://your-instance.clerk.com/.well-known/jwks.json
SERVICE_NAME=user-domain-service
```

---

## Step 4: Run Database Migrations

Run Prisma migrations against your `DIRECT_URL` when using Supabase:

```bash
npm run prisma:migrate
```

If you only want to sync the schema without creating a migration file:

```bash
npx prisma db push
```

Regenerate the Prisma client after schema changes:

```bash
npm run prisma:generate
```

---

## Step 5: Verify Build

```bash
npm run build
```

Expected output:
```
> user-domain-service@1.0.0 build
> tsc -p tsconfig.json

(no errors)
```

---

## Step 6: Start Development Server

```bash
npm run dev
```

Expected output:
```
user_domain_service listening on port 3000
```

The server is now running! ✅

---

## Step 7: Test the Service

### Health Check (in another terminal):
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "success": true,
  "service": "user-domain-service"
}
```

### Verify Database Connection:
```bash
# This will fail without valid Clerk token, but shows DB is responding
curl -X POST http://localhost:3000/internal/resolve-user \
  -H "Content-Type: application/json" \
  -d '{"clerkToken": "invalid"}'
```

Response (expected 401):
```json
{
  "success": false,
  "message": "Invalid token: ..."
}
```

---

## Complete Setup Commands (Run in Order)

```bash
# 1. Install dependencies
npm install

# 2. Configure Supabase or create local database
#    For local PostgreSQL:
createdb user_domain_db

# 3. Run migrations
npm run prisma:migrate

# 4. Regenerate Prisma client if needed
npm run prisma:generate

# 5. Copy and configure env file
cp .env.local .env
# Edit .env with your settings

# 6. Build TypeScript
npm run build

# 7. Start development server
npm run dev
```

---

## Verify Everything Works

In a new terminal, run:

```bash
# Terminal 1: Running dev server (from step above)
npm run dev

# Terminal 2: Test endpoints
curl http://localhost:3000/health

# Should see:
# {"success":true,"service":"user-domain-service"}
```

---

## Database Inspection Commands

```bash
# List all tables
psql -U postgres -d user_domain_db -c "\dt"

# View users table structure
psql -U postgres -d user_domain_db -c "\d users"

# View all users
psql -U postgres -d user_domain_db -c "SELECT * FROM users;"

# View user count
psql -U postgres -d user_domain_db -c "SELECT COUNT(*) FROM users;"

# View user roles enum
psql -U postgres -d user_domain_db -c "SELECT enum_range(NULL::user_role);"
```

---

## Troubleshooting

### "Database connection refused"
```bash
# Check if PostgreSQL is running
psql -U postgres -c "SELECT 1;"

# If not running (local):
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql
# Docker: docker start user-domain-postgres
```

### "Database does not exist"
```bash
# Create it
psql -U postgres -c "CREATE DATABASE user_domain_db;"

# Then run migrations
psql -U postgres -d user_domain_db -f src/db/migrations/001_init_user_domain.sql
```

### "users table does not exist"
```bash
# Re-run migrations
psql -U postgres -d user_domain_db -f src/db/migrations/001_init_user_domain.sql

# Verify
psql -U postgres -d user_domain_db -c "\dt"
```

### "Cannot GET /health"
- Make sure server is running: `npm run dev`
- Check port 3000 is not in use: `lsof -i :3000`
- Check .env DATABASE_URL is valid

### Clerk JWT verification fails
- Update `CLERK_JWKS_URL` with your actual Clerk instance
- Generate test token from Clerk dashboard
- Check token expiration

---

## Optional: Reset Database

If you need to start fresh:

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE user_domain_db;"
psql -U postgres -c "CREATE DATABASE user_domain_db;"

# Re-run migrations
psql -U postgres -d user_domain_db -f src/db/migrations/001_init_user_domain.sql

# Verify
psql -U postgres -d user_domain_db -c "\dt"
```

---

## Next Steps

After successful startup:

1. **Configure Clerk JWT**: Update `CLERK_JWKS_URL` and `CLERK_SECRET_KEY` in .env
2. **Generate JWT Secret**: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. **Test with Clerk Token**: Get real token from your Clerk dashboard
4. **Call /internal/resolve-user**: Verify auto-provisioning works
5. **Integrate with API Gateway**: Pass internal tokens between services

---

## Development Commands Reference

```bash
# Start development with auto-reload
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Run tests
npm test

# View logs
tail -f logs/app.log
```

---

Done! Your service is ready. 🚀
