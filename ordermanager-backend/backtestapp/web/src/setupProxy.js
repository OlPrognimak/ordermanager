/**
 * CRA dev server proxy: default timeouts (~2 min) abort large GET /api/backtests/:id/result payloads.
 * @see https://create-react-app.dev/docs/proxying-api-requests-in-development/
 */
const fs = require("fs");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");

// Optional: `npm run dev` port auto-fallback writes this file when 3001 is taken.
const PROXY_TARGET_FILE =
  process.env.PM_BACKTEST_PROXY_TARGET_FILE ||
  path.resolve(__dirname, "..", ".pmbacktest-api-target.txt"); // web/.pmbacktest-api-target.txt

let cachedMtimeMs = 0;
let cachedValue = null;
function readTargetFileCached() {
  // Avoid sync filesystem reads on every /api request.
  try {
    const st = fs.statSync(PROXY_TARGET_FILE);
    const m = Number(st.mtimeMs || 0);
    if (m > 0 && m === cachedMtimeMs) return cachedValue;
    const s = fs.readFileSync(PROXY_TARGET_FILE, "utf8").trim();
    cachedMtimeMs = m;
    cachedValue = s || null;
    return cachedValue;
  } catch {
    cachedMtimeMs = 0;
    cachedValue = null;
    return null;
  }
}

function currentProxyTarget() {
  // Explicit env wins (useful when you intentionally set a fixed API port).
  const env = process.env.PM_BACKTEST_PROXY_TARGET;
  if (env && String(env).trim()) return String(env).trim();
  return readTargetFileCached() || "http://127.0.0.1:3001";
}

/** Allow huge equity/tick series + slow JSON.stringify on the API (ms). */
const LONG_MS = Number(process.env.PM_BACKTEST_PROXY_TIMEOUT_MS || 1_800_000);

module.exports = function proxyDevApi(app) {
  app.use(
    "/api",
    createProxyMiddleware({
      // Use dynamic router so we can follow the API port chosen at runtime.
      router: () => currentProxyTarget(),
      changeOrigin: true,
      proxyTimeout: LONG_MS,
      timeout: LONG_MS,
    }),
  );
};
