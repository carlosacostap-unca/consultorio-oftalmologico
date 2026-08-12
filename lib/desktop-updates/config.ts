import "server-only";

import { parseDesktopUpdateServerConfig } from "./config-policy";

export function desktopUpdateServerConfig() {
  return parseDesktopUpdateServerConfig(process.env);
}
