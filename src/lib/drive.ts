import { google } from "googleapis"
import { Readable } from "node:stream"

import { env } from "@/env"

function normalizePrivateKey(key: string) {
  // GitHub/Vercel env often stores newlines as \n
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key
}

function getDriveClient() {
  const clientEmail = env.GOOGLE_DRIVE_CLIENT_EMAIL
  const privateKey = env.GOOGLE_DRIVE_PRIVATE_KEY

  if (!clientEmail || !privateKey) {
    throw new Error("Google Drive is not configured. Set GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY.")
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: normalizePrivateKey(privateKey),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  })

  return google.drive({ version: "v3", auth })
}

export async function uploadLunchPhotoToDrive(input: {
  filename: string
  mimeType: string
  bytes: Buffer
}): Promise<{ fileId: string; webViewLink: string }> {
  const folderId = env.GOOGLE_DRIVE_FOLDER_ID
  if (!folderId) {
    throw new Error("Google Drive folder is not configured. Set GOOGLE_DRIVE_FOLDER_ID.")
  }

  const drive = getDriveClient()

  const res = await drive.files.create({
    requestBody: {
      name: input.filename,
      parents: [folderId],
    },
    media: {
      mimeType: input.mimeType,
      body: Readable.from(input.bytes),
    },
    fields: "id,webViewLink",
  })

  const fileId = res.data.id
  const webViewLink = res.data.webViewLink
  if (!fileId || !webViewLink) throw new Error("Drive upload failed (missing id/webViewLink).")
  return { fileId, webViewLink }
}


