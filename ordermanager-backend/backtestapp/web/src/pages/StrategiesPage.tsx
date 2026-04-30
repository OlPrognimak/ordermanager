import {
  CircularProgress,
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  deleteCustomStrategy,
  dryRunStrategy,
  getPythonStrategy,
  deletePythonStrategy,
  listStrategies,
  saveCustomStrategy,
  strategyAssist,
  type StrategyAssistDryRun,
  type StrategyAssistVerification,
  updateCustomStrategy,
  updatePythonStrategy,
  uploadPythonStrategy,
} from "@/api/client";
import type { StrategyDryRunResponse, StrategyInfo } from "@/api/types";
import { SimulationRoundHistorySection } from "@/components/SimulationRoundHistorySection";
import { StrategyCodeEditor } from "@/components/StrategyCodeEditor";
import { PYTHON_STRATEGY_TEMPLATE } from "@/strategies/pythonStrategyTemplate";
import { formatApiError } from "@/utils/apiError";
import { extractPythonFromAssistReply } from "@/utils/extractAssistCode";
import { formatMoney } from "@/utils/format";

const ID_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
/** Single working file on disk for continuous iteration (`pmbacktest/strategies/uploaded/dev_workspace.py`). */
const STRATEGY_LAB_ID = "dev_workspace";
const LS_OPENAI_KEY = "pmbacktest.strategiesOpenaiKey";
const LS_OPENAI_MODEL = "pmbacktest.strategiesOpenaiModel";
const LS_DRY_STRATEGY_PARAMS = "pmbacktest.labDryStrategyParams";

function parseDryStrategyParamsJson(raw: string): Record<string, unknown> | null {
  try {
    const obj = JSON.parse(raw || "{}");
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
    return obj as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default function StrategiesPage() {
  const [builtIn, setBuiltIn] = useState<StrategyInfo[]>([]);
  const [custom, setCustom] = useState<StrategyInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [paramsSchemaJson, setParamsSchemaJson] = useState("{}");

  const [pyId, setPyId] = useState("");
  const [pyName, setPyName] = useState("");
  const [pyDescription, setPyDescription] = useState("");
  const [pyCode, setPyCode] = useState(PYTHON_STRATEGY_TEMPLATE);
  const [pySubmitting, setPySubmitting] = useState(false);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [editingPythonId, setEditingPythonId] = useState<string | null>(null);
  const [loadingPythonForEdit, setLoadingPythonForEdit] = useState(false);

  const [labName, setLabName] = useState("Strategy lab (draft)");
  const [labDescription, setLabDescription] = useState("Working copy — overwrite with Save draft");
  const [dryRounds, setDryRounds] = useState(15);
  const [dryStrategyParamsJson, setDryStrategyParamsJson] = useState("{}");
  const [dryRunning, setDryRunning] = useState(false);
  const [dryResult, setDryResult] = useState<StrategyDryRunResponse | null>(null);
  const [dryError, setDryError] = useState<string | null>(null);
  const [assistPrompt, setAssistPrompt] = useState("");
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistAnalysisSummary, setAssistAnalysisSummary] = useState<string | null>(null);
  const [assistVerification, setAssistVerification] = useState<StrategyAssistVerification | null>(null);
  const [assistDryRun, setAssistDryRun] = useState<StrategyAssistDryRun | null>(null);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("");

  const reload = () => {
    listStrategies()
      .then((r) => {
        setBuiltIn(r.builtIn);
        setCustom(r.custom);
      })
      .catch((e) => setError(formatApiError(e, "Failed to load strategies from API.")));
  };

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    try {
      setOpenaiApiKey(localStorage.getItem(LS_OPENAI_KEY) ?? "");
      setOpenaiModel(localStorage.getItem(LS_OPENAI_MODEL) ?? "");
      const p = localStorage.getItem(LS_DRY_STRATEGY_PARAMS);
      if (p != null) setDryStrategyParamsJson(p);
    } catch {
      /* private mode / no storage */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const py = await getPythonStrategy(STRATEGY_LAB_ID);
        if (cancelled) return;
        setPyCode(py.sourceCode);
        setLabName(py.name || STRATEGY_LAB_ID);
        setLabDescription(py.description ?? "");
      } catch {
        /* no draft file yet */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onAdd = async () => {
    setError(null);
    let paramsSchema: Record<string, unknown>;
    try {
      paramsSchema = JSON.parse(paramsSchemaJson || "{}");
    } catch {
      setError("Parameter schema must be valid JSON.");
      return;
    }
    if (!id.trim() || !name.trim()) {
      setError("Strategy id and name are required.");
      return;
    }
    try {
      if (editingCustomId) {
        await updateCustomStrategy(editingCustomId, {
          name: name.trim(),
          description: description.trim(),
          paramsSchema,
        });
      } else {
        await saveCustomStrategy({
          id: id.trim(),
          name: name.trim(),
          description: description.trim(),
          paramsSchema,
        });
      }
      setId("");
      setName("");
      setDescription("");
      setParamsSchemaJson("{}");
      setEditingCustomId(null);
      reload();
    } catch {
      setError("Could not save strategy (check id and API server).");
    }
  };

  const onDelete = async (s: StrategyInfo) => {
    setError(null);
    try {
      if (s.isPythonUploaded) await deletePythonStrategy(s.id);
      else await deleteCustomStrategy(s.id);
      reload();
    } catch {
      setError("Delete failed.");
    }
  };

  const onUploadPython = async () => {
    setError(null);
    const sid = pyId.trim();
    if (!ID_PATTERN.test(sid)) {
      setError(
        "Python strategy id must start with a letter and use only a–z, 0–9, underscore (max 64 chars). It becomes the file name.",
      );
      return;
    }
    if (!pyName.trim()) {
      setError("Display name is required.");
      return;
    }
    setPySubmitting(true);
    try {
      if (editingPythonId) {
        await updatePythonStrategy(editingPythonId, {
          name: pyName.trim(),
          description: pyDescription.trim(),
          sourceCode: pyCode,
        });
      } else {
        await uploadPythonStrategy({
          id: sid,
          name: pyName.trim(),
          description: pyDescription.trim(),
          sourceCode: pyCode,
        });
      }
      setEditingPythonId(null);
      reload();
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setError(msg || "Upload failed (check API is running and code passes server checks).");
    } finally {
      setPySubmitting(false);
    }
  };

  const onEdit = async (s: StrategyInfo) => {
    setError(null);
    if (s.isPythonUploaded) {
      setLoadingPythonForEdit(true);
      try {
        const py = await getPythonStrategy(s.id);
        setPyId(py.id);
        setPyName(py.name || py.id);
        setPyDescription(py.description ?? "");
        setPyCode(py.sourceCode);
        setEditingPythonId(s.id);
      } catch {
        setError("Could not load Python source for editing.");
      } finally {
        setLoadingPythonForEdit(false);
      }
      return;
    }
    setId(s.id);
    setName(s.name ?? s.id);
    setDescription(s.description ?? "");
    setParamsSchemaJson(JSON.stringify((s.paramsSchema as Record<string, unknown>) ?? {}, null, 2));
    setEditingCustomId(s.id);
  };

  const onSaveLabDraft = async () => {
    setError(null);
    setPySubmitting(true);
    try {
      await updatePythonStrategy(STRATEGY_LAB_ID, {
        name: labName.trim() || STRATEGY_LAB_ID,
        description: labDescription.trim(),
        sourceCode: pyCode,
      });
      reload();
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setError(msg || "Save draft failed. If this is the first save, use Publish once with id dev_workspace or ensure the API is running.");
    } finally {
      setPySubmitting(false);
    }
  };

  const onDryRun = async () => {
    setError(null);
    setDryError(null);
    setDryResult(null);
    const strategyParams = parseDryStrategyParamsJson(dryStrategyParamsJson);
    if (strategyParams === null) {
      setDryError("Dry-run strategy params must be a JSON object (e.g. {\"trigger_cents\": 40}).");
      return;
    }
    setDryRunning(true);
    try {
      const out = await dryRunStrategy({
        sourceCode: pyCode,
        rounds: dryRounds,
        strategyParams,
      });
      setDryResult(out);
    } catch (e: unknown) {
      setDryError(formatApiError(e, "Dry-run failed."));
    } finally {
      setDryRunning(false);
    }
  };

  const onAssist = async () => {
    setError(null);
    setAssistAnalysisSummary(null);
    setAssistVerification(null);
    setAssistDryRun(null);
    if (!assistPrompt.trim()) {
      setError("Enter an instruction for the assistant.");
      return;
    }
    const dryParamsForAssist = parseDryStrategyParamsJson(dryStrategyParamsJson) ?? {};
    setAssistLoading(true);
    try {
      const { suggestion, analysisSummary, verification, dryRun } = await strategyAssist({
        code: pyCode,
        prompt: assistPrompt.trim(),
        openaiApiKey: openaiApiKey.trim() || undefined,
        model: openaiModel.trim() || undefined,
        dryRunStrategyParams: dryParamsForAssist,
      });
      const next = extractPythonFromAssistReply(suggestion);
      if (next) setPyCode(next);
      const s = typeof analysisSummary === "string" ? analysisSummary.trim() : "";
      setAssistAnalysisSummary(s.length ? s : null);
      setAssistVerification(verification ?? null);
      setAssistDryRun(dryRun ?? null);
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.status === 422) {
        const d = e.response.data as {
          error?: string;
          suggestion?: string;
          analysisSummary?: string;
          verification?: StrategyAssistVerification;
          dryRun?: StrategyAssistDryRun;
        };
        const sug = typeof d.suggestion === "string" ? d.suggestion : "";
        const next = extractPythonFromAssistReply(sug);
        if (next) setPyCode(next);
        const head = typeof d.error === "string" ? d.error : "Assistant output failed verification.";
        const tail = typeof d.analysisSummary === "string" ? d.analysisSummary.trim() : "";
        setAssistAnalysisSummary([head, tail].filter(Boolean).join("\n\n---\n\n"));
        setAssistVerification(d.verification ?? null);
        setAssistDryRun(d.dryRun ?? null);
        setError(null);
        return;
      }
      setError(formatApiError(e, "Assistant request failed."));
    } finally {
      setAssistLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Strategies</Typography>
      <Typography color="text.secondary" maxWidth={760}>
        <strong>Strategy lab</strong> uses one file{" "}
        <code>pmbacktest/strategies/uploaded/{STRATEGY_LAB_ID}.py</code> for continuous editing.{" "}
        <strong>Dry-run</strong> executes Python on the first <em>N</em> UTC 5m windows from Mongo (requires{" "}
        <code>MONGODB_URI</code> and <code>PM_BACKTEST_ENGINE=python</code>). The coding assistant uses your OpenAI key
        from the field below (or the server&apos;s <code>OPENAI_API_KEY</code> if you leave it blank). Publish copies the
        same editor source to another strategy id.
      </Typography>

      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {dryError ? (
        <Alert severity="warning" onClose={() => setDryError(null)}>
          {dryError}
        </Alert>
      ) : null}

      {dryResult ? (
        <Stack spacing={2}>
          <Alert severity="success" onClose={() => setDryResult(null)}>
            Dry-run window: UTC {dryResult.window.time_start_ms} → {dryResult.window.time_end_ms} (
            {dryResult.window.utc_rounds_spanned}×5m span, {dryResult.window.rounds_requested} requested). Trades:{" "}
            {dryResult.result.performance.num_trades} · Final equity{" "}
            {formatMoney(dryResult.result.performance.final_equity)} · Realized{" "}
            {formatMoney(dryResult.result.performance.realized_pnl_from_ledger)}. Round-by-round detail below.
          </Alert>
          <SimulationRoundHistorySection
            key={dryResult.result.run_id}
            result={dryResult.result}
            heading="Dry-run results (5m rounds)"
          />
        </Stack>
      ) : null}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Strategy lab (editor + test)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
          One <code>Strategy</code> subclass with <code>on_tick</code>. This editor is your working copy;{" "}
          <strong>Save draft</strong> writes <code>{STRATEGY_LAB_ID}.py</code>. Configure runs can select strategy id{" "}
          <code>{STRATEGY_LAB_ID}</code> or a name you published below.
        </Typography>
        <Stack spacing={2} sx={{ maxWidth: 1000 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Draft display name"
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Draft description"
              value={labDescription}
              onChange={(e) => setLabDescription(e.target.value)}
              fullWidth
            />
          </Stack>
          <StrategyCodeEditor value={pyCode} onChange={setPyCode} minHeight={440} />
          <TextField
            label="Dry-run strategy params (JSON)"
            value={dryStrategyParamsJson}
            onChange={(e) => setDryStrategyParamsJson(e.target.value)}
            onBlur={(e) => {
              try {
                localStorage.setItem(LS_DRY_STRATEGY_PARAMS, e.target.value);
              } catch {
                /* ignore */
              }
            }}
            fullWidth
            multiline
            minRows={4}
            inputProps={{ style: { fontFamily: "monospace", fontSize: 13 } }}
            helperText='Passed to your strategy constructor (same as Configure). Example: {"trigger_cents": 40, "rebound_cents": 3, "bet_usd_per_order": 10, "max_opens_per_round": 2}'
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} flexWrap="wrap">
            <TextField
              label="Dry-run rounds (5m UTC each)"
              type="number"
              value={dryRounds}
              onChange={(e) => setDryRounds(Math.min(50, Math.max(1, Number(e.target.value) || 15)))}
              sx={{ width: { xs: "100%", sm: 220 } }}
              inputProps={{ min: 1, max: 50 }}
            />
            <Button variant="contained" color="secondary" disabled={dryRunning} onClick={() => void onDryRun()}>
              {dryRunning ? "Running dry-run…" : "Test strategy (dry-run)"}
            </Button>
            <Button variant="outlined" disabled={pySubmitting} onClick={() => void onSaveLabDraft()}>
              {pySubmitting ? "Saving…" : "Save draft to dev_workspace"}
            </Button>
            <Button variant="outlined" size="small" onClick={() => setPyCode(PYTHON_STRATEGY_TEMPLATE)}>
              Reset editor to template
            </Button>
          </Stack>
          <Divider />
          <Typography variant="subtitle2">Coding assistant (OpenAI)</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, maxWidth: 720 }}>
            Enter your API key to bill usage to your account (stored only in this browser via localStorage). If empty, the
            server&apos;s <code>OPENAI_API_KEY</code> is used when configured. The assistant is prompted to infer your
            strategy&apos;s algorithm from the editor, then apply your instruction with minimal edits in pmbacktest style
            (<code>Strategy</code>, typed <code>__init__</code>, <code>on_tick</code>, real <code>OrderIntent</code> APIs).
            After <strong>Apply assistant suggestion</strong>, the server runs <strong>compile + import</strong> checks,
            then an optional <strong>Mongo dry-run</strong> (same env as lab; uses your JSON params below). Results show as
            chips and in the analysis. If checks still fail after automatic retries, the API returns HTTP 422 but the
            editor loads the last Python attempt so you can fix it manually.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="OpenAI API key"
              type="password"
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              onBlur={(e) => {
                try {
                  const t = e.target.value.trim();
                  if (t) localStorage.setItem(LS_OPENAI_KEY, t);
                  else localStorage.removeItem(LS_OPENAI_KEY);
                } catch {
                  /* ignore */
                }
              }}
              fullWidth
              autoComplete="off"
              placeholder="sk-…"
            />
            <TextField
              label="Model (optional)"
              value={openaiModel}
              onChange={(e) => setOpenaiModel(e.target.value)}
              onBlur={(e) => {
                try {
                  const t = e.target.value.trim();
                  if (t) localStorage.setItem(LS_OPENAI_MODEL, t);
                  else localStorage.removeItem(LS_OPENAI_MODEL);
                } catch {
                  /* ignore */
                }
              }}
              sx={{ width: { xs: "100%", sm: 280 } }}
              placeholder="gpt-4o-mini"
              helperText="Overrides server default"
            />
          </Stack>
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setOpenaiApiKey("");
              setOpenaiModel("");
              try {
                localStorage.removeItem(LS_OPENAI_KEY);
                localStorage.removeItem(LS_OPENAI_MODEL);
              } catch {
                /* ignore */
              }
            }}
          >
            Clear stored key &amp; model
          </Button>
          <TextField
            label="Instruction (e.g. add trailing-stop logic using ctx.positions())"
            value={assistPrompt}
            onChange={(e) => setAssistPrompt(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <Button variant="outlined" disabled={assistLoading} onClick={() => void onAssist()}>
            {assistLoading ? "Asking…" : "Apply assistant suggestion"}
          </Button>
          {assistAnalysisSummary || assistVerification || assistDryRun ? (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Assistant analysis</Typography>
                <Button
                  size="small"
                  onClick={() => {
                    setAssistAnalysisSummary(null);
                    setAssistVerification(null);
                    setAssistDryRun(null);
                  }}
                >
                  Dismiss
                </Button>
              </Stack>
              {assistVerification || assistDryRun ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                  {assistVerification ? (
                    <Chip
                      size="small"
                      label={
                        assistVerification.skipped
                          ? `Verify: skipped (${assistVerification.message ?? ""})`
                          : assistVerification.ok
                            ? `Verify: OK${assistVerification.className ? ` · ${assistVerification.className}` : ""}`
                            : `Verify: failed · ${assistVerification.stage ?? "?"}`
                      }
                      color={
                        assistVerification.skipped
                          ? "default"
                          : assistVerification.ok
                            ? "success"
                            : "error"
                      }
                      variant="outlined"
                    />
                  ) : null}
                  {assistDryRun ? (
                    <Chip
                      size="small"
                      label={
                        assistDryRun.skipped
                          ? `Dry-run: skipped · ${String(assistDryRun.reason ?? "").slice(0, 80)}`
                          : assistDryRun.ok
                            ? `Dry-run: OK · ${assistDryRun.rounds ?? "?"}×5m · trades ${assistDryRun.performance?.num_trades ?? "—"}`
                            : `Dry-run: failed · ${String(assistDryRun.error ?? "").slice(0, 100)}`
                      }
                      color={
                        assistDryRun.skipped ? "default" : assistDryRun.ok ? "success" : "warning"
                      }
                      variant="outlined"
                    />
                  ) : null}
                </Stack>
              ) : null}
              {assistAnalysisSummary ? (
                <Typography
                  variant="body2"
                  component="div"
                  color="text.secondary"
                  sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 360, overflow: "auto" }}
                >
                  {assistAnalysisSummary}
                </Typography>
              ) : null}
            </Paper>
          ) : null}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {editingPythonId ? `Edit Python strategy (${editingPythonId})` : "Publish / edit another strategy id"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
          Uses the <strong>same source</strong> as the lab editor above. Set a new id to copy your draft to another
          filename, or edit an existing upload.
        </Typography>
        <Stack spacing={2} sx={{ maxWidth: 900 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Strategy id (filename)"
              value={pyId}
              onChange={(e) => setPyId(e.target.value.toLowerCase())}
              fullWidth
              helperText="e.g. my_alpha → my_alpha.py (lowercase, no hyphens)"
              disabled={editingPythonId != null}
            />
            <TextField
              label="Display name"
              value={pyName}
              onChange={(e) => setPyName(e.target.value)}
              fullWidth
            />
          </Stack>
          <TextField
            label="Description"
            value={pyDescription}
            onChange={(e) => setPyDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {editingPythonId ? (
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setEditingPythonId(null);
                  setPyId("");
                  setPyName("");
                  setPyDescription("");
                }}
              >
                Cancel edit
              </Button>
            ) : null}
          </Stack>
          <Button variant="contained" onClick={() => void onUploadPython()} disabled={pySubmitting}>
            {pySubmitting ? "Saving…" : editingPythonId ? "Update .py on server" : "Save .py to server (this id)"}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Pre-built
        </Typography>
        <List dense>
          {builtIn.map((s) => (
            <ListItem key={s.id} alignItems="flex-start">
              <ListItemText primary={`${s.name} (${s.id})`} secondary={s.description} />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Custom &amp; uploaded
        </Typography>
        {custom.length ? (
          <List dense>
            {custom.map((s) => (
              <ListItem
                key={s.id}
                alignItems="flex-start"
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => void onEdit(s)} disabled={loadingPythonForEdit}>
                      Edit
                    </Button>
                    <Button color="error" size="small" onClick={() => void onDelete(s)}>
                      Remove
                    </Button>
                  </Stack>
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <span>{s.name}</span>
                      {s.isPythonUploaded ? (
                        <Chip size="small" label="Python file" color="primary" variant="outlined" />
                      ) : (
                        <Chip size="small" label="Metadata only" variant="outlined" />
                      )}
                    </Box>
                  }
                  secondary={`${s.id} — ${s.description}`}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary">No custom or uploaded strategies yet.</Typography>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {editingCustomId ? `Edit metadata strategy (${editingCustomId})` : "Add catalog metadata only (no .py file)"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          For UI labels without saving Python. Prefer the upload section above for real strategies.
        </Typography>
        <Stack spacing={2} sx={{ maxWidth: 720 }}>
          <TextField
            label="Strategy id (slug)"
            value={id}
            onChange={(e) => setId(e.target.value)}
            fullWidth
            disabled={editingCustomId != null}
          />
          <TextField label="Display name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            label="paramsSchema (JSON)"
            value={paramsSchemaJson}
            onChange={(e) => setParamsSchemaJson(e.target.value)}
            fullWidth
            multiline
            minRows={6}
            inputProps={{ style: { fontFamily: "monospace" } }}
          />
          <Divider />
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => void onAdd()}>
              {editingCustomId ? "Update metadata" : "Save metadata to API"}
            </Button>
            {editingCustomId ? (
              <Button
                variant="text"
                onClick={() => {
                  setEditingCustomId(null);
                  setId("");
                  setName("");
                  setDescription("");
                  setParamsSchemaJson("{}");
                }}
              >
                Cancel edit
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>
      {loadingPythonForEdit ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Loading Python strategy source…
          </Typography>
        </Box>
      ) : null}
    </Stack>
  );
}
