# -*- coding: utf-8 -*-
"""验证真实断线自动重连：不调 Net.close()，直接断开底层 socket  simulate网络闪断"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=auto'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(60):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def st(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game;return {mask:!document.getElementById('reconnect-mask').hidden,canShoot:G.canShoot(),paused:!!G._onlinePaused,netConnected:window.Pool.Net.state.connected,room:window.Pool.Net.state.roomCode}}")
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    ctx=b.new_context(viewport={'width':1300,'height':850})
    A=ctx.new_page(); A.on('pageerror',lambda e:errs.append('A:'+str(e)[:120]))
    B=ctx.new_page(); B.on('pageerror',lambda e:errs.append('B:'+str(e)[:120]))
    boot(A);boot(B)
    A.click('[data-action="online"]');A.wait_for_timeout(300)
    A.click('#online-create');A.wait_for_timeout(2500)
    code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(2500)
    # 用 Net.drop() 模拟真实网络闪断（保留座位信息，不主动关闭）
    B.evaluate("()=>window.Pool.Net.drop()")
    A.wait_for_timeout(1600)
    print('A_AFTER_NETBREAK:',json.dumps(st(A)))
    print('B_AFTER_DROP:',json.dumps(st(B)))
    # B 应自动 rejoin
    A.wait_for_timeout(3500)
    print('A_AFTER_RECOVER:',json.dumps(st(A)))
    print('B_NET:',json.dumps(st(B)))
    print('AUTO_RECOVERED:',not st(A)['mask'] and st(A)['canShoot'])
    print('ERRORS:',errs[:5])
    b.close()