from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=bug'+str(time.time())
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def s(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game;return {seat:G.onlineSeat,turn:G.activePlayer,tt:+(G.turnTime||0).toFixed(1),timed:!!G._turnTimedOut,bih:G.ballInHand,free:G.freeBallSeat,phase:G.phase,paused:G.paused,op:!!G._onlinePaused}}")
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    c=b.new_context(viewport={'width':1300,'height':850})
    A=c.new_page();B=c.new_page()
    errs=[];A.on('pageerror',lambda e:errs.append('A:'+str(e)[:120]));B.on('pageerror',lambda e:errs.append('B:'+str(e)[:120]))
    boot(A);boot(B)
    A.click('[data-action="online"]');A.wait_for_timeout(300)
    A.click('#online-create');A.wait_for_timeout(2500)
    code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(2500)
    for g in [A,B]: g.evaluate("()=>{window.__M=[];window.Pool.Net.on('message',m=>window.__M.push(m.type))}")
    # 制造犯规：A 空杆 -> B 自由球
    A.evaluate("()=>{const G=window.__PROPOOL__.game;G.aimAngle=Math.PI/2;return G.shoot(0.3,0,0)}")
    for _ in range(120):
        if all(g.evaluate('()=>window.__PROPOOL__.game.phase')=='aim' for g in [A,B]):break
        A.wait_for_timeout(150)
    A.wait_for_timeout(1000)
    print('AFTER_FOUL_A:',json.dumps(s(A)));print('AFTER_FOUL_B:',json.dumps(s(B)))
    # B 有自由球，不动它，把 B 的 turnTime 设到超时
    B.evaluate("()=>window.__PROPOOL__.game.turnTime=44.6")
    B.wait_for_timeout(2000)
    print('AFTER_TIMEOUT_A:',json.dumps(s(A)));print('AFTER_TIMEOUT_B:',json.dumps(s(B)))
    print('A_MSGS:',A.evaluate('()=>window.__M'),'B_MSGS:',B.evaluate('()=>window.__M'))
    print('ERRORS:',errs[:4])
    b.close()