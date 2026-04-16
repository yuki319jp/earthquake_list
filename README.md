# earthquake_list

P2P地震情報API（JMAQuakes / code=551）から最新25件を取得し、PostgreSQLへ保存して一覧表示する最小実装です。

## 起動方法（Docker）

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8787

## 最小実装の仕様

- バックエンド（Hono）
  - `GET /api/quakes` 実行時にP2P APIから最新25件を取得
  - PostgreSQLの `jma_quakes` テーブルへ `id` 重複を除いて追加保存
  - DBには保存済みデータを残し、追加がない場合はそのまま
  - 保存済みの最新25件を返却
- フロントエンド（SolidJS + Tailwind CSS）
  - バックエンドAPIから地震一覧を取得して表示
  - 手動更新ボタンを提供
  - Google Fonts（Noto Sans JP）とLucideアイコンを使用
