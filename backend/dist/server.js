import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Pool } from 'pg';
const P2P_HISTORY_URL = 'https://api.p2pquake.net/v2/history?codes=551&limit=25';
const DATABASE_URL = process.env.DATABASE_URL;
const PORT = Number(process.env.PORT ?? 8787);
if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set.');
}
const pool = new Pool({ connectionString: DATABASE_URL });
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const getObject = (value, key) => {
    const objectValue = value[key];
    if (!isObject(objectValue)) {
        throw new Error(`Expected object at key "${key}".`);
    }
    return objectValue;
};
const getString = (value, key) => {
    const stringValue = value[key];
    if (typeof stringValue !== 'string') {
        throw new Error(`Expected string at key "${key}".`);
    }
    return stringValue;
};
const getNumber = (value, key) => {
    const numberValue = value[key];
    if (typeof numberValue !== 'number' || Number.isNaN(numberValue)) {
        throw new Error(`Expected number at key "${key}".`);
    }
    return numberValue;
};
const parseP2PTime = (value) => {
    const normalized = value.replaceAll('/', '-').replace(' ', 'T') + '+09:00';
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Invalid P2P timestamp: "${value}".`);
    }
    return parsed;
};
const nullableNumber = (value) => (value < 0 ? null : value);
const parseQuake = (value) => {
    if (!isObject(value)) {
        throw new Error('Expected quake data to be an object.');
    }
    const id = getString(value, 'id');
    const code = getNumber(value, 'code');
    const issue = getObject(value, 'issue');
    const earthquake = getObject(value, 'earthquake');
    const hypocenter = getObject(earthquake, 'hypocenter');
    return {
        id,
        code,
        issueTime: parseP2PTime(getString(issue, 'time')).toISOString(),
        earthquakeTime: parseP2PTime(getString(earthquake, 'time')).toISOString(),
        place: getString(hypocenter, 'name'),
        magnitude: nullableNumber(getNumber(hypocenter, 'magnitude')),
        maxScale: getNumber(earthquake, 'maxScale'),
        depth: nullableNumber(getNumber(hypocenter, 'depth')),
        latitude: nullableNumber(getNumber(hypocenter, 'latitude')),
        longitude: nullableNumber(getNumber(hypocenter, 'longitude')),
        domesticTsunami: typeof earthquake.domesticTsunami === 'string' ? earthquake.domesticTsunami : null,
        foreignTsunami: typeof earthquake.foreignTsunami === 'string' ? earthquake.foreignTsunami : null,
        raw: value
    };
};
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
const getLatestQuakes = async () => {
    const result = await pool.query(`
    SELECT
      id,
      code,
      issue_time AS "issueTime",
      earthquake_time AS "earthquakeTime",
      place,
      magnitude::float8 AS magnitude,
      max_scale AS "maxScale",
      depth,
      domestic_tsunami AS "domesticTsunami",
      foreign_tsunami AS "foreignTsunami"
    FROM jma_quakes
    ORDER BY earthquake_time DESC
    LIMIT 25
  `);
    return result.rows;
};
const app = new Hono();
app.use('*', cors());
app.get('/health', (c) => c.json({ status: 'ok' }));
app.post('/api/sync', async (c) => {
    const synced = await syncLatestQuakes();
    return c.json({ synced });
});
app.get('/api/quakes', async (c) => {
    const synced = await syncLatestQuakes();
    const data = await getLatestQuakes();
    return c.json({
        synced,
        data
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
