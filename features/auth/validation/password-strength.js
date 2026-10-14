const COMMON_PATTERNS = [
  "password",
  "qwerty",
  "letmein",
  "welcome",
  "admin",
  "login",
  "volymoly",
];

const SEQUENCES = [
  "abcdefghijklmnopqrstuvwxyz",
  "0123456789",
];

function normalizedPassword(password) {
  return password.toLowerCase().replaceAll("@", "a").replaceAll("$", "s")
    .replaceAll("0", "o").replaceAll("1", "i").replaceAll("3", "e");
}

function hasSequence(password) {
  const lowered = password.toLowerCase();

  return SEQUENCES.some((sequence) => {
    const reverse = [...sequence].reverse().join("");

    for (let length = 4; length <= sequence.length; length += 1) {
      for (let index = 0; index <= sequence.length - length; index += 1) {
        const part = sequence.slice(index, index + length);
        const reversedPart = reverse.slice(index, index + length);
        if (lowered.includes(part) || lowered.includes(reversedPart)) {
          return true;
        }
      }
    }

    return false;
  });
}

function characterClassCount(password) {
  return [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9\s]/]
    .filter((pattern) => pattern.test(password)).length;
}

export function evaluatePasswordStrength(password) {
  if (!password) return null;

  const normalized = normalizedPassword(password);
  const classes = characterClassCount(password);
  const uniqueCharacters = new Set(password).size;
  const predictable = COMMON_PATTERNS.some((pattern) => normalized.includes(pattern))
    || /^(.)\1+$/.test(password)
    || /^(.{1,4})\1+$/.test(password)
    || hasSequence(password);

  const strong = !predictable
    && uniqueCharacters >= 8
    && ((password.length >= 16 && classes >= 3) || password.length >= 20);
  if (strong) {
    return {
      label: "strong",
      level: 3,
      message: "Your password looks strong.",
    };
  }

  const good = !predictable
    && uniqueCharacters >= 6
    && (
      (password.length >= 12 && classes >= 2)
      || (password.length >= 10 && classes >= 3)
      || password.length >= 16
    );
  if (good) {
    return {
      label: "good",
      level: 2,
      message: "You can optionally lengthen it to make it stronger.",
    };
  }

  return {
    label: "weak",
    level: 1,
    message: "Try lengthening it or adding numbers or symbols.",
  };
}
