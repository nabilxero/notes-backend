// Summarises a MongoDB explain() result: which plan stages ran and which indexes were used.
// Walks the whole tree because the plan shape differs between query engines/versions.
export function planSummary(explain: unknown): { stages: string[]; indexes: string[] } {
  const stages: string[] = [];
  const indexes: string[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        if (key === "rejectedPlans") continue; // only the winning plan matters
        if (key === "stage" && typeof value === "string") stages.push(value);
        if (key === "indexName" && typeof value === "string") indexes.push(value);
        walk(value);
      }
    }
  };
  walk(explain);
  return { stages, indexes };
}
