# Civicert

A premium, responsive provisional certificate application portal with a separate Next.js frontend and Express/Prisma backend.

## Project structure

- `frontend/` Next.js 16 App Router UI, TypeScript, Tailwind CSS
- `backend/` Express API, Prisma/PostgreSQL, JWT cookie auth, S3 and PDF integrations
- `assignment.txt` original task
- `task.md` product and implementation brief

## Run locally

### 1. Install dependencies

```bash
cd frontend && npm install
cd ../backend && npm install
```

### 2. Configure PostgreSQL

Recommended path: create a free project at Neon (https://neon.tech), create a database named `civicert`, and copy its pooled connection string. Save it as `DATABASE_URL` in `backend/.env`.

```bash
cd backend
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
```

For local Postgres instead, run `createdb civicert` and use `postgresql://USER:PASSWORD@localhost:5432/civicert`.

### 3. Configure AWS S3

Create a private S3 bucket in one region. Keep Block all public access enabled. Create an IAM user with only `s3:PutObject` and `s3:GetObject` permissions scoped to `arn:aws:s3:::YOUR_BUCKET/*`, then put the access key, secret, region, and bucket name in `backend/.env`. Apply the CORS policy in `docs/aws-setup.md`.

### 4. Start both apps

```bash
# terminal 1
cd backend && npm run dev

# terminal 2
cd frontend && npm run dev
```

Open http://localhost:3000. The API health check is http://localhost:4000/health.

## Deployed Urls

Backedn: https://certificate-portal-tzri.onrender.com/health
Frontend: https://certificate-portal-seven.vercel.app/

### Render free plan migration command

If Render does not provide **Pre-Deploy Command** or **Shell** on your plan,
put the migration in the Render service **Build Command**:

```bash
npm ci --include=dev && npx prisma generate && npx prisma migrate deploy && npm run build
```

Set `DATABASE_URL` in Render before deploying. The migration files must be
committed under `backend/prisma/migrations/`.

For authentication between Vercel and Render, add these Render variables:

```env
NODE_ENV=production
FRONTEND_URL=https://certificate-portal-seven.vercel.app
```

The backend uses an HTTPS `SameSite=None` HTTP-only cookie in this deployed
configuration. Without the exact Vercel origin in `FRONTEND_URL`, login may
return `200` while `/api/auth/me` and `/api/applications` return `401`.

## Infrastructure setup

Follow [docs/aws-setup.md](docs/aws-setup.md) for the exact Neon/PostgreSQL, S3, IAM, SES, environment variable, and deployment steps.
