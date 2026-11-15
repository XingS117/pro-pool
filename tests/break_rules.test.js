/* Lead: 开球规则 / 开放球台测试 */
global.window = global;
require('../js/config.js');
require('../js/physics.js');
require('../js/levels.js');
require('../js/ai.js');
require('../js/game.js');
const Pool=global.Pool;
let fails=[];
const ok=(c,m)=>{ if(!c) fails.push(m); else console.log('OK',m); };
function save(){return {version:1,coins:0,stars:{},cleared:{},ownedCues:['oak'],equipped:'oak',settings:{guide:true,sound:false},record:{wins:0,losses:0,matches:0}};}
function game(){const g=new Pool.Game({save:save(),persist(){},renderer:null,audio:null}); g.startMatch('pvp','normal'); return g;}
function deactivate(g,ids){for(const b of g.world.balls){if(b.id==='cue')continue; b.active=!ids.includes(b.id); b.pocketed=ids.includes(b.id);}}
function ctx(g, first, pottedIds, extra){
  const potted=[]; for(const id of pottedIds){const b=g.world.getBall(id); b.active=false;b.pocketed=true;potted.push(b);}
  return Object.assign({firstHitId:first,potted, cuePotted:false,railAfterContact:false,railBalls:{},isBreak:true,
    preGroup:null,preGroupCleared:false,preOpen:true,preTargets:[],power:.8,angle:0,spinX:0,spinY:0},extra||{});
}
function resolve(g,c){g.shotCtx=c; g.phase='shooting'; g.resolveMatchShot();}

// 1 开球进球：继续出杆、球台仍开放
(function(){
  const g=game(); deactivate(g,['b1','b2','b3']);
  const c=ctx(g,'b1',['b1'],{railBalls:{b2:true,b3:true}});
  resolve(g,c);
  ok(g.players.every(p=>p.group===null),'break pot leaves table open');
  ok(g.activePlayer===0,'break pot keeps turn');
  ok(g.breakShot===false,'break flag cleared');
  ok(g.phase==='aim','phase aim after break pot');
  console.log('break pot toast last:', g.getState().coins);
})();

// 2 合法开球无进球（2 球吃库）：正常换人，不算犯规
(function(){
  const g=game(); deactivate(g,['b1','b2']);
  const c=ctx(g,'b1',[],{railBalls:{b2:true,b3:true}});
  resolve(g,c);
  ok(g.activePlayer===1,'legal break switches');
  ok(g.ballInHand===false,'legal break no ball in hand');
  ok(g.players.every(p=>p.group===null),'table still open after legal break');
})();

// 3 无效开球（只有 1 球吃库）：犯规 + 自由球
(function(){
  const g=game(); deactivate(g,['b1','b2']);
  const c=ctx(g,'b1',[],{railBalls:{b2:true}});
  resolve(g,c);
  ok(g.activePlayer===1,'illegal break switches');
  ok(g.ballInHand===true,'illegal break gives ball in hand');
})();

// 4 开球后第一次合法进球：定组
(function(){
  const g=game(); deactivate(g,['b1','b2','b3']);
  resolve(g, ctx(g,'b1',[],{railBalls:{b2:true,b3:true}}));
  // now player 1, table open; make player 0? Just force active 0 for test
  g.activePlayer=0; g.ballInHand=false;
  const c=Object.assign(ctx(g,'b1',['b1'],{railBalls:{b3:true}}),{isBreak:false});
  resolve(g,c);
  ok(g.players[0].group==='solid','first post-break pot assigns solid');
  ok(g.players[1].group==='stripe','opponent gets stripe');
  ok(g.activePlayer===0,'post-break pot keeps turn');
})();

// 5 开球 8 号落袋：重新摆球
(function(){
  const g=game();
  const c=ctx(g,'b8',['b8'],{railBalls:{b2:true,b3:true}});
  const before=g.world.balls.filter(b=>b.active).length;
  resolve(g,c);
  ok(g.world.balls.filter(b=>b.active).length===16,'8 on break reracks');
  ok(g.breakShot===true,'8 on break keeps break');
  ok(g.activePlayer===0,'8 on break same breaker');
})();

if(fails.length){console.error('FAILURES',fails);process.exit(1);} console.log('BREAK RULE TESTS PASSED');
