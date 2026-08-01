const LOCAL_PASSWORD_DOMAIN = "consultorio-local-password-v1";

export async function deriveLocalPassword(password: string, deviceId: string) {
  const material = new TextEncoder().encode(`${LOCAL_PASSWORD_DOMAIN}\0${deviceId}\0${password}`);
  const digest = await crypto.subtle.digest("SHA-256", material);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
