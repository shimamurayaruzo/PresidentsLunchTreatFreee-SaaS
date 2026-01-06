import { z } from "zod"

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Auth
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),

  // DB
  MONGODB_URI: z.string().min(1),

  // SaaS / Tenant
  DEFAULT_TENANT_ID: z.string().min(1).default("dev"),

  // Business rules (MVP defaults)
  SUBSIDY_UNIT_YEN: z.coerce.number().int().min(0).default(150),
  MONTHLY_LIMIT_YEN: z.coerce.number().int().min(0).default(3500),

  // Admin Credentials (hackathon bootstrap)
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),

  // Dev-only Credentials (backward compatibility)
  DEV_ADMIN_EMAIL: z.string().email().optional(),
  DEV_ADMIN_PASSWORD: z.string().min(8).optional(),

  // Google Drive (photo storage)
  GOOGLE_DRIVE_CLIENT_EMAIL: z.string().min(1).optional(),
  GOOGLE_DRIVE_PRIVATE_KEY: z.string().min(1).optional(),
  GOOGLE_DRIVE_FOLDER_ID: z.string().min(1).optional(),

  // freee
  FREEE_ACCESS_TOKEN: z.string().min(1).optional(),
  FREEE_REFRESH_TOKEN: z.string().min(1).optional(),
  FREEE_CLIENT_ID: z.string().min(1).optional(),
  FREEE_CLIENT_SECRET: z.string().min(1).optional(),
  FREEE_REDIRECT_URI: z.string().url().optional(),
  FREEE_COMPANY_ID: z.string().min(1).optional(),
  FREEE_ACCOUNT_ITEM_ID: z.string().min(1).optional(),
  FREEE_TAX_CODE: z.coerce.number().int().optional(),
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


