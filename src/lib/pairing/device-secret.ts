import crypto from "node:crypto"

export function generateDeviceSecret(): string {
  // 256-bit random secret, URL-safe
  const buf = crypto.randomBytes(32)
  return buf.toString("base64url")
}

export function hashDeviceSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex")
}


