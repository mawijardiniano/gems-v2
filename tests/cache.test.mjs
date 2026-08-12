import { test } from "node:test";
import assert from "node:assert";
import {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPrefix,
  cacheFlush,
  cacheOrSet,
} from "../lib/cache.js";

test("cacheSet and cacheGet roundtrip", () => {
  cacheFlush();
  cacheSet("key1", { hello: "world" });
  assert.deepStrictEqual(cacheGet("key1"), { hello: "world" });
});

test("cacheGet returns undefined for missing key", () => {
  cacheFlush();
  assert.strictEqual(cacheGet("missing"), undefined);
});

test("cacheGet returns undefined after TTL expiry", async () => {
  cacheFlush();
  cacheSet("short", "value", 50);
  assert.strictEqual(cacheGet("short"), "value");
  await new Promise((r) => setTimeout(r, 80));
  assert.strictEqual(cacheGet("short"), undefined);
});

test("cacheDel removes a key", () => {
  cacheFlush();
  cacheSet("a", 1);
  cacheDel("a");
  assert.strictEqual(cacheGet("a"), undefined);
});

test("cacheDelPrefix removes keys with matching prefix", () => {
  cacheFlush();
  cacheSet("activity:user1", 1);
  cacheSet("activity:user2", 2);
  cacheSet("other:key", 3);
  cacheDelPrefix("activity:");
  assert.strictEqual(cacheGet("activity:user1"), undefined);
  assert.strictEqual(cacheGet("activity:user2"), undefined);
  assert.strictEqual(cacheGet("other:key"), 3);
});

test("cacheOrSet computes and caches", async () => {
  cacheFlush();
  let calls = 0;
  const fn = async () => {
    calls += 1;
    return { data: calls };
  };

  const first = await cacheOrSet("computed", fn, 1000);
  const second = await cacheOrSet("computed", fn, 1000);

  assert.deepStrictEqual(first, { data: 1 });
  assert.deepStrictEqual(second, { data: 1 });
  assert.strictEqual(calls, 1, "fn should only be called once");
});