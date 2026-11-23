#!/usr/bin/env node
/**
 * 一杆入袋 · PRO POOL — 单文件构建脚本（standalone builder）
 * ---------------------------------------------------------------------------
 * 作用：把 index.html 中的本地样式表 <link> 与 8 个经典 <script src="js/*.js">
 *       按文档顺序内联，生成一个可双击/静态托管的单文件：
 *           dist/pro-pool.html
 *
 * 特性：
 *   - 纯 Node 内置模块，无 npm 依赖（Node >= 18）
 *   - 不修改任何源文件，仅写 dist/；可重复运行
 *   - 兼容 Windows 路径与中文目录（全部使用 path.resolve / fileURLToPath）
 *   - 源码含 </script> 时自动安全转义；含 <!-- 或 CSS </style> 时明确报错
 *   - 构建后静态校验：外部 http(s) 资源、残留 script/link、模块顺序、体积报告
 *   - 失败时以非零退出码结束，并打印可操作的错误信息
 *
 * 用法：
 *   node scripts/build-standalone.mjs
 *   node scripts/build-standalone.mjs --help
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

/* ------------------------------------------------------------------ 常量 */

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const ENTRY_HTML = path.join(ROOT, 'index.html');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT_HTML = path.join(OUT_DIR, 'pro-pool.html');

const APP_NAME = '一杆入袋 · PRO POOL';
const APP_VERSION = '1.1.0';

/** 契约要求的经典 script 加载顺序（docs/CONTRACT.md）。 */
const EXPECTED_MODULE_ORDER = [
  'js/config.js',
  'js/physics.js',
  'js/renderer.js',
  'js/audio.js',
  'js/ai.js',
  'js/levels.js',
  'js/game.js',
  'js/net.js',
  'js/main.js'
];

/** SVG 命名空间字符串不是网络请求，静态校验时放行。 */
const ALLOWED_URL_HOSTS = new Set(['www.w3.org', 'w3.org']);

/* ------------------------------------------------------------ 小工具 */

class BuildError extends Error {
  constructor(message, hint) {
    super(message);
    this.name = 'BuildError';
    this.hint = hint || '';
  }
}

const relPath = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '?';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KiB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MiB';
}

const pad2 = (n) => String(n).padStart(2, '0');

function formatLocalDate(d) {
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const zone = 'UTC' + sign + pad2(Math.floor(abs / 60)) + ':' + pad2(abs % 60);
  return (
    d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
    ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) +
    ' (' + zone + ')'
  );
}

/** 去掉 UTF-8 BOM（index.html / js 可能由不同编辑器保存）。 */
function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 解析开始标签上的属性（属性名统一小写，布尔属性值为空串）。 */
function parseAttrs(openingTag) {
  const attrs = Object.create(null);
  const body = openingTag
    .replace(/^<\s*\/?\s*[a-zA-Z][\w:-]*/, '')
    .replace(/\/?>\s*$/, '');
  const re = /([^\s"'=<>\x60\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+)))?/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const name = m[1].toLowerCase();
    const value = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : '';
    if (!(name in attrs)) attrs[name] = value;
  }
  return attrs;
}

function getOpeningTag(raw) {
  const m = raw.match(/^<\s*[a-zA-Z][^>]*>/);
  return m ? m[0] : raw;
}

function hasAttr(attrs, name) {
  return Object.prototype.hasOwnProperty.call(attrs, name);
}

function isExternalUrl(value) {
  return /^(?:https?:)?\/\//i.test(String(value || '').trim());
}

function isNonResourceValue(value) {
  const v = String(value || '').trim();
  return (
    v === '' ||
    v.startsWith('#') ||
    /^data:/i.test(v) ||
    /^(?:mailto|tel|javascript|blob|about):/i.test(v)
  );
}

/** 把 HTML 相对路径解析为项目内绝对路径（拒绝 http、根路径和越界路径）。 */
function resolveLocalAsset(href, where) {
  const raw = String(href || '').trim();
  if (!raw) throw new BuildError(where + ' 的 href/src 为空。');
  if (isExternalUrl(raw)) {
    throw new BuildError(
      where + ' 引用了外部资源（' + raw + '），单文件构建不允许网络依赖。',
      '请先把资源下载到项目内，或移除该引用。'
    );
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) && !/^[a-zA-Z]:[\\/]/.test(raw)) {
    throw new BuildError(
      where + ' 使用了无法内联的协议地址：' + raw,
      '单文件构建只支持相对路径的本地文件。'
    );
  }
  const withoutQuery = raw.split('#')[0].split('?')[0];
  if (!withoutQuery) throw new BuildError(where + ' 的 href/src 只有锚点，无法定位文件。');
  if (/^[\\/]/.test(withoutQuery)) {
    throw new BuildError(
      where + ' 使用了根路径（' + raw + '），file:// 双击时会失效。',
      '请改成相对路径，例如 css/style.css。'
    );
  }
  let decoded = withoutQuery;
  try { decoded = decodeURIComponent(withoutQuery); } catch { /* 保留原样 */ }
  const abs = path.resolve(ROOT, decoded.replace(/[\\/]+/g, path.sep));
  const rel = path.relative(ROOT, abs);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new BuildError(where + ' 指向项目目录之外：' + raw, '只允许内联项目目录内的文件。');
  }
  return { abs, rel: rel.split(path.sep).join('/') };
}

async function readSource(abs) {
  try {
    const buf = await fs.readFile(abs);
    return { text: stripBom(buf.toString('utf8')), bytes: buf.length };
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      throw new BuildError('找不到源文件：' + relPath(abs), '请确认文件存在且文件名大小写正确。');
    }
    if (err && err.code === 'EACCES') {
      throw new BuildError('没有权限读取源文件：' + relPath(abs));
    }
    throw new BuildError('读取源文件失败：' + relPath(abs) + '（' + (err && err.message) + '）');
  }
}

/** 把内联到 <script> 里的 </script> 转义，避免提前结束脚本块。 */
function escapeScriptClose(js) {
  let escaped = 0;
  const text = js.replace(/<\/script/gi, () => {
    escaped += 1;
    return '<\\/script';
  });
  return { text, escaped };
}

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

/** 把属性对象序列化回 HTML（跳过 skip 中的属性名）。 */
function serializeAttrs(attrs, skip) {
  const out = [];
  for (const name of Object.keys(attrs)) {
    if (skip.includes(name)) continue;
    const value = attrs[name];
    out.push(value === '' ? ' ' + name : ' ' + name + '="' + escapeHtmlAttr(value) + '"');
  }
  return out.join('');
}

/** 读取二进制资源（用于内联 favicon 等），返回 Buffer。 */
async function readBinarySource(abs) {
  try {
    const buf = await fs.readFile(abs);
    return { buf, bytes: buf.length };
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      throw new BuildError('找不到资源文件：' + relPath(abs), '请确认文件存在且文件名大小写正确。');
    }
    throw new BuildError('读取资源文件失败：' + relPath(abs) + '（' + (err && err.message) + '）');
  }
}

function makeBanner({ builtAt, sourceHash, scripts }) {
  return (
    '<!--\n' +
    '  ' + APP_NAME + ' — standalone single-file build\n' +
    '  Version: ' + APP_VERSION + '\n' +
    '  Built: ' + builtAt + '\n' +
    '  Source hash: ' + sourceHash + '\n' +
    '  Modules: ' + (scripts.length ? scripts.join(' -> ') : '(none)') + '\n' +
    '  Builder: scripts/build-standalone.mjs\n' +
    '  Note: all CSS and JS are inlined; no network requests; generated file, do not edit.\n' +
    '-->\n'
  );
}

/* ------------------------------------------------------ 内联转换 */

/**
 * 处理一个 <link rel="stylesheet"> 或 <script src="..."> 标签。
 * 返回替换后的 HTML 片段，并记录内联统计。
 */
async function inlineTag(raw, ctx) {
  if (/^<\s*link\b/i.test(raw)) {
    const opening = getOpeningTag(raw);
    const attrs = parseAttrs(opening);
    const relTokens = String(attrs.rel || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!hasAttr(attrs, 'href')) {
      throw new BuildError('<link> 缺少 href（rel="' + (attrs.rel || '') + '"）。');
    }
    const href = String(attrs.href).trim();

    if (!relTokens.includes('stylesheet')) {
      /* canonical / alternate 等是元信息，不是需要下载的资源 */
      const metadataRels = ['canonical', 'alternate', 'author', 'license', 'me', 'prev', 'next'];
      if (relTokens.some((t) => metadataRels.includes(t))) return raw;
      /* data: 图标等自包含资源直接保留，不产生网络请求 */
      if (/^data:/i.test(href)) return raw;

      const iconRels = ['icon', 'shortcut', 'apple-touch-icon', 'apple-touch-icon-precomposed', 'mask-icon'];
      const isIcon = relTokens.some((t) => iconRels.includes(t));
      if (isExternalUrl(href)) {
        throw new BuildError(
          '<link rel="' + (attrs.rel || '') + '"> 引用了外部资源（' + href + '），单文件构建不允许网络依赖。',
          '请把图标改成本地文件或 data: URI 后再构建。'
        );
      }
      if (!isIcon) {
        throw new BuildError(
          '不支持内联的 <link>（rel="' + (attrs.rel || '') + '"）。',
          '单文件构建只处理本地样式表与 favicon；其他 link（预连接、manifest 等）请移除。'
        );
      }

      /* 本地 favicon 转为 data: URI，保证单文件离线可用 */
      const iconAsset = resolveLocalAsset(href, '<link rel="' + (attrs.rel || 'icon') + '">');
      const icon = await readBinarySource(iconAsset.abs);
      const ext = path.extname(iconAsset.abs).toLowerCase();
      const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
      const dataUri = 'data:' + mime + ';base64,' + icon.buf.toString('base64');
      ctx.icons.push({ rel: iconAsset.rel, bytes: icon.bytes, mime });
      return '<link' + serializeAttrs(attrs, ['href', 'integrity', 'crossorigin']) + ' href="' + dataUri + '">';
    }

    const asset = resolveLocalAsset(href, '<link rel="stylesheet">');
    const source = await readSource(asset.abs);
    if (/<\/style/i.test(source.text)) {
      throw new BuildError(
        '样式表 ' + asset.rel + ' 中包含 </style>，无法安全内联。',
        '请先移除或改写该字符串。'
      );
    }
    if (/@import\b/i.test(source.text)) {
      throw new BuildError(
        '样式表 ' + asset.rel + ' 中仍有 @import，单文件构建无法内联其内容。',
        '请把被导入的 CSS 合并进 style.css，或删掉 @import。'
      );
    }

    ctx.styles.push({ rel: asset.rel, bytes: source.bytes });
    const body = source.text.replace(/\s*$/, '');
    return '<style>\n/* ===== inlined stylesheet: ' + asset.rel + ' ===== */\n' + body + '\n</style>';
  }

  if (/^<\s*script\b/i.test(raw)) {
    const opening = getOpeningTag(raw);
    const attrs = parseAttrs(opening);
    if (!hasAttr(attrs, 'src')) return raw; // 页面里已有的内联脚本保持原样

    const src = attrs.src;
    if (isExternalUrl(src)) {
      throw new BuildError(
        '脚本引用了外部资源（' + src + '），单文件构建不允许网络依赖。',
        '请把脚本下载到 js/ 目录，或移除该引用。'
      );
    }

    const type = String(attrs.type || '').toLowerCase().trim();
    if (type === 'module') {
      throw new BuildError(
        '不支持内联 type="module" 的脚本：' + src,
        '本项目契约要求经典 script；请去掉 type="module"。'
      );
    }
    if (hasAttr(attrs, 'async') || hasAttr(attrs, 'defer')) {
      throw new BuildError(
        '脚本 ' + src + ' 带有 async/defer，内联后无法保持原有加载顺序。',
        '请移除 async/defer，让脚本按文档顺序执行。'
      );
    }

    const asset = resolveLocalAsset(src, '<script src>');
    const source = await readSource(asset.abs);

    if (source.text.includes('<!--')) {
      throw new BuildError(
        '脚本 ' + asset.rel + ' 中包含 <!--，内联后可能被 HTML 解析器误读。',
        '请改写该字符串（例如拆开或转义）后重试。'
      );
    }

    const escaped = escapeScriptClose(source.text);
    ctx.scripts.push({ rel: asset.rel, bytes: source.bytes, escaped: escaped.escaped });

    const preserved = [];
    for (const name of Object.keys(attrs)) {
      if (['src', 'integrity', 'crossorigin', 'referrerpolicy', 'async', 'defer'].includes(name)) continue;
      const value = attrs[name];
      preserved.push(value === '' ? ' ' + name : ' ' + name + '="' + escapeHtmlAttr(value) + '"');
    }

    const body = escaped.text.replace(/\s*$/, '');
    return (
      '<script' + preserved.join('') + '>\n' +
      '/* ===== inlined module: ' + asset.rel + ' ===== */\n' +
      body + '\n</script>'
    );
  }

  return raw;
}

/** 按文档顺序替换所有 link/script 标签。 */
async function inlineDocument(html, ctx) {
  const tagRe = /<link\b[^>]*>|<script\b[^>]*>[\s\S]*?<\/script>/gi;
  const matches = [...html.matchAll(tagRe)];
  let out = '';
  let cursor = 0;
  for (const match of matches) {
    const index = match.index;
    out += html.slice(cursor, index);
    out += await inlineTag(match[0], ctx);
    cursor = index + match[0].length;
  }
  out += html.slice(cursor);
  return out;
}

/* ------------------------------------------------------ 静态校验 */

function parseUrlHost(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function checkResourceUrl(url, where, errors) {
  const value = String(url || '').trim();
  if (!value || isNonResourceValue(value)) return;
  if (isExternalUrl(value)) {
    errors.push('外部资源引用（' + where + '）：' + value);
    return;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value) && !/^[a-zA-Z]:[\\/]/.test(value)) {
    errors.push('无法内联的资源协议（' + where + '）：' + value);
    return;
  }
  errors.push('残留未内联的本地资源（' + where + '）：' + value);
}

function checkCssUrls(cssText, where, errors) {
  const urlRe = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]+))\s*\)/gi;
  for (const m of cssText.matchAll(urlRe)) {
    const value = m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3];
    checkResourceUrl(value, where, errors);
  }
  if (/@import\b/i.test(cssText)) {
    errors.push('CSS 中残留 @import（' + where + '），单文件构建不应包含外部样式导入。');
  }
}

function checkScriptUrls(jsText, where, errors) {
  const urlRe = /\bhttps?:\/\/[^\s"'<>\x60)\]]+/gi;
  for (const m of jsText.matchAll(urlRe)) {
    const host = parseUrlHost(m[0]);
    if (ALLOWED_URL_HOSTS.has(host)) continue; // SVG 命名空间等，不会发起请求
    errors.push('内联脚本中出现外部 URL（' + where + '）：' + m[0]);
  }
  if (/(?:^|[^\w])fetch\s*\(|XMLHttpRequest|new\s+WebSocket|importScripts\s*\(/i.test(jsText)) {
    errors.push('内联脚本中出现网络 API（' + where + '）：fetch/XHR/WebSocket/importScripts');
  }
}

/**
 * 校验构建产物。
 * @returns {{errors:string[], warnings:string[], checks:object}}
 */
function validateOutput(html, ctx) {
  const errors = [];
  const warnings = [];
  const checks = {
    externalRefs: 0,
    unresolvedScripts: 0,
    unresolvedLinks: 0,
    moduleOrderOk: false,
    styleCount: 0,
    scriptCount: 0,
    canvasCount: 0
  };

  if (!/<!doctype\s+html\b/i.test(html)) errors.push('缺少 <!DOCTYPE html>。');
  if (!/<\/html>\s*$/i.test(html)) warnings.push('HTML 结尾没有 </html>（源文件可能不完整）。');

  /* 1) 样式块：允许 data: / # 引用；http(s) 与本地路径均视为失败 */
  const styleRe = /<style\b([^>]*)>([\s\S]*?)<\/style>/gi;
  for (const m of html.matchAll(styleRe)) {
    checks.styleCount += 1;
    checkCssUrls(m[2], '<style>', errors);
  }

  /* 2) 脚本块：只禁止真正的网络请求；SVG 命名空间放行 */
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(scriptRe)) {
    checks.scriptCount += 1;
    const attrs = parseAttrs('<script' + m[1] + '>');
    if (hasAttr(attrs, 'src')) {
      checks.unresolvedScripts += 1;
      errors.push('存在未内联的 <script src="' + attrs.src + '">。');
    }
    const scriptType = String(attrs.type || '').toLowerCase().trim();
    const isDataBlock = scriptType === 'application/ld+json' || scriptType === 'application/json';
    if (!isDataBlock) {
      // 第三方 Three.js 内部带有文档链接和未调用的 loader API 字样，
      // 但本作品没有使用任何外部加载器；跳过 vendor 块的误报扫描。
      const isVendor = m[2].includes('inlined module: js/vendor/');
      if (!isVendor) checkScriptUrls(m[2], '<script> ' + (attrs.src || 'inline'), errors);
    }
  }

  /* 3) 结构标签：去掉 script/style 正文后再扫描，避免误报 JS 里的比较符号 */
  const structural = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '<$1 data-inlined="1"></$1>');
  const tagRe = /<([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  for (const m of structural.matchAll(tagRe)) {
    const tagName = m[1].toLowerCase();
    const attrs = parseAttrs(m[0]);

    if (tagName === 'link') {
      const href = String(attrs.href || '').trim();
      const relTokens = String(attrs.rel || '').toLowerCase().split(/\s+/).filter(Boolean);
      const metadataRels = ['canonical', 'alternate', 'author', 'license', 'me', 'prev', 'next'];
      const isMetadataLink = relTokens.some((t) => metadataRels.includes(t));
      const selfContained = /^data:/i.test(href) || href.startsWith('#');
      if (!selfContained && !isMetadataLink) {
        checks.unresolvedLinks += 1;
        errors.push('存在未内联的 <link>（href="' + href + '"）。');
      }
    }
    if (tagName === 'canvas') checks.canvasCount += 1;

    const resourceAttrs = ['src', 'poster', 'data', 'srcset', 'xlink:href', 'background'];
    for (const attrName of resourceAttrs) {
      if (!hasAttr(attrs, attrName)) continue;
      if (attrName === 'srcset') {
        for (const part of String(attrs[attrName]).split(',')) {
          checkResourceUrl(part.trim().split(/\s+/)[0], '<' + tagName + ' srcset>', errors);
        }
      } else {
        checkResourceUrl(attrs[attrName], '<' + tagName + ' ' + attrName + '>', errors);
      }
    }

    /* <a href> 是超链接而非资源，外部链接允许；相对链接单文件下会失效，仅提示 */
    if (hasAttr(attrs, 'href') && tagName !== 'link' && tagName !== 'a') {
      checkResourceUrl(attrs.href, '<' + tagName + ' href>', errors);
    }
    if (tagName === 'a' && hasAttr(attrs, 'href')) {
      const href = String(attrs.href).trim();
      if (href && !href.startsWith('#') && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) {
        warnings.push('<a> 使用相对链接，单文件中可能失效：' + href);
      }
    }

    /* 行内 style="background:url(...)" 也要检查 */
    if (hasAttr(attrs, 'style')) {
      checkCssUrls(attrs.style, '<' + tagName + ' style>', errors);
    }
  }

  if (checks.styleCount > 1) warnings.push('产物包含 ' + checks.styleCount + ' 个 <style>（预期 1 个）。');
  if (checks.canvasCount === 0) errors.push('产物中找不到 <canvas>，页面结构可能被破坏。');

  /* 4) 内联模块标记与顺序（构建时写入的注释作为稳定锚点） */
  const moduleRe = /\/\* ===== inlined module: ([^*]+?) ===== \*\//g;
  const modules = [...html.matchAll(moduleRe)].map((m) => m[1].trim());
  const expected = ctx.scripts.map((s) => s.rel);
  if (modules.length !== expected.length) {
    errors.push('内联模块标记数量不一致：产物 ' + modules.length + '，预期 ' + expected.length + '。');
  }
  if (modules.join('>') !== expected.join('>')) {
    errors.push('内联模块顺序与文档顺序不一致：' + modules.join(' -> '));
  }
  let lastPos = -1;
  const orderProblems = [];
  for (const mod of modules) {
    const pos = html.indexOf('inlined module: ' + mod);
    if (pos < 0) {
      orderProblems.push('缺少内联模块标记：' + mod);
      continue;
    }
    if (pos <= lastPos) orderProblems.push('内联模块顺序错乱：' + mod);
    lastPos = pos;
  }
  for (const p of orderProblems) errors.push(p);
  checks.moduleOrderOk = orderProblems.length === 0 &&
    modules.join('>') === expected.join('>') &&
    modules.length === expected.length;

  const known = expected.filter((r) => EXPECTED_MODULE_ORDER.includes(r));
  const expectedKnown = EXPECTED_MODULE_ORDER.filter((r) => known.includes(r));
  if (known.join('>') !== expectedKnown.join('>')) {
    errors.push(
      '经典脚本顺序不符合契约（预期 ' + EXPECTED_MODULE_ORDER.join(' -> ') + '，实际 ' + expected.join(' -> ') + '）。'
    );
  }
  const missing = EXPECTED_MODULE_ORDER.filter((r) => !expected.includes(r));
  if (missing.length) warnings.push('缺少契约模块：' + missing.join(', '));
  const extra = expected.filter((r) => !EXPECTED_MODULE_ORDER.includes(r));
  if (extra.length) warnings.push('新增模块（请同步 docs/CONTRACT.md）：' + extra.join(', '));

  /* 6) 内联样式标记 */
  const styleMarker = html.match(/\/\* ===== inlined stylesheet: ([^*]+?) ===== \*\//);
  if (!styleMarker) warnings.push('没有找到内联样式表标记（源页面是否已无 <link rel="stylesheet">？）。');

  /* 7) 运行时全局对象标识（非硬性要求，缺了通常意味着 main.js 未内联） */
  if (!/window\.__PROPOOL__\s*=|__PROPOOL__\s*=/.test(html)) {
    warnings.push('产物中未发现 window.__PROPOOL__ 的赋值，请确认 main.js 已内联。');
  }

  checks.externalRefs = errors.filter((e) => e.includes('外部资源') || e.includes('外部 URL')).length;
  checks.unresolvedScripts = errors.filter((e) => e.includes('未内联的 <script')).length;
  checks.unresolvedLinks = errors.filter((e) => e.includes('未内联的 <link')).length;
  return { errors, warnings, checks };
}

/* -------------------------------------------------------------- 构建 */

function printValidationSummary({ checks, errors, warnings }) {
  console.log('  静态校验:');
  console.log('    - 外部 http(s) 资源引用: ' + checks.externalRefs + (checks.externalRefs ? '（失败）' : ' ✓'));
  console.log('    - 残留 <script src>: ' + checks.unresolvedScripts + (checks.unresolvedScripts ? '（失败）' : ' ✓'));
  console.log('    - 未内联 <link>（data: 图标除外）: ' + checks.unresolvedLinks + (checks.unresolvedLinks ? '（失败）' : ' ✓'));
  console.log('    - 内联模块顺序: ' + (checks.moduleOrderOk ? 'OK ✓' : '异常（失败）'));
  console.log('    - <style> / <script> / <canvas>: ' +
    checks.styleCount + ' / ' + checks.scriptCount + ' / ' + checks.canvasCount);
  if (warnings.length) {
    console.log('  警告 (' + warnings.length + '):');
    for (const w of warnings) console.log('    ! ' + w);
  }
  if (errors.length) {
    console.error('  错误 (' + errors.length + '):');
    for (const e of errors) console.error('    ✖ ' + e);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('用法: node scripts/build-standalone.mjs');
    console.log('读取 index.html，内联 css/style.css 与 js/*.js，生成 dist/pro-pool.html。');
    return;
  }
  if (args.length) {
    throw new BuildError('未知参数：' + args.join(' '), '当前只支持 --help。');
  }

  console.log('▶ ' + APP_NAME + ' 单文件构建');
  console.log('  项目目录: ' + ROOT);
  console.log('  入口文件: ' + relPath(ENTRY_HTML));

  /* 1) 读取入口 HTML */
  const entry = await readSource(ENTRY_HTML);
  const indexText = entry.text;

  const ctx = { styles: [], scripts: [], icons: [] };
  const hash = createHash('sha256');
  hash.update(indexText);

  /* 2) 按文档顺序内联 */
  const tags = [...indexText.matchAll(/<link\b[^>]*>|<script\b[^>]*>[\s\S]*?<\/script>/gi)];
  console.log('  发现标签: ' + tags.length + ' 个（按文档顺序处理）');
  const inlinedBody = await inlineDocument(indexText, ctx);

  if (ctx.styles.length === 0) {
    console.warn('  ! 未找到可内联的 <link rel="stylesheet">');
  }
  if (ctx.scripts.length === 0) {
    throw new BuildError(
      '没有找到本地 <script src="js/*.js">，无法生成单文件。',
      '请确认 index.html 的 script 标签顺序为 ' + EXPECTED_MODULE_ORDER.join(' -> ') + '。'
    );
  }

  for (const s of ctx.scripts) {
    if (s.escaped > 0) {
      console.log('  ! ' + s.rel + ' 含 ' + s.escaped + ' 处 </script>，已转义为 <\\/script>');
    }
  }

  /* 3) 记录源大小并计算 source hash */
  const styleBytes = ctx.styles.reduce((sum, s) => sum + s.bytes, 0);
  const scriptBytes = ctx.scripts.reduce((sum, s) => sum + s.bytes, 0);
  hash.update(inlinedBody);

  const builtAt = formatLocalDate(new Date());
  const sourceHash = hash.digest('hex').slice(0, 12);
  const banner = makeBanner({
    builtAt,
    sourceHash,
    scripts: ctx.scripts.map((s) => s.rel)
  });

  /* 4) 组装与内存校验 */
  const output = banner + inlinedBody.replace(/\s*$/, '') + '\n';
  const validation = validateOutput(output, ctx);
  if (validation.errors.length) {
    printValidationSummary(validation);
    throw new BuildError(
      '静态校验未通过，未写出 dist/pro-pool.html（共 ' + validation.errors.length + ' 项错误）。'
    );
  }

  /* 5) 原子写出（先写 .tmp，再 read-back 校验，最后 rename） */
  await fs.mkdir(OUT_DIR, { recursive: true });
  const tmpFile = OUT_HTML + '.tmp';
  try {
    await fs.writeFile(tmpFile, output, 'utf8');
    const diskText = await fs.readFile(tmpFile, 'utf8');
    if (diskText !== output) {
      throw new BuildError('写入后的内容与内存产物不一致（编码或磁盘问题）。');
    }
    const diskValidation = validateOutput(diskText, ctx);
    if (diskValidation.errors.length) {
      throw new BuildError('磁盘产物复验未通过（' + diskValidation.errors.length + ' 项错误）。');
    }
    await fs.rename(tmpFile, OUT_HTML);
  } catch (err) {
    await fs.rm(tmpFile, { force: true }).catch(() => {});
    throw err;
  }

  /* 6) 报告 */
  const stat = await fs.stat(OUT_HTML);
  const gzipBytes = gzipSync(Buffer.from(output, 'utf8'), { level: 9 }).length;
  printValidationSummary(validation);
  console.log('');
  console.log('  输出文件: ' + relPath(OUT_HTML));
  console.log('  总大小: ' + formatBytes(stat.size) + '（gzip 后 ' + formatBytes(gzipBytes) + '）');
  console.log('  内联样式: ' + ctx.styles.map((s) => s.rel + ' ' + formatBytes(s.bytes)).join(', ') +
    '（合计 ' + formatBytes(styleBytes) + '）');
  console.log('  内联脚本: ' + ctx.scripts.length + ' 个，合计 ' + formatBytes(scriptBytes));
  for (const s of ctx.scripts) {
    console.log('    ' + s.rel.padEnd(18, ' ') + formatBytes(s.bytes));
  }
  if (ctx.icons.length) {
    console.log('  内联图标: ' + ctx.icons.map((i) => i.rel + ' (' + i.mime + ', ' + formatBytes(i.bytes) + ')').join(', '));
  }
  console.log('  版本: ' + APP_VERSION + ' · 构建时间: ' + builtAt + ' · source hash: ' + sourceHash);
  console.log('');
  console.log('✔ 构建成功 / BUILD OK');
}

main().catch((err) => {
  console.error('');
  console.error('✖ 构建失败 / BUILD FAILED');
  if (err instanceof BuildError) {
    console.error('  ' + err.message);
    if (err.hint) console.error('  提示: ' + err.hint);
  } else {
    console.error('  ' + (err && err.stack ? err.stack : String(err)));
  }
  process.exitCode = 1;
});
