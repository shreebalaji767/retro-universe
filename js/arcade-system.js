(()=>{'use strict';
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}},write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const all=['2048','asteroids','bomber-maze','breakout','frogger','maze-runner','memory-match','minesweeper','platformer','pong','racer','simon','snake','space-shooter','tetris','tic-tac-toe','checkers','chess','solitaire','pinball'];
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
window.RetroUniverseAchievement=function(key){const defs={'CHECKERS-CAPTURE':{title:'First Capture',xp:25},'CHECKERS-KING':{title:'Crowned',xp:50},'CHECKERS-WIN':{title:'Checkers Champion',xp:100},'TETRIS-LINE':{title:'Line Clear',xp:20},'TETRIS-TETRIS':{title:'Four-Line Clear',xp:100},'SNAKE-FOOD':{title:'First Snack',xp:20},'SNAKE-100':{title:'Snake Centurion',xp:50},'RACER-100':{title:'Road Runner',xp:50},'PINBALL-500':{title:'Pinball Wizard',xp:50}};const def=defs[key];if(!def)return false;const current=read('ru-progress',{xp:0,achievements:[]});if((current.achievements||[]).includes(key))return false;current.achievements=[...(current.achievements||[]),key];current.xp=(current.xp||0)+def.xp;write('ru-progress',current);const node=document.querySelector('#ru-progression');if(node)node.dataset.achievementUnlocked=key;return true;};
const xp=stats.xp||0,level=Math.floor(xp/100)+1,next=level*100;
const titles={'FIRST-CARTRIDGE':'First Cartridge','ARCADE-EXPLORER':'Arcade Explorer','PIXEL-PRO':'Pixel Pro','UNIVERSE-MASTER':'Universe Master','DAILY-TRIO':'Daily Trio','WEEKLY-PLAYER':'Weekly Player','CHECKERS-CAPTURE':'First Capture','CHECKERS-KING':'Crowned','CHECKERS-WIN':'Checkers Champion','TETRIS-LINE':'Line Clear','TETRIS-TETRIS':'Four-Line Clear','SNAKE-FOOD':'First Snack','SNAKE-100':'Snake Centurion','RACER-100':'Road Runner','PINBALL-500':'Pinball Wizard'};
const mount=document.querySelector('#ru-progression');
if(mount){mount.innerHTML='<div class="ru-progress-head"><strong>LEVEL '+level+'</strong><span>'+xp+' XP</span></div><div class="ru-progress-track" role="progressbar" aria-label="Progress to next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+(xp%100)+'"><span style="width:'+(xp%100)+'%"></span></div><p>'+((next-xp)+' XP TO LEVEL '+(level+1))+'</p><div class="ru-badge-list">'+(stats.achievements.length?stats.achievements.map(a=>'<span class="player-badge">★ '+titles[a]+'</span>').join(''):'Play games to unlock achievements.')+'</div>'}
const challenge=document.querySelector('#ru-challenge');
if(challenge){challenge.innerHTML='<strong>DAILY CHALLENGE</strong><p>Visit 3 different games today to earn 30 XP and unlock Daily Trio.</p><div class="ru-progress-track"><span style="width:'+Math.min(100,stats.challenge.played.length/3*100)+'%"></span></div><p>'+stats.challenge.played.length+'/3 games completed today</p><p class="muted">Challenge progress is saved locally on this device.</p>'}
const exportBtn=document.querySelector('#ru-export'),importInput=document.querySelector('#ru-import');
if(exportBtn&&importInput){
  const allowedKey=key=>/^(retro-|ru-)/.test(key)||/^(snake|racer|2048)-best$/.test(key)||key==='racer-ghost';
  const collectSave=()=>{const values={};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key&&allowedKey(key)){const raw=localStorage.getItem(key);values[key]=raw}}return values};
  exportBtn.addEventListener('click',()=>{try{const payload={format:'retro-universe-save',version:2,savedAt:new Date().toISOString(),data:collectSave()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='retro-universe-save-'+day+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(error){alert('Could not export save: '+error.message)}});
  importInput.addEventListener('change',async()=>{const file=importInput.files&&importInput.files[0];if(!file)return;try{
    if(file.size>1024*1024)throw Error('Save file is larger than the 1 MB safety limit.');
    const parsed=JSON.parse(await file.text());let incoming;
    if(parsed&&parsed.format==='retro-universe-save'&&parsed.version===2&&parsed.data&&typeof parsed.data==='object'&&!Array.isArray(parsed.data)){incoming=parsed.data}
    else if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)&&parsed.progress&&parsed.records){incoming={};for(const [src,dst] of [['profile','retro-profile'],['progress','ru-progress'],['records','retro-records'],['favorites','retro-favorites'],['settings','retro-settings']])if(parsed[src]!==undefined)incoming[dst]=parsed[src]}
    else throw Error('This is not a supported Retro Universe save file.');
    const entries=Object.entries(incoming);if(!entries.length||entries.length>250)throw Error('The save contains no data or too many entries.');
    for(const [key,value] of entries){if(!allowedKey(key))throw Error('Unsupported save entry: '+key);if(value===undefined||typeof value==='function')throw Error('Invalid data for '+key);if(JSON.stringify(value).length>500000)throw Error('A save entry is too large: '+key)}
    if(!confirm('Import '+entries.length+' save entries? Existing matching records will be replaced; other local records will be preserved.'))return;
    const previous=new Map(entries.map(([key])=>[key,localStorage.getItem(key)]));
    try{for(const [key,value] of entries)localStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value))}
    catch(error){for(const [key,value] of previous){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}catch{}}throw Error('Browser storage could not accept the save. Your previous data was restored where possible. '+error.message)}
    location.reload();
  }catch(error){alert('Could not import save: '+error.message)}finally{importInput.value=''}});
}
})();