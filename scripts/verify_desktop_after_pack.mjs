import path from "node:path";
import { verifyDesktopPackageResources } from "../desktop/package-content-policy.mjs";

export async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;
  const resourcesRoot = path.join(context.appOutDir, "resources");
  const result = await verifyDesktopPackageResources(resourcesRoot);
  console.log(`Contenido del paquete de escritorio: APROBADO (${result.inspectedEntries} entradas inspeccionadas).`);
}

export default afterPack;
