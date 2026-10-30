(()=>{'use strict';
const body=document.body,isHome=!body.dataset.game;let deferredPrompt=null;let userPrefs={sound:true,effects:true,difficulty:'normal'};try{userPrefs={...userPrefs,...JSON.parse(localStorage.getItem('retro-settings')||'{}')}}catch(e){}document.documentElement.dataset.effects=userPrefs.effects===false?'off':'on';document.documentElement.dataset.sound=userPrefs.sound===false?'off':'on';const phase5=document.createElement('script');phase5.src=(body.dataset.game?'../js/phase5.js':'js/phase5.js');phase5.defer=true;document.head.append(phase5);
const install=isHome?document.querySelector('#install'):document.createElement('button');if(install&&!isHome){install.type='button';install.id='ru-install';install.className='ru-utility-button';install.textContent='＋ INSTALL APP';install.setAttribute('aria-label','Install Retro Universe as an app')}
const net=document.createElement('span');net.id='ru-network';net.className='ru-network';net.setAttribute('role','status');
function setNetwork(){const online=navigator.onLine;net.textContent=online?'● ONLINE':'● OFFLINE PLAY';net.dataset.online=String(online);net.title=online?'Connection available; cached games can also work offline.':'Offline: cached games remain available.'}
setNetwork();addEventListener('online',setNetwork);addEventListener('offline',setNetwork);
if(!isHome){const header=document.querySelector('header');if(header){const group=document.createElement('div');group.className='ru-utility-group';group.append(install,net);header.append(group)}}else{const actions=document.querySelector('.hero-actions');if(actions){const status=document.createElement('span');status.className='ru-network-home';status.append(net);actions.append(status)}}
function installHelp(){const apple=/iphone|ipad|ipod/i.test(navigator.userAgent);const msg=apple?'Install on iPhone/iPad: tap Share in Safari, then “Add to Home Screen”.':'Open your browser menu and choose “Install app” or “Add to Home screen” if available.';let box=document.querySelector('#ru-install-help');if(!box){box=document.createElement('p');box.id='ru-install-help';box.className='ru-install-help';box.setAttribute('role','status');install.insertAdjacentElement('afterend',box)}box.textContent=msg;box.hidden=false}
if(!isHome){addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;install.hidden=false;install.textContent='＋ INSTALL APP'});addEventListener('appinstalled',()=>{deferredPrompt=null;install.hidden=true});install.addEventListener('click',async()=>{if(deferredPrompt){deferredPrompt.prompt();try{await deferredPrompt.userChoice}catch(e){}deferredPrompt=null}else installHelp()});install.hidden=false;}
// Keep the daily quest consistent across every game page. Some older pages used an 8-game list.
if(!isHome&&body.dataset.game){
  try{
    const today=new Date().toISOString().slice(0,10);
    const dailyGames=['tetris','snake','2048','tic-tac-toe','racer','space-shooter','breakout','memory-match','platformer','maze-runner','pong','minesweeper','simon','asteroids','frogger','bomber-maze'];
    const featured=dailyGames[Number(today.replace(/-/g,''))%dailyGames.length];
    const completed=JSON.parse(localStorage.getItem('retro-daily-complete')||'""');
    const completedGame=localStorage.getItem('retro-daily-game')||'';
    if(body.dataset.game===featured){
      localStorage.setItem('retro-daily-complete',JSON.stringify(today));
      localStorage.setItem('retro-daily-game',featured);
    }else if(completed===today&&completedGame!==featured){
      // Clear a false completion written by an older, shorter daily-game list.
      localStorage.removeItem('retro-daily-complete');
    }
  }catch(error){/* Private browsing/storage restrictions must not block gameplay. */}
}
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register(body.dataset.game?'../sw.js':'sw.js').catch(()=>{}));
document.querySelectorAll('canvas').forEach(c=>{c.style.maxWidth='100%';c.style.height='auto';c.style.touchAction='none';c.setAttribute('tabindex','0');if(!c.hasAttribute('aria-label'))c.setAttribute('aria-label','Interactive game board')});
document.querySelectorAll('button').forEach(b=>{if(!b.hasAttribute('type'))b.type='button';b.style.touchAction='manipulation'});if(userPrefs.sound!==false){document.addEventListener('click',e=>{if(!e.target.closest('button'))return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const ac=new AC(),osc=ac.createOscillator(),gain=ac.createGain();osc.type='square';osc.frequency.value=540;gain.gain.setValueAtTime(.025,ac.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.045);osc.connect(gain);gain.connect(ac.destination);osc.start();osc.stop(ac.currentTime+.045);osc.onended=()=>ac.close()}catch(err){}},{passive:true})}const difficulty=document.querySelector('#difficulty');if(difficulty&&['easy','normal','hard'].includes(userPrefs.difficulty)){difficulty.value=userPrefs.difficulty;difficulty.dispatchEvent(new Event('change'))}
}
 // Optional controller support through the standard Gamepad API (no dependencies).
 if(!isHome){
  const style=document.createElement('style');style.textContent='.ru-pad-status{font:12px monospace;text-align:center;color:var(--muted,#aaa);margin:8px auto}.ru-pad-status[data-connected=true]{color:var(--accent,#8f8)}';document.head.append(style);
  const status=document.createElement('p');status.className='ru-pad-status';status.setAttribute('role','status');status.textContent='🎮 Controller ready — connect a gamepad';const main=document.querySelector('main');if(main)main.append(status);
  const map=new Map([[12,'ArrowUp'],[13,'ArrowDown'],[14,'ArrowLeft'],[15,'ArrowRight'],[0,'Enter'],[1,'Escape'],[2,'Space'],[3,'Space'],[9,'Enter']]);let previous=new Set(),raf=0;
  const emit=(key,type)=>document.dispatchEvent(new KeyboardEvent(type,{key,code:key,bubbles:true,cancelable:true}));
  function poll(){const pads=Array.from(navigator.getGamepads?navigator.getGamepads():[]).filter(Boolean),pad=pads.find(p=>p.connected);
   if(pad){status.dataset.connected='true';status.textContent='🎮 Controller connected · D-pad/stick · A/Start · B/Back';const now=new Set();pad.buttons.forEach((b,i)=>{if(b.pressed&&map.has(i))now.add(map.get(i))});const a=pad.axes||[];if(a[0]<-.5)now.add('ArrowLeft');if(a[0]>.5)now.add('ArrowRight');if(a[1]<-.5)now.add('ArrowUp');if(a[1]>.5)now.add('ArrowDown');now.forEach(k=>{if(!previous.has(k))emit(k,'keydown')});previous.forEach(k=>{if(!now.has(k))emit(k,'keyup')});previous=now;
   }else{previous.forEach(k=>emit(k,'keyup'));previous.clear();status.dataset.connected='false';status.textContent='🎮 Controller ready — connect a gamepad'}
   raf=requestAnimationFrame(poll)}
  if(navigator.getGamepads)raf=requestAnimationFrame(poll);addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});
  addEventListener('gamepadconnected',()=>{status.textContent='🎮 Gamepad detected — press a button'});addEventListener('gamepaddisconnected',()=>{status.textContent='🎮 Controller disconnected'});
 }
})();