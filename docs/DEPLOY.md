# Deploying PRO POOL

The game is a static, dependency-free web app. There is nothing to install on a server.

## Option A — single file (recommended)

```bash
node scripts/build-standalone.mjs   # writes dist/pro-pool.html
```

Upload `dist/pro-pool.html` as `index.html` to any static host:

- GitHub Pages / Netlify / Cloudflare Pages / Vercel (static)
- nginx / Apache / Caddy static directory
- Object storage + CDN (S3, OSS, COS…) with static website hosting

The file inlines all CSS and JS and makes **no network requests**, so it also works
opened directly from disk (`file://`).

## Option B — source tree

Serve the repository root as static files (`index.html` + `css/` + `js/`).
Any static file server works; no build, no runtime, no database.

## Requirements & notes

- A modern browser (Chrome / Edge / Firefox / Safari). Canvas 2D + WebAudio only.
- Fullscreen uses the standard Fullscreen API; grant it if embedding in an iframe
  (`allow="fullscreen"`).
- Progress (coins/stars/owned cues) is stored in `localStorage` under a single key;
  it is per-origin and never leaves the browser.
- The optional first-party analytics beacon only fires when the page is served from
  the author's own domain; self-hosted and local copies send nothing.

## Embedding in a page

```html
<iframe src="/games/pool/index.html" allow="fullscreen" style="width:100%;height:100vh;border:0"></iframe>
```

## Verifying a deploy

Open the page, start a match, take a shot. If balls move and sound plays, the deploy
is good. For automated checks run `node tests/run_all.mjs` (includes browser audits).
