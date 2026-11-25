# -*- coding: utf-8 -*-
"""在线稳定性总验收：本地服务器+本地页面，多局真实对战+所有边界场景，逐项断言。"""
import subprocess,time,os,http.server,threading,json,sys
from playwright.sync_api import sync_playwright
ROOT=r'C:\Users\shuwe\Desktop\dsh\台球'
PORT_WS=19011; PORT_HTTP=19012
env=os.environ.copy(); env.update({'POOL_WS_PORT':str(PORT_WS),'POOL_WS_HOST':'127.0.0.1','POOL_WS_TURN_MS':'6000','POOL_WS_TICK_MS':'250','POOL_WS_NO_BUSY':'0','POOL_WS_PAUSE_TIMEOUT_MS':'20000','POOL_WS_REMATCH_TIMEOUT_MS':'20000','POOL_WS_DISCONNECT_TTL':'10'})
proc=subprocess.Popen(['node','server/pool-ws.mjs'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
httpd=http.server.ThreadingHTTPServer(('127.0.0.1',PORT_HTTP),lambda *a,**k:Quiet(*a,directory=ROOT+'/dist',**k))
threading.Thread(target=httpd.serve_forever,daemon=True).start()
time.sleep(0.8)
URL=f'http://127.0.0.1:{PORT_HTTP}/pro-pool.html?v='+str(time.time())
FAILS=[]; PASSES=[]; ERRS=[]
def check(name,cond,detail=''):
    (PASSES if cond else FAILS).append(name)
    print(('PASS ' if cond else 'FAIL ')+name+(' :: '+str(detail) if detail else ''),flush=True)
def boot(ctx):
    g=ctx.new_page(); g.add_init_script(f"window.__POOL_WS_URL__='ws://127.0.0.1:{PORT_WS}'")
    g.goto(URL,wait_until='load')
    for _ in range(100):
        if g.evaluate('()=>!!window.__PROPOOL__'): return g
        g.wait_for_timeout(100)
    raise RuntimeError('boot failed')
def snap(g):
    return g.evaluate("()=>{const G=window.__PROPOOL__.game;if(!G||!G.world)return null;return {phase:G.phase,shots:G.shots,turn:G.activePlayer,seat:G.onlineSeat,human:G.isHumanTurn(),bih:G.ballInHand,free:G.freeBallSeat,groups:G.players.map(p=>p.group||null),match:G.matchResult?{w:G.matchResult.winner,r:G.matchResult.reason,delta:G.matchResult.coinsDelta}:null,timer:!document.getElementById('turn-timer').hidden,num:document.getElementById('turn-timer-num').textContent,mask:!document.getElementById('reconnect-mask').hidden,pmask:!document.getElementById('pause-mask').hidden,vs:document.getElementById('turn-label').textContent,balls:G.world.balls.map(b=>[b.id,+b.x.toFixed(5),+b.y.toFixed(5),b.active?1:0])}}")
def wait_stable(A,B,limit=200):
    for _ in range(limit):
        a,b=snap(A),snap(B)
        if a and b and a['phase'] in ('aim','over') and b['phase'] in ('aim','over') and a['shots']==b['shots'] and a['turn']==b['turn']:
            time.sleep(0.25); return snap(A),snap(B)
        time.sleep(0.1)
    return snap(A),snap(B)
def ai_shot(g):
    return g.evaluate("""()=>{const G=window.__PROPOOL__.game;if(!G||G.phase!=='aim')return {ok:false,why:'phase'};
      if(G.ballInHand){let placed=false;const spots=[[0.635,0.95],[0.635,0.3],[1.9,0.635],[0.3,0.635],[1.0,0.9],[1.0,0.4]];for(const [x,y] of spots){if(G.placeCueAt(x,y)){placed=true;break}}if(!placed)return {ok:false,why:'place'}}
      const c=G.world.getBall('cue');let best=null,bd=1e9;
      for(const b of G.world.balls){if(!b.active||b.id==='cue')continue;const d=Math.hypot(b.x-c.x,b.y-c.y);if(d<bd){bd=d;best=b}}
      if(!best)return {ok:false,why:'noball'}; G.aimAngle=Math.atan2(best.y-c.y,best.x-c.x);
      return {ok:G.shoot(0.42+Math.random()*0.25,0,0),why:'shot'}}""")
with sync_playwright() as p:
  b=p.chromium.launch(headless=True)
  c=b.new_context(viewport={'width':1300,'height':850})
  A=boot(c);B=boot(c)
  A.on('pageerror',lambda e:ERRS.append('A:'+str(e)[:150])); B.on('pageerror',lambda e:ERRS.append('B:'+str(e)[:150]))
  # --- 建房间/加入 ---
  A.click('[data-action="online"]');A.wait_for_timeout(250);A.click('#online-create');A.wait_for_timeout(1800)
  code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
  check('4位数字房间号',code.isdigit() and len(code)==4,code)
  B.click('[data-action="online"]');B.wait_for_timeout(250);B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(1800)
  a,bb=snap(A),snap(B)
  check('双方开局座位',a['seat']==0 and bb['seat']==1,(a['seat'],bb['seat']))
  check('第一视角对战条',A.evaluate("()=>document.getElementById('player-name-0').textContent")=='我' and B.evaluate("()=>document.getElementById('player-name-0').textContent")=='我')
  check('回合锁初始',a['human'] and not bb['human'],(a['human'],bb['human']))
  # --- 3局真实对战，每局最多12杆 ---
  for game_no in range(1,4):
    if game_no>1:
      A.evaluate("()=>{const G=window.__PROPOOL__.game;if(G.phase!=='over')G.finishMatch(0,'测试结算')}")
      time.sleep(0.5)
      A.evaluate("()=>window.Pool.Net.rematch()"); B.evaluate("()=>window.Pool.Net.rematch()"); time.sleep(2.5)
      a,bb=wait_stable(A,B); check(f'G{game_no}再来一局开局',a['phase']=='aim' and bb['phase']=='aim' and a['shots']==0,(a['phase'],bb['phase'],a['shots']))
    for shot in range(12):
      a,bb=wait_stable(A,B)
      if a['phase']=='over' or bb['phase']=='over': break
      freeOK=(a['free']==bb['free'] and (a['free']<0 or (a['bih']==(a['seat']==a['free']) and bb['bih'].__eq__(bb['seat']==bb['free']))));check(f'G{game_no}S{shot}状态同步',a['shots']==bb['shots'] and a['turn']==bb['turn'] and freeOK,(a['shots'],bb['shots'],a['turn'],bb['turn'],a['free'],bb['free'],a['bih'],bb['bih']))
      check(f'G{game_no}S{shot}仅一方能打',a['human']!=bb['human'] or a['phase']=='over',(a['human'],bb['human']))
      actor=A if a['human'] else B
      r=ai_shot(actor)
      if not r['ok']:
        check(f'G{game_no}S{shot}出杆成功',False,r);break
      a2,b2=wait_stable(A,B)
      check(f'G{game_no}S{shot}结算后状态同步',a2['shots']==b2['shots'] and a2['turn']==b2['turn'],(a2['shots'],b2['shots'],a2['turn'],b2['turn']))
  # --- 超时换手：当前方等待6.5秒 ---
  a,bb=wait_stable(A,B)
  if a['phase']!='over':
    t0=a['turn']; actor=A if t0==a['seat'] else B
    time.sleep(6.8)
    a2,b2=wait_stable(A,B)
    check('超时自动换手',a2['turn']==1-t0 and b2['turn']==1-t0,(t0,a2['turn'],b2['turn']))
    check('超时后仅新回合方能打',a2['human']!=b2['human'],(a2['human'],b2['human']))
  # --- 暂停/恢复 ---
  actor=A if snap(A)["human"] else B
  other=B if actor==A else A
  actor.evaluate("()=>window.__PROPOOL__.game.pause()")
  for _ in range(20):
   if snap(other)["pmask"]: break
   time.sleep(0.1)
  check('暂停遮罩显示',snap(other)['pmask'],snap(other)['pmask'])
  check('暂停后对方不能打',not snap(other)['human'],snap(other)['human'])
  other.evaluate("()=>{const b=document.getElementById('pause-resume-btn');if(b&&b.offsetParent)b.click()}");time.sleep(0.8)
  check('恢复后遮罩消失',not snap(other)['pmask'],snap(other)['pmask'])
  # --- 自动重连 ---
  B.evaluate("()=>window.Pool.Net.drop()")
  for _ in range(30):
   if snap(A)["mask"]: break
   time.sleep(0.05)
  check('掉线遮罩',snap(A)['mask'],snap(A)['mask'])
  time.sleep(2.5)
  time.sleep(2.5)
  check('自动重连恢复',not snap(A)['mask'],snap(A)['mask'])
  check('重连后状态同步',snap(A)['shots']==snap(B)['shots'],(snap(A)['shots'],snap(B)['shots']))
  # --- 退出房间不回弹 ---
  A.evaluate("()=>window.__PROPOOL__.game.finishMatch(0,'测试')");time.sleep(0.8)
  A.evaluate("()=>{const b=[...document.querySelectorAll('[data-action=\"menu\"]')].find(e=>e.offsetParent);if(b)b.click()}")
  B.evaluate("()=>{const b=[...document.querySelectorAll('[data-action=\"menu\"]')].find(e=>e.offsetParent);if(b)b.click()}")
  time.sleep(1)
  check('退出后房间号清空',A.evaluate("()=>document.getElementById('online-room-code').textContent")=='')
  time.sleep(3)
  check('退出后不回弹',all(x=='screen-menu' for x in snap(A)['screen']) if 'screen' in snap(A) else A.evaluate("()=>document.querySelector('#screen-menu').classList.contains('active')"))
  b.close()
httpd.shutdown(); proc.terminate()
print('\n=== SUMMARY ===');print('PASS',len(PASSES),'FAIL',len(FAILS),'ERRS',len(ERRS))
for f in FAILS:print('FAILED:',f)
for e in ERRS[:10]:print('JSERR:',e)
sys.exit(1 if FAILS or ERRS else 0)