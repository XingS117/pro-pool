# -*- coding: utf-8 -*-
"""验证：输家不加金币/轮到提示视角/rematch协商/读秒音"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=multi'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def st(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game;return {seat:G.onlineSeat,phase:G.phase,win:G.matchResult?G.matchResult.winner:null,coins:G.save.coins,coinDelta:G.matchResult?G.matchResult.coinsDelta:null}}")
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
    # 1) 输家不加金币：A(seat0)赢、B(seat1)输
    coinsA=st(A)['coins'];coinsB=st(B)['coins']
    A.evaluate("()=>window.__PROPOOL__.game.finishMatch(0,'测试')")
    B.evaluate("()=>window.__PROPOOL__.game.finishMatch(0,'测试')")
    B.wait_for_timeout(800)
    sa,sb=st(A),st(B)
    print('WINNER_A:',json.dumps(sa),'delta',sa['coinDelta'])
    print('LOSER_B:',json.dumps(sb),'delta',sb['coinDelta'])
    print('COIN_CORRECT: winner+60=',sa['coinDelta']==60,' loser0=',sb['coinDelta']==0)
    # 2) rematch 协商：A 先点 -> 显示等待；B 再点 -> 双方开局
    A.click('[data-action="rematch"]'); A.wait_for_timeout(500)
    waitText=A.evaluate("()=>document.getElementById('result-actions').textContent")
    print('A_WAIT_TEXT:',json.dumps(waitText,ensure_ascii=False))
    print('A_SHOWS_WAIT:', '等待对方同意' in waitText)
    B.click('[data-action="rematch"]'); B.wait_for_timeout(2500)
    print('AFTER_REMATCH_A:',json.dumps(st(A)))
    print('AFTER_REMATCH_B:',json.dumps(st(B)))
    print('REMATCH_STARTED:',st(A)['phase']=='aim' and st(B)['phase']=='aim')
    # 3) 读秒音：设 turnTime=38.2，监听 audio.tick
    for g in [A,B]: g.evaluate("()=>{const a=window.__PROPOOL__.audio;window.__TICKS=0;const o=a.tick;a.tick=function(){window.__TICKS++;o.apply(a,arguments)}}")
    B.evaluate("()=>window.__PROPOOL__.game.turnTime=38.5") if st(B)['seat']==1 else A.evaluate("()=>window.__PROPOOL__.game.turnTime=38.5")
    actor = B if st(B)['seat']==1 else A
    # 让轮到的一方计时；先看 turn
    tr=A.evaluate('()=>window.__PROPOOL__.game.activePlayer')
    g=A if tr==0 else B
    g.evaluate("()=>window.__PROPOOL__.game.turnTime=38.5")
    g.wait_for_timeout(1400)
    print('TICKS:',g.evaluate('()=>window.__TICKS'))
    print('TICK_SOUND:',g.evaluate('()=>window.__TICKS')>0)
    print('ERRORS:',errs[:5])
    b.close()