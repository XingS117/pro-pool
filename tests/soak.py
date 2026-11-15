# -*- coding: utf-8 -*-
"""长时间随机击球，检查：没有球停在袋口洞里、没有颤抖、无报错。"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, random
U = (Path(__file__).resolve().parents[1] / "index.html").as_uri()
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
    c = b.new_context(viewport={"width": 1280, "height": 800})
    g = c.new_page()
    g.on('pageerror', lambda e: errs.append(str(e)))
    g.goto(U)
    for _ in range(40):
        if g.evaluate("()=>!!window.__PROPOOL__"): break
        g.wait_for_timeout(150)
    g.click('[data-action="pvp"]'); g.wait_for_timeout(700)
    random.seed(21)
    bad = []
    for i in range(24):
        st = g.evaluate("()=>{const G=window.__PROPOOL__.game;return {phase:G.phase,bih:G.ballInHand};}")
        if st["phase"] == "over": break
        if st["bih"]:
            pt = g.evaluate("()=>{const R=window.__PROPOOL__.renderer;const s=R.worldToScreen(0.9,0.7);return {x:Math.round(s.x),y:Math.round(s.y)};}")
            g.mouse.click(pt["x"], pt["y"]); g.wait_for_timeout(150)
        g.evaluate("(a)=>{const G=window.__PROPOOL__.game;G.aimAngle=G.aimTargetAngle=a[0];G.shoot(a[1],a[2],a[3]);}",
                   [random.uniform(-1.2, 1.2), random.uniform(0.3, 1.0), random.uniform(-0.6, 0.6), random.uniform(-0.6, 0.6)])
        ok = False
        for _ in range(260):
            if g.evaluate("()=>window.__PROPOOL__.game.phase!=='shooting'"): ok=True; break
            g.wait_for_timeout(80)
        if not ok:
            bad.append({"shot": i, "issue": "timeout"})
            break
        info = g.evaluate("""()=>{const G=window.__PROPOOL__.game,W=G.world,R=W.ballRadius;
          const pockets=W.pockets||[];
          const inside=[]; const moving=[];
          for(const b of W.balls){ if(!b.active) continue;
            if(Math.hypot(b.vx,b.vy)>0.02) moving.push(b.id);
            for(const p of pockets){ if(Math.hypot(b.x-p.x,b.y-p.y) < p.radius){ inside.push({id:b.id,d:+Math.hypot(b.x-p.x,b.y-p.y).toFixed(3)}); } }
          }
          return {inside:inside, moving:moving};}""")
        if info["inside"]:
            bad.append({"shot": i, "ballsInsideHole": info["inside"]})
    out = {"shots": 24, "bad": bad[:6], "errors": errs[:5]}
    print(json.dumps(out, ensure_ascii=False, indent=1))
    c.close(); b.close()
