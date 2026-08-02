export interface DesktopRuntimeConfig {
  appVersion: string;
  isDesktop: true;
  isDevelopment: boolean;
  pocketBaseUrl: string;
  centralUrl: string;
  deviceId: string;
  deviceCode: string;
}

export interface ConsultorioDesktopBridge {
  runtime: DesktopRuntimeConfig;
  secrets: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
  };
  diagnostics: {
    openFolder(): Promise<string>;
    export(): Promise<string>;
  };
  local: {
    userExists(input: { id: string }): Promise<boolean>;
    upsertSystemSetting(input: { id: string; key: string; value: unknown }): Promise<boolean>;
  };
  central: {
    authenticate(input: { pocketBaseUrl: string; email: string; password: string }): Promise<{
      user: Record<string, unknown> & { id: string };
      validatedAt: string;
    }>;
    request(input: {
      baseUrl: string;
      path: `/api/desktop-sync/v1/${string}`;
      method?: "GET" | "POST" | "PATCH";
      body?: unknown;
    }): Promise<{ status: number; ok: boolean; body: Record<string, unknown> }>;
  };
}

declare global {
  interface Window {
    consultorioDesktop?: ConsultorioDesktopBridge;
  }
}

export function getDesktopRuntime(): DesktopRuntimeConfig | null {
  return typeof window === "undefined" ? null : window.consultorioDesktop?.runtime ?? null;
}

export function isDesktopRuntime(): boolean {
  return getDesktopRuntime()?.isDesktop === true;
}
