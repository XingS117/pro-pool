/* 微信小游戏运行时模拟环境（供测试在同进程内加载） */
module.exports = function simulate() {
  const fs = require('fs');
  const path = require('path');
  const calls = [], store = {}, listeners = {};
  const results = [];
  const log = s => results.push(s);
  global.window = global;
  global.wx = {
    getSystemInfoSync: function () { return { screenWidth: 390, screenHeight: 844, pixelRatio: 3, platform: 'devtools', SDKVersion: '3.4.0' }; },
    createCanvas: function () { return require('./canvas-stub.js')(); },
    createWebAudioContext: function () { return {
      createGain: function () { return { connect: function () {}, gain: { value: 1 } }; },
      createBufferSource: function () { return { connect: function () {}, start: function () {}, onended: null }; },
      createOscillator: function () { return { connect: function () {}, start: function () {}, frequency: { value: 1 } }; },
      createDynamicsCompressor: function () { return { connect: function () {}, threshold: { value: 1 } }; },
      createBiquadFilter: function () { return { connect: function () {}, frequency: { value: 1 } }; },
      decodeAudioData: function (b, cb) { cb({ duration: 1 }); }, destination: {} }; },
    getStorageSync: function (k) { return store[k] === undefined ? '' : store[k]; },
    setStorageSync: function (k, v) { store[k] = v; },
    removeStorageSync: function (k) { delete store[k]; },
    showShareMenu: function () { calls.push('showShareMenu'); },
    onShareAppMessage: function () { calls.push('onShareAppMessage'); },
    onTouchStart: function (fn) { listeners.start = fn; },
    onTouchMove: function (fn) { listeners.move = fn; },
    onTouchEnd: function (fn) { listeners.end = fn; }
  };
  try {
    require('./adapter.js'); log('ADAPTER_OK'); }
  catch (e) { log('ADAPTER_ERR: ' + e.stack.slice(0, 400)); return { results: results, calls: calls, listeners: listeners }; }
  try {
    require('./core.js'); log('CORE_OK'); }
  catch (e) { log('CORE_ERR: ' + e.stack.slice(0, 400)); return { results: results, calls: calls, listeners: listeners }; }
  try {
    require('./mg-main.js'); log('MG_OK'); }
  catch (e) { log('MG_ERR: ' + e.stack.slice(0, 500)); return { results: results, calls: calls, listeners: listeners }; }
  log('adapterCanvas=' + (typeof wx.createCanvas === 'function'));
  log('adapterAudioCtx=' + (typeof window.AudioContext));
  log('adapterStorage=' + (typeof window.localStorage));
  log('adapterRaf=' + (typeof window.requestAnimationFrame));
  log('adapterAtob=' + (typeof window.atob));
  log('SHARE=' + calls.join(','));
  log('POOL=' + !!(window.Pool && window.Pool.Physics && window.Pool.Game && window.Pool.Renderer && window.Pool.AI));
  try { listeners.start({ touches: [{ clientX: 195, clientY: 844 * 0.62 }] }); log('T1_OK'); }
  catch (e) { log('T1_ERR: ' + e.message.slice(0, 120)); }
  try { listeners.start({ touches: [{ clientX: 195, clientY: 844 * 0.40 }] }); log('T2_OK'); }
  catch (e) { log('T2_ERR: ' + e.message.slice(0, 120)); }
  return { results: results, calls: calls, listeners: listeners, store: store };
};