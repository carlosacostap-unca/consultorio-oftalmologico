import { expect, test } from "@playwright/test";

test.describe("Impresiones locales de escritorio", () => {
  test("genera ficha, consulta, anteojos y receta sin Internet desde la copia local", async ({ page }) => {
    const patientId = "patientoff00001";
    const consultationId = "consultoff00001";
    const prescriptionId = "recipeoff000001";
    const doctorId = "doctoroff000001";
    const userId = "useroffline0001";
    const temporaryFicha = "TEMP-PC1-00001";
    const tokenPayload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
    const localToken = `desktop.${tokenPayload}.signature`;

    const patient = {
      id: patientId,
      nombre: "PACIENTE",
      apellido: "OFFLINE",
      tipo_documento: "DNI",
      numero_documento: "99000001",
      numero_ficha: temporaryFicha,
      fecha_nacimiento: "1980-01-01 00:00:00.000Z",
      telefono: "",
      email: "",
      domicilio: "",
      obra_social: "PRUEBA",
      numero_afiliado: "",
      expand: {},
    };
    const doctor = { id: doctorId, name: "MEDICO OFFLINE", email: "medico.offline@local" };
    const user = { id: userId, name: "USUARIO OFFLINE", email: "usuario.offline@local", role: "admin", roles: ["admin"] };
    const consultation = {
      id: consultationId,
      paciente_id: patientId,
      medico_id: doctorId,
      fecha: "2026-08-09 10:00:00.000Z",
      estado: "finalizada",
      motivo_consulta: "CONTROL OFFLINE",
      diagnostico: "DIAGNOSTICO LOCAL",
      tratamiento: "TRATAMIENTO LOCAL",
      ref_lejos_od_esf: "+1.00",
      ref_lejos_oi_esf: "+1.25",
      expand: { paciente_id: patient, medico_id: doctor },
    };
    const prescription = {
      id: prescriptionId,
      paciente_id: patientId,
      consulta_id: consultationId,
      medico_id: doctorId,
      fecha: "2026-08-09 10:10:00.000Z",
      medicamentos: "LUBRICANTE LOCAL",
      indicaciones: "UNA VEZ AL DIA",
      expand: { paciente_id: patient, consulta_id: consultation, medico_id: doctor },
    };
    const operations = [
      { id: "queuepatient001", entity: "pacientes", record_id: patientId, status: "pending" },
      { id: "queueconsult001", entity: "consultas", record_id: consultationId, status: "pending" },
      { id: "queuerecipe0001", entity: "recetas", record_id: prescriptionId, status: "pending" },
    ];

    await page.addInitScript(({ localToken, userId }) => {
      Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => false });
      window.localStorage.setItem("pocketbase_auth", JSON.stringify({ token: localToken, record: { id: userId } }));
      Object.defineProperty(window, "consultorioDesktop", {
        configurable: true,
        value: {
          runtime: {
            appVersion: "0.1.0-test",
            isDesktop: true,
            isDevelopment: false,
            pocketBaseUrl: "http://127.0.0.1:8090",
            centralUrl: "https://central.invalid",
            deviceId: "device-offline-test",
            deviceCode: "PC1",
          },
          secrets: {
            get: async () => null,
            set: async () => true,
            delete: async () => true,
          },
          diagnostics: {
            openFolder: async () => "",
            export: async () => "",
          },
          local: {
            userExists: async () => true,
            upsertSystemSetting: async () => true,
          },
          central: {
            authenticate: async () => { throw new Error("Sin conexión"); },
            request: async () => ({ status: 503, ok: false, body: {} }),
          },
        },
      });
    }, { localToken, userId });

    await page.route("http://127.0.0.1:8090/api/collections/**", async (route) => {
      const url = new URL(route.request().url());
      const parts = url.pathname.split("/");
      const collection = parts[3];
      const recordId = parts[5];
      const records = collection === "pacientes"
        ? [patient]
        : collection === "users"
          ? [user]
        : collection === "consultas"
          ? [consultation]
          : collection === "recetas"
            ? [prescription]
            : collection === "sync_operations"
              ? operations
              : [];
      const record = records.find((item) => item.id === recordId);

      await route.fulfill({
        status: recordId ? (record ? 200 : 404) : 200,
        contentType: "application/json",
        body: JSON.stringify(recordId ? (record || { status: 404, message: "Not found", data: {} }) : {
          page: 1,
          perPage: 200,
          totalItems: records.length,
          totalPages: 1,
          items: records,
        }),
      });
    });
    await page.route("**/api/medicos", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([doctor]),
    }));
    await page.emulateMedia({ media: "print" });

    const printRoutes = [
      { path: `/pacientes/${patientId}/imprimir`, title: "Ficha clinica del paciente" },
      { path: `/consultas/${consultationId}/imprimir`, title: "Informe clinico de consulta" },
      { path: `/consultas/${consultationId}/imprimir-anteojos`, title: "Receta de anteojos" },
      { path: `/recetas/${prescriptionId}/imprimir`, title: "Receta medica" },
    ];

    for (const printRoute of printRoutes) {
      await page.goto(printRoute.path);
      await expect(page.getByRole("heading", { name: printRoute.title })).toBeVisible();
      await expect(page.getByText(`Ficha provisoria ${temporaryFicha}`, { exact: false }).first()).toBeVisible();
      await expect(page.getByText("Pendiente de sincronización. Este documento fue generado con la copia local disponible.", { exact: true })).toBeVisible();
    }
  });
});
