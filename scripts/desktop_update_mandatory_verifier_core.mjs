import {
  publicDesktopUpdateState,
  shouldDeferDesktopUpdate,
  shouldInstallMandatoryUpdateOnClose,
} from "../desktop/update-client-policy.mjs";

const DEFAULT_SIMULATED_VERSION = "0.1.12-test";

export class MandatoryDesktopUpdateVerificationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "MandatoryDesktopUpdateVerificationError";
    this.code = code;
  }
}

export function verifyMandatoryDesktopUpdateContinuity({
  version = DEFAULT_SIMULATED_VERSION,
  exposeState = publicDesktopUpdateState,
  shouldDefer = shouldDeferDesktopUpdate,
  shouldInstallOnClose = shouldInstallMandatoryUpdateOnClose,
} = {}) {
  const localRuntime = {
    identity: "preserved",
    localData: "preserved",
    pendingOperations: 1,
  };
  const snapshotBefore = JSON.stringify(localRuntime);
  let installerInvocations = 0;

  const mandatoryState = exposeState({
    status: "mandatory",
    version,
    kind: "mandatory",
    percent: 0,
    code: "mandatory_simulation",
  });
  if (
    mandatoryState.status !== "mandatory"
    || mandatoryState.kind !== "mandatory"
    || mandatoryState.version !== version
  ) {
    throw verificationError(
      "mandatory_state_not_visible",
      "La política obligatoria no produjo un estado público reconocible.",
    );
  }

  // Mostrar o descargar una actualización no equivale a autorizar su instalación.
  // La aplicación real sólo consulta shouldInstallOnClose desde el evento close.
  if (installerInvocations !== 0) {
    throw verificationError(
      "active_session_interrupted",
      "La actualización intentó interrumpir una sesión activa.",
    );
  }

  if (shouldDefer({
    kind: "mandatory",
    version,
    deferredVersion: version,
    remindAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  })) {
    throw verificationError(
      "mandatory_update_deferred",
      "La actualización obligatoria fue tratada como una actualización posponible.",
    );
  }

  const closeWithoutVerification = shouldInstallOnClose({
    kind: "mandatory",
    verifiedVersion: null,
    stateVersion: version,
    stateStatus: "ready",
    shuttingDown: false,
  });
  const closeWithDifferentArtifact = shouldInstallOnClose({
    kind: "mandatory",
    verifiedVersion: `${version}-different`,
    stateVersion: version,
    stateStatus: "ready",
    shuttingDown: false,
  });
  const recursiveClose = shouldInstallOnClose({
    kind: "mandatory",
    verifiedVersion: version,
    stateVersion: version,
    stateStatus: "ready",
    shuttingDown: true,
  });
  if (closeWithoutVerification || closeWithDifferentArtifact || recursiveClose) {
    throw verificationError(
      "unverified_install_allowed",
      "La política autorizó una instalación sin un artefacto verificado coincidente.",
    );
  }

  const readyState = exposeState({
    status: "ready",
    version,
    kind: "mandatory",
    percent: 100,
    code: "integrity_verified",
  });
  const cleanCloseAuthorized = shouldInstallOnClose({
    kind: readyState.kind,
    verifiedVersion: version,
    stateVersion: readyState.version,
    stateStatus: readyState.status,
    shuttingDown: false,
  });
  if (!cleanCloseAuthorized) {
    throw verificationError(
      "clean_close_not_authorized",
      "El cierre limpio no autorizó la actualización obligatoria verificada.",
    );
  }

  // El verificador nunca ejecuta la autorización: no cierra Electron ni invoca NSIS.
  if (installerInvocations !== 0 || JSON.stringify(localRuntime) !== snapshotBefore) {
    throw verificationError(
      "local_runtime_changed",
      "La simulación modificó el estado técnico local.",
    );
  }

  return {
    version,
    mandatoryStateVisible: true,
    activeSessionPreserved: true,
    mandatoryDeferralRejected: true,
    unverifiedInstallRejected: true,
    cleanCloseAuthorized: true,
    installerInvocations,
    identityPreserved: localRuntime.identity === "preserved",
    localDataPreserved: localRuntime.localData === "preserved",
    pendingOperationsPreserved: localRuntime.pendingOperations,
  };
}

function verificationError(code, message) {
  return new MandatoryDesktopUpdateVerificationError(code, message);
}
