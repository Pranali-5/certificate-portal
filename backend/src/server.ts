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
import { PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
app.post("/api/applications/:id/certificate", auth, asyncRoute(async (req: AuthedRequest, res) => {
  const application = await prisma.application.findFirst({ where: { id: req.params.id as string, userId: req.userId } });
  if (!application) throw new ApiError(404, "Application not found", "NOT_FOUND");
  const pdf = await PDFDocument.create(); const page = pdf.addPage([595, 842]); const font = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText("CIVICERT", { x: 54, y: 770, size: 24, font: bold, color: rgb(0.05, 0.35, 0.29) }); page.drawText("PROVISIONAL CERTIFICATE ACKNOWLEDGMENT", { x: 54, y: 725, size: 12, font: bold, color: rgb(0.92, 0.4, 0.24) });
  page.drawText(`Reference: ${application.refNumber}`, { x: 54, y: 670, size: 12, font: bold }); page.drawText(`Applicant: ${application.fullName}`, { x: 54, y: 635, size: 12, font }); page.drawText(`Registration: ${application.regNumber}`, { x: 54, y: 605, size: 12, font }); page.drawText(`Submitted: ${application.createdAt.toISOString()}`, { x: 54, y: 575, size: 12, font }); page.drawText("This document acknowledges receipt of the application details above.", { x: 54, y: 500, size: 11, font });
  const key = `certificates/${application.id}.pdf`; await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(await pdf.save()), ContentType: "application/pdf" })); await prisma.application.update({ where: { id: application.id }, data: { certificateKey: key, status: "COMPLETED" } }); res.json({ url: await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 300 }) });
}));

app.use((_req, _res, next) => next(new ApiError(404, "Route not found", "NOT_FOUND")));
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  const isValidation = error instanceof z.ZodError;
  const status = error instanceof ApiError ? error.status : isValidation ? 400 : 500;
  res.status(status).json({ error: { message: isValidation ? "Please check the highlighted fields" : error.message, code: error instanceof ApiError ? error.code : isValidation ? "VALIDATION_ERROR" : "INTERNAL_ERROR", fields: isValidation ? error.issues.reduce<Record<string, string>>((fields, issue) => { const field = issue.path[0]; if (typeof field === "string" && !fields[field]) fields[field] = issue.message; return fields; }, {}) : undefined } });
});
app.listen(port, () => console.log(`Civicert API listening on http://localhost:${port}`));
