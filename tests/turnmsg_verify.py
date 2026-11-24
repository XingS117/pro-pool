from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=turnmsg'+str(time.time())
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    c=b.new_context(viewport={'width':1300,'height':850})
    A=c.new_page();B=c.new_page()
    boot(A);boot(B)
    A.click('[data-action="online"]');A.wait_for_timeout(300)
    A.click('#online-create');A.wait_for_timeout(2500)
    code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(2500)
    for g in [A,B]: g.evaluate("()=>{window.__T=[];window.__PROPOOL__.game.on('toast',t=>window.__T.push(t.text))}")
    # A 打一杆没进球 -> 换到 B
    A.evaluate("()=>{const G=window.__PROPOOL__.game;G.aimAngle=Math.PI/2;return G.shoot(0.4,0,0)}")
    for _ in range(100):
        if all(g.evaluate('()=>window.__PROPOOL__.game.phase')=='aim' for g in [A,B]):break
        A.wait_for_timeout(150)
    A.wait_for_timeout(800)
    ta=A.evaluate('()=>window.__T'); tb=B.evaluate('()=>window.__T')
    print('A_TOASTS:',json.dumps(ta,ensure_ascii=False))
    print('B_TOASTS:',json.dumps(tb,ensure_ascii=False))
    print('A_SAYS_OPPONENT:',any('对手' in x for x in ta))
    print('B_SAYS_YOU:',any('轮到你' in x for x in tb))
    b.close()