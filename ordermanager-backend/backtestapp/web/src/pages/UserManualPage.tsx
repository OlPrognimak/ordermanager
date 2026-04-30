import {
  Box,
  Divider,
  Link,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { COPY } from "@/domain";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Paper id={id} component="section" sx={{ p: 3, scrollMarginTop: 96 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        {title}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      {children}
    </Paper>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        my: 1.5,
        p: 2,
        borderRadius: 1,
        overflow: "auto",
        fontSize: 12,
        fontFamily: "ui-monospace, monospace",
        bgcolor: "action.hover",
        border: 1,
        borderColor: "divider",
      }}
    >
      {children}
    </Box>
  );
}

export default function UserManualPage() {
  return (
    <Stack spacing={3} sx={{ maxWidth: 920 }}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          User manual — dashboard usage guide
        </Typography>
        <Typography color="text.secondary">
          How to use each screen, run simulations from the GUI, and author strategies in Python (including
          upload from the dashboard and the strategy &quot;language&quot; your code must speak).
        </Typography>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          On this page
        </Typography>
        <Stack component="nav" direction="row" flexWrap="wrap" spacing={1}>
          {[
            ["#domain", "5-minute markets"],
            ["#start", "Start the app"],
            ["#dashboard", "Dashboard"],
            ["#configure", "Configure run"],
            ["#strategies-page", "Strategies page"],
            ["#job-page", "Simulation results"],
            ["#market-replay", "Market replay"],
            ["#mongo-python", "Mongo & Python engine"],
            ["#python-upload", "Create strategy via dashboard"],
            ["#strategy-language", "Strategy Python API"],
            ["#file-rules", "File &amp; id rules"],
            ["#mock-vs-python", "Mock API vs Python engine"],
            ["#env", "Environment"],
            ["#troubleshooting", "Troubleshooting"],
          ].map(([href, label]) => (
            <Link key={href} href={href} underline="hover" color="primary">
              {label}
            </Link>
          ))}
        </Stack>
      </Paper>

      <Section id="domain" title="1. What you are simulating">
        <Typography paragraph>
          This dashboard drives <strong>Polymarket-style BTC up/down</strong> simulations: discrete{" "}
          <strong>5-minute</strong> windows, YES/NO outcome tokens, not a generic spot broker UI.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {COPY.marketSchedule}
        </Typography>
      </Section>

      <Section id="start" title="2. Start the application">
        <Typography paragraph>
          From the <code>web</code> folder install once (<code>npm install</code>), then:
        </Typography>
        <CodeBlock>{`npm run dev`}</CodeBlock>
        <Typography paragraph>
          This starts the <strong>API</strong> (default port <strong>3001</strong>) and the{" "}
          <strong>React app</strong> (default <strong>3000</strong>). Open{" "}
          <code>http://127.0.0.1:3000</code> in your browser. In development, the app proxies{" "}
          <code>/api</code> to the API.
        </Typography>
      </Section>

      <Section id="dashboard" title="3. Dashboard — simulation queue">
        <Typography paragraph>
          The <Link component={RouterLink} to="/">Dashboard</Link> lists <strong>simulation runs</strong>{" "}
          (newest first). Each row shows:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Job id (short)" secondary="Internal id for this run." />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Status"
              secondary="queued → running → completed or failed."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Strategy · dataset label"
              secondary="What you chose in Configure (strategy id and dataset label text)."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Open"
              secondary="Opens the full job view: logs, progress, metrics, charts, round-by-round cards, exports."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Delete"
              secondary="Removes this entry from the queue in this browser and stops polling; it does not delete your .py strategy file."
            />
          </ListItem>
        </List>
        <Typography variant="body2" color="text.secondary">
          The queue is stored in <strong>localStorage</strong> (last ~30 jobs, without full result payloads).
          Re-opening a completed job may re-fetch results from the API if the server still has them.
        </Typography>
      </Section>

      <Section id="configure" title="4. Configure run — starting a simulation">
        <Typography paragraph>
          <Link component={RouterLink} to="/configure">Configure run</Link> builds the payload sent to{" "}
          <code>POST /api/backtests</code>. Your draft is saved in the browser until you change it or reset.
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="Strategy"
              secondary={
                <>
                  Dropdown: <strong>built-in</strong> demos, <strong>Python file</strong> (uploaded .py under
                  uploaded/), or <strong>catalog</strong> (metadata-only). The value must match the id your
                  engine uses when you wire Python.
                </>
              }
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Strategy parameters (JSON)"
              secondary="Becomes constructor kwargs for your Strategy class in Python (e.g. window, qty). Must be valid JSON."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Dataset label"
              secondary="Free-text label for reports (e.g. data stream name); forwarded in the config."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Start / end (local datetime)"
              secondary="Optional replay window; align with your data and 5m grid where possible."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Tick granularity (ms)"
              secondary="Spacing for the mock API curve only; with MongoDB (or CSV) the real engine replays actual timestamps."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Simulation speed (×1 … ×20)"
              secondary="Mock API only: scales wall-clock progress steps. Job page shows phase, %, step counter, and a simulated UTC clock when start/end are set. Payload key: simulationSpeed (Python alias simulation_speed)."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Live market replay (mock)"
              secondary="While a job is running, the job page charts BTC spot, YES/NO quotes (¢), and markers at open and settlement times using ledger fill prices (¢), matching the trades table; YES/NO lines use mids. After completion the same chart is shown for the full series. With PM_BACKTEST_ENGINE=python, the live stepping animation is skipped; results appear when the CLI finishes."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="MongoDB market preview"
              secondary="On Configure, load merged BTC + up/down quotes from Mongo (same merge as pmbacktest MongoOwnMergedTickSource). Requires MONGODB_URI on the API server. See Mongo & Python engine below."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Settle at UTC 5m round boundaries"
              secondary={
                <>
                  Strategies may only submit <code>OPEN_*</code>; the engine flattens YES/NO at each UTC
                  five-minute boundary and after the last tick (settlement). Configure{" "}
                  <strong>Settle at round boundaries</strong> (Python: <code>settle_round_boundaries</code> on{" "}
                  <code>SessionConfig</code>, GUI: <code>settleRoundBoundaries</code>).
                </>
              }
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Risk & execution"
              secondary="Optional caps, slippage, fees, latency — passed through on the config object."
            />
          </ListItem>
        </List>
        <Typography paragraph>
          Click <strong>Run simulation</strong> to enqueue. You are taken to the job page or can open the
          run from the Dashboard.
        </Typography>
      </Section>

      <Section id="strategies-page" title="5. Strategies page — catalog and Python upload">
        <Typography paragraph>
          <Link component={RouterLink} to="/strategies">Strategies</Link> is where you manage what appears
          in the strategy dropdown and where you <strong>save real Python</strong> from the browser.
        </Typography>
        <Typography component="div" variant="subtitle2" gutterBottom>
          A. Add strategy from Python (recommended)
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="Strategy id"
              secondary="Lowercase identifier; becomes the file name my_id.py. Letters, digits, underscore only; must not match built-in ids (momentum, mean_reversion, threshold, spread_threshold, buy_only_dislocation, buy_cheaper_token_continuously)."
            />
          </ListItem>
          <ListItem>
            <ListItemText primary="Display name & description" secondary="Shown in lists; stored in the API catalog." />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Python source"
              secondary="Full module text. Use Reset to template for a valid skeleton. Save writes pmbacktest/strategies/uploaded/{your_id}.py on the machine running the API."
            />
          </ListItem>
        </List>
        <Typography component="div" variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          B. Custom & uploaded list
        </Typography>
        <Typography paragraph>
          Rows tagged <strong>Python file</strong> have a .py on disk — <strong>Remove</strong> deletes that
          file. <strong>Metadata only</strong> rows are UI/API entries without a strategy module.
        </Typography>
        <Typography component="div" variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          C. Metadata only (optional)
        </Typography>
        <Typography paragraph>
          For labels without saving code — rarely needed if you use Python upload.
        </Typography>
      </Section>

      <Section id="job-page" title="6. Simulation results (job page)">
        <Typography paragraph>
          After you <strong>Open</strong> a run from the queue you see:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Progress & engine log" secondary="While running; logs are live from polling." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Performance cards" secondary="P&amp;L, ROI, win rate, drawdown, Sharpe-style metric, trade counts, etc." />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Export buttons"
              secondary="Summary JSON, positions CSV, equity CSV, rounds CSV (UTC 5m buckets)."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Simulation history (round cards)"
              secondary="One card per UTC 5-minute window. Click a card for that round: equity path chart, market replay for that window, bar chart of P&amp;L per close, and a small positions table."
            />
          </ListItem>
          <ListItem>
            <ListItemText primary="Full-run charts" secondary="Equity, drawdown, scatter of P&amp;L vs time." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Position history" secondary="Sortable/filterable table of all closes." />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Compare equity (optional)"
              secondary="Overlay another completed run from the same session."
            />
          </ListItem>
        </List>
      </Section>

      <Section id="market-replay" title="6a. Market replay — scrubber & saved preferences">
        <Typography paragraph>
          On the <strong>completed</strong> job page and inside each <strong>round</strong> detail, the market
          replay chart can animate through time: <strong>play / pause</strong>, <strong>skip to start or end</strong>
          , a <strong>time scrubber</strong>, and <strong>replay speed</strong> (simulated milliseconds advanced per
          wall-clock millisecond). The panel on the right shows YES/NO <strong>bid and ask</strong> at the current
          playhead when those fields exist on the tick (mock and Mongo preview include them; Python equity samples
          include BTC and YES/NO mids from each tick).
        </Typography>
        <Typography paragraph>
          <strong>Replay ×</strong> and the <strong>Open at end</strong> checkbox are stored in your browser (
          <code>localStorage</code> key <code>replayUiPrefs</code>), separate from the configure run draft.
        </Typography>
      </Section>

      <Section id="mongo-python" title="6b. MongoDB preview &amp; running the real Python engine from the API">
        <Typography paragraph>
          <strong>Preview only:</strong> with <code>MONGODB_URI</code> set for the Node API, Configure →{" "}
          <strong>Load market ticks from Mongo</strong> calls <code>GET /api/mongo/market-ticks</code> and draws the
          replay chart (no strategy, no P&amp;L).           Data are <strong>resampled to a 100ms grid</strong> (query <code>step_ms</code>): each grid time uses the
          latest BTC row and latest up/down row with <code>ts_ms ≤ t</code> (causal LOCF), so YES/NO move when new
          quotes land. Collections default to{" "}
          <code>own.poly_btc</code> + <code>own.up_down</code>; override with env vars listed below.
        </Typography>
        <Typography paragraph>
          <strong>Full backtests from the dashboard:</strong> install the package from the repo root so{" "}
          <code>python3 -m pmbacktest.cli</code> works, then start the API with:
        </Typography>
        <CodeBlock>{`export MONGODB_URI='mongodb://localhost:27017'   # or your URI
export PM_BACKTEST_ENGINE=python
# optional: PM_BACKTEST_PYTHON_BIN=python3.12
# optional CSV instead of mongo: PM_BACKTEST_DATA_TYPE=csv PM_BACKTEST_CSV_PATH=/path/to/ticks.csv
cd web && npm run dev`}</CodeBlock>
        <Typography paragraph>
          With <code>PM_BACKTEST_ENGINE=python</code>, <code>POST /api/backtests</code> writes a temporary run JSON
          (strategy, parameters, execution, risk, time window, and a <code>data.type=mongo_own</code> block) and runs{" "}
          <code>pmbacktest.cli run --config … --out …</code> in the <strong>repository root</strong> (parent of{" "}
          <code>web/</code>). The CLI writes <code>{"{run_id}_gui.json"}</code> next to the usual summary/CSVs; the
          server loads that file and returns it as the job result so charts and exports match the mock shape.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          If you omit <code>PM_BACKTEST_ENGINE</code>, behavior stays the <strong>in-memory mock</strong> (synthetic
          BTC/YES/NO and fast stepped progress).
        </Typography>
      </Section>

      <Section id="python-upload" title="7. Creating a strategy with Python — dashboard workflow">
        <Typography paragraph>
          End-to-end steps to go from zero to a named strategy selectable in Configure:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="1. Open Strategies"
              secondary="Use Add strategy from Python (dashboard upload)."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="2. Pick an id"
              secondary="e.g. my_breakout — this becomes my_breakout.py and the strategy id everywhere."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="3. Edit the code"
              secondary="Subclass Strategy, implement on_tick. Use Reset to template if needed. Match the rules in sections 8–9."
            />
          </ListItem>
          <ListItem>
            <ListItemText primary="4. Save .py to server" secondary="API validates basics (class, on_tick, Strategy mention, size limits)." />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="5. Configure run"
              secondary="Select my_breakout (Python file) in the strategy dropdown. Tune Strategy parameters JSON to match your __init__ kwargs."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="6. Run Python backtests"
              secondary="The bundled Node server stores files but uses a mock backtest. Use pmbacktest CLI or wire your API to run Python with full_strategy_registry() so your class actually executes."
            />
          </ListItem>
        </List>
        <Typography variant="body2" color="text.secondary">
          {COPY.pythonWorkflow}
        </Typography>
      </Section>

      <Section id="strategy-language" title="8. Strategy language — Python API reference">
        <Typography paragraph>
          Your uploaded module is loaded by <code>pmbacktest</code>. The engine speaks a small, explicit API:
          you subclass <code>Strategy</code> and react to ticks through <code>RunContext</code>.
        </Typography>

        <Typography component="div" variant="subtitle2" gutterBottom>
          Class and lifecycle
        </Typography>
        <Typography paragraph>
          Import <code>Strategy</code> from <code>pmbacktest.strategies.base</code>. Implement at minimum:
        </Typography>
        <CodeBlock>{`from pmbacktest.strategies.base import Strategy
from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import TickEvent, OrderIntent, OrderAction

class MyStrategy(Strategy):
    def __init__(self, **kwargs):
        self.qty = float(kwargs.get("qty", 1.0))

    def on_tick(self, event: TickEvent, ctx: RunContext) -> None:
        ...`}</CodeBlock>
        <List dense>
          <ListItem>
            <ListItemText
              primary="on_start(self, ctx)"
              secondary="Optional. Once before the first tick — reset buffers, read ctx.params if needed."
            />
          </ListItem>
          <ListItem>
            <ListItemText primary="on_tick(self, event, ctx)" secondary="Required. Called on every replayed tick in time order." />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="on_order_fill(self, fill, ctx)"
              secondary="Optional. After an execution report (fill details, side, fees)."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="on_position_update(self, update, ctx)"
              secondary="Optional. After the book changes from a fill."
            />
          </ListItem>
          <ListItem>
            <ListItemText primary="on_finish(self, ctx)" secondary="Optional. After the last tick / liquidation." />
          </ListItem>
        </List>

        <Typography component="div" variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          TickEvent (each step)
        </Typography>
        <Typography paragraph>
          Fields on <code>TickEvent</code> (see <code>pmbacktest.core.types</code>):
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="timestamp_ms" secondary="Simulation time of this observation (epoch ms)." />
          </ListItem>
          <ListItem>
            <ListItemText primary="price" secondary="Reference price (e.g. BTC) for this tick." />
          </ListItem>
          <ListItem>
            <ListItemText primary="yes, no" secondary="Outcome token prices for the up/down market at this time (0–1 style quotes in your data)." />
          </ListItem>
        </List>

        <Typography component="div" variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          RunContext (what you can do)
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="ctx.submit_order(OrderIntent(action, quantity))"
              secondary="Queue an order. action is an OrderAction enum; quantity must be finite and &gt; 0. Raises ValueError if the engine rejects (wrap in try/except if you want to ignore rejects)."
            />
          </ListItem>
          <ListItem>
            <ListItemText primary="ctx.cash()" secondary="Current cash balance in the simulation currency." />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="ctx.positions()"
              secondary="List of PositionView: side (YES/NO), quantity, avg_entry_price."
            />
          </ListItem>
          <ListItem>
            <ListItemText primary="ctx.last_tick()" secondary="Most recent TickEvent or None." />
          </ListItem>
        </List>

        <Typography component="div" variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          OrderIntent &amp; OrderAction
        </Typography>
        <Typography paragraph>
          Build <code>OrderIntent(OrderAction.…, quantity)</code>. Actions are:
        </Typography>
        <CodeBlock>{`OrderAction.OPEN_YES   # add YES (Up) exposure
OrderAction.OPEN_NO    # add NO (Down) exposure`}</CodeBlock>
        <Typography paragraph>
          <code>CLOSE_*</code> is reserved for engine settlement — calling{" "}
          <code>ctx.submit_order</code> with a close action is rejected. Use only <code>OPEN_*</code>; positions
          flatten at UTC 5m boundaries when <code>settle_round_boundaries</code> is on (see{" "}
          <code>buy_only_dislocation.py</code>, <code>spread_threshold.py</code>).
        </Typography>

        <Typography component="div" variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          Parameters from the dashboard
        </Typography>
        <Typography paragraph>
          The <strong>Strategy parameters (JSON)</strong> object on Configure is passed into your strategy
          constructor as <strong>keyword arguments</strong>. Use explicit parameters with defaults, or accept{" "}
          <code>**kwargs</code> and parse values yourself. Unknown keys can be ignored.
        </Typography>
      </Section>

      <Section id="file-rules" title="9. File and registration rules">
        <List dense>
          <ListItem>
            <ListItemText
              primary="Exactly one Strategy subclass"
              secondary="The loader expects a single concrete Strategy subclass defined in the file (not counting the abstract Strategy base)."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Strategy id = file name without .py"
              secondary="my_alpha.py is registered as my_alpha. Must match the id you type in the dashboard."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Python path"
              secondary="Files live in pmbacktest/strategies/uploaded/. CLI uses full_strategy_registry() = built-ins merged with these files."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Built-in names are reserved"
              secondary="You cannot upload momentum.py / that id via the API."
            />
          </ListItem>
        </List>
      </Section>

      <Section id="mock-vs-python" title="10. Mock API vs real Python engine">
        <Typography paragraph>
          The default <code>web/server/index.mjs</code> <strong>saves</strong> uploaded Python and lists
          strategies; unless you set <code>PM_BACKTEST_ENGINE=python</code>, it runs a <strong>mock</strong> backtest
          for the GUI queue.
        </Typography>
        <Typography paragraph>
          For <strong>real</strong> runs from the browser, use the built-in subprocess path (section 6b) or run{" "}
          <code>pmbacktest run --config …</code> yourself and import the <code>*_gui.json</code> export into your own
          tooling. The GUI expects the <code>BacktestResult</code> shape in <code>src/api/types.ts</code> (
          <code>trades</code> and <code>equity</code> arrays inline).
        </Typography>
      </Section>

      <Section id="env" title="11. Environment">
        <List dense>
          <ListItem>
            <ListItemText primary="REACT_APP_API_BASE" secondary="Optional; full API URL at build time if not using /api proxy." />
          </ListItem>
          <ListItem>
            <ListItemText primary="PM_BACKTEST_API_PORT" secondary="Node API port (default 3001)." />
          </ListItem>
          <ListItem>
            <ListItemText primary="PORT" secondary="React dev server (default 3000)." />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="MONGODB_URI"
              secondary="Enables GET /api/mongo/market-ticks and is read by the Python child process for mongo_own runs. Health check exposes mongoUriConfigured."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="MONGO_OWN_DB, MONGO_BTC_COLLECTION, MONGO_UP_DOWN_COLLECTION, MONGO_QUOTE_SCALE"
              secondary="Optional overrides for Mongo preview and for the mongo_own block built when PM_BACKTEST_ENGINE=python (default: own / poly_btc / up_down / dollar_0_1)."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="PM_BACKTEST_ENGINE"
              secondary="Set to python to run pmbacktest.cli for POST /api/backtests (see 6b)."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="PM_BACKTEST_PYTHON_BIN"
              secondary="Python executable (default python3). Repo root is the subprocess cwd."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="PM_BACKTEST_DATA_TYPE, PM_BACKTEST_CSV_PATH"
              secondary="Optional: set DATA_TYPE=csv and CSV_PATH to a tick file instead of mongo_own when using the Python engine from the API."
            />
          </ListItem>
        </List>
      </Section>

      <Section id="troubleshooting" title="12. Troubleshooting">
        <List dense>
          <ListItem>
            <ListItemText
              primary="Upload rejected"
              secondary="Check id format, file must include Strategy and def on_tick(self, event, ctx), and meet minimum length / size limits."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Python import errors when running CLI"
              secondary="Fix syntax in uploaded file; ensure only one Strategy subclass and valid imports from pmbacktest."
            />
          </ListItem>
          <ListItem>
            <ListItemText primary="Job not found" secondary="Queue is per-browser; start a new run from Configure." />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Empty charts after server restart"
              secondary="In-memory mock jobs are lost; re-run the simulation."
            />
          </ListItem>
        </List>
      </Section>

      <Typography variant="body2" color="text.secondary">
        Developer setup: <code>web/README.md</code>. Package layout: repository root <code>pmbacktest/</code>.
      </Typography>
    </Stack>
  );
}
