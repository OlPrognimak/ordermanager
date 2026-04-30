/** Strip optional ```python fence from a model-supplied source string. */
export function stripMarkdownPythonFence(src) {
  const t = String(src ?? "").trim();
  const m = t.match(/```(?:python|py)?\s*\n?([\s\S]*?)```/);
  return m ? m[1].trim() : t;
}

/** Chat Completions: content is usually a string; some models return [{ type, text }]. */
export function extractOpenAiMessageText(message) {
  const c = message?.content;
  if (c == null) return "";
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c
      .map((p) => (p && typeof p === "object" && p !== null && "text" in p ? String(p.text) : ""))
      .join("");
  }
  return String(c);
}

function stripOuterJsonFence(src) {
  const t = String(src ?? "").trim();
  const m = t.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
  return m ? m[1].trim() : t;
}

/**
 * Parse OpenAI reply: prefer JSON { analysis_summary, python_source }; else treat whole body as code.
 * @returns {{ analysisSummary: string; pythonSource: string }}
 */
export function parseStrategyAssistModelOutput(content) {
  const raw = stripOuterJsonFence(String(content ?? "").trim());
  let analysisSummary = "";
  let pythonSource = "";
  try {
    const o = JSON.parse(raw);
    if (o && typeof o === "object" && !Array.isArray(o)) {
      analysisSummary = String(o.analysis_summary ?? o.analysisSummary ?? "").trim();
      pythonSource = String(o.python_source ?? o.pythonSource ?? o.code ?? "").trim();
    }
  } catch {
    /* legacy: plain Python or fenced code */
  }
  if (!pythonSource) pythonSource = raw;
  pythonSource = stripMarkdownPythonFence(pythonSource);
  const maxSummary = 16_000;
  if (analysisSummary.length > maxSummary) {
    analysisSummary = `${analysisSummary.slice(0, maxSummary)}…`;
  }
  return { analysisSummary, pythonSource };
}
