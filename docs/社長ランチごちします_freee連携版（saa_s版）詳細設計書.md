# 社長ランチごちします freee連携版（SaaS版）詳細設計書

本書は「社長ランチごちします freee連携版（n8n版）」の思想・運用を踏襲しつつ、
**TypeScript + 独自UI + SaaS構成**として実装するための詳細設計書である。

---

## 1. 目的・コンセプト

- 建設・現場業界における **仕出し弁当の福利厚生費管理** を安全かつ簡単に行う
- 現場（職人）は **写真を撮って送るだけ**
- 経理は **月末にまとめて freee 下書きを確認するだけ**
- 税務判断は **システムで確定せず、人（経理）に委ねる**

キーワード：
- 現場を止めない
- 経理を疲弊させない
- 税務で説明できる

---

## 2. 想定利用者・役割

| 役割 | 主な操作 |
|---|---|
| 職人・社員 | 日次入力（写真＋最低限の情報） |
| 経理担当 | freee 下書き確認・承認・科目変更 |
| 管理者 | 初期設定・上限設定・freee連携管理 |

---

## 3. 全体構成（SaaS版）

アプリは **1つのSaaS** として提供し、内部に3つのフローを持つ。

```
[ 社長ランチごちします SaaS ]
├─ ① 初回ペアリング（QR）フロー（初回のみ）
├─ ② 日次入力フロー（職人用UI）
└─ ③ 月次集計フロー（管理UIで手動トリガー）
```

---

## 4. フロー①：初回ペアリング（QR認証）

### 目的
- ログイン操作が困難な職人向けに **ログインレス認証** を実現
- 「このスマホ = この社員」を1対1で紐づける

### 画面・動作
1. 管理者が社員ごとのQRコードを発行
2. 職人がスマホでQRコードを読み取る
3. 「この端末を登録しますか？」→ OK
4. 端末IDと employee_id をDBに保存
5. 次回以降は自動認証（画面非表示）

---

## 5. フロー②：日次入力フロー（メインUI）

### 位置づけ
- 職人が **唯一触る画面**
- アプリの価値の8割を担う

### 入力項目

| 項目 | 必須 | 説明 |
|---|---|---|
| 仕出し弁当の写真 | ○ | 現物支給の証跡（レシート不要） |
| 食べた日 | ○ | デフォルト当日、過去日選択可 |
| 現場名 | ○ | 税務・監査・説明用 |
| 弁当代（実費） | ○ | 職人が実際に支払った金額 |
| 備考 | 任意 | ひとことメモ |

### 裏側処理
- 画像拡張子チェック（jpeg/png）
- SHA-256 による写真ハッシュ生成
- 重複ハッシュ検知
  - 処理は止めない
  - review_status = needs_review
 - 元画像（オリジナル）を保持し、監査で辿れるようにする

---

## 6. データベース設計（主要）

### 6.1 lunch_entries（一次ログ）

**目的**：現場で起きた事実をそのまま保存する台帳

| カラム | 説明 |
|---|---|
| id | レコードID（UUID） |
| tenant_id | テナントID（SaaS分離のため必須） |
| employee_id | 社員ID |
| device_id | 端末ID |
| entry_date | 利用日 |
| year_month | YYYY-MM |
| site_name | 現場名 |
| total_amount | 弁当実費（社員支払） |
| subsidy_unit | 補助単価（例：150円固定） |
| photo_hash | 写真SHA-256 |
| photo_url | 保存先URL |
| review_status | normal / needs_review |
| exported_flag | 月次処理済みか |
| created_at | 登録日時 |

---

### 6.2 welfare_balance（月次確定台帳）

**目的**：社員×月ごとの補助確定結果を保持

| カラム | 説明 |
|---|---|
| tenant_id | テナントID（SaaS分離のため必須） |
| employee_id | 社員ID |
| year_month | 対象月 |
| used_subsidy_amount | 実際に補助した合計 |
| limit_amount | 月次上限（例：3,500円） |
| status | open / fixed |
| calculated_at | 集計日時 |

---

### 6.3 freee_exports（会計連携ログ）

| カラム | 説明 |
|---|---|
| tenant_id | テナントID（SaaS分離のため必須） |
| employee_id | 社員ID |
| year_month | 対象月 |
| export_batch_id | 冪等キー（例：tenant_id + year_month + employee_id） |
| freee_object_id | freee下書きID |
| status | draft_created / error |
| created_at | 作成日時 |

---

## 7. フロー③：月次集計フロー（管理UIで手動トリガー）

### 実行タイミング（MVP）
- 管理UIの「月次集計」から **対象月を選択して手動実行**する

### 処理内容
1. 前月分 lunch_entries を取得
2. 社員×月で集計
3. 月3,500円上限で補助額を確定
4. freee に **下書き作成**（MVPは勘定科目ID・税区分の初期値は未固定）
5. freee備考に内訳・写真フォルダURLを記載
6. welfare_balance を fixed に更新
7. freee_exports にログ保存

### freee備考テンプレ
```
【仕出し弁当 月次まとめ】
社員: {{employee_name}}
対象月: {{year_month}}
補助合計: {{amount}}円
件数: {{count}}件
写真: {{photo_folder_url}}
※ 非課税可否は経理確認
```

### 冪等性（重要）
- `export_batch_id` を導入し、同一バッチの **二重実行を防止**する
- 既に `freee_exports` に `export_batch_id` が存在する場合は処理を中断（または差分再計算）
- 途中失敗は `status=error` とし、再実行可能にする

### 将来対応（ロードマップ）
- **手動トリガー + 毎月自動（Cron）** を併用できるように拡張する
- Cronは最初は「未実行通知」用途に留め、運用が固まったら自動実行も選択可能にする

---

## 8. 会計・税務上の考え方

- システムは **非課税／給与課税を確定しない**
- freeeには **下書き**として登録し、経理が科目・税区分を判断する
- 技術検証で「福利厚生費として登録」できる手順が確定した場合は、環境変数等で勘定科目IDを指定できるようにする（MVPは未固定）
- 経理が以下を判断
  - 問題なければ承認
  - 必要に応じて給与課税へ科目変更

---

## 9. n8n版との違い（整理）

| 項目 | SaaS版 | n8n版 |
|---|---|---|
| UI | 独自UI | Googleフォーム |
| 認証 | QR＋端末 | メール |
| DB | 自前DB | n8n Data tables |
| 拡張性 | 高い | 低い |

---

## 10. 本設計の価値まとめ

- 現場：操作が最小
- 経理：月1回の確認だけ
- 税務：説明可能な証跡
- SaaS：横展開・商品化可能

**「思想はn8n版と同じ、実装がSaaS」**

これが本設計のコアである。



---

## 11. 技術スタック詳細（SaaS版：Vercel / MongoDB / Next.js）

本章では、SaaS版を **Next.js（App Router）+ Vercel + MongoDB Atlas** で実装する際の、構成・責務分割・運用設計を定義する。

---

### 11.1 採用技術と採用理由

#### フロントエンド / BFF
- **Next.js 15（App Router）**
  - 画面（職人UI/管理UI）とAPI（Route Handlers）を同居でき、SaaSの初期実装が速い
  - Server Actions / Route Handlersで「フォーム送信→DB保存→ストレージ→判定」までを一気通貫で実装可能

#### 認証
- **NextAuth.js 4.x**
  - 管理者（経理/設定担当）向けのログインを安全に実装
  - 職人UIは「ログインレス（端末ペアリング）」が前提のため、NextAuthは管理画面中心で利用

#### DB
- **MongoDB Atlas + Mongoose**
  - 申請ログ（lunch_entries）の書き込みが多い設計と相性が良い
  - 柔軟なスキーマ拡張（現場属性追加、監査属性追加）に強い

#### 言語・UI
- **TypeScript / Tailwind CSS**
  - 型で品質担保しつつ開発速度を落とさない
  - UIを素早く構築し、ハッカソン〜SaaS化まで一貫

#### ホスティング
- **Vercel**
  - Next.jsとの相性が良く、デプロイ運用が最短
  - 将来的に Cron（Vercel Cron / Scheduled Functions）と組み合わせて月次処理の自動実行も選択可能

#### ログ
- **vibe-logger**（参考：fladdict/vibe-logger）
  - 目的：開発中の「何が起きたか」を追える構造化ログ
  - 後述の「監査ログ」「freee連携ログ」と分離して運用

---

### 11.2 アーキテクチャ（責務分割）

SaaS版は次の4層に分ける。

1. **UI層**（職人UI / 管理UI）
2. **API層**（Next.js Route Handlers）
3. **ドメイン層**（判定・集計・freee連携のユースケース）
4. **インフラ層**（MongoDB / ストレージ / Cron / 外部API）

責務の基本方針：
- UIは薄く（入力・表示）
- 判定ロジック（重複/上限/集計）はドメイン層に集約
- freee連携は専用サービスに隔離

---

### 11.3 Vercel上での構成

#### デプロイ単位
- 1リポジトリ（monorepo不要）
- Vercel Project 1つ

#### 環境
- **Production / Preview / Development** の3環境
- freee連携は Production と Staging を分ける（クライアントID/Secretを分離）

#### 環境変数（例）
- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `FREEE_CLIENT_ID`
- `FREEE_CLIENT_SECRET`
- `FREEE_REDIRECT_URI`
- `FREEE_COMPANY_ID`
- `GOOGLE_DRIVE_CLIENT_EMAIL`
- `GOOGLE_DRIVE_PRIVATE_KEY`
- `GOOGLE_DRIVE_FOLDER_ID`
- `LOG_LEVEL`

---

### 11.4 MongoDB設計（コレクション/インデックス）

#### コレクション
- `users`：管理者/アカウント情報
- `devices`：端末ペアリング情報（ログインレス）
- `lunch_entries`：明細ログ（事実の凍結保存）
- `welfare_balances`：社員×月の確定台帳
- `freee_exports`：freee連携ログ（下書き作成/失敗/再送）
- `audit_events`：監査ログ（重要操作のみ）

#### 重要インデックス（例）
- `users.email`（unique）
- `devices.device_secret`（unique）
- `lunch_entries.tenant_id + lunch_entries.user_id + lunch_entries.year_month`
- `lunch_entries.photo_hash`（※「完全一致検知」用途：uniqueにするかは運用により選択）
- `freee_exports.export_batch_id`（unique推奨）

**設計指針**
- 「ユニーク制約」は最小限
- 重複検知は原則「フラグ運用（止めない）」
- ただし「二重バッチ実行」対策は `export_batch_id` と状態遷移で担保

---

### 11.5 NextAuth設計（管理画面向け）

#### 対象
- 管理者（経理/設定担当）のみ
- 職人UIはログイン不要（端末ペアリング/ワンタイムリンク）

#### Provider案
- Google Provider（社内Google Workspace想定）
- Email（Magic Link）

#### 権限
- `role: admin | accountant | viewer`
- APIは `role` でガード（Route Handlers / Server Actions）

---

### 11.6 端末ペアリング（ログインレス）

#### 方針
- 職人にID入力をさせない
- 初回のみQRで端末を登録
 - 以後のログインレス識別は **`device_secret`（HTTP-only Cookie）** を主キーとして行う（結論）

#### データ
- `devices` に `device_secret`（端末に払い出す秘密値）と `employee_id(user_id)` を紐づけ
- `device_secret` は **HTTP-only Cookie** として端末に保持し、以後のログインレス識別に利用する
- `device_fingerprint` は監査・異常検知の参考情報として任意で保存する（認証の主キーにはしない）

#### ペアリングフロー
1. 管理者が社員QRを発行（token付きURL）
2. 職人がアクセス → token検証 → `device_secret` を払い出し `devices` 登録
3. 以後、職人UIは `device_secret` により自動識別

---

### 11.7 将来対応：Cron設計（月次処理の自動実行）

MVPは **管理UIからの手動トリガーのみ** とし、将来的に Cron での自動実行を選択可能にする。

#### 実行方式（将来）
- Vercel Cron → Route Handler（例：`/api/cron/monthly`）
- ただし初期は「未実行通知」用途に留め、運用が固まったら自動実行も許可する

---

### 11.8 freee連携（SaaS版）

#### 連携方針
- アプリ側で「非課税/給与課税」を確定しない
- freeeには **下書き作成**（MVPは勘定科目ID・税区分は未固定）
- 技術検証で「福利厚生費として登録」できる手順が確定したら、環境変数等で勘定科目IDを指定可能にする
- 経理が承認または科目変更（給与課税へ）

#### 備考（メモ）に必ず残す情報
- 対象月
- 件数
- 補助合計
- 写真リンク（ストレージURL/フォルダURL）
- 重複検知件数
- 「最終判断は経理確認」

---

### 11.9 ログ設計（vibe-logger）

ログは3系統に分ける。

1) **アプリログ（vibe-logger）**
- 目的：開発・運用のトラブルシュート
- 出力：構造化（JSON）
- 相関ID：`request_id` / `batch_id` / `user_id`

2) **連携ログ（freee_exports）**
- 目的：会計連携の結果管理（再送・失敗原因）

3) **監査ログ（audit_events）**
- 目的：管理画面の重要操作（上限変更、ユーザー無効化、バッチ手動実行）

**ログに残すべきイベント例**
- `PAIRING_CREATED` / `PAIRING_COMPLETED`
- `ENTRY_CREATED` / `ENTRY_DUPLICATE_DETECTED`
- `MONTHLY_EXPORT_STARTED` / `MONTHLY_EXPORT_COMPLETED` / `MONTHLY_EXPORT_FAILED`
- `FREEE_DRAFT_CREATED` / `FREEE_API_ERROR`

---

### 11.10 今後の拡張（SaaSとしての商品化）

- テナント対応（company_id単位の分離）
- 現場マスタ（site_master）導入：入力揺れ防止
- 権限強化（現場責任者/経理/管理者）
- 画像ストレージの本格運用（S3 + 署名付きURL）
- 集計・承認フローの画面化（freee下書き作成前にアプリ側で承認も可能）

---

## 12. 追加で決めるべき設計事項（TODO）

- ストレージ方針：写真は **Google Drive に固定**（MVP）。将来差し替えたい場合はStorage層を抽象化する
- Cronの導入方針（通知のみ→自動実行も可）と、再実行ルール（冪等性運用）
- freee側の勘定科目ID（福利厚生費）を指定する方法の技術検証（確定後に環境変数化）
- 「3,500円上限」判定の税込/税抜ルールの明文化（運用に合わせる）

---

以上。

