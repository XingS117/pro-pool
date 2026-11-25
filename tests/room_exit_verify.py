from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=roombug'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def view(g):
    return g.evaluate("()=>({screen:[...document.querySelectorAll('#screens .screen')].filter(e=>e.classList.contains('active')).map(e=>e.id),roomHidden:document.getElementById('online-room').hidden,code:document.getElementById('online-room-code').textContent,mode:window.__PROPOOL__.game.mode,phase:window.__PROPOOL__.game.phase})")
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    c=b.new_context(viewport={'width':1300,'height':850})
    A=c.new_page();B=c.new_page()
    A.on('pageerror',lambda e:errs.append('A:'+str(e)[:120]));B.on('pageerror',lambda e:errs.append('B:'+str(e)[:120]))
    boot(A);boot(B)
    A.click('[data-action="online"]');A.wait_for_timeout(300)
    A.click('#online-create');A.wait_for_timeout(2500)
    code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(2500)
    # 结束对局
    A.evaluate("()=>window.__PROPOOL__.game.finishMatch(0,'测试')")
    B.wait_for_timeout(900)
    # A 点再来一局，B 点返回主菜单
    A.click('[data-action="rematch"]');A.wait_for_timeout(400)
    B.evaluate("()=>{const b=[...document.querySelectorAll('[data-action=\"menu\"]')].find(e=>e.offsetParent);if(b)b.click()}");B.wait_for_timeout(600)
    # A 也返回主菜单
    A.evaluate("()=>{const b=[...document.querySelectorAll('[data-action=\"menu\"]')].find(e=>e.offsetParent);if(b)b.click()}");A.wait_for_timeout(600)
    print('AFTER_EXIT_A:',json.dumps(view(A),ensure_ascii=False))
    print('AFTER_EXIT_B:',json.dumps(view(B),ensure_ascii=False))
    # 等 4 秒（本地 3min 太长，先看是否立刻有残留消息）
    A.wait_for_timeout(4000)
    print('4S_LATER_A:',json.dumps(view(A),ensure_ascii=False))
    print('4S_LATER_B:',json.dumps(view(B),ensure_ascii=False))
    print('STILL_MENU:',all(x=='screen-menu' for x in view(A)['screen']) and all(x=='screen-menu' for x in view(B)['screen']))
    print('ERRORS:',errs[:4])
    b.close()