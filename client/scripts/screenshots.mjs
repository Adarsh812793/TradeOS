// Takes screenshots of every page (desktop and phone width) so a redesign can be checked by eye.
// It also reports page errors, failed requests and pages that scroll sideways.
//
// Needs two things running first (use the TEST database so real data is never touched):
//   server:  cd server && NODE_ENV=test PORT=8081 node src/server.js
//   client:  cd client && VITE_API_BASE_URL=http://localhost:8081 npx vite --port 5173
// Then:      cd client && node scripts/screenshots.mjs <label>        (label example: before, after)
//   Optional env: BASE_URL (default http://localhost:5173), API_URL (default http://localhost:8081)
//   Uses the installed Microsoft Edge, so no browser download is needed. Output: client/screenshots/<label>/
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const API = process.env.API_URL ?? "http://localhost:8081";
const label = process.argv[2] ?? "latest";

const here = path.dirname(fileURLToPath(import.meta.url));
const outRoot = path.join(here, "..", "screenshots", label);
const serverDir = path.join(here, "..", "..", "server");
fs.mkdirSync(outRoot, { recursive: true });

const PASSWORD = "TestPassword@123";
const email = `shots-${Date.now()}@example.com`;

// Calls the backend directly (used only to prepare test data).
async function api(method, url, body, token) {
  const response = await fetch(API + url, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${url} -> ${response.status} ${data.message ?? ""}`);
  return data;
}

// Creates a test user with holdings, orders and a watchlist, and returns the first stock's id.
async function prepareData() {
  execFileSync("node", ["scripts/screenshot-seed.js"], {
    cwd: serverDir, env: { ...process.env, NODE_ENV: "test" }, stdio: "inherit",
  });

  await api("POST", "/api/auth/register", { name: "Aarav Mehta", email, password: PASSWORD });
  const login = await api("POST", "/api/auth/login", { email, password: PASSWORD });
  const token = login.data.accessToken;

  const { data: stocks } = await api("GET", "/api/stocks");
  const bySymbol = (symbol) => stocks.find((stock) => stock.symbol === symbol);
  const plan = [["RELIANCE", 6], ["TCS", 4], ["INFY", 12], ["HDFCBANK", 8], ["SBIN", 15]];

  for (const [symbol, quantity] of plan) {
    await api("POST", "/api/orders", { stockId: bySymbol(symbol)._id, quantity }, token);
  }
  await api("POST", "/api/orders/sell", { stockId: bySymbol("INFY")._id, quantity: 4 }, token);
  for (const symbol of ["ITC", "BHARTIARTL", "ICICIBANK"]) {
    await api("POST", "/api/watchlist", { stockId: bySymbol(symbol)._id }, token);
  }

  // Move prices so profit and loss show their colours
  execFileSync("node", ["scripts/screenshot-seed.js", "--shift"], {
    cwd: serverDir, env: { ...process.env, NODE_ENV: "test" }, stdio: "inherit",
  });

  return bySymbol("RELIANCE")._id;
}

const problems = [];
const summary = [];

// Opens one page, waits for it to settle, saves a full-page screenshot and records problems.
async function shoot(page, name, viewportName) {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(700);
  const file = `${viewportName}-${name}.png`;
  await page.screenshot({ path: path.join(outRoot, file), fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  summary.push({ shot: file, sidewaysScroll: overflow });
}

// Runs one try block per screen so a missing element skips that screen only.
async function attempt(name, work) {
  try {
    await work();
  } catch (error) {
    problems.push(`SKIPPED ${name}: ${error.message.split("\n")[0]}`);
  }
}

// Goes through every page at one viewport size.
async function runViewport(browser, viewportName, viewport, stockId) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  page.on("pageerror", (error) => problems.push(`[${viewportName}] page error: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`[${viewportName}] console error: ${message.text().slice(0, 160)}`);
  });
  page.on("response", (response) => {
    const url = response.url();
    // 401 on /refresh while logged out is normal, and the FYERS market data is not part of this test setup
    if (response.status() >= 400 && !url.includes("/api/auth/refresh") && !url.includes("/api/market/")) {
      problems.push(`[${viewportName}] HTTP ${response.status()} ${response.request().method()} ${url.replace(API, "")}`);
    }
  });

  // Logged-out pages
  await page.goto(`${BASE}/login`);
  await shoot(page, "login", viewportName);
  await page.goto(`${BASE}/signup`);
  await shoot(page, "signup", viewportName);
  await page.goto(`${BASE}/definitely-not-a-page`);
  await shoot(page, "404", viewportName);
  await attempt("gallery", async () => {
    await page.goto(`${BASE}/dev/ui`); // development-only component gallery
    await page.waitForSelector(".ui-gallery", { timeout: 5000 });
    await shoot(page, "gallery", viewportName);
  });

  // Log in through the real form
  await page.goto(`${BASE}/login`);
  await page.fill("#input-email", email);
  await page.fill("#input-password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  const pages = [
    ["dashboard", "/dashboard"], ["stocks", "/stocks"], ["stock-details", `/stocks/${stockId}`],
    ["portfolio", "/portfolio"], ["orders", "/orders"], ["watchlist", "/watchlist"],
    ["transactions", "/transactions"], ["account", "/account"],
  ];
  for (const [name, route] of pages) {
    await attempt(name, async () => {
      await page.goto(BASE + route);
      await shoot(page, name, viewportName);
    });
  }

  // Open states
  await attempt("notifications", async () => {
    await page.goto(`${BASE}/dashboard`);
    await page.click("button[aria-label^='Notifications']");
    await shoot(page, "open-notifications", viewportName);
  });
  await attempt("search", async () => {
    await page.goto(`${BASE}/dashboard`);
    await page.click("input[aria-label='Search stocks']");
    await shoot(page, "open-search", viewportName);
  });
  await attempt("profile-menu", async () => {
    await page.goto(`${BASE}/dashboard`);
    await page.click("button[aria-label='Open profile menu']");
    await shoot(page, "open-profile-menu", viewportName);
  });
  await attempt("order-confirmation", async () => {
    await page.goto(`${BASE}/stocks/${stockId}`);
    await page.waitForSelector("#order-quantity");
    await page.fill("#order-quantity", "2");
    await page.click("form button[type=submit]");
    await page.waitForSelector("[role=dialog]");
    await shoot(page, "open-order-confirmation", viewportName);
  });
  await attempt("order-details", async () => {
    await page.goto(`${BASE}/orders`);
    await page.locator("button:visible", { hasText: "Details" }).first().click({ timeout: 5000 });
    await page.waitForSelector("[role=dialog]");
    await shoot(page, "open-order-details", viewportName);
  });
  await attempt("navigation", async () => {
    await page.goto(`${BASE}/portfolio`);
    if (viewport.width <= 768) {
      // phone: the bottom bar's "More" sheet
      await page.click(".bottom-nav button:has-text('More')");
      await shoot(page, "open-more-sheet", viewportName);
    } else {
      // desktop and tablet: the icon rail with a name tooltip showing
      await page.hover(".nav-rail a:has-text('Orders')");
      await shoot(page, "rail-tooltip", viewportName);
    }
  });
  await attempt("account-sections", async () => {
    await page.goto(`${BASE}/account`);
    const headers = page.locator("main button[aria-expanded='false']");
    for (let i = await headers.count(); i > 0; i--) await headers.first().click();
    await shoot(page, "account-all-open", viewportName);
  });

  await context.close();
}

const stockId = await prepareData();
const browser = await chromium.launch({ channel: "msedge", headless: true });
await runViewport(browser, "desktop", { width: 1440, height: 900 }, stockId);
await runViewport(browser, "phone", { width: 390, height: 844 }, stockId);
await browser.close();

fs.writeFileSync(path.join(outRoot, "report.json"), JSON.stringify({ summary, problems }, null, 2));
console.log(`\n${summary.length} screenshots saved to client/screenshots/${label}/`);
console.log("Pages that scroll sideways:", summary.filter((s) => s.sidewaysScroll).map((s) => s.shot).join(", ") || "none");
console.log(`Problems (${problems.length}):`);
for (const line of [...new Set(problems)].slice(0, 30)) console.log("  " + line);
