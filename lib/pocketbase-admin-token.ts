export const ADMIN_TOKEN_REFRESH_SKEW_MS = 60_000;

interface JwtPayload {
  exp?: unknown;
}

export function isAdminTokenReusable(
  token: string,
  nowMs = Date.now(),
  refreshSkewMs = ADMIN_TOKEN_REFRESH_SKEW_MS,
) {
  if (!token || !Number.isFinite(nowMs) || !Number.isFinite(refreshSkewMs) || refreshSkewMs < 0) {
    return false;
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) return false;

    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as JwtPayload;
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return false;

    return payload.exp * 1000 > nowMs + refreshSkewMs;
  } catch {
    return false;
  }
}
