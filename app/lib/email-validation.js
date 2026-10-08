const EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;

export function isValidEmail(value) {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim() || value.length > 254) {
    return false;
  }

  const atIndex = value.lastIndexOf("@");
  if (atIndex <= 0 || atIndex !== value.indexOf("@")) return false;

  const localPart = value.slice(0, atIndex);
  if (localPart.length > 64 || localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) {
    return false;
  }

  return EMAIL_PATTERN.test(value);
}
