# -*- coding: utf-8 -*-
"""线上：三档梯度 + 出手命中率 + 延迟"""
from playwright.sync_api import sync_playwright
import json, sys
U=sys.argv[1] if len(sys.argv)>1 else 'https://www.xingshuwen.com/games/pool/'
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    c=b.new_context(viewport={"width":1280,"height":800});g=c.new_page()
    g.on('pageerror',lambda e:errs.append(str(e)))
    g.goto(U,wait_until='load')
    for _ in range(60):
        if g.evaluate("()=>!!window.__PROPOOL__"):break
        g.wait_for_timeout(200)
    out=g.evaluate("""()=>{
      const P=window.Pool,AI=P.AI,R=P.CONFIG.table.ballRadius,W=P.CONFIG.table.width,H=P.CONFIG.table.height;
      function mkRack(seed,n){
        let s=seed;
        const rnd=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};
        const w=new P.Physics.PhysicsWorld();
        w.addBall({id:'cue',number:0,x:0.30+rnd()*0.5,y:R+0.09+rnd()*(H-2*R-0.18)});
        const placed=[{x:w.getBall('cue').x,y:w.getBall('cue').y}];
        for(let k=1;k<=n;k++) for(let t=0;t<600;t++){
          const x=R+0.07+rnd()*(W-2*R-0.14), y=R+0.07+rnd()*(H-2*R-0.14);
          let good=true;
          for(const b of placed) if(Math.hypot(b.x-x,b.y-y)<2*R+0.06){good=false;break;}
          if(!good)continue;
          for(const pk of w.pockets) if(Math.hypot(pk.x-x,pk.y-y)<pk.radius+R*2.5){good=false;break;}
          if(!good)continue;
          w.addBall({id:'b'+k,number:k,x:x,y:y}); placed.push({x,y}); break;
        }
        return w;
      }
      function stats(diff,trials){
        let pot=0,made=0,safe=0,maxMs=0;
        for(let i=0;i<trials*4&&(pot+safe)<trials;i++){
          const w=mkRack(7000+i*13,4);
          const ids=w.balls.filter(b=>b.number>0).map(b=>b.id);
          const an=AI.analyze(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:diff,ballInHand:false,maxTimeMs:300});
          const best=an.candidates&&an.candidates[0];
          if(!best||!(best.cutDeg<15&&best.dcg<0.7)) continue;
          const t0=performance.now();
          const s=AI.chooseShot(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:diff,ballInHand:false,maxTimeMs:250,cuePower:1,cueSpin:1});
          maxMs=Math.max(maxMs,performance.now()-t0);
          if(s.plan==='safety'){ safe++; continue; }
          pot++;
          const w2=w.clone(), t=w2.getBall(s.ballId);
          w2.strike('cue',{angle:s.angle,power:s.power,spinX:s.spinX||0,spinY:s.spinY||0});
          for(let k=0;k<900;k++){w2.step(1/60);if(w2.allStopped())break;}
          if(!t.active)made++;
        }
        return {pot,safe,rate:pot?+(made/pot*100).toFixed(1):null,maxMs:+maxMs.toFixed(1)};
      }
      function runOut(diff,balls,seed){
        const w=mkRack(seed,balls); let pots=0;
        for(let i=0;i<12;i++){
          const ids=w.balls.filter(b=>b.active&&b.number>0).map(b=>b.id);
          if(!ids.length)break;
          let s=null;
          try{ s=AI.chooseShot(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:diff,ballInHand:false,maxTimeMs:250,cuePower:1,cueSpin:1}); }catch(e){break;}
          if(!s||s.plan==='safety')break;
          const before=w.balls.filter(b=>b.active&&b.number>0).length;
          w.strike('cue',{angle:s.angle,power:s.power,spinX:s.spinX||0,spinY:s.spinY||0});
          for(let k=0;k<900;k++){w.step(1/60);if(w.allStopped())break;}
          if(!w.getBall('cue').active)break;
          const after=w.balls.filter(b=>b.active&&b.number>0).length;
          if(after<before) pots+=(before-after); else break;
        }
        return pots;
      }
      const R2={};
      for(const d of ['easy','normal','hard']){
        let tot=0; for(let i=0;i<10;i++) tot+=runOut(d,7,9000+i*17);
        R2[d]={shot:stats(d,24),avgPots:+(tot/10).toFixed(2)};
      }
      return R2;
    }""")
    print(json.dumps({"tiers":out,"pageErrors":errs[:3]},ensure_ascii=False,indent=1))
    c.close();b.close()
