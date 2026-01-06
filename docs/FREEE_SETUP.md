# freee連携 設定手順（ハッカソン最小）

このプロジェクトはハッカソン版として **「freeeに取引（支出）の下書き1件を作成できればOK」** という最小構成で実装しています。

## 使う環境変数（最小）

- `FREEE_ACCESS_TOKEN`
- `FREEE_COMPANY_ID`

任意（会計科目や税区分を固定したい場合）：

- `FREEE_ACCOUNT_ITEM_ID`
- `FREEE_TAX_CODE`

> 注意：`Client Secret` や `Access Token` は**秘匿情報**です。`docs/` にベタ書きせず、Vercelの環境変数に入れてください。

## 1) freeeアプリストア側の設定

`docs/経理情報.png` の画面にある設定を前提にします。

- **アプリタイプ**：プライベートアプリ
- **コールバックURL**：`urn:ietf:wg:oauth:2.0:oob`
- **Client ID / Client Secret**：`docs/経理情報.png` の値を使用

## 2) FREEE_ACCESS_TOKEN を取得（最短：画面から手動取得）

ハッカソンではコード交換（OAuthのトークン交換）を実装していないため、**トークンを手動取得**して環境変数に投入します。

1. `docs/経理情報.png` にある **「モバイル・JSアプリ認証用URL」** をブラウザで開く  
   - URL内に `response_type=token` と `prompt=select_company` が入っているもの
2. freeeにログインして、対象の事業所（会社）を選択
3. 画面に表示される **Access Token** をコピー
4. `FREEE_ACCESS_TOKEN` に設定

## （推奨）6時間制限を回避する：refresh_token で自動更新

freeeの `access_token` は短命（目安6時間）です。ハッカソンでも「更新」を避けたい場合は、`refresh_token` を使って自動更新できます。

必要な環境変数：

- `FREEE_CLIENT_ID`
- `FREEE_CLIENT_SECRET`（秘匿情報）
- `FREEE_REDIRECT_URI`（ローカル検証なら `urn:ietf:wg:oauth:2.0:oob`）
- `FREEE_REFRESH_TOKEN`（秘匿情報）

手順（取得）：

1. freeeアプリストア → アプリ管理 → 対象アプリ → 基本情報  
   コールバックURLを `urn:ietf:wg:oauth:2.0:oob` にして保存
2. 同画面の「認証用URL」（`response_type=code`）を開く  
   ログイン→事業所選択→許可→認可コード（code）をコピー
3. 認可コードを token API に交換（例：PowerShell）

```powershell
$clientId = "<Client ID>"
$clientSecret = "<Client Secret>"
$code = "<認可コード>"
$redirectUri = "urn:ietf:wg:oauth:2.0:oob"

Invoke-RestMethod -Method Post `
  -Uri "https://accounts.secure.freee.co.jp/public_api/token" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body @{
    grant_type    = "authorization_code"
    client_id     = $clientId
    client_secret = $clientSecret
    code          = $code
    redirect_uri  = $redirectUri
  }
```

レスポンスの `refresh_token` を `FREEE_REFRESH_TOKEN` に設定してください。  
以後、アプリは `refresh_token` で `access_token` を自動更新できます。

## 3) FREEE_COMPANY_ID（事業所ID）を取得

次のどちらかが最短です。

- **freeeの事業所画面のURL**等に含まれる数値（会社ID）を確認して `FREEE_COMPANY_ID` に設定
- もしくは freee API の `/api/1/companies` を叩いて取得（手元で確認用）

## 4) Vercel へ投入

Vercelのプロジェクト設定 → Environment Variables に以下を追加してください：

- `FREEE_ACCESS_TOKEN`
- `FREEE_COMPANY_ID`
- （任意）`FREEE_ACCOUNT_ITEM_ID`
- （任意）`FREEE_TAX_CODE`

投入後に再デプロイすると反映されます。

## 5) 動作確認（管理画面）

- `/admin/monthly` で「プレビュー」→「手動実行」
- 成功：freeeに下書きが作られ、管理画面にURLが表示されます（設定次第）
- 失敗：**エラー詳細（`error_message`）** が画面に表示されます

## 6) 接続テスト（スモークテスト）

freeeに接続できるかだけ先に確認したい場合は、スクリプトを使えます。

1. `.env.local` に以下を設定
   - `FREEE_ACCESS_TOKEN`（もしくは `FREEE_REFRESH_TOKEN`）
   - `FREEE_COMPANY_ID`
   - （任意）`FREEE_ACCOUNT_ITEM_ID`（設定すると「取引下書き作成」まで実行）
2. 実行

```bash
npm run freee:smoke
```

---

# Google Drive（写真保存）設定（ユーザーOAuth推奨）

サービスアカウントは「マイドライブ」に対して容量（quota）エラーになりやすいため、ハッカソンでは **ユーザーOAuth（refresh_token）方式**を推奨します。

必要な環境変数：

- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `GOOGLE_OAUTH_REFRESH_TOKEN`

## 1) Google Cloud で OAuth クライアントを作成

1. Google Cloud Console でプロジェクト作成
2. 「APIとサービス」→「ライブラリ」→ **Google Drive API** を有効化
3. 「APIとサービス」→「OAuth同意画面」→ 外部/内部を設定（最小でOK）
4. 「APIとサービス」→「認証情報」→ **OAuth クライアントID** を作成
   - 種類：デスクトップアプリ（ローカル検証が最短）
   - 作成後、Client ID / Client Secret を控える

## 2) refresh_token を取得

`.env.local` に `GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI` を入れた上で、下記を実行します：

```bash
npm run drive:oauth
```

表示されたURLをブラウザで開いて許可し、表示される `code` をコピーして、

```bash
npm run drive:oauth -- <CODE>
```

出力された `GOOGLE_OAUTH_REFRESH_TOKEN=...` を `.env.local` に設定してください。

## 3) スモークテスト（Driveに小ファイルをアップロード）

```bash
npm run drive:smoke
```

成功すると `fileId` と `webViewLink` が表示され、指定フォルダにテキストが1件作成されます。



