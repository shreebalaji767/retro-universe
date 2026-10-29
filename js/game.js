/* Retro Universe shared browser-game AI. Offline, deterministic logic; no API or paid service. */
(function(global){
  'use strict';
  function winner(board){
    const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(const line of lines){const [a,b,c]=line;if(board[a]&&board[a]===board[b]&&board[a]===board[c])return board[a];}
    return board.every(Boolean)?'draw':null;
  }
  function minimax(board,turn,ai,human,depth){
    const result=winner(board);
    if(result===ai)return {score:10-depth};
    if(result===human)return {score:depth-10};
    if(result==='draw')return {score:0};
    const moves=[];
    for(let i=0;i<9;i++)if(!board[i]){
      board[i]=turn;
      const value=minimax(board,turn===ai?human:ai,ai,human,depth+1).score;
      board[i]='';
      moves.push({index:i,score:value});
    }
    const best=turn===ai?Math.max(...moves.map(m=>m.score)):Math.min(...moves.map(m=>m.score));
    const candidates=moves.filter(m=>m.score===best);
    return {score:best,index:candidates[Math.floor(Math.random()*candidates.length)]?.index};
  }
  function chooseTicTacToeMove(cells,ai='O',human='X',difficulty='hard'){
    const board=cells.slice(),empty=board.map((v,i)=>v?'':i).filter(v=>v!=='');
    if(!empty.length)return -1;
    if(difficulty==='easy')return empty[Math.floor(Math.random()*empty.length)];
    if(difficulty==='normal'&&Math.random()<.35)return empty[Math.floor(Math.random()*empty.length)];
    const moves=[];
    for(const i of empty){board[i]=ai;const result=winner(board);board[i]='';if(result===ai)return i;}
    for(const i of empty){board[i]=human;const result=winner(board);board[i]='';if(result===human)return i;}
    if(difficulty==='normal'){
      if(!board[4])return 4;
      const corners=[0,2,6,8].filter(i=>!board[i]);if(corners.length)return corners[Math.floor(Math.random()*corners.length)];
    }
    for(const i of empty){board[i]=ai;const score=minimax(board,human,ai,human,1).score;board[i]='';moves.push({i,score});}
    const max=Math.max(...moves.map(m=>m.score));
    return moves.filter(m=>m.score===max)[Math.floor(Math.random()*moves.filter(m=>m.score===max).length)].i;
  }
  global.RetroGame=Object.freeze({chooseTicTacToeMove,winner});
})(window);
