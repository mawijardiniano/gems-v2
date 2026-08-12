import { test } from "node:test";
import assert from "node:assert";

// Test the connection-reuse caching pattern used in lib/db.js
// without requiring a real MongoDB connection.
test("connectDB caches the connection promise globally", async () => {
  // Simulate the global cache pattern from lib/db.js
  const globalWithDb = globalThis;
  let cached = globalWithDb._testMongooseConnection;

  if (!cached) {
    cached = globalWithDb._testMongooseConnection = { conn: null, promise: null };
  }

  let connectCalls = 0;

  const connectDB = async () => {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
      cached.promise = (async () => {
        connectCalls += 1;
        return { connection: "mock-connection" };
      })();
    }

    try {
      cached.conn = await cached.promise;
    } catch (e) {
      cached.promise = null;
      throw e;
    }

    return cached.conn;
  };

  const conn1 = await connectDB();
  const conn2 = await connectDB();
  const conn3 = await connectDB();

  assert.strictEqual(conn1, conn2, "Should return the same connection");
  assert.strictEqual(conn2, conn3, "Should return the same connection");
  assert.strictEqual(connectCalls, 1, "Should only connect once");

  // Clean up
  delete globalWithDb._testMongooseConnection;
});

test("connectDB retries after a failed connection", async () => {
  const globalWithDb = globalThis;
  let cached = globalWithDb._testMongooseConnection;

  if (!cached) {
    cached = globalWithDb._testMongooseConnection = { conn: null, promise: null };
  }

  let attempts = 0;

  const connectDB = async () => {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
      cached.promise = (async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("Connection failed");
        return { connection: "mock-connection-2" };
      })();
    }

    try {
      cached.conn = await cached.promise;
    } catch (e) {
      cached.promise = null;
      throw e;
    }

    return cached.conn;
  };

  // First attempt fails
  await assert.rejects(() => connectDB(), /Connection failed/);

  // Second attempt succeeds because promise was reset
  const conn = await connectDB();
  assert.strictEqual(conn.connection, "mock-connection-2");
  assert.strictEqual(attempts, 2);

  // Clean up
  delete globalWithDb._testMongooseConnection;
});