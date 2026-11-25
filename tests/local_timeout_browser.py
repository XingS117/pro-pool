import subprocess,time,os,http.server,threading,sys
from playwright.sync_api import sync_playwright
ROOT=r'C:\Users\shuwe\Desktop\dsh\台球'
env=os.environ.copy();env.update({'POOL_WS_PORT':'18994','POOL_WS_HOST':'127.0.0.1','POOL_WS_TURN_MS':'2500','POOL_WS_TICK_MS':'300','POOL_WS_NO_BUSY':'1'})
proc=subprocess.Popen(['node','server/pool-ws.mjs'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
httpd=http.server.ThreadingHTTPServer(('127.0.0.1',18995),lambda *a,**k:http.server.SimpleHTTPRequestHandler(*a,directory=ROOT+'/dist',**k))
threading.Thread(target=httpd.serve_forever,daemon=True).start()
time.sleep(0.8)
URL='http://127.0.0.1:18995/pro-pool.html?v='+str(time.time())
errs=[]
def boot(ctx):
    g=ctx.new_page()
    g.add_init_script("window.__POOL_WS_URL__='ws://127.0.0.1:18994'")
    g.goto(URL,wait_until='load')
    for _ in range(80):
        if g.evaluate('()=>!!window.__PROPOOL__'):return g
        g.wait_for_timeout(150)
with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    c=b.new_context(viewport={'width':1300,'height':850})
    A=boot(c);B=boot(c)
    A.on('pageerror',lambda e:errs.append('A:'+str(e)[:120]));B.on('pageerror',lambda e:errs.append('B:'+str(e)[:120]))
    A.click('[data-action="online"]');A.wait_for_timeout(300)
    A.click('#online-create');A.wait_for_timeout(1800)
    code=A.evaluate("()=>document.getElementById('online-room-code').textContent")
    print('CODE',code,flush=True)
    B.click('[data-action="online"]');B.wait_for_timeout(300)
    B.fill('#online-code',code);B.click('#online-join-btn');B.wait_for_timeout(1800)
    def v(g):return g.evaluate("()=>{const G=window.__PROPOOL__.game;return {seat:G.onlineSeat,turn:G.activePlayer,human:G.isHumanTurn(),tt:+(G.turnTime||0).toFixed(1),phase:G.phase}}")
    for g in [A,B]: g.evaluate("()=>{window.__M=[];window.Pool.Net.on('message',m=>window.__M.push(m.type))}")
    print('INIT',v(A),v(B),flush=True)
    A.wait_for_timeout(3200)
    print('T1',v(A),v(B),flush=True)
    A.wait_for_timeout(3200)
    print('T2',v(A),v(B),flush=True)
    print('A_MSGS',A.evaluate('()=>window.__M'),flush=True)
    print('ERRS',errs[:4],flush=True)
    b.close()
httpd.shutdown();proc.terminate()