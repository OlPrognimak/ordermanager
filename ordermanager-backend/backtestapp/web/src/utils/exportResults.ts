import type { BacktestResult } from "@/api/types";
import { buildRoundSummaries } from "@/utils/rounds";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportResultJson(result: BacktestResult) {
  const payload = {
    run_id: result.run_id,
    meta: result.meta,
    performance: result.performance,
    parameter_set: result.parameter_set,
  };
  downloadBlob(
    `${result.run_id}_summary.json`,
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
  );
}

export function exportTradesCsv(result: BacktestResult) {
  const headers = [
    "trade_id",
    "side",
    "opened_ts_ms",
    "closed_ts_ms",
    "quantity",
    "entry_price",
    "exit_price",
    "fees_paid",
    "realized_pnl",
  ];
  const lines = [
    headers.join(","),
    ...result.trades.map((t) =>
      [
        t.trade_id,
        t.side,
        t.opened_ts_ms,
        t.closed_ts_ms,
        t.quantity,
        t.entry_price,
        t.exit_price,
        t.fees_paid,
        t.realized_pnl,
      ].join(","),
    ),
  ];
  downloadBlob(`${result.run_id}_trades.csv`, new Blob([lines.join("\n")], { type: "text/csv" }));
}

export function exportEquityCsv(result: BacktestResult) {
  const lines = [
    "timestamp_ms,equity,cash,unrealized_pnl",
    ...result.equity.map(
      (p) => `${p.timestamp_ms},${p.equity},${p.cash},${p.unrealized_pnl}`,
    ),
  ];
  downloadBlob(`${result.run_id}_equity.csv`, new Blob([lines.join("\n")], { type: "text/csv" }));
}

export function exportRoundsCsv(result: BacktestResult) {
  const rounds = buildRoundSummaries(result);
  const headers = [
    "round_index",
    "window_start_ms",
    "window_end_ms",
    "closes_count",
    "realized_pnl",
    "fees_paid",
    "ending_equity",
  ];
  const lines = [
    headers.join(","),
    ...rounds.map((r) =>
      [
        r.index + 1,
        r.window_start_ms,
        r.window_end_ms,
        r.closes_count,
        r.realized_pnl,
        r.fees_paid,
        r.ending_equity ?? "",
      ].join(","),
    ),
  ];
  downloadBlob(`${result.run_id}_rounds_utc5m.csv`, new Blob([lines.join("\n")], { type: "text/csv" }));
}
