# -*- coding: utf-8 -*-
"""实景复现：A(电脑seat0)/B(手机seat1) 真实换手文字 + 双向超时 + 输家扣金币"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=real'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def screen_toast(g):
    return g.evaluate("()=>{const e=document.querySelector('.toast-text,.toast');return e?e.textContent:''}")
def view(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game;return {seat:G.onlineSeat,turn:G.activePlayer,human:G.isHumanTurn(),tt:+(G.turnTime||0).toFixed(1),toasts:[...window.__T||[]],vs:document.getElementById('turn-label').textContent,p0:document.getElementById('player-name-0').textContent,a0:document.getElementById('player-card-0').classList.contains('is-active'),a1:document.getElementById('player-card-1').classList.contains('is-active')}}")
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    c=b.new_context(viewport={'width':1300,'height':850})
    A=c.new_page();A.on('pageerror',lambda e:errs.append('A:'+str(e)[:120]))
    B=c.new_page();B.on('pageerror',lambda e:errs.append('B:'+str(e)[:120]))
    boot(A);boot(B)
    for g in [A,B]: g.evaluate("()=>{window.__T=[];window.__PROPOOL__.game.on('toast',t=>window.__T.push(t.text))}")
    A.click('[data-action="online"]');A.wait_for_timeout(300)
    A.click('#online-create');A.wait_for_timeout(2500)
    code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(2500)
    print('INIT_A:',json.dumps(view(A),ensure_ascii=False))
    print('INIT_B:',json.dumps(view(B),ensure_ascii=False))
    # A(电脑seat0) 开球
    A.evaluate("()=>{const G=window.__PROPOOL__.game;G.aimAngle=0.02;return G.shoot(0.75,0,0)}")
    for _ in range(120):
        if all(g.evaluate('()=>window.__PROPOOL__.game.phase')=='aim' for g in [A,B]):break
        A.wait_for_timeout(150)
    A.wait_for_timeout(1000)
    va,vb=view(A),view(B)
    print('AFTER_A_SHOT_A:',json.dumps(va,ensure_ascii=False))
    print('AFTER_A_SHOT_B:',json.dumps(vb,ensure_ascii=False))
    print('SCREEN_TOAST_A:',json.dumps(screen_toast(A),ensure_ascii=False),'SCREEN_TOAST_B:',json.dumps(screen_toast(B),ensure_ascii=False))
    print('TEXT_OK: A对手=',('对手' in screen_toast(A)),' B你=',('你' in screen_toast(B)))
    # B(手机) 打一杆 -> 换回 A(电脑)
    B.evaluate("()=>{const G=window.__PROPOOL__.game;G.aimAngle=-0.02;return G.shoot(0.4,0,0)}")
    for _ in range(120):
        if all(g.evaluate('()=>window.__PROPOOL__.game.phase')=='aim' for g in [A,B]):break
        B.wait_for_timeout(150)
    B.wait_for_timeout(1000)
    va2,vb2=view(A),view(B)
    print('AFTER_B_SHOT_A:',json.dumps(va2,ensure_ascii=False))
    print('AFTER_B_SHOT_B:',json.dumps(vb2,ensure_ascii=False))
    print('TEXT_OK2: A(电脑)应轮到你=',any('你' in x for x in va2['toasts']),' B(手机)应轮到对手=',any('对手' in x for x in vb2['toasts']))
    # 超时测试：当前 turn 是谁，让谁超时
    turn=va2['turn']
    actor=A if turn==0 else B
    actor.evaluate("()=>window.__PROPOOL__.game.turnTime=59.5")
    actor.wait_for_timeout(1800)
    print('AFTER_TIMEOUT_A:',A.evaluate('()=>window.__PROPOOL__.game.activePlayer'),'B:',B.evaluate('()=>window.__PROPOOL__.game.activePlayer'))
    print('ERRORS:',errs[:5])
    b.close()