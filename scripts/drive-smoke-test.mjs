import fs from "node:fs"
import path from "node:path"
import process from "node:process"

import "dotenv/config"
import dotenv from "dotenv"
import { google } from "googleapis"
import { Readable } from "node:stream"

function tryLoad(file) {
  const p = path.resolve(process.cwd(), file)
  if (!fs.existsSync(p)) return false
  dotenv.config({ path: p, override: false })
  return true
}

tryLoad(".env.local")
tryLoad(".env")

function required(name) {
  const v = process.env[name]
  if (!v || String(v).trim() === "") throw new Error(`Missing env var: ${name}`)
  return String(v).trim()
}

function normalizePrivateKey(key) {
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key
}

async function main() {
  const folderId = required("GOOGLE_DRIVE_FOLDER_ID")

  // Preferred: OAuth user token (My Drive)
  const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID ? String(process.env.GOOGLE_OAUTH_CLIENT_ID).trim() : ""
  const oauthClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET ? String(process.env.GOOGLE_OAUTH_CLIENT_SECRET).trim() : ""
  const oauthRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ? String(process.env.GOOGLE_OAUTH_REDIRECT_URI).trim() : ""
  const oauthRefreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
    ? String(process.env.GOOGLE_OAUTH_REFRESH_TOKEN).trim()
    : ""

  let auth
  if (oauthClientId && oauthClientSecret && oauthRedirectUri && oauthRefreshToken) {
    const oauth2 = new google.auth.OAuth2(oauthClientId, oauthClientSecret, oauthRedirectUri)
    oauth2.setCredentials({ refresh_token: oauthRefreshToken })
    auth = oauth2
  } else {
    // Fallback: Service Account (requires Shared Drive due to quota limitations)
    const clientEmail = required("GOOGLE_DRIVE_CLIENT_EMAIL")
    const privateKey = normalizePrivateKey(required("GOOGLE_DRIVE_PRIVATE_KEY"))
    auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    })
  }

  const drive = google.drive({ version: "v3", auth })

  const filename = `smoke-test-${Date.now()}.txt`
  const content = `drive smoke test ${new Date().toISOString()}\n`

  console.log("[drive smoke] start")
  console.log("[drive smoke] folderId:", folderId)
  console.log("[drive smoke] auth:", oauthClientId ? "oauth" : "service_account")

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType: "text/plain",
      body: Readable.from(Buffer.from(content, "utf8")),
    },
    fields: "id,webViewLink",
  })

  const fileId = res.data.id
  const webViewLink = res.data.webViewLink
  if (!fileId || !webViewLink) throw new Error("Drive upload failed (missing id/webViewLink)")

  console.log("[drive smoke] uploaded:", { fileId, webViewLink })
  console.log("[drive smoke] done")
}

main().catch((err) => {
  // Typical failures:
  // - 403: folder not shared with service account (or wrong folder id)
  // - 401: invalid key / wrong clientEmail
  const msg = err?.message ?? String(err)
  console.error("[drive smoke] failed:", msg)
  process.exitCode = 1
})


