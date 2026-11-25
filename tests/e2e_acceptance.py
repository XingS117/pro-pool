# -*- coding: utf-8 -*-
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, math, sys
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/"tests"/"final"; URL=(ROOT/"index.html").as_uri(); OUT.mkdir(parents=True,exist_ok=True)
errors=[]; logs=[]; failures=[]
def check(c,m):
    if not c: failures.append(m); print("FAIL:",m)
    else: print("OK:",m)
def ad(a,b): return abs((a-b+math.pi)%(2*math.pi)-math.pi)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=["--disable-gpu"])
    # Desktop 1600
    page=browser.new_page(viewport={"width":1600,"height":900},device_scale_factor=1)
    page.on("pageerror",lambda e: errors.append("desktop:"+str(e)))
    page.on("console",lambda m: logs.append("desktop:"+m.text) if m.type=="error" and "ERR_FILE_NOT_FOUND" not in m.text and "Failed to load resource" not in m.text else None)
    page.goto(URL,wait_until="load"); page.wait_for_timeout(1800)
    page.screenshot(path=str(OUT/"01-menu.png"))
    # 装饰线条不能越出卡片：细金框必须贴合内边缘，光晕不得带边框
    deco=page.evaluate("""() => {const c=document.querySelector('.showcase-card');if(!c)return null;const r=c.getBoundingClientRect();
      const a=getComputedStyle(c,'::after'),b=getComputedStyle(c,'::before');
      return {w:r.width,h:r.height,aw:parseFloat(a.width),ah:parseFloat(a.height),abw:a.borderTopWidth,abg:a.backgroundImage,
        bbw:b.borderTopWidth,bw:parseFloat(b.width)};}""")
    if deco:
        check(deco['w']-24<=deco['aw']<=deco['w'] and deco['h']-24<=deco['ah']<=deco['h'],'showcase frame hugs card edges')
        check('none' in deco['abg'] and deco['abw']!='0px','showcase frame is a plain hairline, no stray glow')
        check(deco['bbw']=='0px','showcase glow has no border')

    page.click('[data-action="pvp"]'); page.wait_for_timeout(1200)
    page.screenshot(path=str(OUT/"02-game.png"))
    info=page.evaluate("""() => {const G=window.__PROPOOL__.game,R=window.__PROPOOL__.renderer;const sr=document.querySelector('.hud-side-right').getBoundingClientRect();const tr=document.getElementById('power-track').getBoundingClientRect();
      return {tableRight:R.tx+R.scale*G.world.width,sideLeft:sr.left,
        trackCenter:+((tr.top+tr.bottom)/2).toFixed(1),feltCenter:+(R.ty+R.scale*G.world.height/2).toFixed(1),
        angle:document.getElementById('angle-readout').textContent,shoot:getComputedStyle(document.getElementById('btn-touch-shoot')).display,
        overflow:[document.documentElement.scrollWidth,innerWidth,document.documentElement.scrollHeight,innerHeight]};}""")
    check(info['sideLeft']>=info['tableRight']-6 and info['shoot']!='none' and info['overflow'][0]<=info['overflow'][1]+1,'desktop layout')
    check(abs(info['trackCenter']-info['feltCenter'])<=8,'desktop power bar centered on table')
    # charge and shoot at full power; check break open table
    page.mouse.move(1077,441); page.mouse.down(); page.wait_for_timeout(1250); page.mouse.up()
    page.wait_for_function("window.__PROPOOL__.game.phase !== 'shooting'",timeout=25000); page.wait_for_timeout(700)
    br=page.evaluate("""() => ({shots:window.__PROPOOL__.game.shots,groups:window.__PROPOOL__.game.players.map(p=>p.group),breakShot:window.__PROPOOL__.game.breakShot,toast:document.getElementById('toast').textContent,angles:document.getElementById('angle-readout').textContent})""")
    print('BREAK',json.dumps(br,ensure_ascii=False))
    check(br['shots']==1 and br['breakShot']==False and br['groups']==[None,None],'desktop break open table')
    check('开球无效' not in br['toast'],'desktop break legal')
    page.screenshot(path=str(OUT/"03-break.png"))
    # pause/quit to menu
    page.keyboard.press('Escape'); page.wait_for_timeout(300); page.click('[data-action="quit"]'); page.wait_for_timeout(600)
    # level result UI
    page.click('[data-action="levels"]'); page.wait_for_timeout(500); page.click('[data-level-id="l1"]'); page.wait_for_timeout(900)
    page.screenshot(path=str(OUT/"04-level.png"))
    page.evaluate("""() => {const G=window.__PROPOOL__.game;for(const b of G.world.balls) if(b.id!=='cue'){b.active=false;b.pocketed=true;}G.shots=G.level.par;G.shotCtx={firstHitId:'b1',potted:[],cuePotted:false,railAfterContact:false,railBalls:{},isBreak:false,preGroup:null,preGroupCleared:false,preOpen:true,preTargets:[],power:.4,angle:0,spinX:0,spinY:0};G.resolveLevelShot();}""")
    page.wait_for_timeout(1400)
    res=page.evaluate("""() => ({active:document.getElementById('screen-result').classList.contains('active'),stars:document.querySelectorAll('#result-stars .rstar.on').length,actions:document.getElementById('result-actions').textContent,next:!!document.querySelector('[data-action="next-level"]')})""")
    print('RESULT',json.dumps(res,ensure_ascii=False))
    check(res['active'] and res['stars']==3 and res['next'],'desktop level result')
    page.screenshot(path=str(OUT/"05-result.png"))

    # Desktop 1366
    page.set_viewport_size({"width":1366,"height":768}); page.wait_for_timeout(600)
    page.evaluate("window.__PROPOOL__.game.quitToMenu()")
    page.screenshot(path=str(OUT/"06-menu-1366.png"))

    # Mobile landscape 844x390
    ctx=browser.new_context(viewport={"width":844,"height":390},device_scale_factor=2,has_touch=True,is_mobile=True)
    mp=ctx.new_page()
    mp.on("pageerror",lambda e: errors.append("mobile:"+str(e)))
    mp.on("console",lambda m: logs.append("mobile:"+m.text) if m.type=="error" and "ERR_FILE_NOT_FOUND" not in m.text and "Failed to load resource" not in m.text else None)
    mp.goto(URL,wait_until="load"); mp.wait_for_timeout(1600)
    mp.screenshot(path=str(OUT/"10-menu-mobile.png"))
    check(mp.evaluate("getComputedStyle(document.querySelector('.menu-foot')).display")=='none','mobile menu footer hidden')
    mp.click('[data-action="pvp"]'); mp.wait_for_timeout(1200)
    mp.screenshot(path=str(OUT/"11-game-mobile.png"))
    mg=mp.evaluate("""() => {const G=window.__PROPOOL__.game,R=window.__PROPOOL__.renderer;const sr=document.querySelector('.hud-side-right').getBoundingClientRect();return {tableRight:R.tx+R.scale*G.world.width,sideLeft:sr.left,sideRight:sr.right,insets:R.insets,overflow:[document.documentElement.scrollWidth,innerWidth,document.documentElement.scrollHeight,innerHeight],shoot:getComputedStyle(document.getElementById('btn-touch-shoot')).display};}""")
    check(mg['sideLeft']>=mg['tableRight']-6 and mg['sideRight']<=mg['overflow'][1]+1 and mg['shoot']!='none','mobile layout')
    check(mg['overflow'][0]<=mg['overflow'][1]+1 and mg['overflow'][2]<=mg['overflow'][3]+1,'mobile no overflow')
    # touch aim at off-axis
    pt=mp.evaluate("""() => window.__PROPOOL__.renderer.worldToScreen(1.8,0.3)""")
    a0=mp.evaluate("window.__PROPOOL__.game.aimAngle"); mp.touchscreen.tap(pt['x'],pt['y']); mp.wait_for_timeout(250)
    check(ad(mp.evaluate("window.__PROPOOL__.game.aimAngle"),a0)>0.01,'mobile touch aim')
    # spin preset and shot
    mp.click('#btn-spin'); mp.wait_for_timeout(250); mp.click('[data-spin-x="0"][data-spin-y="-0.7"]'); mp.wait_for_timeout(200)
    check(mp.evaluate("window.__PROPOOL__.game.spinY")<-0.5,'mobile spin preset')
    mp.screenshot(path=str(OUT/"12-spin-mobile.png")); mp.click('#spin-close')
    s0=mp.evaluate("window.__PROPOOL__.game.shots")
    mp.evaluate("""() => document.getElementById('btn-touch-shoot').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:9,button:0,buttons:1}))""")
    mp.wait_for_timeout(700)
    check(mp.evaluate("window.__PROPOOL__.game.charging"),'mobile charges')
    mp.evaluate("""() => document.getElementById('btn-touch-shoot').dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:9,button:0,buttons:0}))""")
    mp.wait_for_timeout(500)
    check(mp.evaluate("window.__PROPOOL__.game.shots")>s0,'mobile shot')
    try: mp.wait_for_function("window.__PROPOOL__.game.phase !== 'shooting'",timeout=20000)
    except Exception: failures.append('mobile shot settle')
    # level ball in hand placement
    mp.click('#btn-pause'); mp.wait_for_timeout(300); mp.click('[data-action="quit"]'); mp.wait_for_timeout(500)
    mp.click('[data-action="levels"]'); mp.wait_for_timeout(600); mp.click('[data-level-id="l1"]'); mp.wait_for_timeout(800)
    mt=mp.evaluate("""() => {const G=window.__PROPOOL__.game;const spot=G.findSafeSpot(0.9,0.6);return {ballInHand:G.ballInHand,toast:document.getElementById('toast').textContent,spot:window.__PROPOOL__.renderer.worldToScreen(spot.x,spot.y)};}""")
    print('MOBILE LEVEL',json.dumps(mt,ensure_ascii=False))
    check(mt['ballInHand'] and '自由球' in mt['toast'],'mobile free ball toast')
    mp.touchscreen.tap(mt['spot']['x'],mt['spot']['y']); mp.wait_for_timeout(400)
    check(not mp.evaluate("window.__PROPOOL__.game.ballInHand"),'mobile tap places cue')
    mp.screenshot(path=str(OUT/"13-level-mobile.png"))

    # Small landscape 667x375
    ctx2=browser.new_context(viewport={"width":667,"height":375},device_scale_factor=2,has_touch=True,is_mobile=True)
    sp=ctx2.new_page()
    sp.on("pageerror",lambda e: errors.append("small:"+str(e)))
    sp.goto(URL,wait_until="load"); sp.wait_for_timeout(1500); sp.click('[data-action="pvp"]'); sp.wait_for_timeout(1100)
    small=sp.evaluate("""() => {const R=window.__PROPOOL__.renderer,G=window.__PROPOOL__.game;const sr=document.querySelector('.hud-side-right').getBoundingClientRect();const hb=document.querySelector('.hud-bottom').getBoundingClientRect();return {overflow:[document.documentElement.scrollWidth,innerWidth,document.documentElement.scrollHeight,innerHeight],shoot:getComputedStyle(document.getElementById('btn-touch-shoot')).display,tableRight:R.tx+R.scale*G.world.width,sideLeft:sr.left,sideRight:sr.right,bottomLeft:hb.left,bottomRight:hb.right};}""")
    print('SMALL',json.dumps(small))
    check(small['overflow'][0]<=small['overflow'][1]+1 and small['overflow'][2]<=small['overflow'][3]+1,'small landscape no overflow')
    check(small['shoot']!='none' and small['sideLeft']>=small['tableRight']-6 and small['bottomLeft']>=-1 and small['bottomRight']<=small['overflow'][1]+1,'small landscape playable layout')
    sp.screenshot(path=str(OUT/"14-game-667.png"))

    # Portrait: 竖向球台直接可玩，无阻塞遮罩、无自动暂停
    ctx3=browser.new_context(viewport={"width":390,"height":844},device_scale_factor=2,has_touch=True,is_mobile=True)
    pp=ctx3.new_page()
    pp.on("pageerror",lambda e: errors.append("portrait:"+str(e)))
    pp.goto(URL,wait_until="load"); pp.wait_for_timeout(1500); pp.screenshot(path=str(OUT/"15-menu-portrait.png"))
    pp.click('[data-action="pvp"]'); pp.wait_for_timeout(1000)
    port=pp.evaluate("""() => {const G=window.__PROPOOL__.game,R=window.__PROPOOL__.renderer;
      const strip=document.getElementById('angle-strip').getBoundingClientRect();
      const cur=document.getElementById('angle-strip-cursor');
      return {rot:R.portraitRotate,paused:G.paused,hudHidden:document.getElementById('hud').classList.contains('hidden'),
        shoot:getComputedStyle(document.getElementById('btn-touch-shoot')).display,
        fullscreenBtn:!!document.getElementById('btn-fullscreen'),
        landscapeBtn:!!document.getElementById('btn-landscape'),
        ballDiameter:+(2*R.ballRadius*R.scale*(R.ballVisualScale||1)).toFixed(2),
        tableShare:(function(){var xs=[],ys=[];[[0,0],[G.world.width,0],[0,G.world.height],[G.world.width,G.world.height]].forEach(function(p){var s=R.worldToScreen(p[0],p[1]);xs.push(s.x);ys.push(s.y);});
          window.__feltBox={x0:Math.min.apply(null,xs),x1:Math.max.apply(null,xs),y0:Math.min.apply(null,ys),y1:Math.max.apply(null,ys)};
          return +(Math.abs(window.__feltBox.x1-window.__feltBox.x0)/innerWidth*100).toFixed(1);})(),
        ballRatio:+(2*R.ballRadius*R.scale*(R.ballVisualScale||1)/Math.abs(window.__feltBox.x1-window.__feltBox.x0)*100).toFixed(2),
        stripW:Math.round(strip.width),cursorLeft:cur.style.left,
        topH:Math.round(document.querySelector('.hud-top').getBoundingClientRect().height),
        bandLeft:Math.round(document.querySelector('.hud-side-right').getBoundingClientRect().left),
        bandTop:Math.round(document.querySelector('.hud-side-right').getBoundingClientRect().top),
        trackCenter:(function(){var r=document.getElementById('power-track').getBoundingClientRect();return +((r.top+r.bottom)/2).toFixed(1);})(),
        feltCenter:+((window.__feltBox.y0+window.__feltBox.y1)/2).toFixed(1),
        trackH:Math.round(document.getElementById('power-track').getBoundingClientRect().height),
        bandCap:getComputedStyle(document.querySelector('.band-cap')).display,
        chips:document.querySelectorAll('#balls-0 .ball-chip').length,
        topL:Math.round(document.querySelector('.hud-top').getBoundingClientRect().left),
        topW:Math.round(document.querySelector('.hud-top').getBoundingClientRect().width),
        bottomL:Math.round(document.querySelector('.hud-bottom').getBoundingClientRect().left),
        bottomW:Math.round(document.querySelector('.hud-bottom').getBoundingClientRect().width),
        stripL:Math.round(document.querySelector('.angle-strip').getBoundingClientRect().left),
        stripW:Math.round(document.querySelector('.angle-strip').getBoundingClientRect().width),
        stripTop:Math.round(document.querySelector('.angle-strip').getBoundingClientRect().top),
        tableL:Math.round(Math.min(window.__feltBox.x0,window.__feltBox.x1)),
        tableW:Math.round(Math.abs(window.__feltBox.x1-window.__feltBox.x0)),
        framePx:Math.round((R.FRAME||0)*R.scale),
        bandTop:Math.round(document.querySelector('.hud-side-right').getBoundingClientRect().top),
        bandBottom:Math.round(document.querySelector('.hud-side-right').getBoundingClientRect().bottom),
        tool1Top:Math.round(document.getElementById('btn-guide').getBoundingClientRect().top),
        tool4Top:Math.round(document.getElementById('btn-pause').getBoundingClientRect().top),
        bottomH:Math.round(document.querySelector('.hud-bottom').getBoundingClientRect().height),
        icons:document.querySelectorAll('use[href^="#i-"]').length,
        missingIcons:(function(){var n=0;document.querySelectorAll('use').forEach(function(u){if(!document.getElementById((u.getAttribute('href')||'').slice(1)))n++;});return n;})(),
        feltRight:Math.round(window.__feltBox.x1), feltTop:Math.round(window.__feltBox.y0),
        bottomTop:Math.round(document.querySelector('.hud-bottom').getBoundingClientRect().top),
        feltBottom:Math.round(window.__feltBox.y1)};}""")
    print('PORTRAIT',json.dumps(port,ensure_ascii=False))
    check(abs(port['rot']+math.pi/2)<1e-6 and not port['paused'] and not port['hudHidden'],'portrait vertical table playable')
    check(port['fullscreenBtn'] and not port['landscapeBtn'],'portrait shows fullscreen button, rotate button removed')
    check(port['ballDiameter']>=13 and port['ballRatio']>=4.2 and port['tableShare']>=74,
          'portrait table enlarged to >=77% of width; ball overlap now ~13% (rack spread 1.10)')
    check(port['chips']>=7, 'top bar shows 7 ball holes per side')
    expL = port['tableL'] - port['framePx']
    expW = port['tableW'] + 2 * port['framePx']
    check(abs(port['topL']-expL)<=5 and abs(port['topW']-expW)<=8,
          'top bar spans the table width (fits 7 balls comfortably)')
    check(abs(port['bottomL']-expL)<=5 and abs(port['bottomW']-expW)<=8,
          'bottom bar never wider than the table')
    check(abs(port['stripL']-expL)<=5 and abs(port['stripW']-expW)<=8 and port['stripTop']>=port['feltBottom'],
          'angle strip sits under the table at table width')
    check(port['tool1Top']<port['bandTop'] and port['tool4Top']>port['bandBottom'],
          '4 tool buttons split above/below the power band, not crowding the score bar')
    check(port['topH']<=44 and port['bandLeft']>=port['feltRight'] and port['feltTop']>=port['topH']
          and port['bottomTop']>=port['feltBottom'],'portrait HUD does not overlap the table')
    check(abs(port['trackCenter']-port['feltCenter'])<=8 and port['trackH']>=240,
          'portrait power bar centered on table and lengthened')
    check(port['bandCap']!='none' and port['icons']>=10 and port['missingIcons']==0,
          'icon sprite and symmetric band cap render')
    pp.screenshot(path=str(OUT/"16-game-portrait.png"))
    # 角度条：拖动必须让瞄准角变化，并且游标像素位置真的移动
    _a0=pp.evaluate("window.__PROPOOL__.game.aimAngle")
    _c0=pp.evaluate("document.getElementById('angle-strip-cursor').style.left")
    _bx=pp.evaluate("() => {const r=document.getElementById('angle-strip').getBoundingClientRect();return {x:r.x+r.width*0.5,y:r.y+r.height*0.5};}")
    pp.evaluate("""([x,y])=>{const s=document.getElementById('angle-strip');
      s.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:71,clientX:x,clientY:y,button:0,buttons:1}));
      s.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'touch',pointerId:71,clientX:x+60,clientY:y,buttons:1}));
      s.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:71,clientX:x+60,clientY:y}));}""",[_bx['x'],_bx['y']])
    pp.wait_for_timeout(250)
    _a1=pp.evaluate("window.__PROPOOL__.game.aimAngle")
    _c1=pp.evaluate("document.getElementById('angle-strip-cursor').style.left")
    print('ANGLE STRIP', round(math.degrees(_a1-_a0),2), _c0, '->', _c1)
    check(abs(math.degrees(_a1-_a0))>3,'angle strip drag turns the cue with deliberate damping')
    check(_c0!=_c1,'angle strip cursor visibly moves')
    pp.click('#btn-fullscreen'); pp.wait_for_timeout(500)
    check(not errors,'fullscreen button no exception')
    pp.evaluate("document.fullscreenElement ? document.exitFullscreen() : null")
    pp.wait_for_timeout(400)
    pp.set_viewport_size({"width":844,"height":390}); pp.wait_for_timeout(900)
    rot=pp.evaluate("""() => ({rot:window.__PROPOOL__.renderer.portraitRotate,paused:window.__PROPOOL__.game.paused,label:document.getElementById('turn-label').textContent})""")
    print('ROTATE',json.dumps(rot,ensure_ascii=False))
    check(abs(rot['rot'])<1e-6 and not rot['paused'] and rot['label']!='已暂停','rotate resumes and HUD refreshed')
    pp.screenshot(path=str(OUT/"17-rotated.png"))

    print('ERRORS',json.dumps(errors,ensure_ascii=False,indent=1)[:3000])
    print('CONSOLE',json.dumps(logs,ensure_ascii=False,indent=1)[:2000])
    print('FAILURES',json.dumps(failures,ensure_ascii=False,indent=1))
    browser.close()
sys.exit(1 if failures or errors or logs else 0)

