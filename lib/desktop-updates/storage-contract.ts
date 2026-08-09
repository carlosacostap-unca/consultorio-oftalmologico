export interface DesktopUpdateObjectStorage {
  readTextObject(key: string, maxBytes?: number): Promise<string>;
  presignGetObject(key: string, expiresIn: number): Promise<string>;
}

export class DesktopUpdateStorageError extends Error {
  readonly code: "not_found" | "too_large" | "unavailable";

  constructor(code: "not_found" | "too_large" | "unavailable") {
    super(`Desktop update storage: ${code}`);
    this.code = code;
  }
}
