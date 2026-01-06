import { MongoClient } from "mongodb"

import { env } from "@/env"

declare global {
  var __mongoClientPromise: Promise<MongoClient> | undefined
}

const uri = env.MONGODB_URI

let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  if (!global.__mongoClientPromise) {
    const client = new MongoClient(uri)
    global.__mongoClientPromise = client.connect()
  }
  clientPromise = global.__mongoClientPromise
} else {
  const client = new MongoClient(uri)
  clientPromise = client.connect()
}

export { clientPromise }


