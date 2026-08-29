import {
  MandatoryDesktopUpdateVerificationError,
  verifyMandatoryDesktopUpdateContinuity,
} from "./desktop_update_mandatory_verifier_core.mjs";

try {
  const result = verifyMandatoryDesktopUpdateContinuity();
  console.log("Verificación segura de actualización obligatoria: APROBADA");
  console.log(`Versión sintética: ${result.version}`);
  console.log("El estado obligatorio se informa sin cerrar la sesión activa.");
  console.log("La actualización obligatoria no puede posponerse.");
  console.log("Un artefacto ausente, distinto o no verificado no habilita la instalación.");
  console.log("El artefacto verificado coincidente se autoriza únicamente ante un cierre limpio.");
  console.log(`Invocaciones del instalador durante el ensayo: ${result.installerInvocations}`);
  console.log(`Operaciones pendientes técnicas conservadas: ${result.pendingOperationsPreserved}`);
  console.log("Se conservaron identidad y estado local; no se leyó contenido clínico.");
  console.log("No se cerró Electron, no se invocó el instalador y no se modificaron pilot ni stable.");
} catch (error) {
  const known = error instanceof MandatoryDesktopUpdateVerificationError;
  const code = known ? error.code : "verification_unavailable";
  const message = known ? error.message : "No se pudo completar la verificación segura.";
  console.error(`Verificación segura de actualización obligatoria: RECHAZADA (${code})`);
  console.error(message);
  console.error("No se imprimieron datos clínicos, credenciales ni secretos.");
  process.exitCode = 1;
}
