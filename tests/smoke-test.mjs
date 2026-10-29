import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const htmlFiles = [];
const jsFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile()) {
      if (entry.name.endsWith('.html')) htmlFiles.push(full);
      if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) jsFiles.push(full);
    }
  }
}
walk(root);
const failures = [];
const checkedLinks = new Set();
function checkTarget(fromFile, raw, label) {
  const value = raw.trim();
  if (!value || value.startsWith('#') || /^(?:https?:|mailto:|tel:|data:|javascript:|blob:)/i.test(value)) return;
  let pathname;
  try { pathname = decodeURIComponent(new URL(value, 'https://local.test/').pathname); }
  catch { failures.push(`${path.relative(root, fromFile)}: invalid ${label} "${value}"`); return; }
  const relative = pathname.replace(/^\/+/, '');
  const target = path.resolve(path.dirname(fromFile), relative);
  if (!target.startsWith(root + path.sep) && target !== root) {
    failures.push(`${path.relative(root, fromFile)}: ${label} escapes repository: "${value}"`);
    return;
  }
  const key = `${fromFile} -> ${target}`;
  if (checkedLinks.has(key)) return;
  checkedLinks.add(key);
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    failures.push(`${path.relative(root, fromFile)}: missing ${label} "${value}"`);
  }
}
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi)) {
    checkTarget(file, match[2].replace(/&amp;/g, '&'), 'asset/link');
  }
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\bsrc\s*=/.test(match[1]) || !match[2].trim()) continue;
    const temp = path.join(os.tmpdir(), `retro-inline-${process.pid}-${Math.random().toString(36).slice(2)}.js`);
    fs.writeFileSync(temp, match[2]);
    const result = spawnSync(process.execPath, ['--check', temp], { encoding: 'utf8' });
    fs.rmSync(temp, { force: true });
    if (result.status !== 0) failures.push(`${path.relative(root, file)}: inline JavaScript syntax error\n${result.stderr || result.stdout}`);
  }
}
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) failures.push(`${path.relative(root, file)}: JavaScript syntax error\n${result.stderr || result.stdout}`);
}
if (failures.length) {
  console.error(`Smoke tests failed (${failures.length} issue(s)):\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`Smoke tests passed: ${htmlFiles.length} HTML pages, ${jsFiles.length} JavaScript files, ${checkedLinks.size} internal references.`);
}
