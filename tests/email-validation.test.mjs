import assert from "node:assert/strict";
import test from "node:test";

import { isValidEmail } from "../features/auth/validation/email.js";

test("email validation follows Laravel's login contract for common addresses", () => {
  for (const email of ["user@example.com", "USER+tag@sub.example.co.in", "a@b", "a@b.c"]) {
    assert.equal(isValidEmail(email), true, email);
  }

  for (const email of [
    "",
    "a@b..com",
    ".user@example.com",
    "user.@example.com",
    "user@exa_mple.com",
    " user@example.com ",
    "user@example.com.",
    "user@@example.com",
  ]) {
    assert.equal(isValidEmail(email), false, email);
  }
});
