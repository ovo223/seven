export const adminCookieName = "ai_employee_admin_session";

const tokenPayload = "admin";

function getEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getAdminUsername() {
  return getEnv("ADMIN_USERNAME") || (process.env.NODE_ENV === "development" ? "admin" : "");
}

export function getAdminPassword() {
  return getEnv("ADMIN_PASSWORD") || (process.env.NODE_ENV === "development" ? "admin123" : "");
}

export function getAdminSessionSecret() {
  return getEnv("ADMIN_SESSION_SECRET") || getAdminPassword();
}

export function isAdminAuthConfigured() {
  return Boolean(getAdminUsername() && getAdminPassword() && getAdminSessionSecret());
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function signPayload(payload: string) {
  const secret = getAdminSessionSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));

  return toHex(signature);
}

export async function createAdminToken() {
  const signature = await signPayload(tokenPayload);

  return `${tokenPayload}.${signature}`;
}

export async function verifyAdminToken(token?: string) {
  if (!token || !isAdminAuthConfigured()) return false;

  const [payload, signature] = token.split(".");
  if (payload !== tokenPayload || !signature) return false;

  const expectedSignature = await signPayload(payload);

  return signature === expectedSignature;
}
