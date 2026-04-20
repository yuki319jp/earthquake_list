const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;
const clampInteger = (value, fallback, minimum, maximum) => {
    const parsed = Number.parseInt(value ?? '', 10);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.min(maximum, Math.max(minimum, parsed));
};
const parseNumber = (value) => {
    if (value === undefined || value.trim() === '') {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};
const parseBoolean = (value, fallback) => {
    if (value === undefined) {
        return fallback;
    }
    return value === '1' || value.toLowerCase() === 'true';
};
export const parseSortOption = (value) => {
    switch (value) {
        case 'time-asc':
        case 'time-desc':
        case 'magnitude-asc':
        case 'magnitude-desc':
        case 'depth-asc':
        case 'depth-desc':
        case 'scale-asc':
        case 'scale-desc':
            return value;
        default:
            return 'time-desc';
    }
};
export const parseQuakeSearchParams = (query) => ({
    place: query.place?.trim() ?? '',
    datetime: query.datetime?.trim() ?? '',
    minMagnitude: parseNumber(query.minMagnitude),
    maxMagnitude: parseNumber(query.maxMagnitude),
    minDepth: parseNumber(query.minDepth),
    maxDepth: parseNumber(query.maxDepth),
    minScale: parseNumber(query.minScale),
    maxScale: parseNumber(query.maxScale),
    tsunamiOnly: parseBoolean(query.tsunamiOnly, false),
    sortBy: parseSortOption(query.sortBy),
    limit: clampInteger(query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT),
    offset: clampInteger(query.offset, 0, 0, Number.MAX_SAFE_INTEGER),
    shouldSync: parseBoolean(query.sync, true),
});
export const buildWhereClause = (params) => {
    const conditions = [];
    const values = [];
    if (params.place.length > 0) {
        values.push(`%${params.place}%`);
        conditions.push(`place ILIKE $${values.length}`);
    }
    if (params.datetime.length > 0) {
        values.push(`%${params.datetime}%`);
        const placeholder = `$${values.length}`;
        conditions.push(`(
        to_char(earthquake_time AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD HH24:MI:SS') ILIKE ${placeholder}
        OR to_char(issue_time AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD HH24:MI:SS') ILIKE ${placeholder}
        OR earthquake_time::text ILIKE ${placeholder}
        OR issue_time::text ILIKE ${placeholder}
      )`);
    }
    if (params.minMagnitude !== null) {
        values.push(params.minMagnitude);
        conditions.push(`magnitude >= $${values.length}`);
    }
    if (params.maxMagnitude !== null) {
        values.push(params.maxMagnitude);
        conditions.push(`magnitude <= $${values.length}`);
    }
    if (params.minDepth !== null) {
        values.push(params.minDepth);
        conditions.push(`depth >= $${values.length}`);
    }
    if (params.maxDepth !== null) {
        values.push(params.maxDepth);
        conditions.push(`depth <= $${values.length}`);
    }
    if (params.minScale !== null) {
        values.push(params.minScale);
        conditions.push(`max_scale >= $${values.length}`);
    }
    if (params.maxScale !== null) {
        values.push(params.maxScale);
        conditions.push(`max_scale <= $${values.length}`);
    }
    if (params.tsunamiOnly) {
        conditions.push(`(
      (
        NULLIF(BTRIM(domestic_tsunami), '') IS NOT NULL
        AND LOWER(BTRIM(domestic_tsunami)) <> 'none'
      )
      OR (
        NULLIF(BTRIM(foreign_tsunami), '') IS NOT NULL
        AND LOWER(BTRIM(foreign_tsunami)) <> 'none'
      )
    )`);
    }
    return {
        sql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
        values,
    };
};
export const buildOrderByClause = (sortBy) => {
    switch (sortBy) {
        case 'time-asc':
            return 'ORDER BY earthquake_time ASC, issue_time ASC';
        case 'magnitude-desc':
            return 'ORDER BY magnitude DESC NULLS LAST, earthquake_time DESC';
        case 'magnitude-asc':
            return 'ORDER BY magnitude ASC NULLS LAST, earthquake_time DESC';
        case 'depth-asc':
            return 'ORDER BY depth ASC NULLS LAST, earthquake_time DESC';
        case 'depth-desc':
            return 'ORDER BY depth DESC NULLS LAST, earthquake_time DESC';
        case 'scale-desc':
            return 'ORDER BY max_scale DESC, earthquake_time DESC';
        case 'scale-asc':
            return 'ORDER BY max_scale ASC, earthquake_time DESC';
        case 'time-desc':
        default:
            return 'ORDER BY earthquake_time DESC, issue_time DESC';
    }
};
