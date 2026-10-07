import postgres from 'postgres';
import { readFileSync } from 'node:fs';
const url = process.env.DATABASE_URL;
if (!url) { console.error('Set DATABASE_URL'); process.exit(1); }
const local = /localhost|127\.0\.0\.1|host=\/tmp/.test(url);
const sql = postgres(url, { ssl: local ? false : 'require' });
const src = readFileSync(new URL('../lib/schema.ts', import.meta.url), 'utf8');
await sql.unsafe(src.slice(src.indexOf('`') + 1, src.lastIndexOf('`')));
console.log('Schema is up to date.');
await sql.end();
