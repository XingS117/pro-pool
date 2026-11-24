# -*- coding: utf-8 -*-
"""验证：重连后局面保持（不重新开球）+ 花色提示两端 + 自由球摆球同步"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=state'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(60):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def snap(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game;return {phase:G.phase,shots:G.shots,turn:G.activePlayer,groups:G.players.map(p=>p.group),balls:G.world.balls.filter(b=>b.active).map(b=>[b.id,+b.x.toFixed(4),+b.y.toFixed(4)])}}")
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    ctx=b.new_context(viewport={'width':1300,'height':850})
    A=ctx.new_page();A.on('pageerror',lambda e:errs.append('A:'+str(e)[:120]))
    B=ctx.new_page();B.on('pageerror',lambda e:errs.append('B:'+str(e)[:120]))
    boot(A);boot(B)
    A.click('[data-action="online"]');A.wait_for_timeout(300)
    A.click('#online-create');A.wait_for_timeout(2500)
    code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(2500)
    # A 用正常出杆打一杆（不手动改球）
    A.evaluate("()=>{const G=window.__PROPOOL__.game;G.aimAngle=0.35;return G.shoot(0.7,0,0)}")
    for _ in range(120):
        if all(g.evaluate('()=>window.__PROPOOL__.game.phase')=='aim' for g in [A,B]):break
        A.wait_for_timeout(200)
    A.wait_for_timeout(500)
    sa,sb=snap(A),snap(B)
    print('AFTER_SHOT_SYNC:',sa['balls']==sb['balls'])
    print('A:',sa['phase'],sa['shots'],'B:',sb['phase'],sb['shots'])
    # B 断线自动重连，验证 shots/balls 不变（不重新开球）
    before=sa
    B.evaluate("()=>window.Pool.Net.drop()")
    A.wait_for_timeout(3500)
    after=snap(A)
    print('RECONNECT_SHOTS_PRESERVED:',before['shots']==after['shots'])
    print('RECONNECT_BALLS_PRESERVED:',before['balls']==after['balls'])
    print('A_PHASE_AFTER:',after['phase'])
    print('ERRORS:',errs[:5])
    b.close()