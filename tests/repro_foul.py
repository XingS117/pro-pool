# -*- coding: utf-8 -*-
"""复现：母球落袋(犯规)后两端的回合/自由球状态，检查是否双方都能打"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=foul'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(60):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def st(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game,c=G.world.getBall('cue');return {seat:G.onlineSeat,turn:G.activePlayer,human:G.isHumanTurn(),phase:G.phase,bih:G.ballInHand,canShoot:G.canShoot(),cueActive:c&&c.active,cuePos:c?[+c.x.toFixed(3),+c.y.toFixed(3)]:null}}")
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
    print('INIT_A:',json.dumps(st(A)))
    print('INIT_B:',json.dumps(st(B)))
    # 制造母球落袋：把母球放到顶中袋口，向下打（母球进袋）。两端需同样设置 -> 用 A 设置后出杆，B 收到参数但局面是各自本地的初始局面
    # 先让 A 在台面上把母球摆到顶中袋口附近再出杆
    a=A.evaluate("()=>{const G=window.__PROPOOL__.game,c=G.world.getBall('cue');c.x=1.27;c.y=0.16;G.aimAngle=-Math.PI/2;return G.shoot(0.5,0,0)}")
    print('A_SHOT:',a)
    # 等两边结算
    for _ in range(100):
        if A.evaluate('()=>window.__PROPOOL__.game.phase')=='aim' and B.evaluate('()=>window.__PROPOOL__.game.phase')=='aim':break
        A.wait_for_timeout(200)
    sa,sb=st(A),st(B)
    print('AFTER_A:',json.dumps(sa))
    print('AFTER_B:',json.dumps(sb))
    print('A_CAN:',sa['canShoot'],'B_CAN:',sb['canShoot'])
    print('BOTH_CAN_PLAY:',sa['canShoot'] and sb['canShoot'])
    print('ERRORS:',errs[:4])
    b.close()