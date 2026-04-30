/** Strip ANSI SGR codes from strings (e.g. Python tracebacks in API error bodies). */
export function stripAnsi(input: string | null | undefined): string {
  if (input == null) return "";
  return String(input).replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}
