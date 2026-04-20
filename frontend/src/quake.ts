export type Quake = {
  id: string;
  code: number;
  place: string;
  magnitude: number | null;
  maxScale: number;
  depth: number | null;
  latitude: number | null;
  longitude: number | null;
  issueTime: string;
  earthquakeTime: string;
  domesticTsunami: string | null;
  foreignTsunami: string | null;
  publisher: string | null;
};

export type SortOption =
  | "time-desc"
  | "time-asc"
  | "magnitude-desc"
  | "magnitude-asc"
  | "depth-asc"
  | "depth-desc"
  | "scale-desc"
  | "scale-asc";

const scaleLabels: Record<number, string> = {
  10: "1",
  20: "2",
  30: "3",
  40: "4",
  45: "5弱",
  50: "5強",
  55: "6弱",
  60: "6強",
  70: "7",
};

export const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "time-desc", label: "発生時刻（新しい順）" },
  { value: "time-asc", label: "発生時刻（古い順）" },
  { value: "magnitude-desc", label: "マグニチュード（高い順）" },
  { value: "magnitude-asc", label: "マグニチュード（低い順）" },
  { value: "depth-asc", label: "深さ（浅い順）" },
  { value: "depth-desc", label: "深さ（深い順）" },
  { value: "scale-desc", label: "震度（高い順）" },
  { value: "scale-asc", label: "震度（低い順）" },
];

export const isSortOption = (value: string): value is SortOption =>
  sortOptions.some((option) => option.value === value);

export const normalizeText = (value: string): string => value.toLowerCase().trim();
export const formatScale = (scale: number): string => scaleLabels[scale] ?? String(scale);
export const formatDepth = (depth: number | null): string =>
  depth === null ? "不明" : `${depth}km`;
export const formatCoordinate = (value: number | null): string =>
  value === null ? "不明" : value.toFixed(4);
export const formatMagnitude = (magnitude: number | null): string =>
  magnitude === null ? "不明" : `M${magnitude.toFixed(1)}`;
export const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString("ja-JP", {
    hour12: false,
    timeZone: "Asia/Tokyo",
  });

export const formatTsunami = (value: string | null): string => {
  if (value === null) return "心配なし";

  const v = value.toString().trim();
  if (v === "") return "心配なし";
  if (v.toLowerCase() === "none") return "心配なし";

  return v;
};

export const compareNullableNumber = (
  left: number | null,
  right: number | null,
  direction: "asc" | "desc",
): number => {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return direction === "asc" ? left - right : right - left;
};

export const compareQuakes = (left: Quake, right: Quake, sortBy: SortOption): number => {
  const leftTime = new Date(left.earthquakeTime).getTime();
  const rightTime = new Date(right.earthquakeTime).getTime();
  let result = 0;

  switch (sortBy) {
    case "time-desc":
      result = rightTime - leftTime;
      break;
    case "time-asc":
      result = leftTime - rightTime;
      break;
    case "magnitude-desc":
      result = compareNullableNumber(left.magnitude, right.magnitude, "desc");
      break;
    case "magnitude-asc":
      result = compareNullableNumber(left.magnitude, right.magnitude, "asc");
      break;
    case "depth-asc":
      result = compareNullableNumber(left.depth, right.depth, "asc");
      break;
    case "depth-desc":
      result = compareNullableNumber(left.depth, right.depth, "desc");
      break;
    case "scale-desc":
      result = right.maxScale - left.maxScale;
      break;
    case "scale-asc":
      result = left.maxScale - right.maxScale;
      break;
  }

  return result === 0 ? rightTime - leftTime : result;
};

export const mergeQuakes = (
  current: Quake[],
  incoming: Quake[],
  maxEntries = Number.POSITIVE_INFINITY,
): Quake[] => {
  const merged = new Map<string, Quake>();

  for (const quake of current) {
    merged.set(quake.id, quake);
  }

  for (const quake of incoming) {
    merged.set(quake.id, quake);
  }

  return [...merged.values()]
    .sort((left, right) => {
      const earthquakeDiff =
        new Date(right.earthquakeTime).getTime() -
        new Date(left.earthquakeTime).getTime();
      if (earthquakeDiff !== 0) {
        return earthquakeDiff;
      }

      return (
        new Date(right.issueTime).getTime() - new Date(left.issueTime).getTime()
      );
    })
    .slice(0, maxEntries);
};

export const matchesDatetimeQuery = (quake: Quake, query: string): boolean => {
  if (!query) {
    return true;
  }

  const haystack = [
    quake.issueTime,
    quake.earthquakeTime,
    formatDateTime(quake.issueTime),
    formatDateTime(quake.earthquakeTime),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
};
