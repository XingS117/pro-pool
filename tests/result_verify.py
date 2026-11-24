# -*- coding: utf-8 -*-
"""验证胜负文案与音效：手机端(seat1)赢显示'你获胜了'+胜利音；电脑端(seat0)输显示'你输了'+失败音"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=result'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(60):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
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
    # 监听音效调用
    for g in [A,B]:
        g.evaluate("()=>{const a=window.__PROPOOL__.audio;window.__SND=[];const w=a.win.bind(a),l=a.lose.bind(a);a.win=()=>{window.__SND.push('win');w()};a.lose=()=>{window.__SND.push('lose');l()}}")
    # B(seat1) 判胜：模拟对方超时离开 -> 双方 receive opponent_left? 只让 B 端 finishMatch(1)
    B.evaluate("()=>window.__PROPOOL__.game.finishMatch(1,'对手重连超时，判负')")
    A.evaluate("()=>window.__PROPOOL__.game.finishMatch(1,'对手重连超时，判负')")
    B.wait_for_timeout(900);A.wait_for_timeout(400)
    def result(g):
        return g.evaluate("()=>({title:document.getElementById('result-title').textContent,sub:document.getElementById('result-sub').textContent,snd:window.__SND,loseClass:document.querySelector('#screen-result .modal').classList.contains('result-lose')})")
    rb,ra=result(B),result(A)
    print('B(seat1,胜):',json.dumps(rb,ensure_ascii=False))
    print('A(seat0,负):',json.dumps(ra,ensure_ascii=False))
    print('B_CORRECT:',rb['title']=='你获胜了' and rb['snd']==['win'] and not rb['loseClass'])
    print('A_CORRECT:',ra['title']=='你输了' and ra['snd']==['lose'] and ra['loseClass'])
    print('ERRORS:',errs[:4])
    b.close()