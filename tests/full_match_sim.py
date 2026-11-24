# -*- coding: utf-8 -*-
"""完整在线对局模拟：两浏览器连真实服务器，用游戏AI连续打杆，每杆比对全部状态。"""
from playwright.sync_api import sync_playwright
import time,json,sys
URL='https://www.xingshuwen.com/games/pool/?v=sim'+str(time.time())
errs=[]; findings=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def snap(g):
    return g.evaluate("""()=>{const G=window.__PROPOOL__.game;if(!G||!G.world)return null;return {
      phase:G.phase,shots:G.shots,turn:G.activePlayer,bih:G.ballInHand,
      groups:G.players.map(p=>p.group||null),open:G.openTable,
      match:G.matchResult?{w:G.matchResult.winner,r:G.matchResult.reason}:null,
      balls:G.world.balls.map(b=>[b.id,+b.x.toFixed(6),+b.y.toFixed(6),b.active?1:0])
    }}""")
def cmp(label,a,b):
    if a is None or b is None: return False
    diffs=[]
    for k in ['phase','shots','turn','bih','groups','open']:
        if a.get(k)!=b.get(k):diffs.append(k+':'+str(a.get(k))+'!='+str(b.get(k)))
    if a.get('match')!=b.get('match'):diffs.append('match')
    if a.get('balls')!=b.get('balls'):
        for x,y in zip(a['balls'],b['balls']):
            if x!=y:diffs.append('ball '+x[0]);break
    if diffs:
        findings.append({'stage':label,'diffs':diffs[:8]})
        return False
    return True
def ai_shot(g):
    """在当前端用游戏AI算杆并出杆；自由球先摆。返回是否成功"""
    return g.evaluate("""()=>{
      const P=window.Pool,G=window.__PROPOOL__.game;
      if(!G||G.phase!=='aim')return {ok:false,why:'phase'};
      if(G.ballInHand){
        const c=G.world.getBall('cue');
        // 摆到开球线附近安全点
        const ok=G.placeCueAt(0.635,0.95);
        if(!ok)return {ok:false,why:'place'};
      }
      const ids=G.getTargetIds(G.players[G.activePlayer]);
      let plan=null;
      try{ plan=P.AI.chooseShot(G.world,{cueBallId:'cue',group:G.players[G.activePlayer].group||'open',targetIds:ids,difficulty:'normal',ballInHand:false,maxTimeMs:120,cuePower:1,cueSpin:1}); }catch(e){ return {ok:false,why:'ai:'+String(e).slice(0,60)}; }
      if(!plan||plan.plan==='safety'){
        // 没好球就随便打一杆推进局面
        const c=G.world.getBall('cue');const b=G.world.balls.find(x=>x.active&&x.number>0);
        if(!b)return {ok:false,why:'noball'};
        G.aimAngle=Math.atan2(b.y-c.y,b.x-c.x);
        return {ok:G.shoot(0.5,0,0),why:'fallback'};
      }
      G.aimAngle=plan.angle;
      return {ok:G.shoot(plan.power,plan.spinX||0,plan.spinY||0),why:'ai'};
    }""")
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    ctx=b.new_context(viewport={'width':1300,'height':850})
    A=ctx.new_page();A.on('pageerror',lambda e:errs.append('A:'+str(e)[:150]))
    B=ctx.new_page();B.on('pageerror',lambda e:errs.append('B:'+str(e)[:150]))
    boot(A);boot(B)
    A.click('[data-action="online"]');A.wait_for_timeout(300)
    A.click('#online-create');A.wait_for_timeout(2500)
    code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(2500)
    print('ROOM',code,'PRE_OK',cmp('init',snap(A),snap(B)))
    # 连续打 3 局，每局最多 40 杆
    for game_no in range(1,4):
        if game_no>1:
            # rematch
            A.evaluate("()=>window.Pool.Net.rematch&&window.Pool.Net.rematch()")
            A.wait_for_timeout(1200);B.wait_for_timeout(600)
        for shot_no in range(40):
            sa,sb=snap(A),snap(B)
            if sa and sa['phase']=='over' or sb and sb['phase']=='over':
                print('GAME',game_no,'OVER at shot',shot_no,json.dumps(sa['match'] if sa else None,ensure_ascii=False))
                break
            cmp('g%d-s%d-pre'%(game_no,shot_no),sa,sb)
            # 轮到谁谁打（以 A 端 turn 为准，若不统一已记录）
            turn=sa['turn'] if sa else 0
            actor=A if turn==0 else B
            r=ai_shot(actor)
            if not r['ok']:
                findings.append({'stage':'g%d-s%d-shotfail'%(game_no,shot_no),'diffs':[str(r)]})
                break
            # 等两端都回到 aim/over
            for _ in range(150):
                x,y=snap(A),snap(B)
                if (x and x['phase'] in ('aim','over')) and (y and y['phase'] in ('aim','over')):
                    # 再等100ms确保结算完成
                    A.wait_for_timeout(120)
                    break
                A.wait_for_timeout(120)
            x,y=snap(A),snap(B)
            cmp('g%d-s%d-post'%(game_no,shot_no),x,y)
        # 中途测试断线重连（第2局第10杆后）
        if game_no==2:
            before=snap(A)
            B.evaluate("()=>window.Pool.Net.drop()")
            A.wait_for_timeout(3000)
            after=snap(A)
            cmp('reconnect',before,after)
    print('TOTAL_FINDINGS',len(findings))
    for f in findings[:30]:print('FINDING',json.dumps(f,ensure_ascii=False))
    print('ERRORS',errs[:8])
    b.close()