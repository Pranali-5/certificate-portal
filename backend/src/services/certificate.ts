import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';

export async function createCertificatePdf(
  application: {
    id: string;
    refNumber: string;
    fullName: string;
    regNumber: string;
    submittedAt: Date | null;
    createdAt: Date;
  },
  s3: S3Client,
  bucket: string,
) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText('CIVICERT', { x: 54, y: 770, size: 24, font: bold, color: rgb(0.05, 0.35, 0.29) });
  page.drawText('PROVISIONAL CERTIFICATE ACKNOWLEDGMENT', {
    x: 54,
    y: 725,
    size: 12,
    font: bold,
    color: rgb(0.92, 0.4, 0.24),
  });
  const receiptTimestamp = application.submittedAt ?? application.createdAt;
  const formattedTimestamp = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'long',
    timeStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(receiptTimestamp);
  page.drawText(`Reference: ${application.refNumber}`, { x: 54, y: 670, size: 12, font: bold });
  page.drawText(`Applicant: ${application.fullName}`, { x: 54, y: 635, size: 12, font });
  page.drawText(`Registration: ${application.regNumber}`, { x: 54, y: 605, size: 12, font });
  page.drawText(`Submitted (IST): ${formattedTimestamp}`, { x: 54, y: 575, size: 12, font });
  page.drawText('This document acknowledges receipt of the application details above.', {
    x: 54,
    y: 500,
    size: 11,
    font,
  });
  const key = `certificates/${application.id}-ist.pdf`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(await pdf.save()),
      ContentType: 'application/pdf',
    }),
  );
  return key;
}
