import { describe, expect, it } from "vitest";
import {
  compareQuakes,
  formatTsunami,
  isSortOption,
  matchesDatetimeQuery,
  mergeQuakes,
  type Quake,
} from "./quake";

const baseQuake = (overrides: Partial<Quake> = {}): Quake => ({
  id: "quake-1",
  code: 551,
  place: "福島県沖",
  magnitude: 5.2,
  maxScale: 40,
  depth: 50,
  latitude: 37.1234,
  longitude: 141.5678,
  issueTime: "2026-04-17T00:05:00.000Z",
  earthquakeTime: "2026-04-17T00:00:00.000Z",
  domesticTsunami: null,
  foreignTsunami: null,
  publisher: "気象庁",
  ...overrides,
});

describe("quake helpers", () => {
  it("sort option を判定できる", () => {
    expect(isSortOption("time-desc")).toBe(true);
    expect(isSortOption("invalid")).toBe(false);
  });

  it("津波表示の未設定値を心配なしに変換する", () => {
    expect(formatTsunami(null)).toBe("心配なし");
    expect(formatTsunami("")).toBe("心配なし");
    expect(formatTsunami("none")).toBe("心配なし");
    expect(formatTsunami("watch")).toBe("watch");
  });

  it("地震情報を指定順でソートできる", () => {
    const stronger = baseQuake({ id: "quake-2", maxScale: 50 });
    const weaker = baseQuake({ id: "quake-3", maxScale: 30 });

    expect(compareQuakes(stronger, weaker, "scale-desc")).toBeLessThan(0);
    expect(compareQuakes(stronger, weaker, "scale-asc")).toBeGreaterThan(0);
  });

  it("同一 id は新しい内容でマージされ、時刻順に並ぶ", () => {
    const current = [
      baseQuake({ id: "quake-1", place: "旧データ", earthquakeTime: "2026-04-17T00:00:00.000Z" }),
    ];
    const incoming = [
      baseQuake({ id: "quake-1", place: "新データ", earthquakeTime: "2026-04-17T00:00:00.000Z" }),
      baseQuake({ id: "quake-2", earthquakeTime: "2026-04-17T01:00:00.000Z" }),
    ];

    const result = mergeQuakes(current, incoming);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("quake-2");
    expect(result[1].place).toBe("新データ");
  });

  it("マージ後の件数を上限で切り詰める", () => {
    const current = [baseQuake({ id: "quake-1" })];
    const incoming = [
      baseQuake({ id: "quake-2", earthquakeTime: "2026-04-17T02:00:00.000Z" }),
      baseQuake({ id: "quake-3", earthquakeTime: "2026-04-17T01:00:00.000Z" }),
    ];

    const result = mergeQuakes(current, incoming, 2);

    expect(result).toHaveLength(2);
    expect(result.map((quake) => quake.id)).toEqual(["quake-2", "quake-3"]);
  });

  it("日時検索が ISO 形式と整形済み文字列の両方に一致する", () => {
    const quake = baseQuake({
      issueTime: "2026-04-17T09:39:00.000Z",
      earthquakeTime: "2026-04-17T09:35:00.000Z",
    });

    expect(matchesDatetimeQuery(quake, "2026-04-17t09:35")).toBe(true);
    expect(matchesDatetimeQuery(quake, "2026/01/01")).toBe(false);
  });
});
