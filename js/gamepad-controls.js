(()=>{'use strict';
if(!document.body.dataset.game)return;
const style=document.createElement('style');style.textContent='.ru-pad-status{font:12px monospace;text-align:center;color:var(--muted,#aaa);margin:8px auto}.ru-pad-status[data-connected=true]{color:var(--accent,#8f8)}';document.head.append(style);
const status=document.createElement('p');status.className='ru-pad-status';status.setAttribute('role','status');status.textContent='🎮 Controller ready — connect a gamepad';document.querySelector('main')?.append(status);
const mapping=new Map([[12,'ArrowUp'],[13,'ArrowDown'],[14,'ArrowLeft'],[15,'ArrowRight'],[0,'Enter'],[1,'Escape'],[2,'Space'],[3,'Space'],[9,'Enter']]);let previous=new Set(),raf=0;
const emit=(key,type)=>document.dispatchEvent(new KeyboardEvent(type,{key,code:key,bubbles:true,cancelable:true}));
function poll(){const pads=Array.from(navigator.getGamepads?navigator.getGamepads():[]).filter(Boolean),pad=pads.find(p=>p.connected);
if(pad){status.dataset.connected='true';status.textContent='🎮 Controller connected · D-pad/stick · A/Start · B/Back';const now=new Set();pad.buttons.forEach((b,i)=>{if(b.pressed&&mapping.has(i))now.add(mapping.get(i))});const a=pad.axes||[];if(a[0]<-.5)now.add('ArrowLeft');if(a[0]>.5)now.add('ArrowRight');if(a[1]<-.5)now.add('ArrowUp');if(a[1]>.5)now.add('ArrowDown');now.forEach(k=>{if(!previous.has(k))emit(k,'keydown')});previous.forEach(k=>{if(!now.has(k))emit(k,'keyup')});previous=now;
}else{previous.forEach(k=>emit(k,'keyup'));previous.clear();status.dataset.connected='false';status.textContent='🎮 Controller ready — connect a gamepad'}
raf=requestAnimationFrame(poll)}
if(navigator.getGamepads)raf=requestAnimationFrame(poll);addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});addEventListener('gamepadconnected',()=>{status.textContent='🎮 Gamepad detected — press a button'});addEventListener('gamepaddisconnected',()=>{status.textContent='🎮 Controller disconnected'});
})();