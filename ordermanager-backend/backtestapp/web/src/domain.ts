/**
 * Domain copy: Polymarket-style **5-minute BTC Up/Down** markets (prediction
 * outcomes), not directional spot “trading” in the broker sense.
 */
export const COPY = {
  appTitle: "BTC 5m Up/Down — simulation lab",
  drawerTitle: "BTC 5m Up/Down",
  /** Wall-clock alignment for discrete event markets */
  marketSchedule:
    "Each market opens at hh:mm:00 on the 5-minute grid (minutes 0, 5, 10, …, 55). You simulate how your rules would have bought and sold YES/NO (up/down) exposure as quotes and BTC ticks arrive, then settle P&L when positions close.",
  pythonWorkflow:
    "Implement the actual decision logic in Python (e.g. under pmbacktest/strategies/ in this repo, registered by strategy id). This UI only picks that id and sends JSON parameters to the runner—your script is the source of truth.",
} as const;
