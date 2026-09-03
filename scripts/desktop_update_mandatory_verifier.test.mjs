import assert from "node:assert/strict";
import test from "node:test";
import {
  MandatoryDesktopUpdateVerificationError,
  verifyMandatoryDesktopUpdateContinuity,
} from "./desktop_update_mandatory_verifier_core.mjs";

test("mantiene la sesión activa y autoriza la versión obligatoria sólo al cierre limpio", () => {
  assert.deepEqual(verifyMandatoryDesktopUpdateContinuity(), {
    version: "0.1.12-test",
    mandatoryStateVisible: true,
    activeSessionPreserved: true,
    mandatoryDeferralRejected: true,
    unverifiedInstallRejected: true,
    cleanCloseAuthorized: true,
    installerInvocations: 0,
    identityPreserved: true,
    localDataPreserved: true,
    pendingOperationsPreserved: 1,
  });
});

test("falla de forma cerrada si una política permite instalar sin verificación", () => {
  assert.throws(
    () => verifyMandatoryDesktopUpdateContinuity({
      shouldInstallOnClose({ verifiedVersion }) {
        return verifiedVersion === null;
      },
    }),
    (error) => error instanceof MandatoryDesktopUpdateVerificationError
      && error.code === "unverified_install_allowed",
  );
});

test("falla si una actualización obligatoria pudiera posponerse", () => {
  assert.throws(
    () => verifyMandatoryDesktopUpdateContinuity({ shouldDefer: () => true }),
    (error) => error instanceof MandatoryDesktopUpdateVerificationError
      && error.code === "mandatory_update_deferred",
  );
});

test("falla si el cierre limpio no autoriza el artefacto verificado coincidente", () => {
  assert.throws(
    () => verifyMandatoryDesktopUpdateContinuity({ shouldInstallOnClose: () => false }),
    (error) => error instanceof MandatoryDesktopUpdateVerificationError
      && error.code === "clean_close_not_authorized",
  );
});
