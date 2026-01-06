type LogLevel = "info" | "warn" | "error"

export type LogFields = Record<string, unknown>

type ErrorLike = {
  name?: unknown
  message?: unknown
  stack?: unknown
  cause?: unknown
  code?: unknown
} & Record<string, unknown>

const DEFAULT_REDACT_KEYS = new Set([
  "password",
  "pass",
  "token",
  "access_token",
  "refresh_token",
  "secret",
  "client_secret",
  "authorization",
  "cookie",
  "set-cookie",
  "private_key",
  "key",
])

function runtime() {
  return typeof window === "undefined" ? "server" : "client"
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function serializeError(err: unknown, depth = 0): Record<string, unknown> {
  if (depth > 3) return { message: "[Error: nested cause truncated]" }

  if (err instanceof Error) {
    const cause =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (err as any).cause !== undefined ? serializeError((err as any).cause, depth + 1) : undefined

    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...(cause ? { cause } : {}),
    }
  }

  if (isPlainObject(err)) {
    const e = err as ErrorLike
    const cause = e.cause !== undefined ? serializeError(e.cause, depth + 1) : undefined
    return {
      ...(e.name !== undefined ? { name: String(e.name) } : {}),
      ...(e.message !== undefined ? { message: String(e.message) } : {}),
      ...(e.stack !== undefined ? { stack: String(e.stack) } : {}),
      ...(e.code !== undefined ? { code: e.code } : {}),
      ...(cause ? { cause } : {}),
      ...e,
    }
  }

  return { message: String(err) }
}

function sanitizeValue(value: unknown): unknown {
  if (value instanceof Error) return serializeError(value)
  if (value instanceof Date) return value.toISOString()

  if (typeof value === "bigint") return value.toString()
  if (typeof value === "function") return `[Function ${(value as Function).name || "anonymous"}]`
  if (typeof value === "symbol") return value.toString()

  if (value instanceof Map) return Array.from(value.entries())
  if (value instanceof Set) return Array.from(value.values())

  if (Array.isArray(value)) return value.map(sanitizeValue)

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeValue(v)
    return out
  }

  return value
}

function redactKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactKeys)

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      if (DEFAULT_REDACT_KEYS.has(k.toLowerCase())) {
        out[k] = "[REDACTED]"
      } else {
        out[k] = redactKeys(v)
      }
    }
    return out
  }

  return value
}

function safeJsonStringify(obj: unknown): string {
  const seen = new WeakSet<object>()
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]"
      seen.add(value)
    }
    if (typeof value === "bigint") return value.toString()
    return value
  })
}

function emit(level: LogLevel, message: string, fields?: LogFields) {
  const base = {
    ts: new Date().toISOString(),
    level,
    runtime: runtime(),
    msg: message,
  }

  const payload = fields ? (redactKeys(sanitizeValue(fields)) as LogFields) : undefined
  const line = safeJsonStringify(payload ? { ...base, ...payload } : base)

  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.info(line)
}

/**
 * VibeLogger-style structured logger.
 *
 * Usage:
 *   import { logger } from "@/lib/logger"
 *   logger.info("entry created", { entryId, tenantId, userId })
 *   logger.error("freee draft create failed", { err, tenantId, exportBatchId })
 */
export const logger = {
  info(message: string, fields?: LogFields) {
    emit("info", message, fields)
  },
  warn(message: string, fields?: LogFields) {
    emit("warn", message, fields)
  },
  error(message: string, fields?: LogFields) {
    emit("error", message, fields)
  },
}

export const info = logger.info
export const warn = logger.warn
export const error = logger.error


