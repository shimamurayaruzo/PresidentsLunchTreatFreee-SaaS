import { env } from "@/env"
import { logger } from "@/lib/logger"
import { getFreeeAccessToken } from "@/lib/freee-token"

const FREEE_API_BASE = "https://api.freee.co.jp"

type FreeeError = {
  status: number
  body: unknown
}

async function freeeFetch(input: { tenantId: string; path: string; init?: RequestInit }) {
  const token = await getFreeeAccessToken({ tenantId: input.tenantId })
  if (!token) throw new Error("freee access token is not available")

  const res = await fetch(`${FREEE_API_BASE}${input.path}`, {
    ...(input.init ?? {}),
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(input.init?.headers ?? {}),
    },
    cache: "no-store",
  })

  const text = await res.text()
  const body = text ? (JSON.parse(text) as unknown) : null
  if (!res.ok) {
    const err: FreeeError = { status: res.status, body }
    logger.error("freee api error", { path: input.path, status: res.status, body })
    throw Object.assign(new Error(`freee api error: ${res.status}`), { freee: err })
  }
  return body
}

export async function listAccountItems(input: { tenantId: string; companyId: number }) {
  return await freeeFetch({ tenantId: input.tenantId, path: `/api/1/account_items?company_id=${input.companyId}` })
}

/**
 * Create one draft expense deal (minimal) for hackathon.
 * Note: freee API required fields can vary by company settings; we try minimal+optional account item & tax code.
 */
export async function createDraftDeal(input: {
  tenantId: string
  companyId: number
  issueDate: string // YYYY-MM-DD
  amount: number
  description: string
}) {
  const accountItemId = env.FREEE_ACCOUNT_ITEM_ID ? Number(env.FREEE_ACCOUNT_ITEM_ID) : undefined
  const taxCode = env.FREEE_TAX_CODE

  // Best-effort: if accountItemId is not provided, try to find one named like 福利厚生
  let chosenAccountItemId = accountItemId
  if (!chosenAccountItemId) {
    try {
      const data = (await listAccountItems({
        tenantId: input.tenantId,
        companyId: input.companyId,
      })) as { account_items?: Array<{ id: number; name: string }> }
      const items = data?.account_items ?? []
      const hit = items.find((x) => x.name?.includes("福利厚生")) ?? items[0]
      if (hit?.id) chosenAccountItemId = hit.id
    } catch {
      // ignore; we'll try without it
    }
  }

  const detail: Record<string, unknown> = {
    amount: input.amount,
    description: input.description,
  }
  if (chosenAccountItemId) detail.account_item_id = chosenAccountItemId
  if (taxCode !== undefined) detail.tax_code = taxCode

  const payload = {
    company_id: input.companyId,
    issue_date: input.issueDate,
    type: "expense",
    details: [detail],
  }

  return await freeeFetch({
    tenantId: input.tenantId,
    path: "/api/1/deals",
    init: {
      method: "POST",
      body: JSON.stringify(payload),
    },
  })
}


