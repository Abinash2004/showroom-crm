import "server-only";
import mongoose from "mongoose";
import { getEnv } from "@/lib/env";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __showroomMongoose: MongooseCache | undefined;
}

const cache: MongooseCache = (globalThis.__showroomMongoose ??= { conn: null, promise: null });

/** Returns the shared connection, reusing it across warm serverless invocations. */
export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    const env = getEnv();
    mongoose.set("strictQuery", true);
    cache.promise = mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB,
      bufferCommands: false,
      // Mongoose creates the schema indexes when each model is first used. createIndex is a no-op once an index
      // exists, so warm instances pay nothing. Required: unique phone/code/token keys and the rate-limit TTL rely on them.
      autoIndex: true,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
    });
  }
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
