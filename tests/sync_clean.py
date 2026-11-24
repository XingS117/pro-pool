# -*- coding: utf-8 -*-
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=clean'+str(time.time())
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(60):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def snap(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game;return {phase:G.phase,shots:G.shots,balls:G.world.balls.filter(b=>b.active).map(b=>[b.id,+b.x.toFixed(6),+b.y.toFixed(6)])}}")
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    ctx=b.new_context(viewport={'width':1300,'height':850})
    A=ctx.new_page();B=ctx.new_page()
    errs=[];A.on('pageerror',lambda e:errs.append('A:'+str(e)[:100]));B.on('pageerror',lambda e:errs.append('B:'+str(e)[:100]))
    boot(A);boot(B)
    A.click('[data-action="online"]');A.wait_for_timeout(300)
    A.click('#online-create');A.wait_for_timeout(2500)
    code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(2500)
    print('PRE_SYNC:',snap(A)==snap(B))
    A.evaluate("()=>{const G=window.__PROPOOL__.game,w=G.world,b=w.getBall('b1'),c=w.getBall('cue');b.x=1.27;b.y=0.18;c.x=1.27;c.y=0.45;G.aimAngle=-Math.PI/2;return G.shoot(0.55,0,0)}")
    # 等到 B 也结算完成（phase=aim 且 shots=1）
    for _ in range(120):
        sb=snap(B)
        if sb['phase']=='aim' and sb['shots']==1:break
        B.wait_for_timeout(200)
    A.wait_for_timeout(600)
    sa,sb=snap(A),snap(B)
    print('A_PHASE/SHOTS:',sa['phase'],sa['shots'],'B:',sb['phase'],sb['shots'])
    print('BALLS_SYNC:',sa['balls']==sb['balls'])
    if sa['balls']!=sb['balls']:
        for x,y in zip(sa['balls'],sb['balls']):
            if x!=y:print('DIFF:',x,y)
    print('ERRORS:',errs[:4])
    b.close()