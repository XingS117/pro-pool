from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=to2'+str(time.time())
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def snap(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game;return {seat:G.onlineSeat,turn:G.activePlayer,tt:+(G.turnTime||0).toFixed(1),timed:!!G._turnTimedOut}}")
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    c=b.new_context(viewport={'width':1300,'height':850})
    A=c.new_page();B=c.new_page()
    errs=[];A.on('pageerror',lambda e:errs.append('A:'+str(e)[:100]));B.on('pageerror',lambda e:errs.append('B:'+str(e)[:100]))
    boot(A);boot(B)
    A.click('[data-action="online"]');A.wait_for_timeout(300)
    A.click('#online-create');A.wait_for_timeout(2500)
    code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(2500)
    for g in [A,B]: g.evaluate("()=>{window.__M=[];window.Pool.Net.on('message',m=>window.__M.push(m.type))}")
    print('INIT:',snap(A),snap(B))
    # 情况1：A(seat0,turn0) 超时
    A.evaluate("()=>window.__PROPOOL__.game.turnTime=44.6")
    A.wait_for_timeout(1500)
    print('A_TIMEOUT -> ',snap(A),snap(B))
    print('MSGS_A:',A.evaluate('()=>window.__M'),'MSGS_B:',B.evaluate('()=>window.__M'))
    # 情况2：B(seat1,turn1) 超时
    B.evaluate("()=>window.__PROPOOL__.game.turnTime=44.6")
    B.wait_for_timeout(1500)
    print('B_TIMEOUT -> ',snap(A),snap(B))
    print('MSGS_A2:',A.evaluate('()=>window.__M'),'MSGS_B2:',B.evaluate('()=>window.__M'))
    print('ERRORS:',errs[:4])
    b.close()