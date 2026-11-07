import type { NextFunction, Request, Response } from 'express';

/*
 * Logs every API request slower than SLOW_REQUEST_MS, so slow endpoints show up
 * in the hosting logs (e.g. Render) with their real timings. Also sends a
 * Server-Timing header, which the browser's Network tab displays.
 * Only the method, path and status are logged: never bodies, tokens or IDs in
 * query strings.
 */
const SLOW_REQUEST_MS = Number(process.env.SLOW_REQUEST_MS ?? 800);

export function requestTiming(req: Request, res: Response, next: NextFunction) {
  const started = process.hrtime.bigint();
  const originalWriteHead = res.writeHead.bind(res);

  res.writeHead = ((...args: Parameters<Response['writeHead']>) => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    if (!res.headersSent) res.setHeader('Server-Timing', `app;dur=${ms.toFixed(1)}`);
    return originalWriteHead(...args);
  }) as Response['writeHead'];

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    if (ms >= SLOW_REQUEST_MS) {
      // req.route is set once a handler matched, giving "/attempts/:id" rather than real IDs.
      const path = `${req.baseUrl}${req.route?.path ?? req.path}`;
      console.warn(`[slow] ${req.method} ${path} -> ${res.statusCode} in ${Math.round(ms)}ms`);
    }
  });

  next();
}
