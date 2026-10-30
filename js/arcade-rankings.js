(()=>{'use strict';
const root=document.querySelector('#ru-rankings');
if(!root)return;
const games=[['snake-best','Snake'],['racer-best','Pixel Racer'],['2048-best','2048 Pixel'],['tetris-best','Tetris DX'],['space-shooter-best','Star Blaster'],['breakout-best','Brick Breaker'],['pong-best','Pixel Pong'],['asteroids-best','Pixel Asteroids'],['frogger-best','Pixel Crossing'],['minesweeper-best','Pixel Mines'],['maze-runner-best','Maze Runner'],['platformer-best','Pixel Jumper']];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const scores=games.map(([key,name])=>({name,score:Number(localStorage.getItem(key)||0)})).filter(x=>Number.isFinite(x.score)&&x.score>0).sort((a,b)=>b.score-a.score);
const xp=Math.max(0,Number((()=>{try{return JSON.parse(localStorage.getItem('ru-progress')||'{}').xp||0}catch{return 0}})()));
root.innerHTML='<div class="ru-progress-head"><strong>LOCAL HIGH SCORES</strong><span>'+scores.length+' RECORDS</span></div>'+ (scores.length?scores.map((x,i)=>'<div class="player-badge">#'+(i+1)+' · '+esc(x.name)+' · '+x.score.toLocaleString()+'</div>').join(''):'<p class="muted">Set a high score in a supported arcade game to build your rankings.</p>')+'<p class="muted">Arcade XP earned: '+xp.toLocaleString()+' · All records remain on this device.</p>';
})();