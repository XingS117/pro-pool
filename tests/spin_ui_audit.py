# -*- coding: utf-8 -*-
"""11 个击球点 UI 回归：真实点击路径、文案、高亮、桌面/竖屏布局。"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, sys
U=sys.argv[1] if len(sys.argv)>1 else (Path(__file__).resolve().parents[1]/"index.html").as_uri()
NAMES=['中杆','中高杆','高杆','中低杆','低杆','左塞','右塞','高杆左塞','高杆右塞','低杆左塞','低杆右塞']
EXPECT={'中杆':(0,0),'中高杆':(0,0.35),'高杆':(0,0.7),'中低杆':(0,-0.35),'低杆':(0,-0.7),
 '左塞':(-0.7,0),'右塞':(0.7,0),'高杆左塞':(-0.5,0.5),'高杆右塞':(0.5,0.5),
 '低杆左塞':(-0.5,-0.5),'低杆右塞':(0.5,-0.5)}
errs=[];fails=[]
def ok(n,c,d=""):
    if not c: fails.append(n+' :: '+str(d))
def audit(b,w,h,label):
    c=b.new_context(viewport={"width":w,"height":h});g=c.new_page()
    g.on('pageerror',lambda e:errs.append(label+':'+str(e)))
    g.goto(U,wait_until='load')
    for _ in range(60):
        if g.evaluate("()=>!!window.__PROPOOL__"):break
        g.wait_for_timeout(150)
    g.evaluate("()=>{const x=document.querySelector('[data-action=pvp]');if(x)x.click();}")
    g.wait_for_timeout(500)
    g.evaluate("()=>{const x=document.getElementById('btn-spin');if(x)x.click();}")
    g.wait_for_timeout(300)
    layout=g.evaluate("""()=>{
      const bs=[...document.querySelectorAll('[data-spin-x]')],w=document.querySelector('.spin-widget');
      const wr=w.getBoundingClientRect();let out=0,ov=0,cl=0,off=0;const bx=[];
      bs.forEach(b=>{const r=b.getBoundingClientRect();bx.push(r);
        if(b.scrollWidth>b.clientWidth+1)cl++;
        if(r.left<wr.left-1||r.right>wr.right+1||r.top<wr.top-1||r.bottom>wr.bottom+1)out++;
        if(r.bottom>innerHeight+1||r.right>innerWidth+1)off++;});
      for(let i=0;i<bx.length;i++)for(let j=i+1;j<bx.length;j++){const a=bx[i],d=bx[j];
        if(a.left<d.right-1&&d.left<a.right-1&&a.top<d.bottom-1&&d.top<a.bottom-1)ov++;}
      return {count:bs.length,widget:[+wr.width.toFixed(0),+wr.height.toFixed(0)],outside:out,overlap:ov,clipped:cl,offscreen:off};
    }""")
    ok(label+' 11 个预设',layout['count']==11,layout['count'])
    ok(label+' widget 有尺寸',layout['widget'][0]>0 and layout['widget'][1]>0,layout['widget'])
    ok(label+' 按钮无溢出/重叠/裁切',layout['outside']==0 and layout['overlap']==0 and layout['clipped']==0 and layout['offscreen']==0,layout)
    clicks=g.evaluate("""(names)=>{
      const bs=[...document.querySelectorAll('[data-spin-x]')],G=window.__PROPOOL__.game;
      return names.map(n=>{const b=bs.find(x=>x.textContent.trim()===n);if(!b)return {name:n,found:false};
        b.click();
        return {name:n,spin:[+G.spinX.toFixed(2),+G.spinY.toFixed(2)],
          active:bs.filter(x=>x.classList.contains('active')).map(x=>x.textContent.trim()),
          desc:((document.getElementById('spin-desc')||{}).textContent||'').slice(0,6)};});
    }""",NAMES)
    for row in clicks:
        n=row['name']
        ok(label+' 找到 '+n,row.get('found') is not False,n)
        if row.get('found') is False:continue
        e=EXPECT[n]
        ok(label+' '+n+' 坐标',abs(row['spin'][0]-e[0])<0.02 and abs(row['spin'][1]-e[1])<0.02,row['spin'])
        ok(label+' '+n+' 高亮唯一',row['active']==[n],row['active'])
        ok(label+' '+n+' 文案独立',row['desc'].startswith(n[:2]),row['desc'])
    c.close()
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    audit(b,1280,800,'desktop');audit(b,390,844,'portrait')
    b.close()
print(json.dumps({"checks":"11点 x (坐标/高亮/文案/布局) x 2 视口","pageErrors":errs[:3],"failures":fails[:12],"failCount":len(fails)},ensure_ascii=False,indent=1))
sys.exit(1 if fails or errs else 0)
