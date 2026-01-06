import type { Db } from "mongodb"

import { clientPromise } from "@/lib/mongodb"

export async function getDb(): Promise<Db> {
  const client = await clientPromise
  return client.db()
}


