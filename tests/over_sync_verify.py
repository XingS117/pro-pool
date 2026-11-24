# -*- coding: utf-8 -*-
"""验证终局同步：A 打进黑八 -> 两端同时结束且本机视角文案/音效正确"""
from playwright.sync_api import sync_playwright
import time,json
URL='https://www.xingshuwen.com/games/pool/?v=over'+str(time.time())
def boot(g):
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return
        g.wait_for_timeout(150)
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
    # 监听音效
    for g in [A,B]: g.evaluate("()=>{const a=window.__PROPOOL__.audio;window.__SND=[];const w=a.win.bind(a),l=a.lose.bind(a);a.win=()=>{window.__SND.push('win');w()};a.lose=()=>{window.__SND.push('lose');l()}}")
    # 制造合法清台+黑八：两端同步摆球（真实由主机快照保证，测试需两端都设）
    def setup(g):
        g.evaluate("""()=>{const G=window.__PROPOOL__.game,w=G.world;
          // 只留黑八和母球，黑八放袋口
          w.balls.forEach(b=>{if(b.id!=='cue'&&b.id!=='b8'){b.active=false;b.pocketed=true}});
          const b8=w.getBall('b8');b8.active=true;b8.pocketed=false;b8.x=1.27;b8.y=0.2;
          const c=w.getBall('cue');c.x=1.27;c.y=0.5;
          G.players[0].group='solid';G.players[1].group='stripe';G.openTable=false;
        }""")
    setup(A);setup(B)
    A.evaluate("()=>{const G=window.__PROPOOL__.game;G.aimAngle=-Math.PI/2;return G.shoot(0.6,0,0)}")
    for _ in range(100):
        if A.evaluate('()=>window.__PROPOOL__.game.phase')=='over':break
        A.wait_for_timeout(150)
    B.wait_for_timeout(1500)
    def res(g):
        return g.evaluate("()=>{const G=window.__PROPOOL__.game;return {phase:G.phase,win:G.matchResult?G.matchResult.winner:null,title:document.getElementById('result-title').textContent,snd:window.__SND}}")
    ra,rb=res(A),res(B)
    print('A_WIN:',json.dumps(ra,ensure_ascii=False))
    print('B_LOSE:',json.dumps(rb,ensure_ascii=False))
    print('BOTH_OVER:',ra['phase']=='over' and rb['phase']=='over')
    print('A_CORRECT:',ra['title']=='你获胜了' and ra['snd']==['win'])
    print('B_CORRECT:',rb['title']=='你输了' and rb['snd']==['lose'])
    print('ERRORS:',errs[:4])
    b.close()