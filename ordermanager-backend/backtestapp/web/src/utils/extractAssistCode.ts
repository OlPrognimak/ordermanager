/**
 * Pull Python source out of assistant replies (often wrapped in ```python ... ```).
 */
export function extractPythonFromAssistReply(raw: string): string {
  let t = raw.trim();
  const fenced = t.match(/```(?:python|py)?\s*\n?([\s\S]*?)```/);
  if (fenced) t = fenced[1].trim();
  return t;
}
