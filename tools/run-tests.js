// npm test: runs every tests/*.test.js with node --test. A folder name alone ("node --test tests/") works on
// Node 18 and 20 but not on Node 22+, and a shell glob doesn't expand on Windows, so the files are listed here.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../tests/', import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort().map((f) => dir + f);
const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(r.status ?? 1);
