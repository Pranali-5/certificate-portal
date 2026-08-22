import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DeleteObjectCommand, PutObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = express();
const prisma = new PrismaClient();
const s3 = new S3Client({ region: process.env.AWS_REGION });
const port = Number(process.env.PORT ?? 4000);
const bucket = process.env.S3_BUCKET_NAME ?? "";
const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 32) {
  throw new Error("JWT_SECRET must be set and contain at least 32 characters");
}

type AuthedRequest = Request & { userId?: string };
class ApiError extends Error { constructor(public status: number, message: string, public code = "API_ERROR") { super(message); } }
const asyncRoute = (handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => handler(req, res, next).catch(next);
const tokenFor = (userId: string) => jwt.sign({ sub: userId }, secret, { expiresIn: "7d" });
const refFor = () => `PC-${new Date().getFullYear()}-${randomBytes(4).toString("base64url").slice(0, 6).toUpperCase()}`;

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.get("/health", (_req, res) => res.json({ ok: true, service: "civicert-api" }));

const auth = (req: AuthedRequest, _res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.civicert_token;
    if (!token) throw new ApiError(401, "Authentication required", "UNAUTHORIZED");
    const payload = jwt.verify(token, secret) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch (error) { next(error instanceof ApiError ? error : new ApiError(401, "Invalid session", "UNAUTHORIZED")); }
};

const authSchema = z.object({ email: z.string().trim().email("Enter a valid email address").transform((value) => value.toLowerCase()), password: z.string().min(8, "Password must be at least 8 characters").max(128) });
const signupSchema = authSchema.extend({ name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name must be 80 characters or fewer") });
app.post("/api/auth/signup", asyncRoute(async (req, res) => {
  const input = signupSchema.parse(req.body);
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new ApiError(409, "An account with this email already exists", "EMAIL_EXISTS");
  const user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash: await bcrypt.hash(input.password, 12) } });
  res.cookie("civicert_token", tokenFor(user.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 604800000 });
  res.status(201).json({ user: { id: user.id, name: user.name, email: user.email } });
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const input = authSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw new ApiError(401, "Email or password is incorrect", "INVALID_CREDENTIALS");
  res.cookie("civicert_token", tokenFor(user.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 604800000 });
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
}));

app.get("/api/auth/me", auth, asyncRoute(async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, name: true, email: true } });
  if (!user) throw new ApiError(401, "Your account could not be found", "UNAUTHORIZED");
  res.json({ user });
}));

app.post("/api/auth/logout", (_req, res) => { res.clearCookie("civicert_token"); res.status(204).send(); });
app.get("/api/applications", auth, asyncRoute(async (req: AuthedRequest, res) => { res.json(await prisma.application.findMany({ where: { userId: req.userId }, include: { documents: true }, orderBy: { createdAt: "desc" } })); }));

const applicationSchema = z.object({ fullName: z.string().trim().min(2).max(100), dob: z.coerce.date(), regNumber: z.string().trim().min(2).max(40), address: z.string().trim().min(10).max(300) });
app.post("/api/applications", auth, asyncRoute(async (req: AuthedRequest, res) => { const input = applicationSchema.parse(req.body); const application = await prisma.application.create({ data: { ...input, refNumber: refFor(), userId: req.userId! } }); res.status(201).json(application); }));

app.delete("/api/applications/:id", auth, asyncRoute(async (req: AuthedRequest, res) => {
  const application = await prisma.application.findFirst({ where: { userId: req.userId, OR: [{ id: req.params.id as string }, { refNumber: req.params.id as string }] }, include: { documents: true } });
  if (!application) throw new ApiError(404, "Application not found", "NOT_FOUND");
  if (bucket) {
    const keys = application.documents.map((document) => document.s3Key);
    if (application.certificateKey) keys.push(application.certificateKey);
    await Promise.all(keys.map((key) => s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))));
  }
  await prisma.application.delete({ where: { id: application.id } });
  res.status(204).send();
}));

app.patch("/api/applications/:id", auth, asyncRoute(async (req: AuthedRequest, res) => {
  const input = applicationSchema.partial().parse(req.body);
  const application = await prisma.application.findFirst({ where: { userId: req.userId, OR: [{ id: req.params.id as string }, { refNumber: req.params.id as string }] } });
  if (!application) throw new ApiError(404, "Application not found", "NOT_FOUND");
  if (application.status === "COMPLETED") throw new ApiError(409, "Submitted applications cannot be edited", "APPLICATION_LOCKED");
  res.json(await prisma.application.update({ where: { id: application.id }, data: input }));
}));

const documentSchema = z.object({ type: z.enum(["ID_PROOF", "DEGREE_CERTIFICATE"]), originalName: z.string().trim().min(1).max(160), sizeBytes: z.number().int().positive().max(5 * 1024 * 1024), contentType: z.literal("application/pdf") });
const documentConfirmSchema = documentSchema.extend({ s3Key: z.string().min(1) });
const applicationForUser = async (id: string, userId?: string) => {
  const application = await prisma.application.findFirst({ where: { id, userId } });
  if (!application) throw new ApiError(404, "Application not found", "NOT_FOUND");
  if (application.status === "COMPLETED") throw new ApiError(409, "Submitted applications cannot be edited", "APPLICATION_LOCKED");
  return application;
};

app.post("/api/applications/:id/documents/presign", auth, asyncRoute(async (req: AuthedRequest, res) => {
  const input = documentSchema.parse(req.body);
  const application = await applicationForUser(req.params.id as string, req.userId);
  if (!bucket) throw new ApiError(503, "File storage is not configured", "STORAGE_NOT_CONFIGURED");
  const key = `users/${req.userId}/applications/${application.id}/${input.type}/${randomUUID()}.pdf`;
  const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: "application/pdf" }), { expiresIn: 300 });
  res.json({ uploadUrl: url, s3Key: key });
}));

app.post("/api/applications/:id/documents", auth, asyncRoute(async (req: AuthedRequest, res) => {
  const input = documentConfirmSchema.parse(req.body);
  const application = await applicationForUser(req.params.id as string, req.userId);
  if (!input.s3Key.startsWith(`users/${req.userId}/applications/${application.id}/`)) throw new ApiError(400, "Invalid document location", "INVALID_DOCUMENT_KEY");
  if (!bucket) throw new ApiError(503, "File storage is not configured", "STORAGE_NOT_CONFIGURED");
  try {
    const object = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: input.s3Key }));
    if (object.ContentType !== "application/pdf" || !object.ContentLength || object.ContentLength > 5 * 1024 * 1024) throw new ApiError(400, "Only PDF files up to 5MB are accepted", "INVALID_FILE");
    const document = await prisma.document.upsert({ where: { applicationId_type: { applicationId: application.id, type: input.type } }, create: { applicationId: application.id, type: input.type, s3Key: input.s3Key, originalName: input.originalName, sizeBytes: object.ContentLength }, update: { s3Key: input.s3Key, originalName: input.originalName, sizeBytes: object.ContentLength } });
    res.status(201).json(document);
  } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(400, "The uploaded file could not be verified", "UPLOAD_NOT_FOUND"); }
}));

app.get("/api/applications/:id/documents/:type/download", auth, asyncRoute(async (req: AuthedRequest, res) => {
  const type = z.enum(["ID_PROOF", "DEGREE_CERTIFICATE"]).parse(req.params.type);
  const application = await prisma.application.findFirst({ where: { userId: req.userId, OR: [{ id: req.params.id as string }, { refNumber: req.params.id as string }] } });
  if (!application) throw new ApiError(404, "Application not found", "NOT_FOUND");
  if (!bucket) throw new ApiError(503, "File storage is not configured", "STORAGE_NOT_CONFIGURED");
  const document = await prisma.document.findUnique({ where: { applicationId_type: { applicationId: application.id, type } } });
  if (!document) throw new ApiError(404, "Document not found", "DOCUMENT_NOT_FOUND");
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: document.s3Key, ResponseContentDisposition: `attachment; filename="${document.originalName.replace(/"/g, "")}"` }), { expiresIn: 300 });
  res.json({ url, document: { type: document.type, originalName: document.originalName } });
}));

app.post("/api/applications/:id/submit", auth, asyncRoute(async (req: AuthedRequest, res) => {
  const application = await prisma.application.findFirst({ where: { id: req.params.id as string, userId: req.userId }, include: { documents: true } });
  if (!application) throw new ApiError(404, "Application not found", "NOT_FOUND");
  if (!application.documents.some((document) => document.type === "ID_PROOF") || !application.documents.some((document) => document.type === "DEGREE_CERTIFICATE")) throw new ApiError(400, "Upload both ID proof and degree certificate before submitting", "DOCUMENTS_REQUIRED");
  if (application.status === "COMPLETED" && application.certificateKey) { res.json({ application, message: "Application already submitted" }); return; }
  res.json({ application: await prisma.application.update({ where: { id: application.id }, data: { status: "SUBMITTED", submittedAt: new Date() } }) });
}));
app.post("/api/applications/:id/certificate", auth, asyncRoute(async (req: AuthedRequest, res) => {
  const application = await prisma.application.findFirst({ where: { userId: req.userId, OR: [{ id: req.params.id as string }, { refNumber: req.params.id as string }] } });
  if (!application) throw new ApiError(404, "Application not found", "NOT_FOUND");
  if (application.certificateKey?.endsWith("-ist.pdf") && bucket) {
    res.json({ url: await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: application.certificateKey }), { expiresIn: 300 }) });
    return;
  }
  if (!bucket) throw new ApiError(503, "File storage is not configured", "STORAGE_NOT_CONFIGURED");
  const pdf = await PDFDocument.create(); const page = pdf.addPage([595, 842]); const font = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText("CIVICERT", { x: 54, y: 770, size: 24, font: bold, color: rgb(0.05, 0.35, 0.29) }); page.drawText("PROVISIONAL CERTIFICATE ACKNOWLEDGMENT", { x: 54, y: 725, size: 12, font: bold, color: rgb(0.92, 0.4, 0.24) });
  const receiptTimestamp = application.submittedAt ?? application.createdAt;
  const formattedTimestamp = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "medium", timeZone: "Asia/Kolkata" }).format(receiptTimestamp);
  page.drawText(`Reference: ${application.refNumber}`, { x: 54, y: 670, size: 12, font: bold }); page.drawText(`Applicant: ${application.fullName}`, { x: 54, y: 635, size: 12, font }); page.drawText(`Registration: ${application.regNumber}`, { x: 54, y: 605, size: 12, font }); page.drawText(`Submitted (IST): ${formattedTimestamp}`, { x: 54, y: 575, size: 12, font }); page.drawText("This document acknowledges receipt of the application details above.", { x: 54, y: 500, size: 11, font });
  const key = `certificates/${application.id}-ist.pdf`; await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(await pdf.save()), ContentType: "application/pdf" })); await prisma.application.update({ where: { id: application.id }, data: { certificateKey: key, status: "COMPLETED" } }); res.json({ url: await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 300 }) });
}));

app.use((_req, _res, next) => next(new ApiError(404, "Route not found", "NOT_FOUND")));
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  const isValidation = error instanceof z.ZodError;
  const status = error instanceof ApiError ? error.status : isValidation ? 400 : 500;
  res.status(status).json({ error: { message: isValidation ? "Please check the highlighted fields" : error.message, code: error instanceof ApiError ? error.code : isValidation ? "VALIDATION_ERROR" : "INTERNAL_ERROR", fields: isValidation ? error.issues.reduce<Record<string, string>>((fields, issue) => { const field = issue.path[0]; if (typeof field === "string" && !fields[field]) fields[field] = issue.message; return fields; }, {}) : undefined } });
});
app.listen(port, () => console.log(`Civicert API listening on http://localhost:${port}`));
