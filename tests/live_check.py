# -*- coding: utf-8 -*-
"""线上：碰撞保真 + 玩家视角进球率 + AI 能瞄必进"""
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
    out={}
    out["collision"]=g.evaluate("""()=>{
      const P=window.Pool,R=P.CONFIG.table.ballRadius,D=180/Math.PI;
      const norm=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
      const cs=[[1.27,1.05,1.27,0.30,1.27,0],[0.55,0.55,0.30,0.30,0,0],
                [1.55,0.90,2.10,0.50,2.54,0],[1.35,0.95,2.00,0.55,2.54,0],[0.60,0.635,1.35,0.635,1.27,0]];
      let worst=0;
      for(const [cx,cy,tx,ty,ax,ay] of cs) for(const pw of [0.2,0.5,0.8,1.0]){
        const w=new P.Physics.PhysicsWorld();
        const cue=w.addBall({id:'cue',number:0,x:cx,y:cy});
        const t=w.addBall({id:'b1',number:1,x:tx,y:ty});
        const dx=ax-tx,dy=ay-ty,l=Math.hypot(dx,dy);
        const gx=tx-dx/l*2*R,gy=ty-dy/l*2*R;
        const ang=Math.atan2(gy-cy,gx-cx);
        const ray=w.castRay(cx,cy,Math.cos(ang),Math.sin(ang),'cue');
        if(!ray||!ray.normal)continue;
        const expect=Math.atan2(-ray.normal.y,-ray.normal.x);
        w.strike('cue',{angle:ang,power:pw,spinX:0,spinY:0.1});
        w.clearEvents();
        for(let i=0;i<6000;i++){
          w.step(1/600);
          if(w.events.some(e=>e.type==='ball-hit')){
            const e=Math.abs(norm(Math.atan2(t.vy,t.vx)-expect)*D);
            if(e>worst)worst=e; break;
          }
          w.clearEvents(); if(w.allStopped())break;
        }
      }
      return {worstDeg:+worst.toFixed(3)};
    }""")
    out["player"]=g.evaluate("""()=>{
      const P=window.Pool,G=window.__PROPOOL__.game,R=P.CONFIG.table.ballRadius;
      function trial(cueXY,tgtXY,pk,pw){
        G.startMatch('pvp','normal');
        const W=G.world;
        W.balls.forEach(b=>{if(b.number!==0)b.active=false;});
        const cue=W.getBall('cue');
        cue.active=true;cue.pocketed=false;cue.x=cueXY[0];cue.y=cueXY[1];cue.vx=0;cue.vy=0;
        const t=W.addBall({id:'t1',number:1,x:tgtXY[0],y:tgtXY[1]});
        const dx=pk[0]-tgtXY[0],dy=pk[1]-tgtXY[1],l=Math.hypot(dx,dy);
        const gx=tgtXY[0]-dx/l*2*R,gy=tgtXY[1]-dy/l*2*R;
        const ang=Math.atan2(gy-cueXY[1],gx-cueXY[0]);
        G.aimAngle=ang;G.aimTargetAngle=ang;G.phase='aim';G.ballInHand=false;
        if(!G.shoot(pw,0,0))return false;
        for(let i=0;i<1500;i++){G.update(1/120);if(G.phase!=='shooting')break;}
        return !t.active;
      }
      const L=[[[1.27,0.85],[1.27,0.40],[1.27,0]],[[1.27,1.05],[1.27,0.25],[1.27,0]],
               [[0.95,0.85],[1.22,0.42],[1.27,0]],[[1.60,0.85],[2.15,0.50],[2.54,0]],
               [[1.40,0.95],[2.10,0.55],[2.54,0]],[[0.55,0.95],[0.30,0.55],[0,0]],
               [[0.95,0.95],[1.20,1.05],[1.27,1.27]],[[0.25,0.635],[1.85,0.40],[2.54,0]]];
      let ok=0,total=0;
      for(const it of L) for(const pw of [0.35,0.55,0.75,0.95]){total++;if(trial(it[0],it[1],it[2],pw))ok++;}
      return {made:ok,total,rate:+(ok/total*100).toFixed(1)};
    }""")
    out["ai"]=g.evaluate("""()=>{
      const P=window.Pool,AI=P.AI,R=P.CONFIG.table.ballRadius,W=P.CONFIG.table.width,H=P.CONFIG.table.height;
      let seed=24680;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
      function rack(){
        const w=new P.Physics.PhysicsWorld();
        w.addBall({id:'cue',number:0,x:0.30+rnd()*0.5,y:R+0.08+rnd()*(H-2*R-0.16)});
        for(let n=1;n<=6;n++) for(let t=0;t<500;t++){
          const x=R+0.08+rnd()*(W-2*R-0.16),y=R+0.08+rnd()*(H-2*R-0.16);
          let ok=true;
          for(const b of w.balls) if(Math.hypot(b.x-x,b.y-y)<2*R+0.09){ok=false;break;}
          if(!ok)continue;
          for(const pk of w.pockets) if(Math.hypot(pk.x-x,pk.y-y)<pk.radius+R*2.5){ok=false;break;}
          if(!ok)continue;
          w.addBall({id:'b'+n,number:n,x:x,y:y});break;
        }
        return w;
      }
      let tested=0,made=0,maxMs=0;
      for(let i=0;i<240&&tested<40;i++){
        const w=rack(),ids=w.balls.filter(b=>b.number>0).map(b=>b.id);
        const an=AI.analyze(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:'hard',ballInHand:false,maxTimeMs:300});
        const best=an.candidates&&an.candidates[0];
        if(!best||best.quality<0.45)continue;
        tested++;
        const t0=performance.now();
        const s=AI.chooseShot(w,{cueBallId:'cue',group:'solid',targetIds:ids,difficulty:'hard',ballInHand:false,maxTimeMs:250,cuePower:1,cueSpin:1});
        maxMs=Math.max(maxMs,performance.now()-t0);
        const w2=w.clone(),t=w2.getBall(s.ballId);
        w2.strike('cue',{angle:s.angle,power:s.power,spinX:s.spinX||0,spinY:s.spinY||0});
        for(let k=0;k<900;k++){w2.step(1/60);if(w2.allStopped())break;}
        if(!t.active)made++;
      }
      return {tested,made,rate:+(made/Math.max(1,tested)*100).toFixed(1),maxMs:+maxMs.toFixed(1)};
    }""")
    out["pageErrors"]=errs[:3]
    print(json.dumps(out,ensure_ascii=False,indent=1))
    c.close();b.close()
