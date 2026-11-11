import { test } from "node:test";
import assert from "node:assert";
import { storageEnv, storageConfigProblem, storageBucket } from "../lib/storage.js";

/* A hosted dashboard stores the value it was given, while .env parsing
 * trims and unquotes. That difference is not academic: a trailing newline
 * left on AWS_ACCESS_KEY_ID is signed into the Authorization header, which
 * HTTP forbids, so the SDK fails with
 *
 *   TypeError: Invalid character in header content ["authorization"]
 *
 * and no HTTP status - a message that never mentions storage. These tests
 * pin the sanitising that makes one value work in both places. */

const NL = String.fromCharCode(10);
const QUOTE = String.fromCharCode(34);
const KEY = "cbd7e40600000000000000000000000a";

const good = () => ({
  STORAGE_ENDPOINT: "https://ref.storage.supabase.co/storage/v1/s3",
  AWS_REGION: "ap-southeast-2",
  AWS_BUCKET_NAME: "gems",
  AWS_ACCESS_KEY_ID: KEY,
  AWS_SECRET_ACCESS_KEY: "s".repeat(64),
});

test("a value with a trailing newline is read as the value without it", () => {
  /* The exact production failure: 33 characters where 32 were expected. */
  const env = good();
  env.AWS_ACCESS_KEY_ID = KEY + NL;
  assert.equal(storageEnv("AWS_ACCESS_KEY_ID", env), KEY);
  assert.equal(storageEnv("AWS_ACCESS_KEY_ID", env).length, 32);
  assert.equal(storageConfigProblem(env), null, "a trailing newline must not block startup");
});

test("a trailing carriage return and space are stripped too", () => {
  const env = good();
  env.AWS_ACCESS_KEY_ID = KEY + String.fromCharCode(13) + "  ";
  assert.equal(storageEnv("AWS_ACCESS_KEY_ID", env), KEY);
});

test("a value wrapped in quotes is unquoted, as .env parsing would", () => {
  const env = good();
  env.AWS_BUCKET_NAME = QUOTE + "gems" + QUOTE;
  assert.equal(storageBucket(env), "gems");
  assert.equal(storageConfigProblem(env), null);
});

test("an interior newline is reported by variable name", () => {
  /* Trimming cannot help here, so the failure has to be named rather than
     left to reappear as a TypeError at request time. */
  const env = good();
  env.AWS_ACCESS_KEY_ID = "cbd7" + NL + "e406";
  assert.match(storageConfigProblem(env), /AWS_ACCESS_KEY_ID.*line break/i);
});

test("each required variable is named when it is missing", () => {
  for (const name of ["STORAGE_ENDPOINT", "AWS_REGION", "AWS_BUCKET_NAME", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]) {
    const env = good();
    delete env[name];
    assert.match(storageConfigProblem(env), new RegExp(name), `${name} must be named`);
  }
});

test("an endpoint without a scheme is rejected", () => {
  const env = good();
  env.STORAGE_ENDPOINT = "ref.storage.supabase.co/storage/v1/s3";
  assert.match(storageConfigProblem(env), /STORAGE_ENDPOINT/);
});

test("the documented five variables are the ones checked", () => {
  assert.equal(storageConfigProblem(good()), null, "a complete config must be accepted");
});