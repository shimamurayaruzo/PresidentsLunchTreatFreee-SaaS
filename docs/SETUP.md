# セットアップ（ハッカソン最小）

## 1. 環境変数を用意

`docs/env.example.txt` をコピーして、プロジェクト直下に `.env.local` を作成して貼り付けてください。

最低限必要：
- `MONGODB_URI`（MongoDB Atlas）
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`

職人の写真申請を動かすには追加で：
- `GOOGLE_DRIVE_CLIENT_EMAIL`
- `GOOGLE_DRIVE_PRIVATE_KEY`
- `GOOGLE_DRIVE_FOLDER_ID`

月次でfreeeに「下書き1件」を作るには追加で：
- `FREEE_ACCESS_TOKEN`
- `FREEE_COMPANY_ID`
- （任意）`FREEE_ACCOUNT_ITEM_ID`（福利厚生費など）
- （任意）`FREEE_TAX_CODE`

freee連携の取得手順は `docs/FREEE_SETUP.md` を参照してください。

## 2. 起動

```bash
npm install
npm run dev
```

## 3. 動作確認（最短）

- 管理ログイン（NextAuth）
  - `http://localhost:3000/api/auth/signin`
- QR発行（管理）
  - `http://localhost:3000/admin/pairing`
- ペアリング（職人）
  - 発行されたURLをスマホで開く（`/pairing?token=...`）
- 職人申請
  - `http://localhost:3000/worker`
- 管理：申請一覧/詳細
  - `http://localhost:3000/admin/entries`
- 月次集計（手動）
  - `http://localhost:3000/admin/monthly`


