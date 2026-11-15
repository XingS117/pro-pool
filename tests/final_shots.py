# -*- coding: utf-8 -*-
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
OUT = Path(__file__).resolve().parents[1] / "tests" / "final"
OUT.mkdir(parents=True, exist_ok=True)
U = (Path(__file__).resolve().parents[1] / "index.html").as_uri()
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    for w, h, mob, name in [(1440, 900, False, "final-desktop"), (390, 844, True, "final-mobile")]:
        c = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, has_touch=mob, is_mobile=mob)
        g = c.new_page(); g.goto(U)
        for _ in range(40):
            if g.evaluate("()=>!!window.__PROPOOL__"): break
            g.wait_for_timeout(150)
        g.click('[data-action="pvp"]'); g.wait_for_timeout(900)
        g.screenshot(path=str(OUT / (name + ".png")))
        g.evaluate("()=>{const G=window.__PROPOOL__.game;G.activePlayer=1;G.emit('hud',G.getState());}")
        g.wait_for_timeout(350)
        box = g.evaluate("()=>{const r=document.querySelector('.hud-top').getBoundingClientRect();return {x:Math.max(0,r.x-4),y:Math.max(0,r.y-4),width:r.width+8,height:r.height+8};}")
        g.screenshot(path=str(OUT / (name + "-turn2.png")), clip=box)
        print(name, g.evaluate("()=>document.getElementById('turn-label').textContent"))
        c.close()
    b.close()
