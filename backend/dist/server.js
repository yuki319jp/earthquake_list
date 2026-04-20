import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Pool } from 'pg';
import { extractPublisher, parseQuake } from './quake.js';
import { buildOrderByClause, buildWhereClause, parseQuakeSearchParams, } from './quakeSearch.js';
const MAX_QUAKES = 100;
const P2P_HISTORY_URL = `https://api.p2pquake.net/v2/history?codes=551&limit=${MAX_QUAKES}`;
const DATABASE_URL = process.env.DATABASE_URL;
const PORT = Number(process.env.PORT ?? 8787);
if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set.');
}
const pool = new Pool({ connectionString: DATABASE_URL });
const ensureSchema = async () => {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS jma_quakes (
      id TEXT PRIMARY KEY,
      code INTEGER NOT NULL,
      issue_time TIMESTAMPTZ NOT NULL,
      earthquake_time TIMESTAMPTZ NOT NULL,
      place TEXT NOT NULL,
      magnitude NUMERIC(4,1),
      max_scale INTEGER NOT NULL,
      depth INTEGER,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      domestic_tsunami TEXT,
      foreign_tsunami TEXT,
      raw JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};
const syncLatestQuakes = async () => {
    const response = await fetch(P2P_HISTORY_URL, {
        headers: {
            'User-Agent': 'earthquake-list/0.1.0'
        }
    });
    if (!response.ok) {
        throw new Error(`P2P API request failed: ${response.status} ${response.statusText}`);
    }
    const payload = (await response.json());
    if (!Array.isArray(payload)) {
        throw new Error('P2P API returned unexpected response.');
    }
    const parsed = payload.map((entry) => parseQuake(entry)).filter((entry) => entry.code === 551);
    let inserted = 0;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const quake of parsed) {
            const result = await client.query(`
          INSERT INTO jma_quakes (
            id,
            code,
            issue_time,
            earthquake_time,
            place,
            magnitude,
            max_scale,
            depth,
            latitude,
            longitude,
            domestic_tsunami,
            foreign_tsunami,
            raw
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
          ON CONFLICT (id) DO NOTHING
        `, [
                quake.id,
                quake.code,
                quake.issueTime,
                quake.earthquakeTime,
                quake.place,
                quake.magnitude,
                quake.maxScale,
                quake.depth,
                quake.latitude,
                quake.longitude,
                quake.domesticTsunami,
                quake.foreignTsunami,
                JSON.stringify(quake.raw)
            ]);
            inserted += result.rowCount ?? 0;
        }
        await client.query('COMMIT');
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
    return { inserted, totalFetched: parsed.length };
};
const mapQuakeRows = (rows) => rows.map((r) => {
    return {
        id: r.id,
        code: r.code,
        issueTime: r.issueTime,
        earthquakeTime: r.earthquakeTime,
        place: r.place,
        magnitude: r.magnitude,
        maxScale: r.maxScale,
        depth: r.depth,
        latitude: r.latitude,
        longitude: r.longitude,
        domesticTsunami: r.domesticTsunami,
        foreignTsunami: r.foreignTsunami,
        publisher: extractPublisher(r.raw)
    };
});
const selectColumns = `
    SELECT
      id,
      code,
      issue_time AS "issueTime",
      earthquake_time AS "earthquakeTime",
      place,
      magnitude::float8 AS magnitude,
      max_scale AS "maxScale",
      depth,
      latitude,
      longitude,
      domestic_tsunami AS "domesticTsunami",
      foreign_tsunami AS "foreignTsunami",
      raw
`;
const getQuakes = async (params) => {
    const where = buildWhereClause(params);
    const orderBy = buildOrderByClause(params.sortBy);
    const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM jma_quakes ${where.sql}`, where.values);
    const total = countResult.rows[0]?.total ?? 0;
    const limitPlaceholder = `$${where.values.length + 1}`;
    const offsetPlaceholder = `$${where.values.length + 2}`;
    const result = await pool.query(`
      ${selectColumns}
      FROM jma_quakes
      ${where.sql}
      ${orderBy}
      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
    `, [...where.values, params.limit, params.offset]);
    return {
        data: mapQuakeRows(result.rows),
        total,
        hasMore: params.offset + result.rows.length < total
    };
};
const app = new Hono();
app.use('*', cors());
app.get('/health', (c) => c.json({ status: 'ok' }));
app.post('/api/sync', async (c) => {
    const synced = await syncLatestQuakes();
    return c.json({ synced });
});
app.get('/api/quakes', async (c) => {
    const params = parseQuakeSearchParams({
        place: c.req.query('place'),
        datetime: c.req.query('datetime'),
        minMagnitude: c.req.query('minMagnitude'),
        maxMagnitude: c.req.query('maxMagnitude'),
        minDepth: c.req.query('minDepth'),
        maxDepth: c.req.query('maxDepth'),
        minScale: c.req.query('minScale'),
        maxScale: c.req.query('maxScale'),
        tsunamiOnly: c.req.query('tsunamiOnly'),
        sortBy: c.req.query('sortBy'),
        limit: c.req.query('limit'),
        offset: c.req.query('offset'),
        sync: c.req.query('sync')
    });
    const synced = params.shouldSync
        ? await syncLatestQuakes()
        : { inserted: 0, totalFetched: 0 };
    const result = await getQuakes(params);
    return c.json({
        synced,
        data: result.data,
        total: result.total,
        hasMore: result.hasMore,
        limit: params.limit,
        offset: params.offset
    });
});
app.onError((error, c) => {
    console.error(error);
    return c.json({ error: error.message }, 500);
});
await ensureSchema();
serve({
    fetch: app.fetch,
    port: PORT
}, (info) => {
    console.log(`Backend server started on http://localhost:${info.port}`);
});
