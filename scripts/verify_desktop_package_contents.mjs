import path from "node:path";
import {
  DesktopPackageContentError,
  findPackagedResourceRoots,
  verifyDesktopPackageResources,
} from "../desktop/package-content-policy.mjs";

try {
  const outputDirectory = path.resolve(process.argv[2] || "dist-desktop");
  const roots = await findPackagedResourceRoots(outputDirectory);
  let inspectedEntries = 0;
  for (const root of roots) {
    const result = await verifyDesktopPackageResources(root);
    inspectedEntries += result.inspectedEntries;
  }
  console.log(`Contenido de paquetes de escritorio: APROBADO (${roots.length} salida(s), ${inspectedEntries} entradas).`);
} catch (error) {
  const known = error instanceof DesktopPackageContentError;
  console.error(`Contenido de paquetes de escritorio: RECHAZADO (${known ? error.code : "verification_unavailable"}).`);
  console.error(known ? error.message : "No se pudo completar la verificación segura del paquete.");
  process.exitCode = 1;
}
