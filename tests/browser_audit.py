# -*- coding: utf-8 -*-
"""浏览器层回归：启动健康、资源请求、WebAudio 节点、DOM、运行时帧率。
用法: python tests/browser_audit.py [url_or_file]
断言失败以非零码退出。"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, sys
URL = sys.argv[1] if len(sys.argv)>1 else (Path(__file__).resolve().parents[1]/"index.html").as_uri()
INIT = r"""
window.__AUD={created:0,disconnected:0};
window.__LONG=[]; window.__ARMED=false;
(function(){
  var AP=(window.AudioContext||window.webkitAudioContext).prototype;
  ['createOscillator','createGain','createBufferSource','createBiquadFilter','createDynamicsCompressor'].forEach(function(m){
    var o=AP[m]; if(!o)return;
    AP[m]=function(){var n=o.apply(this,arguments);window.__AUD.created++;return n;};
  });
  var d=AudioNode.prototype.disconnect;
  AudioNode.prototype.disconnect=function(){window.__AUD.disconnected++;return d.apply(this,arguments);};
  var last=performance.now();
  function tick(){var n=performance.now(),dd=n-last;last=n;
    if(window.__ARMED&&dd>80)window.__LONG.push({t:+n.toFixed(0),ms:+dd.toFixed(1)});
    requestAnimationFrame(tick);}
  requestAnimationFrame(tick);
})();
"""
errs=[]; failed=[]; cons=[]
results={}
def check(name,cond,detail=""):
    results[name]={"ok":bool(cond),"detail":detail}
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--autoplay-policy=no-user-gesture-required'])
    c=b.new_context(viewport={"width":1280,"height":800});c.add_init_script(INIT)
    g=c.new_page()
    g.on('pageerror',lambda e:errs.append(str(e)))
    g.on('console',lambda m:cons.append(m.text) if m.type=='error' else None)
    g.on('requestfailed',lambda r:failed.append(r.url))
    g.goto(URL,wait_until='load')
    for _ in range(60):
        if g.evaluate("()=>!!window.__PROPOOL__"):break
        g.wait_for_timeout(150)
    check("启动成功",g.evaluate("()=>!!window.__PROPOOL__"))
    base=g.evaluate("""()=>({
      created:window.__AUD.created,
      dom:document.getElementsByTagName('*').length,
      pocketRadius:window.__PROPOOL__.renderer.pocketRadius||0,
      hasGetImageData:(window.Pool.Renderer+'').indexOf('getImageData')>=0
    })""")
    check("pocketRadius 已初始化",base["pocketRadius"]>0,"R="+str(base["pocketRadius"]))
    check("渲染循环无 getImageData",not base["hasGetImageData"])
    g.evaluate("()=>{const a=window.__PROPOOL__.audio;if(a&&a.unlock)a.unlock();}")
    g.wait_for_timeout(3000)  # 跳过启动期一次性解码/初始化
    g.evaluate("()=>{window.__ARMED=true;window.__LONG.length=0;}")
    # 持续运行：击球 + 音效
    g.evaluate("""()=>{
      const G=window.__PROPOOL__.game,a=window.__PROPOOL__.audio;
      G.startMatch('pvp','normal');
      let i=0;
      window.__IV=setInterval(()=>{
        if(i++>35){clearInterval(window.__IV);return;}
        a&&a.ball&&a.ball(0.5); a&&a.ui&&a.ui();
        if(G.phase==='aim'){G.aimAngle=(i*0.37)%(Math.PI*2);G.aimTargetAngle=G.aimAngle;G.shoot(0.3+(i%5)*0.12,0,0.1);}
      },130);
    }""")
    g.wait_for_timeout(6000)
    after=g.evaluate("""()=>({created:window.__AUD.created,disconnected:window.__AUD.disconnected,
      dom:document.getElementsByTagName('*').length,long:window.__LONG,
      samples:Object.keys(window.__PROPOOL__.audio.samples||{}).length})""")
    # WebAudio：新增节点几乎全部被释放（差值<=常驻节点数+少量在播）
    live=after["created"]-after["disconnected"]-base["created"]
    check("WebAudio 无节点泄漏",live<=6,"live(净新增)="+str(live))
    check("DOM 节点数稳定",abs(after["dom"]-base["dom"])<=20,"base="+str(base["dom"])+" after="+str(after["dom"]))
    check("7 个采样已解码",after["samples"]>=7,"samples="+str(after["samples"]))
    longs=after["long"]
    worst=max([x["ms"] for x in longs],default=0)
    check("运行时无持续长帧",len(longs)<=2 and worst<300,"count="+str(len(longs))+" worst="+str(worst)+"ms")
    check("无 pageerror",len(errs)==0,"; ".join(errs[:2]))
    check("无失败资源请求",len(failed)==0,"; ".join(failed[:2]))
    check("无 console error",len(cons)==0,"; ".join(cons[:2]))
    c.close();b.close()
fails=[k for k,v in results.items() if not v["ok"]]
print(json.dumps({"results":results,"failures":fails},ensure_ascii=False,indent=1))
sys.exit(1 if fails else 0)
