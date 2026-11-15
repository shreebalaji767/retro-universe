import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
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
// Ensure every catalog cartridge remains reachable; Classics has 10 entries.
for (const [file,minimum] of [['arcade.html',6],['puzzles.html',6],['classics.html',10]]) {
  const source=fs.readFileSync(path.join(root,file),'utf8');
  const count=[...source.matchAll(/class=["']portal-game["'][^>]*href=/g)].length;
  if(count<minimum)failures.push(file+': expected at least '+minimum+' game cards, found '+count);
}
const portalCss=fs.readFileSync(path.join(root,'style.css'),'utf8');
for(const pattern of [/\.catalog-main\{[^}]*overflow-y:auto/s,/\.portal-game-grid\{[^}]*grid-template-rows:none/s,/prefers-reduced-motion:reduce/]) {
  if(!pattern.test(portalCss))failures.push('style.css: missing responsive/accessibility rule '+pattern);
}
// Verify the chess engine against known move counts and special-rule positions.
try {
  const chessContext={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'js/chess-engine.js'),'utf8'),chessContext);
  const chess=chessContext.window.RetroChess;
  const start=chess.fromFEN();
  for(const [depth,expected] of [[1,20],[2,400],[3,8902]]) {
    const actual=chess.perft(start,depth);
    if(actual!==expected)failures.push('Chess starting-position perft depth '+depth+': expected '+expected+', got '+actual);
  }
  const castle=chess.fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const kingMoves=chess.legalMoves(castle).filter(m=>m.from.r===7&&m.from.c===4);
  if(!kingMoves.some(m=>m.castle==='K')||!kingMoves.some(m=>m.castle==='Q'))failures.push('Chess castling availability failed');
  const ep=chess.fromFEN('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
  const epMove=chess.legalMoves(ep).find(m=>m.enPassant);
  if(!epMove)failures.push('Chess en passant generation failed');
  else if(chess.apply(ep,epMove).board[3][3]!==null)failures.push('Chess en passant did not remove the captured pawn');
  const promo=chess.fromFEN('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  if(chess.legalMoves(promo).filter(m=>m.promotion).length!==4)failures.push('Chess promotion should offer four piece choices');
  const mate=chess.fromFEN('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1');
  if(!chess.status(mate).checkmate)failures.push('Chess checkmate detection failed');
  const stale=chess.fromFEN('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  if(!chess.status(stale).stalemate)failures.push('Chess stalemate detection failed');
} catch(error) { failures.push('Chess engine tests failed: '+error.message); }
const checkedLinks = new Set();
function checkTarget(fromFile, raw, label) {
  const value = raw.trim();
  if (!value || value.startsWith('#') || /^(?:https?:|mailto:|tel:|data:|javascript:|blob:)/i.test(value)) return;
  let pathname;
  try { pathname = decodeURIComponent(value.split(/[?#]/, 1)[0]); }
  catch { failures.push(`${path.relative(root, fromFile)}: invalid ${label} "${value}"`); return; }
  const target = pathname.startsWith('/')
    ? path.resolve(root, pathname.slice(1))
    : path.resolve(path.dirname(fromFile), pathname);
  if (!target.startsWith(root + path.sep) && target !== root) {
    failures.push(`${path.relative(root, fromFile)}: ${label} escapes repository: "${value}"`);
    return;
  }
  const fragmentKey = value.split('#')[1]?.split('?')[0] || '';
  const key = `${fromFile} -> ${target}#${fragmentKey}`;
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
// Exercise the shared computer opponent's tactical logic without a browser or external service.
try {
  const aiContext = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/game.js'), 'utf8'), aiContext);
  const ai = aiContext.window.RetroGame;
  const winMove = ai.chooseTicTacToeMove(['X','X','','O','O','','','',''], 'O', 'X', 'hard');
  if (winMove !== 5) failures.push(`Tic-Tac-Toe hard AI missed immediate winning move (got ${winMove})`);
  const blockMove = ai.chooseTicTacToeMove(['X','X','','O','','','','',''], 'O', 'X', 'hard');
  if (blockMove !== 2) failures.push(`Tic-Tac-Toe hard AI failed to block immediate loss (got ${blockMove})`);
  const draw = ai.winner(['X','O','X','X','O','O','O','X','X']);
  if (draw !== 'draw') failures.push(`Tic-Tac-Toe winner detection failed draw case (got ${draw})`);
} catch (error) {
  failures.push(`Tic-Tac-Toe AI logic test failed: ${error.message}`);
}
// Guard the locally persisted portal/profile/game-upgrade surfaces against regressions.
for (const [file,patterns] of [
  ['js/portal-enhancements.js',[/catalog-search/,/retro-favorites/,/retro-recent/]],
  ['js/phase5.js',[/retro-daily-complete/,/retro-tournament/,/retro-settings/]],
  ['games/racer.html',[/racer-ghost/,/ghost-toggle/]],
  ['js/game-enhancements.js',[/AudioContext/,/dataset\.effects/,/difficulty/]]
]) {
  const source=fs.readFileSync(path.join(root,file),'utf8');
  for(const pattern of patterns)if(!pattern.test(source))failures.push(`${file}: missing expected feature marker ${pattern}`);
}
// Keep the checkers computer player tactical: evaluate capture chains and avoid unsafe landings.
{
  const source=fs.readFileSync(path.join(root,'games/checkers.html'),'utf8');
  for(const marker of ['function maxCaptureChain(','function bestComputerCapture(','function threatened(']) {
    if(!source.includes(marker))failures.push('Checkers: missing tactical computer-play rule '+marker);
  }
}
if (failures.length) {
  console.error(`Smoke tests failed (${failures.length} issue(s)):\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`Smoke tests passed: ${htmlFiles.length} HTML pages, ${jsFiles.length} JavaScript files, ${checkedLinks.size} internal references, plus Tic-Tac-Toe AI tactical checks.`);
}
