# -*- coding: utf-8 -*-
"""验证：退出后被拉回游戏 bug + 倒计时两端同步 + 房间号清理"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=fix'+str(time.time())
errs=[]
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def view(g):
    return g.evaluate("()=>({screen:[...document.querySelectorAll('#screens .screen')].filter(e=>e.classList.contains('active')).map(e=>e.id),roomHidden:document.getElementById('online-room').hidden,roomCode:document.getElementById('online-room-code').textContent,phase:window.__PROPOOL__.game.phase,tt:+(window.__PROPOOL__.game.turnTime||0).toFixed(1)})")
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    c=b.new_context(viewport={'width':1300,'height':850})
    A=c.new_page();A.on('pageerror',lambda e:errs.append('A:'+str(e)[:120]))
    B=c.new_page();B.on('pageerror',lambda e:errs.append('B:'+str(e)[:120]))
    boot(A);boot(B)
    A.click('[data-action="online"]');A.wait_for_timeout(300)
    A.click('#online-create');A.wait_for_timeout(2500)
    code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(2500)
    # 倒计时同步：两端 turnTime 差应 <1.5s
    print('TIMER_SYNC:',json.dumps(view(A)),json.dumps(view(B)),'diff',abs(view(A)['tt']-view(B)['tt']))
    # 结束对局 -> A 点再来一局 -> A 返回主菜单 -> B 不点
    A.evaluate("()=>window.__PROPOOL__.game.finishMatch(0,'测试')")
    B.wait_for_timeout(900)
    A.click('[data-action="rematch"]');A.wait_for_timeout(500)
    print('A_WAIT:',json.dumps(view(A),ensure_ascii=False))
    A.evaluate("()=>{const b=[...document.querySelectorAll('[data-action=\"menu\"]')].find(e=>e.offsetParent);if(b)b.click()}");A.wait_for_timeout(1000)
    print('A_AFTER_MENU:',json.dumps(view(A),ensure_ascii=False))
    B.wait_for_timeout(2500)
    print('A_STILL_MENU:',all(x not in ['game','result'] for x in view(A)['screen']),json.dumps(view(A),ensure_ascii=False))
    print('ROOM_CLEARED:',view(A)['roomHidden'],view(B)['roomHidden'])
    print('ERRORS:',errs[:5])
    b.close()