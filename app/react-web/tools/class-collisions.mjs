import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards against CSS class-name collisions between feature stylesheets.
 */
const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.scss') ? [full] : [];
  });

const owners = new Map();

for (const file of walk('src')) {
  for (const match of readFileSync(file, 'utf8').matchAll(/^\.([a-z0-9_-]+)(?:[^{]*)\{/gim)) {
    const name = match[1];
    if (!owners.has(name)) owners.set(name, new Set());
    owners.get(name).add(file.replace(/\\/g, '/'));
  }
}

const collisions = [...owners.entries()].filter(([, files]) => files.size > 1);

if (collisions.length === 0) {
  console.log('No cross-file class collisions.');
} else {
  console.error('Class-name collisions between stylesheets:');
  for (const [name, files] of collisions) {
    console.error(`  .${name}: ${[...files].join(', ')}`);
  }
  console.error('\nScope the rule under its page root class, or rename it.');
  process.exitCode = 1;
}
