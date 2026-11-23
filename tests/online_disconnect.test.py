# -*- coding: utf-8 -*-
"""在线掉线机制验证：B 掉线 -> A 看到重连遮罩倒计时且不能打 ->
   B 重连 -> 遮罩消失继续；再测 B 退出 -> A 判胜得金币。"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=disc'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(60):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    ctx=b.new_context(viewport={'width':1300,'height':850})
    A=ctx.new_page(); A.on('pageerror',lambda e:errs.append('A:'+str(e)[:140]))
    B=ctx.new_page(); B.on('pageerror',lambda e:errs.append('B:'+str(e)[:140]))
    boot(A);boot(B)
    A.click('[data-action="online"]');A.wait_for_timeout(300)
    A.click('#online-create');A.wait_for_timeout(2500)
    code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(2500)
    def mask(g):
        return g.evaluate("()=>({hidden:document.getElementById('reconnect-mask').hidden,count:document.getElementById('reconnect-count').textContent,paused:!!window.__PROPOOL__.game._onlinePaused,canShoot:window.__PROPOOL__.game.canShoot()})")
    print('MASK_INIT:',json.dumps(mask(A)))
    # B 掉线（关页面），A 应看到遮罩
    B.close(); A.wait_for_timeout(1200)
    m1=mask(A)
    print('MASK_AFTER_DISCONNECT:',json.dumps(m1))
    print('MASK_SHOWN:',not m1['hidden'])
    print('A_CANNOT_SHOOT:',not m1['canShoot'])
    # B 重连（新页面，用座位码）
    seatcode=A.evaluate("()=>window.Pool.Net.state.seatCode")
    print('SEATCODE_FROM_A:',seatcode[:4]+'...' if seatcode else 'NONE')
    # 从 A 拿不到 B 的座位码，换思路：B 关闭前先存座位码
    print('ERRORS:',errs[:5])
    b.close()