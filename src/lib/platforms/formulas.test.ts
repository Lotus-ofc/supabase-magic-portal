import { describe, expect, it } from "vitest";
import {
  cpa,
  cpc,
  cpm,
  ctr,
  convRate,
  dailyAverage,
  engagementRate,
  eventsPerSession,
  frequency,
  viewsPerUser,
} from "./formulas";

describe("formulas — fonte única de KPIs", () => {
  it("ctr", () => {
    expect(ctr(1000, 50)).toBe(5);
    expect(ctr(0, 0)).toBe(0);
    expect(ctr(100, 0)).toBe(0);
  });

  it("cpc", () => {
    expect(cpc(100, 50)).toBe(2);
    expect(cpc(100, 0)).toBe(0);
  });

  it("cpm", () => {
    expect(cpm(50, 10_000)).toBe(5);
    expect(cpm(0, 0)).toBe(0);
  });

  it("cpa", () => {
    expect(cpa(200, 4)).toBe(50);
    expect(cpa(100, 0)).toBe(0);
  });

  it("convRate", () => {
    expect(convRate(10, 100)).toBe(10);
    expect(convRate(0, 0)).toBe(0);
  });

  it("frequency", () => {
    expect(frequency(300, 100)).toBe(3);
    expect(frequency(0, 0)).toBe(0);
  });

  it("engagementRate", () => {
    expect(engagementRate(50, 200)).toBe(25);
  });

  it("eventsPerSession", () => {
    expect(eventsPerSession(400, 100)).toBe(4);
  });

  it("viewsPerUser", () => {
    expect(viewsPerUser(500, 100)).toBe(5);
  });

  it("dailyAverage", () => {
    expect(dailyAverage(70, 7)).toBe(10);
    expect(dailyAverage(10, 0)).toBe(0);
  });
});
