import crypto from "node:crypto";

const ENCRYPTION_VERSION = "v1";

function encryptionKey() {
  const secret = process.env.EMAIL_SETTINGS_ENCRYPTION_KEY || "";
  if (!secret.trim()) return null;
  return crypto.createHash("sha256").update(secret).digest();
}

export function canEncryptEmailSettings() {
  return Boolean(encryptionKey());
}

export function encryptEmailSecret(value: string) {
  const key = encryptionKey();
  if (!key) {
    throw new Error("EMAIL_SETTINGS_ENCRYPTION_KEY no configurada");
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptEmailSecret(value: string) {
  const key = encryptionKey();
  if (!key) {
    throw new Error("EMAIL_SETTINGS_ENCRYPTION_KEY no configurada");
  }

  const [version, ivValue, authTagValue, encryptedValue] = value.split(".");
  if (version !== ENCRYPTION_VERSION || !ivValue || !authTagValue || !encryptedValue) {
    throw new Error("Formato de secreto SMTP invalido");
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
