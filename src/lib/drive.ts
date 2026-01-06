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

  // Preferred (hackathon): OAuth user token (My Drive upload)
  const oauthClientId = env.GOOGLE_OAUTH_CLIENT_ID
  const oauthClientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET
  const oauthRedirectUri = env.GOOGLE_OAUTH_REDIRECT_URI
  const oauthRefreshToken = env.GOOGLE_OAUTH_REFRESH_TOKEN

  if (oauthClientId && oauthClientSecret && oauthRedirectUri && oauthRefreshToken) {
    const auth = new google.auth.OAuth2(oauthClientId, oauthClientSecret, oauthRedirectUri)
    auth.setCredentials({ refresh_token: oauthRefreshToken })
    return google.drive({ version: "v3", auth })
  }

  // Fallback: Service Account (requires Shared Drive due to quota limitations)
  if (!clientEmail || !privateKey) {
    throw new Error(
      "Google Drive is not configured. Set GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI/REFRESH_TOKEN (recommended) or GOOGLE_DRIVE_CLIENT_EMAIL/PRIVATE_KEY (service account).",
    )
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


