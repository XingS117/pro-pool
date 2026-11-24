# -*- coding: utf-8 -*-
"""验证倒计时超时换手：设 turnTime=44.5 等超时，看 activePlayer 是否切换"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=to'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def st(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game;return {turn:G.activePlayer,tt:+(G.turnTime||0).toFixed(1),timed:!!G._turnTimedOut,phase:G.phase}}")
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
    # 监听消息
    for g in [A,B]: g.evaluate("()=>{window.__M=[];window.Pool.Net.on('message',m=>window.__M.push(m.type))}")
    print('BEFORE:',st(A),st(B))
    # A(turn0) 计时到 44.5
    A.evaluate("()=>window.__PROPOOL__.game.turnTime=44.5")
    A.wait_for_timeout(2000)
    print('AFTER1_A:',json.dumps(st(A)))
    print('AFTER1_B:',json.dumps(st(B)))
    print('A_MSGS:',A.evaluate('()=>window.__M'))
    print('B_MSGS:',B.evaluate('()=>window.__M'))
    print('SWITCHED:',st(A)['turn']==1 and st(B)['turn']==1)
    # 等待更久看是否二次触发
    A.wait_for_timeout(3000)
    print('AFTER2_A:',json.dumps(st(A)))
    print('ERRORS:',errs[:4])
    b.close()