# Civicert

I built Civicert as a small provisional certificate application portal. A user can create an account, enter their personal and registration details, upload the required PDF documents, submit the application, and download an acknowledgment PDF. Submitted applications remain available from the dashboard.

I kept the frontend and backend separate: the frontend uses Next.js, while the API uses Express, Prisma, and PostgreSQL.

## Features

- Email/password authentication with bcrypt and an HTTP-only JWT cookie
- Multi-step application form with validation and state retained between steps
- Private S3 uploads using short-lived presigned URLs
- Server-side PDF receipt generation with `pdf-lib`
- PostgreSQL persistence through Prisma migrations
- User-scoped application and document access
- AWS SES notifications when an application is submitted and when its receipt is generated
- Responsive dashboard with application status and secure downloads

## Architecture

```text
Browser (Next.js / Vercel)
	|
	| HTTPS API requests, credentials included
	v
Express API (Node.js / Render)
	|                 |                  |
	v                 v                  v
PostgreSQL         Private S3          Amazon SES
(Neon + Prisma)    documents/PDFs      email notifications
```

### How the application works

1. The user signs up or logs in, and the backend sets an HTTP-only JWT cookie.
2. The first form step creates an application and assigns it a server-generated reference number.
3. Each PDF goes directly to S3 through a presigned PUT URL. The backend checks the uploaded object's metadata before saving it in the database.
4. When the user submits, the API checks that both documents exist, records `submittedAt`, and sends the submission email.
5. The certificate endpoint creates the PDF on the server, stores it privately in S3, marks the application `COMPLETED`, and sends the receipt email.
6. Downloads use new five-minute presigned GET URLs, so the S3 bucket does not need to be public.

## Project structure

```text
frontend/                 Next.js App Router application
backend/src/server.ts     Express API, authentication, uploads, PDF, SES
backend/prisma/            Prisma schema and database migrations
docs/aws-setup.md          Neon, S3, IAM, SES, and deployment instructions
docs/technical-writeup.md  Design rationale and time-box trade-offs
assignment.txt             Original take-home assignment
task.md                    Product and implementation brief
```

## Before running locally

- Node.js 20 or newer
- npm
- A PostgreSQL database, such as a Neon project
- An AWS account with an S3 bucket and IAM credentials or an IAM role
- SES is optional for local development, but required if I want to test email delivery

## Local setup

### 1. Install dependencies

Run each command from the repository root:

```bash
cd frontend
npm install

cd ../backend
npm install
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Fill in the backend values listed in [Environment variables](#environment-variables). I do not commit `.env` files or AWS credentials.

### 3. Prepare the database

```bash
cd backend
npm run prisma:generate
npx prisma migrate dev
```

For Neon, use the pooled connection string and keep `sslmode=require` in `DATABASE_URL`.

### 4. Configure the frontend

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 5. Start the applications

Use two terminals:

```bash
# Terminal 1
cd backend
npm run dev
```

```bash
# Terminal 2
cd frontend
npm run dev
```

Open <http://localhost:3000>. The API health check is <http://localhost:4000/health>.

If `SES_FROM_EMAIL` is empty, the rest of the application still works and the API logs that notifications were skipped. To test SES locally, I first verify both the sender and recipient addresses in SES.

## Environment variables

### Frontend

| Variable | Required | Description | Example |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Yes | Public base URL of the Express API | `http://localhost:4000` |

### Backend

Create `backend/.env` from [backend/.env.example](backend/.env.example):

| Variable | Required | Description | Example |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://.../civicert?sslmode=require` |
| `JWT_SECRET` | Yes | Random secret, at least 32 characters | `a-long-random-secret` |
| `FRONTEND_URL` | Yes | Exact browser origin allowed by CORS | `http://localhost:3000` |
| `PORT` | No | API listening port | `4000` |
| `AWS_REGION` | Yes for S3 | AWS region used by S3 and SES | `ap-south-1` |
| `AWS_ACCESS_KEY_ID` | Yes outside AWS | IAM access key for the API | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | Yes outside AWS | IAM secret for the API | `...` |
| `S3_BUCKET_NAME` | Yes for uploads/PDFs | Private S3 bucket name | `civicert-documents-example` |
| `SES_FROM_EMAIL` | No, required for email | Verified SES sender address | `noreply@example.com` |

In production, prefer an IAM role or platform secret store over long-lived access keys. `SES_FROM_EMAIL` may be empty when email is intentionally disabled.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | Create an account |
| `POST` | `/api/auth/login` | Start an authenticated session |
| `POST` | `/api/auth/logout` | Clear the session cookie |
| `GET` | `/api/applications` | List the current user's applications |
| `POST` | `/api/applications` | Create an application |
| `PATCH` | `/api/applications/:id` | Update editable application details |
| `POST` | `/api/applications/:id/documents/presign` | Create an S3 upload URL |
| `POST` | `/api/applications/:id/documents` | Verify and record an upload |
| `POST` | `/api/applications/:id/submit` | Submit the application and notify the user |
| `POST` | `/api/applications/:id/certificate` | Generate/download the receipt and notify the user |
| `GET` | `/health` | Check API availability |

All application routes require authentication and scope records to the logged-in user. Request bodies are validated with Zod and errors use a consistent `{ error: { message, code } }` shape.

## Deployment

For deployment, I use Vercel for the frontend, Render for the backend, Neon for PostgreSQL, and AWS for S3 and SES.

### Backend on Render

- Root directory: `backend`
- Build command:

```bash
npm ci --include=dev && npx prisma generate && npx prisma migrate deploy && npm run build
```

- Start command: `npm start`
- Add all backend environment variables before the first deployment.

### Frontend on Vercel

- Root directory: `frontend`
- Set `NEXT_PUBLIC_API_URL` to the deployed backend URL.
- Set the backend `FRONTEND_URL` to the exact Vercel origin.
- Update the S3 CORS rule to allow the production frontend origin.

See [docs/aws-setup.md](docs/aws-setup.md) for the private S3 policy, SES verification, CORS, and deployment checklist.

## Verification

```bash
cd backend
npm run lint
npm run build
```

My manual smoke test is: sign up, create an application, upload both PDFs, submit it, download the generated receipt, and confirm both SES messages when email is configured.

## Design write-up

The design rationale, schema decisions, future improvements, and time-box trade-offs are documented in [docs/technical-writeup.md](docs/technical-writeup.md).
