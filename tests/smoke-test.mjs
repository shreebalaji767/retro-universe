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
  if(!chess.status(chess.fromFEN('4k3/8/8/8/8/8/8/4K3 w - - 150 76')).draw75)failures.push('Chess automatic 75-move draw detection failed');
  if(!chess.status(start,3).drawRepetition||chess.status(start,2).drawRepetition)failures.push('Chess threefold draw-claim threshold failed');
  if(!chess.status(start,5).drawFivefold||chess.status(start,4).drawFivefold)failures.push('Chess automatic fivefold repetition threshold failed');
  const kiwipete=chess.fromFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
  const kiwi1=chess.perft(kiwipete,1);if(kiwi1!==48)failures.push('Chess Kiwipete legal move count failed: expected 48, got '+kiwi1+'; moves '+chess.legalMoves(kiwipete).map(m=>String.fromCharCode(97+m.from.c)+(8-m.from.r)+String.fromCharCode(97+m.to.c)+(8-m.to.r)+(m.castle||'')).join(','));
  const kiwi2=chess.perft(kiwipete,2);if(kiwi2!==2039)failures.push('Chess Kiwipete depth-2 move count failed: expected 2039, got '+kiwi2);
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
// Every head-to-head game must retain both local and computer-opponent modes.
for (const [file, markers] of [
  ['games/chess.html', ['LOCAL 2 PLAYERS', 'VS COMPUTER', 'RetroChess.bestMove', 'CLAIM DRAW', 'threefold repetition', 'function rebuildRepetitions()', 'updateClaimButton(st);return true']],
  ['games/checkers.html', ['LOCAL 2 PLAYERS', 'VS COMPUTER', 'function aiTurn()', 'function bestComputerMove(']],
  ['games/pong.html', ['LOCAL 2 PLAYERS', 'VS COMPUTER', "if(mode==='cpu')"]],
  ['games/tic-tac-toe.html', ['TWO PLAYERS', 'VS COMPUTER', 'RetroGame.chooseTicTacToeMove']]
]) {
  const source=fs.readFileSync(path.join(root,file),'utf8');
  for (const marker of markers) if (!source.includes(marker)) failures.push(file+': missing required player mode or computer opponent: '+marker);
}
// Keep the checkers computer player tactical: evaluate capture chains and avoid unsafe landings.
{
  const source=fs.readFileSync(path.join(root,'games/checkers.html'),'utf8');
  for(const marker of ['function maxCaptureChain(','function bestComputerCapture(','function threatened(']) {
    if(!source.includes(marker))failures.push('Checkers: missing tactical computer-play rule '+marker);
  }
}
// Regression guards for fixes found in the single-player gameplay audit.
for (const [file,markers] of [
  ['games/bomber-maze.html',['function inFlames(','function hitPlayer(','other.t=0','invuln=35','flames=flames.filter(f=>f.t>0);if(!over)checkEnd();']],
  ['games/frogger.html',['function move(dx,dy){if(over||paused)return;','function key(e,down){keys[e.key]=down;if(down&&',"addEventListener('blur',()=>keys={})"]],
  ['games/bomber-maze.html',["if(!document.hidden){tick++","addEventListener('blur',()=>keys={})","document.addEventListener('visibilitychange',()=>{if(document.hidden)keys={}})"]],
  ['games/simon.html',['function cancelTimers()','generation++','input.push(i);if(input.length===seq.length){locked=true;later(next,550)}','if(locked)return'] ],
  ['games/snake.html',['return free.length?free[Math.random()*free.length|0]:null','body=eating?snake:snake.slice(0,-1)',"if(!food){run=false;cleared=true;", "cleared?'BOARD CLEARED':score?'GAME OVER':'READY PLAYER ONE'"]],
  ['games/asteroids.html',['function reset(){cancelAnimationFrame(raf);keys={};','if(!over&&!paused)raf=requestAnimationFrame(loop)','if(paused)cancelAnimationFrame(raf);else raf=requestAnimationFrame(loop)','addEventListener(\'blur\',()=>keys={})']],
  ['games/platformer.html',['function reset(){keys={};','p.x=Math.max(0,Math.min(616,p.x+p.vx));','if(document.hidden){keys={};','if(!won)statusEl.textContent=','if(won&&p.lives<=0)statusEl.textContent=']],
  ['games/pinball.html',['function newGame(){cancelAnimationFrame(raf);keys={};','x=bx+nx*40;y=by+ny*40;score+=100;locks[i]=12;']]
]) {
  const source=fs.readFileSync(path.join(root,file),'utf8');
  for(const marker of markers)if(!source.includes(marker))failures.push(file+': missing gameplay regression fix '+marker);
}
// Minesweeper flood-fill recursion must award a win only once.
{
 const source=fs.readFileSync(path.join(root,'games/minesweeper.html'),'utf8');
 if(!source.includes('if(!over&&opened.size===N*N-M){over=true;clearInterval(timer);wins++;'))failures.push('Minesweeper: recursive reveal can award multiple wins for one cleared field');
}
// 2048 must discard an interrupted swipe so it cannot affect a later gesture.
{
 const source=fs.readFileSync(path.join(root,'games/2048.html'),'utf8');
 if(!source.includes('el.onpointercancel=()=>{touch=null}'))failures.push('2048: pointer cancellation leaves a stale swipe active');
}
// Pinball must release held controls on focus loss and expose pause state accessibly.
{
 const source=fs.readFileSync(path.join(root,'games/pinball.html'),'utf8');
 for(const marker of ["addEventListener('blur',()=>keys={})","setAttribute('aria-pressed',String(paused))","setAttribute('aria-pressed','false')"])if(!source.includes(marker))failures.push('Pinball: missing input-release or pause accessibility guard '+marker);
}
// Pong must maintain one animation loop across pause, resume, and restart.
{
 const source=fs.readFileSync(path.join(root,'games/pong.html'),'utf8');
 for(const marker of ["let py=190,cy=190,bx=360,by=240,vx=4,vy=2,ps=0,cs=0,keys={},running=true,paused=false,mode='local',rally=0,rafId=0","if(running&&!paused)rafId=requestAnimationFrame(loop)","cancelAnimationFrame(rafId);ps=cs=0","addEventListener('blur',()=>keys={})"])if(!source.includes(marker))failures.push('Pong: missing single-loop lifecycle guard '+marker);
}
// Solitaire: choosing a different face-up card in the already-selected column must change the selected stack, not silently reject it.
{
  const source=fs.readFileSync(path.join(root,'games/solitaire.html'),'utf8');
  if(!source.includes("if(selected.source==='column'&&selected.col===col){if(selected.index===index){selected=null;render();return}selected={source:'column',col,index,cards:p.slice(index)}"))failures.push('Solitaire: same-column card reselection is not supported');
}
// Tetris must persist the best score regardless of whether game over follows a normal spawn or a HOLD swap.
{
  const source=fs.readFileSync(path.join(root,'games/tetris.html'),'utf8');
  if(!source.includes('function finish(){run=false;over=true;'))failures.push('Tetris: missing shared game-over finalizer');
  if(!source.includes('if(hit())finish();draw()}'))failures.push('Tetris: HOLD collision bypasses best-score finalization');
  if(!source.includes("localStorage.setItem('retro-tetris-best',String(best))"))failures.push('Tetris: game-over best score is not persisted');
}
// Regression guards for input focus, timers, frame-rate fairness and restart state.
for (const [file,markers] of [
  ['games/2048.html',["e.target?.tagName","e.target?.isContentEditable"]],
  ['games/tic-tac-toe.html',['cpuTimer=null,roundId=0','const token=roundId;cpuTimer=setTimeout','roundId++;if(cpuTimer!==null){clearTimeout(cpuTimer);cpuTimer=null}']],
  ['games/breakout.html',["function reset(){cancelAnimationFrame(raf);keys={};dragging=false;","if(slowFrames===0){ball.vx*=.72;ball.vy*=.72}slowFrames=600","addEventListener('blur',()=>{keys={};dragging=false})"]],
  ['games/maze-runner.html',["hiddenAt=0,pausedMs=0","pausedMs+=Date.now()-hiddenAt","function elapsedSeconds()","const elapsed=elapsedSeconds();"]],
  ['games/maze-runner.html',['function shuffleDirections(values)','let ds=shuffleDirections([[2,0],[-2,0],[0,2],[0,-2]])']],
  ['games/minesweeper.html',["hiddenAt=0,pausedMs=0","pausedMs+=Date.now()-hiddenAt","const safe=Array.from({length:N*N},(_,n)=>n).filter(n=>n!==i&&!mines.has(n))","Date.now()-startAt-pausedMs-(hiddenAt?Date.now()-hiddenAt:0)"]],
  ['games/space-shooter.html',["function reset(){cancelAnimationFrame(raf);keys={};","invuln=1100","f.y>395&&Math.abs(f.x-ship)<25","addEventListener('blur',()=>keys={})"]],
  ['games/racer.html',["score+=dt/16.67","frameCount++","Math.min(frameCount,","ghostFrames.push(player);traffic=traffic.filter(v=>v.y<550);if(score>=100"]]
]) {
  const source=fs.readFileSync(path.join(root,file),'utf8');
  for(const marker of markers)if(!source.includes(marker))failures.push(file+': missing gameplay audit fix '+marker);
}
// Save backup format and asynchronous computer-turn cancellation must remain safe.
{
  const system=fs.readFileSync(path.join(root,'js/arcade-system.js'),'utf8');
  for(const marker of ["format:'retro-universe-save'","version:2","const allowedKey=","file.size>1024*1024","const previous=new Map(","values[key]=raw"]) {
    if(!system.includes(marker))failures.push('Save manager: missing backup safety feature '+marker);
  }
  const checkers=fs.readFileSync(path.join(root,'games/checkers.html'),'utf8');
  for(const marker of ['function clearAITimers()','function scheduleAI(callback,delay)','clearAITimers();','scheduleAI(aiTurn,420)']) {
    if(!checkers.includes(marker))failures.push('Checkers: missing cancellable computer timer '+marker);
  }
}
// Star Blaster's initial draw must not read the loop callback's out-of-scope timestamp.
{
  const source=fs.readFileSync(path.join(root,'games/space-shooter.html'),'utf8');
  if(!source.includes('flashTime=0'))failures.push('Star Blaster: missing initialized render timestamp');
  if(!source.includes('flashTime=t;'))failures.push('Star Blaster: animation frame timestamp is not stored for drawing');
  if(source.includes('Math.floor(t/90)'))failures.push('Star Blaster: draw still references loop-local timestamp t');
}
// Maze Runner must randomize carve directions with an unbiased Fisher-Yates shuffle.
{
  const source=fs.readFileSync(path.join(root,'games/maze-runner.html'),'utf8');
  const start=source.indexOf('function shuffleDirections(values)');
  const end=source.indexOf('if(typeof window!==',start);
  if(start<0||end<0)failures.push('Maze Runner: missing testable Fisher-Yates direction shuffle');
  else {
    const context={window:{},Math:{floor:Math.floor,random:()=>0}};
    vm.runInNewContext(source.slice(start,end)+'window.RetroMazeShuffle=shuffleDirections;',context);
    const input=[[2,0],[-2,0],[0,2],[0,-2]];
    const output=context.window.RetroMazeShuffle(input.map(v=>v.slice()));
    if(output.length!==4||input.some(value=>!output.some(item=>item[0]===value[0]&&item[1]===value[1])))failures.push('Maze Runner: direction shuffle lost or duplicated a carve direction');
    if(output.every((value,index)=>value[0]===input[index][0]&&value[1]===input[index][1]))failures.push('Maze Runner: deterministic shuffle test did not perform swaps');
    if(source.includes('.sort(()=>Math.random()-.5)'))failures.push('Maze Runner: biased random sort comparator remains');
  }
}
// Memory Match must use Fisher-Yates rather than Array.sort with a random comparator.
{
  const source=fs.readFileSync(path.join(root,'games/memory-match.html'),'utf8');
  const start=source.indexOf('function shuffleDeck(values)');
  const end=source.indexOf("if(typeof window!=='undefined')window.RetroMemoryShuffle=shuffleDeck;",start);
  if(start<0||end<0)failures.push('Memory Match: missing testable Fisher-Yates shuffle');
  else {
    const context={window:{},Math:{floor:Math.floor,random:()=>0}};
    vm.runInNewContext(source.slice(start,end)+'window.RetroMemoryShuffle=shuffleDeck;',context);
    const input=[1,2,3,4,5,6,7,8],output=context.window.RetroMemoryShuffle(input.slice());
    if(output.length!==input.length||input.some(value=>!output.includes(value)))failures.push('Memory Match: shuffle did not preserve every card exactly once');
    if(output.every((value,index)=>value===input[index]))failures.push('Memory Match: deterministic shuffle test did not perform swaps');
    if(source.includes('.sort(()=>Math.random()-.5)'))failures.push('Memory Match: biased random sort comparator remains');
  }
}
// Frogger restarts must reset the keyboard-repeat clock with the simulation tick.
{
 const source=fs.readFileSync(path.join(root,'games/frogger.html'),'utf8');
 if(!source.includes('score=0;tick=0;lastMove=0;over=false;'))failures.push('Frogger: restart leaves stale movement cooldown from the previous run');
}
// Asteroids collision distance must respect the toroidal screen edges.
{
 const source=fs.readFileSync(path.join(root,'games/asteroids.html'),'utf8');
 const start=source.indexOf('function distance(a,b){');
 const end=source.indexOf('function loop(',start);
 if(start<0||end<0)failures.push('Asteroids: wrapped collision-distance helper is missing');
 else {
  const context={Math};
  vm.runInNewContext(source.slice(start,end),context);
  const d=context.distance({x:2,y:100},{x:718,y:100});
  if(Math.abs(d-4)>1e-9)failures.push('Asteroids: objects across a horizontal wrap seam are not treated as adjacent');
  const diagonal=context.distance({x:1,y:1},{x:719,y:479});
  if(Math.abs(diagonal-Math.sqrt(8))>1e-9)failures.push('Asteroids: diagonal wrap distance is incorrect');
  if(!source.includes('distance(s,r)<r.r')||!source.includes('distance(ship,r)<r.r+8'))failures.push('Asteroids: asteroid collisions do not use wrapped distance');
 }
}
// Solitaire undoing and replaying a completed deal must not award a second win.
{
 const source=fs.readFileSync(path.join(root,'games/solitaire.html'),'utf8');
 if(!source.includes('won=false,winRecorded=false;'))failures.push('Solitaire: per-deal win guard is missing');
 if(!source.includes('if(!winRecorded){winRecorded=true;wins++;'))failures.push('Solitaire: undo/replay can count the same deal as multiple wins');
 if(!source.includes('won=false;winRecorded=false;render();'))failures.push('Solitaire: a new deal does not reset its win guard');
}
// Snake must reject reversals against the queued direction, not just the last tick direction.
{
 const source=fs.readFileSync(path.join(root,'games/snake.html'),'utf8');
 if(!source.includes('m.x===-next.x&&m.y===-next.y'))failures.push('Snake: rapid queued turns can reverse into the body before the next tick');
}
// The chess rules engine must be part of the offline application shell.
{
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  if(!sw.includes("'js/chess-engine.js'"))failures.push('Service worker: chess engine missing from offline precache');
  if(!sw.includes("const CACHE='retro-universe-v88'"))failures.push('Service worker: cache version marker missing');
}
if (failures.length) {
  console.error(`Smoke tests failed (${failures.length} issue(s)):\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`Smoke tests passed: ${htmlFiles.length} HTML pages, ${jsFiles.length} JavaScript files, ${checkedLinks.size} internal references, plus Tic-Tac-Toe AI tactical checks.`);
}
