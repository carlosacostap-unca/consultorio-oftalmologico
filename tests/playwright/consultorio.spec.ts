import fs from "node:fs";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const DEMO_PASSWORD = "Consultorio123!";
const DEMO_DATE = "2026-05-15";
const DEMO_SLOT = "09:30";
const QUICK_SLOT = "09:00";
const OVERBOOKING_SLOT = "09:15";
const DEMO_PATIENT_DOCUMENT = "99000001";
const OCCUPIED_PATIENT_DOCUMENT = "99000002";
const ADMIN_SECRETARY_EMAIL = "admin.secretaria.demo@consultorio.local";
const PATIENT_SEARCH_PLACEHOLDER = /Buscar por apellido, nombre/;
const ACTIVE_ROLE_HEADER = "x-active-role";
const TEST_PB_MARKERS = ["test", "testing", "localhost", "127.0.0.1"];

test.describe("roles y otorgamiento de turnos", () => {
  test("secretaria ingresa y puede ver todos los medicos", async ({ page }) => {
    await login(page, "secretaria.demo@consultorio.local");

    await expect(page.getByText("Rol activo: Secretaria")).toBeVisible();
    await page.goto("/turnos");

    const doctorSelect = page.locator("main select").first();
    await expect(doctorSelect).toBeEnabled();
    await expect(doctorSelect).toHaveValue("all");
    await expect(doctorSelect.locator("option", { hasText: "Todos los medicos" })).toHaveCount(1);
    await expect(doctorSelect.locator("option", { hasText: "Medico Demo" })).toHaveCount(1);
    await expect(doctorSelect.locator("option", { hasText: "Medico Dos Demo" })).toHaveCount(1);
  });

  test("secretaria cambia entre agendas de dos medicos", async ({ page }) => {
    await login(page, "secretaria.demo@consultorio.local");

    await page.goto("/turnos");
    const doctorSelect = page.locator("main select").first();
    await doctorSelect.selectOption({ label: "Medico Dos Demo" });
    await expect(doctorSelect.locator("option:checked")).toHaveText("Medico Dos Demo");

    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);

    await expect(page.getByRole("heading", { name: "Medico Dos Demo" })).toBeVisible();
    await expect(page.getByText(/10:00.*11:00.*Consulta/)).toBeVisible();
    await expect(page.getByText(/OCUPADO DEMO, PACIENTE/)).toHaveCount(0);
  });

  test("secretaria ve la agenda diaria agrupada por medico", async ({ page }) => {
    await login(page, "secretaria.demo@consultorio.local");

    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);

    await expect(page.getByText("Tablero operativo diario")).toBeVisible();
    await expect(page.getByText("Vista agrupada por medico")).toBeVisible();
    await expect(page.getByText(/Mostrando 1 de 1 turnos filtrados/)).toBeVisible();
    await expect(page.getByText("Turnos: 1")).toBeVisible();
    await expect(page.getByText("Proximo turno", { exact: true })).toBeVisible();
    await expect(page.getByText(/09:15.*OCUPADO DEMO, PACIENTE/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "En espera" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Medico Demo" })).toBeVisible();
    await expect(page.getByText(/09:00.*12:00.*Consulta/)).toBeVisible();
    await expect(page.getByText("OCUPADO DEMO, PACIENTE", { exact: true })).toBeVisible();
  });

  test("secretaria filtra la agenda diaria sin perder la ocupacion de disponibilidades", async ({ page }) => {
    await login(page, "secretaria.demo@consultorio.local");

    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);

    await expect(page.getByRole("button", { name: /09:15.*Ocupado/ })).toBeVisible();
    await page.getByRole("button", { name: "Atendidos" }).click();

    await expect(page.getByText(/Mostrando 0 de 1 turnos filtrados/)).toBeVisible();
    await expect(page.getByText("No hay turnos que coincidan con la busqueda o el filtro seleccionado.").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /09:00.*Libre/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /09:15.*Ocupado/ })).toBeVisible();
  });

  test("secretaria gestiona sala de espera por estado", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    const patient = await findDemoPatient(request, env, adminToken, DEMO_PATIENT_DOCUMENT);
    expect(patient).toBeTruthy();
    const motivo = `Playwright sala ${Date.now()}`;
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, DEMO_SLOT);

    try {
      await createDemoAppointment(request, env, adminToken, medicoId, patient!.id as string, motivo, DEMO_SLOT, "");

      await login(page, "secretaria.demo@consultorio.local");
      await page.goto("/turnos");
      await page.getByRole("button", { name: "Sala de espera" }).click();
      await page.locator('main input[type="date"]').fill(DEMO_DATE);

      await expect(page.getByRole("heading", { name: "Sala de espera" })).toBeVisible();
      await expect(page.getByText(/Proximos: 1/)).toBeVisible();

      let card = page.getByText(motivo).locator("xpath=ancestor::div[contains(@class,'px-5 py-4')][1]");
      await expect(card.getByText("Medico Demo")).toBeVisible();
      await expect(card.getByText("DNI 99000001")).toBeVisible();
      await expect(card.getByText("Tel 2604000001")).toBeVisible();
      await card.getByRole("button", { name: "Llego" }).click();

      await expect(page.getByText(/En espera: 2/)).toBeVisible();
      await expect(
        await findDemoAppointment(request, env, adminToken, medicoId, motivo, DEMO_SLOT, "En espera")
      ).toBeTruthy();

      card = page.getByText(motivo).locator("xpath=ancestor::div[contains(@class,'px-5 py-4')][1]");
      await card.getByRole("button", { name: "En consulta" }).click();
      await expect(page.getByText(/En consulta: 1/)).toBeVisible();
      await expect(
        await findDemoAppointment(request, env, adminToken, medicoId, motivo, DEMO_SLOT, "En consulta")
      ).toBeTruthy();

      card = page.getByText(motivo).locator("xpath=ancestor::div[contains(@class,'px-5 py-4')][1]");
      await card.getByRole("button", { name: "Cancelar" }).click();
      await expect(page.getByRole("heading", { name: "Motivo requerido" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Guardar estado" })).toBeDisabled();
      await page.getByPlaceholder("Ej: El paciente solicito cancelar...").fill("Cancelacion desde sala de espera");
      await page.getByRole("button", { name: "Guardar estado" }).click();

      await expect(page.getByText(/Cancelados: 1/)).toBeVisible();
      await expect(
        await findDemoAppointment(request, env, adminToken, medicoId, motivo, DEMO_SLOT, "Cancelado")
      ).toBeTruthy();
      await expect
        .poll(() => findDemoAppointmentEvents(request, env, adminToken, medicoId, motivo, DEMO_SLOT, "canceled"), {
          timeout: 10_000,
        })
        .toHaveLength(1);
    } finally {
      await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, DEMO_SLOT);
    }
  });

  test("secretaria imprime listado diario por medico y todos los medicos", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    const medicoDosId = await getUserIdByEmail(request, env, adminToken, "medico.dos.demo@consultorio.local");
    const patient = await findDemoPatient(request, env, adminToken, DEMO_PATIENT_DOCUMENT);
    expect(patient).toBeTruthy();
    const motivo = `Playwright impresion ${Date.now()}`;
    await cleanupDemoAppointment(request, env, adminToken, medicoDosId, undefined, "10:00");

    try {
      await createDemoAppointment(request, env, adminToken, medicoDosId, patient!.id as string, motivo, "10:00", "En espera", "10:00");

      await login(page, "secretaria.demo@consultorio.local");
      const fields = "hora,paciente,dni,telefono,obra_social,tipo,motivo,estado";
      await page.goto(`/turnos/imprimir?date=${DEMO_DATE}&medico_id=${medicoDosId}&fields=${fields}&autoprint=0`);

      await expect(page.getByRole("heading", { name: "Listado diario de turnos" })).toBeVisible();
      await expect(page.getByText("Alcance: Medico Dos Demo")).toBeVisible();
      await expect(page.getByText(motivo)).toBeVisible();
      await expect(page.getByText("Turno ocupado demo")).toHaveCount(0);

      await page.goto(`/turnos/imprimir?date=${DEMO_DATE}&medico_id=all&fields=${fields}&autoprint=0`);
      await expect(page.getByRole("heading", { name: "Medico Demo" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Medico Dos Demo" })).toBeVisible();
      await expect(page.getByText("Turno ocupado demo")).toBeVisible();
      await expect(page.getByText(motivo)).toBeVisible();
    } finally {
      await cleanupDemoAppointment(request, env, adminToken, medicoDosId, motivo, "10:00");
    }
  });

  test("secretaria consulta y corrige ficha rapida del paciente desde turnos", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const patient = await findDemoPatient(request, env, adminToken, OCCUPIED_PATIENT_DOCUMENT);
    expect(patient).toBeTruthy();
    const originalPhone = String(patient!.telefono || "");
    const nextPhone = `2604${Date.now().toString().slice(-6)}`;

    try {
      await login(page, "secretaria.demo@consultorio.local");
      await page.goto("/turnos");
      await page.getByRole("button", { name: "Agenda Diaria" }).click();
      await page.locator('main input[type="date"]').fill(DEMO_DATE);

      const row = page
        .getByText("OCUPADO DEMO, PACIENTE", { exact: true })
        .locator("xpath=ancestor::div[contains(@class,'grid')][1]");
      await row.getByRole("button", { name: "Ficha paciente" }).click();

      await expect(page.getByText("Ficha rapida", { exact: true })).toBeVisible();
      await expect(page.getByText("Datos del paciente")).toBeVisible();
      await expect(page.getByText("Ultimos turnos")).toBeVisible();
      await page.getByLabel("Documento").fill(DEMO_PATIENT_DOCUMENT);
      await expect(page.getByText("Posibles pacientes duplicados")).toBeVisible();
      await expect(page.getByText("Libre Demo, Paciente")).toBeVisible();
      await expect(page.getByText("Mismo documento")).toBeVisible();
      await page.getByLabel("Documento").fill(OCCUPIED_PATIENT_DOCUMENT);
      await expect(page.getByText("Libre Demo, Paciente")).toBeHidden();
      await page.getByLabel("Telefono").fill(nextPhone);
      await page.getByRole("button", { name: "Guardar paciente" }).click();

      await expect(page.getByText("Datos del paciente actualizados.")).toBeVisible();
      await page.getByRole("button", { name: "Cerrar ficha rapida" }).click();
      await expect(row.getByText(`Tel ${nextPhone}`)).toBeVisible();
    } finally {
      await updateDemoPatient(request, env, adminToken, patient!.id as string, { telefono: originalPhone });
    }
  });

  test("secretaria crea turno rapido desde agenda diaria", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, QUICK_SLOT);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:00.*Libre/ }).click();

    await expect(page.getByRole("heading", { name: "Alta rapida de turno" })).toBeVisible();
    await expect(page.getByLabel("Resumen del turno")).toContainText("Medico Demo");
    await expect(page.getByLabel("Resumen del turno")).toContainText("09:00");
    await expect(page.getByText("Turno regular")).toBeVisible();
    await page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER).fill(DEMO_PATIENT_DOCUMENT);
    await page.getByText(/Libre Demo, Paciente/).click();
    await expect(page.getByText("Paciente seleccionado")).toBeVisible();

    const motivo = `Playwright rapido ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general").fill(motivo);
    await page.getByRole("button", { name: "Guardar turno" }).click();

    await expect(page.getByRole("heading", { name: "Alta rapida de turno" })).toBeHidden();
    await expect(page.getByText("Turno creado")).toBeVisible();
    await expect(page.getByRole("button", { name: `Gestionar turno ${motivo}` })).toBeVisible();
    await expect(await findDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT)).toBeTruthy();

    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT);
  });

  test("secretaria crea paciente desde alta rapida de turno", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    const document = `98${Date.now().toString().slice(-6)}`;
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, QUICK_SLOT);
    await cleanupDemoPatient(request, env, adminToken, document);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:00.*Libre/ }).click();

    await page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER).fill(document);
    await expect(page.getByText("No encontramos pacientes para esa busqueda.")).toBeVisible();
    await page.getByRole("button", { name: "+ Nuevo" }).click();
    await page.getByPlaceholder("Apellido", { exact: true }).fill("Alta Rapida");
    await page.getByPlaceholder("Nombre", { exact: true }).fill("Paciente");
    await page.getByPlaceholder("DNI", { exact: true }).fill(DEMO_PATIENT_DOCUMENT);
    await expect(page.getByText("Posibles pacientes duplicados")).toBeVisible();
    await expect(page.getByText("Libre Demo, Paciente")).toBeVisible();
    await expect(page.getByText("Mismo documento")).toBeVisible();
    await page.getByPlaceholder("DNI", { exact: true }).fill(document);
    await expect(page.getByText("Libre Demo, Paciente")).toBeHidden();
    await page.getByPlaceholder("Telefono", { exact: true }).fill("111-222");
    await page.getByPlaceholder("Obra social", { exact: true }).fill("Demo Salud");
    await page.getByRole("button", { name: "Crear y seleccionar" }).click();

    await expect(page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER)).toHaveValue(/Alta Rapida, Paciente/);
    await expect(page.getByText("Paciente seleccionado")).toBeVisible();
    const motivo = `Playwright paciente rapido ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general").fill(motivo);
    await page.getByRole("button", { name: "Guardar turno" }).click();

    await expect(page.getByRole("heading", { name: "Alta rapida de turno" })).toBeHidden();
    await expect(await findDemoPatient(request, env, adminToken, document)).toBeTruthy();
    await expect(await findDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT)).toBeTruthy();

    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT);
    await cleanupDemoPatient(request, env, adminToken, document);
  });

  test("secretaria confirma advertencias antes de guardar turno con paciente ya agendado", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, QUICK_SLOT);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:00.*Libre/ }).click();

    await page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER).fill(OCCUPIED_PATIENT_DOCUMENT);
    await page.getByText(/Ocupado Demo, Paciente/).click();
    await expect(page.getByText("Advertencias del paciente")).toBeVisible();
    await expect(page.getByText("Este paciente tiene proximos turnos activos.")).toBeVisible();
    await expect(page.getByText("Hay un turno activo con este mismo medico.")).toBeVisible();

    const motivo = `Playwright advertencia ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general").fill(motivo);
    await expect(page.getByRole("button", { name: "Guardar turno" })).toBeDisabled();
    await page.getByLabel("Revise las advertencias y quiero guardar el turno igual.").check();
    await page.getByRole("button", { name: "Guardar turno" }).click();

    await expect(page.getByRole("heading", { name: "Alta rapida de turno" })).toBeHidden();
    await expect(page.getByText("Turno creado")).toBeVisible();
    await expect.poll(
      () => findDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT),
      { timeout: 10_000 }
    ).toBeTruthy();
    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT);
  });

  test("secretaria usa acciones rapidas de estado en la agenda diaria", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, QUICK_SLOT);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:00.*Libre/ }).click();
    await page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER).fill(DEMO_PATIENT_DOCUMENT);
    await page.getByText(/Libre Demo, Paciente/).click();

    const motivo = `Playwright estado rapido ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general").fill(motivo);
    await page.getByRole("button", { name: "Guardar turno" }).click();
    await expect(page.getByRole("button", { name: `Gestionar turno ${motivo}` })).toBeVisible();

    const row = page
      .getByRole("button", { name: `Gestionar turno ${motivo}` })
      .locator("xpath=ancestor::div[contains(@class,'grid')][1]");
    await row.getByRole("button", { name: "Atendido" }).click();
    await expect(row.getByRole("combobox", { name: "Cambiar estado" })).toHaveValue("Atendido");
    await expect
      .poll(() => findDemoAppointmentEvents(request, env, adminToken, medicoId, motivo, QUICK_SLOT, "status_changed"), {
        timeout: 10_000,
      })
      .toHaveLength(1);

    await page.getByRole("button", { name: `Gestionar turno ${motivo}` }).click();
    await page.getByRole("button", { name: "Historial" }).click();
    await expect(page.getByText("Cambio de estado")).toBeVisible();
    await expect(page.getByText("En espera -> Atendido", { exact: true }).first()).toBeVisible();

    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT);
  });

  test("secretaria debe indicar motivo para marcar ausente", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, QUICK_SLOT);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:00.*Libre/ }).click();
    await page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER).fill(DEMO_PATIENT_DOCUMENT);
    await page.getByText(/Libre Demo, Paciente/).click();

    const motivo = `Playwright ausente ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general").fill(motivo);
    await page.getByRole("button", { name: "Guardar turno" }).click();
    await expect(page.getByRole("button", { name: `Gestionar turno ${motivo}` })).toBeVisible();

    const row = page
      .getByRole("button", { name: `Gestionar turno ${motivo}` })
      .locator("xpath=ancestor::div[contains(@class,'grid')][1]");
    await row.getByRole("button", { name: "Ausente", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Motivo requerido" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar estado" })).toBeDisabled();
    await page.getByPlaceholder("Ej: El paciente no asistio...").fill("No asistio a la prueba automatizada");
    await page.getByRole("button", { name: "Guardar estado" }).click();

    await expect(row.getByRole("combobox", { name: "Cambiar estado" })).toHaveValue("Ausente");
    await expect
      .poll(() => findDemoAppointmentEvents(request, env, adminToken, medicoId, motivo, QUICK_SLOT, "status_changed"), {
        timeout: 10_000,
      })
      .toHaveLength(1);

    await page.getByRole("button", { name: `Gestionar turno ${motivo}` }).click();
    await page.getByRole("button", { name: "Historial" }).click();
    await expect(page.getByText("No asistio a la prueba automatizada")).toBeVisible();

    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT);
  });

  test("secretaria cancela turno desde agenda diaria conservando historial", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, QUICK_SLOT);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:00.*Libre/ }).click();
    await page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER).fill(DEMO_PATIENT_DOCUMENT);
    await page.getByText(/Libre Demo, Paciente/).click();

    const motivo = `Playwright cancelar ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general").fill(motivo);
    await page.getByRole("button", { name: "Guardar turno" }).click();

    await expect(page.getByRole("button", { name: `Gestionar turno ${motivo}` })).toBeVisible();
    await page.getByRole("button", { name: `Gestionar turno ${motivo}` }).click();
    await page.getByRole("button", { name: "Cancelacion" }).click();
    await page.getByPlaceholder("Ej: El paciente solicito cancelar...").fill("Prueba automatizada de cancelacion");
    await page.getByRole("button", { name: "Cancelar turno" }).click();

    await expect(page.getByRole("button", { name: `Gestionar turno ${motivo}` })).toBeVisible();
    await expect.poll(
      () => findDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT, "Cancelado"),
      { timeout: 10_000 }
    ).toBeTruthy();

    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT);
  });

  test("secretaria reprograma turno desde agenda diaria", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, QUICK_SLOT);
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, DEMO_SLOT);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:00.*Libre/ }).click();
    await page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER).fill(DEMO_PATIENT_DOCUMENT);
    await page.getByText(/Libre Demo, Paciente/).click();

    const motivo = `Playwright reprogramar ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general").fill(motivo);
    await page.getByRole("button", { name: "Guardar turno" }).click();

    await expect(page.getByRole("button", { name: `Gestionar turno ${motivo}` })).toBeVisible();
    await page.getByRole("button", { name: `Gestionar turno ${motivo}` }).click();
    await page.getByRole("button", { name: "Reprogramar", exact: true }).click();
    await page.getByRole("button", { name: /Reprogramar a 09:30/ }).click();
    await page.getByRole("button", { name: "Reprogramar turno" }).click();

    await expect.poll(
      () => findDemoAppointment(request, env, adminToken, medicoId, motivo, DEMO_SLOT),
      { timeout: 10_000 }
    ).toBeTruthy();

    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, DEMO_SLOT);
  });

  test("secretaria crea sobreturno desde slot ocupado", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, OVERBOOKING_SLOT);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:15.*Ocupado/ }).click();

    await expect(page.getByRole("heading", { name: "Alta rapida de sobreturno" })).toBeVisible();
    await expect(page.getByLabel("Resumen del turno")).toContainText("09:15");
    await expect(page.getByText("Sobreturno sobre horario ocupado")).toBeVisible();
    await expect(page.getByText("Se guardara como sobreturno y quedara asociado a esta disponibilidad.")).toBeVisible();
    await page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER).fill(DEMO_PATIENT_DOCUMENT);
    await page.getByText(/Libre Demo, Paciente/).click();
    await expect(page.getByText("Paciente seleccionado")).toBeVisible();

    const motivo = `Playwright sobreturno ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general").fill(motivo);
    await page.getByRole("button", { name: "Guardar sobreturno" }).click();

    await expect(page.getByRole("heading", { name: "Alta rapida de sobreturno" })).toBeHidden();
    await expect(page.getByText("Turno creado")).toBeVisible();
    await expect(page.getByRole("button", { name: `Gestionar turno ${motivo}` })).toBeVisible();
    await expect(await findDemoAppointment(request, env, adminToken, medicoId, motivo, OVERBOOKING_SLOT)).toBeTruthy();

    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, OVERBOOKING_SLOT);
  });

  test("usuario multi rol ingresa como medico y puede cambiar a secretaria", async ({ page }) => {
    await login(page, "multi.demo@consultorio.local");

    await expect(page.getByText("Rol activo: Medico")).toBeVisible();
    await expect(page.getByText(/selecciona.*rol|elegi.*rol|elige.*rol/i)).toHaveCount(0);

    const roleSelect = page.locator("aside select");
    await expect(roleSelect).toHaveValue("medico");
    await roleSelect.selectOption("secretaria");

    await expect(page.getByText("Rol activo: Secretaria")).toBeVisible();
    await page.goto("/turnos");
    await expect(page.locator("main select").first()).toHaveValue("all");
  });

  test("usuario admin operativo cambia a secretaria y pierde permisos admin", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const userToken = await getUserToken(request, env, ADMIN_SECRETARY_EMAIL);

    await login(page, ADMIN_SECRETARY_EMAIL);

    await expect(page.getByText("Rol activo: Admin")).toBeVisible();
    await expect(page.locator("aside").getByText("Configuracion")).toBeVisible();
    await expect(page.locator("aside").getByRole("link", { name: "Permisos" })).toBeVisible();

    const adminResponse = await request.get("/api/usuarios", {
      headers: {
        Authorization: `Bearer ${userToken}`,
        [ACTIVE_ROLE_HEADER]: "admin",
      },
    });
    expect(adminResponse.status()).toBe(200);

    await page.locator("aside select").selectOption("secretaria");
    await expect(page.getByText("Rol activo: Secretaria")).toBeVisible();
    await expect(page.locator("aside").getByText("Configuracion")).toHaveCount(0);
    await expect(page.locator("aside").getByRole("link", { name: "Permisos" })).toHaveCount(0);

    const secretaryResponse = await request.get("/api/usuarios", {
      headers: {
        Authorization: `Bearer ${userToken}`,
        [ACTIVE_ROLE_HEADER]: "secretaria",
      },
    });
    expect(secretaryResponse.status()).toBe(403);
  });

  test("admin fusiona pacientes duplicados desde la pantalla administrativa", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    const suffix = Date.now().toString().slice(-6);
    const primaryDocument = `971${suffix}`;
    const duplicateDocument = `972${suffix}`;
    const created: { turnos: string[]; consultas: string[]; recetas: string[]; pacientes: string[] } = {
      turnos: [],
      consultas: [],
      recetas: [],
      pacientes: [],
    };

    try {
      const primary = await createDemoPatient(request, env, adminToken, {
        nombre: "Principal",
        apellido: "Fusion Playwright",
        numero_documento: primaryDocument,
        telefono: `260${suffix}`,
        email: `principal.${suffix}@consultorio.local`,
      });
      const duplicate = await createDemoPatient(request, env, adminToken, {
        nombre: "Duplicado",
        apellido: "Fusion Playwright",
        numero_documento: duplicateDocument,
        telefono: `260${suffix}`,
        email: `duplicado.${suffix}@consultorio.local`,
      });
      created.pacientes.push(primary.id as string, duplicate.id as string);

      const turno = await createRawDemoAppointment(request, env, adminToken, medicoId, duplicate.id as string, `Playwright fusion turno ${suffix}`);
      const consulta = await createDemoConsultation(request, env, adminToken, duplicate.id as string, `Playwright fusion consulta ${suffix}`);
      const receta = await createDemoPrescription(request, env, adminToken, duplicate.id as string, consulta.id as string, `Playwright fusion receta ${suffix}`);
      created.turnos.push(turno.id as string);
      created.consultas.push(consulta.id as string);
      created.recetas.push(receta.id as string);

      const secretariaToken = await getUserToken(request, env, "secretaria.demo@consultorio.local");
      const forbidden = await request.post("/api/pacientes/duplicados", {
        headers: { Authorization: `Bearer ${secretariaToken}`, [ACTIVE_ROLE_HEADER]: "secretaria" },
        data: {
          primaryPatientId: primary.id,
          duplicatePatientId: duplicate.id,
          confirmation: "FUSIONAR",
        },
      });
      expect(forbidden.status()).toBe(403);

      await login(page, "admin.demo@consultorio.local");
      await page.goto("/pacientes/duplicados");
      await expect(page.getByRole("heading", { name: "Duplicados de pacientes" })).toBeVisible();

      await page.getByLabel("Buscar paciente").fill(primaryDocument);
      await page.getByText("Fusion Playwright, Principal").locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]").getByRole("button", { name: "Principal" }).click();
      await page.getByLabel("Buscar paciente").fill(duplicateDocument);
      await page.getByText("Fusion Playwright, Duplicado").locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]").getByRole("button", { name: "Duplicado" }).click();

      await expect(page.getByText("Paciente principal", { exact: true })).toBeVisible();
      await expect(page.getByText("Paciente duplicado", { exact: true })).toBeVisible();
      await expect(page.getByText("Ultimos turnos")).toHaveCount(2);
      await expect(page.getByText(`Playwright fusion turno ${suffix}`)).toBeVisible();
      await expect(page.getByText("Ultimas consultas")).toHaveCount(2);
      await expect(page.getByText(`Playwright fusion consulta ${suffix}`)).toBeVisible();
      await expect(page.getByText("Ultimas recetas")).toHaveCount(2);
      await expect(page.getByText(`Playwright fusion receta ${suffix}`)).toBeVisible();
      await page.getByLabel("Motivo").fill("Prueba Playwright de fusion");
      await page.getByLabel("Confirmacion").fill("FUSIONAR");
      await page.getByRole("button", { name: "Fusionar pacientes" }).click();

      await expect(page.getByText("Pacientes fusionados correctamente")).toBeVisible();
      await expect(page.getByText("Reasignados: 1 turnos, 1 consultas, 1 recetas.")).toBeVisible();

      const [updatedTurno, updatedConsulta, updatedReceta, updatedDuplicate] = await Promise.all([
        pbGet(request, env, adminToken, "turnos", turno.id as string),
        pbGet(request, env, adminToken, "consultas", consulta.id as string),
        pbGet(request, env, adminToken, "recetas", receta.id as string),
        pbGet(request, env, adminToken, "pacientes", duplicate.id as string),
      ]);

      expect(updatedTurno.paciente_id).toBe(primary.id);
      expect(updatedConsulta.paciente_id).toBe(primary.id);
      expect(updatedReceta.paciente_id).toBe(primary.id);
      expect(updatedDuplicate.estado_registro).toBe("fusionado");
      expect(updatedDuplicate.fusionado_en_paciente_id).toBe(primary.id);
    } finally {
      await cleanupCreatedRecords(request, env, adminToken, created);
    }
  });

  test("secretaria otorga un turno regular desde disponibilidad demo", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    await cleanupDemoAppointment(request, env, adminToken, medicoId);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos/nuevo");

    await page.locator("main select").first().selectOption({ label: "Medico Demo" });
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:00.*12:00.*Consulta/ }).click();

    await expect(page.getByRole("button", { name: /09:15 Ocupado/ })).toBeVisible();
    await page.getByRole("button", { name: new RegExp(`${DEMO_SLOT} Libre`) }).click();

    const patientSearch = page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER);
    await patientSearch.fill(DEMO_PATIENT_DOCUMENT);
    await page.getByText(/Libre Demo, Paciente/).click();

    const motivo = `Playwright turno ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general, receta lentes...").fill(motivo);
    await page.getByRole("button", { name: "Agendar Turno" }).click();

    await expect(page).toHaveURL(new RegExp(`/turnos\\?medico_id=${medicoId}`));
    await expect(page.locator("main select").first()).toHaveValue(medicoId);
    await expect(await findDemoAppointment(request, env, adminToken, medicoId, motivo)).toBeTruthy();

    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo);
  });

  test("medico crea turnos solo para su propia agenda", async ({ page }) => {
    await login(page, "medico.demo@consultorio.local");

    await expect(page.getByText("Rol activo: Medico")).toBeVisible();
    await page.goto("/turnos/nuevo");

    const doctorSelect = page.locator("main select").first();
    await expect(doctorSelect).toBeDisabled();
    await expect(doctorSelect.locator("option:checked")).toHaveText("Medico Demo");
  });

  test("medico busca paciente al crear receta libre", async ({ page }) => {
    await login(page, "medico.demo@consultorio.local");

    await page.goto("/recetas/nueva");
    const patientSearch = page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER);
    await patientSearch.fill(DEMO_PATIENT_DOCUMENT);
    await page.getByText(/Libre Demo, Paciente/).click();

    await expect(patientSearch).toHaveValue(/Libre Demo, Paciente/);
    await expect(page.getByText("Contexto de receta")).toBeVisible();
    await expect(page.getByText("Sin consulta vinculada")).toBeVisible();
  });

  test("medico ve ficha clinica del paciente con acciones y recetas", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const patient = await findDemoPatient(request, env, adminToken, DEMO_PATIENT_DOCUMENT);
    expect(patient).toBeTruthy();
    const suffix = Date.now();
    let consultaId = "";
    let recetaId = "";

    try {
      const consulta = await createDemoConsultation(request, env, adminToken, patient!.id as string, `Playwright ficha consulta ${suffix}`);
      consultaId = consulta.id as string;
      const receta = await createDemoPrescription(request, env, adminToken, patient!.id as string, consultaId, `Playwright ficha receta ${suffix}`);
      recetaId = receta.id as string;

      await login(page, "medico.demo@consultorio.local");
      await page.goto(`/pacientes/${patient!.id}?mode=view`);

      const clinicalSummary = page
        .getByText("Ficha clinica del paciente")
        .locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]");
      await expect(clinicalSummary).toBeVisible();
      await expect(clinicalSummary.getByText(/Libre Demo, Paciente/i)).toBeVisible();
      await expect(clinicalSummary.getByText(`DNI ${DEMO_PATIENT_DOCUMENT}`)).toBeVisible();
      await expect(clinicalSummary.getByRole("heading", { name: "Antecedentes activos" })).toBeVisible();
      await expect(clinicalSummary.getByRole("heading", { name: "Ultima consulta" })).toBeVisible();
      await expect(clinicalSummary.getByText(`Playwright ficha consulta ${suffix}`)).toBeVisible();

      await expect(page.getByText("Recetas recientes")).toBeVisible();
      await expect(page.getByText(`Playwright ficha receta ${suffix}`)).toBeVisible();

      await clinicalSummary.getByRole("button", { name: "Nueva consulta" }).click();
      await expect(page).toHaveURL(new RegExp(`/consultas/nueva\\?paciente_id=${patient!.id}`));

      await page.goto(`/pacientes/${patient!.id}?mode=view`);
      const reloadedSummary = page
        .getByText("Ficha clinica del paciente")
        .locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]");
      await reloadedSummary.getByRole("button", { name: "Nueva receta" }).click();
      await expect(page).toHaveURL(new RegExp(`/recetas/nueva\\?paciente_id=${patient!.id}`));
    } finally {
      if (recetaId) {
        await request.delete(`${pocketBaseUrl(env)}/api/collections/recetas/records/${recetaId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      }
      if (consultaId) {
        await request.delete(`${pocketBaseUrl(env)}/api/collections/consultas/records/${consultaId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      }
    }
  });

  test("medico inicia consulta desde su jornada diaria", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    const patient = await findDemoPatient(request, env, adminToken, DEMO_PATIENT_DOCUMENT);
    expect(patient).toBeTruthy();
    const motivo = `Playwright medico consulta ${Date.now()}`;
    const slot = "09:45";
    let createdConsultaId = "";
    let createdRecetaId = "";
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, slot);

    try {
      const turno = await createDemoAppointment(request, env, adminToken, medicoId, patient!.id as string, motivo, slot, "En espera");

      await login(page, "medico.demo@consultorio.local");
      await page.goto("/turnos");
      await expect(page.getByText("Mi jornada medica")).toBeVisible();
      const doctorSelect = page.locator("main select").first();
      await expect(doctorSelect).toBeDisabled();
      await expect(doctorSelect.locator("option:checked")).toHaveText("Medico Demo");

      await page.locator('main input[type="date"]').fill(DEMO_DATE);
      await expect(page.getByText("Jornada de atencion")).toBeVisible();
      await expect(page.getByText("Pacientes para atender:")).toBeVisible();
      const doctorPanel = page.getByLabel("Tablero diario del medico");
      await expect(doctorPanel).toBeVisible();
      await expect(doctorPanel.getByText("Atencion clinica de hoy")).toBeVisible();
      await expect(doctorPanel.getByText("Paciente en consulta", { exact: true })).toBeVisible();
      await expect(doctorPanel.getByText("Proximo paciente", { exact: true })).toBeVisible();
      await expect(doctorPanel.getByText("Pendientes de atencion", { exact: true })).toBeVisible();
      await expect(doctorPanel.getByText(motivo)).toBeVisible();
      await expect(doctorPanel.getByRole("link", { name: "Ficha clinica" }).first()).toBeVisible();
      await expect(doctorPanel.getByRole("link", { name: "Nueva receta" }).first()).toBeVisible();

      const row = page
        .getByRole("button", { name: `Gestionar turno ${motivo}` })
        .locator("xpath=ancestor::div[contains(@class,'grid')][1]");
      await expect(row.getByRole("button", { name: "Iniciar consulta" })).toBeVisible();
      await row.getByRole("button", { name: "Iniciar consulta" }).click();

      await expect(page).toHaveURL(/\/consultas\/nueva/);
      await expect(page).toHaveURL(new RegExp(`turno_id=${turno.id}`));
      await expect(page.getByText("Resumen del paciente")).toBeVisible();
      await expect(page.getByText("Consulta desde turno")).toBeVisible();
      await expect(page.getByText("Examen y cierre clinico")).toBeVisible();
      await expect(page.getByText("Agudeza visual")).toBeVisible();
      await expect(page.getByText("Presion ocular")).toBeVisible();
      await expect(page.getByText("Refraccion de lejos")).toBeVisible();
      await expect(page.getByText("Refraccion de cerca")).toBeVisible();
      await expect
        .poll(() => findDemoAppointment(request, env, adminToken, medicoId, motivo, slot, "En consulta"), {
          timeout: 10_000,
        })
        .toBeTruthy();

      await page.getByRole("button", { name: "GUARDAR CONSULTA" }).click();
      await expect(page.getByText("Consulta guardada correctamente")).toBeVisible();
      await expect(page.getByText("Consulta guardada y turno marcado como atendido")).toBeVisible();
      await expect(page.getByText("El turno fue marcado como Atendido.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Abrir consulta" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Crear receta" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Imprimir anteojos" })).toBeVisible();
      await expect
        .poll(async () => {
          const updatedTurno = await pbGet(request, env, adminToken, "turnos", turno.id as string);
          return updatedTurno.estado === "Atendido" && Boolean(updatedTurno.consulta_id);
        }, { timeout: 10_000 })
        .toBeTruthy();

      const updatedTurno = await pbGet(request, env, adminToken, "turnos", turno.id as string);
      createdConsultaId = String(updatedTurno.consulta_id || "");
      await expect(page.getByRole("link", { name: "Volver a jornada" })).toHaveAttribute(
        "href",
        new RegExp(`/turnos\\?tab=daily&date=${DEMO_DATE}&medico_id=${medicoId}`)
      );

      await page.getByRole("link", { name: "Abrir consulta" }).click();
      await expect(page).toHaveURL(new RegExp(`/consultas/${createdConsultaId}`));
      await expect(page.getByText("Detalle clinico")).toBeVisible();
      await expect(page.getByText("Resumen clinico")).toBeVisible();
      const continuityPanel = page.getByLabel("Continuidad clinica");
      await expect(continuityPanel).toBeVisible();
      await expect(continuityPanel.getByText("Estado de la atencion")).toBeVisible();
      await expect(continuityPanel.getByRole("link", { name: "Ficha clinica" })).toBeVisible();
      await expect(continuityPanel.getByRole("link", { name: "Crear receta" })).toBeVisible();
      await expect(continuityPanel.getByRole("link", { name: "Imprimir informe" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Crear receta" }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Imprimir anteojos" }).first()).toBeVisible();

      await page.getByRole("link", { name: "Crear receta" }).first().click();
      await expect(page).toHaveURL(new RegExp(`/recetas/nueva\\?consulta_id=${createdConsultaId}`));
      await expect(page.getByText("Contexto de receta")).toBeVisible();
      await expect(page.getByText("Receta de anteojos")).toBeVisible();
      await page.locator("textarea").first().fill("Receta Playwright desde consulta");
      await page.locator("textarea").nth(1).fill("Usar segun indicacion medica.");
      await page.getByRole("button", { name: "Guardar Receta" }).click();
      await expect(page.getByText("Receta guardada correctamente")).toBeVisible();
      await expect(page.getByRole("link", { name: "Ver receta" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Imprimir receta" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Volver a consulta" })).toBeVisible();
      const recetaHref = await page.getByRole("link", { name: "Ver receta" }).getAttribute("href");
      createdRecetaId = recetaHref?.match(/\/recetas\/([^?]+)/)?.[1] || "";

      await page.getByRole("link", { name: "Volver a consulta" }).click();
      await expect(page).toHaveURL(new RegExp(`/consultas/${createdConsultaId}`));
      await expect(page.getByLabel("Continuidad clinica").getByText("1 receta emitida en esta consulta.")).toBeVisible();
      await expect(page.getByText("Usar segun indicacion medica.")).toBeVisible();

      await page.getByLabel("Continuidad clinica").getByRole("link", { name: "Imprimir informe" }).click();
      await expect(page).toHaveURL(new RegExp(`/consultas/${createdConsultaId}/imprimir`));
      await expect(page.getByRole("heading", { name: "Informe clinico de consulta" })).toBeVisible();
      await expect(page.getByText(motivo).first()).toBeVisible();
      await expect(page.getByText("Receta Playwright desde consulta").first()).toBeVisible();
      await expect(page.getByText("Usar segun indicacion medica.").first()).toBeVisible();

      await page.goto(`/recetas/${createdRecetaId}?mode=view`);
      await expect(page).toHaveURL(new RegExp(`/recetas/${createdRecetaId}\\?mode=view`));
      await expect(page.getByText("Resumen de receta")).toBeVisible();
      await expect(page.getByText("Receta Playwright desde consulta").first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Imprimir receta" }).first()).toBeVisible();

      await page.getByRole("link", { name: "Imprimir receta" }).first().click();
      await expect(page).toHaveURL(new RegExp(`/recetas/${createdRecetaId}/imprimir`));
      await expect(page.getByRole("heading", { name: "Receta medica" })).toBeVisible();
      await expect(page.getByText("Receta Playwright desde consulta").first()).toBeVisible();
    } finally {
      if (createdRecetaId) {
        await request.delete(`${pocketBaseUrl(env)}/api/collections/recetas/records/${createdRecetaId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      }
      if (createdConsultaId) {
        await request.delete(`${pocketBaseUrl(env)}/api/collections/consultas/records/${createdConsultaId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      }
      await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, slot);
    }
  });
});

async function login(page: Page, email: string) {
  await page.goto("/");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.locator("aside")).toBeVisible();
}

async function getAdminToken(request: APIRequestContext, env: Record<string, string>) {
  const baseURL = pocketBaseUrl(env);
  const body = {
    identity: env.POCKETBASE_ADMIN_EMAIL,
    password: env.POCKETBASE_ADMIN_PASSWORD,
  };

  let response = await request.post(`${baseURL}/api/collections/_superusers/auth-with-password`, { data: body });
  if (!response.ok()) {
    response = await request.post(`${baseURL}/api/admins/auth-with-password`, { data: body });
  }

  expect(response.ok()).toBeTruthy();
  return (await response.json()).token as string;
}

async function getUserToken(request: APIRequestContext, env: Record<string, string>, email: string) {
  const response = await request.post(`${pocketBaseUrl(env)}/api/collections/users/auth-with-password`, {
    data: {
      identity: email,
      password: DEMO_PASSWORD,
    },
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()).token as string;
}

async function getUserIdByEmail(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  email: string
) {
  const result = await pbList(request, env, token, "users", `email = "${email}"`);
  expect(result.items.length).toBeGreaterThan(0);
  return result.items[0].id as string;
}

async function findDemoPatient(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  document: string
) {
  const result = await pbList(request, env, token, "pacientes", `numero_documento = "${document}"`);
  return result.items[0] || null;
}

async function findDemoAppointment(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  medicoId: string,
  motivo: string,
  slot = DEMO_SLOT,
  estado?: string
) {
  const statusFilter = estado ? ` && estado = "${estado}"` : "";
  const result = await pbList(
    request,
    env,
    token,
    "turnos",
    `medico_id = "${medicoId}" && fecha_hora = "${demoSlotIso(slot).replace("T", " ")}" && motivo = "${motivo}"${statusFilter}`
  );
  return result.items[0] || null;
}

async function findDemoAppointmentEvents(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  medicoId: string,
  motivo: string,
  slot = DEMO_SLOT,
  tipo?: string
) {
  const appointment = await findDemoAppointment(request, env, token, medicoId, motivo, slot);
  if (!appointment) return [];

  const typeFilter = tipo ? ` && tipo = "${tipo}"` : "";
  const result = await pbList(
    request,
    env,
    token,
    "turno_eventos",
    `turno_id = "${appointment.id}"${typeFilter}`
  );
  return result.items;
}

async function createDemoPatient(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  data: Record<string, string>
) {
  const response = await request.post(`${pocketBaseUrl(env)}/api/collections/pacientes/records`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Record<string, string>>;
}

async function createDemoAppointment(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  medicoId: string,
  patientId: string,
  motivo: string,
  slot = DEMO_SLOT,
  estado = "En espera",
  availabilityStart = "09:00"
) {
  const availability = await pbList(
    request,
    env,
    token,
    "disponibilidades",
    `medico_id = "${medicoId}" && fecha_hora_inicio = "${demoSlotIso(availabilityStart).replace("T", " ")}"`
  );
  const response = await request.post(`${pocketBaseUrl(env)}/api/collections/turnos/records`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      paciente_id: patientId,
      medico_id: medicoId,
      disponibilidad_id: availability.items[0]?.id,
      fecha_hora: demoSlotIso(slot),
      motivo,
      observaciones: "",
      estado,
      tipo: "Consulta",
      duracion: 15,
      es_sobreturno: false,
      sobreturno_tipo: "",
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createRawDemoAppointment(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  medicoId: string,
  patientId: string,
  motivo: string
) {
  const response = await request.post(`${pocketBaseUrl(env)}/api/collections/turnos/records`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      paciente_id: patientId,
      medico_id: medicoId,
      fecha_hora: new Date(`${DEMO_DATE}T11:30:00`).toISOString(),
      motivo,
      observaciones: "",
      estado: "En espera",
      tipo: "Consulta",
      duracion: 15,
      es_sobreturno: false,
      sobreturno_tipo: "",
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Record<string, string>>;
}

async function createDemoConsultation(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  patientId: string,
  motivo: string
) {
  const response = await request.post(`${pocketBaseUrl(env)}/api/collections/consultas/records`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      paciente_id: patientId,
      fecha: new Date(`${DEMO_DATE}T12:00:00`).toISOString(),
      motivo_consulta: motivo,
      diagnostico: "Control de fusion Playwright",
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Record<string, string>>;
}

async function createDemoPrescription(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  patientId: string,
  consultationId: string,
  medicamentos: string
) {
  const response = await request.post(`${pocketBaseUrl(env)}/api/collections/recetas/records`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      paciente_id: patientId,
      consulta_id: consultationId,
      fecha: new Date(`${DEMO_DATE}T12:00:00`).toISOString(),
      medicamentos,
      indicaciones: "Uso de prueba",
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Record<string, string>>;
}

async function cleanupDemoAppointment(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  medicoId: string,
  motivo?: string,
  slot = DEMO_SLOT
) {
  const filter = motivo
    ? `medico_id = "${medicoId}" && fecha_hora = "${demoSlotIso(slot).replace("T", " ")}" && motivo = "${motivo}"`
    : `medico_id = "${medicoId}" && fecha_hora = "${demoSlotIso(slot).replace("T", " ")}" && motivo ~ "Playwright"`;
  const result = await pbList(request, env, token, "turnos", filter);

  for (const item of result.items) {
    const events = await pbList(request, env, token, "turno_eventos", `turno_id = "${item.id}"`);
    for (const event of events.items) {
      await request.delete(`${pocketBaseUrl(env)}/api/collections/turno_eventos/records/${event.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    await request.delete(`${pocketBaseUrl(env)}/api/collections/turnos/records/${item.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

async function cleanupCreatedRecords(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  created: { turnos: string[]; consultas: string[]; recetas: string[]; pacientes: string[] }
) {
  for (const id of created.recetas) {
    await request.delete(`${pocketBaseUrl(env)}/api/collections/recetas/records/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  for (const id of created.turnos) {
    await request.delete(`${pocketBaseUrl(env)}/api/collections/turnos/records/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  for (const id of created.consultas) {
    await request.delete(`${pocketBaseUrl(env)}/api/collections/consultas/records/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  for (const id of created.pacientes) {
    await request.delete(`${pocketBaseUrl(env)}/api/collections/pacientes/records/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

async function cleanupDemoPatient(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  document: string
) {
  const result = await pbList(request, env, token, "pacientes", `numero_documento = "${document}"`);

  for (const item of result.items) {
    await request.delete(`${pocketBaseUrl(env)}/api/collections/pacientes/records/${item.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

async function pbGet(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  collection: string,
  id: string
) {
  const response = await request.get(`${pocketBaseUrl(env)}/api/collections/${collection}/records/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Record<string, string>>;
}

async function updateDemoPatient(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  patientId: string,
  data: Record<string, string>
) {
  const response = await request.patch(`${pocketBaseUrl(env)}/api/collections/pacientes/records/${patientId}`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  expect(response.ok()).toBeTruthy();
}

async function pbList(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  collection: string,
  filter: string
) {
  const params = new URLSearchParams({ page: "1", perPage: "50", filter });
  const response = await request.get(`${pocketBaseUrl(env)}/api/collections/${collection}/records?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ items: Array<Record<string, string>> }>;
}

function demoSlotIso(slot = DEMO_SLOT) {
  return new Date(`${DEMO_DATE}T${slot}:00`).toISOString();
}

function pocketBaseUrl(env: Record<string, string>) {
  const url = (env.POCKETBASE_URL || env.NEXT_PUBLIC_POCKETBASE_URL || "").trim();
  if (!url) return "";

  const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return withProtocol.replace(/\/+$/, "");
}

function loadTestEnv() {
  return loadEnv(process.env.PLAYWRIGHT_ENV_FILE || ".env.local");
}

function assertTestingPocketBase(env: Record<string, string>) {
  if (process.env.REQUIRE_TEST_POCKETBASE !== "true") return;
  if (process.env.ALLOW_PRODUCTION_PB_FOR_TESTS === "true") return;

  const url = pocketBaseUrl(env).toLowerCase();
  expect(url, "Configura una URL de PocketBase de testing antes de ejecutar Playwright").toBeTruthy();
  expect(
    TEST_PB_MARKERS.some((marker) => url.includes(marker)),
    `La URL de PocketBase no parece ser de testing: ${url}`
  ).toBeTruthy();
}

function loadEnv(path: string) {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value) result[key] = value;
  }

  if (!fs.existsSync(path)) return result;

  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}
