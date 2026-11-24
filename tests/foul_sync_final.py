# -*- coding: utf-8 -*-
"""验证犯规->自由球摆球->两端同步"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=foul2'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(60):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def st(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game,c=G.world.getBall('cue');return {turn:G.activePlayer,human:G.isHumanTurn(),bih:G.ballInHand,canShoot:G.canShoot(),cue:[+c.x.toFixed(4),+c.y.toFixed(4)]}}")
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
    # 制造母球落袋：两端都把母球摆到袋口（真实双方应自然一致，测试需两端同步设置）
    for g in [A,B]:
        g.evaluate("()=>{const w=window.__PROPOOL__.game.world,c=w.getBall('cue');c.x=1.27;c.y=0.16}")
    A.evaluate("()=>{const G=window.__PROPOOL__.game;G.aimAngle=-Math.PI/2;return G.shoot(0.5,0,0)}")
    for _ in range(120):
        if all(g.evaluate('()=>window.__PROPOOL__.game.phase')=='aim' for g in [A,B]):break
        A.wait_for_timeout(200)
    A.wait_for_timeout(600)
    print('AFTER_FOUL_A:',json.dumps(st(A)))
    print('AFTER_FOUL_B:',json.dumps(st(B)))
    # B 摆母球到新位置，A 应收到同步
    B.evaluate("()=>window.__PROPOOL__.game.placeCueAt(0.8,0.9)")
    A.wait_for_timeout(800)
    print('AFTER_PLACE_A:',json.dumps(st(A)))
    print('AFTER_PLACE_B:',json.dumps(st(B)))
    print('CUE_SYNC:',st(A)['cue']==st(B)['cue'])
    print('B_ONLY_CAN_PLACE:',not st(A)['bih'] and not st(A)['human'])
    print('ERRORS:',errs[:4])
    b.close()