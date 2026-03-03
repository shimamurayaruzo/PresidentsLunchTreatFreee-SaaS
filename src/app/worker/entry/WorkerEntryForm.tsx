"use client"

import { useState, useRef, useCallback } from "react"

type AiValidation = {
  is_valid_meal: boolean
  detected_category: string
  reason: string
  description: string
  flags: string[]
}

type Props = {
  defaultDate: string
  submitAction: (formData: FormData) => Promise<void>
}

const categoryLabel: Record<string, string> = {
  bento: "弁当",
  restaurant: "外食",
  convenience_store: "コンビニ",
  drink_only: "飲み物のみ",
  receipt: "レシート",
  unrelated: "食事以外",
  unclear: "不明",
}

const MAX_DIMENSION = 1280
const JPEG_QUALITY = 0.8

function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) { resolve(file); return }
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          const compressed = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
            type: "image/jpeg",
            lastModified: file.lastModified,
          })
          resolve(compressed)
        },
        "image/jpeg",
        JPEG_QUALITY,
      )
    }
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(file)
  })
}

export function WorkerEntryForm({ defaultDate, submitAction }: Props) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [validation, setValidation] = useState<AiValidation | null>(null)
  const [aiUnavailable, setAiUnavailable] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const compressedFileRef = useRef<File | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) {
      setPhotoPreview(null)
      setValidation(null)
      setAiUnavailable(false)
      compressedFileRef.current = null
      return
    }

    let compressed: File
    try {
      compressed = await compressImage(file)
    } catch {
      compressed = file
    }
    compressedFileRef.current = compressed

    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(compressed)

    setAnalyzing(true)
    setValidation(null)
    setAiUnavailable(false)

    try {
      const formData = new FormData()
      formData.append("photo", compressed)

      const res = await fetch("/api/worker/analyze-photo", {
        method: "POST",
        body: formData,
      })

      if (res.status === 503) {
        setAiUnavailable(true)
        setAnalyzing(false)
        return
      }

      if (!res.ok) {
        setAiUnavailable(true)
        setAnalyzing(false)
        return
      }

      const data = (await res.json()) as { validation: AiValidation }
      setValidation(data.validation)
    } catch {
      setAiUnavailable(true)
    } finally {
      setAnalyzing(false)
    }
  }, [])

  const handleSubmit = async (formData: FormData) => {
    setSubmitting(true)
    if (validation) {
      formData.set("aiValidation", JSON.stringify(validation))
    }
    if (compressedFileRef.current) {
      formData.set("photo", compressedFileRef.current)
    }
    await submitAction(formData)
  }

  return (
    <form action={handleSubmit} className="mt-6 grid gap-4 rounded-md border p-4">
      {/* Photo upload — top of form for "photo first" workflow */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">
          写真（弁当・食事）
          <span className="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-normal text-blue-700">AI判定</span>
        </label>
        <p className="text-xs text-muted-foreground">
          写真を撮ると、AIが食事の写真かどうかを自動判定します
        </p>
        <input
          ref={fileInputRef}
          type="file"
          name="photo"
          accept="image/*"
          className="w-full text-sm"
          onChange={handlePhotoChange}
        />
      </div>

      {/* Photo preview */}
      {photoPreview && (
        <div className="overflow-hidden rounded-md border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoPreview} alt="写真プレビュー" className="w-full max-h-64 object-contain bg-muted/20" />
        </div>
      )}

      {/* AI validation: loading */}
      {analyzing && (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm text-blue-700">AIが写真を判定中...</span>
        </div>
      )}

      {/* AI validation: result — valid */}
      {validation && validation.is_valid_meal && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">&#10003;</span>
            <span className="text-sm font-medium text-emerald-800">食事の写真と判定されました</span>
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">
              {categoryLabel[validation.detected_category] ?? validation.detected_category}
            </span>
          </div>
          <p className="mt-1 text-sm text-emerald-700">{validation.reason}</p>
          {validation.flags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {validation.flags.map((flag, i) => (
                <span key={i} className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">{flag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI validation: result — invalid */}
      {validation && !validation.is_valid_meal && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">&#9888;</span>
            <span className="text-sm font-medium text-red-800">食事の写真ではない可能性があります</span>
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
              {categoryLabel[validation.detected_category] ?? validation.detected_category}
            </span>
          </div>
          <p className="mt-1 text-sm text-red-700">{validation.reason}</p>
          {validation.flags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {validation.flags.map((flag, i) => (
                <span key={i} className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600">{flag}</span>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-red-500">
            このまま申請できますが、経理担当者の確認が必要になります。
          </p>
        </div>
      )}

      {/* AI unavailable (silent) */}
      {aiUnavailable && photoPreview && (
        <p className="text-xs text-muted-foreground">AI判定は利用できません。手動で確認されます。</p>
      )}

      {/* Form fields */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">利用日</label>
        <input
          type="date"
          name="entryDate"
          defaultValue={defaultDate}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          required
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">現場名</label>
        <input
          name="siteName"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="例）新宿ビル現場"
          required
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">弁当代（実費）</label>
        <input
          name="totalAmount"
          inputMode="numeric"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="例）600"
          required
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">備考（任意）</label>
        <textarea
          name="note"
          className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="任意"
        />
      </div>

      <button
        type="submit"
        disabled={analyzing || submitting}
        className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {submitting ? "送信中..." : analyzing ? "AI判定中..." : "申請する"}
      </button>
    </form>
  )
}
