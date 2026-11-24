# -*- coding: utf-8 -*-
"""验证：对战条本机视角、换手文字、倒计时换手、非开球不误判自由球"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=all'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def bar(g):
    return g.evaluate("()=>({c0:document.getElementById('player-name-0').textContent,c1:document.getElementById('player-name-1').textContent,a0:document.getElementById('player-card-0').classList.contains('is-active'),a1:document.getElementById('player-card-1').classList.contains('is-active'),turn:window.__PROPOOL__.game.activePlayer})")
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
    print('A_STATE:',A.evaluate("()=>({mode:window.__PROPOOL__.game.mode,seat:window.__PROPOOL__.game.onlineSeat,phase:window.__PROPOOL__.game.phase})"))
    print('A_BAR_INIT:',json.dumps(bar(A),ensure_ascii=False))
    print('B_BAR_INIT:',json.dumps(bar(B),ensure_ascii=False))
    print('BAR_ME_LEFT:',bar(A)['c0']=='我' and bar(B)['c0']=='我')
    # A 打一杆开球后换手
    A.evaluate("()=>{const G=window.__PROPOOL__.game;G.aimAngle=0.02;return G.shoot(0.7,0,0)}")
    for _ in range(120):
        if all(g.evaluate('()=>window.__PROPOOL__.game.phase')=='aim' for g in [A,B]):break
        A.wait_for_timeout(150)
    A.wait_for_timeout(1000)
    ba,bb=bar(A),bar(B)
    print('A_BAR_AFTER:',json.dumps(ba,ensure_ascii=False))
    print('B_BAR_AFTER:',json.dumps(bb,ensure_ascii=False))
    turn=A.evaluate('()=>window.__PROPOOL__.game.activePlayer')
    if turn==0:
        print('A_ACTIVE_LEFT:',ba['a0'],'B_ACTIVE_RIGHT:',bb['a1'])
    else:
        print('A_ACTIVE_RIGHT:',ba['a1'],'B_ACTIVE_LEFT:',bb['a0'])
    # 倒计时超时换手（设 44.5）
    g = A if turn==0 else B
    g.evaluate("()=>window.__PROPOOL__.game.turnTime=44.5")
    g.wait_for_timeout(1800)
    print('AFTER_TIMEOUT_TURN:',A.evaluate('()=>window.__PROPOOL__.game.activePlayer'),B.evaluate('()=>window.__PROPOOL__.game.activePlayer'))
    print('ERRORS:',errs[:5])
    b.close()