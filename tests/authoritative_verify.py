# -*- coding: utf-8 -*-
"""验证 state_sync 权威纠正：制造两端分叉，看是否自动对齐"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=auth'+str(time.time())
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def ball(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game;return {shots:G.shots,turn:G.activePlayer,cue:[+G.world.getBall('cue').x.toFixed(5),+G.world.getBall('cue').y.toFixed(5)],phase:G.phase}}")
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    c=b.new_context(viewport={'width':1300,'height':850})
    A=c.new_page();B=c.new_page()
    errs=[];A.on('pageerror',lambda e:errs.append(str(e)[:100]));B.on('pageerror',lambda e:errs.append(str(e)[:100]))
    boot(A);boot(B)
    A.click('[data-action="online"]');A.wait_for_timeout(300)
    A.click('#online-create');A.wait_for_timeout(2500)
    code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(2500)
    # 正常打一杆
    A.evaluate("()=>{const G=window.__PROPOOL__.game;G.aimAngle=0.05;return G.shoot(0.8,0,0)}")
    for _ in range(100):
        if all(g.evaluate('()=>window.__PROPOOL__.game.phase')=='aim' for g in [A,B]):break
        A.wait_for_timeout(150)
    A.wait_for_timeout(1500)
    print('AFTER_SHOT:',json.dumps(ball(A)),json.dumps(ball(B)))
    print('SYNC:',ball(A)==ball(B))
    # 制造人工分叉（模拟网络乱序残留）
    B.evaluate("()=>{window.__PROPOOL__.game.world.getBall('cue').x=0.9}")
    print('DIVERGED:',ball(A)!=ball(B))
    # A 再打一杆 -> 结算广播快照 -> B 应被纠正
    A.evaluate("()=>{const G=window.__PROPOOL__.game;G.aimAngle=-0.03;return G.shoot(0.6,0,0)}")
    for _ in range(100):
        if all(g.evaluate('()=>window.__PROPOOL__.game.phase')=='aim' for g in [A,B]):break
        A.wait_for_timeout(150)
    A.wait_for_timeout(1500)
    print('AFTER_CORRECT:',json.dumps(ball(A)),json.dumps(ball(B)))
    print('CORRECTED:',ball(A)==ball(B))
    print('ERRORS:',errs[:4])
    b.close()