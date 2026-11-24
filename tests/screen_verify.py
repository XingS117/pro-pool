from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=screen'+str(time.time())
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
def screen(g):
    return g.evaluate("()=>({vs:document.getElementById('turn-label').textContent,toast:(document.querySelector('.toast-text,.toast')||{}).textContent||'',name0:document.getElementById('player-name-0').textContent,name1:document.getElementById('player-name-1').textContent,a0:document.getElementById('player-card-0').classList.contains('is-active'),a1:document.getElementById('player-card-1').classList.contains('is-active'),turn:window.__PROPOOL__.game.activePlayer})")
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
    print('INIT_SCREEN_A:',json.dumps(screen(A),ensure_ascii=False))
    print('INIT_SCREEN_B:',json.dumps(screen(B),ensure_ascii=False))
    # A(电脑) 打一杆换手到 B(手机)
    A.evaluate("()=>{const G=window.__PROPOOL__.game;G.aimAngle=0.02;return G.shoot(0.75,0,0)}")
    for _ in range(120):
        if all(g.evaluate('()=>window.__PROPOOL__.game.phase')=='aim' for g in [A,B]):break
        A.wait_for_timeout(150)
    A.wait_for_timeout(2200)
    sa,sb=screen(A),screen(B)
    print('AFTER_A_SCREEN_A:',json.dumps(sa,ensure_ascii=False))
    print('AFTER_A_SCREEN_B:',json.dumps(sb,ensure_ascii=False))
    print('VS_A_SHOULD_OPPONENT:',sa['vs'] in ('对手回合','对手击球中','犯规 · 自由球'))
    print('VS_B_SHOULD_YOU:',sb['vs'] in ('你的回合','你击球中'))
    b.close()