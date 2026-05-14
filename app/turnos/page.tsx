"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ACTIVE_ROLE_CHANGED_EVENT, resolveActiveRole } from "@/lib/active-role";
import type { UserRole } from "@/lib/permissions";
import { createTurnoEvento, type TurnoEvento } from "@/lib/turno-eventos";
import { formatDate } from "@/lib/utils";
import { ACTIVE_PATIENT_FILTER } from "@/lib/patient-merge";
import { consultaEstadoBadgeClass, consultaEstadoLabel } from "@/lib/consulta-estado";
import {
  blockAppliesToSlot,
  findConflictingAppointments,
  generateRecurringSlotsForDate,
  type GeneratedScheduleSlot,
  type ScheduleBlock,
  type WeeklyScheduleRule,
} from "@/lib/agenda-recurrente";

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  tipo_documento?: string;
  dni?: string;
  numero_documento?: string;
  telefono?: string;
  email?: string;
  obra_social?: string;
  numero_afiliado?: string;
  domicilio?: string;
  numero_ficha?: string;
  estado_registro?: string;
  fusionado_en_paciente_id?: string;
}

interface PatientDuplicateCandidate extends Paciente {
  matchReasons: string[];
}

interface PatientDuplicateLookupInput {
  nombre?: string;
  apellido?: string;
  dni?: string;
  numero_documento?: string;
  telefono?: string;
  numero_ficha?: string;
}

interface QuickNewPatientState {
  isOpen: boolean;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  obra_social: string;
  error: string;
  isSaving: boolean;
  duplicateCandidates: PatientDuplicateCandidate[];
  isCheckingDuplicates: boolean;
  duplicateError: string;
}

interface Turno {
  id: string;
  paciente_id: string;
  medico_id?: string;
  fecha_hora: string;
  motivo: string;
  observaciones?: string;
  estado?: string;
  consulta_id?: string;
  disponibilidad_id?: string;
  tipo?: string;
  duracion?: number;
  es_sobreturno?: boolean;
  sobreturno_tipo?: "consulta" | "estudio" | "cirugía";
  expand?: {
    paciente_id: Paciente;
    medico_id?: Medico;
  };
}

interface Disponibilidad {
  id: string;
  medico_id?: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  tipo: "Consulta" | "Estudio" | "Cirugía";
  expand?: {
    medico_id?: Medico;
  };
}

interface AgendaSemanalMedico extends WeeklyScheduleRule {
  expand?: {
    medico_id?: Medico;
  };
}

interface BloqueoAgenda extends ScheduleBlock {
  expand?: {
    medico_id?: Medico;
  };
}

interface Medico {
  id: string;
  name?: string;
  email?: string;
}

interface AppUser {
  id?: string;
  name?: string;
  email?: string;
  role?: UserRole;
  roles?: UserRole[];
}

interface ConsultaResumen {
  id: string;
  fecha?: string;
  estado?: string;
  motivo_consulta?: string;
  diagnostico?: string;
}

interface ConsultaEnCurso extends ConsultaResumen {
  paciente_id?: string;
  expand?: {
    paciente_id?: Paciente;
  };
}

interface PatientQuickCardForm {
  nombre: string;
  apellido: string;
  tipo_documento: string;
  numero_documento: string;
  telefono: string;
  email: string;
  obra_social: string;
  numero_afiliado: string;
  domicilio: string;
  numero_ficha: string;
}

type ViewMode = "list" | "weekly" | "daily" | "availability" | "waiting-room";
type AppointmentModalTab = "datos" | "reprogramar" | "cancelacion" | "historial";
type DailyOperationFilter = "all" | "waiting" | "inConsultation" | "attended" | "absent" | "overbooking" | "late";
type WaitingRoomGroupKey = "upcoming" | "waiting" | "inConsultation" | "attended" | "absent" | "canceled";

interface PendingStatusChange {
  turnoId: string;
  nuevoEstado: string;
  motivo: string;
  isSaving: boolean;
  error: string;
}

interface QuickAppointmentState {
  disponibilidad: Disponibilidad;
  fechaHora: Date;
  mode: "regular" | "overbooking";
  referenceAppointment?: Turno;
  paciente_id: string;
  pacienteSearch: string;
  patientResults: Paciente[];
  motivo: string;
  observaciones: string;
  duracion: string;
  sobreturno_tipo: "Urgencia" | "Control";
  error: string;
  isSaving: boolean;
  isSearching: boolean;
}

interface QuickAppointmentSuccess {
  patientLabel: string;
  doctorLabel: string;
  dateLabel: string;
  timeLabel: string;
  modeLabel: string;
  motivo: string;
}

interface PatientQuickCardState {
  isOpen: boolean;
  pacienteId: string;
  paciente: Paciente | null;
  form: PatientQuickCardForm;
  turnos: Turno[];
  consultas: ConsultaResumen[];
  isLoading: boolean;
  isSaving: boolean;
  error: string;
  success: string;
  duplicateCandidates: PatientDuplicateCandidate[];
  isCheckingDuplicates: boolean;
  duplicateError: string;
}

interface AvailabilitySlot {
  start: Date;
  end: Date;
  appointment?: Turno;
  block?: ScheduleBlock;
}

interface RescheduleState {
  isOpen: boolean;
  fecha: string;
  medico_id: string;
  disponibilidad_id: string;
  slotIso: string;
  error: string;
  isSaving: boolean;
}

const ESTADOS = [
  "En espera",
  "En consulta",
  "Atendido",
  "Ausente",
  "Atrasado",
  "Quiere adelantarlo",
  "Cancelado",
  "No llegó"
];

const TERMINAL_APPOINTMENT_STATES = ["Cancelado", "Atendido", "Ausente", "completado"];

const isActiveAppointment = (turno: { estado?: string }) =>
  !turno.estado || !TERMINAL_APPOINTMENT_STATES.includes(turno.estado);

const emptyPatientQuickCardForm = (): PatientQuickCardForm => ({
  nombre: "",
  apellido: "",
  tipo_documento: "DNI",
  numero_documento: "",
  telefono: "",
  email: "",
  obra_social: "",
  numero_afiliado: "",
  domicilio: "",
  numero_ficha: "",
});

const emptyQuickNewPatientState = (): QuickNewPatientState => ({
  isOpen: false,
  nombre: "",
  apellido: "",
  dni: "",
  telefono: "",
  obra_social: "",
  error: "",
  isSaving: false,
  duplicateCandidates: [],
  isCheckingDuplicates: false,
  duplicateError: "",
});

const initialPatientQuickCardState = (): PatientQuickCardState => ({
  isOpen: false,
  pacienteId: "",
  paciente: null,
  form: emptyPatientQuickCardForm(),
  turnos: [],
  consultas: [],
  isLoading: false,
  isSaving: false,
  error: "",
  success: "",
  duplicateCandidates: [],
  isCheckingDuplicates: false,
  duplicateError: "",
});

const DAILY_OPERATION_FILTERS: Array<{ key: DailyOperationFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "waiting", label: "En espera" },
  { key: "inConsultation", label: "En consulta" },
  { key: "attended", label: "Atendidos" },
  { key: "absent", label: "Ausentes" },
  { key: "overbooking", label: "Sobreturnos" },
  { key: "late", label: "Atrasados" },
];

const WAITING_ROOM_GROUPS: Array<{ key: WaitingRoomGroupKey; title: string; empty: string }> = [
  { key: "upcoming", title: "Proximos", empty: "No hay pacientes pendientes." },
  { key: "waiting", title: "En espera", empty: "No hay pacientes esperando." },
  { key: "inConsultation", title: "En consulta", empty: "No hay pacientes en consulta." },
  { key: "attended", title: "Atendidos", empty: "No hay turnos atendidos." },
  { key: "absent", title: "Ausentes", empty: "No hay pacientes marcados ausentes." },
  { key: "canceled", title: "Cancelados", empty: "No hay turnos cancelados." },
];

const WAITING_ROOM_ACTIONS = [
  { label: "Llego", estado: "En espera" },
  { label: "En consulta", estado: "En consulta" },
  { label: "Atendido", estado: "Atendido" },
  { label: "Ausente", estado: "Ausente" },
  { label: "Cancelar", estado: "Cancelado" },
];

const getEstadoColor = (estado?: string) => {
  if (!estado) return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400';
  switch(estado) {
    case 'En espera': return 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100';
    case 'En consulta': return 'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-100';
    case 'Atendido': return 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100';
    case 'Ausente': return 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100';
    case 'Atrasado': return 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700 text-orange-900 dark:text-orange-100';
    case 'Quiere adelantarlo': return 'bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-100';
    case 'Cancelado': return 'bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-900 text-red-900 dark:text-red-200';
    case 'No llegó': return 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100';
    // Fallback for old states
    case 'pendiente': return 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100';
    case 'completado': return 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700 text-green-900 dark:text-green-100';
    default: return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100';
  }
};

export default function TurnosPage() {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [selectedMedicoId, setSelectedMedicoId] = useState("all");
  const [isMounted, setIsMounted] = useState(false);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [agendaSemanal, setAgendaSemanal] = useState<AgendaSemanalMedico[]>([]);
  const [bloqueosAgenda, setBloqueosAgenda] = useState<BloqueoAgenda[]>([]);
  const [consultasEnCurso, setConsultasEnCurso] = useState<ConsultaEnCurso[]>([]);
  const [isLoadingConsultasEnCurso, setIsLoadingConsultasEnCurso] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Vistas
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");

  // Filtros
  const [filterPatient, setFilterPatient] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [dailyOperationFilter, setDailyOperationFilter] = useState<DailyOperationFilter>("all");

  // Modal de acciones de turno
  const [selectedTurno, setSelectedTurno] = useState<Turno | null>(null);
  const [isTurnoModalOpen, setIsTurnoModalOpen] = useState(false);
  const [editMotivo, setEditMotivo] = useState("");
  const [editObservaciones, setEditObservaciones] = useState("");
  const [editEstado, setEditEstado] = useState("");
  const [appointmentModalTab, setAppointmentModalTab] = useState<AppointmentModalTab>("datos");
  const [cancelReason, setCancelReason] = useState("");
  const [reschedule, setReschedule] = useState<RescheduleState>({
    isOpen: false,
    fecha: "",
    medico_id: "",
    disponibilidad_id: "",
    slotIso: "",
    error: "",
    isSaving: false,
  });
  const [isSavingTurno, setIsSavingTurno] = useState(false);
  const [appointmentEvents, setAppointmentEvents] = useState<TurnoEvento[]>([]);
  const [isLoadingAppointmentEvents, setIsLoadingAppointmentEvents] = useState(false);
  const [appointmentEventError, setAppointmentEventError] = useState("");
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);

  // Gestion de disponibilidades
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
  const [availabilityForm, setAvailabilityForm] = useState({
    medico_id: "",
    fecha: "",
    hora_inicio: "",
    hora_fin: "",
    tipo: "Consulta",
  });
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  // Modal de impresión
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printDate, setPrintDate] = useState("");
  const [printMedicoId, setPrintMedicoId] = useState("all");
  const [printFields, setPrintFields] = useState({
    hora: true,
    paciente: true,
    dni: true,
    telefono: true,
    obra_social: true,
    tipo: true,
    motivo: true,
    estado: true,
    observaciones: true
  });
  const [quickAppointment, setQuickAppointment] = useState<QuickAppointmentState | null>(null);
  const [quickNewPatient, setQuickNewPatient] = useState<QuickNewPatientState>(emptyQuickNewPatientState);
  const [quickPatientDayAppointments, setQuickPatientDayAppointments] = useState<Turno[]>([]);
  const [isLoadingQuickPatientAppointments, setIsLoadingQuickPatientAppointments] = useState(false);
  const [quickWarningsAcknowledged, setQuickWarningsAcknowledged] = useState(false);
  const [quickAppointmentSuccess, setQuickAppointmentSuccess] = useState<QuickAppointmentSuccess | null>(null);
  const [patientQuickCard, setPatientQuickCard] = useState<PatientQuickCardState>(initialPatientQuickCardState);

  const handleTurnoClick = (turno: Turno, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTurno(turno);
    setEditMotivo(turno.motivo || "");
    setEditObservaciones(turno.observaciones || "");
    setEditEstado(turno.estado || "");
    setAppointmentModalTab("datos");
    setCancelReason("");
    setReschedule({
      isOpen: false,
      fecha: localDateValue(new Date(turno.fecha_hora)),
      medico_id: turno.medico_id || "",
      disponibilidad_id: "",
      slotIso: "",
      error: "",
      isSaving: false,
    });
    setIsTurnoModalOpen(true);
    loadTurnoEventos(turno.id);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);

    if (mode === "availability") {
      window.history.replaceState(null, "", "/turnos?tab=availability");
      return;
    }

    if (window.location.pathname === "/turnos" && window.location.search) {
      window.history.replaceState(null, "", "/turnos");
    }
  };

  const doctorLabel = (doctor?: Medico | null) => {
    if (!doctor) return "Sin medico asignado";
    return doctor.name || doctor.email || "Medico";
  };

  const doctorFor = (record: { medico_id?: string; expand?: { medico_id?: Medico } }) => {
    return record.expand?.medico_id || medicos.find((medico) => medico.id === record.medico_id) || null;
  };

  const isDoctorRole = activeRole === "medico";
  const canChooseDoctor = activeRole !== "medico";
  const newTurnoHref = selectedMedicoId === "all" ? "/turnos/nuevo" : `/turnos/nuevo?medico_id=${selectedMedicoId}`;

  const applyActiveRole = (role: UserRole | null, authUser: AppUser | null) => {
    setActiveRole(role);

    if (role === "medico" && authUser?.id) {
      setSelectedMedicoId(authUser.id);
      setAvailabilityForm((prev) => ({ ...prev, medico_id: authUser.id || "" }));
      setViewMode("daily");
      return;
    }

    setSelectedMedicoId("all");
    setAvailabilityForm((prev) => ({ ...prev, medico_id: "" }));
  };

  const closeTurnoModal = () => {
    setIsTurnoModalOpen(false);
    setSelectedTurno(null);
    setAppointmentModalTab("datos");
    setCancelReason("");
    setAppointmentEvents([]);
    setAppointmentEventError("");
    resetReschedule();
  };

  const patientDocument = (patient?: Paciente | null) => patient?.dni || patient?.numero_documento || "";
  const patientLabel = (patient?: Paciente | null) => {
    if (!patient) return "Paciente";
    const document = patientDocument(patient);
    return `${patient.apellido}, ${patient.nombre}${document ? ` (DNI ${document})` : ""}`;
  };
  const patientMeta = (patient?: Paciente | null) => {
    if (!patient) return [];
    return [
      patientDocument(patient) ? `DNI ${patientDocument(patient)}` : "",
      patient.telefono ? `Tel ${patient.telefono}` : "",
      patient.obra_social || "",
    ].filter(Boolean);
  };

  const patientDuplicateMeta = (patient?: Paciente | null) => {
    if (!patient) return [];
    return [
      patientDocument(patient) ? `DNI ${patientDocument(patient)}` : "",
      patient?.telefono ? `Tel ${patient.telefono}` : "",
      patient?.numero_ficha ? `Ficha ${patient.numero_ficha}` : "",
      patient?.obra_social || "",
    ].filter(Boolean);
  };

  const normalizeDuplicateText = (value?: string) =>
    (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const compactDuplicateText = (value?: string) => normalizeDuplicateText(value).replace(/[^a-z0-9]/g, "");

  const isSameDuplicateValue = (left?: string, right?: string) => {
    const normalizedLeft = compactDuplicateText(left);
    const normalizedRight = compactDuplicateText(right);
    return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
  };

  const hasSimilarText = (left?: string, right?: string, minLength = 3) => {
    const normalizedLeft = normalizeDuplicateText(left);
    const normalizedRight = normalizeDuplicateText(right);
    if (normalizedLeft.length < minLength || normalizedRight.length < minLength) return false;
    return normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
  };

  const hasDuplicateLookupSignal = (input: PatientDuplicateLookupInput) =>
    compactDuplicateText(input.dni || input.numero_documento).length >= 5 ||
    compactDuplicateText(input.telefono).length >= 6 ||
    compactDuplicateText(input.numero_ficha).length >= 2 ||
    normalizeDuplicateText(input.apellido).length >= 3;

  const buildDuplicatePatientFilter = (input: PatientDuplicateLookupInput, excludePatientId?: string) => {
    const clauses: string[] = [];
    const document = (input.numero_documento || input.dni || "").trim();
    const phone = (input.telefono || "").trim();
    const fileNumber = (input.numero_ficha || "").trim();
    const lastName = (input.apellido || "").trim();
    const firstName = (input.nombre || "").trim();

    if (compactDuplicateText(document).length >= 5) {
      const safeDocument = escapePocketBaseFilter(document);
      clauses.push(`numero_documento = "${safeDocument}"`);
    }
    if (compactDuplicateText(phone).length >= 6) {
      clauses.push(`telefono = "${escapePocketBaseFilter(phone)}"`);
    }
    if (compactDuplicateText(fileNumber).length >= 2) {
      clauses.push(`numero_ficha = "${escapePocketBaseFilter(fileNumber.toUpperCase())}"`);
    }
    if (normalizeDuplicateText(lastName).length >= 3 && normalizeDuplicateText(firstName).length >= 2) {
      clauses.push(`(apellido ~ "${escapePocketBaseFilter(lastName)}" && nombre ~ "${escapePocketBaseFilter(firstName)}")`);
    } else if (normalizeDuplicateText(lastName).length >= 3) {
      clauses.push(`apellido ~ "${escapePocketBaseFilter(lastName)}"`);
    }

    if (clauses.length === 0) return "";
    const baseFilter = `(${ACTIVE_PATIENT_FILTER}) && (${clauses.map((clause) => `(${clause})`).join(" || ")})`;
    return excludePatientId
      ? `(${baseFilter}) && id != "${escapePocketBaseFilter(excludePatientId)}"`
      : baseFilter;
  };

  const getDuplicateReasons = (patient: Paciente, input: PatientDuplicateLookupInput) => {
    const reasons: string[] = [];
    const document = input.numero_documento || input.dni || "";

    if (isSameDuplicateValue(patientDocument(patient), document)) reasons.push("Mismo documento");
    if (isSameDuplicateValue(patient.telefono, input.telefono)) reasons.push("Mismo telefono");
    if (isSameDuplicateValue(patient.numero_ficha, input.numero_ficha)) reasons.push("Misma ficha");
    if (hasSimilarText(patient.apellido, input.apellido) && (!input.nombre || hasSimilarText(patient.nombre, input.nombre, 2))) {
      reasons.push(input.nombre ? "Nombre parecido" : "Apellido parecido");
    }

    return Array.from(new Set(reasons));
  };

  const findPatientDuplicateCandidates = async (
    input: PatientDuplicateLookupInput,
    excludePatientId?: string
  ): Promise<PatientDuplicateCandidate[]> => {
    if (!hasDuplicateLookupSignal(input)) return [];

    const filter = buildDuplicatePatientFilter(input, excludePatientId);
    if (!filter) return [];

    const response = await pb.collection("pacientes").getList<Paciente>(1, 8, {
      filter,
      sort: "apellido,nombre",
      requestKey: null,
    });

    return response.items
      .filter((patient) => patient.id !== excludePatientId)
      .map((patient) => ({ ...patient, matchReasons: getDuplicateReasons(patient, input) }))
      .filter((patient) => patient.matchReasons.length > 0);
  };

  const renderDuplicateCandidates = (
    candidates: PatientDuplicateCandidate[],
    isChecking: boolean,
    error: string
  ) => {
    if (isChecking) {
      return (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200">
          Buscando posibles duplicados...
        </div>
      );
    }

    if (error) {
      return (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200">
          {error}
        </div>
      );
    }

    if (candidates.length === 0) return null;

    return (
      <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-900/20 dark:text-amber-100">
        <div className="font-semibold">Posibles pacientes duplicados</div>
        <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
          Revisa estas coincidencias antes de guardar. La operacion no se bloquea.
        </p>
        <div className="mt-2 space-y-2">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="rounded-md border border-amber-200 bg-white/70 px-2 py-2 dark:border-amber-900/60 dark:bg-zinc-950/40">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{candidate.apellido}, {candidate.nombre}</div>
                  <div className="mt-0.5 text-xs text-amber-800 dark:text-amber-200">
                    {patientDuplicateMeta(candidate).join(" - ") || "Sin datos administrativos"}
                  </div>
                  <div className="mt-1 text-xs font-medium text-amber-900 dark:text-amber-100">
                    {candidate.matchReasons.join(" - ")}
                  </div>
                </div>
                <Link
                  href={`/pacientes/${candidate.id}?mode=view`}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200"
                >
                  Ver ficha
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const patientQuickCardFormFromPatient = (patient: Paciente): PatientQuickCardForm => ({
    nombre: patient.nombre || "",
    apellido: patient.apellido || "",
    tipo_documento: patient.tipo_documento || "DNI",
    numero_documento: patientDocument(patient),
    telefono: patient.telefono || "",
    email: patient.email || "",
    obra_social: patient.obra_social || "",
    numero_afiliado: patient.numero_afiliado || "",
    domicilio: patient.domicilio || "",
    numero_ficha: patient.numero_ficha || "",
  });

  const shortTime = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const minutesBetween = (from: Date, to = new Date()) => Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60000));
  const waitingRoomTimeLabel = (turno: Turno) => {
    const appointmentDate = new Date(turno.fecha_hora);
    const diffMinutes = minutesBetween(appointmentDate);

    if (turno.estado === "Cancelado" || turno.estado === "Atendido" || turno.estado === "Ausente") return "";
    if (appointmentDate.getTime() > Date.now()) {
      const minutesUntil = Math.max(0, Math.ceil((appointmentDate.getTime() - Date.now()) / 60000));
      return minutesUntil <= 60 ? `En ${minutesUntil} min` : "";
    }
    if (turno.estado === "En espera") return diffMinutes > 0 ? `Espera desde horario: ${diffMinutes} min` : "Horario actual";
    if (turno.estado === "En consulta") return "En atencion";
    return diffMinutes > 0 ? `Atrasado ${diffMinutes} min` : "Horario actual";
  };
  const eventDateTime = (value: string) => new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const eventDateLabel = (value?: string) => value ? `${formatDate(new Date(value))} ${shortTime(new Date(value))}` : "";
  const isSensitiveStatus = (estado: string) => estado === "Ausente" || estado === "Cancelado";

  const escapePocketBaseFilter = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const addMinutes = (date: Date, minutes: number) => {
    const copy = new Date(date);
    copy.setMinutes(copy.getMinutes() + minutes);
    return copy;
  };

  const rangesOverlap = (startA: Date, endA: Date, startB: Date, endB: Date) => startA < endB && startB < endA;

  const localDateValue = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const resetReschedule = () => setReschedule({
    isOpen: false,
    fecha: "",
    medico_id: "",
    disponibilidad_id: "",
    slotIso: "",
    error: "",
    isSaving: false,
  });

  const openPrintModal = () => {
    // Si hay una fecha en el filtro, la usa por defecto, si no, usa la de hoy
    if (filterDate) {
      setPrintDate(filterDate);
    } else {
      const today = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      setPrintDate(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`);
    }
    setPrintMedicoId(canChooseDoctor ? selectedMedicoId : (user?.id || selectedMedicoId));
    setIsPrintModalOpen(true);
  };

  const loadTurnoEventos = async (turnoId: string) => {
    setIsLoadingAppointmentEvents(true);
    setAppointmentEventError("");
    try {
      const records = await pb.collection("turno_eventos").getFullList<TurnoEvento>({
        filter: `turno_id = "${escapePocketBaseFilter(turnoId)}"`,
        sort: "-created",
        requestKey: null,
      });
      setAppointmentEvents(records);
    } catch (error) {
      console.error("Error al cargar historial del turno:", error);
      setAppointmentEvents([]);
      setAppointmentEventError("No se pudo cargar el historial operativo.");
    } finally {
      setIsLoadingAppointmentEvents(false);
    }
  };

  const appendTurnoEvento = async (input: Parameters<typeof createTurnoEvento>[0]) => {
    const event = await createTurnoEvento({ ...input, actor: user });
    if (event && selectedTurno?.id === input.turno_id) {
      setAppointmentEvents((prev) => [event, ...prev]);
    }
    return event;
  };

  const openPatientQuickCard = async (pacienteId?: string, patientSeed?: Paciente | null) => {
    if (!pacienteId) return;

    setPatientQuickCard({
      ...initialPatientQuickCardState(),
      isOpen: true,
      pacienteId,
      paciente: patientSeed || null,
      form: patientSeed ? patientQuickCardFormFromPatient(patientSeed) : emptyPatientQuickCardForm(),
      isLoading: true,
    });

    try {
      const [paciente, turnosResponse, consultasResponse] = await Promise.all([
        pb.collection("pacientes").getOne<Paciente>(pacienteId, { requestKey: null }),
        pb.collection("turnos").getList<Turno>(1, 5, {
          filter: `paciente_id = "${escapePocketBaseFilter(pacienteId)}"`,
          sort: "-fecha_hora",
          expand: "medico_id",
          requestKey: null,
        }),
        pb.collection("consultas").getList<ConsultaResumen>(1, 5, {
          filter: `paciente_id = "${escapePocketBaseFilter(pacienteId)}"`,
          sort: "-fecha",
          requestKey: null,
        }),
      ]);

      setPatientQuickCard((prev) => ({
        ...prev,
        paciente,
        form: patientQuickCardFormFromPatient(paciente),
        turnos: turnosResponse.items,
        consultas: consultasResponse.items,
        isLoading: false,
        error: "",
      }));
    } catch (error) {
      console.error("Error al cargar ficha rapida del paciente:", error);
      setPatientQuickCard((prev) => ({
        ...prev,
        isLoading: false,
        error: "No se pudo cargar la ficha rapida del paciente.",
      }));
    }
  };

  const updatePatientQuickCardForm = (patch: Partial<PatientQuickCardForm>) => {
    setPatientQuickCard((prev) => ({ ...prev, form: { ...prev.form, ...patch }, error: "", success: "" }));
  };

  const closePatientQuickCard = () => setPatientQuickCard(initialPatientQuickCardState());

  const savePatientQuickCard = async () => {
    if (!patientQuickCard.pacienteId) return;

    const form = patientQuickCard.form;
    if (!form.nombre.trim() || !form.apellido.trim()) {
      setPatientQuickCard((prev) => ({ ...prev, error: "Completa apellido y nombre para guardar." }));
      return;
    }

    setPatientQuickCard((prev) => ({ ...prev, isSaving: true, error: "", success: "" }));
    try {
      const dataToSave = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        tipo_documento: form.tipo_documento.trim() || "DNI",
        numero_documento: form.numero_documento.trim(),
        dni: form.numero_documento.trim(),
        telefono: form.telefono.trim(),
        email: form.email.trim(),
        obra_social: form.obra_social.trim(),
        numero_afiliado: form.numero_afiliado.trim(),
        domicilio: form.domicilio.trim(),
        numero_ficha: form.numero_ficha.trim().toUpperCase(),
      };

      const updatedPatient = await pb.collection("pacientes").update<Paciente>(patientQuickCard.pacienteId, dataToSave, { requestKey: null });
      setTurnos((prev) => prev.map((turno) =>
        turno.paciente_id === updatedPatient.id
          ? { ...turno, expand: { ...turno.expand, paciente_id: updatedPatient } }
          : turno
      ));
      setSelectedTurno((prev) =>
        prev?.paciente_id === updatedPatient.id
          ? { ...prev, expand: { ...prev.expand, paciente_id: updatedPatient } }
          : prev
      );
      setPatientQuickCard((prev) => ({
        ...prev,
        paciente: updatedPatient,
        form: patientQuickCardFormFromPatient(updatedPatient),
        isSaving: false,
        success: "Datos del paciente actualizados.",
      }));
    } catch (error) {
      console.error("Error al guardar ficha rapida del paciente:", error);
      setPatientQuickCard((prev) => ({
        ...prev,
        isSaving: false,
        error: "No se pudieron guardar los cambios del paciente.",
      }));
    }
  };

  const completeStatusChange = async (id: string, nuevoEstado: string, motivo = "") => {
    const previousTurno = turnos.find((turno) => turno.id === id) || selectedTurno;
    const previousEstado = previousTurno?.estado || "";

    await pb.collection("turnos").update(id, { estado: nuevoEstado === "" ? null : nuevoEstado });
    setTurnos(prevTurnos => prevTurnos.map(t =>
      t.id === id
        ? { ...t, estado: nuevoEstado === "" ? "" : nuevoEstado }
        : t
    ));
    if (selectedTurno?.id === id) {
      setSelectedTurno((prev) => prev ? { ...prev, estado: nuevoEstado === "" ? "" : nuevoEstado } : prev);
      setEditEstado(nuevoEstado === "" ? "" : nuevoEstado);
    }

    const tipo = nuevoEstado === "Cancelado" ? "canceled" : "status_changed";
    await appendTurnoEvento({
      turno_id: id,
      tipo,
      titulo: nuevoEstado === "Cancelado" ? "Turno cancelado" : "Cambio de estado",
      detalle: motivo || `${previousEstado || "Sin estado"} -> ${nuevoEstado || "Sin estado"}`,
      estado_anterior: previousEstado,
      estado_nuevo: nuevoEstado,
    });
  };

  const handlePrint = () => {
    if (!printDate) return;
    const selectedFields = Object.entries(printFields)
      .filter(([, isSelected]) => isSelected)
      .map(([key]) => key)
      .join(",");

    // Abrir en nueva pestaña
    const params = new URLSearchParams({
      date: printDate,
      fields: selectedFields,
      medico_id: printMedicoId || "all",
    });

    window.open(`/turnos/imprimir?${params.toString()}`, '_blank');
    setIsPrintModalOpen(false);
  };

  const openQuickAppointment = (
    disponibilidad: Disponibilidad,
    fechaHora = new Date(disponibilidad.fecha_hora_inicio),
    mode: QuickAppointmentState["mode"] = "regular",
    referenceAppointment?: Turno
  ) => {
    setQuickAppointmentSuccess(null);
    setQuickAppointment({
      disponibilidad,
      fechaHora,
      mode,
      referenceAppointment,
      paciente_id: "",
      pacienteSearch: "",
      patientResults: [],
      motivo: "",
      observaciones: "",
      duracion: disponibilidad.tipo === "Consulta" ? "15" : "60",
      sobreturno_tipo: "Control",
      error: "",
      isSaving: false,
      isSearching: false,
    });
    setQuickPatientDayAppointments([]);
    setQuickWarningsAcknowledged(false);
    setQuickNewPatient(emptyQuickNewPatientState());
  };

  const updateQuickAppointment = (patch: Partial<QuickAppointmentState>) => {
    setQuickAppointment((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const selectedQuickPatient = quickAppointment?.patientResults.find((patient) => patient.id === quickAppointment.paciente_id) || null;
  const quickPatientSearchTerm = quickAppointment?.pacienteSearch.trim() || "";
  const quickShowNoPatientResults = Boolean(
    quickAppointment &&
    quickPatientSearchTerm.length >= 2 &&
    !quickAppointment.paciente_id &&
    !quickAppointment.isSearching &&
    quickAppointment.patientResults.length === 0
  );
  const quickActivePatientAppointments = quickPatientDayAppointments.filter(isActiveAppointment);
  const quickSameDoctorActiveAppointments = quickAppointment
    ? quickActivePatientAppointments.filter((turno) => turno.medico_id === quickAppointment.disponibilidad.medico_id)
    : [];
  const quickNeedsConflictConfirmation = quickActivePatientAppointments.length > 0;

  const updateQuickNewPatient = (patch: Partial<QuickNewPatientState>) => {
    setQuickNewPatient((prev) => ({ ...prev, ...patch }));
  };

  const createQuickPatient = async () => {
    const nombre = quickNewPatient.nombre.trim();
    const apellido = quickNewPatient.apellido.trim();
    const dni = quickNewPatient.dni.trim();
    const telefono = quickNewPatient.telefono.trim();
    const obraSocial = quickNewPatient.obra_social.trim();

    if (!nombre || !apellido) {
      updateQuickNewPatient({ error: "Completa apellido y nombre." });
      return;
    }

    updateQuickNewPatient({ isSaving: true, error: "" });
    try {
      if (dni) {
        const safeDni = escapePocketBaseFilter(dni);
        const existing = await pb.collection("pacientes").getList<Paciente>(1, 1, {
          filter: `${ACTIVE_PATIENT_FILTER} && numero_documento = "${safeDni}"`,
          requestKey: null,
        });

        if (existing.items.length > 0) {
          updateQuickNewPatient({ error: "Ya existe un paciente registrado con este DNI.", isSaving: false });
          return;
        }
      }

      const record = await pb.collection("pacientes").create<Paciente>({
        nombre,
        apellido,
        numero_documento: dni,
        telefono,
        obra_social: obraSocial,
      });

      updateQuickAppointment({
        paciente_id: record.id,
        pacienteSearch: patientLabel(record),
        patientResults: [record, ...(quickAppointment?.patientResults || []).filter((patient) => patient.id !== record.id)],
        error: "",
      });
      setQuickWarningsAcknowledged(false);
      setQuickNewPatient(emptyQuickNewPatientState());
    } catch (error) {
      console.error("Error al crear paciente desde turno rapido:", error);
      updateQuickNewPatient({ error: "No se pudo crear el paciente.", isSaving: false });
    }
  };

  const saveQuickAppointment = async () => {
    if (!quickAppointment) return;

    const disponibilidad = quickAppointment.disponibilidad;
    const medicoId = disponibilidad.medico_id;
    const duration = Math.max(parseInt(quickAppointment.duracion, 10) || 15, 1);
    const start = quickAppointment.fechaHora;
    const end = addMinutes(start, duration);

    if (!medicoId) {
      updateQuickAppointment({ error: "La disponibilidad no tiene medico asignado." });
      return;
    }

    if (!quickAppointment.paciente_id) {
      updateQuickAppointment({ error: "Selecciona un paciente." });
      return;
    }

    if (!quickAppointment.motivo.trim()) {
      updateQuickAppointment({ error: "Indica el motivo del turno." });
      return;
    }

    if (quickNeedsConflictConfirmation && !quickWarningsAcknowledged) {
      updateQuickAppointment({ error: "Revisa y confirma las advertencias del paciente antes de guardar." });
      return;
    }

    const overlapsExisting = quickAppointment.mode === "regular" && turnos.some((turno) => {
      if (turno.medico_id !== medicoId) return false;
      const existingStart = new Date(turno.fecha_hora);
      if (dateKey(existingStart) !== dateKey(start)) return false;
      const existingEnd = addMinutes(existingStart, turno.duracion || 15);
      return rangesOverlap(start, end, existingStart, existingEnd);
    });

    if (quickAppointment.mode === "regular" && overlapsExisting) {
      updateQuickAppointment({ error: "Ese horario se superpone con otro turno. Usa el formulario completo si necesitas cargar un caso excepcional." });
      return;
    }

    updateQuickAppointment({ isSaving: true, error: "" });
    try {
      const disponibilidadId = isRecurringAvailability(disponibilidad) ? "" : disponibilidad.id;
      const turnoPayload: Record<string, unknown> = {
        paciente_id: quickAppointment.paciente_id,
        medico_id: medicoId,
        fecha_hora: start.toISOString(),
        motivo: quickAppointment.motivo.trim(),
        observaciones: quickAppointment.observaciones.trim(),
        estado: "En espera",
        tipo: disponibilidad.tipo,
        duracion: duration,
        es_sobreturno: quickAppointment.mode === "overbooking",
        sobreturno_tipo: quickAppointment.mode === "overbooking" ? quickAppointment.sobreturno_tipo : "",
      };
      if (disponibilidadId) {
        turnoPayload.disponibilidad_id = disponibilidadId;
      }

      const record = await pb.collection("turnos").create<Turno>(turnoPayload);

      const selectedPatient = selectedQuickPatient || quickAppointment.patientResults.find((patient) => patient.id === quickAppointment.paciente_id);
      const doctor = medicos.find((medico) => medico.id === medicoId) || disponibilidad.expand?.medico_id;
      await appendTurnoEvento({
        turno_id: record.id,
        tipo: "created",
        titulo: quickAppointment.mode === "overbooking" ? "Sobreturno creado" : "Turno creado",
        detalle: `${patientLabel(selectedPatient)} · ${doctorLabel(doctor)} · ${formatDate(start)} ${shortTime(start)}`,
        estado_nuevo: "En espera",
        fecha_hora_nueva: start,
        metadata: {
          paciente_id: quickAppointment.paciente_id,
          medico_id: medicoId,
          disponibilidad_id: disponibilidadId || null,
          motivo: quickAppointment.motivo.trim(),
          modo: quickAppointment.mode,
        },
      });
      const recordWithExpand = {
        ...record,
        expand: {
          paciente_id: selectedPatient as Paciente,
          medico_id: doctor,
        },
      };
      setTurnos((prev) => {
        const exists = prev.some((turno) => turno.id === record.id);
        const next = exists
          ? prev.map((turno) => turno.id === record.id ? { ...turno, ...recordWithExpand } : turno)
          : [...prev, recordWithExpand];

        return next.sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
      });
      setQuickAppointmentSuccess({
        patientLabel: patientLabel(selectedPatient),
        doctorLabel: doctorLabel(doctor),
        dateLabel: formatDate(start),
        timeLabel: shortTime(start),
        modeLabel: quickAppointment.mode === "overbooking" ? "Sobreturno" : "Turno",
        motivo: quickAppointment.motivo.trim(),
      });
      setQuickAppointment(null);
    } catch (error) {
      console.error("Error al crear turno rapido:", error);
      updateQuickAppointment({ error: "No se pudo crear el turno rapido.", isSaving: false });
    }
  };

  const handleSaveTurnoChanges = async () => {
    if (!selectedTurno) return;
    const nextEstado = editEstado === "" ? "" : editEstado;
    const previousEstado = selectedTurno.estado || "";
    let sensitiveReason = "";

    if (nextEstado !== previousEstado && isSensitiveStatus(nextEstado)) {
      sensitiveReason = window.prompt(`Indica el motivo para marcar el turno como ${nextEstado}:`)?.trim() || "";
      if (!sensitiveReason) {
        alert("Indica el motivo para continuar.");
        return;
      }
    }

    const changedFields = [
      editMotivo !== (selectedTurno.motivo || "") ? "motivo" : "",
      editObservaciones !== (selectedTurno.observaciones || "") ? "observaciones" : "",
      nextEstado !== previousEstado ? "estado" : "",
    ].filter(Boolean);

    setIsSavingTurno(true);
    try {
      await pb.collection("turnos").update(selectedTurno.id, {
        motivo: editMotivo,
        observaciones: editObservaciones,
        estado: nextEstado === "" ? null : nextEstado
      });

      // Update local state to reflect changes immediately
      setTurnos(prevTurnos => prevTurnos.map(t =>
        t.id === selectedTurno.id
          ? { ...t, motivo: editMotivo, observaciones: editObservaciones, estado: nextEstado }
          : t
      ));
      setSelectedTurno((prev) => prev ? { ...prev, motivo: editMotivo, observaciones: editObservaciones, estado: nextEstado } : prev);

      if (changedFields.length > 0) {
        await appendTurnoEvento({
          turno_id: selectedTurno.id,
          tipo: nextEstado === "Cancelado" ? "canceled" : nextEstado !== previousEstado ? "status_changed" : "updated",
          titulo: nextEstado !== previousEstado ? "Cambio de estado" : "Datos del turno actualizados",
          detalle: sensitiveReason || `Campos modificados: ${changedFields.join(", ")}`,
          estado_anterior: previousEstado,
          estado_nuevo: nextEstado,
          metadata: { campos: changedFields },
        });
      }

      closeTurnoModal();
    } catch (error) {
      console.error("Error al guardar cambios del turno:", error);
      alert("Hubo un error al guardar los cambios.");
    } finally {
      setIsSavingTurno(false);
    }
  };

  const handleCancelTurno = async () => {
    if (!selectedTurno) return;

    const reason = cancelReason.trim();
    if (!reason) {
      alert("Indica el motivo de cancelacion.");
      return;
    }

    const cancelNote = `[Cancelado ${new Date().toLocaleString()}] ${reason}`;
    const nextObservaciones = editObservaciones.trim()
      ? `${editObservaciones.trim()}\n${cancelNote}`
      : cancelNote;

    setIsSavingTurno(true);
    try {
      await pb.collection("turnos").update(selectedTurno.id, {
        estado: "Cancelado",
        observaciones: nextObservaciones,
      });

      setTurnos((prevTurnos) => prevTurnos.map((turno) =>
        turno.id === selectedTurno.id
          ? { ...turno, estado: "Cancelado", observaciones: nextObservaciones }
          : turno
      ));
      setEditEstado("Cancelado");
      setEditObservaciones(nextObservaciones);
      setCancelReason("");
      await appendTurnoEvento({
        turno_id: selectedTurno.id,
        tipo: "canceled",
        titulo: "Turno cancelado",
        detalle: reason,
        estado_anterior: selectedTurno.estado || "",
        estado_nuevo: "Cancelado",
      });
      closeTurnoModal();
    } catch (error) {
      console.error("Error al cancelar turno:", error);
      alert("No se pudo cancelar el turno.");
    } finally {
      setIsSavingTurno(false);
    }
  };

  const handleRescheduleTurno = async () => {
    if (!selectedTurno) return;

    const disponibilidad = disponibilidades.find((disp) => disp.id === reschedule.disponibilidad_id);
    if (!disponibilidad || !reschedule.slotIso) {
      setReschedule((prev) => ({ ...prev, error: "Selecciona un horario libre para reprogramar." }));
      return;
    }

    const nextDate = new Date(reschedule.slotIso);
    const previousDate = new Date(selectedTurno.fecha_hora);
    const duration = slotDurationForAvailability(disponibilidad);
    const previousLabel = `${formatDate(previousDate)} ${previousDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const nextLabel = `${formatDate(nextDate)} ${nextDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const note = `[Reprogramado ${new Date().toLocaleString()}] de ${previousLabel} a ${nextLabel}`;
    const nextObservaciones = editObservaciones.trim()
      ? `${editObservaciones.trim()}\n${note}`
      : note;

    setReschedule((prev) => ({ ...prev, isSaving: true, error: "" }));
    try {
      await pb.collection("turnos").update(selectedTurno.id, {
        fecha_hora: nextDate.toISOString(),
        medico_id: disponibilidad.medico_id,
        disponibilidad_id: disponibilidad.id,
        tipo: disponibilidad.tipo,
        duracion: duration,
        observaciones: nextObservaciones,
        estado: selectedTurno.estado === "Cancelado" ? "En espera" : selectedTurno.estado,
      });

      const doctor = medicos.find((medico) => medico.id === disponibilidad.medico_id) || disponibilidad.expand?.medico_id;
      setTurnos((prevTurnos) => prevTurnos.map((turno) =>
        turno.id === selectedTurno.id
          ? {
              ...turno,
              fecha_hora: nextDate.toISOString(),
              medico_id: disponibilidad.medico_id,
              disponibilidad_id: disponibilidad.id,
              tipo: disponibilidad.tipo,
              duracion: duration,
              observaciones: nextObservaciones,
              estado: selectedTurno.estado === "Cancelado" ? "En espera" : selectedTurno.estado,
              ...(turno.expand ? { expand: { ...turno.expand, medico_id: doctor } } : {}),
            }
          : turno
      ).sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()));

      await appendTurnoEvento({
        turno_id: selectedTurno.id,
        tipo: "rescheduled",
        titulo: "Turno reprogramado",
        detalle: `De ${previousLabel} a ${nextLabel}`,
        estado_anterior: selectedTurno.estado || "",
        estado_nuevo: selectedTurno.estado === "Cancelado" ? "En espera" : selectedTurno.estado,
        fecha_hora_anterior: previousDate,
        fecha_hora_nueva: nextDate,
        metadata: {
          medico_anterior: selectedTurno.medico_id || "",
          medico_nuevo: disponibilidad.medico_id || "",
          disponibilidad_id: disponibilidad.id,
        },
      });
      closeTurnoModal();
    } catch (error) {
      console.error("Error al reprogramar turno:", error);
      setReschedule((prev) => ({ ...prev, error: "No se pudo reprogramar el turno.", isSaving: false }));
    }
  };

  const loadDisponibilidades = async () => {
    const records = await pb.collection("disponibilidades").getFullList<Disponibilidad>({
      sort: "-fecha_hora_inicio",
      expand: "medico_id",
    });
    setDisponibilidades(records);
  };

  const handleAvailabilityInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAvailabilityForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvailabilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAvailability(true);
    setAvailabilityError("");

    try {
      if (!availabilityForm.medico_id) {
        setAvailabilityError("Selecciona un medico para la disponibilidad.");
        return;
      }

      const startDateTime = new Date(`${availabilityForm.fecha}T${availabilityForm.hora_inicio}:00`).toISOString();
      const endDateTime = new Date(`${availabilityForm.fecha}T${availabilityForm.hora_fin}:00`).toISOString();

      await pb.collection("disponibilidades").create({
        medico_id: availabilityForm.medico_id,
        fecha_hora_inicio: startDateTime,
        fecha_hora_fin: endDateTime,
        tipo: availabilityForm.tipo,
      });

      setAvailabilityForm({
        medico_id: selectedMedicoId === "all" ? "" : selectedMedicoId,
        fecha: "",
        hora_inicio: "",
        hora_fin: "",
        tipo: "Consulta",
      });
      setShowAvailabilityForm(false);
      await loadDisponibilidades();
    } catch (error: unknown) {
      console.error("Error al guardar disponibilidad:", error);
      if (typeof error === "object" && error !== null && "status" in error && error.status === 404) {
        setAvailabilityError("La coleccion 'disponibilidades' no existe en PocketBase.");
      } else {
        setAvailabilityError("Error al guardar la disponibilidad. Verifica los datos.");
      }
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const getStateColorClass = (estado?: string) => {
    if (!estado) return 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 border-dashed';
    switch (estado) {
      case 'En espera':
        return 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100';
      case 'En consulta':
        return 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100';
      case 'Atendido':
      case 'completado': // fallback for old data
        return 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700 text-green-900 dark:text-green-100';
      case 'Ausente':
        return 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100';
      case 'Atrasado':
        return 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700 text-orange-900 dark:text-orange-100';
      case 'Quiere adelantarlo':
        return 'bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-100';
      case 'Cancelado':
        return 'bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-900 text-red-900 dark:text-red-200';
      case 'No llegó':
        return 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100';
      case 'pendiente': // fallback for old data
        return 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100';
    }
  };

  const loadConsultasEnCurso = async () => {
    setIsLoadingConsultasEnCurso(true);
    try {
      const response = await pb.collection("consultas").getList<ConsultaEnCurso>(1, 10, {
        filter: 'estado = "en_curso"',
        sort: "-fecha,-updated",
        expand: "paciente_id",
        requestKey: null,
      });
      setConsultasEnCurso(response.items);
    } catch (error) {
      console.error("Error al cargar consultas en curso:", error);
      setConsultasEnCurso([]);
    } finally {
      setIsLoadingConsultasEnCurso(false);
    }
  };

  // Establecer fecha de hoy por defecto al cambiar a vista diaria o semanal si no hay fecha seleccionada
  useEffect(() => {
    if ((viewMode === 'daily' || viewMode === 'weekly' || viewMode === 'waiting-room') && !filterDate) {
      const today = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      setFilterDate(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`);
    }
  }, [viewMode, filterDate]);

  useEffect(() => {
    if (selectedMedicoId !== "all") {
      setAvailabilityForm((prev) => ({ ...prev, medico_id: selectedMedicoId }));
    }
  }, [selectedMedicoId]);

  const quickPatientSearch = quickAppointment?.pacienteSearch ?? "";
  const quickSelectedPatientId = quickAppointment?.paciente_id ?? "";

  useEffect(() => {
    if (!quickPatientSearch && !quickSelectedPatientId) return;

    const term = quickPatientSearch.trim();
    if (term.length < 2 || quickSelectedPatientId) return;

    const timeout = window.setTimeout(async () => {
      updateQuickAppointment({ isSearching: true, error: "" });
      try {
        const safeTerm = escapePocketBaseFilter(term);
        const result = await pb.collection("pacientes").getList<Paciente>(1, 12, {
          filter: `${ACTIVE_PATIENT_FILTER} && (nombre ~ "${safeTerm}" || apellido ~ "${safeTerm}" || numero_documento ~ "${safeTerm}" || telefono ~ "${safeTerm}")`,
          sort: "apellido,nombre",
          requestKey: null,
        });
        updateQuickAppointment({ patientResults: result.items, isSearching: false });
      } catch (error) {
        console.error("Error al buscar pacientes para turno rapido:", error);
        updateQuickAppointment({ error: "No se pudieron buscar pacientes.", isSearching: false });
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [quickPatientSearch, quickSelectedPatientId]);

  useEffect(() => {
    const input: PatientDuplicateLookupInput = {
      nombre: quickNewPatient.nombre,
      apellido: quickNewPatient.apellido,
      dni: quickNewPatient.dni,
      telefono: quickNewPatient.telefono,
    };

    if (!quickNewPatient.isOpen || !hasDuplicateLookupSignal(input)) {
      setQuickNewPatient((prev) => ({
        ...prev,
        duplicateCandidates: [],
        isCheckingDuplicates: false,
        duplicateError: "",
      }));
      return;
    }

    let isCancelled = false;
    setQuickNewPatient((prev) => ({ ...prev, isCheckingDuplicates: true, duplicateError: "" }));

    const timeout = window.setTimeout(async () => {
      try {
        const candidates = await findPatientDuplicateCandidates(input);
        if (isCancelled) return;
        setQuickNewPatient((prev) => ({
          ...prev,
          duplicateCandidates: candidates,
          isCheckingDuplicates: false,
          duplicateError: "",
        }));
      } catch (error) {
        console.error("Error al buscar posibles duplicados en alta rapida:", error);
        if (isCancelled) return;
        setQuickNewPatient((prev) => ({
          ...prev,
          duplicateCandidates: [],
          isCheckingDuplicates: false,
          duplicateError: "No se pudieron revisar posibles duplicados.",
        }));
      }
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeout);
    };
  }, [
    quickNewPatient.isOpen,
    quickNewPatient.nombre,
    quickNewPatient.apellido,
    quickNewPatient.dni,
    quickNewPatient.telefono,
  ]);

  useEffect(() => {
    const input: PatientDuplicateLookupInput = {
      nombre: patientQuickCard.form.nombre,
      apellido: patientQuickCard.form.apellido,
      numero_documento: patientQuickCard.form.numero_documento,
      telefono: patientQuickCard.form.telefono,
      numero_ficha: patientQuickCard.form.numero_ficha,
    };

    if (!patientQuickCard.isOpen || patientQuickCard.isLoading || !hasDuplicateLookupSignal(input)) {
      setPatientQuickCard((prev) => ({
        ...prev,
        duplicateCandidates: [],
        isCheckingDuplicates: false,
        duplicateError: "",
      }));
      return;
    }

    let isCancelled = false;
    setPatientQuickCard((prev) => ({ ...prev, isCheckingDuplicates: true, duplicateError: "" }));

    const timeout = window.setTimeout(async () => {
      try {
        const candidates = await findPatientDuplicateCandidates(input, patientQuickCard.pacienteId);
        if (isCancelled) return;
        setPatientQuickCard((prev) => ({
          ...prev,
          duplicateCandidates: candidates,
          isCheckingDuplicates: false,
          duplicateError: "",
        }));
      } catch (error) {
        console.error("Error al buscar posibles duplicados en ficha rapida:", error);
        if (isCancelled) return;
        setPatientQuickCard((prev) => ({
          ...prev,
          duplicateCandidates: [],
          isCheckingDuplicates: false,
          duplicateError: "No se pudieron revisar posibles duplicados.",
        }));
      }
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeout);
    };
  }, [
    patientQuickCard.isOpen,
    patientQuickCard.isLoading,
    patientQuickCard.pacienteId,
    patientQuickCard.form.nombre,
    patientQuickCard.form.apellido,
    patientQuickCard.form.numero_documento,
    patientQuickCard.form.telefono,
    patientQuickCard.form.numero_ficha,
  ]);

  useEffect(() => {
    if (!quickAppointment?.paciente_id) {
      setQuickPatientDayAppointments([]);
      return;
    }

    const selectedDate = dateKey(quickAppointment.fechaHora);
    const startOfDay = new Date(`${selectedDate}T00:00:00`).toISOString().replace("T", " ");
    const endWindow = new Date(`${selectedDate}T00:00:00`);
    endWindow.setDate(endWindow.getDate() + 90);
    const endOfWindow = endWindow.toISOString().replace("T", " ");

    const fetchPatientDayAppointments = async () => {
      setIsLoadingQuickPatientAppointments(true);
      setQuickWarningsAcknowledged(false);
      try {
        const records = await pb.collection("turnos").getFullList<Turno>({
          filter: `paciente_id = "${quickAppointment.paciente_id}" && fecha_hora >= "${startOfDay}" && fecha_hora <= "${endOfWindow}"`,
          sort: "fecha_hora",
          expand: "medico_id,paciente_id",
          requestKey: null,
        });
        setQuickPatientDayAppointments(records);
      } catch (error) {
        console.error("Error al consultar turnos del paciente en el dia:", error);
        setQuickPatientDayAppointments([]);
      } finally {
        setIsLoadingQuickPatientAppointments(false);
      }
    };

    fetchPatientDayAppointments();
  }, [quickAppointment?.paciente_id, quickAppointment?.fechaHora]);

  useEffect(() => {
    setIsMounted(true);
    const params = new URLSearchParams(window.location.search);
    const urlMedicoId = params.get("medico_id");
    const urlTab = params.get("tab") as ViewMode | null;
    const urlDate = params.get("date");
    const allowedTabs: ViewMode[] = ["weekly", "daily", "list", "availability", "waiting-room"];

    if (urlTab && allowedTabs.includes(urlTab)) {
      setViewMode(urlTab);
    }

    if (urlDate) {
      setFilterDate(urlDate);
    }

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    const applyCurrentUserRole = async () => {
      const authUser = pb.authStore.record as AppUser | null;
      let currentUser = authUser;

      try {
        if (authUser?.id) {
          currentUser = await pb.collection("users").getOne<AppUser>(authUser.id, { requestKey: null });
        }
      } catch (error) {
        console.error("Error al cargar usuario fresco:", error);
      }

      const resolvedRole = resolveActiveRole(currentUser, ["secretaria"]);
      setUser(currentUser);
      applyActiveRole(resolvedRole, currentUser);

      if (resolvedRole !== "medico" && urlMedicoId) {
        setSelectedMedicoId(urlMedicoId);
        setAvailabilityForm((prev) => ({ ...prev, medico_id: urlMedicoId }));
      }
    };

    const loadData = async () => {
      try {
        const [medicosResponse, turnosRecords, dispRecords, agendaRecords, bloqueosRecords, consultasEnCursoResponse] = await Promise.all([
          fetch("/api/medicos", {
            headers: { Authorization: `Bearer ${pb.authStore.token}` },
          }),
          pb.collection("turnos").getFullList<Turno>({
            sort: "fecha_hora",
            expand: "paciente_id,medico_id",
          }),
          pb.collection("disponibilidades").getFullList<Disponibilidad>({
            sort: "-fecha_hora_inicio",
            expand: "medico_id",
          }),
          pb.collection("agenda_semanal_medico").getFullList<AgendaSemanalMedico>({
            sort: "medico_id,dia_semana,hora_inicio",
            expand: "medico_id",
            requestKey: null,
          }).catch(() => []),
          pb.collection("bloqueos_agenda").getFullList<BloqueoAgenda>({
            sort: "-fecha_inicio,-created",
            expand: "medico_id",
            requestKey: null,
          }).catch(() => []),
          pb.collection("consultas").getList<ConsultaEnCurso>(1, 10, {
            filter: 'estado = "en_curso"',
            sort: "-fecha,-updated",
            expand: "paciente_id",
            requestKey: null,
          }),
        ]);

        if (!medicosResponse.ok) {
          throw new Error("No se pudieron cargar los medicos.");
        }

        const medicosData = await medicosResponse.json();
        const medicosRecords = Array.isArray(medicosData.medicos) ? medicosData.medicos : [];
        setMedicos(medicosRecords);

        setTurnos(turnosRecords);
        setDisponibilidades(dispRecords);
        setAgendaSemanal(agendaRecords);
        setBloqueosAgenda(bloqueosRecords);
        setConsultasEnCurso(consultasEnCursoResponse.items);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setIsLoadingConsultasEnCurso(false);
        setIsLoading(false);
      }
    };

    applyCurrentUserRole();
    loadData();

    let unsubscribe: () => void;
    pb.collection("turnos")
      .subscribe<Turno>("*", async () => {
        const turnosRecords = await pb.collection("turnos").getFullList<Turno>({
          sort: "fecha_hora",
          expand: "paciente_id,medico_id",
        });
        setTurnos(turnosRecords);
      })
      .then((unsub) => {
        unsubscribe = unsub;
      })
      .catch((err) => console.log("Suscripción fallida a turnos:", err));

    let unsubscribeConsultas: () => void;
    pb.collection("consultas")
      .subscribe<ConsultaEnCurso>("*", () => {
        loadConsultasEnCurso();
      })
      .then((unsub) => {
        unsubscribeConsultas = unsub;
      })
      .catch((err) => console.log("Suscripcion fallida a consultas:", err));

    let unsubscribeAgenda: () => void;
    pb.collection("agenda_semanal_medico")
      .subscribe<AgendaSemanalMedico>("*", async () => {
        const records = await pb.collection("agenda_semanal_medico").getFullList<AgendaSemanalMedico>({
          sort: "medico_id,dia_semana,hora_inicio",
          expand: "medico_id",
          requestKey: null,
        });
        setAgendaSemanal(records);
      })
      .then((unsub) => {
        unsubscribeAgenda = unsub;
      })
      .catch((err) => console.log("Suscripcion fallida a agenda semanal:", err));

    let unsubscribeBloqueos: () => void;
    pb.collection("bloqueos_agenda")
      .subscribe<BloqueoAgenda>("*", async () => {
        const records = await pb.collection("bloqueos_agenda").getFullList<BloqueoAgenda>({
          sort: "-fecha_inicio,-created",
          expand: "medico_id",
          requestKey: null,
        });
        setBloqueosAgenda(records);
      })
      .then((unsub) => {
        unsubscribeBloqueos = unsub;
      })
      .catch((err) => console.log("Suscripcion fallida a bloqueos de agenda:", err));

    const handleActiveRoleChange = () => {
      applyCurrentUserRole();
    };

    window.addEventListener(ACTIVE_ROLE_CHANGED_EVENT, handleActiveRoleChange);

    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubscribeConsultas) unsubscribeConsultas();
      if (unsubscribeAgenda) unsubscribeAgenda();
      if (unsubscribeBloqueos) unsubscribeBloqueos();
      window.removeEventListener(ACTIVE_ROLE_CHANGED_EVENT, handleActiveRoleChange);
    };
  }, [router]);

  const handleEstadoChange = async (id: string, nuevoEstado: string) => {
    if (isSensitiveStatus(nuevoEstado)) {
      setPendingStatusChange({
        turnoId: id,
        nuevoEstado,
        motivo: "",
        isSaving: false,
        error: "",
      });
      return;
    }

    try {
      await completeStatusChange(id, nuevoEstado);
    } catch (error) {
      console.error("Error al actualizar estado:", error);
    }
  };

  const confirmPendingStatusChange = async () => {
    if (!pendingStatusChange) return;
    const motivo = pendingStatusChange.motivo.trim();
    if (!motivo) {
      setPendingStatusChange((prev) => prev ? { ...prev, error: "Indica el motivo para continuar." } : prev);
      return;
    }

    setPendingStatusChange((prev) => prev ? { ...prev, isSaving: true, error: "" } : prev);
    try {
      await completeStatusChange(pendingStatusChange.turnoId, pendingStatusChange.nuevoEstado, motivo);
      setPendingStatusChange(null);
    } catch (error) {
      console.error("Error al actualizar estado sensible:", error);
      setPendingStatusChange((prev) => prev ? { ...prev, isSaving: false, error: "No se pudo actualizar el estado." } : prev);
    }
  };

  const consultationActionLabel = (turno: Turno) => {
    if (turno.consulta_id) return "Continuar consulta";
    if (turno.estado === "En consulta") return "Continuar atencion";
    return "Iniciar consulta";
  };

  const handleConsultationAction = async (turno: Turno) => {
    if (turno.consulta_id) {
      router.push(`/consultas/${turno.consulta_id}`);
      return;
    }

    if (!turno.paciente_id) {
      alert("El turno no tiene paciente asociado.");
      return;
    }

    const shouldMarkInConsultation = !TERMINAL_APPOINTMENT_STATES.includes(turno.estado || "") && turno.estado !== "En consulta";

    try {
      if (shouldMarkInConsultation) {
        await completeStatusChange(turno.id, "En consulta", "Inicio de atencion medica");
      }
      router.push(`/consultas/nueva?paciente_id=${turno.paciente_id}&turno_id=${turno.id}`);
    } catch (error) {
      console.error("Error al iniciar consulta desde turno:", error);
      alert("No se pudo iniciar la consulta desde este turno.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este turno?")) {
      try {
        await pb.collection("turnos").delete(id);
      } catch (error) {
        console.error("Error al eliminar turno:", error);
      }
    }
  };

  const getDaysOfWeek = (baseDateStr: string) => {
    const base = baseDateStr ? new Date(baseDateStr + 'T12:00:00') : new Date();
    const day = base.getDay();
    const diff = base.getDate() - day + (day === 0 ? -6 : 1); // Lunes como primer día
    const monday = new Date(base.setDate(diff));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const matchesPatientSearch = (turno: Turno) => {
    if (!filterPatient) return true;

    const search = filterPatient.toLowerCase();
    const p = turno.expand?.paciente_id;
    if (!p) return false;

    return (
      p.nombre.toLowerCase().includes(search) ||
      p.apellido.toLowerCase().includes(search) ||
      patientDocument(p).includes(search)
    );
  };

  const filteredTurnos = turnos.filter(turno => {
    let matchPatient = true;
    let matchDate = true;
    let matchDoctor = true;

    if (selectedMedicoId !== "all") {
      matchDoctor = turno.medico_id === selectedMedicoId;
    }

    matchPatient = matchesPatientSearch(turno);

    if (filterDate) {
      const d = new Date(turno.fecha_hora);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const turnoDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      if (viewMode === 'list' || viewMode === 'daily' || viewMode === 'waiting-room') {
        matchDate = turnoDate === filterDate;
      } else if (viewMode === 'weekly') {
        const weekDays = getDaysOfWeek(filterDate);
        const start = weekDays[0];
        const end = weekDays[6];
        const tDate = new Date(turnoDate + 'T12:00:00');
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        matchDate = tDate >= start && tDate <= end;
      }
    }

    return matchPatient && matchDate && matchDoctor;
  });

  const filteredDisponibilidades = disponibilidades.filter((disp) =>
    selectedMedicoId === "all" ? true : disp.medico_id === selectedMedicoId
  );

  const dateKey = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  function scheduleTimeValue(date: Date) {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function appointmentTypeFromAvailability(tipo?: string): "Consulta" | "Estudio" | "Cirugia" {
    if (tipo === "Estudio") return "Estudio";
    if ((tipo || "").toLowerCase().startsWith("cirug")) return "Cirugia";
    return "Consulta";
  }

  const dailyDate = filterDate || dateKey(new Date());
  const isLateTurno = (turno: Turno) =>
    turno.estado === "En espera" && new Date(turno.fecha_hora).getTime() < Date.now();
  const buildDailyStats = (items: Turno[]) => ({
    total: items.length,
    waiting: items.filter((turno) => turno.estado === "En espera").length,
    inConsultation: items.filter((turno) => turno.estado === "En consulta").length,
    attended: items.filter((turno) => turno.estado === "Atendido").length,
    absent: items.filter((turno) => turno.estado === "Ausente").length,
    canceled: items.filter((turno) => turno.estado === "Cancelado").length,
    overbooking: items.filter((turno) => turno.es_sobreturno).length,
    late: items.filter(isLateTurno).length,
  });
  const matchesDailyOperationFilter = (turno: Turno) => {
    switch (dailyOperationFilter) {
      case "waiting":
        return turno.estado === "En espera";
      case "inConsultation":
        return turno.estado === "En consulta";
      case "attended":
        return turno.estado === "Atendido";
      case "absent":
        return turno.estado === "Ausente";
      case "overbooking":
        return Boolean(turno.es_sobreturno);
      case "late":
        return isLateTurno(turno);
      default:
        return true;
    }
  };
  const dailyBaseTurnos = turnos
    .filter((turno) =>
      (selectedMedicoId === "all" || turno.medico_id === selectedMedicoId) &&
      dateKey(new Date(turno.fecha_hora)) === dailyDate
    )
    .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
  const dailyScheduleDate = new Date(`${dailyDate}T12:00:00`);
  const recurringSlotsForDailyDate = generateRecurringSlotsForDate(
    dailyScheduleDate,
    agendaSemanal.filter((rule) => selectedMedicoId === "all" || rule.medico_id === selectedMedicoId),
    bloqueosAgenda,
    dailyBaseTurnos
  );
  const dailyAppointmentConflicts = findConflictingAppointments(dailyBaseTurnos, bloqueosAgenda)
    .map((conflict) => ({ ...conflict, turno: conflict.appointment as Turno }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const dailySearchedTurnos = dailyBaseTurnos.filter(matchesPatientSearch);
  const dailyVisibleTurnos = dailySearchedTurnos.filter(matchesDailyOperationFilter);
  const dailyStats = buildDailyStats(dailyVisibleTurnos);
  const dailySearchStats = buildDailyStats(dailySearchedTurnos);
  const dailyTotalStats = buildDailyStats(dailyBaseTurnos);
  const dailyActiveFilterLabel = DAILY_OPERATION_FILTERS.find((option) => option.key === dailyOperationFilter)?.label ?? "Todos";
  const doctorDailyTurnos = isDoctorRole ? dailyBaseTurnos : [];
  const doctorCurrentTurno = doctorDailyTurnos.find((turno) => turno.estado === "En consulta") ?? null;
  const isClinicalPendingTurno = (turno: Turno) =>
    !TERMINAL_APPOINTMENT_STATES.includes(turno.estado || "") && turno.estado !== "Cancelado";
  const doctorNextTurno =
    doctorDailyTurnos.find((turno) =>
      turno.id !== doctorCurrentTurno?.id &&
      isClinicalPendingTurno(turno) &&
      new Date(turno.fecha_hora).getTime() >= Date.now()
    ) ??
    doctorDailyTurnos.find((turno) => turno.id !== doctorCurrentTurno?.id && isClinicalPendingTurno(turno)) ??
    null;
  const doctorPendingTurnos = doctorDailyTurnos.filter((turno) =>
    isClinicalPendingTurno(turno) &&
    turno.id !== doctorCurrentTurno?.id &&
    turno.id !== doctorNextTurno?.id
  );
  const inProgressConsultationDateLabel = (value?: string) => {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sin fecha";
    return `${formatDate(date)} ${shortTime(date)}`;
  };
  const nextDailyTurno =
    dailyVisibleTurnos.find((turno) => turno.estado !== "Cancelado" && new Date(turno.fecha_hora).getTime() >= Date.now()) ??
    dailyVisibleTurnos.find((turno) => turno.estado !== "Cancelado") ??
    null;
  const dailyDisponibilidades = filteredDisponibilidades.filter((disp) =>
    dateKey(new Date(disp.fecha_hora_inicio)) === dailyDate
  );
  const doctorsForDailyView = selectedMedicoId === "all"
    ? medicos
    : medicos.filter((medico) => medico.id === selectedMedicoId);
  const dailyDoctorSections = doctorsForDailyView
    .map((medico) => {
      const allDoctorTurnos = dailyBaseTurnos
        .filter((turno) => turno.medico_id === medico.id)
        .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
      const searchedDoctorTurnos = allDoctorTurnos.filter(matchesPatientSearch);
      const doctorTurnos = searchedDoctorTurnos.filter(matchesDailyOperationFilter);
      const doctorRecurringRules = agendaSemanal.filter((rule) =>
        rule.activo !== false &&
        rule.medico_id === medico.id &&
        Number(rule.dia_semana) === dailyScheduleDate.getDay()
      );
      const doctorDisponibilidades = dailyDisponibilidades
        .filter((disp) => disp.medico_id === medico.id)
        .filter((disp) => {
          const start = new Date(disp.fecha_hora_inicio);
          const end = new Date(disp.fecha_hora_fin);
          return !doctorRecurringRules.some((rule) =>
            rule.hora_inicio === scheduleTimeValue(start) &&
            rule.hora_fin === scheduleTimeValue(end) &&
            rule.tipo === appointmentTypeFromAvailability(disp.tipo)
          );
        })
        .sort((a, b) => new Date(a.fecha_hora_inicio).getTime() - new Date(b.fecha_hora_inicio).getTime());
      const recurringSlots = recurringSlotsForDailyDate.filter((slot) => slot.medico_id === medico.id);
      const nextTurno =
        doctorTurnos.find((turno) => turno.estado !== "Cancelado" && new Date(turno.fecha_hora).getTime() >= Date.now()) ??
        doctorTurnos.find((turno) => turno.estado !== "Cancelado") ??
        null;

      return {
        medico,
        turnos: doctorTurnos,
        allTurnos: allDoctorTurnos,
        disponibilidades: doctorDisponibilidades,
        recurringRules: doctorRecurringRules,
        recurringSlots,
        stats: buildDailyStats(allDoctorTurnos),
        visibleStats: buildDailyStats(doctorTurnos),
        searchedStats: buildDailyStats(searchedDoctorTurnos),
        nextTurno,
        hasActivity: allDoctorTurnos.length > 0 || doctorDisponibilidades.length > 0 || recurringSlots.length > 0,
      };
    })
    .filter((section) => selectedMedicoId !== "all" || section.hasActivity);

  const waitingRoomTurnos = dailySearchedTurnos;
  const waitingRoomGroups = WAITING_ROOM_GROUPS.map((group) => {
    const items = waitingRoomTurnos.filter((turno) => {
      switch (group.key) {
        case "waiting":
          return turno.estado === "En espera";
        case "inConsultation":
          return turno.estado === "En consulta";
        case "attended":
          return turno.estado === "Atendido";
        case "absent":
          return turno.estado === "Ausente" || turno.estado === "No llegó" || turno.estado === "No llegÃ³";
        case "canceled":
          return turno.estado === "Cancelado";
        default:
          return !["En espera", "En consulta", "Atendido", "Ausente", "No llegó", "No llegÃ³", "Cancelado"].includes(turno.estado || "");
      }
    });

    return { ...group, items };
  });
  const waitingRoomStats = {
    total: waitingRoomTurnos.length,
    upcoming: waitingRoomGroups.find((group) => group.key === "upcoming")?.items.length || 0,
    waiting: waitingRoomGroups.find((group) => group.key === "waiting")?.items.length || 0,
    inConsultation: waitingRoomGroups.find((group) => group.key === "inConsultation")?.items.length || 0,
    attended: waitingRoomGroups.find((group) => group.key === "attended")?.items.length || 0,
    absent: waitingRoomGroups.find((group) => group.key === "absent")?.items.length || 0,
    canceled: waitingRoomGroups.find((group) => group.key === "canceled")?.items.length || 0,
  };
  const nextWaitingRoomTurno =
    waitingRoomGroups.find((group) => group.key === "upcoming")?.items.find((turno) => new Date(turno.fecha_hora).getTime() >= Date.now()) ||
    waitingRoomGroups.find((group) => group.key === "upcoming")?.items[0] ||
    null;

  const fullFormHrefForQuickAppointment = (appointment: QuickAppointmentState) => {
    const params = new URLSearchParams({
      fecha_hora: appointment.fechaHora.toISOString(),
      tipo: appointment.disponibilidad.tipo,
    });

    if (appointment.disponibilidad.medico_id) params.set("medico_id", appointment.disponibilidad.medico_id);
    if (appointment.disponibilidad.id && !isRecurringAvailability(appointment.disponibilidad)) {
      params.set("disponibilidad_id", appointment.disponibilidad.id);
    }

    return appointment.mode === "overbooking"
      ? `/turnos/sobreturno/nuevo?${params.toString()}`
      : `/turnos/nuevo?${params.toString()}`;
  };

  const slotDurationForAvailability = (disp: Disponibilidad) => disp.tipo === "Consulta" ? 15 : 60;

  const isRecurringAvailability = (disp: Disponibilidad) => disp.id.startsWith("recurrente:");

  const availabilityFromRecurringSlot = (slot: GeneratedScheduleSlot, medico?: Medico): Disponibilidad => ({
    id: `recurrente:${slot.sourceId}:${slot.start.toISOString()}`,
    medico_id: slot.medico_id,
    fecha_hora_inicio: slot.start.toISOString(),
    fecha_hora_fin: slot.end.toISOString(),
    tipo: slot.tipo === "Cirugia" ? "Cirugía" : slot.tipo,
    expand: {
      medico_id: medico,
    },
  });

  const blockLabel = (block?: ScheduleBlock) => {
    if (!block) return "";
    const scope = block.alcance === "general" ? "Bloqueo general" : "Bloqueo";
    return block.motivo?.trim() ? `${scope}: ${block.motivo.trim()}` : scope;
  };

  const availabilitySlots = (disp: Disponibilidad, doctorTurnos: Turno[], ignoreTurnoId?: string): AvailabilitySlot[] => {
    const duration = slotDurationForAvailability(disp);
    const start = new Date(disp.fecha_hora_inicio);
    const end = new Date(disp.fecha_hora_fin);
    const slots: AvailabilitySlot[] = [];

    for (let cursor = new Date(start); addMinutes(cursor, duration) <= end; cursor = addMinutes(cursor, duration)) {
      const slotStart = new Date(cursor);
      const slotEnd = addMinutes(slotStart, duration);
      const appointment = doctorTurnos.find((turno) => {
        if (turno.id === ignoreTurnoId || turno.estado === "Cancelado") return false;
        const appointmentStart = new Date(turno.fecha_hora);
        const appointmentEnd = addMinutes(appointmentStart, turno.duracion || duration);
        return rangesOverlap(slotStart, slotEnd, appointmentStart, appointmentEnd);
      });
      const syntheticSlot: GeneratedScheduleSlot = {
        id: `${disp.id}:${slotStart.toISOString()}`,
        sourceId: disp.id,
        medico_id: disp.medico_id || "",
        start: slotStart,
        end: slotEnd,
        tipo: appointmentTypeFromAvailability(disp.tipo),
        duracion: duration,
        source: "disponibilidad",
      };
      const block = bloqueosAgenda.find((candidate) => blockAppliesToSlot(candidate, syntheticSlot));

      slots.push({ start: slotStart, end: slotEnd, appointment, block });
    }

    return slots;
  };

  const renderDoctorCareCard = (
    title: string,
    turno: Turno | null,
    emptyText: string,
    accent: "blue" | "emerald" | "amber"
  ) => {
    const patient = turno?.expand?.paciente_id;
    const accentClasses = {
      blue: "border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/20",
      emerald: "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20",
      amber: "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20",
    };

    return (
      <div className={`rounded-xl border p-4 ${accentClasses[accent]}`}>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</div>
        {turno ? (
          <div className="mt-3 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{shortTime(new Date(turno.fecha_hora))}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStateColorClass(turno.estado)}`}>
                  {turno.estado || "Sin estado"}
                </span>
                {turno.es_sobreturno && (
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                    Sobreturno
                  </span>
                )}
              </div>
              <div className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {patient ? `${patient.apellido.toUpperCase()}, ${patient.nombre.toUpperCase()}` : "Paciente no encontrado"}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                {patientMeta(patient).map((item) => (
                  <span key={item}>{item}</span>
                ))}
                <span>{turno.tipo || "Consulta"}{turno.duracion ? ` (${turno.duracion} min)` : ""}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{turno.motivo || "Sin motivo cargado"}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleConsultationAction(turno)}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                {consultationActionLabel(turno)}
              </button>
              {patient && (
                <>
                  <Link
                    href={`/pacientes/${patient.id}?mode=view`}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Ficha clinica
                  </Link>
                  <Link
                    href={`/recetas/nueva?paciente_id=${patient.id}`}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Nueva receta
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{emptyText}</p>
        )}
      </div>
    );
  };

  const rescheduleDisponibilidades = selectedTurno && reschedule.isOpen
    ? disponibilidades
        .filter((disp) =>
          disp.medico_id === reschedule.medico_id &&
          dateKey(new Date(disp.fecha_hora_inicio)) === reschedule.fecha
        )
        .sort((a, b) => new Date(a.fecha_hora_inicio).getTime() - new Date(b.fecha_hora_inicio).getTime())
    : [];

  const rescheduleDoctorTurnos = selectedTurno && reschedule.isOpen
    ? turnos.filter((turno) =>
        turno.medico_id === reschedule.medico_id &&
        dateKey(new Date(turno.fecha_hora)) === reschedule.fecha
      )
    : [];

  if (!isMounted) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Cabecera */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{isDoctorRole ? "Mi jornada medica" : "Gestión de Turnos"}</h1>
              <p className="text-zinc-500 dark:text-zinc-400">{isDoctorRole ? "Pacientes, turnos y consultas del dia" : "Agenda y administra las citas médicas"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openPrintModal}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors shadow-sm"
              title="Imprimir Turnos"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
            <Link
              href={newTurnoHref}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Turno
            </Link>
          </div>
        </div>

        <div className="mb-6 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Medico</label>
          <select
            value={selectedMedicoId}
            onChange={(event) => setSelectedMedicoId(event.target.value)}
            disabled={!canChooseDoctor}
            className="w-full sm:max-w-sm px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 text-sm disabled:opacity-70"
          >
            {canChooseDoctor && <option value="all">Todos los medicos</option>}
            {medicos.map((medico) => (
              <option key={medico.id} value={medico.id}>
                {doctorLabel(medico)}
              </option>
            ))}
          </select>
          {isDoctorRole && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Estas viendo tu agenda propia. La secretaria gestiona las agendas de todos los medicos.
            </p>
          )}
        </div>

        {/* Tabs de Vistas */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6">
          <button
            onClick={() => handleViewModeChange('weekly')}
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${viewMode === 'weekly' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
          >
            Agenda Semanal
          </button>
          <button
            onClick={() => handleViewModeChange('daily')}
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${viewMode === 'daily' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
          >
            Agenda Diaria
          </button>
          <button
            onClick={() => handleViewModeChange('waiting-room')}
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${viewMode === 'waiting-room' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
          >
            Sala de espera
          </button>
          <button
            onClick={() => handleViewModeChange('list')}
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${viewMode === 'list' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
          >
            Lista
          </button>
          <button
            onClick={() => handleViewModeChange('availability')}
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${viewMode === 'availability' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
          >
            Disponibilidades
          </button>
        </div>

        {/* Filtros */}
        {viewMode !== 'availability' && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex-1">
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Buscar Paciente</label>
            <input
              type="text"
              placeholder="Nombre, apellido o DNI..."
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 text-sm"
            />
          </div>
          <div className="flex-1 sm:max-w-xs flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                {viewMode === 'weekly' ? 'Semana del' : 'Filtrar por Fecha'}
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark] text-sm"
              />
            </div>
            {(viewMode === 'weekly' || viewMode === 'daily' || viewMode === 'waiting-room') && (
              <div className="flex gap-1 mb-[1px]">
                <button
                  onClick={() => {
                    const current = filterDate ? new Date(filterDate) : new Date();
                    current.setDate(current.getDate() - (viewMode === 'weekly' ? 7 : 1));
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    setFilterDate(`${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`);
                  }}
                  className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  title={viewMode === 'weekly' ? "Semana anterior" : "Día anterior"}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const current = filterDate ? new Date(filterDate) : new Date();
                    current.setDate(current.getDate() + (viewMode === 'weekly' ? 7 : 1));
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    setFilterDate(`${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`);
                  }}
                  className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  title={viewMode === 'weekly' ? "Semana siguiente" : "Día siguiente"}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {(filterPatient || filterDate) && (
            <div className="flex items-end">
              <button
                onClick={() => { setFilterPatient(''); setFilterDate(''); }}
                className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            Cargando turnos...
          </div>
        ) : (
          <>
            {/* VISTA DISPONIBILIDADES */}
            {viewMode === 'availability' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Disponibilidades</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Configura los bloques horarios disponibles para agendar turnos</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAvailabilityForm((prev) => ({
                        ...prev,
                        medico_id: selectedMedicoId === "all" ? prev.medico_id : selectedMedicoId,
                      }));
                      setShowAvailabilityForm((prev) => !prev);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    {showAvailabilityForm ? (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancelar
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nueva Disponibilidad
                      </>
                    )}
                  </button>
                </div>

                {availabilityError && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-3">
                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm">{availabilityError}</p>
                  </div>
                )}

                {showAvailabilityForm && (
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Agregar Nueva Disponibilidad</h3>
                    <form onSubmit={handleAvailabilitySubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="md:col-span-4">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Medico</label>
                        <select
                          required
                          name="medico_id"
                          value={availabilityForm.medico_id}
                          onChange={handleAvailabilityInputChange}
                          disabled={!canChooseDoctor}
                          className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:opacity-70"
                        >
                          <option value="">Seleccione un medico</option>
                          {medicos.map((medico) => (
                            <option key={medico.id} value={medico.id}>
                              {doctorLabel(medico)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha</label>
                        <input
                          required
                          type="date"
                          name="fecha"
                          value={availabilityForm.fecha}
                          onChange={handleAvailabilityInputChange}
                          className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Hora Inicio</label>
                        <input
                          required
                          type="time"
                          name="hora_inicio"
                          value={availabilityForm.hora_inicio}
                          onChange={handleAvailabilityInputChange}
                          className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Hora Fin</label>
                        <input
                          required
                          type="time"
                          name="hora_fin"
                          value={availabilityForm.hora_fin}
                          onChange={handleAvailabilityInputChange}
                          className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tipo</label>
                        <select
                          required
                          name="tipo"
                          value={availabilityForm.tipo}
                          onChange={handleAvailabilityInputChange}
                          className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                        >
                          <option value="Consulta">Consulta</option>
                          <option value="Estudio">Estudio</option>
                          <option value="Cirugía">Cirugía</option>
                        </select>
                      </div>
                      <div className="md:col-span-4 flex justify-end mt-2">
                        <button
                          type="submit"
                          disabled={isSavingAvailability}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          {isSavingAvailability ? "Guardando..." : "Guardar Disponibilidad"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  {filteredDisponibilidades.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                      No hay disponibilidades configuradas.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                          <tr>
                            <th className="px-6 py-4 font-medium">Fecha</th>
                            <th className="px-6 py-4 font-medium">Medico</th>
                            <th className="px-6 py-4 font-medium">Horario</th>
                            <th className="px-6 py-4 font-medium">Tipo</th>
                            <th className="px-6 py-4 font-medium">Turnos otorgados</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {filteredDisponibilidades.map((disp) => {
                            const startDate = new Date(disp.fecha_hora_inicio);
                            const endDate = new Date(disp.fecha_hora_fin);
                            const assignedAppointments = turnos.filter((turno) => turno.disponibilidad_id === disp.id).length;

                            return (
                              <tr
                                key={disp.id}
                                tabIndex={0}
                                role="button"
                                onClick={() => router.push(`/turnos/disponibilidades/${disp.id}`)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    router.push(`/turnos/disponibilidades/${disp.id}`);
                                  }
                                }}
                                className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              >
                                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                  {formatDate(startDate)}
                                </td>
                                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                                  {doctorLabel(doctorFor(disp))}
                                </td>
                                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                                  {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                    disp.tipo === 'Consulta' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' :
                                    disp.tipo === 'Estudio' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' :
                                    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                                  }`}>
                                    {disp.tipo}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                                  <span className="inline-flex min-w-8 justify-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                    {assignedAppointments}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VISTA LISTA */}
            {viewMode === 'list' && (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                      <tr>
                        <th className="px-6 py-4 font-medium">Fecha y Hora</th>
                        <th className="px-6 py-4 font-medium">Medico</th>
                        <th className="px-6 py-4 font-medium">Paciente</th>
                        <th className="px-6 py-4 font-medium">Tipo</th>
                        <th className="px-6 py-4 font-medium">Motivo</th>
                        <th className="px-6 py-4 font-medium">Estado</th>
                        <th className="px-6 py-4 font-medium text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {filteredTurnos.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
                            No hay turnos agendados con esos filtros.
                          </td>
                        </tr>
                      ) : (
                        filteredTurnos.map((turno, index) => {
                          const fecha = new Date(turno.fecha_hora);
                          return (
                            <tr key={turno.id || `temp-key-${index}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {formatDate(turno.fecha_hora)}
                                </div>
                                <div className="text-zinc-500 dark:text-zinc-400">
                                  {fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                                {doctorLabel(doctorFor(turno))}
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {turno.expand?.paciente_id ? `${turno.expand.paciente_id.apellido.toUpperCase()}, ${turno.expand.paciente_id.nombre.toUpperCase()}` : 'Paciente no encontrado'}
                                </div>
                                {turno.expand?.paciente_id && (
                                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                    DNI: {turno.expand.paciente_id.dni}
                                  </div>
                                )}
                                {turno.expand?.paciente_id && (
                                  <button
                                    type="button"
                                    onClick={() => openPatientQuickCard(turno.paciente_id, turno.expand?.paciente_id)}
                                    className="mt-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    Ficha paciente
                                  </button>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                  {turno.tipo || 'Consulta'}
                                </div>
                                {turno.es_sobreturno && (
                                  <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-400">
                                    SOBRETURNO
                                  </div>
                                )}
                                {turno.duracion && (
                                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                    {turno.duracion} min
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                                {turno.motivo || '-'}
                              </td>
                              <td className="px-6 py-4">
                                <select
                                  value={turno.estado || ""}
                                  onChange={(e) => handleEstadoChange(turno.id, e.target.value)}
                                  className={`px-2 py-1 rounded-md text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${getEstadoColor(turno.estado)}`}
                                >
                                  <option value="" className="bg-white dark:bg-zinc-900 text-zinc-500">Sin asignar</option>
                                  {ESTADOS.map(estado => (
                                    <option key={estado} value={estado} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">{estado}</option>
                                  ))}
                                  {turno.estado && !ESTADOS.includes(turno.estado) && (
                                    <option value={turno.estado} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">{turno.estado}</option>
                                  )}
                                </select>
                              </td>
                              <td className="px-6 py-4 text-right flex justify-end gap-2">
                                {turno.consulta_id ? (
                                  <Link
                                    href={`/consultas/${turno.consulta_id}`}
                                    className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-1"
                                    title="Ver Consulta"
                                  >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/consultas/nueva?paciente_id=${turno.paciente_id}&turno_id=${turno.id}`}
                                    className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors flex items-center gap-1"
                                    title="Crear Consulta"
                                  >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                  </Link>
                                )}
                                <Link
                                  href={`/turnos/${turno.id}?mode=view`}
                                  className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                  title="Ver turno"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </Link>
                                <Link
                                  href={`/turnos/${turno.id}`}
                                  className="p-2 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                  title="Editar turno"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </Link>
                                <button
                                  onClick={() => handleDelete(turno.id)}
                                  className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Eliminar turno"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VISTA SEMANAL TIPO GOOGLE CALENDAR */}
            {viewMode === 'weekly' && (() => {
              const CALENDAR_START_HOUR = 8;
              const CALENDAR_END_HOUR = 20;
              const TOTAL_HOURS = CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1; // 8 to 20 is 13 hours
              const BASE_SLOT_HEIGHT = 100; // 100px para todos los turnos por igual (altura fija base)
              const TOTAL_SLOTS = TOTAL_HOURS * 4;

              // Calcular la altura global de cada slot de 15 min para alinear la cuadrícula
              const globalSlotHeights = new Array(TOTAL_SLOTS).fill(BASE_SLOT_HEIGHT);
              for (let i = 0; i < TOTAL_SLOTS; i++) {
                const slotStartHour = CALENDAR_START_HOUR + Math.floor(i / 4);
                const slotStartMin = (i % 4) * 15;

                let maxTurnos = 1;
                getDaysOfWeek(filterDate).forEach(day => {
                  const slotStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), slotStartHour, slotStartMin);
                  const turnosHere = filteredTurnos.filter(t => Math.abs(new Date(t.fecha_hora).getTime() - slotStart.getTime()) < 60000);
                  if (turnosHere.length > maxTurnos) {
                    maxTurnos = turnosHere.length;
                  }
                });
                globalSlotHeights[i] = maxTurnos * BASE_SLOT_HEIGHT;
              }

              const globalSlotTops = new Array(TOTAL_SLOTS).fill(0);
              let currentGlobalTop = 0;
              for (let i = 0; i < TOTAL_SLOTS; i++) {
                globalSlotTops[i] = currentGlobalTop;
                currentGlobalTop += globalSlotHeights[i];
              }
              const totalCalendarHeight = currentGlobalTop;

              return (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col overflow-x-auto">
                  <div className="flex-1">
                    <div className="flex min-w-[800px]">
                      {/* Columna de Horas */}
                      <div className="w-16 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 sticky left-0 z-30">
                        <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-zinc-50 dark:bg-zinc-950/50 z-40"></div>
                        {Array.from({ length: TOTAL_HOURS }).map((_, i) => {
                          const hour = CALENDAR_START_HOUR + i;
                          const h = globalSlotHeights[i*4] + globalSlotHeights[i*4+1] + globalSlotHeights[i*4+2] + globalSlotHeights[i*4+3];
                          return (
                            <div key={i} className="relative border-b border-zinc-200 dark:border-zinc-800" style={{ height: `${h}px` }}>
                              <span className="absolute -top-3 right-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/50 px-1">
                                {hour}:00
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Columnas de Días */}
                      <div className="flex-1 grid grid-cols-7">
                        {getDaysOfWeek(filterDate).map((day, idx) => {
                          const isToday = new Date().toDateString() === day.toDateString();

                          // Filtrar disponibilidades del día
                          const dayDisponibilidades = filteredDisponibilidades.filter(d => {
                            const date = new Date(d.fecha_hora_inicio);
                            return date.getDate() === day.getDate() && date.getMonth() === day.getMonth() && date.getFullYear() === day.getFullYear();
                          });

                          // Filtrar turnos del día
                          const dayTurnos = filteredTurnos.filter(t => {
                            const d = new Date(t.fecha_hora);
                            return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
                          });

                          return (
                            <div key={idx} className="border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 relative min-w-[120px]">
                              {/* Cabecera del Día */}
                              <div className={`h-14 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-20 flex flex-col items-center justify-center ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-zinc-900'}`}>
                                <span className={`text-xs font-medium uppercase ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                  {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                                </span>
                                <span className={`text-lg leading-tight ${isToday ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 w-7 h-7 rounded-full flex items-center justify-center' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                  {day.getDate()}
                                </span>
                              </div>

                              {/* Cuadrícula y Eventos */}
                              <div className="relative" style={{ height: `${totalCalendarHeight}px` }}>
                                {/* Líneas de horas */}
                                {Array.from({ length: TOTAL_HOURS }).map((_, i) => {
                                  const h = globalSlotHeights[i*4] + globalSlotHeights[i*4+1] + globalSlotHeights[i*4+2] + globalSlotHeights[i*4+3];
                                  const top = globalSlotTops[i*4];
                                  return (
                                    <div key={i} className="border-b border-zinc-100 dark:border-zinc-800/50 absolute w-full flex flex-col" style={{ top: `${top}px`, height: `${h}px` }}>
                                      <div className="border-b border-dashed border-zinc-100 dark:border-zinc-800/30 w-full" style={{ height: `${globalSlotHeights[i*4]}px` }}></div>
                                      <div className="border-b border-dashed border-zinc-100 dark:border-zinc-800/30 w-full" style={{ height: `${globalSlotHeights[i*4+1]}px` }}></div>
                                      <div className="border-b border-dashed border-zinc-100 dark:border-zinc-800/30 w-full" style={{ height: `${globalSlotHeights[i*4+2]}px` }}></div>
                                    </div>
                                  );
                                })}

                                {/* Bloques de Disponibilidad */}
                                {dayDisponibilidades.map(disp => {
                                  const start = new Date(disp.fecha_hora_inicio);
                                  const end = new Date(disp.fecha_hora_fin);

                                  const startHour = start.getHours() + start.getMinutes() / 60;
                                  const startIndex = Math.round((startHour - CALENDAR_START_HOUR) * 4);

                                  const endHour = end.getHours() + end.getMinutes() / 60;
                                  const endIndex = Math.round((endHour - CALENDAR_START_HOUR) * 4);

                                  if (startIndex < 0 || startIndex >= TOTAL_SLOTS) return null;

                                  const top = globalSlotTops[startIndex];
                                  let height = 0;
                                  for (let i = startIndex; i < endIndex && i < TOTAL_SLOTS; i++) {
                                    height += globalSlotHeights[i];
                                  }

                                  if (top < 0 && top + height <= 0) return null;

                                  if (disp.tipo === 'Consulta') {
                                    const durationMs = end.getTime() - start.getTime();
                                    const slotsCount = Math.floor(durationMs / (15 * 60 * 1000));

                                    return (
                                      <div
                                        key={disp.id}
                                        className="absolute left-1 right-1 z-0 flex flex-col border-l-4 border-emerald-400"
                                        style={{ top: `${Math.max(0, top)}px`, height: `${height}px` }}
                                      >
                                        {Array.from({ length: slotsCount }).map((_, i) => {
                                          const slotStart = new Date(start.getTime() + i * 15 * 60 * 1000);
                                          const tzoffset = slotStart.getTimezoneOffset() * 60000;
                                          const localISOTime = (new Date(slotStart.getTime() - tzoffset)).toISOString().slice(0, 16);
                                          const slotH = globalSlotHeights[startIndex + i] || BASE_SLOT_HEIGHT;

                                          return (
                                            <div
                                              key={`slot-${i}`}
                                              className="border-b border-emerald-200/30 dark:border-emerald-800/30 bg-emerald-50/20 dark:bg-emerald-900/10 hover:bg-emerald-100/60 dark:hover:bg-emerald-800/40 transition-colors group relative flex items-center justify-center flex-shrink-0"
                                              style={{ height: `${slotH}px` }}
                                            >
                                              <span className="absolute left-1 top-0.5 text-xs text-emerald-600/50 font-medium">
                                                {slotStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                              </span>
                                              <Link
                                                href={`/turnos/nuevo?fecha_hora=${localISOTime}&disponibilidad_id=${disp.id}&tipo=Consulta${disp.medico_id ? `&medico_id=${disp.medico_id}` : ""}`}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-600 text-white rounded-full p-0.5 shadow-sm hover:scale-110 transform"
                                                title="Nuevo turno"
                                              >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                              </Link>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={disp.id}
                                      className="absolute left-1 right-1 bg-emerald-50/40 dark:bg-emerald-900/10 border-l-4 border-emerald-300 dark:border-emerald-700/50 z-0 pointer-events-none rounded"
                                      style={{ top: `${Math.max(0, top)}px`, height: `${height}px` }}
                                    >
                                      <span className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/50 p-1 block">
                                        Disp. {disp.tipo} · {doctorLabel(doctorFor(disp))}
                                      </span>
                                    </div>
                                  );
                                })}

                                {/* Bloques de Todos los Turnos (Normales y Sobreturnos) */}
                                {dayTurnos.map(turno => {
                                  const start = new Date(turno.fecha_hora);
                                  const duration = turno.duracion || 15;

                                  const startHour = start.getHours() + start.getMinutes() / 60;
                                  const startIndex = Math.round((startHour - CALENDAR_START_HOUR) * 4);

                                  if (startIndex < 0 || startIndex >= TOTAL_SLOTS) return null;

                                  // Agrupar turnos que empiezan exactamente a la misma hora para apilarlos verticalmente
                                  const overlappingTurnos = dayTurnos.filter(t => Math.abs(new Date(t.fecha_hora).getTime() - start.getTime()) < 60000);
                                  // Ordenar: turno normal primero, luego sobreturnos (y por ID para estabilidad)
                                  overlappingTurnos.sort((a, b) => {
                                    if (a.es_sobreturno === b.es_sobreturno) return a.id.localeCompare(b.id);
                                    return a.es_sobreturno ? 1 : -1;
                                  });

                                  const index = overlappingTurnos.findIndex(t => t.id === turno.id);
                                  const count = overlappingTurnos.length;

                                  const baseTop = globalSlotTops[startIndex];

                                  const bgClass = getStateColorClass(turno.estado);
                                  const isSobreturno = turno.es_sobreturno;

                                  // Todos los turnos y sobreturnos tienen exactamente la misma altura fija
                                  const height = BASE_SLOT_HEIGHT;
                                  // El top suma la posición base más el desplazamiento por turnos anteriores apilados
                                  const top = baseTop + (index * BASE_SLOT_HEIGHT);

                                  // Ocupan todo el ancho, ya no comparten horizontalmente
                                  const leftClass = 'left-1 right-1 z-20';
                                  // Diferenciar visualmente los sobreturnos (borde distinto)
                                  const borderStyle = isSobreturno ? 'border-2 border-orange-400 dark:border-orange-500' : 'border border-zinc-200 dark:border-zinc-700';

                                  // Verificar si hay un turno asignado inmediatamente después del bloque original
                                  const endOfThisTurn = new Date(start.getTime() + duration * 60 * 1000);
                                  const hasNextAssigned = dayTurnos.some(t => Math.abs(new Date(t.fecha_hora).getTime() - endOfThisTurn.getTime()) < 60000);

                                  // Verificar si hay un turno asignado inmediatamente antes del bloque original
                                  const prevTurn = dayTurnos.find(t => Math.abs(new Date(t.fecha_hora).getTime() + (t.duracion || 15) * 60 * 1000 - start.getTime()) < 60000);
                                  const hasPrevAssigned = !!prevTurn;

                                  // Comprobar si ya existe un sobreturno en este horario o en el anterior
                                  const hasSobreturnoHere = overlappingTurnos.some(t => t.es_sobreturno);
                                  const prevSlotTurnos = prevTurn ? dayTurnos.filter(t => Math.abs(new Date(t.fecha_hora).getTime() - new Date(prevTurn.fecha_hora).getTime()) < 60000) : [];
                                  const prevHasSobreturno = prevSlotTurnos.some(t => t.es_sobreturno);

                                  // Solo mostrar botones "+" en los extremos del bloque apilado si no hay sobreturnos ya asignados en ese hueco
                                  const showUpperPlus = (index === 0) && hasPrevAssigned && prevTurn && !prevHasSobreturno;
                                  const showLowerPlus = (index === count - 1) && hasNextAssigned && !hasSobreturnoHere;

                                  return (
                                    <div
                                      key={turno.id}
                                      className={`absolute ${leftClass} rounded ${borderStyle} hover:z-40 group transition-all hover:shadow-lg hover:ring-2 hover:ring-blue-400/50 cursor-pointer ${bgClass} opacity-100 shadow-sm`}
                                      style={{ top: `${Math.max(0, top)}px`, height: `${height}px`, minHeight: `${BASE_SLOT_HEIGHT}px` }}
                                      onClick={(e) => handleTurnoClick(turno, e)}
                                    >
                                      <div className="p-1 h-full relative flex flex-col justify-center overflow-hidden rounded">
                                        {isSobreturno && (
                                          <div className="mb-0.5">
                                            <span className="text-[10px] font-bold uppercase text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 px-1.5 py-0.5 rounded inline-block">
                                              SOBRETURNO
                                            </span>
                                          </div>
                                        )}
                                        <div className="font-semibold text-sm leading-tight break-words whitespace-normal">
                                          {turno.expand?.paciente_id ? `${turno.expand.paciente_id.apellido}, ${turno.expand.paciente_id.nombre}` : 'Sin paciente'}
                                        </div>
                                        <div className="text-xs leading-tight opacity-80 truncate mt-0.5">
                                          {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {turno.tipo || 'Consulta'}
                                        </div>
                                        {selectedMedicoId === "all" && (
                                          <div className="text-[11px] leading-tight opacity-75 truncate mt-0.5">
                                            {doctorLabel(doctorFor(turno))}
                                          </div>
                                        )}
                                      </div>

                                      {/* Botón "+" para sobreturno (ubicado en el borde superior) */}
                                      {showUpperPlus && (
                                        <div onClick={(e) => e.stopPropagation()}>
                                          <Link
                                            href={`/turnos/sobreturno/nuevo?fecha_hora=${prevTurn.fecha_hora}&tipo=${prevTurn.tipo || 'Consulta'}${prevTurn.medico_id ? `&medico_id=${prevTurn.medico_id}` : ""}`}
                                            className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-orange-500 text-white rounded-full p-0.5 shadow-md hover:scale-110 hover:bg-orange-600 z-30 border border-white dark:border-zinc-800"
                                            title="Añadir sobreturno"
                                          >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                          </Link>
                                        </div>
                                      )}

                                      {/* Botón "+" para sobreturno (ubicado en el borde inferior) */}
                                      {showLowerPlus && (
                                        <div onClick={(e) => e.stopPropagation()}>
                                          <Link
                                            href={`/turnos/sobreturno/nuevo?fecha_hora=${turno.fecha_hora}&tipo=${turno.tipo || 'Consulta'}${turno.medico_id ? `&medico_id=${turno.medico_id}` : ""}`}
                                            className="absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-orange-500 text-white rounded-full p-0.5 shadow-md hover:scale-110 hover:bg-orange-600 z-30 border border-white dark:border-zinc-800"
                                            title="Añadir sobreturno"
                                          >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                          </Link>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* VISTA SALA DE ESPERA */}
            {viewMode === 'waiting-room' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                        Recepcion del dia
                      </p>
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                        Sala de espera
                      </h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {formatDate(new Date(dailyDate + 'T12:00:00'))} · {selectedMedicoId === "all" ? "Todos los medicos" : doctorLabel(medicos.find((medico) => medico.id === selectedMedicoId))}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {[
                        ["Total", waitingRoomStats.total],
                        ["Proximos", waitingRoomStats.upcoming],
                        ["En espera", waitingRoomStats.waiting],
                        ["En consulta", waitingRoomStats.inConsultation],
                        ["Atendidos", waitingRoomStats.attended],
                        ["Ausentes", waitingRoomStats.absent],
                        ["Cancelados", waitingRoomStats.canceled],
                      ].map(([label, value]) => (
                        <span key={label} className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          {label}: {value}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Proximo turno
                    </div>
                    <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {nextWaitingRoomTurno ? (
                        <>
                          {shortTime(new Date(nextWaitingRoomTurno.fecha_hora))} · {nextWaitingRoomTurno.expand?.paciente_id ? `${nextWaitingRoomTurno.expand.paciente_id.apellido.toUpperCase()}, ${nextWaitingRoomTurno.expand.paciente_id.nombre.toUpperCase()}` : "Paciente no encontrado"}
                        </>
                      ) : (
                        "No hay turnos pendientes."
                      )}
                    </div>
                  </div>
                </div>

                {waitingRoomStats.total === 0 ? (
                  <div className="text-center text-zinc-500 dark:text-zinc-400 py-12 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <p className="text-lg">No hay turnos para la sala de espera.</p>
                    <p className="text-sm mt-2">Proba con otra fecha, otro medico o limpiando la busqueda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {waitingRoomGroups.map((group) => (
                      <section key={group.key} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {group.title}
                          </h3>
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                            {group.items.length}
                          </span>
                        </div>
                        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {group.items.length === 0 ? (
                            <div className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                              {group.empty}
                            </div>
                          ) : (
                            group.items.map((turno) => (
                              <div key={turno.id} className="px-5 py-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                        {shortTime(new Date(turno.fecha_hora))}
                                      </span>
                                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStateColorClass(turno.estado)}`}>
                                        {turno.estado || "Proximo"}
                                      </span>
                                      {turno.es_sobreturno && (
                                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                                          Sobreturno
                                        </span>
                                      )}
                                      {waitingRoomTimeLabel(turno) && (
                                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                          {waitingRoomTimeLabel(turno)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">
                                      {turno.expand?.paciente_id ? `${turno.expand.paciente_id.apellido.toUpperCase()}, ${turno.expand.paciente_id.nombre.toUpperCase()}` : "Paciente no encontrado"}
                                    </div>
                                    {turno.expand?.paciente_id && (
                                      <button
                                        type="button"
                                        onClick={() => openPatientQuickCard(turno.paciente_id, turno.expand?.paciente_id)}
                                        className="mt-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                      >
                                        Ficha paciente
                                      </button>
                                    )}
                                    <div className="mt-1 flex flex-wrap gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                                      {selectedMedicoId === "all" && <span>{doctorLabel(doctorFor(turno))}</span>}
                                      {patientMeta(turno.expand?.paciente_id).map((meta) => (
                                        <span key={meta}>{meta}</span>
                                      ))}
                                      <span>{turno.tipo || "Consulta"} {turno.duracion ? `(${turno.duracion} min)` : ""}</span>
                                      <span>{turno.motivo || "Sin motivo"}</span>
                                    </div>
                                    {turno.observaciones && (
                                      <div className="mt-2 line-clamp-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
                                        {turno.observaciones}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                    {isDoctorRole && (
                                      <button
                                        type="button"
                                        onClick={() => handleConsultationAction(turno)}
                                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                                      >
                                        {consultationActionLabel(turno)}
                                      </button>
                                    )}
                                    {WAITING_ROOM_ACTIONS.map(({ label, estado }) => (
                                      <button
                                        key={label}
                                        type="button"
                                        onClick={() => handleEstadoChange(turno.id, estado)}
                                        disabled={turno.estado === estado}
                                        className={
                                          estado === "Cancelado"
                                            ? "rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-45 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-900/40"
                                            : "rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-45 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                        }
                                      >
                                        {label}
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => handleTurnoClick(turno)}
                                      aria-label={`Gestionar turno ${turno.motivo || ""}`.trim()}
                                      className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                                    >
                                      Gestionar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VISTA DIARIA */}
            {viewMode === 'daily' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                        {isDoctorRole ? "Jornada de atencion" : "Tablero operativo diario"}
                      </p>
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 capitalize">
                        {isDoctorRole ? "Pacientes del dia" : "Agenda diaria"} del {formatDate(new Date(dailyDate + 'T12:00:00'))}
                      </h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {selectedMedicoId === "all" ? "Vista agrupada por medico" : doctorLabel(medicos.find((medico) => medico.id === selectedMedicoId))}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {isDoctorRole ? "Pacientes para atender:" : "Mostrando"} {dailyStats.total} de {dailySearchStats.total} turnos filtrados ({dailyTotalStats.total} del dia).
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                      {[
                        ["Turnos", dailyStats.total],
                        ["En espera", dailyStats.waiting],
                        ["En consulta", dailyStats.inConsultation],
                        ["Atendidos", dailyStats.attended],
                        ["Ausentes", dailyStats.absent],
                        ["Cancelados", dailyStats.canceled],
                        ["Sobreturnos", dailyStats.overbooking],
                        ["Atrasados", dailyStats.late],
                      ].map(([label, value]) => (
                        <span key={label} className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          {label}: {value}
                        </span>
                      ))}
                      <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        Disponibilidades: {dailyDisponibilidades.length}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Proximo turno</div>
                      <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {nextDailyTurno ? (
                          <>
                            {new Date(nextDailyTurno.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {nextDailyTurno.expand?.paciente_id ? `${nextDailyTurno.expand.paciente_id.apellido.toUpperCase()}, ${nextDailyTurno.expand.paciente_id.nombre.toUpperCase()}` : "Paciente no encontrado"}
                          </>
                        ) : (
                          "Sin turnos visibles"
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Filtro activo</div>
                      <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {dailyActiveFilterLabel}
                        {filterPatient ? ` · Busqueda: ${filterPatient}` : ""}
                      </div>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Cobertura de agenda</div>
                      <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {dailyDisponibilidades.length} bloques · {dailyTotalStats.overbooking} sobreturnos
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {DAILY_OPERATION_FILTERS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setDailyOperationFilter(option.key)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                          dailyOperationFilter === option.key
                            ? "border-blue-500 bg-blue-600 text-white"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {dailyAppointmentConflicts.length > 0 && (
                  <section
                    aria-label="Turnos a resolver"
                    className="rounded-xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/20"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Turnos a resolver</p>
                        <h3 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">Turnos dentro de horarios bloqueados</h3>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                          Estos turnos fueron otorgados, pero ahora coinciden con un bloqueo de agenda.
                        </p>
                      </div>
                      <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                        {dailyAppointmentConflicts.length}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {dailyAppointmentConflicts.map(({ turno, block, start }) => {
                        const patient = turno.expand?.paciente_id;
                        const doctor = medicos.find((medico) => medico.id === turno.medico_id);
                        return (
                          <article
                            key={`${turno.id}-${block.id}`}
                            className="rounded-lg border border-amber-200 bg-white p-4 dark:border-amber-900/60 dark:bg-zinc-950"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                    {shortTime(start)}
                                  </span>
                                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                    {doctorLabel(doctor)}
                                  </span>
                                </div>
                                <h4 className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                  {patient ? patientLabel(patient) : "Paciente no encontrado"}
                                </h4>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                  {turno.motivo || "Sin motivo cargado"}
                                </p>
                                <p className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
                                  {blockLabel(block)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleTurnoClick(turno)}
                                className="w-fit rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
                              >
                                Gestionar
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )}

                {isDoctorRole && (
                  <section
                    aria-label="Tablero diario del medico"
                    className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Tablero diario del medico</p>
                        <h3 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">Atencion clinica de hoy</h3>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {doctorDailyTurnos.filter(isClinicalPendingTurno).length} pacientes requieren seguimiento clinico en esta jornada.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                          En consulta: {dailyTotalStats.inConsultation}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          En espera: {dailyTotalStats.waiting}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                          Atendidos: {dailyTotalStats.attended}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                      {renderDoctorCareCard("Paciente en consulta", doctorCurrentTurno, "No hay ningun paciente en consulta.", "blue")}
                      {renderDoctorCareCard("Proximo paciente", doctorNextTurno, "No hay pacientes pendientes por ahora.", "emerald")}
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Pendientes de atencion</div>
                          <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                            {doctorPendingTurnos.length}
                          </span>
                        </div>
                        {doctorPendingTurnos.length === 0 ? (
                          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No quedan pacientes pendientes fuera del proximo turno.</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {doctorPendingTurnos.slice(0, 4).map((turno) => {
                              const patient = turno.expand?.paciente_id;
                              return (
                                <div key={turno.id} className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        {shortTime(new Date(turno.fecha_hora))} - {patient ? `${patient.apellido.toUpperCase()}, ${patient.nombre.toUpperCase()}` : "Paciente no encontrado"}
                                      </div>
                                      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        {turno.estado || "Sin estado"} - {turno.motivo || "Sin motivo"}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleConsultationAction(turno)}
                                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                                    >
                                      {consultationActionLabel(turno)}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            {doctorPendingTurnos.length > 4 && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Y {doctorPendingTurnos.length - 4} pacientes pendientes mas en la lista.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div aria-label="Consultas en curso" className="mt-5 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Consultas en curso</p>
                          <h4 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">Avances pendientes de cierre</h4>
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            Retoma consultas guardadas como avance sin buscarlas en el historial general.
                          </p>
                        </div>
                        <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                          {consultasEnCurso.length}
                        </span>
                      </div>

                      {isLoadingConsultasEnCurso ? (
                        <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Cargando consultas en curso...</div>
                      ) : consultasEnCurso.length === 0 ? (
                        <div className="mt-4 rounded-lg border border-dashed border-blue-200 bg-white/70 p-4 text-sm text-zinc-600 dark:border-blue-900/50 dark:bg-zinc-950/50 dark:text-zinc-400">
                          No hay consultas en curso para retomar.
                        </div>
                      ) : (
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          {consultasEnCurso.map((consulta) => {
                            const patient = consulta.expand?.paciente_id;
                            return (
                              <article key={consulta.id} className="rounded-lg border border-blue-200 bg-white p-4 dark:border-blue-900/50 dark:bg-zinc-950">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${consultaEstadoBadgeClass(consulta.estado)}`}>
                                        {consultaEstadoLabel(consulta.estado)}
                                      </span>
                                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                        {inProgressConsultationDateLabel(consulta.fecha)}
                                      </span>
                                    </div>
                                    <h5 className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                      {patient ? patientLabel(patient) : "Paciente no encontrado"}
                                    </h5>
                                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                                      {consulta.motivo_consulta || "Sin motivo cargado"}
                                    </p>
                                    {patient && patientMeta(patient).length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                        {patientMeta(patient).map((item) => (
                                          <span key={item} className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-900">
                                            {item}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex shrink-0 flex-wrap gap-2">
                                    <Link
                                      href={`/consultas/${consulta.id}`}
                                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                                    >
                                      Retomar
                                    </Link>
                                    {consulta.paciente_id && (
                                      <Link
                                        href={`/pacientes/${consulta.paciente_id}?mode=view`}
                                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                      >
                                        Ficha
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {dailyDoctorSections.length === 0 ? (
                  <div className="text-center text-zinc-500 dark:text-zinc-400 py-12 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <p className="text-lg">No hay agenda para este dia.</p>
                    <p className="text-sm mt-2">Proba seleccionando otra fecha, otro medico o creando una disponibilidad.</p>
                  </div>
                ) : (
                  dailyDoctorSections.map((section) => (
                    <section key={section.medico.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {doctorLabel(section.medico)}
                          </h3>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {section.stats.total} turnos otorgados · {section.disponibilidades.length} bloques disponibles · {section.turnos.length} visibles
                          </p>
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                            {section.nextTurno ? (
                              <>
                                Proximo: {new Date(section.nextTurno.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {section.nextTurno.expand?.paciente_id ? `${section.nextTurno.expand.paciente_id.apellido.toUpperCase()}, ${section.nextTurno.expand.paciente_id.nombre.toUpperCase()}` : "Paciente no encontrado"}
                              </>
                            ) : (
                              "Sin proximo turno visible"
                            )}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {[
                              ["Espera", section.visibleStats.waiting],
                              ["Consulta", section.visibleStats.inConsultation],
                              ["Atendidos", section.visibleStats.attended],
                              ["Ausentes", section.visibleStats.absent],
                              ["Sobreturnos", section.visibleStats.overbooking],
                              ["Atrasados", section.visibleStats.late],
                            ].map(([label, value]) => (
                              <span key={label} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                {label}: {value}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 lg:max-w-3xl">
                          {section.recurringSlots.length > 0 && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/60 dark:bg-blue-950/20">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                                Horarios recurrentes
                              </div>
                              <div className="mb-2 flex flex-wrap gap-2 text-xs font-semibold text-blue-800 dark:text-blue-200">
                                {section.recurringRules.map((rule) => (
                                  <span key={rule.id} className="rounded-full bg-white px-2.5 py-1 dark:bg-blue-950/60">
                                    {rule.hora_inicio} - {rule.hora_fin} Â· {rule.tipo}
                                  </span>
                                ))}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {section.recurringSlots.map((slot) => {
                                  const disp = availabilityFromRecurringSlot(slot, section.medico);
                                  const time = shortTime(slot.start);
                                  const appointment = slot.appointment as Turno | undefined;
                                  const patient = appointment?.expand?.paciente_id;

                                  if (slot.block && appointment) {
                                    return (
                                      <button
                                        key={slot.id}
                                        type="button"
                                        onClick={() => handleTurnoClick(appointment)}
                                        className="inline-flex min-w-24 items-center justify-center rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/45"
                                        title={blockLabel(slot.block)}
                                      >
                                        {time} Conflicto
                                      </button>
                                    );
                                  }

                                  if (slot.block) {
                                    return (
                                      <button
                                        key={slot.id}
                                        type="button"
                                        disabled
                                        className="inline-flex min-w-24 cursor-not-allowed items-center justify-center rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-400"
                                        title={blockLabel(slot.block)}
                                      >
                                        {time} Bloqueado
                                      </button>
                                    );
                                  }

                                  if (appointment) {
                                    return (
                                      <button
                                        key={slot.id}
                                        type="button"
                                        onClick={() => openQuickAppointment(disp, slot.start, "overbooking", appointment)}
                                        className="inline-flex min-w-24 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/35"
                                        title={patient ? `Sobreturno sobre ${patient.apellido}, ${patient.nombre}` : "Crear sobreturno"}
                                      >
                                        {time} Ocupado
                                      </button>
                                    );
                                  }

                                  return (
                                    <button
                                      key={slot.id}
                                      type="button"
                                      onClick={() => openQuickAppointment(disp, slot.start)}
                                      className="inline-flex min-w-24 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/35"
                                      title={`Alta rapida ${time}`}
                                    >
                                      {time} Libre
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {section.disponibilidades.length === 0 && section.recurringSlots.length === 0 ? (
                            <span className="rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                              Sin horarios configurados
                            </span>
                          ) : (
                            section.disponibilidades.map((disp) => {
                              const start = new Date(disp.fecha_hora_inicio);
                              const end = new Date(disp.fecha_hora_fin);
                              const slots = availabilitySlots(disp, section.allTurnos);
                              return (
                                <div
                                  key={disp.id}
                                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/60"
                                >
                                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                    {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {disp.tipo}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {slots.map((slot) => {
                                      const time = slot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                      const appointment = slot.appointment;
                                      const patient = appointment?.expand?.paciente_id;

                                      if (slot.block && appointment) {
                                        return (
                                          <button
                                            key={slot.start.toISOString()}
                                            type="button"
                                            onClick={() => handleTurnoClick(appointment)}
                                            className="inline-flex min-w-24 items-center justify-center rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/45"
                                            title={blockLabel(slot.block)}
                                          >
                                            {time} Conflicto
                                          </button>
                                        );
                                      }

                                      if (slot.block) {
                                        return (
                                          <button
                                            key={slot.start.toISOString()}
                                            type="button"
                                            disabled
                                            className="inline-flex min-w-24 cursor-not-allowed items-center justify-center rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-400"
                                            title={blockLabel(slot.block)}
                                          >
                                            {time} Bloqueado
                                          </button>
                                        );
                                      }

                                      if (appointment) {
                                        return (
                                          <button
                                            key={slot.start.toISOString()}
                                            type="button"
                                            onClick={() => openQuickAppointment(disp, slot.start, "overbooking", appointment)}
                                            className="inline-flex min-w-24 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/35"
                                            title={patient ? `Sobreturno sobre ${patient.apellido}, ${patient.nombre}` : "Crear sobreturno"}
                                          >
                                            {time} Ocupado
                                          </button>
                                        );
                                      }

                                      return (
                                        <button
                                          key={slot.start.toISOString()}
                                          type="button"
                                          onClick={() => openQuickAppointment(disp, slot.start)}
                                          className="inline-flex min-w-24 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/35"
                                          title={`Alta rapida ${time}`}
                                        >
                                          {time} Libre
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {section.turnos.length === 0 ? (
                          <div className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                            {dailyOperationFilter === "all"
                              ? "Todavia no hay turnos otorgados para este medico en el dia."
                              : "No hay turnos que coincidan con la busqueda o el filtro seleccionado."}
                          </div>
                        ) : (
                          section.turnos.map((turno) => (
                            <div key={turno.id} className={`grid grid-cols-1 gap-4 px-5 py-4 lg:grid-cols-[110px_1fr_auto] lg:items-center ${isLateTurno(turno) ? "bg-orange-50/70 dark:bg-orange-950/10" : ""}`}>
                              <div className="flex items-center gap-3 lg:block">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                  {new Date(turno.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {turno.es_sobreturno && (
                                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                                    Sobreturno
                                  </span>
                                )}
                                {isLateTurno(turno) && (
                                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                                    Atrasado
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                                  {turno.expand?.paciente_id ? `${turno.expand.paciente_id.apellido.toUpperCase()}, ${turno.expand.paciente_id.nombre.toUpperCase()}` : 'Paciente no encontrado'}
                                </div>
                                {turno.expand?.paciente_id && (
                                  <button
                                    type="button"
                                    onClick={() => openPatientQuickCard(turno.paciente_id, turno.expand?.paciente_id)}
                                    className="mt-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    Ficha paciente
                                  </button>
                                )}
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                                  {patientDocument(turno.expand?.paciente_id) && <span>DNI {patientDocument(turno.expand?.paciente_id)}</span>}
                                  {turno.expand?.paciente_id?.telefono && <span>Tel {turno.expand.paciente_id.telefono}</span>}
                                  {turno.expand?.paciente_id?.obra_social && <span>{turno.expand.paciente_id.obra_social}</span>}
                                  <span>{turno.tipo || 'Consulta'} {turno.duracion ? `(${turno.duracion} min)` : ''}</span>
                                  <span>{turno.motivo || 'Sin motivo'}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                {[
                                  ["Llego", "En espera"],
                                  ["En consulta", "En consulta"],
                                  ["Atendido", "Atendido"],
                                  ["Ausente", "Ausente"],
                                ].map(([label, estado]) => (
                                  <button
                                    key={label}
                                    type="button"
                                    onClick={() => handleEstadoChange(turno.id, estado)}
                                    disabled={turno.estado === estado}
                                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-45 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                  >
                                    {label}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => handleTurnoClick(turno)}
                                  aria-label={`Gestionar turno ${turno.motivo || ""}`.trim()}
                                  className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                                  title="Gestionar turno"
                                >
                                  Gestionar
                                </button>
                                <select
                                  value={turno.estado || ""}
                                  onChange={(event) => handleEstadoChange(turno.id, event.target.value)}
                                  className={`min-w-36 rounded-lg border px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${getStateColorClass(turno.estado)}`}
                                  title="Cambiar estado"
                                >
                                  <option value="">Sin asignar</option>
                                  {ESTADOS.map((estado) => (
                                    <option key={estado} value={estado}>{estado}</option>
                                  ))}
                                </select>
                                {isDoctorRole ? (
                                  <button
                                    type="button"
                                    onClick={() => handleConsultationAction(turno)}
                                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                                  >
                                    {consultationActionLabel(turno)}
                                  </button>
                                ) : turno.consulta_id ? (
                                  <Link href={`/consultas/${turno.consulta_id}`} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-colors" title="Ver consulta">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </Link>
                                ) : (
                                  <Link href={`/consultas/nueva?paciente_id=${turno.paciente_id}&turno_id=${turno.id}`} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 rounded-lg transition-colors" title="Crear consulta">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                  </Link>
                                )}
                                <Link href={`/turnos/${turno.id}?mode=view`} className="p-2 text-zinc-500 bg-zinc-100 hover:bg-zinc-200 dark:text-zinc-400 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors" title="Ver turno">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </Link>
                                <Link href={`/turnos/${turno.id}`} className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 rounded-lg transition-colors" title="Editar turno">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </Link>
                                <button onClick={() => handleDelete(turno.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors" title="Eliminar turno">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  ))
                )}
              </div>
            )}

            {/* VISTA DIARIA LEGACY */}
            {false && viewMode === 'daily' && (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm p-6">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 text-center capitalize flex items-center justify-center gap-2">
                  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Agenda del {filterDate ? formatDate(new Date(filterDate + 'T12:00:00')) : formatDate(new Date())}
                </h2>
                <div className="max-w-4xl mx-auto">
                  {filteredTurnos.length === 0 ? (
                    <div className="text-center text-zinc-500 dark:text-zinc-400 py-12 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                      <p className="text-lg">No hay turnos para este día.</p>
                      <p className="text-sm mt-2">Prueba seleccionando otra fecha o creando un nuevo turno.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredTurnos.map(turno => (
                        <div key={turno.id} className="flex flex-col sm:flex-row gap-4 p-5 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm">
                          <div className="flex-shrink-0 text-center sm:text-left sm:w-32 border-b sm:border-b-0 sm:border-r border-zinc-200 dark:border-zinc-800 pb-4 sm:pb-0 sm:pr-4 flex flex-col justify-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {new Date(turno.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="mt-2 flex flex-col gap-1 items-center sm:items-start">
                              {turno.es_sobreturno && (
                                <span className="text-[10px] font-bold uppercase text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 px-2 py-0.5 rounded-full">
                                  SOBRETURNO
                                </span>
                              )}
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full inline-block ${getStateColorClass(turno.estado)}`}>
                                {turno.estado ? turno.estado.charAt(0).toUpperCase() + turno.estado.slice(1) : 'Sin asignar'}
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col justify-center">
                            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                              {turno.expand?.paciente_id ? `${turno.expand.paciente_id.apellido.toUpperCase()}, ${turno.expand.paciente_id.nombre.toUpperCase()}` : 'Paciente no encontrado'}
                            </div>
                            {selectedMedicoId === "all" && (
                              <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                {doctorLabel(doctorFor(turno))}
                              </div>
                            )}
                            <div className="mt-1 flex flex-wrap gap-2 items-center">
                              {turno.expand?.paciente_id && (
                                <span className="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 px-2.5 py-1 rounded-md">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                  </svg>
                                  {turno.expand.paciente_id.dni}
                                </span>
                              )}
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                {turno.tipo || 'Consulta'} {turno.duracion ? `(${turno.duracion} min)` : ''}
                              </span>
                            </div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-300 mt-2 flex items-center gap-1">
                              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <span className="font-medium">Motivo:</span> {turno.motivo || 'No especificado'}
                            </div>
                          </div>

                          <div className="flex items-center justify-end sm:justify-start gap-2 pt-4 sm:pt-0 border-t sm:border-t-0 border-zinc-200 dark:border-zinc-800">
                             {turno.consulta_id ? (
                                <Link
                                  href={`/consultas/${turno.consulta_id}`}
                                  className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-colors flex items-center gap-1"
                                  title="Ver Consulta"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </Link>
                              ) : (
                                <Link
                                  href={`/consultas/nueva?paciente_id=${turno.paciente_id}&turno_id=${turno.id}`}
                                  className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 rounded-lg transition-colors flex items-center gap-1"
                                  title="Crear Consulta"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </Link>
                              )}
                              <Link
                                href={`/turnos/${turno.id}?mode=view`}
                                className="p-2 text-zinc-500 bg-zinc-100 hover:bg-zinc-200 dark:text-zinc-400 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                title="Ver turno"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </Link>
                              <Link
                                href={`/turnos/${turno.id}`}
                                className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
                                title="Editar turno"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Link>
                              <button
                                onClick={() => handleDelete(turno.id)}
                                className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                                title="Eliminar turno"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {quickAppointmentSuccess && (
        <div className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-lg dark:border-emerald-900/60 dark:bg-emerald-900/25 dark:text-emerald-100" role="status">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold">Turno creado</div>
              <div className="mt-1 text-sm">
                {quickAppointmentSuccess.modeLabel} · {quickAppointmentSuccess.patientLabel}
              </div>
              <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-200">
                {quickAppointmentSuccess.doctorLabel} · {quickAppointmentSuccess.dateLabel} · {quickAppointmentSuccess.timeLabel}
              </div>
              {quickAppointmentSuccess.motivo && (
                <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-200">
                  {quickAppointmentSuccess.motivo}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setQuickAppointmentSuccess(null)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal de alta rapida de turno */}
      {quickAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setQuickAppointment(null)}>
          <div
            className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {quickAppointment.mode === "overbooking" ? "Alta rapida de sobreturno" : "Alta rapida de turno"}
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {doctorLabel(doctorFor(quickAppointment.disponibilidad))} · {formatDate(quickAppointment.fechaHora)} · {quickAppointment.fechaHora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {quickAppointment.disponibilidad.tipo}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                  <span className={`rounded-full px-2.5 py-1 ${
                    quickAppointment.mode === "overbooking"
                      ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                  }`}>
                    {quickAppointment.mode === "overbooking" ? "Sobreturno" : "Turno regular"}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    {quickAppointment.disponibilidad.tipo}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickAppointment(null)}
                className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                title="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {quickAppointment.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                  {quickAppointment.error}
                </div>
              )}

              <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/60" aria-label="Resumen del turno">
                <div className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Resumen del turno</div>
                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  {[
                    ["Medico", doctorLabel(doctorFor(quickAppointment.disponibilidad))],
                    ["Fecha", formatDate(quickAppointment.fechaHora)],
                    ["Hora", shortTime(quickAppointment.fechaHora)],
                    ["Tipo", quickAppointment.disponibilidad.tipo],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</div>
                      <div className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  Disponibilidad: {shortTime(new Date(quickAppointment.disponibilidad.fecha_hora_inicio))} - {shortTime(new Date(quickAppointment.disponibilidad.fecha_hora_fin))} · Duracion inicial {quickAppointment.duracion} min
                </div>
              </section>

              {quickAppointment.mode === "overbooking" && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800 dark:border-orange-900/60 dark:bg-orange-900/20 dark:text-orange-200">
                  <div className="font-semibold">Sobreturno sobre horario ocupado</div>
                  <div className="mt-1 text-orange-700 dark:text-orange-300">
                    {quickAppointment.referenceAppointment?.expand?.paciente_id
                      ? `${quickAppointment.referenceAppointment.expand.paciente_id.apellido}, ${quickAppointment.referenceAppointment.expand.paciente_id.nombre}`
                      : "El horario ya tiene un turno asignado."}
                  </div>
                  <div className="mt-1 text-xs text-orange-700 dark:text-orange-300">
                    Se guardara como sobreturno y quedara asociado a esta disponibilidad.
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Paciente</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickAppointment.pacienteSearch}
                    onChange={(event) => {
                      updateQuickAppointment({ pacienteSearch: event.target.value, paciente_id: "" });
                      setQuickPatientDayAppointments([]);
                      setQuickWarningsAcknowledged(false);
                    }}
                    placeholder="Buscar por apellido, nombre, DNI o telefono..."
                    className="min-w-0 flex-1 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => updateQuickNewPatient({ isOpen: !quickNewPatient.isOpen, error: "" })}
                    className="px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap"
                  >
                    + Nuevo
                  </button>
                </div>
                {quickAppointment.isSearching && (
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Buscando pacientes...</p>
                )}
                {quickAppointment.patientResults.length > 0 && (
                  <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
                    {quickAppointment.patientResults.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => updateQuickAppointment({ paciente_id: patient.id, pacienteSearch: patientLabel(patient), error: "" })}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                          quickAppointment.paciente_id === patient.id
                            ? "bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                        }`}
                      >
                        <span className="block font-medium">{patient.apellido}, {patient.nombre}</span>
                        <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                          {patientMeta(patient).join(" · ") || "Sin datos adicionales"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {quickShowNoPatientResults && (
                  <div className="mt-2 rounded-lg border border-dashed border-zinc-300 px-3 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    No encontramos pacientes para esa busqueda.
                  </div>
                )}
                {selectedQuickPatient && (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-900/20 dark:text-blue-100">
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Paciente seleccionado</div>
                    <div className="mt-1 font-semibold">{selectedQuickPatient.apellido}, {selectedQuickPatient.nombre}</div>
                    <div className="mt-1 text-xs text-blue-700 dark:text-blue-200">
                      {patientMeta(selectedQuickPatient).join(" · ") || "Sin datos adicionales"}
                    </div>
                  </div>
                )}
                {quickNewPatient.isOpen && (
                  <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Nuevo paciente</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">Datos minimos para otorgar el turno.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateQuickNewPatient({ isOpen: false, error: "" })}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        Cerrar
                      </button>
                    </div>
                    {quickNewPatient.error && (
                      <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                        {quickNewPatient.error}
                      </div>
                    )}
                    {renderDuplicateCandidates(
                      quickNewPatient.duplicateCandidates,
                      quickNewPatient.isCheckingDuplicates,
                      quickNewPatient.duplicateError
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={quickNewPatient.apellido}
                        onChange={(event) => updateQuickNewPatient({ apellido: event.target.value })}
                        placeholder="Apellido"
                        className="px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                      />
                      <input
                        type="text"
                        value={quickNewPatient.nombre}
                        onChange={(event) => updateQuickNewPatient({ nombre: event.target.value })}
                        placeholder="Nombre"
                        className="px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                      />
                      <input
                        type="text"
                        value={quickNewPatient.dni}
                        onChange={(event) => updateQuickNewPatient({ dni: event.target.value })}
                        placeholder="DNI"
                        className="px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                      />
                      <input
                        type="text"
                        value={quickNewPatient.telefono}
                        onChange={(event) => updateQuickNewPatient({ telefono: event.target.value })}
                        placeholder="Telefono"
                        className="px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                      />
                      <input
                        type="text"
                        value={quickNewPatient.obra_social}
                        onChange={(event) => updateQuickNewPatient({ obra_social: event.target.value })}
                        placeholder="Obra social"
                        className="sm:col-span-2 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={createQuickPatient}
                      disabled={quickNewPatient.isSaving}
                      className="mt-3 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      {quickNewPatient.isSaving ? "Guardando..." : "Crear y seleccionar"}
                    </button>
                  </div>
                )}
                {isLoadingQuickPatientAppointments && (
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Consultando turnos del paciente...</p>
                )}
                {quickActivePatientAppointments.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200">
                    <div className="font-semibold">Advertencias del paciente</div>
                    <div className="mt-1">Este paciente tiene proximos turnos activos.</div>
                    {quickSameDoctorActiveAppointments.length > 0 && (
                      <div className="mt-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                        Hay un turno activo con este mismo medico.
                      </div>
                    )}
                    <div className="mt-1 space-y-1 text-xs">
                      {quickActivePatientAppointments.slice(0, 4).map((turno) => (
                        <div key={turno.id}>
                          {new Date(turno.fecha_hora).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {turno.tipo || "Turno"} · {turno.expand?.medico_id ? doctorLabel(turno.expand.medico_id) : "Medico"}
                        </div>
                      ))}
                    </div>
                    <label className="mt-3 flex items-start gap-2 text-xs font-medium text-amber-900 dark:text-amber-100">
                      <input
                        type="checkbox"
                        checked={quickWarningsAcknowledged}
                        onChange={(event) => setQuickWarningsAcknowledged(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-amber-300 text-blue-600 focus:ring-blue-500"
                      />
                      Revise las advertencias y quiero guardar el turno igual.
                    </label>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Duracion</label>
                  <select
                    value={quickAppointment.duracion}
                    onChange={(event) => updateQuickAppointment({ duracion: event.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                  >
                    <option value="15">15 minutos</option>
                    <option value="30">30 minutos</option>
                    <option value="45">45 minutos</option>
                    <option value="60">60 minutos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Estado inicial</label>
                  <div className="px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                    En espera
                  </div>
                </div>
              </div>

              {quickAppointment.mode === "overbooking" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tipo de sobreturno</label>
                  <select
                    value={quickAppointment.sobreturno_tipo}
                    onChange={(event) => updateQuickAppointment({ sobreturno_tipo: event.target.value as QuickAppointmentState["sobreturno_tipo"] })}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                  >
                    <option value="Control">Control</option>
                    <option value="Urgencia">Urgencia</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Motivo</label>
                <input
                  type="text"
                  value={quickAppointment.motivo}
                  onChange={(event) => updateQuickAppointment({ motivo: event.target.value })}
                  placeholder="Ej: Control general"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Observaciones</label>
                <textarea
                  value={quickAppointment.observaciones}
                  onChange={(event) => updateQuickAppointment({ observaciones: event.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex flex-col sm:flex-row sm:items-center gap-2">
              <Link
                href={fullFormHrefForQuickAppointment(quickAppointment)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors sm:mr-auto"
              >
                Formulario completo
              </Link>
              <button
                type="button"
                onClick={() => setQuickAppointment(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveQuickAppointment}
                disabled={quickAppointment.isSaving || (quickNeedsConflictConfirmation && !quickWarningsAcknowledged)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {quickAppointment.isSaving ? "Guardando..." : quickAppointment.mode === "overbooking" ? "Guardar sobreturno" : "Guardar turno"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Impresión */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsPrintModalOpen(false)}>
          <div
            className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md overflow-hidden flex flex-col transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir Listado de Turnos
              </h3>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
              <div className="mb-5">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Fecha a imprimir
                </label>
                <input
                  type="date"
                  value={printDate}
                  onChange={(e) => setPrintDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark]"
                />
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Medico
                </label>
                <select
                  value={printMedicoId}
                  onChange={(event) => setPrintMedicoId(event.target.value)}
                  disabled={!canChooseDoctor}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:opacity-70"
                >
                  {canChooseDoctor && <option value="all">Todos los medicos</option>}
                  {medicos.map((medico) => (
                    <option key={medico.id} value={medico.id}>
                      {doctorLabel(medico)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Campos a incluir
                </label>
                <div className="grid grid-cols-2 gap-3 bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  {Object.entries({
                    hora: "Hora",
                    paciente: "Paciente",
                    dni: "DNI",
                    telefono: "Teléfono",
                    obra_social: "Obra Social",
                    tipo: "Tipo de Turno",
                    motivo: "Motivo",
                    estado: "Estado",
                    observaciones: "Observaciones"
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={printFields[key as keyof typeof printFields]}
                        onChange={(e) => setPrintFields(prev => ({...prev, [key]: e.target.checked}))}
                        className="w-4 h-4 text-blue-600 rounded border-zinc-300 dark:border-zinc-600 focus:ring-blue-500 dark:bg-zinc-900 cursor-pointer"
                        disabled={key === 'paciente'} // El paciente siempre debería estar
                      />
                      <span className={`text-sm select-none ${key === 'paciente' ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100'}`}>
                        {label} {key === 'paciente' && '(Obligatorio)'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex justify-end gap-2">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                disabled={!printDate}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Generar Impresión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Acciones de Turno */}
      {isTurnoModalOpen && selectedTurno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeTurnoModal}>
          <div
            className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-xl overflow-hidden flex flex-col transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-start ${getStateColorClass(selectedTurno.estado)} bg-opacity-20 dark:bg-opacity-10`}>
              <div>
                <h3 className="font-bold text-lg leading-tight break-words whitespace-normal pr-2">
                  {selectedTurno.expand?.paciente_id ? `${selectedTurno.expand.paciente_id.apellido}, ${selectedTurno.expand.paciente_id.nombre}` : 'Sin paciente'}
                </h3>
                {selectedTurno.expand?.paciente_id && (
                  <div className="text-sm mt-1 text-zinc-700 dark:text-zinc-300 font-medium flex flex-wrap gap-x-3 gap-y-1">
                    <span>DNI: {selectedTurno.expand.paciente_id.dni}</span>
                    {selectedTurno.expand.paciente_id.telefono && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        {selectedTurno.expand.paciente_id.telefono}
                      </span>
                    )}
                    {selectedTurno.expand.paciente_id.obra_social && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                        {selectedTurno.expand.paciente_id.obra_social}
                      </span>
                    )}
                  </div>
                )}
                {selectedTurno.expand?.paciente_id && (
                  <button
                    type="button"
                    onClick={() => openPatientQuickCard(selectedTurno.paciente_id, selectedTurno.expand?.paciente_id)}
                    className="mt-2 rounded-lg bg-white/70 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-white dark:bg-black/20 dark:text-blue-300 dark:hover:bg-black/30"
                  >
                    Ficha paciente
                  </button>
                )}
                <span className="text-xs opacity-80 mt-1.5 inline-block font-medium px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 border border-zinc-200/50 dark:border-zinc-700/50">
                  {selectedTurno.estado ? selectedTurno.estado.charAt(0).toUpperCase() + selectedTurno.estado.slice(1) : 'Sin asignar'}
                </span>
              </div>
              <button onClick={closeTurnoModal} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-300">
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>{new Date(selectedTurno.fecha_hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  {selectedTurno.tipo || 'Consulta'}
                  {selectedTurno.es_sobreturno && <span className="text-[10px] font-bold uppercase text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 px-1.5 py-0.5 rounded ml-1">Sobreturno</span>}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800/70">
                <button
                  type="button"
                  onClick={() => setAppointmentModalTab("datos")}
                  className={`rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
                    appointmentModalTab === "datos"
                      ? "bg-white text-blue-700 shadow-sm dark:bg-zinc-950 dark:text-blue-300"
                      : "text-zinc-600 hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-zinc-900/70"
                  }`}
                >
                  Datos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAppointmentModalTab("reprogramar");
                    setReschedule((prev) => ({ ...prev, isOpen: true, error: "" }));
                  }}
                  className={`rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
                    appointmentModalTab === "reprogramar"
                      ? "bg-white text-blue-700 shadow-sm dark:bg-zinc-950 dark:text-blue-300"
                      : "text-zinc-600 hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-zinc-900/70"
                  }`}
                >
                  Reprogramar
                </button>
                <button
                  type="button"
                  onClick={() => setAppointmentModalTab("cancelacion")}
                  className={`rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
                    appointmentModalTab === "cancelacion"
                      ? "bg-white text-red-700 shadow-sm dark:bg-zinc-950 dark:text-red-300"
                      : "text-zinc-600 hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-zinc-900/70"
                  }`}
                >
                  Cancelacion
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAppointmentModalTab("historial");
                    loadTurnoEventos(selectedTurno.id);
                  }}
                  className={`rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
                    appointmentModalTab === "historial"
                      ? "bg-white text-blue-700 shadow-sm dark:bg-zinc-950 dark:text-blue-300"
                      : "text-zinc-600 hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-zinc-900/70"
                  }`}
                >
                  Historial
                </button>
              </div>

              <div className={appointmentModalTab === "datos" ? "mt-1" : "hidden"}>
                <label className="font-semibold block mb-1 text-sm text-zinc-700 dark:text-zinc-200">Motivo:</label>
                <textarea
                  value={editMotivo}
                  onChange={(e) => setEditMotivo(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none resize-none text-zinc-700 dark:text-zinc-300 transition-colors"
                  rows={2}
                  placeholder="Sin motivo especificado..."
                />
              </div>

              <div className={appointmentModalTab === "datos" ? "mt-1" : "hidden"}>
                <label className="font-semibold block mb-1 text-sm text-zinc-700 dark:text-zinc-200">Observaciones:</label>
                <textarea
                  value={editObservaciones}
                  onChange={(e) => setEditObservaciones(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none resize-none text-zinc-700 dark:text-zinc-300 transition-colors"
                  rows={3}
                  placeholder="Observaciones adicionales..."
                />
              </div>

              <div className={appointmentModalTab === "datos" ? "" : "hidden"}>
                <label className="font-semibold block mb-2 text-sm text-zinc-700 dark:text-zinc-200">Estado:</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setEditEstado(""); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                      editEstado === "" || !editEstado
                        ? `${getStateColorClass("")} shadow-sm ring-2 ring-zinc-500/50 dark:ring-zinc-400/50 scale-105`
                        : 'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600'
                    }`}
                  >
                    Sin asignar
                  </button>
                  {ESTADOS.map((estado) => {
                    const isSelected = editEstado === estado;
                    const baseColorClass = getStateColorClass(estado);
                    return (
                      <button
                        key={estado}
                        type="button"
                        onClick={(e) => { e.preventDefault(); setEditEstado(estado); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                          isSelected
                            ? `${baseColorClass} shadow-sm ring-2 ring-blue-500/50 dark:ring-blue-400/50 scale-105`
                            : 'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600'
                        }`}
                      >
                        {estado}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={appointmentModalTab === "reprogramar" ? "rounded-lg border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-900/60 dark:bg-blue-950/20" : "hidden"}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm text-blue-900 dark:text-blue-100">Reprogramar turno</div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">Mover el mismo turno a un slot libre.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReschedule((prev) => ({ ...prev, isOpen: !prev.isOpen, error: "", slotIso: "" }))}
                    className="hidden"
                  >
                    {reschedule.isOpen ? "Ocultar" : "Reprogramar"}
                  </button>
                </div>

                {reschedule.isOpen && (
                  <div className="mt-3 space-y-3">
                    {reschedule.error && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                        {reschedule.error}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">Fecha</label>
                        <input
                          type="date"
                          value={reschedule.fecha}
                          onChange={(event) => setReschedule((prev) => ({ ...prev, fecha: event.target.value, disponibilidad_id: "", slotIso: "", error: "" }))}
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-blue-200 dark:border-blue-900/70 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">Medico</label>
                        <select
                          value={reschedule.medico_id}
                          onChange={(event) => setReschedule((prev) => ({ ...prev, medico_id: event.target.value, disponibilidad_id: "", slotIso: "", error: "" }))}
                          disabled={!canChooseDoctor}
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-blue-200 dark:border-blue-900/70 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:opacity-70"
                        >
                          <option value="">Seleccione medico</option>
                          {medicos.map((medico) => (
                            <option key={medico.id} value={medico.id}>{doctorLabel(medico)}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {rescheduleDisponibilidades.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-blue-200 px-3 py-3 text-sm text-blue-700 dark:border-blue-900/60 dark:text-blue-300">
                          No hay disponibilidades para ese medico y fecha.
                        </div>
                      ) : (
                        rescheduleDisponibilidades.map((disp) => {
                          const slots = availabilitySlots(disp, rescheduleDoctorTurnos, selectedTurno.id);
                          const freeSlots = slots.filter((slot) => !slot.appointment);
                          return (
                            <div key={disp.id} className="rounded-lg border border-blue-200 bg-white p-2 dark:border-blue-900/60 dark:bg-zinc-950">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                                {new Date(disp.fecha_hora_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(disp.fecha_hora_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {disp.tipo}
                              </div>
                              {freeSlots.length === 0 ? (
                                <div className="text-xs text-zinc-500 dark:text-zinc-400">Sin slots libres.</div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {freeSlots.map((slot) => {
                                    const iso = slot.start.toISOString();
                                    const selected = reschedule.slotIso === iso;
                                    const time = slot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    return (
                                      <button
                                        key={iso}
                                        type="button"
                                        aria-label={`Reprogramar a ${time}`}
                                        onClick={() => setReschedule((prev) => ({ ...prev, disponibilidad_id: disp.id, slotIso: iso, error: "" }))}
                                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                                          selected
                                            ? "border-blue-500 bg-blue-600 text-white"
                                            : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300"
                                        }`}
                                      >
                                        {time}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleRescheduleTurno}
                      disabled={reschedule.isSaving || !reschedule.slotIso}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      {reschedule.isSaving ? "Reprogramando..." : "Reprogramar turno"}
                    </button>
                  </div>
                )}
              </div>

              <div className={appointmentModalTab === "cancelacion" ? "rounded-lg border border-red-200 bg-red-50/70 p-3 dark:border-red-900/60 dark:bg-red-950/20" : "hidden"}>
                <label className="font-semibold block mb-1 text-sm text-red-800 dark:text-red-200">Motivo de cancelacion:</label>
                <textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-red-200 dark:border-red-900/70 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500/40 focus:border-red-500 outline-none resize-none text-zinc-700 dark:text-zinc-300 transition-colors"
                  rows={2}
                  placeholder="Ej: El paciente solicito cancelar..."
                />
                <button
                  type="button"
                  onClick={handleCancelTurno}
                  disabled={isSavingTurno || !cancelReason.trim() || selectedTurno.estado === "Cancelado"}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  Cancelar turno
                </button>
              </div>

              <div className={appointmentModalTab === "historial" ? "rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50" : "hidden"}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Historial operativo</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">Eventos registrados para este turno.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadTurnoEventos(selectedTurno.id)}
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Actualizar
                  </button>
                </div>

                {isLoadingAppointmentEvents ? (
                  <div className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Cargando historial...</div>
                ) : appointmentEventError ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200">
                    {appointmentEventError}
                  </div>
                ) : appointmentEvents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    Todavia no hay historial operativo para este turno.
                  </div>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {appointmentEvents.map((event) => (
                      <div key={event.id} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{event.titulo}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">{eventDateTime(event.created)}</div>
                        </div>
                        <div className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {event.actor_nombre || "Usuario no identificado"}
                        </div>
                        {event.detalle && (
                          <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{event.detalle}</div>
                        )}
                        {(event.estado_anterior || event.estado_nuevo || event.fecha_hora_anterior || event.fecha_hora_nueva) && (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            {(event.estado_anterior || event.estado_nuevo) && (
                              <span>Estado: {event.estado_anterior || "Sin estado"} {"->"} {event.estado_nuevo || "Sin estado"}</span>
                            )}
                            {(event.fecha_hora_anterior || event.fecha_hora_nueva) && (
                              <span>Horario: {eventDateLabel(event.fecha_hora_anterior)} {"->"} {eventDateLabel(event.fecha_hora_nueva)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 flex items-center gap-2">
              <button
                onClick={(e) => { e.preventDefault(); closeTurnoModal(); handleDelete(selectedTurno.id); }}
                className={appointmentModalTab === "cancelacion" ? "flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors mr-auto" : "hidden"}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Eliminar
              </button>
              <button
                onClick={closeTurnoModal}
                className="px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 dark:text-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={handleSaveTurnoChanges}
                disabled={isSavingTurno}
                className={appointmentModalTab === "datos" ? "flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm" : "hidden"}
              >
                {isSavingTurno ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {patientQuickCard.isOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closePatientQuickCard}>
          <div
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-4 dark:border-zinc-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Ficha rapida</p>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {patientQuickCard.paciente
                    ? `${patientQuickCard.paciente.apellido}, ${patientQuickCard.paciente.nombre}`
                    : "Paciente"}
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Datos administrativos y actividad reciente del paciente.
                </p>
              </div>
              <button
                type="button"
                onClick={closePatientQuickCard}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="Cerrar ficha rapida"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              {patientQuickCard.isLoading ? (
                <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">Cargando ficha rapida...</div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Datos del paciente</h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Correccion administrativa minima.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {patientQuickCard.pacienteId && (
                          <>
                            <Link
                              href={`/pacientes/${patientQuickCard.pacienteId}?mode=view`}
                              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                              Ver ficha completa
                            </Link>
                            <Link
                              href={`/consultas/nueva?paciente_id=${patientQuickCard.pacienteId}`}
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              Nueva consulta
                            </Link>
                          </>
                        )}
                      </div>
                    </div>

                    {patientQuickCard.error && (
                      <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                        {patientQuickCard.error}
                      </div>
                    )}
                    {patientQuickCard.success && (
                      <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300">
                        {patientQuickCard.success}
                      </div>
                    )}
                    {renderDuplicateCandidates(
                      patientQuickCard.duplicateCandidates,
                      patientQuickCard.isCheckingDuplicates,
                      patientQuickCard.duplicateError
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">Apellido</span>
                        <input
                          value={patientQuickCard.form.apellido}
                          onChange={(event) => updatePatientQuickCardForm({ apellido: event.target.value })}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">Nombre</span>
                        <input
                          value={patientQuickCard.form.nombre}
                          onChange={(event) => updatePatientQuickCardForm({ nombre: event.target.value })}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">Documento</span>
                        <input
                          value={patientQuickCard.form.numero_documento}
                          onChange={(event) => updatePatientQuickCardForm({ numero_documento: event.target.value })}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">Telefono</span>
                        <input
                          value={patientQuickCard.form.telefono}
                          onChange={(event) => updatePatientQuickCardForm({ telefono: event.target.value })}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">Email</span>
                        <input
                          type="email"
                          value={patientQuickCard.form.email}
                          onChange={(event) => updatePatientQuickCardForm({ email: event.target.value })}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">Obra social</span>
                        <input
                          value={patientQuickCard.form.obra_social}
                          onChange={(event) => updatePatientQuickCardForm({ obra_social: event.target.value })}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">Numero afiliado</span>
                        <input
                          value={patientQuickCard.form.numero_afiliado}
                          onChange={(event) => updatePatientQuickCardForm({ numero_afiliado: event.target.value })}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">Numero ficha</span>
                        <input
                          value={patientQuickCard.form.numero_ficha}
                          onChange={(event) => updatePatientQuickCardForm({ numero_ficha: event.target.value })}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm uppercase text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                      <label className="block text-sm sm:col-span-2">
                        <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">Domicilio</span>
                        <input
                          value={patientQuickCard.form.domicilio}
                          onChange={(event) => updatePatientQuickCardForm({ domicilio: event.target.value })}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Ultimos turnos</h4>
                      <div className="mt-3 space-y-2">
                        {patientQuickCard.turnos.length === 0 ? (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">No hay turnos registrados.</p>
                        ) : patientQuickCard.turnos.map((turno) => (
                          <div key={turno.id} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {formatDate(turno.fecha_hora)} · {shortTime(new Date(turno.fecha_hora))}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {doctorLabel(doctorFor(turno))} · {turno.estado || "Sin estado"} · {turno.motivo || "Sin motivo"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Ultimas consultas</h4>
                      <div className="mt-3 space-y-2">
                        {patientQuickCard.consultas.length === 0 ? (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">No hay consultas registradas.</p>
                        ) : patientQuickCard.consultas.map((consulta) => (
                          <Link
                            key={consulta.id}
                            href={`/consultas/${consulta.id}?mode=view`}
                            className="block rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                          >
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {consulta.fecha ? formatDate(consulta.fecha) : "Sin fecha"}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {consulta.motivo_consulta || "Sin motivo"}{consulta.diagnostico ? ` · ${consulta.diagnostico}` : ""}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/30">
              <button
                type="button"
                onClick={closePatientQuickCard}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={savePatientQuickCard}
                disabled={patientQuickCard.isLoading || patientQuickCard.isSaving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {patientQuickCard.isSaving ? "Guardando..." : "Guardar paciente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingStatusChange && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setPendingStatusChange(null)}>
          <div
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Motivo requerido</h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Indica el motivo para marcar el turno como {pendingStatusChange.nuevoEstado}.
              </p>
            </div>
            <div className="p-4">
              {pendingStatusChange.error && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                  {pendingStatusChange.error}
                </div>
              )}
              <textarea
                value={pendingStatusChange.motivo}
                onChange={(event) => setPendingStatusChange((prev) => prev ? { ...prev, motivo: event.target.value, error: "" } : prev)}
                className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                rows={3}
                placeholder={pendingStatusChange.nuevoEstado === "Ausente" ? "Ej: El paciente no asistio..." : "Ej: El paciente solicito cancelar..."}
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/30">
              <button
                type="button"
                onClick={() => setPendingStatusChange(null)}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmPendingStatusChange}
                disabled={pendingStatusChange.isSaving || !pendingStatusChange.motivo.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingStatusChange.isSaving ? "Guardando..." : "Guardar estado"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
