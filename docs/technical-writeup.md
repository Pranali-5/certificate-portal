# Technical Writeup with Trade-offs

## Schema design

I chose PostgreSQL with Prisma because the data has clear relationships between users, applications, and documents. I store applicant details as a snapshot in `Application` so later profile changes do not affect existing submissions.

`Application` also stores the unique reference number, status, timestamps, and private S3 certificate key. `Document` stores file metadata while S3 stores the actual files. Unique constraints prevent duplicate references and duplicate document types, while indexes support dashboard queries.

## What I would improve with more time

- Add an email queue with SES retries and delivery tracking.
- Add API/E2E tests and stronger file validation/malware scanning.
- Replace long-lived IAM keys with managed roles.
- Add rate limiting, monitoring, audit logs, and admin review.
- Configure SPF/DKIM and move SES to production access.

## Time-box trade-offs

I focused on a simple, understandable implementation rather than production-scale architecture. `pdf-lib` was chosen over Puppeteer to avoid a browser runtime and reduce deployment overhead.

S3 direct uploads reduce API memory usage but require presigned URLs and CORS configuration. SES is non-blocking so email failures do not fail successful submissions; a retry queue would improve reliability.

Payment, reviewer approval, multi-tenancy, and advanced document processing are out of scope due to the assignment time limit.
