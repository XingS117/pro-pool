# -*- coding: utf-8 -*-
"""跨浏览器物理一致性验证（只读）：
   用 Playwright 在多个引擎中加载现有 dist/pro-pool.html，
   对同一批固定出杆跑物理，对比每球最终状态（9 位小数）。
   不改游戏源码、不重新构建、不部署。"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, hashlib
ROOT=Path(__file__).resolve().parents[1]
URL=(ROOT/'dist'/'pro-pool.html').as_uri()
CASES=[
  {'n':'直球中袋', 'angle':-1.5708, 'power':0.6, 'sx':0, 'sy':0.1},
  {'n':'切20度',   'angle':-0.35,   'power':0.75,'sx':0, 'sy':0.1},
  {'n':'切45度',   'angle':-0.78,   'power':0.8, 'sx':0, 'sy':0.1},
  {'n':'高杆跟进', 'angle':0.2,     'power':0.85,'sx':0, 'sy':0.9},
  {'n':'低杆回缩', 'angle':0.2,     'power':0.85,'sx':0, 'sy':-0.9},
  {'n':'左塞',     'angle':0.1,     'power':0.8, 'sx':-1,'sy':0.1},
  {'n':'右塞',     'angle':0.1,     'power':0.8, 'sx':1, 'sy':0.1},
  {'n':'开球',     'angle':0,       'power':1,   'sx':0, 'sy':0.1},
]
JS="""(cases)=>{
  const P=window.Pool, W=P.CONFIG.table.width, H=P.CONFIG.table.height, R=P.CONFIG.table.ballRadius;
  const out=[];
  for(const c of cases){
    // 固定局面：母球 + 15 球标准摆位（与游戏 buildMatchWorld 等价的确定性布局）
    const w=new P.Physics.PhysicsWorld();
    w.addBall({id:'cue',number:0,x:W*0.25,y:H/2});
    const apexX=W*0.75, rows=[1,2,3,4,5], gap=2*R+0.001;
    let n=1;
    for(let r=0;r<rows.length;r++) for(let k=0;k<=r;k++){
      w.addBall({id:'b'+n,number:n,x:apexX+r*gap*0.866,y:H/2+(k-r/2)*gap}); n++;
    }
    w.strike('cue',{angle:c.angle,power:c.power,spinX:c.sx,spinY:c.sy});
    for(let i=0;i<3600;i++){ w.step(1/600); if(w.allStopped())break; }
    out.push({name:c.n, state:w.balls.map(b=>[b.id,+b.x.toFixed(9),+b.y.toFixed(9),+b.vx.toFixed(9),+b.vy.toFixed(9),b.active?1:0])});
  }
  return out;
}"""
results={}
with sync_playwright() as p:
    engines=[('chromium',p.chromium),('firefox',p.firefox)]
    try: engines.append(('webkit',p.webkit))
    except Exception: pass
    for name,eng in engines:
        try:
            b=eng.launch(headless=True)
            c=b.new_context()
            g=c.new_page()
            g.goto(URL, wait_until='load', timeout=60000)
            for _ in range(60):
                if g.evaluate('()=>!!(window.Pool&&window.Pool.Physics)'): break
                g.wait_for_timeout(150)
            results[name]=g.evaluate(JS, CASES)
            b.close()
            print(name, 'OK', len(results[name]), 'cases')
        except Exception as e:
            print(name, 'ERR', str(e)[:200])
(ROOT/'tests'/'_cb_results.json').write_text(json.dumps(results,ensure_ascii=False),encoding='utf-8')
print('RESULT_WRITTEN')