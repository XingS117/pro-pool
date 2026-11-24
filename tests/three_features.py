# -*- coding: utf-8 -*-
"""验证三功能：犯规自由球归属、暂停同步、45秒倒计时读秒"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=three'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def st(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game,c=G.world.getBall('cue');return {seat:G.onlineSeat,turn:G.activePlayer,human:G.isHumanTurn(),bih:G.ballInHand,freeSeat:G.freeBallSeat,canShoot:G.canShoot(),turnTime:Math.round(G.turnTime||0),pauseMask:!document.getElementById('pause-mask').hidden,timerHidden:document.getElementById('turn-timer').hidden,timerNum:document.getElementById('turn-timer-num').textContent}}")
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
    # --- 功能1：犯规母球落袋 -> 换手方自由球 ---
    for g in [A,B]: g.evaluate("()=>{const w=window.__PROPOOL__.game.world,c=w.getBall('cue');c.x=1.27;c.y=0.16}")
    A.evaluate("()=>{const G=window.__PROPOOL__.game;G.aimAngle=-Math.PI/2;return G.shoot(0.5,0,0)}")
    for _ in range(120):
        if all(g.evaluate('()=>window.__PROPOOL__.game.phase')=='aim' for g in [A,B]):break
        A.wait_for_timeout(150)
    A.wait_for_timeout(1200)
    sa,sb=st(A),st(B)
    print('FOUL_A:',json.dumps(sa))
    print('FOUL_B:',json.dumps(sb))
    print('FOUL_FREEBALL_TO_B:',sb['bih'] and sb['human'] and not sa['bih'])
    # --- 功能3：倒计时（把 turnTime 直接设为 38，剩7秒应显示读秒）---
    # 先让 B 摆球结束自由球，进入 aim 计时
    if sb['bih']: B.evaluate("()=>window.__PROPOOL__.game.placeCueAt(0.635,0.95)"); A.wait_for_timeout(600)
    B.evaluate("()=>{window.__PROPOOL__.game.turnTime=38}")
    B.wait_for_timeout(300)
    sb2=st(B)
    print('TIMER:',json.dumps(sb2))
    print('TIMER_SHOW_AT_7S:',not sb2['timerHidden'] and 6<=int(sb2['timerNum'])<=8)
    # --- 功能2：A 暂停 -> B 显示对方暂停且不能打 ---
    A.evaluate("()=>window.__PROPOOL__.game.pause()")
    B.wait_for_timeout(700)
    sb3=st(B)
    print('PAUSE_B:',json.dumps(sb3))
    print('PAUSE_SHOWN_AND_LOCKED:',sb3['pauseMask'] and not sb3['canShoot'])
    A.evaluate("()=>window.__PROPOOL__.game.resume()")
    B.wait_for_timeout(700)
    sb4=st(B)
    print('RESUME_B:',json.dumps(sb4))
    print('PAUSE_CLEARED:',not sb4['pauseMask'] and sb4['canShoot'])
    print('ERRORS:',errs[:5])
    b.close()