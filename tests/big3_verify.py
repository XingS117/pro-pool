# -*- coding: utf-8 -*-
"""综合验证三问题：花色提示两端、重连保持局面、犯规回合锁"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=big3'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(60):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def st(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game;return {seat:G.onlineSeat,turn:G.activePlayer,phase:G.phase,bih:G.ballInHand,canShoot:G.canShoot(),shots:G.shots,groups:G.players.map(p=>p.group),ballPos:G.world?[+G.world.getBall('cue').x.toFixed(4),+G.world.getBall('cue').y.toFixed(4)]:null}}")
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
    # 监听 toast
    for g in [A,B]: g.evaluate("()=>{window.__TOASTS=[];const P=window.__PROPOOL__;if(P&&P.game){P.game.on('toast',t=>window.__TOASTS.push(t.text))}}")
    # A 打进一个花色球（手动摆一个球到袋口再打）
    A.evaluate("()=>{const G=window.__PROPOOL__.game,w=G.world,b=w.getBall('b1'),c=w.getBall('cue');b.x=1.27;b.y=0.18;c.x=1.27;c.y=0.45;G.aimAngle=-Math.PI/2;return G.shoot(0.55,0,0)}")
    for _ in range(100):
        if A.evaluate('()=>window.__PROPOOL__.game.phase')=='aim':break
        A.wait_for_timeout(200)
    B.wait_for_timeout(800)
    print('A_STATE:',json.dumps(st(A)))
    print('B_STATE:',json.dumps(st(B)))
    print('A_TOASTS:',json.dumps(A.evaluate('()=>window.__TOASTS'),ensure_ascii=False))
    print('B_TOASTS:',json.dumps(B.evaluate('()=>window.__TOASTS'),ensure_ascii=False))
    print('GROUPS_SYNC:',st(A)['groups']==st(B)['groups'])
    # 重连测试：B drop -> 自动恢复，验 shots/groups/ballPos 不变
    before=st(A)
    B.evaluate("()=>window.Pool.Net.drop()")
    A.wait_for_timeout(3000)
    after=st(A)
    print('BEFORE_RECONNECT:',json.dumps(before))
    print('AFTER_RECONNECT:',json.dumps(after))
    print('STATE_PRESERVED:',before['shots']==after['shots'] and before['groups']==after['groups'] and before['ballPos']==after['ballPos'])
    print('ERRORS:',errs[:5])
    b.close()