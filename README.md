# TradeOS

**A paper-trading app for Indian stocks.** Sign up, get ₹1,00,000 of virtual money, and practise buying and selling NSE/BSE stocks with no real money at risk.

> **Important:** the money is virtual and the stock prices are **simulated**. TradeOS is not a broker and nothing here is investment advice. Only the NIFTY 50 and SENSEX numbers in the top bar come from a real data source (FYERS).

**Live demo:** https://app.tradeos.website

---

## Table of contents

1. [What you can do](#1-what-you-can-do)
2. [Tech stack](#2-tech-stack)
3. [How the project is organised](#3-how-the-project-is-organised)
4. [Run it on your computer](#4-run-it-on-your-computer)
5. [Settings (environment variables)](#5-settings-environment-variables)
6. [Run the tests](#6-run-the-tests)
7. [How the main parts work](#7-how-the-main-parts-work)
8. [Deployment](#8-deployment)
9. [Known limits](#9-known-limits)
10. [More documentation](#10-more-documentation)

---

## 1. What you can do

| Area | What it does |
|---|---|
| **Sign up and log in** | Create an account with your email. We send a 6-digit code to confirm it. Sessions renew themselves, and you are signed out after 30 minutes of no activity. |
| **Forgot password** | Ask for a 6-digit code by email, set a new password, and every device is signed out. You then log in with the new password. |
| **Dashboard** | Your account value (cash + shares), profit and loss, a value chart, your watchlist and recent orders. |
| **Stocks** | Browse and search stocks, open a stock page with a price chart (area or candles), and buy or sell. |
| **Portfolio** | Your holdings, how your money is split between them (a donut chart), and your profit and loss. |
| **Orders and Transactions** | A history of every order you placed and every money movement. |
| **Watchlist** | Save stocks to keep an eye on them. |
| **Notifications** | A bell with a count for executed orders, low balance and password changes. |
| **Account** | Edit your name, upload a profile photo, change your password, or delete your account. |
| **Market hours** | Trading works only on weekdays from 9:15 AM to 3:30 PM IST, and not on NSE holidays. |

---

## 2. Tech stack

**Backend** (`server/`)
- Node.js 22 or newer, Express 5
- MongoDB with Mongoose (it must be a replica set, such as MongoDB Atlas, because orders use transactions)
- Joi for checking requests, JSON Web Tokens and argon2 for login, Vitest and Supertest for tests
- Resend for sending emails, Cloudinary for profile photos

**Frontend** (`client/`)
- React 19 and Vite, written in plain JavaScript (no TypeScript)
- React Router, react-hook-form and zod for forms
- TradingView `lightweight-charts` for the price charts, and `three` for the 3D landing page
- Plain CSS with design tokens (no CSS framework)

**Hosting:** Vercel (frontend, `app.tradeos.website`), Railway (backend, `api.tradeos.website`), MongoDB Atlas (database). Email is sent by Resend from the verified domain `tradeos.website`.

---

## 3. How the project is organised

```
TradeOS/
├── server/                 # the backend (its own npm project)
│   ├── src/
│   │   ├── app.js          # builds the Express app
│   │   ├── server.js       # connects to MongoDB and starts listening
│   │   ├── config/         # reads the settings (env.js)
│   │   ├── middleware/     # login check, validation, rate limits, errors
│   │   ├── modules/        # one folder per feature (see below)
│   │   └── utils/          # money maths, errors, pagination
│   ├── tests/              # integration tests
│   └── scripts/            # one-off helper scripts
├── client/                 # the frontend (its own npm project)
│   └── src/
│       ├── app/            # routes
│       ├── pages/          # one file per page
│       ├── features/       # code grouped by feature (auth, stocks, portfolio...)
│       ├── components/     # shared parts (Button, Table, Modal...)
│       ├── lib/api.js      # the one place that talks to the backend
│       └── styles/         # design tokens (colours, fonts, spacing)
└── docs/                   # roadmap and a plan for each big feature
```

**Backend modules** (`server/src/modules/`): `auth`, `users`, `stocks`, `wallet`, `orders`, `holdings`, `transactions`, `portfolio`, `watchlist`, `notifications`, `market`, `prices`, `candles`, `email`.

Every module follows the same layers:

```
routes  →  controller  →  service  →  model
(URL)      (thin: reads    (the real    (MongoDB
            the request)    logic)       shape)
```

---

## 4. Run it on your computer

### What you need first
- Node.js 22 or newer
- A MongoDB database that supports transactions (a free MongoDB Atlas cluster works)

### Step 1: Get the code
```bash
git clone https://github.com/Adarsh812793/TradeOS.git
cd TradeOS
```

### Step 2: Start the backend
```bash
cd server
npm install
```
Create a file called `server/.env` (see [Settings](#5-settings-environment-variables)), then:
```bash
node src/modules/stocks/stock.seed.js   # adds the sample stocks (safe to run again)
npm run dev                             # starts on http://localhost:8080
```

### Step 3: Start the frontend
Open a second terminal:
```bash
cd client
npm install
```
Create `client/.env` with one line:
```
VITE_API_BASE_URL=http://localhost:8080
```
Then:
```bash
npm run dev                             # opens on http://localhost:5173
```

### Step 4: Try it
Open http://localhost:5173 and sign up. With `EMAIL_PROVIDER=console` (the default in development) the 6-digit code is **printed in the backend terminal**, so you do not need a real email service.

Prices only move while the market is open. To test at night or on weekends, add `MARKET_ALWAYS_OPEN=true` to `server/.env` (development only).

### Useful commands

| Where | Command | What it does |
|---|---|---|
| `server/` | `npm run dev` | Start with auto-reload |
| `server/` | `npm start` | Start without auto-reload |
| `server/` | `npm run test:run` | Run all tests once |
| `client/` | `npm run dev` | Start the dev server |
| `client/` | `npm run build` | Build for production |
| `client/` | `npm run lint` | Check the code style |

---

## 5. Settings (environment variables)

Settings live in `.env` files, which are **never committed**. The backend reads `server/.env` (or `server/.env.test` when running tests). Do not read `process.env` directly in code: use `server/src/config/env.js`.

### Backend: required
| Name | What it is |
|---|---|
| `MONGODB_URI` | Your MongoDB connection string |
| `JWT_ACCESS_SECRET` | A long random text that signs login tokens |
| `OTP_SECRET` | A different long random text (32+ characters) that protects the sign-up codes |
| `FRONTEND_URL` | The address of the frontend (in production `https://app.tradeos.website`) |

### Backend: optional
| Name | What it is |
|---|---|
| `PORT` | Server port (default 8080) |
| `CORS_ORIGIN` | The frontend address the browser is allowed to call from (default `http://localhost:5173`). In production: `https://app.tradeos.website`. A misspelled variable name silently falls back to the default, and then every browser call fails with "Failed to fetch". |
| `EMAIL_PROVIDER` | `console` (prints emails in the terminal, development), `resend` (real email) or `memory` (tests) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Needed when `EMAIL_PROVIDER=resend`. `EMAIL_FROM` must use a domain verified in Resend, for example `TradeOS <noreply@tradeos.website>`. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Needed for profile photos (without them, uploads answer 503) |
| `MARKET_ALWAYS_OPEN` | `true` makes the market always open (development and test only) |
| `TRUST_PROXY_HOPS` | How many proxies sit in front of the server (0 to 5). On Railway it is `2` |
| `NODE_ENV` | `development`, `test` or `production` |

### Frontend
| Name | What it is |
|---|---|
| `VITE_API_BASE_URL` | The backend address: `http://localhost:8080` locally, `https://api.tradeos.website` in production. It is baked into the build (changing it needs a rebuild) and is public. |

---

## 6. Run the tests

```bash
cd server
npm run test:run                                      # everything
npx vitest run tests/orders.integrated.test.js        # one file
npx vitest run -t "should buy a stock successfully"   # one test by name
```

- The tests are **integration tests**: they talk to a real MongoDB (the one in `server/.env.test`) through Supertest. Use a separate test database, never your real one.
- Tests never send email or need your keys: they use an in-memory email provider and a test-only secret.
- The database is remote, so an occasional test can time out. Run it again before blaming the code.
- There are no frontend tests yet. For a visual check run `npm run screenshots <label>` in `client/` (the setup is described in `CLAUDE.md`).

---

## 7. How the main parts work

**Trading.** Buying or selling runs inside one database transaction that creates the order, updates your wallet, updates your holding and writes a transaction record. Either all of it happens or none of it does. Orders execute at the stock's stored price, not a live market price.

**Money.** All maths is done in whole paise (never `price * quantity` on floats), so rupees never drift by tiny amounts.

**Simulated prices.** While the market is open, a background job moves every stock's price every 15 seconds with a small random walk. Each move updates 5-minute and daily candles that feed the charts.

**Login.** A short 15-minute access token is kept in memory only. A longer refresh token lives in an httpOnly cookie and is replaced every time it is used. If an old one is used again, the whole login is cancelled (it looks like theft). Passwords are hashed with argon2.

**Sign-up.** No account exists until you confirm the emailed code. The code is valid for 10 minutes, allows 5 wrong guesses, and can be re-sent at most 5 times, with a 60-second wait between emails. Only a hash of the code is stored.

**Forgot password.** It uses the same kind of code (10 minutes, 5 wrong guesses, 5 re-sends, a 60-second wait), but a code made for sign-up can never be used for a reset. The page never says whether an email has an account: it answers the same for every email, and every failure of the reset gives one and the same message. A right code sets the new password, signs out every device and ends the code's life, all in one database transaction. You are not logged in automatically, and the owner gets an email saying the password was changed.

**Portfolio chart.** The account-value history is rebuilt from your own trades and the daily prices when you open the page. Nothing extra is stored.

**Errors.** The backend answers `{ success: false, message, errorCode }`. Success answers are `{ success: true, message, data }`.

---

## 8. Deployment

- **Frontend (Vercel):** project root `client`, on `app.tradeos.website`. `client/vercel.json` only sends every address to `index.html` (a single-page app needs that). The browser calls the backend directly at `https://api.tradeos.website`, set with `VITE_API_BASE_URL`.
- **Backend (Railway):** project root `server`, deployed from `main`, on `api.tradeos.website`. It needs the required settings above, plus `NODE_ENV=production`, `EMAIL_PROVIDER=resend` and `TRUST_PROXY_HOPS=2`.
- **Health check:** `GET /health` answers `{ "status": "ok" }` and never touches the database.
- **One site, two sub-domains:** `app.` and `api.` of the same domain count as ONE site, which the login cookie needs. Two unrelated hosts would not work.
- **Stocks in a new database:** run `node src/modules/stocks/stock.seed.js` against it (it only adds missing stocks).

---

## 9. Known limits

- **No NIFTY 50 / SENSEX strip.** Real index data needs a licence or a paid source, and the FYERS connection is not authorised in production, so the top strip stays hidden. The stock prices themselves are simulated anyway.
- **Sign-up emails** come from a `.website` domain bought for the first year only. Check the renewal price before it lapses.
- **Simulated prices** only, labelled as such everywhere.
- **Holidays:** `server/src/modules/market/market.holidays.js` has only 2026. Add 2027 before January.
- **Next feature:** Google Sign-In.

---

## 10. More documentation

- [`CLAUDE.md`](CLAUDE.md): the detailed architecture notes and rules for working in this repo
- [`docs/RoadMap.txt`](docs/RoadMap.txt): the development phases
- [`docs/plans/`](docs/plans): a plan and checklist for each big feature (UI redesign, email sign-up, notifications, portfolio, account page and more)
