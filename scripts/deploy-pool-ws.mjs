
/* 部署在线对战信令服务器到 xingshuwen.com（复用游戏部署脚本的 SSH 凭据） */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY_FILE = process.env.POOL_SSH_KEY_FILE || 'D:/Sven/60-备份/敏感凭据/腾讯云.txt';
function sshInfo() {
  const raw = fs.readFileSync(KEY_FILE, 'utf8');
  const lines = raw.split(/\r?\n/);
  const b = lines.findIndex(l => l.includes('-----BEGIN RSA PRIVATE KEY-----'));
  const e = lines.findIndex(l => l.includes('-----END RSA PRIVATE KEY-----'));
  if (b < 0 || e <= b) throw new Error('私钥格式错误');
  const hl = lines.find(l => /服务器IPv4/.test(l));
  const host = hl ? hl.split(/[:：]/).pop().trim() : '111.229.187.91';
  return { privateKey: lines.slice(b, e + 1).join('\n') + '\n', host };
}
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const { Client } = require('../推广/node_modules/ssh2');
const ssh = sshInfo();
const client = new Client();
const run = (cmd) => new Promise((resolve, reject) => {
  client.exec(cmd, (err, stream) => {
    if (err) return reject(err);
    let out = '', eo = '';
    stream.on('data', d => out += d); stream.stderr.on('data', d => eo += d);
    stream.on('close', code => resolve({ code, out, eo }));
  });
});
const put = (sftp, local, remote) => new Promise((resolve, reject) => sftp.fastPut(local, remote, e => e ? reject(e) : resolve()));
await new Promise((resolve, reject) => { client.on('ready', resolve); client.on('error', reject);
  client.connect({ host: ssh.host, port: 22, username: 'ubuntu', privateKey: ssh.privateKey }); });
const sftp = await new Promise((resolve, reject) => client.sftp((e, s) => e ? reject(e) : resolve(s)));
await run('sudo mkdir -p /opt/pool-ws');
await put(sftp, path.join(ROOT, 'server/pool-ws.mjs'), '/tmp/pool-ws.mjs');
await run('sudo install -m 644 -o root -g root /tmp/pool-ws.mjs /opt/pool-ws/pool-ws.mjs');
let r = await run('node -v; npm -v; [ -d /opt/pool-ws/node_modules/ws ] && echo WS_OK || echo WS_MISSING');
console.log('--- remote env ---\n' + r.out);
if (r.out.includes('WS_MISSING')) {
  r = await run('cd /opt/pool-ws && sudo npm install ws@8 --omit=dev --silent 2>&1 | tail -5');
  console.log('--- npm install ---\n' + r.out);
}
const service = '[Unit]\nDescription=PRO POOL WebSocket Signaling\nAfter=network.target\n\n[Service]\nType=simple\nUser=root\nWorkingDirectory=/opt/pool-ws\nExecStart=/usr/bin/node /opt/pool-ws/pool-ws.mjs\nRestart=always\nEnvironment=POOL_WS_PORT=8787\nEnvironment=POOL_WS_HOST=127.0.0.1\n\n[Install]\nWantedBy=multi-user.target\n';
const svcLocal = path.join(ROOT, 'tests/_pool-ws.service');
fs.writeFileSync(svcLocal, service, 'utf8');
await put(sftp, svcLocal, '/tmp/pool-ws.service');
r = await run('sudo install -m 644 /tmp/pool-ws.service /etc/systemd/system/pool-ws.service && sudo systemctl daemon-reload && sudo systemctl enable --now pool-ws && sudo systemctl restart pool-ws && sleep 2 && sudo systemctl is-active pool-ws');
console.log('--- systemd ---\n' + r.out + r.eo);
// nginx 反代（幂等）：在主域名配置里插入 /pool-ws/ location
const locBlock = "    location /pool-ws/ {\n      proxy_pass http://127.0.0.1:8787/;\n      proxy_http_version 1.1;\n      proxy_set_header Upgrade $http_upgrade;\n      proxy_set_header Connection \"upgrade\";\n      proxy_set_header Host $host;\n    }\n";
const locLocal = path.join(ROOT, "tests/_pool-ws.location.conf");
fs.writeFileSync(locLocal, locBlock, "utf8");
await put(sftp, locLocal, "/tmp/pool-ws.location.conf");
const nginxCmd = [
  "CFG=$(grep -rl \"server_name.*xingshuwen.com\" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | head -1)",
  "if [ -z \"$CFG\" ]; then echo NO_NGINX_CONFIG; exit 0; fi",
  "if grep -q \"/pool-ws/\" \"$CFG\"; then echo ALREADY_CONFIGURED; exit 0; fi",
  "sudo cp \"$CFG\" \"$CFG.bak.poolws.$(date +%s)\"",
  "sudo python3 -c \"import sys;p=sys.argv[1];t=open(p).read();i=t.rfind('}');t=t[:i]+open('/tmp/pool-ws.location.conf').read()+t[i:];open(p,'w').write(t)\" \"$CFG\"",
  "sudo nginx -t && sudo systemctl reload nginx && echo NGINX_OK",
].join("; ");
r = await run(nginxCmd);
console.log("--- nginx ---\n" + r.out + r.eo);
try { sftp.end(); } catch (e) {} client.end();
