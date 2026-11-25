import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
      };
      // The unparsed JSON body (set in app.ts), for webhook signatures.
      rawBody?: Buffer;
    } 
  }
}

export {};
