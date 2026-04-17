# earthquake_list

気象庁地震情報をもとにした地震一覧アプリです。  
バックエンドが最新の地震情報を取得して PostgreSQL に保存し、フロントエンドが一覧・検索・並び替え・詳細表示を行います。

## 構成

- `backend`: Hono + TypeScript による API サーバー
- `frontend`: SolidJS + Vite による UI
- `db`: PostgreSQL

## できること

- 最新 25 件の地震情報を取得して保存
- 保存済みデータを重複なく保持
- 地名検索
- 日時検索
- 並び替え
- 一覧表示とギャラリー表示の切り替え
- モーダルで詳細表示
- 2 分ごとの自動更新
- 手動更新
- ライト / ダークテーマ切り替え

## データソース

- P2P 地震情報 API
- 取得対象: `code=551`
- 取得 URL: `https://api.p2pquake.net/v2/history?codes=551&limit=25`

## セットアップ

`.env.example` をベースに環境変数を用意できます。

```env
POSTGRES_DB=earthquake_list
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@db:5432/earthquake_list
PORT=8787
VITE_API_BASE_URL=http://localhost:8787
```

## 起動方法

### Docker でまとめて起動

```bash
docker compose up --build
```

起動後の URL:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8787`
- Health check: `http://localhost:8787/health`

### ローカルで個別に起動

#### Backend

```bash
cd backend
pnpm install
pnpm run dev
```

#### Frontend

```bash
cd frontend
pnpm install
pnpm run dev
```

PostgreSQL は別途起動しておき、`DATABASE_URL` を合わせてください。

## API

### `GET /health`

疎通確認用です。

レスポンス例:

```json
{
  "status": "ok"
}
```

### `POST /api/sync`

外部 API から最新情報を取得し、未保存分を DB に追加します。

レスポンス例:

```json
{
  "synced": {
    "inserted": 3,
    "totalFetched": 25
  }
}
```

### `GET /api/quakes`

同期を実行した上で、保存済みの最新 25 件を返します。

レスポンス例:

```json
{
  "synced": {
    "inserted": 0,
    "totalFetched": 25
  },
  "data": [
    {
      "id": "xxxx",
      "code": 551,
      "issueTime": "2026-04-17T00:00:00.000Z",
      "earthquakeTime": "2026-04-17T00:00:00.000Z",
      "place": "東京都",
      "magnitude": 4.2,
      "maxScale": 30,
      "depth": 40,
      "latitude": 35.6,
      "longitude": 139.7,
      "domesticTsunami": "None",
      "foreignTsunami": "None",
      "publisher": "気象庁"
    }
  ]
}
```

## 開発コマンド

### Backend

```bash
cd backend
pnpm run dev
pnpm run build
pnpm run test
pnpm run lint
```

### Frontend

```bash
cd frontend
pnpm run dev
pnpm run build
pnpm run test
pnpm run lint
```

## 手動確認ポイント

- `GET /health` が `200` を返す
- `GET /api/quakes` で一覧データが返る
- 地名検索が機能する
- 日時検索が機能する
- 並び替えが反映される
- 詳細モーダルが開閉できる
- テーマ切り替えが保持される
- 2 分ごとの自動更新が動作する

## ディレクトリ構成

```text
.
├── backend
│   └── src
│       └── server.ts
├── frontend
│   └── src
│       └── App.tsx
├── docker-compose.yml
└── .env.example
```
