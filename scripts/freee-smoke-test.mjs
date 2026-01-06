import fs from "node:fs"
import path from "node:path"
import process from "node:process"

// Load .env.local (preferred) then .env if present. Never commit these files.
import "dotenv/config"
import dotenv from "dotenv"

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

function optionalInt(name) {
  const v = process.env[name]
  if (!v || String(v).trim() === "") return undefined
  const n = Number(String(v).trim())
  return Number.isFinite(n) ? n : undefined
}

function redactToken(t) {
  if (!t) return ""
  if (t.length <= 10) return "[REDACTED]"
  return `${t.slice(0, 4)}...${t.slice(-4)}`
}

async function freeeFetchJson(url, token, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Api-Version": "2020-06-15",
      ...(init.headers ?? {}),
    },
  })

  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }

  return { res, json }
}

function todayYmd() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

async function main() {
  const accessToken = required("FREEE_ACCESS_TOKEN")
  const companyId = Number(required("FREEE_COMPANY_ID"))
  if (!Number.isFinite(companyId)) throw new Error("FREEE_COMPANY_ID must be a number")

  console.log("[freee smoke] start")
  console.log("[freee smoke] token:", redactToken(accessToken))
  console.log("[freee smoke] companyId:", companyId)

  // 1) Basic connectivity: list companies
  {
    const { res, json } = await freeeFetchJson("https://api.freee.co.jp/api/1/companies", accessToken)
    console.log("[freee smoke] GET /companies:", res.status, res.statusText)
    if (!res.ok) {
      console.log("[freee smoke] errorBody:", JSON.stringify(json, null, 2))
      process.exitCode = 1
      return
    }

    const companies = Array.isArray(json?.companies) ? json.companies : []
    const found = companies.find((c) => c?.id === companyId)
    console.log("[freee smoke] companies:", companies.map((c) => ({ id: c?.id, display_name: c?.display_name })))
    if (!found) {
      console.log("[freee smoke] WARNING: companyId not found in /companies response")
    } else {
      console.log("[freee smoke] company found:", { id: found.id, display_name: found.display_name })
    }
  }

  // 2) Optional: create a draft deal (requires account item id)
  const accountItemId = optionalInt("FREEE_ACCOUNT_ITEM_ID")
  const taxCode = optionalInt("FREEE_TAX_CODE")
  if (!accountItemId) {
    console.log("[freee smoke] skip POST /deals (set FREEE_ACCOUNT_ITEM_ID to run draft creation)")
    console.log("[freee smoke] done")
    return
  }

  const payload = {
    company_id: companyId,
    issue_date: todayYmd(),
    type: "expense",
    deal_status: "draft",
    description: "smoke test: presidents-lunch-treat-freee-saas",
    details: [
      {
        account_item_id: accountItemId,
        amount: 1,
        ...(taxCode ? { tax_code: taxCode } : {}),
        description: "smoke test (amount=1)",
      },
    ],
  }

  const { res, json } = await freeeFetchJson("https://api.freee.co.jp/api/1/deals", accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  })
  console.log("[freee smoke] POST /deals:", res.status, res.statusText)
  if (!res.ok) {
    console.log("[freee smoke] errorBody:", JSON.stringify(json, null, 2))
    process.exitCode = 1
    return
  }
  console.log("[freee smoke] created draft:", { dealId: json?.deal?.id })
  console.log("[freee smoke] done")
}

main().catch((err) => {
  console.error("[freee smoke] failed:", err?.message ?? String(err))
  process.exitCode = 1
})


