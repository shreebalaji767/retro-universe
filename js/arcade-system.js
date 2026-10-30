(()=>{'use strict';
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}},write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const all=['2048','asteroids','bomber-maze','breakout','frogger','maze-runner','memory-match','minesweeper','platformer','pong','racer','simon','snake','space-shooter','tetris','tic-tac-toe','checkers'];
const today=()=>new Date().toISOString().slice(0,10),day=today(),id=document.body.dataset.game;
let stats=read('ru-progress',{xp:0,days:[],played:[],achievements:[],challenge:{date:day,played:[]}});
if(stats.challenge.date!==day)stats.challenge={date:day,played:[]};
if(id&&all.includes(id)){
if(!stats.played.includes(id)){stats.played.push(id);stats.xp+=25}
if(!stats.challenge.played.includes(id)){stats.challenge.played.push(id);stats.xp+=10}
if(!stats.days.includes(day))stats.days.push(day);
const unlocked=new Set(stats.achievements);
if(stats.played.length>=1)unlocked.add('FIRST-CARTRIDGE');
if(stats.played.length>=5)unlocked.add('ARCADE-EXPLORER');
if(stats.played.length>=10)unlocked.add('PIXEL-PRO');
if(stats.played.length>=all.length)unlocked.add('UNIVERSE-MASTER');
if(stats.challenge.played.length>=3)unlocked.add('DAILY-TRIO');
if(stats.days.length>=7)unlocked.add('WEEKLY-PLAYER');
stats.achievements=[...unlocked];write('ru-progress',stats);
}
window.RetroUniverseAchievement=function(key){const defs={'CHECKERS-CAPTURE':{title:'First Capture',xp:25},'CHECKERS-KING':{title:'Crowned',xp:50},'CHECKERS-WIN':{title:'Checkers Champion',xp:100}};const def=defs[key];if(!def)return false;const current=read('ru-progress',{xp:0,achievements:[]});if((current.achievements||[]).includes(key))return false;current.achievements=[...(current.achievements||[]),key];current.xp=(current.xp||0)+def.xp;write('ru-progress',current);const node=document.querySelector('#ru-progression');if(node)node.dataset.achievementUnlocked=key;return true;};\nconst xp=stats.xp||0,level=Math.floor(xp/100)+1,next=level*100;
const titles={'FIRST-CARTRIDGE':'First Cartridge','ARCADE-EXPLORER':'Arcade Explorer','PIXEL-PRO':'Pixel Pro','UNIVERSE-MASTER':'Universe Master','DAILY-TRIO':'Daily Trio','WEEKLY-PLAYER':'Weekly Player','CHECKERS-CAPTURE':'First Capture','CHECKERS-KING':'Crowned','CHECKERS-WIN':'Checkers Champion'};
const mount=document.querySelector('#ru-progression');
if(mount){mount.innerHTML='<div class="ru-progress-head"><strong>LEVEL '+level+'</strong><span>'+xp+' XP</span></div><div class="ru-progress-track" role="progressbar" aria-label="Progress to next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+(xp%100)+'"><span style="width:'+(xp%100)+'%"></span></div><p>'+((next-xp)+' XP TO LEVEL '+(level+1))+'</p><div class="ru-badge-list">'+(stats.achievements.length?stats.achievements.map(a=>'<span class="player-badge">★ '+titles[a]+'</span>').join(''):'Play games to unlock achievements.')+'</div>'}
const challenge=document.querySelector('#ru-challenge');
if(challenge){challenge.innerHTML='<strong>DAILY CHALLENGE</strong><p>Visit 3 different games today to earn 30 XP and unlock Daily Trio.</p><div class="ru-progress-track"><span style="width:'+Math.min(100,stats.challenge.played.length/3*100)+'%"></span></div><p>'+stats.challenge.played.length+'/3 games completed today</p><p class="muted">Challenge progress is saved locally on this device.</p>'}
const exportBtn=document.querySelector('#ru-export'),importInput=document.querySelector('#ru-import');
if(exportBtn&&importInput){exportBtn.addEventListener('click',()=>{const data={profile:read('retro-profile',{}),progress:read('ru-progress',{}),records:read('retro-records',{}),favorites:read('retro-favorites',[]),settings:read('retro-settings',{})};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='retro-universe-save-'+day+'.json';a.click();URL.revokeObjectURL(url)});importInput.addEventListener('change',async()=>{const file=importInput.files&&importInput.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!data||typeof data!=='object'||!data.progress||!data.records)throw Error('Invalid save');if(!confirm('Import this save and replace local profile, records, favorites and settings?'))return;for(const [src,dst] of [['profile','retro-profile'],['progress','ru-progress'],['records','retro-records'],['favorites','retro-favorites'],['settings','retro-settings']])if(data[src]!==undefined)write(dst,data[src]);location.reload()}catch(e){alert('Could not import save: '+e.message)}finally{importInput.value=''}});}
})();