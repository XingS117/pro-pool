# -*- coding: utf-8 -*-
"""在线回合锁验证：两浏览器连线，验证 A 出杆后只有 B 能打，B 出杆后只有 A 能打，两地球位一致。"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=turn2'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(60):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    ctx=b.new_context(viewport={'width':1300,'height':850})
    A=ctx.new_page(); A.on('pageerror',lambda e:errs.append('A:'+str(e)[:140]))
    B=ctx.new_page(); B.on('pageerror',lambda e:errs.append('B:'+str(e)[:140]))
    boot(A);boot(B)
    A.click('[data-action="online"]');A.wait_for_timeout(300)
    A.click('#online-create');A.wait_for_timeout(2500)
    code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(2500)
    def info(g):
        return g.evaluate("()=>{const G=window.__PROPOOL__.game;return {seat:G.onlineSeat,turn:G.activePlayer,human:G.isHumanTurn(),phase:G.phase,paused:!!G._onlinePaused}}")
    ia,ib=info(A),info(B)
    print('A_INIT:',json.dumps(ia))
    print('B_INIT:',json.dumps(ib))
    print('SEAT_SET:',ia['seat']==0 and ib['seat']==1)
    print('TURN_LOCK_INIT: A_can=',ia['human'],' B_can=',ib['human'])
    # A 先手出杆
    a0=A.evaluate("()=>{const G=window.__PROPOOL__.game;G.aimAngle=0.25;return G.shoot(0.9,0,0)}")
    print('A_SHOT:',a0)
    # 等两边结算完
    for _ in range(100):
        if A.evaluate('()=>window.__PROPOOL__.game.phase')=='aim' and B.evaluate('()=>window.__PROPOOL__.game.phase')=='aim':break
        A.wait_for_timeout(200)
    ia2,ib2=info(A),info(B)
    print('A_AFTER:',json.dumps(ia2))
    print('B_AFTER:',json.dumps(ib2))
    print('TURN_SYNC:',ia2['turn']==ib2['turn'])
    print('TURN_LOCK_AFTER_A: A_can=',ia2['human'],' B_can=',ib2['human'])
    # B 出杆（应可打）
    print('B_PRE:',json.dumps(B.evaluate("()=>{const G=window.__PROPOOL__.game,c=G.world.getBall('cue');return {phase:G.phase,human:G.isHumanTurn(),bih:G.ballInHand,stopped:G.world.allStopped(),cueActive:c&&c.active,paused:G.paused,charging:G.charging}}")))
    b0=B.evaluate("()=>{const G=window.__PROPOOL__.game;G.aimAngle=-0.15;return G.shoot(0.75,0,0)}")
    print('B_SHOT:',b0)
    for _ in range(100):
        if A.evaluate('()=>window.__PROPOOL__.game.phase')=='aim' and B.evaluate('()=>window.__PROPOOL__.game.phase')=='aim':break
        A.wait_for_timeout(200)
    ia3,ib3=info(A),info(B)
    print('A_AFTER2:',json.dumps(ia3))
    print('B_AFTER2:',json.dumps(ib3))
    print('TURN_LOCK_AFTER_B: A_can=',ia3['human'],' B_can=',ib3['human'])
    pos=lambda g:g.evaluate("()=>window.__PROPOOL__.game.world.balls.map(b=>[b.id,+b.x.toFixed(9),+b.y.toFixed(9)])")
    print('BALL_POS_SYNC:',pos(A)==pos(B))
    print('ERRORS:',errs[:5])
    b.close()