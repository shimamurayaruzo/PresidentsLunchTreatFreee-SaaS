import { z } from "zod"

/**
 * Helper: treat empty strings as undefined.
 * Environment variables on Vercel/hosting platforms can be set to ""
 * which should be treated the same as "not set".
 */
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v : undefined))

const optionalUrl = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined))
  .pipe(z.string().url().optional())

const optionalEmail = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined))
  .pipe(z.string().email().optional())

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Auth
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: optionalUrl,

  // DB
  MONGODB_URI: z.string().min(1),

  // SaaS / Tenant
  DEFAULT_TENANT_ID: z.string().min(1).default("dev"),

  // Business rules (MVP defaults)
  SUBSIDY_UNIT_YEN: z.coerce.number().int().min(0).default(150),
  MONTHLY_LIMIT_YEN: z.coerce.number().int().min(0).default(3500),

  // Admin Credentials (hackathon bootstrap)
  ADMIN_EMAIL: optionalEmail,
  ADMIN_PASSWORD: optionalString,

  // Dev-only Credentials (backward compatibility)
  DEV_ADMIN_EMAIL: optionalEmail,
  DEV_ADMIN_PASSWORD: optionalString,

  // Google Drive (photo storage)
  GOOGLE_DRIVE_CLIENT_EMAIL: optionalString,
  GOOGLE_DRIVE_PRIVATE_KEY: optionalString,
  GOOGLE_DRIVE_FOLDER_ID: optionalString,
  // Google OAuth (for My Drive upload; avoids Service Account quota issue)
  GOOGLE_OAUTH_CLIENT_ID: optionalString,
  GOOGLE_OAUTH_CLIENT_SECRET: optionalString,
  GOOGLE_OAUTH_REDIRECT_URI: optionalString,
  GOOGLE_OAUTH_REFRESH_TOKEN: optionalString,

  // freee
  FREEE_ACCESS_TOKEN: optionalString,
  FREEE_REFRESH_TOKEN: optionalString,
  FREEE_CLIENT_ID: optionalString,
  FREEE_CLIENT_SECRET: optionalString,
  FREEE_REDIRECT_URI: optionalUrl,
  FREEE_COMPANY_ID: optionalString,
  FREEE_ACCOUNT_ITEM_ID: optionalString,
  FREEE_TAX_CODE: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined))
    .pipe(z.coerce.number().int().optional()),

  // OpenAI (AI photo analysis)
  OPENAI_API_KEY: optionalString,
  OPENAI_BASE_URL: optionalUrl,
  OPENAI_MODEL: optionalString,
})

function formatZodError(err: z.ZodError): string {
  return err.issues
    .map((i) => {
      const path = i.path.join(".") || "(root)"
      return `${path}: ${i.message}`
    })
    .join("\n")
}

function loadServerEnv() {
  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${formatZodError(parsed.error)}`)
  }
  return parsed.data
}

export const env = loadServerEnv()
