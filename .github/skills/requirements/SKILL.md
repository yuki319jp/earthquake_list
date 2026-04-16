---
name: requirements
description: 要件定義
---

# earthquake_listとは
SolidJS製の軽量な地震情報をリスト表示するwebアプリケーション
P2P地震情報APIを使用します。

# P2P地震情報API
- Documents: https://www.p2pquake.net/develop/json_api_v2/
- Schemaは"JMAQuakes"を使用
- 直近25件の情報を取得
  - 追加された情報のみを保存し、何も増えていない場合、そのままにする。 
- 取得したデータをPostgreSQLに保存

# フロントエンド
