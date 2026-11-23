# -*- coding: utf-8 -*-
"""掉线完整流程：B掉线->A等待(不能打)->B重连->继续；再B退出->A判胜+积分"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=disc2'+str(time.time())
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
    bseat=B.evaluate("()=>window.Pool.Net.state.seatCode")
    def state(g):
        return g.evaluate("()=>{const G=window.__PROPOOL__.game;return {mask:!document.getElementById('reconnect-mask').hidden,count:document.getElementById('reconnect-count').textContent,paused:!!G._onlinePaused,canShoot:G.canShoot(),phase:G.phase,coins:G.save.coins}}")
    coins0=A.evaluate('()=>window.__PROPOOL__.game.save.coins')
    # --- 阶段1：B 掉线再重连 ---
    A.evaluate("()=>{window.__MSGS=[];window.Pool.Net.on('message',m=>window.__MSGS.push(m.type))}")
    B.close(); A.wait_for_timeout(1200)
    s1=state(A)
    print('AFTER_DISCONNECT:',json.dumps(s1))
    print('LOCK_OK:',s1['mask'] and not s1['canShoot'])
    B=ctx.new_page(); B.on('pageerror',lambda e:errs.append('B2:'+str(e)[:140]))
    boot(B)
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    rejoin=B.evaluate("async ()=>{try{const r=await window.Pool.Net.rejoin('"+code+"','"+bseat+"');return {ok:true,r:r}}catch(e){return {ok:false,e:String(e)}}}")
    print('REJOIN_RESULT:',json.dumps(rejoin,ensure_ascii=False))
    A.wait_for_timeout(2500)
    s2=state(A)
    print('A_MSGS:',json.dumps(A.evaluate('()=>window.__MSGS'))) 
    print('AFTER_RECONNECT:',json.dumps(s2))
    print('RESUME_OK:',not s2['mask'] and s2['canShoot'])
    # --- 阶段2：B 主动退出 -> A 判胜 ---
    B.evaluate("()=>window.Pool.Net.leave()")
    A.wait_for_timeout(1500)
    s3=state(A)
    coins1=A.evaluate('()=>window.__PROPOOL__.game.save.coins')
    result=A.evaluate("()=>window.__PROPOOL__.game.matchResult")
    print('AFTER_LEAVE:',json.dumps(s3))
    print('RESULT:',json.dumps(result))
    print('WIN_FORFEIT:',result and result.get('winner')==0)
    print('COINS_AWARDED:',coins1>coins0,coins0,'->',coins1)
    print('ERRORS:',errs[:5])
    b.close()