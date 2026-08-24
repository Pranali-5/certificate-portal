import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { S3Client } from '@aws-sdk/client-s3';

export const prisma = new PrismaClient();
export const s3 = new S3Client({ region: process.env.AWS_REGION });
export const port = Number(process.env.PORT ?? 4000);
export const bucket = process.env.S3_BUCKET_NAME ?? '';
const configuredSecret = process.env.JWT_SECRET;
export const isSecureDeployment =
  process.env.NODE_ENV === 'production' ||
  process.env.FRONTEND_URL?.startsWith('https://') === true;
export const authCookieOptions = {
  httpOnly: true,
  sameSite: isSecureDeployment ? ('none' as const) : ('lax' as const),
  secure: isSecureDeployment,
  maxAge: 604800000,
};

if (!configuredSecret || configuredSecret.length < 32) {
  throw new Error('JWT_SECRET must be set and contain at least 32 characters');
}

export const secret = configuredSecret;
