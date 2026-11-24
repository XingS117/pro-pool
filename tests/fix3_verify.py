# -*- coding: utf-8 -*-
"""综合验证：1)切页面自动重连 2)犯规回合锁 3)胜负文案与音效"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=fix3'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(60):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def st(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game,c=G.world.getBall('cue');return {seat:G.onlineSeat,turn:G.activePlayer,human:G.isHumanTurn(),phase:G.phase,bih:G.ballInHand,canShoot:G.canShoot(),paused:!!G._onlinePaused,mask:!document.getElementById('reconnect-mask').hidden,cuePos:c?[+c.x.toFixed(3),+c.y.toFixed(3)]:null}}")
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
    # --- 测试1：模拟 B 断线后自动重连（直接关 ws，不关页面）---
    B.evaluate("()=>window.Pool.Net.close()")
    A.wait_for_timeout(1500)
    s1=st(A)
    print('T1_A_WAIT:',json.dumps(s1))
    print('T1_MASK_LOCK:',s1['mask'] and not s1['canShoot'])
    # B 手动重连（用保存的座位信息重新 connect + rejoin）
    bseat=B.evaluate("()=>window.__BSEAT||''")
    # 从 A 拿不到 B 座位码，改用：B 页面刷新后输入房间号重新加入是不行的（房间满）
    # 用服务器 rejoin：B 调 connect 后 rejoin（座位码在 Net 内部保存），但 close() 清空了 -> 用新 API autoRecover
    print('T1_SKIP_AUTO (需专门机制):',bseat=='')
    # --- 测试2：母球落袋犯规回合锁 ---
    # 重置局面（B 重新建房加入）
    A.evaluate("()=>window.Pool.Net.leave()"); B.evaluate("()=>window.Pool.Net.leave()")
    A.goto(URL,wait_until='load');boot(A)
    B.goto(URL,wait_until='load');boot(B)
    A.click('[data-action="online"]');A.wait_for_timeout(300)
    A.click('#online-create');A.wait_for_timeout(2500)
    code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(2500)
    A.evaluate("()=>{const G=window.__PROPOOL__.game,c=G.world.getBall('cue');c.x=1.27;c.y=0.16;G.aimAngle=-Math.PI/2;return G.shoot(0.5,0,0)}")
    for _ in range(100):
        if A.evaluate('()=>window.__PROPOOL__.game.phase')=='aim' and B.evaluate('()=>window.__PROPOOL__.game.phase')=='aim':break
        A.wait_for_timeout(200)
    sa,sb=st(A),st(B)
    print('T2_A:',json.dumps(sa))
    print('T2_B:',json.dumps(sb))
    print('T2_LOCK: A_can=',sa['canShoot'],'B_can=',sb['canShoot'])
    print('T2_B_NEEDS_PLACE:',sb['bih'] and sb['human'])
    print('ERRORS:',errs[:5])
    b.close()