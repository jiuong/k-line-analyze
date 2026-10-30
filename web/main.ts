import { createDefaultChartHost, type ChartHost } from "../src/chart/host.js";
import { datetimeLocalToUnix } from "../src/page/queryTime.js";
import {
  reviewSidebarItems,
  runReview,
  visibleReviewResults,
  type ReviewSidebarItem,
} from "../src/page/reviewModel.js";
import { setupTradeRows } from "../src/page/setupTradesTable.js";
import type { AnalysisResult } from "../src/types/analysis.js";
import type { Bar, TimeFrame } from "../src/types/bars.js";
import type { SetupReport } from "../src/utils/setupMeasure.js";

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
const setupTradesEl = document.querySelector<HTMLElement>("#setup-trades");

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
  !chartHost ||
  !setupTradesEl
) {
  throw new Error("Review page is missing required elements");
}

const analyzerTitle = document.createElement("h2");
analyzerTitle.textContent = "Analysis";
analyzersEl.append(analyzerTitle);
for (const item of reviewSidebarItems()) {
  appendSidebarItem(analyzersEl, item);
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

function appendSidebarItem(parent: HTMLElement, item: ReviewSidebarItem): void {
  const label = document.createElement("label");
  const box = document.createElement("input");
  box.type = "checkbox";
  box.dataset.analyzer = item.id;
  box.dataset.kind = item.kind;
  label.append(box, document.createTextNode(item.label));
  parent.append(label);

  if (item.id === "measureSecondEntry") {
    appendEntryCountInput(parent);
  }

  if (item.id === "classifySwingTrend") {
    appendDisplayToggle(parent, "minorTrends", "Small-cycle trends");
    appendDisplayToggle(parent, "entryCounts", "Entry count");
  }

  box.addEventListener("change", () => {
    applyAnalysis();
  });
}

function appendEntryCountInput(parent: HTMLElement): void {
  const label = document.createElement("label");
  label.className = "subcheck";
  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.step = "1";
  input.value = "2";
  input.dataset.entryCount = "true";
  input.setAttribute("aria-label", "H/L");
  label.append(document.createTextNode("H/L"), input);
  parent.append(label);
  input.addEventListener("change", () => {
    applyAnalysis();
  });
}

function readEntryCount(): number {
  const input = analyzersEl!.querySelector<HTMLInputElement>(
    "input[data-entry-count]",
  );
  if (!input || input.value.trim() === "") return 2;
  const raw = Number(input.value);
  if (!Number.isInteger(raw) || raw < 1) return 2;
  return raw;
}

function appendDisplayToggle(
  parent: HTMLElement,
  flag: "minorTrends" | "entryCounts",
  text: string,
): void {
  const label = document.createElement("label");
  label.className = "subcheck";
  const box = document.createElement("input");
  box.type = "checkbox";
  box.dataset[flag] = "true";
  label.append(box, document.createTextNode(text));
  parent.append(label);
  box.addEventListener("change", () => {
    applyAnalysis();
  });
}

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
      host.setReports([]);
      renderSetupTrades([]);
      renderOutput(body, [], []);
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

function showMinorTrends(): boolean {
  return subcheckOn("minor-trends");
}

function showEntryCounts(): boolean {
  return subcheckOn("entry-counts");
}

function subcheckOn(flag: "minor-trends" | "entry-counts"): boolean {
  const boxes = analyzersEl!.querySelectorAll<HTMLInputElement>(
    `input[data-${flag}]:checked`,
  );
  return boxes.length > 0;
}

function enabledIdsByKind(kind: "classify" | "measure"): string[] {
  const boxes = analyzersEl!.querySelectorAll<HTMLInputElement>(
    `input[data-analyzer][data-kind="${kind}"]:checked`,
  );
  const ids = new Set<string>();
  boxes.forEach((box) => {
    if (box.dataset.analyzer) ids.add(box.dataset.analyzer);
  });
  return [...ids];
}

function applyAnalysis(): void {
  if (!host || !loadedPayload || loadedBars.length === 0) {
    if (loadedPayload) {
      renderSetupTrades([]);
      renderOutput(loadedPayload, [], []);
    }
    return;
  }
  const { analysis, reports } = runReview(
    loadedBars,
    {
      classifyIds: enabledIdsByKind("classify"),
      measureIds: enabledIdsByKind("measure"),
    },
    { entryCount: readEntryCount() },
  );
  const visible = visibleReviewResults(
    analysis,
    showMinorTrends(),
    showEntryCounts(),
  );
  host.setResults(visible);
  host.setReports(reports);
  renderSetupTrades(reports);
  renderOutput(loadedPayload, visible, reports);
}

function listedNames(result: AnalysisResult): string[] {
  return result.results.map((item) => item.name);
}

function formatRate(value: number | null): string {
  if (value === null) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

function formatRr(value: number | null): string {
  if (value === null) return "n/a";
  return value.toFixed(2);
}

function formatPrice(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}

function renderSetupTrades(reports: SetupReport[]): void {
  setupTradesEl!.replaceChildren();
  const rows = setupTradeRows(reports);
  if (rows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No measured setups";
    setupTradesEl!.append(empty);
    return;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const label of [
    "Measure",
    "Basis",
    "Range",
    "Entry",
    "Stop",
    "Target",
    "Status",
    "Plan RR",
    "Max RR",
  ]) {
    const th = document.createElement("th");
    th.textContent = label;
    headRow.append(th);
  }
  thead.append(headRow);
  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const cell of [
      row.measure,
      row.basis,
      row.range,
      formatPrice(row.entry),
      formatPrice(row.stop),
      formatPrice(row.target),
      row.status,
      formatRr(row.planRr),
      formatRr(row.maxRr),
    ]) {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(thead, tbody);
  setupTradesEl!.append(table);
}

function renderOutput(
  payload: BarsPayload,
  results: AnalysisResult[],
  reports: SetupReport[],
): void {
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

  for (const report of reports) {
    const block = document.createElement("section");
    const title = document.createElement("h2");
    title.textContent = report.functionId;
    const summary = document.createElement("p");
    const { stats } = report;
    summary.textContent = `count=${stats.count}; filled=${stats.filled}; wins=${stats.wins}; losses=${stats.losses}; open=${stats.open}; unfilled=${stats.unfilled}; winRate=${formatRate(stats.winRate)}; avgRR=${formatRr(stats.avgRewardRisk)}`;
    block.append(title, summary);
    const basisKeys = Object.keys(report.byBasis);
    if (basisKeys.length > 0) {
      const basis = document.createElement("p");
      basis.textContent = basisKeys
        .map((key) => {
          const row = report.byBasis[key]!;
          return `${key}: ${formatRate(row.winRate)} (${row.wins}/${row.wins + row.losses})`;
        })
        .join("; ");
      block.append(basis);
    }
    outputEl!.append(block);
  }

  for (const result of results) {
    const block = document.createElement("section");
    const title = document.createElement("h2");
    title.textContent = result.functionId;
    const summary = document.createElement("p");
    summary.textContent = result.summary;
    const names = document.createElement("p");
    names.textContent = listedNames(result).join(", ");
    block.append(title, summary, names);
    outputEl!.append(block);
  }
}
