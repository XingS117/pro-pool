from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=size'+str(time.time())
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    g=c.new_page();g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):break
        g.wait_for_timeout(150)
    g.click('[data-action="pvp"]');g.wait_for_timeout(500)
    def m():return g.evaluate("()=>({hud:document.querySelector('.hud-bottom').getBoundingClientRect().toJSON(),canvas:document.getElementById('game-canvas').getBoundingClientRect().toJSON(),vw:innerWidth,vh:innerHeight,dpr:devicePixelRatio})")
    print('NORMAL:',json.dumps(m()))
    g.click('#btn-fullscreen');g.wait_for_timeout(700)
    print('FULL:',json.dumps(m()))
    b.close()