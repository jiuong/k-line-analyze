import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

function sourceFiles(dir: string): string[] {
  const abs = path.join(repoRoot, dir);
  const files: string[] = [];
  for (const entry of readdirSync(abs)) {
    const full = path.join(abs, entry);
    if (statSync(full).isDirectory()) {
      files.push(...sourceFiles(path.relative(repoRoot, full)));
      continue;
    }
    if (full.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

describe("chart import boundary", () => {
  it("keeps the chart package out of analyze, data, utils, and page", () => {
    const roots = ["src/analyze", "src/data", "src/utils", "src/page"];
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of sourceFiles(root)) {
        const text = readFileSync(file, "utf8");
        if (text.includes("@trading-playback/kline-chart")) {
          offenders.push(path.relative(repoRoot, file));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("imports the chart package from src/chart only", () => {
    const chartFiles = sourceFiles("src/chart").filter((file) =>
      readFileSync(file, "utf8").includes("@trading-playback/kline-chart"),
    );
    expect(chartFiles.length).toBeGreaterThan(0);
  });
});
