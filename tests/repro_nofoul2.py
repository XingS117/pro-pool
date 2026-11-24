# -*- coding: utf-8 -*-
"""复现：A 击中球但没进 -> 检查是否误判自由球"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=nofoul'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def st(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game,c=G.shotCtx;return {phase:G.phase,bih:G.ballInHand,freeSeat:G.freeBallSeat,turn:G.activePlayer,shots:G.shots,ctx:c?{firstHit:c.firstHitId,potted:c.potted.map(x=>x.id),cue:c.cuePotted,rails:c.railAfterContact,isBreak:c.isBreak}:null}}")
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    c=b.new_context(viewport={'width':1300,'height':850})
    A=c.new_page();A.on('pageerror',lambda e:errs.append('A:'+str(e)[:120]))
    B=c.new_page();B.on('pageerror',lambda e:errs.append('B:'+str(e)[:120]))
    boot(A);boot(B)
    A.click('[data-action="online"]');A.wait_for_timeout(300)
    A.click('#online-create');A.wait_for_timeout(2500)
    code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(2500)
    # 第一杆：正常开球
    A.evaluate("()=>{const G=window.__PROPOOL__.game;G.aimAngle=0.02;return G.shoot(0.9,0,0)}")
    for _ in range(120):
        if all(g.evaluate("()=>window.__PROPOOL__.game.phase")=='aim' for g in [A,B]):break
        A.wait_for_timeout(150)
    A.wait_for_timeout(600)
    # 两端同步摆球：母球正对球堆，力度小到球散但不进袋
    for g in [A,B]: g.evaluate("()=>{const w=window.__PROPOOL__.game.world,c=w.getBall('cue'),b=w.getBall('b1');c.x=0.635;c.y=1.15;b.x=0.635;b.y=0.75}")
    r=A.evaluate("()=>{const G=window.__PROPOOL__.game;G.aimAngle=-Math.PI/2;return G.shoot(0.35,0,0)}")
    print('SHOT:',r)
    for _ in range(120):
        if all(g.evaluate('()=>window.__PROPOOL__.game.phase')=='aim' for g in [A,B]):break
        A.wait_for_timeout(150)
    A.wait_for_timeout(1200)
    print('A:',json.dumps(st(A),ensure_ascii=False))
    print('B:',json.dumps(st(B),ensure_ascii=False))
    print('A_BIH:',st(A)['bih'],'B_BIH:',st(B)['bih'])
    print('ERRORS:',errs[:4])
    b.close()