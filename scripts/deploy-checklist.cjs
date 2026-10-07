#!/usr/bin/env node
'use strict';

/**
 * Tailor Fit — Smart Deployment Checklist
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs automatically on `pnpm install` (postinstall) and `pnpm run build`
 * (postbuild). Scans actual source files to report real DONE/TODO status —
 * never lies by hardcoding a status that might be wrong.
 *
 * Add to root package.json scripts:
 *   "postinstall": "node scripts/deploy-checklist.cjs",
 *   "postbuild":   "node scripts/deploy-checklist.cjs"
 *
 * Environment Detection:
 *   VERCEL=1           → Vercel (frontend only) checklist
 *   RENDER=1           → Render (staging/prototyping) checklist
 *   neither            → VPS / Local backend checklist
 *
 * Manual overrides:
 *   node scripts/deploy-checklist.cjs --vercel
 *   node scripts/deploy-checklist.cjs --render
 *   node scripts/deploy-checklist.cjs --vps
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── All requires at top — never inside functions ─────────────────────────────
const fs = require('fs');
const path = require('path');
const os = require('os');

// ── Root of the project (one level up from /scripts/) ────────────────────────
const ROOT = path.resolve(__dirname, '..');
const SERVER = path.join(ROOT, 'server');

// ── ANSI Colors ───────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

// ── Counters for summary ──────────────────────────────────────────────────────
const counts = { critical: 0, warn: 0, todo: 0, done: 0, info: 0 };

// ── File-reading helpers ──────────────────────────────────────────────────────
function readFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch { return null; }
}

function fileExists(filePath) {
  try { return fs.existsSync(filePath); }
  catch { return false; }
}

function fileContains(filePath, searchStr) {
  const content = readFile(filePath);
  return content !== null && content.includes(searchStr);
}

// ── Deployment type detection ─────────────────────────────────────────────────
function detectEnv() {
  const args = process.argv.slice(2);
  if (args.includes('--vercel') || process.env.VERCEL || process.env.VERCEL_ENV) return 'vercel';
  if (args.includes('--render') || process.env.RENDER) return 'render';
  if (args.includes('--vps')) return 'vps';
  return 'vps'; // default: local / VPS
}

// ── First-run vs update detection ─────────────────────────────────────────────
function detectDeployType() {
  const serverEnvExists = fileExists(path.join(SERVER, '.env'));
  const rootEnvExists = fileExists(path.join(ROOT, '.env'));
  const pm2Exists = fileExists(path.join(SERVER, 'ecosystem.config.cjs'))
    || fileExists(path.join(ROOT, 'ecosystem.config.cjs'));
  if (serverEnvExists || rootEnvExists || pm2Exists) return 'UPDATE';
  return 'FIRST-TIME SETUP';
}

// ── Print helpers ─────────────────────────────────────────────────────────────
function hr(char = '─', len = 60) {
  console.log(c.dim + char.repeat(len) + c.reset);
}

function section(title, emoji = '📋') {
  console.log('');
  hr('═');
  console.log(`${c.bold}${c.cyan} ${emoji}  ${title}${c.reset}`);
  hr('═');
}

function subsection(title) {
  console.log('');
  console.log(`  ${c.bold}${c.blue}▸ ${title}${c.reset}`);
  hr('·', 50);
}

/**
 * Print a single checklist item.
 * @param {'CRITICAL'|'WARN'|'TODO'|'DONE'|'INFO'} status
 */
function item(title, status, description, command = '', extraNote = '') {
  const cfg = {
    CRITICAL: { icon: '🚨', badge: `${c.bgRed}${c.white} CRITICAL ${c.reset}`, key: 'critical' },
    WARN: { icon: '⚠️ ', badge: `${c.yellow}${c.bold} WARN ${c.reset}`, key: 'warn' },
    TODO: { icon: '📝', badge: `${c.yellow} TODO ${c.reset}`, key: 'todo' },
    DONE: { icon: '✅', badge: `${c.green} DONE ${c.reset}`, key: 'done' },
    INFO: { icon: 'ℹ️ ', badge: `${c.blue} INFO ${c.reset}`, key: 'info' },
  };

  const { icon, badge, key } = cfg[status] || cfg.INFO;
  counts[key]++;

  console.log(`\n  ${icon} ${c.bold}${title}${c.reset}  ${badge}`);
  if (description) console.log(`     ${c.dim}${description}${c.reset}`);
  if (command) console.log(`     ${c.cyan}→ ${command}${c.reset}`);
  if (extraNote) console.log(`     ${c.magenta}⚑  ${extraNote}${c.reset}`);
}

// ── Summary footer ────────────────────────────────────────────────────────────
function printSummary(env) {
  console.log('');
  hr('═');
  console.log(`\n  ${c.bold}${c.white}CHECKLIST SUMMARY${c.reset}`);
  console.log('');

  const lines = [
    counts.critical > 0
      ? `  ${c.bgRed}${c.white} ${counts.critical} CRITICAL ${c.reset} — Must fix before ANY users hit this environment`
      : `  ${c.green}✅  0 Critical issues${c.reset}`,
    counts.warn > 0
      ? `  ${c.yellow}${c.bold}⚠️   ${counts.warn} Warnings${c.reset}  — Will cause problems at scale`
      : `  ${c.green}✅  0 Warnings${c.reset}`,
    counts.todo > 0
      ? `  ${c.yellow}📝  ${counts.todo} TODO items${c.reset} — Complete before client launch`
      : `  ${c.green}✅  All TODOs complete${c.reset}`,
    `  ${c.green}✅  ${counts.done} items verified by file scan${c.reset}`,
  ];

  lines.forEach(l => console.log(l));

  console.log('');
  console.log(`  ${c.dim}Full specs: docs/PERFORMANCE_BOTTLENECK_GUIDE.md${c.reset}`);
  console.log(`  ${c.dim}VPS setup:  docs/TAILOR-FIT-VPS-SETUP.md${c.reset}`);
  console.log(`  ${c.dim}Load tests: k6/README.md${c.reset}`);
  hr('═');
  console.log('');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: VERCEL (Frontend Only)
// ─────────────────────────────────────────────────────────────────────────────
function checkVercel() {
  section('VERCEL — Frontend Only', '▲');

  // Detect VITE_API_URL in .env or vercel.json
  const vercelJson = readFile(path.join(ROOT, 'vercel.json')) || '';
  const envExample = readFile(path.join(ROOT, '.env.example')) || '';
  const hasApiUrlEnv = vercelJson.includes('VITE_API_URL') || envExample.includes('VITE_API_URL');

  item(
    'VITE_API_URL Must Point to VPS',
    'WARN',
    'Vercel serves static files. Your Express API + Socket.io MUST run on the VPS.',
    'Vercel Dashboard → Settings → Environment Variables → VITE_API_URL=https://api.yourvps.com',
    'This CANNOT be another Vercel URL. It must be your VPS domain or IP.'
  );

  item(
    'Socket.io NOT Supported on Vercel',
    'CRITICAL',
    'Vercel Serverless Functions have a 10s timeout and reject WebSocket upgrades. Socket.io will silently fail.',
    'Keep /server exclusively on VPS. Never deploy it to Vercel.',
    'This is a hard platform limit — no workaround exists on the free or pro tier.'
  );

  item(
    'Commercial Use Violation Risk',
    'WARN',
    "Vercel's free (Hobby) plan explicitly forbids commercial projects. 3 paying clients = commercial use.",
    'Upgrade to Vercel Pro ($20/mo) OR self-host frontend on VPS with Nginx (free).',
    'Vercel monitors multi-domain deployments. Account suspension risk is real.'
  );

  item(
    'CORS Configured on VPS Backend',
    'TODO',
    'Your VPS backend must whitelist the Vercel domain(s) in server/app.ts allowedOrigins.',
    'Add your Vercel domain to CORS_ORIGIN env var: CORS_ORIGIN=https://your-app.vercel.app'
  );

  item(
    'Cloudinary URLs Are Absolute',
    'INFO',
    'Cloudinary URLs in the DB are always absolute (https://res.cloudinary.com/...) — Vercel CDN passes them through transparently.',
    '',
    'No action needed. Cloudinary handles its own CDN delivery.'
  );

  item(
    'Frontend Bundle Size Check',
    'TODO',
    'Three.js + R3F can bloat the bundle. Verify code splitting is working.',
    'npx vite-bundle-analyzer (after pnpm run build:all)',
    'Target: main bundle < 500KB gzipped. 3D chunks should be lazy-loaded.'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: RENDER (Staging / Prototyping Only)
// ─────────────────────────────────────────────────────────────────────────────
function checkRender() {
  section('RENDER — Staging/Prototyping Only', '🔷');

  item(
    'Free Tier Sleeps After 15 Minutes',
    'CRITICAL',
    'Render free tier spins down after 15 min of inactivity. WebSocket connections die. Cold start is 50s+.',
    'Upgrade to Render Starter ($7/mo) OR migrate to VPS.',
    'This makes Socket.io unusable for real users on the free tier.'
  );

  item(
    'RAM Only 512MB on Free Tier',
    'CRITICAL',
    'Your Node.js app + Socket.io uses ~199MB at idle. 512MB leaves zero headroom for real traffic.',
    'Render Starter plan gives 512MB. For production, minimum 1GB RAM is needed.',
  );

  item(
    'Atlas M0 Connection Limit',
    'WARN',
    'Atlas M0 free tier allows 500 concurrent connections. 1,200 active users will exceed this.',
    'Watch Atlas dashboard. Upgrade to M2 ($9/mo) if connections approach 400.',
    'Each page load = 3-5 parallel DB queries. 400 users × 3 = 1,200 connection attempts.'
  );

  item(
    'Atlas M0 Storage Limit',
    'INFO',
    'Atlas M0 limit is 512MB. Estimated usage for 3 clients is ~225MB — fits comfortably.',
    'Monitor via Atlas dashboard → Data Storage metric.',
  );

  item(
    'No Socket.io on Render Free Tier',
    'WARN',
    'Socket.io requires persistent connections. Render free tier kills connections after idle timeout.',
    'Use Render Starter minimum for WebSocket support. Paid tier keeps connections alive.',
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: VPS / LOCAL (Backend, Database, System)
// ─────────────────────────────────────────────────────────────────────────────
function checkVPS() {
  section('VPS / LOCAL — Backend, Database, System', '🖥️');

  // ── Pre-compute all file-scan results ──────────────────────────────────────
  const socketTsPath = path.join(SERVER, 'socket.ts');
  const dbTsPath = path.join(SERVER, 'config', 'db.ts');
  const chatSockPath = path.join(ROOT, 'src', 'lib', 'chatSocket.ts');
  const notifSockPath = path.join(ROOT, 'src', 'lib', 'notificationSocket.ts');
  const notifCtxPath = path.join(ROOT, 'src', 'context', 'NotificationContext.tsx');
  const mongodConfPath = '/etc/mongod.conf';
  const mongodConfLocal = path.join(ROOT, 'vps-setup', 'mongod.conf');
  const ecosystemPath = fileExists(path.join(SERVER, 'ecosystem.config.cjs'))
    ? path.join(SERVER, 'ecosystem.config.cjs')
    : fileExists(path.join(ROOT, 'ecosystem.config.cjs'))
      ? path.join(ROOT, 'ecosystem.config.cjs')
      : null;
  const k6Dir = path.join(ROOT, 'k6');
  const k6RestTest = path.join(k6Dir, 'rest-api-load.js');
  const k6SocketTest = path.join(k6Dir, 'socket-stress.js');
  const serverEnvPath = path.join(SERVER, '.env');
  const nginxPath = '/etc/nginx/sites-available/tailor-fit';
  const nginxPathDefault = '/etc/nginx/sites-available/default';

  // Read relevant files once
  const socketTs = readFile(socketTsPath) || '';
  const dbTs = readFile(dbTsPath) || '';
  const chatSock = readFile(chatSockPath) || '';
  const notifSock = readFile(notifSockPath) || '';
  const notifCtx = readFile(notifCtxPath) || '';
  const ecosystem = ecosystemPath ? readFile(ecosystemPath) : '';
  const nginxConf = readFile(nginxPath) || readFile(nginxPathDefault) || '';
  const mongodConf = readFile(mongodConfPath) || readFile(mongodConfLocal) || '';

  // ── Derive statuses from scans ─────────────────────────────────────────────

  // socket.ts: has pingTimeout configured?
  const hasPingTimeout = socketTs.includes('pingTimeout');
  // socket.ts: restricts transports to websocket?
  const hasWsOnlyServer = socketTs.includes("transports: ['websocket']")
    || socketTs.includes('transports:["websocket"]');
  // socket.ts: has disconnect handler?
  const hasDisconnect = socketTs.includes("'disconnect'") || socketTs.includes('"disconnect"');
  // socket.ts: has maxHttpBufferSize?
  const hasBufferSize = socketTs.includes('maxHttpBufferSize');
  // socket.ts: has DB query timeout (.maxTimeMS)?
  const hasMaxTimeMS = socketTs.includes('maxTimeMS');

  // client sockets: websocket-only transport?
  const chatSockWsOnly = (chatSock.includes("transports: ['websocket']") || chatSock.includes("transports:['websocket']"))
    && !chatSock.includes("'polling'");
  const notifSockWsOnly = (notifSock.includes("transports: ['websocket']") || notifSock.includes("transports:['websocket']"))
    && !notifSock.includes("'polling'");

  // NotificationContext: dual-polling (socket + setInterval simultaneously)?
  const hasDualPolling = notifCtx.includes('connectNotificationSocket')
    && notifCtx.includes('setInterval')
    && notifCtx.includes('fetchNotifications');
  // But if it guards polling with a socket check it's fine:
  const hasPollGuard = notifCtx.includes('isNotificationSocketConnected')
    || notifCtx.includes('socket?.connected')
    || notifCtx.includes('socketConnected');

  // db.ts: has connection pool config?
  const hasPoolConfig = dbTs.includes('maxPoolSize');

  // ecosystem: has max_memory_restart?
  const hasMemRestart = ecosystem ? ecosystem.includes('max_memory_restart') : false;
  // ecosystem: has NODE_OPTIONS heap?
  const hasHeapOption = ecosystem ? ecosystem.includes('max-old-space-size') : false;

  // nginx: has socket.io proxy block?
  const hasSocketIoBlock = nginxConf.includes('/socket.io/') || nginxConf.includes('/socket.io');
  // nginx: has proxy_read_timeout 86400?
  const hasProxyTimeout = nginxConf.includes('86400') || nginxConf.includes('proxy_read_timeout 86400');
  
  // nginx: has worker_connections 4096?
  // We check the master nginx.conf file for this, since it's not in the sites-available individual config
  let hasWorkerConnections4096 = false;
  try {
    const mainNginxConf = readFile('/etc/nginx/nginx.conf') || '';
    hasWorkerConnections4096 = mainNginxConf.includes('worker_connections 4096');
  } catch (err) {
    // Ignore error if unable to read master config
  }

  // mongod.conf: has cacheSizeGB?
  const hasCacheSize = mongodConf.includes('cacheSizeGB');

  // ── 0. BUILD ARTIFACTS ────────────────────────────────────────────────────
  subsection('0 · Build Artifacts — dist/ and server/dist/');

  const frontendBuildPath = path.join(ROOT, 'dist', 'index.html');
  const backendBuildPath = path.join(SERVER, 'dist', 'server.js');

  item(
    'Frontend Build Compiled (dist/)',
    fileExists(frontendBuildPath) ? 'DONE' : 'CRITICAL',
    fileExists(frontendBuildPath)
      ? 'dist/index.html found — Nginx has files to serve.'
      : 'dist/index.html missing. Nginx will return 404s for the React app.',
    fileExists(frontendBuildPath) ? '' : 'Run: pnpm run build:all',
    'Always use pnpm run build:all on a VPS to ensure both frontend and backend are compiled.'
  );

  item(
    'Backend Build Compiled (server/dist/)',
    fileExists(backendBuildPath) ? 'DONE' : 'CRITICAL',
    fileExists(backendBuildPath)
      ? 'server/dist/server.js found — PM2 can start the Node app.'
      : 'server/dist/server.js missing. PM2 cannot start the backend.',
    fileExists(backendBuildPath) ? '' : 'Run: pnpm run build:all',
    'Always use pnpm run build:all on a VPS to ensure both frontend and backend are compiled.'
  );

  // ── 1. CRITICAL CODE ISSUES ───────────────────────────────────────────────
  subsection('1 · Code Audit — Socket.io (server/socket.ts)');

  item(
    'Socket.io disconnect Handler Present',
    hasDisconnect ? 'DONE' : 'CRITICAL',
    hasDisconnect
      ? 'disconnect handler found — socket.data cleared on disconnect.'
      : 'No disconnect handler found. socket.data objects will accumulate in RAM as users connect/disconnect. This is the most common Socket.io memory leak.',
    hasDisconnect ? '' : "Add: socket.on('disconnect', (reason) => { socket.data = {}; console.log(...); });",
    hasDisconnect ? '' : 'At 1,200 users with reconnects every hour: ~50MB RAM leak per day.'
  );

  item(
    'Socket.io Server Hardening Config (pingTimeout, maxHttpBufferSize)',
    (hasPingTimeout && hasBufferSize) ? 'DONE' : (hasPingTimeout ? 'WARN' : 'CRITICAL'),
    (hasPingTimeout && hasBufferSize)
      ? 'pingTimeout and maxHttpBufferSize found in initSocket config.'
      : `Missing: ${!hasPingTimeout ? 'pingTimeout ' : ''}${!hasBufferSize ? 'maxHttpBufferSize' : ''}. Dead connections linger; large payloads can spike RAM.`,
    (hasPingTimeout && hasBufferSize) ? '' : 'Add to new Server(httpServer, { pingTimeout: 20000, pingInterval: 10000, connectTimeout: 10000, maxHttpBufferSize: 1e6 })'
  );

  item(
    'Socket.io Server Transport: WebSocket-Only',
    hasWsOnlyServer ? 'DONE' : 'WARN',
    hasWsOnlyServer
      ? "transports: ['websocket'] confirmed on server — polling disabled."
      : "Server still allows long-polling. At 400 users, polling generates hundreds of HTTP requests/sec as keep-alives.",
    hasWsOnlyServer ? '' : "Add transports: ['websocket'] to new Server(httpServer, { ... })"
  );

  item(
    'DB Queries in Socket Have .maxTimeMS() Guard',
    hasMaxTimeMS ? 'DONE' : 'WARN',
    hasMaxTimeMS
      ? '.maxTimeMS() timeout guard found on socket DB queries.'
      : 'Conversation.findOne() and AdminSupportConversation.findOne() inside connection handler have no timeout. A slow DB during a reconnect storm (400 users reconnecting simultaneously) can queue 400 parallel queries.',
    hasMaxTimeMS ? '' : "Add .maxTimeMS(3000) to each findOne() inside io.on('connection', ...)"
  );

  // ── 2. CLIENT SOCKET FILES ────────────────────────────────────────────────
  subsection('2 · Code Audit — Client Socket Files (src/lib/)');

  item(
    'chatSocket.ts — WebSocket-Only Transport',
    chatSockWsOnly ? 'DONE' : 'WARN',
    chatSockWsOnly
      ? "transports: ['websocket'] confirmed — polling removed."
      : "chatSocket.ts still includes 'polling' in transports. Every chat user makes periodic HTTP polling requests ON TOP of the WebSocket connection.",
    chatSockWsOnly ? '' : "Change: transports: ['websocket', 'polling'] → transports: ['websocket']"
  );

  item(
    'notificationSocket.ts — WebSocket-Only Transport',
    notifSockWsOnly ? 'DONE' : 'WARN',
    notifSockWsOnly
      ? "transports: ['websocket'] confirmed — polling removed."
      : "notificationSocket.ts still includes 'polling'. Same issue as chatSocket — doubles HTTP traffic per user.",
    notifSockWsOnly ? '' : "Change: transports: ['websocket', 'polling'] → transports: ['websocket']"
  );

  // ── 3. CONTEXT LAYER ──────────────────────────────────────────────────────
  subsection('3 · Code Audit — Context Layer (src/context/)');

  const dualPollingStatus = (!hasDualPolling || hasPollGuard) ? 'DONE' : 'WARN';
  item(
    'NotificationContext — No Dual Socket+Polling',
    dualPollingStatus,
    dualPollingStatus === 'DONE'
      ? 'No dual-polling detected (or poll is guarded by socket connection check).'
      : 'NotificationContext runs connectNotificationSocket() AND setInterval(fetchNotifications) simultaneously. At 400 users this floods /api/notifications with HTTP requests every few seconds even while the socket is healthy.',
    dualPollingStatus === 'DONE' ? '' : 'Wrap setInterval in: if (!isNotificationSocketConnected()) { startPolling() } with a 5s delayed check after mount.'
  );

  // ── 4. DATABASE (server/config/db.ts) ─────────────────────────────────────
  subsection('4 · Database — Mongoose & MongoDB');

  item(
    'Mongoose Connection Pool (maxPoolSize)',
    hasPoolConfig ? 'DONE' : 'CRITICAL',
    hasPoolConfig
      ? 'maxPoolSize configured in server/config/db.ts.'
      : 'server/config/db.ts uses bare mongoose.connect(uri) with ZERO options. Default pool is 100 connections × ~1MB each = 100MB RAM wasted at idle for ONE client. With 3 clients this is 300MB of idle DB connections.',
    hasPoolConfig ? '' : 'Add options to mongoose.connect(uri, { maxPoolSize: 20, minPoolSize: 5, serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000 })',
    hasPoolConfig ? '' : 'This was marked DONE in a previous version of this script — that was INCORRECT. It is still missing from db.ts.'
  );

  item(
    'MongoDB Cache Capped (cacheSizeGB: 0.5)',
    hasCacheSize ? 'DONE' : 'CRITICAL',
    hasCacheSize
      ? 'cacheSizeGB found in mongod.conf — MongoDB will not exceed 512MB cache.'
      : 'No cacheSizeGB in /etc/mongod.conf (or vps-setup/mongod.conf). Without this, MongoDB grows to consume 50% of RAM (2GB on 4GB VPS) as data accumulates. This will crash Node.js.',
    hasCacheSize ? '' : 'sudo chmod +x ./scripts/setup-mongo-cache.sh && sudo ./scripts/setup-mongo-cache.sh',
    hasCacheSize ? '' : 'Or manually: sudo nano /etc/mongod.conf → add cacheSizeGB: 0.5 under storage.wiredTiger.engineConfig → sudo systemctl restart mongod'
  );

  item(
    'Close Idle mongosh Sessions',
    'WARN',
    'Any open mongosh shell session consumes ~266MB RAM (confirmed from htop). This is the single biggest quick win on a fresh VPS.',
    "In any mongosh terminal: type 'exit' — or: kill $(pgrep mongosh)",
    'Check with: ps aux | grep mongosh. If you see it, kill it immediately.'
  );

  item(
    'MongoDB Atlas Connection Limit (if using Atlas)',
    'INFO',
    'Atlas M0 free tier: 500 concurrent connections max. With 1,200 active users each triggering 3-5 DB queries, you will hit this. Use local MongoDB on VPS for best results — it has no connection limit and 0ms latency.',
    'Recommendation: MONGODB_URI=mongodb://user:pass@127.0.0.1:27017/dbname?authSource=dbname (local)',
    'Per-client DB isolation: each client gets its own DB name + MongoDB user (see VPS-CLIENT-DEPLOYMENT.md)'
  );

  // ── 5. PM2 PROCESS MANAGER ────────────────────────────────────────────────
  subsection('5 · PM2 — Process Manager');

  item(
    'ecosystem.config.cjs Exists',
    ecosystemPath ? 'DONE' : 'TODO',
    ecosystemPath
      ? `Found at: ${ecosystemPath}`
      : 'No ecosystem.config.cjs found. Without it, PM2 restarts app without memory limits or log rotation.',
    ecosystemPath ? '' : 'Create ecosystem.config.cjs in /server or project root (see docs/PERFORMANCE_BOTTLENECK_GUIDE.md §8)'
  );

  item(
    'PM2 max_memory_restart Configured',
    hasMemRestart ? 'DONE' : 'TODO',
    hasMemRestart
      ? 'max_memory_restart found in ecosystem config — PM2 will auto-restart on memory overrun.'
      : 'No max_memory_restart in ecosystem config. If your Node process has a leak, it will silently grow and crash the server.',
    hasMemRestart ? '' : "Add to ecosystem.config.cjs: max_memory_restart: '300M'"
  );

  item(
    'Node.js V8 Heap Size Capped',
    hasHeapOption ? 'DONE' : 'TODO',
    hasHeapOption
      ? 'NODE_OPTIONS --max-old-space-size found in ecosystem config.'
      : 'Node.js V8 heap is uncapped. On a 4GB VPS Node can try to allocate 2GB+ randomly. Cap it explicitly.',
    hasHeapOption ? '' : "Add to ecosystem.config.cjs env: { NODE_OPTIONS: '--max-old-space-size=512' }",
    'Per-client instance each gets its own Node process. 3 × 512MB = 1.5GB max for all backends.'
  );

  // ── 6. NGINX ──────────────────────────────────────────────────────────────
  subsection('6 · Nginx — Reverse Proxy');

  item(
    'Nginx /socket.io/ Proxy Block Present',
    hasSocketIoBlock ? 'DONE' : 'CRITICAL',
    hasSocketIoBlock
      ? '/socket.io/ location block found in Nginx config.'
      : 'No /socket.io/ location block in Nginx. Without this, WebSocket upgrade requests are silently dropped — Socket.io fails for ALL users behind Nginx.',
    hasSocketIoBlock ? '' : [
      'Add to /etc/nginx/sites-available/tailor-fit:',
      '  location /socket.io/ {',
      '    proxy_pass http://127.0.0.1:5002;',
      '    proxy_http_version 1.1;',
      '    proxy_set_header Upgrade $http_upgrade;',
      '    proxy_set_header Connection "upgrade";',
      '    proxy_read_timeout 86400s;',
      '    proxy_send_timeout 86400s;',
      '  }'
    ].join('\n     ')
  );

  item(
    'Nginx proxy_read_timeout 86400s for WebSockets',
    hasProxyTimeout ? 'DONE' : 'CRITICAL',
    hasProxyTimeout
      ? 'proxy_read_timeout 86400s confirmed — WebSocket connections will not be killed after 60s.'
      : 'Nginx default proxy_read_timeout is 60s. Without this override, WebSocket connections are forcibly closed after 60 seconds of inactivity. Users get kicked every minute.',
    hasProxyTimeout ? '' : "Add to /socket.io/ location block: proxy_read_timeout 86400s;  proxy_send_timeout 86400s;"
  );

  item(
    'Nginx gzip Enabled for API Responses',
    'TODO',
    'JSON API responses compress 60-80% with gzip. At 1,200 users this significantly reduces bandwidth.',
    "Add to nginx.conf http block: gzip on; gzip_types application/json text/plain; gzip_min_length 1024;"
  );

  item(
    'Nginx worker_connections Upgrade',
    hasWorkerConnections4096 ? 'DONE' : 'CRITICAL',
    hasWorkerConnections4096
      ? 'worker_connections upgraded to 4096. Nginx can handle high concurrency.'
      : 'worker_connections is missing or at default 768. Nginx will drop requests (111: Connection refused) under load spikes (like 1,600+ K6 VUs) on a 1-Core VPS.',
    "Run: sudo sed -i 's/worker_connections 768;/worker_connections 4096;/g' /etc/nginx/nginx.conf && sudo systemctl reload nginx"
  );

  // ── 7. LINUX SYSTEM ───────────────────────────────────────────────────────
  subsection('7 · Linux System — File Descriptors & Environment');

  // Check current ulimit (only works on Linux/Mac at runtime)
  let ulimitStatus = 'TODO';
  let ulimitCurrent = 'unknown';
  try {
    const { execSync } = require('child_process');
    ulimitCurrent = execSync('ulimit -n', { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
    const limit = parseInt(ulimitCurrent, 10);
    if (limit >= 4096) ulimitStatus = 'DONE';
    else if (limit >= 2048) ulimitStatus = 'WARN';
    else ulimitStatus = 'CRITICAL';
  } catch { /* not on a Unix system or ulimit unavailable */ }

  item(
    `Linux File Descriptors (ulimit -n) — Current: ${ulimitCurrent}`,
    ulimitStatus,
    ulimitStatus === 'DONE'
      ? `ulimit is ${ulimitCurrent} — sufficient for 1,200+ concurrent socket connections.`
      : `Default is 1024. Each Socket.io connection uses 1 file descriptor. 1,200 users = 1,200 FDs + Node internals. You WILL hit the limit and new connections will fail silently.`,
    ulimitStatus === 'DONE' ? '' : [
      '# Increase for current session:',
      'ulimit -n 4096',
      '# Make permanent:',
      'echo "* soft nofile 4096" | sudo tee -a /etc/security/limits.conf',
      'echo "* hard nofile 8192" | sudo tee -a /etc/security/limits.conf',
    ].join('\n     ')
  );

  item(
    'FFmpeg Installed (required for HDRI → WebP conversion)',
    'TODO',
    '3D environment maps (HDRI files) are converted to WebP on the VPS for browser delivery. FFmpeg is required for this process.',
    'sudo apt install -y ffmpeg && ffmpeg -version',
    'Check with: which ffmpeg — if no output, it is not installed.'
  );

  // Check server/.env
  item(
    'server/.env File Present',
    fileExists(serverEnvPath) ? 'DONE' : 'CRITICAL',
    fileExists(serverEnvPath)
      ? 'server/.env found.'
      : 'server/.env does not exist. The server will crash on start without MONGODB_URI, JWT_SECRET, etc.',
    fileExists(serverEnvPath) ? '' : 'cp server/.env.example server/.env && nano server/.env'
  );

  item(
    'Required .env Variables Present (JWT_SECRET, MONGODB_URI, CLOUDINARY_*)',
    'TODO',
    'Manually verify all required variables are set and not left as placeholder values.',
    "grep -E 'JWT_SECRET|MONGODB_URI|CLOUDINARY_CLOUD_NAME|CLOUDINARY_API_KEY' server/.env",
    "Placeholder check: grep 'your_' server/.env — any output means incomplete setup."
  );

  item(
    'Safepay Webhooks & Ngrok (Local Development)',
    'INFO',
    'If testing payments locally, Safepay webhooks require your static Ngrok domain.',
    'Run: pnpm run ngrok (Utilizes V3 ngrok.yml configuration)',
    'Authenticate first: ngrok config add-authtoken <your-token> (See docs/LOCAL_DEV_SETUP.md)'
  );

  // ── 8. k6 LOAD TESTING ────────────────────────────────────────────────────
  subsection('8 · k6 Load Testing');

  item(
    'k6 Test Folder Exists (k6/)',
    fileExists(k6Dir) ? 'DONE' : 'TODO',
    fileExists(k6Dir)
      ? 'k6/ directory found.'
      : 'k6/ directory missing. Create it at the project root with test scripts inside.',
    fileExists(k6Dir) ? '' : 'mkdir k6 && touch k6/rest-api-load.js k6/socket-stress.js k6/README.md'
  );

  item(
    'k6 REST API Load Test Script (k6/rest-api-load.js)',
    fileExists(k6RestTest) ? 'DONE' : 'TODO',
    fileExists(k6RestTest)
      ? 'rest-api-load.js found.'
      : 'Missing k6/rest-api-load.js — tests REST endpoints under 400 VU load.',
    fileExists(k6RestTest) ? '' : 'See PERFORMANCE_BOTTLENECK_GUIDE.md §6 for script template.'
  );

  item(
    'k6 Socket Stress Test Script (k6/socket-stress.js)',
    fileExists(k6SocketTest) ? 'DONE' : 'TODO',
    fileExists(k6SocketTest)
      ? 'socket-stress.js found.'
      : 'Missing k6/socket-stress.js — the most critical test: simulates 400 simultaneous WebSocket connections.',
    fileExists(k6SocketTest) ? '' : 'See PERFORMANCE_BOTTLENECK_GUIDE.md §6 for script template.'
  );

  item(
    'k6 MUST Run from MacBook — NOT From VPS',
    'INFO',
    'Running k6 on the same machine as the app steals CPU/RAM and produces fake (lower) numbers.',
    '# On MacBook M1:\nbrew install k6\nk6 run -e BASE_URL=https://yourvps.com k6/rest-api-load.js',
    'Simulate 3 clients: run 3 terminals simultaneously with different BASE_URL values.'
  );

  item(
    'Monitor VPS RAM During k6 Test',
    'INFO',
    'Watch memory growth in real-time while k6 runs to spot leaks.',
    "# SSH into VPS in a second terminal:\nwatch -n 2 'free -m && echo --- && pm2 list'",
    "Normal: Node RSS should not grow more than 50-100MB over a 10-minute test."
  );

  // ── 9. SCALING REMINDERS ──────────────────────────────────────────────────
  subsection('9 · Scaling Thresholds — When to Upgrade');

  item(
    'Current Capacity: KVM1 (4GB RAM, 1 vCPU)',
    'INFO',
    'With all optimizations applied: handles ~800-1,000 concurrent sockets + 2-3 clients comfortably.',
    '',
    'Watch: pm2 monit — if Node RSS exceeds 300MB consistently, time to plan KVM2 upgrade.'
  );

  item(
    'Upgrade Trigger: >1,200 Concurrent Users or >3 Clients',
    'INFO',
    'Move to KVM2 (8GB RAM, 2 vCPU) ~$10/mo. Update cacheSizeGB from 0.5 → 2.0 and maxPoolSize from 20 → 50.',
    'Also enable PM2 cluster mode (instances: 2) + Redis Socket.io adapter for multi-process rooms.',
    'See PERFORMANCE_BOTTLENECK_GUIDE.md §10 for exact config changes on each server tier.'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
function main() {
  // ── Prevent Duplicate Spam ──────────────────────────────────────────────────
  // When running concurrent monorepo commands (like build:all), multiple npm
  // lifecycle hooks will trigger this script in a few seconds. To prevent the
  // terminal from getting spammed 4x with identical checklists, we use a
  // temporary 10-second lockfile in the OS temp directory.
  const lockFile = path.join(os.tmpdir(), 'tailor-fit-checklist.lock');
  try {
    if (fs.existsSync(lockFile)) {
      const stats = fs.statSync(lockFile);
      if (Date.now() - stats.mtimeMs < 10000) {
        return; // Silently exit if ran less than 10 seconds ago
      }
    }
    fs.writeFileSync(lockFile, Date.now().toString());
  } catch (e) {
    // Ignore lock errors (permission denied, etc.)
  }

  const env = detectEnv();
  const deployType = detectDeployType();

  // Header
  console.log('\n' + c.bold + c.cyan + '╔══════════════════════════════════════════════════════════╗' + c.reset);
  console.log(c.bold + c.cyan + '║                                                          ║' + c.reset);
  console.log(c.bold + c.cyan + '║   🚀  TAILOR FIT — DEPLOYMENT CHECKLIST                  ║' + c.reset);
  console.log(c.bold + c.cyan + '║                                                          ║' + c.reset);
  console.log(c.bold + c.cyan + '╚══════════════════════════════════════════════════════════╝' + c.reset);

  console.log(`\n  ${c.bold}Environment:${c.reset}   ${c.yellow}${env.toUpperCase()}${c.reset}`);
  console.log(`  ${c.bold}Deploy Type:${c.reset}   ${c.yellow}${deployType}${c.reset}`);
  console.log(`  ${c.bold}Platform:${c.reset}      ${os.type()} ${os.release()} (${os.arch()})`);
  console.log(`  ${c.bold}Node:${c.reset}          ${process.version}`);
  console.log(`  ${c.dim}File scan root: ${ROOT}${c.reset}`);

  // Run appropriate section
  if (env === 'vercel') {
    checkVercel();
  } else if (env === 'render') {
    checkRender();
  } else {
    checkVPS();
    // On non-Vercel/Render, also show Vercel reminders if they deploy frontend there
    console.log('');
    console.log(`  ${c.dim}If your frontend is on Vercel, run:${c.reset}`);
    console.log(`  ${c.cyan}  VERCEL=1 node scripts/deploy-checklist.cjs${c.reset}`);
  }

  // Summary
  printSummary(env);
}

main();
