import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePasswordStrength } from "../features/auth/validation/password-strength.js";

test("password strength stays hidden until the user starts typing", () => {
  assert.equal(evaluatePasswordStrength(""), null);
});

test("short, repeated, sequential and common passwords remain weak", () => {
  for (const password of ["short", "aaaaaaaaaaaa", "Password123!", "Travel1234!"]) {
    assert.equal(evaluatePasswordStrength(password).label, "weak", password);
  }
});

test("long varied passwords progress from good to strong", () => {
  assert.deepEqual(evaluatePasswordStrength("River9!Clouds"), {
    label: "good",
    level: 2,
    message: "You can optionally lengthen it to make it stronger.",
  });
  assert.deepEqual(evaluatePasswordStrength("River9!Clouds-Travel"), {
    label: "strong",
    level: 3,
    message: "Your password looks strong.",
  });
});
