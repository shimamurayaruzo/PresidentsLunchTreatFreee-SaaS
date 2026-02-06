import fs from "node:fs"
import path from "node:path"
import process from "node:process"

import "dotenv/config"
import dotenv from "dotenv"
import { google } from "googleapis"

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

async function main() {
  const clientId = required("GOOGLE_OAUTH_CLIENT_ID")
  const clientSecret = required("GOOGLE_OAUTH_CLIENT_SECRET")
  const redirectUri = required("GOOGLE_OAUTH_REDIRECT_URI")

  const code = process.argv[2] ? String(process.argv[2]).trim() : ""

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  if (!code) {
    const url = oauth2.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/drive.file"],
    })
    console.log("[drive oauth] Open this URL in your browser, then copy the code:")
    console.log(url)
    console.log("")
    console.log("Then run:")
    console.log("  node scripts/drive-oauth-setup.mjs <CODE>")
    return
  }

  const { tokens } = await oauth2.getToken(code)
  if (!tokens.refresh_token) {
    console.log("[drive oauth] ERROR: refresh_token was not returned.")
    console.log("[drive oauth] Try again with prompt=consent and ensure it's the first consent for this client/app.")
    process.exitCode = 1
    return
  }

  console.log("[drive oauth] OK. Set this to your env:")
  console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`)
}

main().catch((err) => {
  console.error("[drive oauth] failed:", err?.message ?? String(err))
  process.exitCode = 1
})






