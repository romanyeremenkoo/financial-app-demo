// Cloudflare Workers reads _redirects/_headers from the uploaded asset directory.
// A `/* /index.html 200` rule there collides with the `single-page-application`
// not_found_handling configured in wrangler.jsonc and the deploy is rejected with
// "Infinite loop detected in this rule". Neither file belongs in this project, so
// strip them from the output in case a stale build directory reintroduces them.
import { rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BUILD_OUTPUT = join(PROJECT_ROOT, 'dist');
const UNSUPPORTED_ASSETS = ['_redirects', '_headers'];

await Promise.all(
  UNSUPPORTED_ASSETS.map((asset) => rm(join(BUILD_OUTPUT, asset), { force: true })),
);
