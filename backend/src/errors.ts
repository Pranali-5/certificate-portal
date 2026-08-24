import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'API_ERROR',
  ) {
    super(message);
  }
}

export type AuthedRequest = Request & { userId?: string };

export const asyncRoute =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    handler(req, res, next).catch(next);

export function errorHandler(error: Error, _req: Request, res: Response, _next: NextFunction) {
  const isValidation = error instanceof z.ZodError;
  const status = error instanceof ApiError ? error.status : isValidation ? 400 : 500;
  res.status(status).json({
    error: {
      message: isValidation ? 'Please check the highlighted fields' : error.message,
      code:
        error instanceof ApiError
          ? error.code
          : isValidation
            ? 'VALIDATION_ERROR'
            : 'INTERNAL_ERROR',
      fields: isValidation
        ? error.issues.reduce<Record<string, string>>((fields, issue) => {
            const field = issue.path[0];
            if (typeof field === 'string' && !fields[field]) fields[field] = issue.message;
            return fields;
          }, {})
        : undefined,
    },
  });
}
