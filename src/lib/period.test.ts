import { describe, expect, it } from "vitest";
import { addDaysISO, brtToday, diffDaysISO, resolvePeriod } from "./period";

const REF = "2026-06-26";

describe("period — timezone BRT", () => {
  it("addDaysISO", () => {
    expect(addDaysISO("2026-06-26", -6)).toBe("2026-06-20");
    expect(addDaysISO("2026-06-26", 1)).toBe("2026-06-27");
  });

  it("diffDaysISO", () => {
    expect(diffDaysISO("2026-06-20", "2026-06-26")).toBe(6);
  });

  it("resolvePeriod last_7", () => {
    const p = resolvePeriod({ preset: "last_7" }, REF);
    expect(p.from).toBe("2026-06-20");
    expect(p.to).toBe(REF);
    expect(p.days).toBe(7);
    expect(p.prevTo).toBe("2026-06-19");
    expect(p.prevFrom).toBe("2026-06-13");
  });

  it("resolvePeriod today", () => {
    const p = resolvePeriod({ preset: "today" }, REF);
    expect(p.from).toBe(REF);
    expect(p.to).toBe(REF);
    expect(p.days).toBe(1);
  });

  it("resolvePeriod custom swaps inverted range", () => {
    const p = resolvePeriod(
      { preset: "custom", customFrom: "2026-06-30", customTo: "2026-06-01" },
      REF,
    );
    expect(p.from).toBe("2026-06-01");
    expect(p.to).toBe("2026-06-30");
  });

  it("brtToday returns YYYY-MM-DD shape", () => {
    const t = brtToday(new Date("2026-06-26T15:00:00-03:00"));
    expect(t).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
