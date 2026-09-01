import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

const app = createApp();

// Open the database connection (and spin up the Prisma query engine) at boot so
// the first real request doesn't pay that cost. Also nudges a suspended
// serverless database awake while the HTTP server is still starting.
void prisma
  .$connect()
  .then(() => console.log('Database connection established'))
  .catch((error) => console.error('Initial database connection failed', error));

const server = app.listen(env.PORT, () => {
  console.log(`DoLearn API listening on http://localhost:${env.PORT}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${env.PORT} is already in use. Stop the existing process or start this server with a different PORT.`,
    );
    process.exit(1);
  }

  throw error;
});

function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down DoLearn API...`);
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
