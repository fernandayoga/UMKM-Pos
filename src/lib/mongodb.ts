import mongoose from "mongoose";

let MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/umkm_pos";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  mongoServer?: any;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
    };

    cached!.promise = (async () => {
      // If URI is MongoDB Atlas or explicit cloud, connect directly
      if (MONGODB_URI.startsWith("mongodb+srv://")) {
        return await mongoose.connect(MONGODB_URI, opts);
      }

      // If local, check if local mongod is accessible
      try {
        const localOpts = { ...opts, serverSelectionTimeoutMS: 1500 };
        return await mongoose.connect(MONGODB_URI, localOpts);
      } catch {
        // Fallback to MongoMemoryServer for standalone development without local mongod daemon
        console.log("[MongoDB] Local mongod daemon tidak aktif, menginisialisasi MongoMemoryServer...");
        try {
          const { MongoMemoryServer } = await import("mongodb-memory-server");
          if (!cached!.mongoServer) {
            cached!.mongoServer = await MongoMemoryServer.create({
              instance: { dbName: "umkm_pos" },
            });
          }
          const memoryUri = cached!.mongoServer.getUri();
          console.log(`[MongoDB] MongoMemoryServer aktif di ${memoryUri}`);
          return await mongoose.connect(memoryUri, opts);
        } catch (memErr) {
          console.error("[MongoDB] Gagal menginisialisasi MongoMemoryServer:", memErr);
          throw new Error("Gagal menghubungkan ke MongoDB. Pastikan MONGODB_URI valid.");
        }
      }
    })();
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}
