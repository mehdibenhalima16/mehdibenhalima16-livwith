import { describe, expect, it } from "vitest";
import { isAdult, safeNext } from "@/lib/validation";

describe("validation", () => {
  it("contrôle la majorité à la date près", () => {
    const today = new Date(Date.UTC(2026, 8, 29));
    expect(isAdult("2008-09-29", today)).toBe(true);
    expect(isAdult("2008-09-30", today)).toBe(false);
    expect(isAdult("pas-une-date", today)).toBe(false);
  });
  it("refuse les redirections vers un autre site", () => {
    expect(safeNext("/messages/abc")).toBe("/messages/abc");
    expect(safeNext("//evil.com")).toBe("/discover");
    expect(safeNext("https://evil.com")).toBe("/discover");
    expect(safeNext("/\\evil.com")).toBe("/discover");
  });
});
