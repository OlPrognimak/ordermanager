/**
 * Remove ANSI SGR sequences (colors, bold) from terminal output so errors read cleanly in JSON/UI.
 */
export function stripAnsi(input) {
  if (input == null) return "";
  return String(input).replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}
