# -*- coding: utf-8 -*-
"""验证暂停机制：甲暂停->乙显示遮罩+恢复按钮+倒计时->乙点恢复->双方恢复"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=pause'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def st(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game;return {turn:G.activePlayer,paused:G.paused,onlinePaused:!!G._onlinePaused,canShoot:G.canShoot(),pauseMask:!document.getElementById('pause-mask').hidden,cd:document.getElementById('pause-countdown').querySelector('b').textContent}}")
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
    print('B_PAUSE_NOTICE:',B.evaluate("()=>document.querySelector('#screen-pause .pause-notice')?'有':'无'"))
    B.evaluate("()=>{window.__M=[];window.Pool.Net.on('message',m=>window.__M.push(m.type+':'+m.paused))}")
    print("A_PAUSE_RETURN:",A.evaluate("()=>window.__PROPOOL__.game.pause()"))
    # A(seat0) 暂停
    A.evaluate("()=>window.__PROPOOL__.game.pause()")
    B.wait_for_timeout(800)
    sb=st(B)
    print('B_MSGS:',json.dumps(B.evaluate("()=>window.__M")))
    print('B_DIAG:',json.dumps(B.evaluate("()=>({mode:window.__PROPOOL__.game.mode,pmsgs:window.__PAUSEMSGS,online:(window.__ONLINE?{active:window.__ONLINE.active,mySeat:window.__ONLINE.mySeat,pausedBy:window.__ONLINE.pausedBySeat}:null),room:document.getElementById('online-room').hidden,code:document.getElementById('online-room-code').textContent,hud:!document.getElementById('hud').classList.contains('hidden')})")))
    print('AFTER_A_PAUSE_B:',json.dumps(sb))
    print('B_SHOWS_MASK_LOCKED:',sb['pauseMask'] and not sb['canShoot'])
    print('B_HAS_RESUME_BTN:',B.evaluate("()=>!!document.getElementById('pause-resume-btn')"))
    # B 点恢复游戏
    B.evaluate("()=>{const b=document.getElementById('pause-resume-btn');if(b&&b.offsetParent)b.click()}"); B.wait_for_timeout(900)
    print('AFTER_B_RESUME_A:',json.dumps(st(A)))
    print('AFTER_B_RESUME_B:',json.dumps(st(B)))
    print('BOTH_RESUMED:',not st(A)['paused'] and not st(B)['pauseMask'] and not st(B)['onlinePaused'])
    print('A_CAN_SHOOT_AFTER_RESUME:',st(A)['canShoot'])
    print('ERRORS:',errs[:5])
    b.close()