import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  statusCode: number;
  // A stable name the frontend can act on, e.g. "PLAN_LIMIT".
  code?: string;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
