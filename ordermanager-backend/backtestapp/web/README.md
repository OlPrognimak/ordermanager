# BTC 5m Up/Down — simulation GUI

React + **Create React App** (`react-scripts`) + TypeScript UI for **Polymarket-style 5-minute BTC up/down markets** (YES/NO outcome betting over discrete windows), not generic spot trading. **CRACO** keeps the `@/` import alias.

**Market clock:** each market opens at `hh:mm:00` when `minute % 5 === 0` (:00, :05, …, :55). Your historical data and Python runner should align ticks and quotes to that grid.

**Where logic lives:** implement strategies in **Python** (e.g. `pmbacktest/strategies/` in this repo). The dashboard sends `strategy` id + JSON parameters to the API; the engine executes your registered code.

## Prerequisites

- Node.js 18+ (20+ recommended)
- npm 9+

## Setup

```bash
cd web
npm install
```

Optional: copy `.env.example` to `.env` in `web/`. The API server loads it via `dotenv` (see `server/index.mjs`); Create React App also reads `.env` for `REACT_APP_*` variables when you run `npm run dev` or `npm start`. Run commands from `web/` so the working directory matches.

**Local dev tip:** leave `REACT_APP_API_BASE` unset (or commented) so the UI uses relative `/api` and the CRA proxy forwards to port 3001. If you set `REACT_APP_API_BASE=http://127.0.0.1:3001`, the browser calls the API directly—you must have the Express server running, and you should restart `npm start` after any `.env` change.

## Development

Starts the Express mock API on **3001** and the CRA dev server on **3000**. The `proxy` field in `package.json` forwards browser requests like `/api/*` to the API.

```bash
npm run dev
```

Open `http://127.0.0.1:3000`.

### Environment

- `REACT_APP_API_BASE` — optional absolute API origin (no trailing slash), e.g. `http://127.0.0.1:3001`. If unset in development, the client uses relative `/api` (proxied to 3001).
- `PM_BACKTEST_API_PORT` — mock server port (default `3001`).
- `PORT` — CRA dev/prod preview port (default `3000`).
- `MONGODB_URI` — enables `GET /api/mongo/market-ticks` (Configure → Mongo preview) and is inherited by the Python subprocess when using the real engine. That route **resamples** to a **100ms** grid (`step_ms`): **LOCF** — last BTC and last up/down row with `ts_ms ≤` each grid time (Python `mongo_own` for backtests is unchanged).
- `MONGO_OWN_DB`, `MONGO_BTC_COLLECTION`, `MONGO_UP_DOWN_COLLECTION`, `MONGO_QUOTE_SCALE` — optional; default `own` / `poly_btc` / `up_down` / `dollar_0_1` (same as `pmbacktest.data.mongo_own`).
- `PM_BACKTEST_ENGINE` — set to `python` so `POST /api/backtests` runs `python3 -m pmbacktest.cli run` from the **repository root** (parent of `web/`) and returns the `*_gui.json` payload to the UI. Requires `pip install -e .` (or similar) for `pmbacktest`.
- `PM_BACKTEST_PYTHON_BIN` — override Python executable (default `python3`).
- `PM_BACKTEST_DATA_TYPE` — default `mongo_own`; set to `csv` with `PM_BACKTEST_CSV_PATH` for file-based runs from the API.

## Production build

```bash
npm run build
```

Static output is in `build/`. Serve it behind any static host and run the API separately; set `REACT_APP_API_BASE` at **build time** if the API is on another origin.

## Scripts

| Script              | Description                          |
|---------------------|--------------------------------------|
| `npm run dev`       | API + `craco start`                  |
| `npm start`         | CRA dev server only                  |
| `npm run build`     | Production bundle                    |
| `npm test`          | Jest (CI mode, no watch)             |
| `npm run test:watch`| Jest watch mode                      |
| `npm run lint`      | ESLint (`eslint-config-react-app`)   |

## Backend integration

Routes under `/api/...`. See `src/api/types.ts` for payload shapes.

- **Default:** in-memory mock backtest (synthetic ticks, stepped progress).
- **Python + Mongo (or CSV):** `MONGODB_URI=… PM_BACKTEST_ENGINE=python npm run dev` — the GUI queue runs the real engine and loads `{run_id}_gui.json` (written by `pmbacktest` next to summary/CSVs). Details: in-app **User manual** → “Mongo & Python engine”.

## Features

- **Upload Python strategies** from the Strategies page → writes `pmbacktest/strategies/uploaded/<id>.py` (API: `POST /api/strategies/python`). The Python CLI uses `full_strategy_registry()` to load them.
- In-app **User manual** at `/manual` (navigation drawer)
- Configure run (5m grid, dataset label, execution/risk JSON) with localStorage draft
- Simulation queue with polling, logs, and progress
- Results: bankroll metrics, equity / drawdown / per-position P&L charts, CSV/JSON export
- Strategy catalog (ids must match Python registry) + optional custom metadata via API
- Optional equity comparison vs another completed run
- Market replay: play/pause, scrubber, speed; YES/NO bid·ask at playhead; preferences saved in `localStorage` (`replayUiPrefs`)
- Mongo tick preview on Configure when `MONGODB_URI` is set on the API
