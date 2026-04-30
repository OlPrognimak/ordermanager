/** Mock / UI playback speed options (dev API scales wall-clock steps; Python runner may ignore). */
export const SIMULATION_SPEED_OPTIONS = [
  1, 1.25, 1.5, 1.75, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20,
] as const;

export type SimulationSpeedValue = (typeof SIMULATION_SPEED_OPTIONS)[number];

export function clampSimulationSpeed(raw: unknown): number {
  const x = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(x) || x < 0.25) return 1;
  return Math.min(Math.max(x, 0.25), 20);
}

export function formatSpeedLabel(speed: number): string {
  const n = Number(speed);
  if (!Number.isFinite(n)) return "×1";
  return `×${n}`;
}
