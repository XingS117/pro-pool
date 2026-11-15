# -*- coding: utf-8 -*-
"""浏览器实测：瞄准命中球时，虚影母球确实被绘制且呈白色球体。"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, sys
URL = sys.argv[1] if len(sys.argv) > 1 else (Path(__file__).resolve().parents[1]/"index.html").as_uri()
errs = []
checks = {}
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    c = b.new_context(viewport={"width":1280,"height":800}, device_scale_factor=1)
    g = c.new_page(); g.on('pageerror', lambda e: errs.append(str(e)))
    g.goto(URL, wait_until='load')
    for _ in range(60):
        if g.evaluate("()=>!!window.__PROPOOL__"): break
        g.wait_for_timeout(150)
    checks['boot'] = g.evaluate("()=>!!window.__PROPOOL__")
    g.click('[data-action="pvp"]'); g.wait_for_timeout(800)

    # 记录 _drawGhostCueBall 的实际调用
    g.evaluate("""()=>{
      const R=window.__PROPOOL__.renderer;
      window.__GHOST_CALLS=[];
      const orig=R._drawGhostCueBall;
      R._drawGhostCueBall=function(ctx,cx,cy,r,alpha){
        window.__GHOST_CALLS.push({cx:+cx.toFixed(1),cy:+cy.toFixed(1),r:+r.toFixed(1),alpha:alpha});
        return orig.call(this,ctx,cx,cy,r,alpha);
      };
    }""")
    g.evaluate("""()=>{
      const G=window.__PROPOOL__.game, W=G.world;
      W.balls.forEach(b=>{if(b.number!==0){b.active=false;b.pocketed=true;}});
      const cue=W.getBall('cue');
      cue.active=true;cue.pocketed=false;cue.vx=0;cue.vy=0;cue.x=0.55;cue.y=0.635;
      W.addBall({id:'probe',number:1,x:1.35,y:0.60});
      const ang=Math.atan2(0.60-0.635,1.35-0.55)+0.045;
      G.aimAngle=ang;G.aimTargetAngle=ang;G.phase='aim';G.ballInHand=false;G.paused=false;
    }""")
    g.wait_for_timeout(700)
    calls = g.evaluate("()=>window.__GHOST_CALLS.slice(-3)")
    checks['ghost_called'] = len(calls) > 0
    checks['ghost_is_ball'] = bool(calls) and calls[-1]['alpha'] > 0.3
    checks['hit_type_ball'] = g.evaluate("()=>window.__PROPOOL__.renderer._aimData.hitType") == 'ball'

    # 像素验证：虚影球中心应明显比周围台呢亮，且 R/G/B 接近（白色）
    px = g.evaluate("""()=>{
      const R=window.__PROPOOL__.renderer, a=R._aimData;
      const p=R.worldToScreen(a.ghostX,a.ghostY);
      const cv=document.querySelector('canvas');
      const ctx=cv.getContext('2d');
      const dpr=window.devicePixelRatio||1;
      function at(dx,dy){
        const d=ctx.getImageData(Math.round((p.x+dx)*dpr),Math.round((p.y+dy)*dpr),1,1).data;
        return [d[0],d[1],d[2]];
      }
      const r=R._ballDrawR();
      // 球内环上取 8 点平均：避开正中红点(r*0.13)与最外缘描边
      const ring=[[-0.45,0],[0.45,0],[0,-0.45],[0,0.45],
                  [-0.32,-0.32],[0.32,-0.32],[-0.32,0.32],[0.32,0.32]];
      const sum=[0,0,0];
      ring.forEach(q=>{const v=at(q[0]*r,q[1]*r);for(let k=0;k<3;k++)sum[k]+=v[k];});
      const ball=sum.map(x=>Math.round(x/ring.length));
      return {center:ball, felt:at(0,-r*2.8), centerDot:at(0,0)};
    }""")
    c0, f0 = px['center'], px['felt']
    checks['ghost_brighter_than_felt'] = sum(c0) > sum(f0) + 60
    checks['ghost_is_whitish'] = max(c0) - min(c0) < 62
    checks['no_pageerror'] = len(errs) == 0
    checks['pixel'] = px
    checks['calls'] = calls[-1] if calls else None

    # 竖屏手机画幅：球半径很小，sprite 走 small 分支，仍须正常绘制
    c2 = b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2)
    g2 = c2.new_page(); errs2=[]
    g2.on('pageerror', lambda e: errs2.append(str(e)))
    g2.goto(URL, wait_until='load')
    for _ in range(60):
        if g2.evaluate("()=>!!window.__PROPOOL__"): break
        g2.wait_for_timeout(150)
    g2.click('[data-action="pvp"]'); g2.wait_for_timeout(700)
    g2.evaluate("""()=>{
      const R=window.__PROPOOL__.renderer;
      window.__GHOST_CALLS=[];
      const o=R._drawGhostCueBall;
      R._drawGhostCueBall=function(ctx,cx,cy,r,a){window.__GHOST_CALLS.push({r:+r.toFixed(1),a:a});return o.call(this,ctx,cx,cy,r,a);};
      const G=window.__PROPOOL__.game,W=G.world;
      W.balls.forEach(b=>{if(b.number!==0){b.active=false;b.pocketed=true;}});
      const cue=W.getBall('cue');
      cue.active=true;cue.pocketed=false;cue.vx=0;cue.vy=0;cue.x=0.55;cue.y=0.635;
      W.addBall({id:'probe',number:1,x:1.35,y:0.60});
      const ang=Math.atan2(0.60-0.635,1.35-0.55)+0.045;
      G.aimAngle=ang;G.aimTargetAngle=ang;G.phase='aim';G.ballInHand=false;G.paused=false;
    }""")
    g2.wait_for_timeout(700)
    pc = g2.evaluate("()=>window.__GHOST_CALLS.slice(-1)[0]||null")
    checks['portrait_ghost_called'] = pc is not None
    checks['portrait_no_pageerror'] = len(errs2) == 0
    checks['portrait'] = {'call':pc, 'errors':errs2[:3]}
    checks['errors'] = errs[:3]
    c2.close(); c.close(); b.close()

print(json.dumps(checks, ensure_ascii=False, indent=1))
sys.exit(0 if all(v for k, v in checks.items() if isinstance(v, bool)) else 1)
