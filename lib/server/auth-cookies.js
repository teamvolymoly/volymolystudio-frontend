const SESSION_COOKIE_NAME = process.env.LARAVEL_SESSION_COOKIE || "laravel_session";

export function hasLaravelSessionCookie(cookieHeader) {
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .some((cookie) => {
      const separator = cookie.indexOf("=");
      return separator > 0
        && cookie.slice(0, separator) === SESSION_COOKIE_NAME
        && cookie.slice(separator + 1).length > 0;
    });
}

export function filterAuthCookies(cookieHeader) {
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter((cookie) => {
      const name = cookie.split("=", 1)[0];
      return name === SESSION_COOKIE_NAME || name === "XSRF-TOKEN" || name === "volymoly_device";
    })
    .join("; ");
}

export function rewriteAuthCookie(cookie) {
  return cookie
    .replace(/;\s*Domain=[^;]*/gi, "")
    .replace(/;\s*SameSite=[^;]*/gi, "") + "; SameSite=Lax";
}
