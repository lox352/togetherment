import { describe, expect, it } from "vitest";
import {
  addDaysToDateString,
  addWeeks,
  choreWeekEndDate,
  choreWeekOfDateString,
  choreWeekStartDate,
  currentWeekKey,
  dateStringInTz,
  formatWeekKey,
  isoWeekOfDate,
  isoWeeksBetween,
  mondayOfWeek,
  parseWeekKey,
  sundayOfWeek,
  weekKeyOfDateString,
} from "./week";

describe("isoWeekOfDate", () => {
  it("handles ordinary mid-year dates", () => {
    expect(isoWeekOfDate(2026, 7, 19)).toEqual({ isoYear: 2026, week: 29 }); // Sun 19 Jul 2026
    expect(isoWeekOfDate(2026, 7, 20)).toEqual({ isoYear: 2026, week: 30 }); // Mon 20 Jul 2026
  });

  it("handles ISO week-year boundaries (Dec 29 – Jan 3)", () => {
    // Fri 1 Jan 2021 belongs to 2020-W53
    expect(isoWeekOfDate(2021, 1, 1)).toEqual({ isoYear: 2020, week: 53 });
    // Mon 30 Dec 2024 belongs to 2025-W01
    expect(isoWeekOfDate(2024, 12, 30)).toEqual({ isoYear: 2025, week: 1 });
    // Thu 31 Dec 2020 belongs to 2020-W53
    expect(isoWeekOfDate(2020, 12, 31)).toEqual({ isoYear: 2020, week: 53 });
    // Sun 1 Jan 2023 belongs to 2022-W52
    expect(isoWeekOfDate(2023, 1, 1)).toEqual({ isoYear: 2022, week: 52 });
    // Thu 1 Jan 2026 belongs to 2026-W01
    expect(isoWeekOfDate(2026, 1, 1)).toEqual({ isoYear: 2026, week: 1 });
  });
});

describe("week keys", () => {
  it("formats zero-padded and round-trips", () => {
    const key = formatWeekKey({ isoYear: 2026, week: 1 });
    expect(key).toBe("2026-W01");
    expect(parseWeekKey(key)).toEqual({ isoYear: 2026, week: 1 });
  });

  it("rejects malformed keys", () => {
    expect(() => parseWeekKey("2026-1")).toThrow();
    expect(() => parseWeekKey("2026-W1")).toThrow();
  });

  it("sorts lexicographically in chronological order", () => {
    expect("2025-W53" < "2026-W01").toBe(true);
    expect("2026-W09" < "2026-W10").toBe(true);
  });
});

describe("mondayOfWeek / sundayOfWeek", () => {
  it("returns the correct Monday", () => {
    expect(mondayOfWeek("2026-W30")).toBe("2026-07-20");
    expect(mondayOfWeek("2025-W01")).toBe("2024-12-30"); // crosses calendar year
    expect(mondayOfWeek("2020-W53")).toBe("2020-12-28");
  });

  it("sunday is monday + 6", () => {
    expect(sundayOfWeek("2026-W30")).toBe("2026-07-26");
    expect(sundayOfWeek("2020-W53")).toBe("2021-01-03"); // crosses calendar year
  });
});

describe("isoWeeksBetween / addWeeks", () => {
  it("counts weeks across year boundaries", () => {
    expect(isoWeeksBetween("2020-W52", "2021-W01")).toBe(2); // 2020 had W53
    expect(isoWeeksBetween("2026-W30", "2026-W30")).toBe(0);
    expect(isoWeeksBetween("2026-W30", "2026-W29")).toBe(-1);
  });

  it("addWeeks round-trips across boundaries", () => {
    expect(addWeeks("2020-W53", 1)).toBe("2021-W01");
    expect(addWeeks("2021-W01", -1)).toBe("2020-W53");
    expect(addWeeks("2026-W30", 26)).toBe("2027-W03"); // 2026 has 53 ISO weeks
    for (let n = -60; n <= 60; n++) {
      const key = addWeeks("2026-W01", n);
      expect(isoWeeksBetween("2026-W01", key)).toBe(n);
    }
  });
});

describe("chore-week blocks (Fri–Thu with the -3 offset)", () => {
  it("starts each block on the Friday before the ISO Monday", () => {
    // Week 2026-W30 has ISO Monday 20 Jul; the chore block runs Fri 17 – Thu 23.
    expect(choreWeekStartDate("2026-W30")).toBe("2026-07-17");
    expect(choreWeekEndDate("2026-W30")).toBe("2026-07-23");
  });

  it("assigns dates to blocks: Friday flips to the new week, Thursday closes the old one", () => {
    expect(choreWeekOfDateString("2026-07-16")).toBe("2026-W29"); // Thu
    expect(choreWeekOfDateString("2026-07-17")).toBe("2026-W30"); // Fri — new block
    expect(choreWeekOfDateString("2026-07-20")).toBe("2026-W30"); // Mon
    expect(choreWeekOfDateString("2026-07-23")).toBe("2026-W30"); // Thu
    expect(choreWeekOfDateString("2026-07-24")).toBe("2026-W31"); // Fri — next block
  });

  it("blocks are contiguous across the year boundary", () => {
    const start = choreWeekStartDate("2021-W01");
    expect(addDaysToDateString(choreWeekEndDate("2020-W53"), 1)).toBe(start);
  });
});

describe("timezone-aware current week", () => {
  it("computes the block from the date as seen in the household timezone", () => {
    // 2026-07-17T03:00Z is Fri 17 Jul in UTC but still Thu 16 Jul in New York:
    // UTC has rolled into the new Fri–Thu block, New York hasn't.
    const instant = new Date("2026-07-17T03:00:00Z");
    expect(dateStringInTz(instant, "America/New_York")).toBe("2026-07-16");
    expect(currentWeekKey(instant, "America/New_York")).toBe("2026-W29");
    expect(currentWeekKey(instant, "UTC")).toBe("2026-W30");
    expect(currentWeekKey(instant, "Asia/Tokyo")).toBe("2026-W30");
  });

  it("weekKeyOfDateString matches isoWeekOfDate", () => {
    expect(weekKeyOfDateString("2024-12-30")).toBe("2025-W01");
  });
});
