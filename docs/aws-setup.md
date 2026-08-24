# Database and AWS setup

## A. PostgreSQL with Neon

1. Create an account at https://neon.tech and select **New project**.
2. Name the project `civicert`, choose the region closest to your API host, and create it.
3. In **Connection Details**, copy the pooled connection string. It must include `sslmode=require`.
4. In `backend/.env`, set `DATABASE_URL` to that value.
5. Run `cd backend && npx prisma generate && npx prisma migrate dev --name init`.
6. Verify the tables in Neon SQL Editor with `select * from "User";`.

## B. S3 private document bucket

1. Open AWS S3, choose **Create bucket**, use a globally unique name such as `civicert-documents-yourname`, and choose the same region as the API.
2. Leave **Block all public access** enabled. Do not enable static website hosting or public ACLs.
3. Under **Permissions > CORS**, paste this exact local-development rule:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["http://localhost:3000"],
    "ExposeHeaders": ["ETag"]
  }
]
```

The origin must match the browser URL exactly. `http://localhost:3000` and
`http://127.0.0.1:3000` are different origins. For production, replace the
rule with the deployed frontend origin, for example:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["https://YOUR-VERCEL-DOMAIN.vercel.app"],
    "ExposeHeaders": ["ETag"]
  }
]
```

Do not test the bucket root URL directly. The frontend must use the complete
presigned object URL returned by `/api/applications/:id/documents/presign`.
The URL should contain an object key and query parameters such as
`X-Amz-Signature`.

4. Create an IAM policy named `CivicertS3ObjectAccess` scoped to this bucket's object path only:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

5. Create an IAM user named `civicert-api`, attach that policy, create an access key for **Application running outside AWS**, and copy the values once. Never commit them.
6. Add `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `S3_BUCKET_NAME` to `backend/.env`.

The API also needs the browser origin in `FRONTEND_URL`:

```env
FRONTEND_URL="http://localhost:3000"
```

Restart the backend after changing `.env`.

## C. SES email notifications

The API sends two non-blocking notifications: one after an application is submitted and one after its PDF receipt is generated. Email failures are logged and do not fail either API request.

1. Open Amazon SES in the same AWS region as the backend.
2. Under **Identities**, verify the sender email address you will use.
3. While SES is in sandbox, verify every recipient email address too. Sandbox accounts cannot send to unverified recipients.
4. Add this IAM policy to the API user or role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    }
  ]
}
```

5. Add `SES_FROM_EMAIL="verified-sender@example.com"` to `backend/.env` and restart the API.
6. Submit a test application and confirm both messages in the recipient inbox. Check backend logs if SES skips or rejects a message.
7. Request **production access** in SES before sending to arbitrary real users. Verify a domain for a production sender and configure SPF/DKIM as SES recommends.

SES email is disabled when `SES_FROM_EMAIL` is empty, which is useful for local development. The sender address must be verified even after production access is granted.

### Does AWS charge for SES?

Yes, SES is usage-based rather than a flat monthly service fee. AWS pricing can vary by region and account context, so check the [Amazon SES pricing page](https://aws.amazon.com/ses/pricing/) before launch. In general, email sent through SES is charged per 1,000 messages, with possible free allowances tied to the way SES is used and the AWS Free Tier. Attachments, dedicated IPs, and other optional features can add cost. S3, database hosting, and outbound data transfer are separate charges.

For this portal's two small plain-text/HTML messages per application, SES cost is typically very low at small volume, but set an AWS Budget alert and monitor SES sending metrics.

## D. Local environment checklist

```bash
cd backend
cp .env.example .env
# fill every value before starting the API
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run dev
```

## E. Deployment order

1. Deploy the backend to Render with root directory `backend`.
2. Add all backend environment variables to Render before the first deployment, especially `DATABASE_URL`.
3. On the free plan, use this **Build Command** so Prisma migrates during deployment:

```bash
npm ci --include=dev && npx prisma generate && npx prisma migrate deploy && npm run build
```

Use `npm start` as the **Start Command**. Do not use `prisma migrate dev` in production. 4. Deploy the backend and confirm `/health` returns `{ "ok": true }`. 5. Deploy `frontend` to Vercel with root directory `frontend`. 6. Set `NEXT_PUBLIC_API_URL` to the deployed backend URL, then redeploy frontend. 7. Replace the production frontend origin in the S3 CORS rule and backend `FRONTEND_URL`. 8. Test signup, protected application list, PDF generation, and a presigned download in production.
