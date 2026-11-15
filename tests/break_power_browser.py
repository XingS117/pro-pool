from playwright.sync_api import sync_playwright
from pathlib import Path
import sys,json
ROOT=Path(__file__).resolve().parents[1]
URL=sys.argv[1] if len(sys.argv)>1 else (ROOT/'index.html').as_uri()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 for w,h,mobile in [(1440,900,False),(390,844,True)]:
  c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=2,has_touch=mobile,is_mobile=mobile)
  g=c.new_page();errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(URL);g.wait_for_timeout(1200);g.click('[data-action="pvp"]');g.wait_for_timeout(800)
  g.evaluate("""()=>{const G=window.__PROPOOL__.game;window.stats=G.world.balls.filter(b=>b.number).map(b=>({n:b.number,x:b.x,y:b.y,max:0,peak:0}));const orig=G.stepPhysics;G.stepPhysics=function(dt){orig.call(this,dt);window.stats.forEach(s=>{const b=this.world.getBall('b'+s.n);s.max=Math.max(s.max,Math.hypot(b.x-s.x,b.y-s.y));s.peak=Math.max(s.peak,Math.hypot(b.vx,b.vy));});};G.aimAngle=G.aimTargetAngle=0;}""")
  r=g.locator('#power-track').bounding_box();x=r['x']+r['width']/2;y=r['y']+2
  if mobile:
   cd=c.new_cdp_session(g);cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y+r['height']*.95}]})
  else:
   g.mouse.move(x,y);g.mouse.down();g.mouse.move(x,y+r['height']*.95,steps=8)
  g.wait_for_timeout(60)
  value=g.locator('#power-number').text_content();assert value=='200',(w,value)
  if mobile:cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  else:g.mouse.up()
  # CSP on production forbids wait_for_function's eval; use direct CDP evaluation.
  for tick in range(120):
   if g.evaluate("() => window.__PROPOOL__.game.phase !== 'shooting'"): break
   g.wait_for_timeout(250)
  assert g.evaluate("() => window.__PROPOOL__.game.phase !== 'shooting'"),'shot failed to settle'
  stats=g.evaluate('()=>window.stats');assert len(stats)==15
  assert all(s['max']>=.10 for s in stats),stats
  assert not errors,errors
  print(json.dumps({'size':[w,h],'maxPower':value,'moved':len([s for s in stats if s['max']>=.10]),'minimumDisplacement':min(s['max'] for s in stats),'errors':errors}))
  c.close()
 b.close()
