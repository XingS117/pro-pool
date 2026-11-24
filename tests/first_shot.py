# -*- coding: utf-8 -*-
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=first'+str(time.time())
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def ctx(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game,c=G.shotCtx;return {turn:G.activePlayer,shots:G.shots,phase:G.phase,ctx:c?{firstHit:c.firstHitId,potted:c.potted.map(x=>x.id),cue:c.cuePotted,rails:c.railAfterContact,break:c.isBreak,preGroup:c.preGroup}:null}}")
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    ctxb=b.new_context(viewport={'width':1300,'height':850})
    A=ctxb.new_page();B=ctxb.new_page()
    boot(A);boot(B)
    A.click('[data-action="online"]');A.wait_for_timeout(300)
    A.click('#online-create');A.wait_for_timeout(2500)
    code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(2500)
    print('BEFORE A:',json.dumps(ctx(A),ensure_ascii=False))
    print('BEFORE B:',json.dumps(ctx(B),ensure_ascii=False))
    # 用相同参数打第一杆
    r=A.evaluate("()=>{const G=window.__PROPOOL__.game;G.aimAngle=0.02;return G.shoot(0.95,0,0.1)}")
    print('SHOT:',r)
    for _ in range(150):
        if all(g.evaluate('()=>window.__PROPOOL__.game.phase')=='aim' for g in [A,B]):break
        A.wait_for_timeout(150)
    A.wait_for_timeout(800)
    print('AFTER A:',json.dumps(ctx(A),ensure_ascii=False))
    print('AFTER B:',json.dumps(ctx(B),ensure_ascii=False))
    b.close()