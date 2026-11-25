from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=fs'+str(time.time())
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    g=c.new_page();g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):break
        g.wait_for_timeout(150)
    g.click('[data-action="pvp"]');g.wait_for_timeout(500)
    def pos():return g.evaluate("()=>{const e=document.querySelector('.hud-bottom'),r=e.getBoundingClientRect(),cs=getComputedStyle(e);return {bottom:cs.bottom,vh:innerHeight,top:Math.round(r.top),h:Math.round(r.height),cls:document.body.className,fsOn:!!document.fullscreenElement}}")
    print('NORMAL',json.dumps(pos()))
    g.click('#btn-fullscreen');g.wait_for_timeout(700)
    print('FULLSCREEN',json.dumps(pos()))
    b.close()