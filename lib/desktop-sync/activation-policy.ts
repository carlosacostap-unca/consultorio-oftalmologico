export interface CentralAuthenticationSuccess {
  ok: true;
  user: Record<string, unknown> & { id: string };
  validatedAt: string;
}

export interface CentralAuthenticationRejection {
  ok: false;
  reason: "rejected";
}

export type CentralAuthenticationResult = CentralAuthenticationSuccess | CentralAuthenticationRejection;

export function requireCentralAuthentication(
  result: CentralAuthenticationResult,
): CentralAuthenticationSuccess {
  if (!result.ok) throw new CentralAuthenticationRejectedError();
  return result;
}

export class CentralAuthenticationRejectedError extends Error {
  constructor() {
    super("El servidor central rechazó las credenciales o revocó la cuenta.");
    this.name = "CentralAuthenticationRejectedError";
  }
}

export function isCentralAuthenticationRejected(error: unknown): boolean {
  return error instanceof CentralAuthenticationRejectedError;
}

export function requireActivatedDesktopLogin<T extends { bootstrapCompleted?: boolean }>(
  state: T | null,
): asserts state is T & { bootstrapCompleted: true } {
  if (state?.bootstrapCompleted !== true) {
    throw new Error("Este usuario todavía no fue activado completamente en el equipo.");
  }
}

export function requirePasswordConfigured(user: Record<string, unknown>): void {
  if (user.password_configured !== true) {
    throw new Error("La cuenta debe configurar una contraseña central antes de activar el acceso offline.");
  }
}

export async function completeActivationBootstrap<T extends { bootstrapCompleted: boolean }>(
  initialState: T,
  save: (state: T) => Promise<void>,
  bootstrap: () => Promise<void>,
): Promise<T> {
  const pending = { ...initialState, bootstrapCompleted: false };
  await save(pending);
  await bootstrap();
  const completed = { ...pending, bootstrapCompleted: true };
  await save(completed);
  return completed;
}
