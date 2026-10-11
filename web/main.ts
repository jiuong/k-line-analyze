import { createDefaultChartHost, type ChartHost } from "../src/chart/host.js";
import { datetimeLocalToUnix } from "../src/page/queryTime.js";
import { REVIEW_ANALYZERS, runReview } from "../src/page/reviewModel.js";
import type { AnalysisResult } from "../src/types/analysis.js";
import type { Bar, TimeFrame } from "../src/types/bars.js";

type CatalogOption = { code: string; label: string };

type BarsPayload = {
  data: Bar[];
  meta: {
    degraded?: boolean;
    mt5_error?: string | null;
  };
  source: "local" | "mt5";
};

const form = document.querySelector<HTMLFormElement>("#query");
const symbolSelect = document.querySelector<HTMLSelectElement>("#symbol");
const timeframeSelect = document.querySelector<HTMLSelectElement>("#timeframe");
const fromInput = document.querySelector<HTMLInputElement>("#from");
const toInput = document.querySelector<HTMLInputElement>("#to");
const countInput = document.querySelector<HTMLInputElement>("#count");
const refreshInput = document.querySelector<HTMLInputElement>("#refresh");
const statusEl = document.querySelector<HTMLParagraphElement>("#status");
const analyzersEl = document.querySelector<HTMLElement>("#analyzers");
const outputEl = document.querySelector<HTMLElement>("#analysis-output");
const canvas = document.querySelector<HTMLCanvasElement>("#chart");
const chartHost = document.querySelector<HTMLElement>("#chart-host");

if (
  !form ||
  !symbolSelect ||
  !timeframeSelect ||
  !fromInput ||
  !toInput ||
  !countInput ||
  !refreshInput ||
  !statusEl ||
  !analyzersEl ||
  !outputEl ||
  !canvas ||
  !chartHost
) {
  throw new Error("Review page is missing required elements");
}

const analyzerTitle = document.createElement("h2");
analyzerTitle.textContent = "Analysis";
analyzersEl.append(analyzerTitle);
for (const analyzer of REVIEW_ANALYZERS) {
  const label = document.createElement("label");
  const box = document.createElement("input");
  box.type = "checkbox";
  box.dataset.analyzer = analyzer.id;
  box.addEventListener("change", () => {
    applyAnalysis();
  });
  label.append(box, document.createTextNode(analyzer.label));
  analyzersEl.append(label);
}

const hostReady = createDefaultChartHost();
let host: ChartHost | null = null;
let mounted = false;
let loadedBars: Bar[] = [];
let loadedPayload: BarsPayload | null = null;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void loadWindow();
});

window.addEventListener("pagehide", () => {
  if (mounted && host) {
    host.unmount();
    mounted = false;
  }
});

void loadCatalog();

async function loadCatalog(): Promise<void> {
  try {
    const response = await fetch("/api/catalog");
    const body = (await response.json()) as {
      symbols?: CatalogOption[];
      timeframes?: CatalogOption[];
      error?: string;
    };
    if (!response.ok) {
      statusEl!.textContent = body.error ?? response.statusText;
      return;
    }
    fillSelect(symbolSelect!, body.symbols);
    fillSelect(timeframeSelect!, body.timeframes);
  } catch (err) {
    statusEl!.textContent = err instanceof Error ? err.message : String(err);
  }
}

function fillSelect(
  select: HTMLSelectElement,
  options: CatalogOption[] | undefined,
): void {
  select.replaceChildren();
  if (!Array.isArray(options) || options.length === 0) {
    statusEl!.textContent = "trading.json returned no options.";
    return;
  }
  for (const item of options) {
    const option = document.createElement("option");
    option.value = item.code;
    option.textContent = `${item.label} (${item.code})`;
    select.append(option);
  }
  const first = options[0];
  if (first) {
    select.value = first.code;
  }
}

async function loadWindow(): Promise<void> {
  statusEl!.textContent = "Loading…";
  const timeframe = timeframeSelect!.value as TimeFrame;
  const params = new URLSearchParams({
    symbol: symbolSelect!.value.trim(),
    timeframe,
  });
  try {
    const from = datetimeLocalToUnix(fromInput!.value);
    const to = datetimeLocalToUnix(toInput!.value);
    if (from !== undefined) {
      params.set("from", String(from));
    }
    if (to !== undefined) {
      params.set("to", String(to));
    }
  } catch (err) {
    statusEl!.textContent = err instanceof Error ? err.message : String(err);
    return;
  }
  const count = countInput!.value.trim();
  if (count) {
    params.set("count", count);
  }
  if (refreshInput!.checked) {
    params.set("refresh", "true");
  }

  try {
    const response = await fetch(`/api/bars?${params.toString()}`);
    const body = (await response.json()) as BarsPayload & { error?: string };
    if (!response.ok) {
      statusEl!.textContent = body.error ?? response.statusText;
      return;
    }

    host ??= await hostReady;
    if (!mounted) {
      host.mount(canvas!, { container: chartHost });
      mounted = true;
    }

    loadedPayload = body;
    if (!Array.isArray(body.data) || body.data.length === 0) {
      loadedBars = [];
      host.setBars([], timeframe);
      host.setResults([]);
      renderOutput(body, []);
      statusEl!.textContent = "No bars for this window.";
      return;
    }

    loadedBars = body.data;
    host.setBars(body.data, timeframe);
    applyAnalysis();
    statusEl!.textContent = "";
  } catch (err) {
    statusEl!.textContent = err instanceof Error ? err.message : String(err);
  }
}

function enabledAnalyzerIds(): string[] {
  const boxes = analyzersEl!.querySelectorAll<HTMLInputElement>(
    "input[data-analyzer]:checked",
  );
  const ids: string[] = [];
  boxes.forEach((box) => {
    if (box.dataset.analyzer) {
      ids.push(box.dataset.analyzer);
    }
  });
  return ids;
}

function applyAnalysis(): void {
  if (!host || !loadedPayload || loadedBars.length === 0) {
    if (loadedPayload) {
      renderOutput(loadedPayload, []);
    }
    return;
  }
  const results = runReview(loadedBars, enabledAnalyzerIds());
  host.setResults(results);
  renderOutput(loadedPayload, results);
}

function renderOutput(payload: BarsPayload, results: AnalysisResult[]): void {
  outputEl!.replaceChildren();
  const source = document.createElement("p");
  const degraded = payload.meta?.degraded ? " (degraded)" : "";
  source.textContent = `source: ${payload.source}${degraded}`;
  outputEl!.append(source);

  if (payload.meta?.mt5_error) {
    const note = document.createElement("p");
    note.textContent = payload.meta.mt5_error;
    outputEl!.append(note);
  }

  for (const result of results) {
    const block = document.createElement("section");
    const title = document.createElement("h2");
    title.textContent = result.functionId;
    const summary = document.createElement("p");
    summary.textContent = result.summary;
    const names = document.createElement("p");
    names.textContent = result.results.map((item) => item.name).join(", ");
    block.append(title, summary, names);
    outputEl!.append(block);
  }
}
