# Civicert technical write-up

## Schema design

I chose PostgreSQL with Prisma because the core data has clear relationships and integrity rules: one user owns many applications, and one application owns its uploaded documents. Relational constraints make those relationships explicit and prevent orphaned records when an account or application is deleted.

I made the `Application` table store a snapshot of the applicant's filing details (`fullName`, `dob`, `regNumber`, and `address`) instead of relying on mutable profile data in `User`. This means a later profile change cannot silently change an existing submission. The application also owns its generated reference number, lifecycle status, submission timestamp, and private certificate S3 key. A unique constraint on `refNumber` provides a final database-level guard against duplicate references, while an index on `(userId, createdAt)` supports the dashboard query.

I kept `Document` as a separate table because documents have their own metadata and lifecycle. Each record stores its S3 object key, original filename, byte size, type, and upload timestamp. The compound unique constraint on `(applicationId, type)` enforces one ID proof and one degree certificate per application. S3 stores the binary content, while PostgreSQL stores ownership and metadata. This keeps the database smaller and lets me keep the bucket private behind short-lived presigned URLs.

## What I would improve with more time

- Move email delivery to a durable queue or outbox table with retries and delivery status. SES failures are currently logged and intentionally do not block a successful application request.
- Add automated API and end-to-end tests for authentication, user isolation, document validation, submission idempotency, PDF generation, and SES failure handling.
- Add file-content validation using magic bytes and malware scanning before accepting uploaded documents.
- Replace long-lived IAM access keys with workload identity or platform-managed IAM roles wherever deployment support allows it.
- Add an administrative review workflow, audit events, notification preferences, and an email template system.
- Add rate limiting, structured logging, monitoring, alerting, and stronger session controls for production use.
- Request SES production access, verify a sending domain, and configure SPF/DKIM before real-user launch.

## Time-box trade-offs

The implementation favors a small, understandable vertical slice over a production-scale workflow. The API is kept in one server module to make the take-home behavior easy to follow, although a larger application should separate routes, services, validation schemas, and infrastructure adapters. `pdf-lib` was chosen instead of Puppeteer because it creates the single-page PDF without a browser runtime, which reduces deployment size, memory use, and cold-start risk. The trade-off is that complex layouts are less convenient than HTML/CSS templates.

The application lifecycle uses the existing `SUBMITTED` and `COMPLETED` statuses: submission records the application, and receipt generation completes it. There is no separate draft status or resumable server-side workflow beyond the editable application record. S3 direct uploads reduce API memory and bandwidth usage, but require presigned URL coordination and bucket CORS configuration. SES notifications are deliberately non-blocking so an email provider outage cannot turn a completed filing into a failed request; a retry queue would be the next production improvement.

Finally, payment, reviewer approval, multi-tenant behavior, and advanced document processing remain out of scope, consistent with the assignment's time limit.
