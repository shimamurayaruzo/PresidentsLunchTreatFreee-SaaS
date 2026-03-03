import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { hashDeviceSecret } from "@/lib/pairing/device-secret"
import { findEmployeeByDeviceSecretHash } from "@/lib/entries/repo"
import { validatePhoto } from "@/lib/ai-photo-analysis"
import { logger } from "@/lib/logger"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: Request) {
  // Authenticate worker
  const cookieStore = await cookies()
  const secret = cookieStore.get("device_secret")?.value
  if (!secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const secretHash = hashDeviceSecret(secret)
  const ctx = await findEmployeeByDeviceSecretHash({ secretHash })
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const photo = formData.get("photo")

    if (!(photo instanceof File) || !photo.type.startsWith("image/")) {
      return NextResponse.json({ error: "invalid_photo" }, { status: 400 })
    }

    if (photo.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "file_too_large" }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "ai_not_configured", message: "AI判定機能は未設定です" }, { status: 503 })
    }

    const bytes = Buffer.from(await photo.arrayBuffer())
    const base64 = bytes.toString("base64")

    const result = await validatePhoto(base64, photo.type)

    if (!result) {
      return NextResponse.json({ error: "validation_failed", message: "写真の判定に失敗しました" }, { status: 500 })
    }

    logger.info("photo validation API completed", {
      tenant_id: ctx.tenantId,
      employee_id: ctx.employeeId.toString(),
      is_valid_meal: result.is_valid_meal,
      detected_category: result.detected_category,
    })

    return NextResponse.json({ validation: result })
  } catch (e) {
    logger.error("photo validation API error", { err: e })
    return NextResponse.json({ error: "internal_error" }, { status: 500 })
  }
}
