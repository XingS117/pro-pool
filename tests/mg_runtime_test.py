# -*- coding: utf-8 -*-
"""模拟微信小游戏运行时，验证 adapter + core + mg-main 能启动并完成一杆"""
import fs, json, re, subprocess, sys, tempfile, os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
MG=ROOT/'wechat-minigame'
work=Path(tempfile.mkdtemp(prefix='mgtest_'))
for f in ['adapter.js','core.js','mg-main.js']:
    (work/f).write_text((MG/f).read_text(encoding='utf-8'), encoding='utf-8')
harness = r'''
// 模拟 wx 运行时
const calls=[];
const store={};
const listeners={};
global.wx={
  getSystemInfoSync:()=>({screenWidth:390,screenHeight:844,pixelRatio:3,platform:'devtools',SDKVersion:'3.4.0'}),
  createCanvas:()=>{const c=require('canvas-stub')();return c;},
  createWebAudioContext:()=>({createGain:()=>({connect(){},gain:{value:1}}),createBufferSource:()=>({connect(){},start(){},onended:null}),createOscillator:()=>({connect(){},start(){},frequency:{value:1}}),createDynamicsCompressor:()=>({connect(){},threshold:{value:1}}),createBiquadFilter:()=>({connect(){},frequency:{value:1}}),decodeAudioData:(b,cb)=>cb({duration:1}),destination:{}}),
  getStorageSync:k=>store[k]===undefined?'':store[k],
  setStorageSync:(k,v)=>{store[k]=v;},
  removeStorageSync:k=>{delete store[k];},
  showShareMenu:()=>{calls.push('showShareMenu');},
  onShareAppMessage:fn=>{calls.push('onShareAppMessage');},
  onTouchStart:fn=>{listeners.start=fn;},
  onTouchMove:fn=>{listeners.move=fn;},
  onTouchEnd:fn=>{listeners.end=fn;},
};
global.__MGTEST={calls,store,listeners};
require('./adapter.js');
require('./mg-main.js');
setTimeout(()=>{
  const t=global.__MGTEST;
  console.log('ADAPTER: wx.createCanvas=' + (typeof wx.createCanvas==='function'));
  console.log('ADAPTER: window.AudioContext=' + (typeof window.AudioContext));
  console.log('ADAPTER: localStorage=' + (typeof window.localStorage));
  console.log('ADAPTER: requestAnimationFrame=' + (typeof window.requestAnimationFrame));
  console.log('SHARE: ' + t.calls.join(','));
  console.log('POOL_LOADED: ' + (typeof window.Pool!=='undefined' && !!window.Pool.Physics));
  console.log('GAME_PHASE: ' + (window.__PROPOOL__ ? 'has-propool' : 'no-propool'));
  process.exit(0);
},600);
'''
(work/'canvas-stub.js').write_text("""module.exports=function(){return {width:0,height:0,style:{},getContext:()=>new Proxy({},{get:(t,k)=>{if(k==='canvas')return {};if(k==='createRadialGradient')return ()=>({addColorStop(){}});if(k==='createLinearGradient')return ()=>({addColorStop(){}});if(k==='measureText')return ()=>({width:10});if(k==='getImageData')return ()=>({data:[]});if(k==='putImageData')return ()=>{};if(k==='drawImage')return ()=>{};if(k==='fillRect')return ()=>{};if(k==='arc')return ()=>{};if(k==='beginPath')return ()=>{};if(k==='fill')return ()=>{};if(k==='stroke')return ()=>{};if(k==='save')return ()=>{};if(k==='restore')return ()=>{};if(k==='translate')return ()=>{};if(k==='rotate')return ()=>{};if(k==='scale')return ()=>{};if(k==='setLineDash')return ()=>{};if(k==='clip')return ()=>{};if(k==='fillText')return ()=>{};if(k==='strokeText')return ()=>{};if(k==='moveTo')return ()=>{};if(k==='lineTo')return ()=>{};if(k==='rect')return ()=>{};if(k==='clearRect')return ()=>{};if(k==='closePath')return ()=>{};if(k==='setTransform')return ()=>{};return ()=>{};},set:()=>true});}});""", encoding='utf-8')
(work/'main.js').write_text(harness, encoding='utf-8')
r=subprocess.run(['node', str(work/'main.js')], capture_output=True, text=True, timeout=60, cwd=str(work))
print(r.stdout.strip())
if r.returncode!=0:
    print('STDERR:', r.stderr[-1500:])
    sys.exit(1)