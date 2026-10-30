(()=>{'use strict';
const node=document.querySelector('#ru-streak');
if(!node)return;
const today=new Date();
const dayKey=d=>d.toISOString().slice(0,10);
const read=()=>{try{return JSON.parse(localStorage.getItem('ru-progress')||'{}')}catch{return {}}};
const stats=read(),days=[...new Set(Array.isArray(stats.days)?stats.days:[])].sort();
const daySet=new Set(days);
let current=0,best=0,run=0,previous=null;
for(const key of days){
const d=new Date(key+'T00:00:00Z');
if(previous&&d-previous===86400000)run++;else run=1;
best=Math.max(best,run);previous=d;
}
let cursor=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()));
if(daySet.has(dayKey(cursor)))current=1;
cursor.setUTCDate(cursor.getUTCDate()-1);
while(daySet.has(dayKey(cursor))){current++;cursor.setUTCDate(cursor.getUTCDate()-1)}
const last=days[days.length-1]||'Never';
const milestones=[{days:3,label:'3-DAY SPARK',icon:'⚡'},{days:7,label:'WEEK WARRIOR',icon:'🏆'},{days:14,label:'FORTNIGHT FORCE',icon:'🌟'},{days:30,label:'MONTH MASTER',icon:'👑'}];
const earned=milestones.filter(item=>best>=item.days);
node.innerHTML='<div class="ru-progress-head"><strong>🔥 '+current+' DAY STREAK</strong><span>BEST '+best+' DAYS</span></div><div class="ru-progress-track" role="progressbar" aria-label="Current daily play streak" aria-valuemin="0" aria-valuemax="'+Math.max(7,best)+'" aria-valuenow="'+current+'"><span style="width:'+Math.min(100,current/Math.max(7,best)*100)+'%"></span></div><p>Last played: '+last+'</p><p class="muted">Play at least one cartridge each day to keep your streak. This is calculated from your locally saved play dates.</p><h3>STREAK BADGES</h3><div class="player-badges">'+milestones.map(item=>'<span class="player-badge" title="Unlock at '+item.days+' consecutive days"'+(best>=item.days?'':' aria-label="Locked: '+item.label+'"')+'>'+item.icon+' '+item.label+(best>=item.days?' ✓':' · '+item.days+'D')+'</span>').join('')+'</div><p class="muted">'+earned.length+' / '+milestones.length+' unlocked · best streak: '+best+' days</p>';
})();