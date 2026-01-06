import { OptionalUnlessRequiredId } from "mongodb"

import { env } from "@/env"
import { COLLECTIONS } from "@/lib/collections"
import { getDb } from "@/lib/db"
import { logger } from "@/lib/logger"

type FreeeTokenDoc = {
  tenant_id: string
  access_token: string
  refresh_token: string
  expires_at: string // ISO
  updated_at: string // ISO
}

type TokenResponse = {
  access_token: string
  token_type: "bearer" | string
  expires_in: number
  refresh_token?: string
  scope?: string
  created_at?: number
  company_id?: number | string
}

function nowIso() {
  return new Date().toISOString()
}

function addSecondsIso(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString()
}

function isExpiringSoon(expiresAtIso: string, skewSeconds = 120) {
  const t = Date.parse(expiresAtIso)
  if (!Number.isFinite(t)) return true
  return t - Date.now() <= skewSeconds * 1000
}

async function fetchToken(body: Record<string, string>): Promise<TokenResponse | null> {
  const url = "https://accounts.secure.freee.co.jp/public_api/token"
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  })

  const data = (await res.json().catch(() => null)) as unknown
  if (!res.ok) {
    logger.error("freee token endpoint error", { status: res.status, statusText: res.statusText, data })
    return null
  }
  return data as TokenResponse
}

async function getStoredToken(tenantId: string): Promise<FreeeTokenDoc | null> {
  const db = await getDb()
  return await db.collection<FreeeTokenDoc>(COLLECTIONS.freeeTokens).findOne({ tenant_id: tenantId })
}

async function upsertStoredToken(input: {
  tenantId: string
  accessToken: string
  refreshToken: string
  expiresAtIso: string
}) {
  const db = await getDb()
  const doc: OptionalUnlessRequiredId<FreeeTokenDoc> = {
    tenant_id: input.tenantId,
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
    expires_at: input.expiresAtIso,
    updated_at: nowIso(),
  }
  await db.collection<FreeeTokenDoc>(COLLECTIONS.freeeTokens).updateOne(
    { tenant_id: input.tenantId },
    { $set: doc },
    { upsert: true },
  )
}

/**
 * Get a valid freee access token.
 *
 * Priority:
 * 1) DB cached token (if not expiring soon)
 * 2) Refresh using DB refresh_token
 * 3) Bootstrap refresh using env.FREEE_REFRESH_TOKEN (first-time setup)
 *
 * NOTE:
 * - freee access tokens are short-lived; refresh_token rotation must be stored every refresh.
 */
export async function getFreeeAccessToken(input: { tenantId: string }): Promise<string | null> {
  const tenantId = input.tenantId

  // 0) If a fixed access token is set, use it (hackathon quick mode).
  if (env.FREEE_ACCESS_TOKEN) return env.FREEE_ACCESS_TOKEN

  // 1) Load from DB and return if still valid.
  const stored = await getStoredToken(tenantId)
  if (stored && stored.access_token && stored.expires_at && !isExpiringSoon(stored.expires_at)) {
    return stored.access_token
  }

  const clientId = env.FREEE_CLIENT_ID
  const clientSecret = env.FREEE_CLIENT_SECRET
  const redirectUri = env.FREEE_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    logger.warn("freee client credentials not set; cannot refresh token")
    return null
  }

  const refreshToken = stored?.refresh_token ?? env.FREEE_REFRESH_TOKEN
  if (!refreshToken) {
    logger.warn("freee refresh_token not set; cannot refresh token")
    return null
  }

  // 2) Refresh
  const refreshed = await fetchToken({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    redirect_uri: redirectUri,
  })
  if (!refreshed?.access_token || !refreshed.expires_in) return null

  const newRefresh = refreshed.refresh_token ?? refreshToken
  const expiresAt = addSecondsIso(Math.max(1, refreshed.expires_in))

  await upsertStoredToken({
    tenantId,
    accessToken: refreshed.access_token,
    refreshToken: newRefresh,
    expiresAtIso: expiresAt,
  })

  logger.info("freee access token refreshed", { tenantId, expiresAt })
  return refreshed.access_token
}


