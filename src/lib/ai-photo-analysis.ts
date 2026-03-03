import OpenAI from "openai"
import { logger } from "@/lib/logger"
import type { AiValidationResult } from "@/lib/entries/types"

/**
 * AI Photo Validation for lunch/bento photos.
 *
 * Uses OpenAI Vision API to:
 * - Determine if the photo shows a valid meal/bento
 * - Generate a human-readable explanation for accounting staff
 * - Flag suspicious photos automatically
 *
 * This is NOT OCR/amount extraction — workers still enter the amount manually.
 * The AI validates that the submitted photo is genuinely a meal photo,
 * reducing manual review burden on accounting staff.
 */

/** Re-export for convenience */
export type { AiValidationResult } from "@/lib/entries/types"

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    logger.warn("OPENAI_API_KEY is not set; AI photo validation is disabled")
    return null
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  })
}

const VALIDATION_PROMPT = `あなたは福利厚生（食事補助）の経費申請を確認するAIアシスタントです。
従業員が提出した写真を見て、正当な食事補助の申請かどうかを判定してください。

判定結果を以下のJSON形式で返してください（他のテキストは不要）：

{
  "is_valid_meal": true/false,
  "detected_category": "bento" | "restaurant" | "convenience_store" | "drink_only" | "receipt" | "unrelated" | "unclear",
  "reason": "経理担当者向けの判定理由（日本語で2〜3文）",
  "description": "写真に映っているものの簡潔な説明（日本語1文）",
  "flags": ["注意フラグの配列"]
}

## カテゴリの判定基準
- "bento": 弁当・おにぎり・サンドイッチなど持ち帰り食品
- "restaurant": レストラン・食堂・定食屋などでの食事
- "convenience_store": コンビニの食品（袋に入った状態など）
- "drink_only": 飲み物のみ（食事なし）
- "receipt": レシート・領収書の写真（食事そのものが映っていない）
- "unrelated": 食事と無関係な写真（風景、人物、工具など）
- "unclear": 不鮮明・判定困難

## 判定ルール
- is_valid_meal = true: 弁当・食事・コンビニ食品など、食事補助として妥当
- is_valid_meal = false: 食事と無関係、飲み物のみ、不鮮明

## reasonの書き方（重要）
経理担当者が読んで、すぐに判断できるように書いてください：
- 有効な場合: 「コンビニ弁当の写真です。食事補助の申請として問題ありません。」
- 疑わしい場合: 「建設現場の写真のようです。食事が映っていないため、確認が必要です。」
- 飲み物のみ: 「ペットボトルの飲料のみが映っています。食事が含まれていないため、食事補助の対象外の可能性があります。」

## flagsの例
- "飲み物のみ": 食事が映っていない
- "不鮮明": ピンボケ・暗すぎる
- "食事と無関係": 食事以外のものが映っている
- "高級店の可能性": 高級レストランの食事に見える
- "レシートのみ": 食事の写真ではなくレシートのみ

flagsは該当するものがなければ空配列 [] にしてください。`

export async function validatePhoto(base64Image: string, mimeType: string): Promise<AiValidationResult | null> {
  const client = getOpenAIClient()
  if (!client) return null

  try {
    const dataUrl = `data:${mimeType};base64,${base64Image}`

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content: VALIDATION_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "この写真は従業員が食事補助（弁当代）の申請として提出したものです。正当な食事の写真かどうか判定してください。",
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "low",
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      logger.warn("AI photo validation returned empty content")
      return null
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content.trim()
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr) as AiValidationResult

    // Validate and normalize
    const validCategories = ["bento", "restaurant", "convenience_store", "drink_only", "receipt", "unrelated", "unclear"]
    const result: AiValidationResult = {
      is_valid_meal: typeof parsed.is_valid_meal === "boolean" ? parsed.is_valid_meal : false,
      detected_category: validCategories.includes(parsed.detected_category)
        ? parsed.detected_category as AiValidationResult["detected_category"]
        : "unclear",
      reason: typeof parsed.reason === "string" && parsed.reason.length > 0
        ? parsed.reason
        : "判定できませんでした。経理担当者による確認をお願いします。",
      description: typeof parsed.description === "string" && parsed.description.length > 0
        ? parsed.description
        : "内容不明",
      flags: Array.isArray(parsed.flags) ? parsed.flags.filter((f) => typeof f === "string") : [],
    }

    logger.info("AI photo validation completed", {
      is_valid_meal: result.is_valid_meal,
      detected_category: result.detected_category,
      flags_count: result.flags.length,
    })

    return result
  } catch (e) {
    logger.error("AI photo validation failed", { err: e })
    return null
  }
}
