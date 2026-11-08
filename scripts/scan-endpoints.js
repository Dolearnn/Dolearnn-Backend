/*
 * Calls every GET endpoint the code defines and reports any that fail.
 * Routes are read from the source, so new endpoints are included automatically.
 *
 *   node scripts/scan-endpoints.js                       # local, not signed in
 *   API=https://your-api/api node scripts/scan-endpoints.js
 *   API=... EMAIL=you@x.com PASSWORD=... node scripts/scan-endpoints.js   # signed in
 *
 * Read-only: it only sends GET requests, plus the one login.
 */
const fs = require('fs');
const path = require('path');

const API = (process.env.API || 'http://localhost:4000/api').replace(/\/$/, '');
const SRC = path.join(__dirname, '..', 'src');

function collect(file, prefix, found) {
  const source = fs.readFileSync(file, 'utf8');
  const imports = new Map();
  for (const m of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*'(\.[^']+)'/g)) {
    for (const name of m[1].split(',').map((part) => part.trim()).filter(Boolean)) {
      imports.set(name, path.resolve(path.dirname(file), `${m[2]}.ts`));
    }
  }
  for (const m of source.matchAll(/\w+\.use\(\s*'([^']+)'\s*,\s*(\w+)\s*\)/g)) {
    if (imports.has(m[2]) && fs.existsSync(imports.get(m[2]))) collect(imports.get(m[2]), prefix + m[1], found);
  }
  for (const m of source.matchAll(/\w+[Rr]outes\.get\(\s*'([^']+)'/g)) {
    found.add((prefix + m[1]).replace(/\/$/, '') || '/');
  }
}

// Learner, teacher and admin areas: being refused your own area is a failure.
const AREAS = {
  STUDENT: ['/student', '/family', '/quiz', '/arena', '/daily', '/notifications'],
  PARENT: ['/student', '/family', '/quiz', '/arena', '/daily', '/notifications'],
  TEACHER: ['/teacher', '/notifications'],
  ADMIN: ['/admin', '/notifications', '/question-reports', '/daily/admin'],
};
const QUERY = { '/admin/payments/payouts': `?month=${new Date().toISOString().slice(0, 7)}` };

async function main() {
  const found = new Set();
  collect(path.join(SRC, 'routes', 'index.ts'), '', found);
  const routes = [...found].sort();
  const needsId = routes.filter((route) => route.includes(':'));
  const callable = routes.filter((route) => !route.includes(':'));

  let headers = {};
  let role = null;
  if (process.env.EMAIL) {
    const response = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.EMAIL, password: process.env.PASSWORD }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Login failed (${response.status}): ${body.message ?? ''}`);
    headers = { Authorization: `Bearer ${body.token}` };
    role = body.user.role;
  }
  console.log(`${API}  |  ${role ? `signed in as ${role}` : 'not signed in'}  |  ${callable.length} endpoints\n`);

  const areas = role ? AREAS[role] ?? [] : [];
  const mine = (route) =>
    (role === 'ADMIN' || !route.startsWith('/daily/admin')) &&
    areas.some((area) => route === area || route.startsWith(`${area}/`));
  let failures = 0;
  for (const route of callable) {
    const started = Date.now();
    let status;
    let detail = '';
    try {
      const response = await fetch(API + route + (QUERY[route] ?? ''), { headers, signal: AbortSignal.timeout(60_000) });
      status = response.status;
      if (!response.ok) detail = (await response.text()).slice(0, 90);
    } catch (error) {
      status = 'NETWORK';
      detail = error.message;
    }
    const refused = status === 401 || status === 403;
    const failed = status === 'NETWORK' || status >= 500 || status === 404 || (refused && role && mine(route));
    if (failed) failures += 1;
    const expectedRefusal = refused && !failed;
    if (failed || !expectedRefusal) {
      console.log(`${failed ? 'FAIL' : status === 400 ? 'INPUT' : ' ok '}  ${String(status).padEnd(4)} ${String(Date.now() - started).padStart(6)}ms  ${route}${failed || status === 400 ? `  ${detail}` : ''}`);
    }
  }
  const refusedNote = role ? '' : ' (areas needing a login were refused, as they should be)';
  console.log(`\n${failures === 0 ? 'All good' : `${failures} FAILED`}: ${callable.length} checked${refusedNote}; ${needsId.length} need a specific id and were skipped.`);
  process.exitCode = failures ? 1 : 0;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
