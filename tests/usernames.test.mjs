import { test } from "node:test";
import assert from "node:assert";
import {
  normalizeStudentUsername,
  normalizeEmployeeUsername,
  normalizeUsernameByStatus,
  isEmailUsername,
  looksLikeStudentId,
  resolveUsernameKind,
} from "../lib/usernames.js";

test("students: lowercase IDs uppercased", () => {
  assert.strictEqual(normalizeStudentUsername("24b0128"), "24B0128");
  assert.strictEqual(normalizeStudentUsername("26b11907"), "26B11907");
  assert.strictEqual(normalizeStudentUsername("  24b0128  "), "24B0128");
});

test("students: dash kept in IDs", () => {
  assert.strictEqual(normalizeStudentUsername("2024-00001"), "2024-00001");
  assert.strictEqual(normalizeStudentUsername("24B0128"), "24B0128");
});

test("employees: strip - _ . space, keep case", () => {
  assert.strictEqual(
    normalizeEmployeeUsername("DeLuna-MalinaoEunice"),
    "DeLunaMalinaoEunice",
  );
  assert.strictEqual(
    normalizeEmployeeUsername("Eunice.DeLuna-Malinao"),
    "EuniceDeLunaMalinao",
  );
  assert.strictEqual(normalizeEmployeeUsername("Maria_Cruz"), "MariaCruz");
  assert.strictEqual(normalizeEmployeeUsername("Juan Dela Cruz"), "JuanDelaCruz");
  assert.strictEqual(
    normalizeEmployeeUsername("Juan.Dela_Cruz- Reyes"),
    "JuanDelaCruzReyes",
  );
});

test("dispatcher: email untouched, student upper, other strip", () => {
  assert.strictEqual(
    normalizeUsernameByStatus("juan.delacruz@example.com", "Employee"),
    "juan.delacruz@example.com",
  );
  assert.strictEqual(normalizeUsernameByStatus("24b0128", "Student"), "24B0128");
  assert.strictEqual(
    normalizeUsernameByStatus("DeLuna-MalinaoEunice", "Employee"),
    "DeLunaMalinaoEunice",
  );
  assert.strictEqual(isEmailUsername("a@b.com"), true);
  assert.strictEqual(isEmailUsername("24B0128"), false);
});

test("UPDATE ALL: ID-like usernames uppercase even without Student status", () => {
  assert.strictEqual(normalizeUsernameByStatus("25b1895", ""), "25B1895");
  assert.strictEqual(normalizeUsernameByStatus("24b0128", ""), "24B0128");
  assert.strictEqual(normalizeUsernameByStatus("24b0128", "Employee"), "24B0128");
  assert.strictEqual(looksLikeStudentId("25b1895"), true);
  assert.strictEqual(looksLikeStudentId("24b0128"), true);
  assert.strictEqual(looksLikeStudentId("DeLuna-MalinaoEunice"), false);
});

test("UPDATE ALL: staff roles use employee strip rule", () => {
  assert.strictEqual(
    normalizeUsernameByStatus("DeLuna-MalinaoEunice", ""),
    "DeLunaMalinaoEunice",
  );
  assert.strictEqual(resolveUsernameKind("DeLuna-MalinaoEunice", ""), "employee");
  assert.strictEqual(resolveUsernameKind("25b1895", ""), "student");
});
