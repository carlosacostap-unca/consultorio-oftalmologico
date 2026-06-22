"use client";

import { useMemo, useState, useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { useRouter } from "next/navigation";
import { resolveActiveRole } from "@/lib/active-role";
import { createTurnoEvento } from "@/lib/turno-eventos";
import type { UserRole } from "@/lib/permissions";
import { ACTIVE_PATIENT_FILTER, buildActivePatientSearchFilter } from "@/lib/patient-merge";
import { duplicatePatientDocumentMessage, findDuplicatePatientDocumentClient, normalizePatientDocumentInput } from "@/lib/patient-document-client";
import { formatDate } from "@/lib/utils";

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni?: string;
  numero_documento?: string;
  telefono?: string;
  email?: string;
  fecha_nacimiento?: string;
  obra_social?: string;
  numero_afiliado?: string;
  domicilio?: string;
  estado_registro?: string;
  fusionado_en_paciente_id?: string;
}

interface Disponibilidad {
  id: string;
  medico_id?: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  tipo: "Consulta" | "Estudio" | "Cirugía";
}

interface TurnoAgenda {
  id: string;
  medico_id?: string;
  paciente_id?: string;
  fecha_hora: string;
  duracion?: number;
  tipo?: string;
  estado?: string;
  es_sobreturno?: boolean;
  expand?: {
    paciente_id?: Paciente;
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

interface ScheduleSlot {
  time: string;
  endTime: string;
  isOccupied: boolean;
  appointment?: TurnoAgenda;
}

function formatTimeInput(date: Date) {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDisplayTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function addMinutes(date: Date, minutes: number) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() + minutes);
  return copy;
}

function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA;
}

function removeAccents(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const TERMINAL_APPOINTMENT_STATES = ["Cancelado", "Atendido", "Ausente", "completado"];

const isActiveAppointment = (turno: { estado?: string }) =>
  !turno.estado || !TERMINAL_APPOINTMENT_STATES.includes(turno.estado);

export default function NuevoTurnoPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [isLoadingDisponibilidades, setIsLoadingDisponibilidades] = useState(false);
  const [turnosDelDia, setTurnosDelDia] = useState<TurnoAgenda[]>([]);
  const [isLoadingTurnosDelDia, setIsLoadingTurnosDelDia] = useState(false);
  const [patientDayAppointments, setPatientDayAppointments] = useState<TurnoAgenda[]>([]);
  const [isLoadingPatientDayAppointments, setIsLoadingPatientDayAppointments] = useState(false);
  const [patientWarningsAcknowledged, setPatientWarningsAcknowledged] = useState(false);

  const [isFromAgenda, setIsFromAgenda] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);

  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    telefono: "",
    email: "",
    fecha_nacimiento: "",
    obra_social: "",
    numero_afiliado: "",
    domicilio: "",
  });
  const [patientError, setPatientError] = useState("");
  const [isSavingPatient, setIsSavingPatient] = useState(false);

  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [editingPatientData, setEditingPatientData] = useState<Partial<Paciente>>({});
  const [isUpdatingPatient, setIsUpdatingPatient] = useState(false);

  const [formData, setFormData] = useState({
    medico_id: "",
    paciente_id: "",
    fecha: "",
    disponibilidad_id: "",
    hora: "",
    duracion: "",
    motivo: "",
    observaciones: "",
    tipo: "Consulta",
    estado: "",
    es_sobreturno: false,
    sobreturno_tipo: "",
  });

  const [selectedDisponibilidad, setSelectedDisponibilidad] = useState<Disponibilidad | null>(null);

  const canChooseDoctor = activeRole !== "medico";
  const doctorLabel = (doctor?: Medico | null) => doctor?.name || doctor?.email || "Medico";
  const patientDocument = (patient?: Paciente | null) => patient?.dni || patient?.numero_documento || "";
  const patientMeta = (patient?: Paciente | null) => {
    if (!patient) return [];
    return [
      patientDocument(patient) ? `DNI ${patientDocument(patient)}` : "",
      patient.telefono ? `Tel ${patient.telefono}` : "",
      patient.obra_social || "",
    ].filter(Boolean);
  };
  const visiblePatients = useMemo(() => {
    const term = removeAccents(searchTerm).toLowerCase().trim();
    if (!term) return pacientes.slice(0, 20);

    return pacientes.filter((patient) =>
      removeAccents(patient.nombre || "").toLowerCase().includes(term) ||
      removeAccents(patient.apellido || "").toLowerCase().includes(term) ||
      patientDocument(patient).toLowerCase().includes(term) ||
      (patient.telefono || "").toLowerCase().includes(term)
    );
  }, [pacientes, searchTerm]);
  const selectedDoctor = medicos.find((medico) => medico.id === formData.medico_id) || null;
  const selectedDuration = Math.max(parseInt(formData.duracion || "15", 10) || 15, 1);
  const canPickSchedule = Boolean(formData.medico_id && formData.fecha);
  const activePatientAppointments = patientDayAppointments.filter(isActiveAppointment);
  const sameDoctorActiveAppointments = activePatientAppointments.filter((turno) => turno.medico_id === formData.medico_id);
  const needsPatientWarningConfirmation = activePatientAppointments.length > 0;

  const scheduleSlots = useMemo<ScheduleSlot[]>(() => {
    if (!selectedDisponibilidad || !formData.fecha) return [];

    const start = new Date(selectedDisponibilidad.fecha_hora_inicio);
    const end = new Date(selectedDisponibilidad.fecha_hora_fin);
    const slots: ScheduleSlot[] = [];

    for (let cursor = new Date(start); addMinutes(cursor, selectedDuration) <= end; cursor = addMinutes(cursor, selectedDuration)) {
      const slotEnd = addMinutes(cursor, selectedDuration);
      const appointment = turnosDelDia.find((turno) => {
        const appointmentStart = new Date(turno.fecha_hora);
        const appointmentEnd = addMinutes(appointmentStart, turno.duracion || selectedDuration);
        return rangesOverlap(cursor, slotEnd, appointmentStart, appointmentEnd);
      });

      slots.push({
        time: formatTimeInput(cursor),
        endTime: formatTimeInput(slotEnd),
        isOccupied: Boolean(appointment),
        appointment,
      });
    }

    return slots;
  }, [formData.fecha, selectedDisponibilidad, selectedDuration, turnosDelDia]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlFecha = params.get('fecha');
      const urlHora = params.get('hora');
      const urlFechaHora = params.get('fecha_hora');
      const urlDispId = params.get('disponibilidad_id');
      const urlMedicoId = params.get('medico_id');
      const urlTipo = params.get('tipo');
      const urlEsSobreturno = params.get('es_sobreturno') === 'true';

      let initialFecha = urlFecha || "";
      let initialHora = urlHora || "";

      if (urlFechaHora) {
        const [datePart, timePart] = urlFechaHora.split('T');
        initialFecha = datePart || initialFecha;
        initialHora = timePart ? timePart.slice(0, 5) : initialHora;
      }

      if (urlDispId) {
        setIsFromAgenda(true);
      }

      if (initialFecha || initialHora || urlDispId || urlEsSobreturno) {
        setFormData(prev => ({
          ...prev,
          medico_id: urlMedicoId || prev.medico_id,
          fecha: initialFecha || prev.fecha,
          hora: initialHora || prev.hora,
          disponibilidad_id: urlDispId || prev.disponibilidad_id,
          duracion: urlTipo === "Consulta" ? "15" : prev.duracion,
          tipo: urlTipo || prev.tipo,
          es_sobreturno: urlEsSobreturno || prev.es_sobreturno,
        }));
      }
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    const authUser = pb.authStore.record as AppUser | null;
    const resolvedRole = resolveActiveRole(authUser, ["secretaria"]);
    setUser(authUser);
    setActiveRole(resolvedRole);

    if (resolvedRole === "medico" && authUser?.id) {
      setFormData((prev) => ({ ...prev, medico_id: authUser.id || prev.medico_id }));
    }

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      try {
        const [pacientesResult, medicosResponse] = await Promise.all([
          pb.collection("pacientes").getList<Paciente>(1, 200, {
            sort: "apellido,nombre",
            filter: ACTIVE_PATIENT_FILTER,
          }),
          fetch("/api/medicos", {
            headers: { Authorization: `Bearer ${pb.authStore.token}` },
          }),
        ]);

        if (!medicosResponse.ok) {
          throw new Error("No se pudieron cargar los medicos.");
        }

        const medicosData = await medicosResponse.json();
        setPacientes(pacientesResult.items);
        setMedicos(Array.isArray(medicosData.medicos) ? medicosData.medicos : []);
      } catch (error) {
        console.error("Error al cargar pacientes:", error);
      }
    };

    loadData();
  }, [router]);

  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length < 2 || formData.paciente_id) return;

    const timeout = window.setTimeout(async () => {
      setIsSearchingPatients(true);
      try {
        const result = await pb.collection("pacientes").getList<Paciente>(1, 20, {
          filter: buildActivePatientSearchFilter(term, ["nombre", "apellido", "numero_documento", "telefono"]),
          sort: "apellido,nombre",
          requestKey: null,
        });

        setPacientes((prev) => {
          const byId = new Map(prev.map((patient) => [patient.id, patient]));
          for (const patient of result.items) {
            byId.set(patient.id, patient);
          }
          return Array.from(byId.values()).sort((a, b) =>
            `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)
          );
        });
      } catch (error) {
        console.error("Error al buscar pacientes:", error);
      } finally {
        setIsSearchingPatients(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [formData.paciente_id, searchTerm]);

  useEffect(() => {
    const fetchDisponibilidades = async () => {
      if (!formData.fecha || (!formData.medico_id && !formData.es_sobreturno)) {
        setDisponibilidades([]);
        return;
      }

      setIsLoadingDisponibilidades(true);
      try {
        // Query disponibilidades for this date
        // Note: We need to match the date. Depending on how PB stores it (UTC),
        // we might need to search >= start of day and <= end of day.
        const startOfDay = new Date(`${formData.fecha}T00:00:00Z`).toISOString().replace('T', ' ');
        const endOfDay = new Date(`${formData.fecha}T23:59:59Z`).toISOString().replace('T', ' ');

        const filters = [
          `fecha_hora_inicio >= "${startOfDay}"`,
          `fecha_hora_inicio <= "${endOfDay}"`,
        ];

        if (formData.medico_id) {
          filters.push(`medico_id = "${formData.medico_id}"`);
        }

        const records = await pb.collection("disponibilidades").getFullList<Disponibilidad>({
          filter: filters.join(" && "),
          sort: "fecha_hora_inicio",
          expand: "medico_id",
        });
        setDisponibilidades(records);

        // Reset selected if not in new list
        if (formData.disponibilidad_id) {
          const found = records.find(r => r.id === formData.disponibilidad_id);
          if (!found) {
            setFormData(prev => ({ ...prev, disponibilidad_id: "", hora: "", duracion: "" }));
            setSelectedDisponibilidad(null);
          } else {
            setSelectedDisponibilidad(found);
          }
        }
      } catch (error) {
        console.error("Error al cargar disponibilidades:", error);
        // Maybe the collection doesn't exist yet
        setDisponibilidades([]);
      } finally {
        setIsLoadingDisponibilidades(false);
      }
    };

    fetchDisponibilidades();
  }, [formData.fecha, formData.medico_id, formData.disponibilidad_id, formData.es_sobreturno]);

  useEffect(() => {
    const fetchTurnosDelDia = async () => {
      if (!formData.fecha || !formData.medico_id) {
        setTurnosDelDia([]);
        return;
      }

      setIsLoadingTurnosDelDia(true);
      try {
        const startOfDay = new Date(`${formData.fecha}T00:00:00Z`).toISOString().replace("T", " ");
        const endOfDay = new Date(`${formData.fecha}T23:59:59Z`).toISOString().replace("T", " ");
        const records = await pb.collection("turnos").getFullList<TurnoAgenda>({
          filter: `fecha_hora >= "${startOfDay}" && fecha_hora <= "${endOfDay}" && medico_id = "${formData.medico_id}"`,
          sort: "fecha_hora",
          expand: "paciente_id",
        });

        setTurnosDelDia(records);
      } catch (error) {
        console.error("Error al cargar turnos del dia:", error);
        setTurnosDelDia([]);
      } finally {
        setIsLoadingTurnosDelDia(false);
      }
    };

    fetchTurnosDelDia();
  }, [formData.fecha, formData.medico_id]);

  useEffect(() => {
    const fetchPatientDayAppointments = async () => {
      if (!formData.fecha || !formData.paciente_id) {
        setPatientDayAppointments([]);
        setPatientWarningsAcknowledged(false);
        return;
      }

      setIsLoadingPatientDayAppointments(true);
      setPatientWarningsAcknowledged(false);
      try {
        const startOfDay = new Date(`${formData.fecha}T00:00:00`).toISOString().replace("T", " ");
        const endWindow = new Date(`${formData.fecha}T00:00:00`);
        endWindow.setDate(endWindow.getDate() + 90);
        const endOfWindow = endWindow.toISOString().replace("T", " ");
        const records = await pb.collection("turnos").getFullList<TurnoAgenda>({
          filter: `paciente_id = "${formData.paciente_id}" && fecha_hora >= "${startOfDay}" && fecha_hora <= "${endOfWindow}"`,
          sort: "fecha_hora",
          expand: "paciente_id,medico_id",
          requestKey: null,
        });

        setPatientDayAppointments(records);
      } catch (error) {
        console.error("Error al consultar turnos del paciente en el dia:", error);
        setPatientDayAppointments([]);
      } finally {
        setIsLoadingPatientDayAppointments(false);
      }
    };

    fetchPatientDayAppointments();
  }, [formData.fecha, formData.paciente_id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === "disponibilidad_id") {
      const disp = disponibilidades.find(d => d.id === value) || null;
      setSelectedDisponibilidad(disp);
      setFormData(prev => ({
        ...prev,
        disponibilidad_id: value,
        medico_id: disp?.medico_id || prev.medico_id,
        hora: disp ? new Date(disp.fecha_hora_inicio).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit', hour12: false}) : "",
        duracion: disp?.tipo === "Consulta" ? "15" : "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const selectDisponibilidad = (disp: Disponibilidad) => {
    setSelectedDisponibilidad(disp);
    setFormData((prev) => ({
      ...prev,
      disponibilidad_id: disp.id,
      medico_id: disp.medico_id || prev.medico_id,
      duracion: disp.tipo === "Consulta" ? "15" : prev.duracion || "60",
      tipo: disp.tipo || "Consulta",
      hora: "",
      es_sobreturno: false,
      sobreturno_tipo: "",
    }));
  };

  const selectScheduleSlot = (slot: ScheduleSlot, asSobreturno = false) => {
    setFormData((prev) => ({
      ...prev,
      hora: slot.time,
      duracion: String(selectedDuration),
      tipo: selectedDisponibilidad?.tipo || prev.tipo || "Consulta",
      es_sobreturno: asSobreturno,
      sobreturno_tipo: asSobreturno ? prev.sobreturno_tipo || "consulta" : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.paciente_id) {
      alert("Por favor, seleccione un paciente de la lista.");
      return;
    }

    if (!formData.medico_id) {
      alert("Por favor, seleccione un medico.");
      return;
    }

    if (!formData.fecha || !formData.hora) {
      alert("Por favor, seleccione fecha y horario.");
      return;
    }

    if (needsPatientWarningConfirmation && !patientWarningsAcknowledged) {
      alert("Revise y confirme las advertencias del paciente antes de guardar.");
      return;
    }

    // Validar hora dentro de la disponibilidad (solo si no es sobreturno)
    if (selectedDisponibilidad && !formData.es_sobreturno) {
      const turnoDate = new Date(`${formData.fecha}T${formData.hora}:00`);
      const dispStart = new Date(selectedDisponibilidad.fecha_hora_inicio);
      const dispEnd = new Date(selectedDisponibilidad.fecha_hora_fin);
      const turnoEnd = addMinutes(turnoDate, parseInt(formData.duracion || "15", 10) || 15);

      if (turnoDate < dispStart || turnoEnd > dispEnd) {
        const startStr = dispStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const endStr = dispEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        alert(`La hora debe estar dentro del rango de la disponibilidad (${startStr} - ${endStr}). Si es un sobreturno, marque la casilla correspondiente.`);
        return;
      }

      const overlapsExisting = turnosDelDia.some((turno) => {
        const existingStart = new Date(turno.fecha_hora);
        const existingEnd = addMinutes(existingStart, turno.duracion || 15);
        return rangesOverlap(turnoDate, turnoEnd, existingStart, existingEnd);
      });

      if (overlapsExisting) {
        alert("Ese horario ya esta ocupado para este medico. Elegi otro horario o cargalo como sobreturno.");
        return;
      }
    }

    setIsLoading(true);
    try {
      const fechaHoraIso = new Date(`${formData.fecha}T${formData.hora}`).toISOString();
      const selectedPatient = pacientes.find((patient) => patient.id === formData.paciente_id) || null;

      const record = await pb.collection("turnos").create({
        paciente_id: formData.paciente_id,
        medico_id: selectedDisponibilidad?.medico_id || formData.medico_id,
        fecha_hora: fechaHoraIso,
        motivo: formData.motivo,
        observaciones: formData.observaciones,
        estado: formData.estado,
        tipo: selectedDisponibilidad?.tipo || formData.tipo || "Consulta",
        duracion: parseInt(formData.duracion) || 15,
        disponibilidad_id: formData.disponibilidad_id || null,
        es_sobreturno: formData.es_sobreturno,
        sobreturno_tipo: formData.es_sobreturno ? formData.sobreturno_tipo : "",
      });

      await createTurnoEvento({
        turno_id: record.id,
        actor: user,
        tipo: "created",
        titulo: formData.es_sobreturno ? "Sobreturno creado" : "Turno creado",
        detalle: `${selectedPatient ? `${selectedPatient.apellido}, ${selectedPatient.nombre}` : "Paciente"} · ${doctorLabel(selectedDoctor)} · ${formData.fecha} ${formData.hora}`,
        estado_nuevo: formData.estado,
        fecha_hora_nueva: fechaHoraIso,
        metadata: {
          paciente_id: formData.paciente_id,
          medico_id: selectedDisponibilidad?.medico_id || formData.medico_id,
          disponibilidad_id: formData.disponibilidad_id || "",
          motivo: formData.motivo,
        },
      });

      const returnParams = new URLSearchParams();
      if (formData.medico_id) returnParams.set("medico_id", formData.medico_id);
      const returnQuery = returnParams.toString();
      router.push(returnQuery ? `/turnos?${returnQuery}` : "/turnos");
    } catch (error) {
      console.error("Error al guardar turno:", error);
      alert("Error al guardar el turno. Verifica que la colección 'turnos' exista en PocketBase.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPatientError("");

    const normalizedDni = normalizePatientDocumentInput(newPatientData.dni);
    const duplicate = await findDuplicatePatientDocumentClient(normalizedDni);
    if (duplicate) {
      setPatientError(duplicatePatientDocumentMessage(normalizedDni, duplicate));
      return;
    }

    setIsSavingPatient(true);
    try {
      const { dni, ...patientData } = newPatientData;
      const record = await pb.collection("pacientes").create<Paciente>({
        ...patientData,
        numero_documento: normalizedDni,
        dni: normalizedDni,
      });

      setPacientes(prev => {
        const newList = [...prev, record];
        return newList.sort((a, b) => a.apellido.localeCompare(b.apellido));
      });

      // Seleccionar automáticamente el nuevo paciente
      setFormData(prev => ({ ...prev, paciente_id: record.id }));
      setSearchTerm(`${record.apellido}, ${record.nombre} (DNI: ${patientDocument(record)})`);
      setShowNewPatientModal(false);
      setNewPatientData({
        nombre: "",
        apellido: "",
        dni: "",
        telefono: "",
        email: "",
        fecha_nacimiento: "",
        obra_social: "",
        numero_afiliado: "",
        domicilio: "",
      });
    } catch (error) {
      console.error("Error al crear paciente:", error);
      setPatientError("Error al guardar el paciente. Intente nuevamente.");
    } finally {
      setIsSavingPatient(false);
    }
  };

  const handleUpdatePatient = async () => {
    if (!formData.paciente_id || !editingPatientData) return;

    setIsUpdatingPatient(true);
    try {
      const normalizedDni = normalizePatientDocumentInput(editingPatientData.dni || editingPatientData.numero_documento || "");
      if (normalizedDni) {
        const duplicate = await findDuplicatePatientDocumentClient(normalizedDni, formData.paciente_id);
        if (duplicate) {
          alert(duplicatePatientDocumentMessage(normalizedDni, duplicate));
          return;
        }
      }

      const updatedRecord = await pb.collection("pacientes").update<Paciente>(formData.paciente_id, {
        ...editingPatientData,
        dni: normalizedDni,
        numero_documento: normalizedDni,
      });

      setPacientes(prev => prev.map(p => p.id === formData.paciente_id ? updatedRecord : p).sort((a, b) => a.apellido.localeCompare(b.apellido)));
      setSearchTerm(`${updatedRecord.apellido}, ${updatedRecord.nombre} (DNI: ${patientDocument(updatedRecord)})`);
      setIsEditingPatient(false);
    } catch (error) {
      console.error("Error al actualizar paciente:", error);
      alert("Hubo un error al actualizar los datos del paciente.");
    } finally {
      setIsUpdatingPatient(false);
    }
  };

  if (!isMounted) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Agendar Nuevo Turno</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Completa los datos para agendar el turno</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Agenda</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Primero elegi medico, fecha, bloque y horario.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Medico *</label>
                  <select
                    required
                    name="medico_id"
                    value={formData.medico_id}
                    onChange={(event) => {
                      setSelectedDisponibilidad(null);
                      setFormData((prev) => ({
                        ...prev,
                        medico_id: event.target.value,
                        disponibilidad_id: "",
                        hora: "",
                        duracion: "",
                      }));
                    }}
                    disabled={!canChooseDoctor || isFromAgenda}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:opacity-70"
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
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha *</label>
                  <input
                    required
                    type="date"
                    name="fecha"
                    value={formData.fecha}
                    onChange={(event) => {
                      setSelectedDisponibilidad(null);
                      setFormData((prev) => ({
                        ...prev,
                        fecha: event.target.value,
                        disponibilidad_id: "",
                        hora: "",
                        duracion: "",
                      }));
                    }}
                    disabled={isFromAgenda}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark] disabled:opacity-70"
                  />
                </div>
              </div>

              {selectedDoctor && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
                  Agenda de {doctorLabel(selectedDoctor)}
                </div>
              )}
            </section>

            <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Disponibilidad y horario</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {canPickSchedule ? "Selecciona un bloque y despues un horario libre." : "Selecciona medico y fecha para ver bloques disponibles."}
                  </p>
                </div>
                {(isLoadingDisponibilidades || isLoadingTurnosDelDia) && (
                  <span className="text-xs text-blue-500">Cargando...</span>
                )}
              </div>

              {isFromAgenda && selectedDisponibilidad ? (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
                  Bloque preseleccionado: {formatDisplayTime(selectedDisponibilidad.fecha_hora_inicio)} - {formatDisplayTime(selectedDisponibilidad.fecha_hora_fin)} ({selectedDisponibilidad.tipo})
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {!canPickSchedule ? (
                    <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      Todavia faltan medico y fecha.
                    </div>
                  ) : disponibilidades.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      No hay disponibilidades para este medico en la fecha seleccionada.
                    </div>
                  ) : (
                    disponibilidades.map((disp) => (
                      <button
                        key={disp.id}
                        type="button"
                        onClick={() => selectDisponibilidad(disp)}
                        className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                          formData.disponibilidad_id === disp.id
                            ? "border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-100"
                            : "border-zinc-200 bg-zinc-50 hover:border-blue-300 hover:bg-blue-50/60 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-blue-700 dark:hover:bg-blue-900/10"
                        }`}
                      >
                        <div className="font-medium text-sm">
                          {formatDisplayTime(disp.fecha_hora_inicio)} - {formatDisplayTime(disp.fecha_hora_fin)}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{disp.tipo}</div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {selectedDisponibilidad && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr]">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Duracion</label>
                      <input
                        required
                        type="number"
                        name="duracion"
                        min="1"
                        value={formData.duracion || String(selectedDuration)}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Horario seleccionado</label>
                      <input
                        required
                        type="time"
                        name="hora"
                        value={formData.hora}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {scheduleSlots.map((slot) => {
                      const patient = slot.appointment?.expand?.paciente_id;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => selectScheduleSlot(slot, slot.isOccupied)}
                          className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                            formData.hora === slot.time
                              ? "border-blue-500 bg-blue-600 text-white"
                              : slot.isOccupied
                                ? "border-orange-300 bg-orange-50 text-orange-900 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-100"
                                : "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100"
                          }`}
                        >
                          <div className="font-semibold">{slot.time}</div>
                          <div className="text-xs opacity-80">
                            {slot.isOccupied
                              ? `Ocupado${patient ? ` · ${patient.apellido}` : ""}`
                              : "Libre"}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {formData.es_sobreturno && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900/40 dark:bg-orange-900/20">
                      <label className="block text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">Tipo de sobreturno</label>
                      <select
                        name="sobreturno_tipo"
                        value={formData.sobreturno_tipo}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-orange-200 dark:border-orange-900/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-zinc-200"
                      >
                        <option value="">Seleccione tipo</option>
                        <option value="consulta">Consulta</option>
                        <option value="estudio">Estudio</option>
                        <option value="cirugia">Cirugia</option>
                      </select>
                      <p className="mt-1 text-xs text-orange-700 dark:text-orange-300">
                        Este turno se guardara como sobreturno.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            <div className="relative">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Paciente *</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value.toUpperCase());
                      setShowDropdown(true);
                      if (formData.paciente_id) {
                        setFormData(prev => ({ ...prev, paciente_id: "" }));
                        setIsEditingPatient(false);
                        setPatientWarningsAcknowledged(false);
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    placeholder="Buscar por apellido, nombre, DNI o telefono..."
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                    required={!formData.paciente_id}
                  />
                  {showDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {isSearchingPatients ? (
                        <div className="px-4 py-2 text-sm text-zinc-500">Buscando pacientes...</div>
                      ) : visiblePatients.length > 0 ? (
                        visiblePatients.map(p => (
                          <div
                            key={p.id}
                            className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-sm text-zinc-700 dark:text-zinc-300"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, paciente_id: p.id }));
                              setSearchTerm(`${p.apellido}, ${p.nombre} (DNI: ${patientDocument(p)})`);
                              setEditingPatientData(p);
                              setIsEditingPatient(false);
                              setShowDropdown(false);
                              setPatientWarningsAcknowledged(false);
                            }}
                          >
                            <div className="font-medium">{p.apellido}, {p.nombre}</div>
                            <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                              {patientMeta(p).join(" · ") || "Sin datos adicionales"}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-zinc-500">No se encontraron pacientes</div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(true)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center whitespace-nowrap text-sm font-medium"
                >
                  + Nuevo
                </button>
              </div>
              {pacientes.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  No hay pacientes registrados. Usa el botón &quot;+ Nuevo&quot; para agregar uno.
                </p>
              )}
            </div>

            {formData.paciente_id && (() => {
              const selectedPatient = pacientes.find(p => p.id === formData.paciente_id);
              if (!selectedPatient) return null;

              return (
                <div className="bg-zinc-50/50 dark:bg-zinc-800/20 rounded-xl border border-zinc-200 dark:border-zinc-700/50 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                      <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      Datos del Paciente
                    </h3>
                    {!isEditingPatient ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPatientData(selectedPatient);
                          setIsEditingPatient(true);
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        Actualizar datos
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPatient(false);
                            setEditingPatientData(selectedPatient);
                          }}
                          className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium px-2 py-1"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleUpdatePatient}
                          disabled={isUpdatingPatient}
                          className="text-xs text-white bg-blue-600 hover:bg-blue-700 font-medium flex items-center gap-1 px-3 py-1 rounded shadow-sm disabled:opacity-50"
                        >
                          {isUpdatingPatient ? "Guardando..." : "Guardar cambios"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Nombre</label>
                      <input
                        type="text"
                        value={isEditingPatient ? editingPatientData.nombre || "" : selectedPatient.nombre}
                        onChange={(e) => setEditingPatientData(prev => ({ ...prev, nombre: e.target.value }))}
                        disabled={!isEditingPatient}
                        className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md disabled:bg-zinc-100 disabled:text-zinc-500 dark:disabled:bg-zinc-800/50 dark:disabled:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Apellido</label>
                      <input
                        type="text"
                        value={isEditingPatient ? editingPatientData.apellido || "" : selectedPatient.apellido}
                        onChange={(e) => setEditingPatientData(prev => ({ ...prev, apellido: e.target.value }))}
                        disabled={!isEditingPatient}
                        className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md disabled:bg-zinc-100 disabled:text-zinc-500 dark:disabled:bg-zinc-800/50 dark:disabled:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">DNI</label>
                      <input
                        type="text"
                        value={isEditingPatient ? editingPatientData.dni || editingPatientData.numero_documento || "" : patientDocument(selectedPatient)}
                        onChange={(e) => setEditingPatientData(prev => ({ ...prev, dni: e.target.value, numero_documento: e.target.value }))}
                        disabled={!isEditingPatient}
                        className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md disabled:bg-zinc-100 disabled:text-zinc-500 dark:disabled:bg-zinc-800/50 dark:disabled:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Teléfono</label>
                      <input
                        type="text"
                        value={isEditingPatient ? editingPatientData.telefono || "" : selectedPatient.telefono || "-"}
                        onChange={(e) => setEditingPatientData(prev => ({ ...prev, telefono: e.target.value }))}
                        disabled={!isEditingPatient}
                        className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md disabled:bg-zinc-100 disabled:text-zinc-500 dark:disabled:bg-zinc-800/50 dark:disabled:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder={isEditingPatient ? "Sin teléfono" : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Email</label>
                      <input
                        type="email"
                        value={isEditingPatient ? editingPatientData.email || "" : selectedPatient.email || "-"}
                        onChange={(e) => setEditingPatientData(prev => ({ ...prev, email: e.target.value }))}
                        disabled={!isEditingPatient}
                        className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md disabled:bg-zinc-100 disabled:text-zinc-500 dark:disabled:bg-zinc-800/50 dark:disabled:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder={isEditingPatient ? "Sin email" : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Obra Social</label>
                      <input
                        type="text"
                        value={isEditingPatient ? editingPatientData.obra_social || "" : selectedPatient.obra_social || "-"}
                        onChange={(e) => setEditingPatientData(prev => ({ ...prev, obra_social: e.target.value }))}
                        disabled={!isEditingPatient}
                        className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md disabled:bg-zinc-100 disabled:text-zinc-500 dark:disabled:bg-zinc-800/50 dark:disabled:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder={isEditingPatient ? "Sin obra social" : ""}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Nº Afiliado</label>
                      <input
                        type="text"
                        value={isEditingPatient ? editingPatientData.numero_afiliado || "" : selectedPatient.numero_afiliado || "-"}
                        onChange={(e) => setEditingPatientData(prev => ({ ...prev, numero_afiliado: e.target.value }))}
                        disabled={!isEditingPatient}
                        className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md disabled:bg-zinc-100 disabled:text-zinc-500 dark:disabled:bg-zinc-800/50 dark:disabled:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder={isEditingPatient ? "Sin número" : ""}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Domicilio</label>
                      <input
                        type="text"
                        value={isEditingPatient ? editingPatientData.domicilio || "" : selectedPatient.domicilio || "-"}
                        onChange={(e) => setEditingPatientData(prev => ({ ...prev, domicilio: e.target.value }))}
                        disabled={!isEditingPatient}
                        className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md disabled:bg-zinc-100 disabled:text-zinc-500 dark:disabled:bg-zinc-800/50 dark:disabled:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder={isEditingPatient ? "Sin domicilio" : ""}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {isLoadingPatientDayAppointments && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
                Consultando turnos existentes del paciente...
              </div>
            )}

            {activePatientAppointments.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200">
                <div className="font-semibold">Este paciente tiene proximos turnos activos.</div>
                {sameDoctorActiveAppointments.length > 0 && (
                  <div className="mt-2 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                    Hay un turno activo con este mismo medico.
                  </div>
                )}
                <div className="mt-2 space-y-1 text-xs">
                  {activePatientAppointments.slice(0, 5).map((turno) => (
                    <div key={turno.id}>
                      {formatDisplayTime(turno.fecha_hora)} · {turno.tipo || "Turno"} · {turno.expand?.medico_id ? doctorLabel(turno.expand.medico_id) : "Medico"}
                    </div>
                  ))}
                </div>
                <label className="mt-3 flex items-start gap-2 text-xs font-medium text-amber-900 dark:text-amber-100">
                  <input
                    type="checkbox"
                    checked={patientWarningsAcknowledged}
                    onChange={(event) => setPatientWarningsAcknowledged(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-amber-300 text-blue-600 focus:ring-blue-500"
                  />
                  Revise las advertencias y quiero guardar el turno igual.
                </label>
              </div>
            )}

            {false && (isFromAgenda ? (
              <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30 p-4">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-3">Horario Seleccionado</h3>
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center text-zinc-700 dark:text-zinc-300">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium capitalize">
                      {formData.fecha ? formatDate(new Date(formData.fecha + 'T12:00:00')) : ''}
                    </span>
                  </div>
                  <div className="hidden sm:block text-zinc-300 dark:text-zinc-700">|</div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">
                      {formData.hora} - {
                        (() => {
                          if (!formData.fecha || !formData.hora) return "";
                          const start = new Date(`${formData.fecha}T${formData.hora}:00`);
                          start.setMinutes(start.getMinutes() + parseInt(formData.duracion || "15"));
                          return start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        })()
                      }
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="hidden grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha *</label>
                  <input
                    required
                    type="date"
                    name="fecha"
                    value={formData.fecha}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Disponibilidad *
                    {isLoadingDisponibilidades && <span className="ml-2 text-xs text-blue-500">Cargando...</span>}
                  </label>
                  <select
                    required={!formData.es_sobreturno}
                    name="disponibilidad_id"
                    value={formData.disponibilidad_id}
                    onChange={handleInputChange}
                    disabled={!formData.fecha || !formData.medico_id || isLoadingDisponibilidades}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:opacity-50"
                  >
                    <option value="">
                      {!formData.medico_id ? "Seleccione un medico primero" :
                       !formData.fecha ? "Seleccione una fecha primero" :
                       disponibilidades.length === 0 ? "No hay disponibilidades para esta fecha" :
                       "Seleccione un bloque horario"}
                    </option>
                    {disponibilidades.map(d => {
                      const startStr = new Date(d.fecha_hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                      const endStr = new Date(d.fecha_hora_fin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                      return (
                        <option key={d.id} value={d.id}>
                          {startStr} - {endStr} ({d.tipo})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            ))}

            {false && (!isFromAgenda && selectedDisponibilidad || formData.es_sobreturno) && (() => {
              const currentDisponibilidad = selectedDisponibilidad as Disponibilidad | undefined;
              const minTime = currentDisponibilidad ? new Date(currentDisponibilidad!.fecha_hora_inicio).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit', hour12: false}) : undefined;
              const maxTime = currentDisponibilidad ? new Date(currentDisponibilidad!.fecha_hora_fin).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit', hour12: false}) : undefined;

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Hora de inicio *</label>
                    <input
                      required
                      type="time"
                      name="hora"
                      value={formData.hora}
                      min={minTime}
                      max={maxTime}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark]"
                    />
                    {minTime && maxTime && (
                      <p className="text-xs text-zinc-500 mt-1">
                        Debe estar entre {minTime} y {maxTime}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Duración (minutos) *</label>
                    <input
                      required
                      type="number"
                      name="duracion"
                      min="1"
                      value={formData.duracion}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                      placeholder={selectedDisponibilidad?.tipo === "Consulta" ? "15" : "Ej: 60"}
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      {selectedDisponibilidad?.tipo === "Consulta" ? "Por defecto 15 minutos para consultas" : "Debe especificar la duración"}
                    </p>
                  </div>
                </div>
              );
            })()}

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Motivo</label>
              <textarea
                name="motivo"
                value={formData.motivo}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 resize-none"
                placeholder="Ej: Control general, receta lentes..."
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Observaciones</label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 resize-none"
                placeholder="Agregar observaciones..."
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || pacientes.length === 0 || (needsPatientWarningConfirmation && !patientWarningsAcknowledged)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? "Guardando..." : "Agendar Turno"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showNewPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Nuevo Paciente</h2>
              <button
                onClick={() => {
                  setShowNewPatientModal(false);
                  setNewPatientData({
                    nombre: "",
                    apellido: "",
                    dni: "",
                    telefono: "",
                    email: "",
                    fecha_nacimiento: "",
                    obra_social: "",
                    numero_afiliado: "",
                    domicilio: "",
                  });
                  setPatientError("");
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <form id="new-patient-form" onSubmit={handleNewPatientSubmit} className="space-y-4">
                {patientError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-100 dark:border-red-900/30">
                    {patientError}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nombre *</label>
                    <input
                      required
                      type="text"
                      value={newPatientData.nombre}
                      onChange={e => setNewPatientData(prev => ({...prev, nombre: e.target.value}))}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Apellido *</label>
                    <input
                      required
                      type="text"
                      value={newPatientData.apellido}
                      onChange={e => setNewPatientData(prev => ({...prev, apellido: e.target.value}))}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">DNI *</label>
                    <input
                      required
                      type="text"
                      value={newPatientData.dni}
                      onChange={e => setNewPatientData(prev => ({...prev, dni: e.target.value}))}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha de Nacimiento</label>
                    <input
                      type="date"
                      value={newPatientData.fecha_nacimiento}
                      onChange={e => setNewPatientData(prev => ({...prev, fecha_nacimiento: e.target.value}))}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Teléfono</label>
                    <input
                      type="tel"
                      value={newPatientData.telefono}
                      onChange={e => setNewPatientData(prev => ({...prev, telefono: e.target.value}))}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={newPatientData.email}
                      onChange={e => setNewPatientData(prev => ({...prev, email: e.target.value}))}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Obra Social</label>
                    <input
                      type="text"
                      value={newPatientData.obra_social}
                      onChange={e => setNewPatientData(prev => ({...prev, obra_social: e.target.value}))}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nº Afiliado</label>
                    <input
                      type="text"
                      value={newPatientData.numero_afiliado}
                      onChange={e => setNewPatientData(prev => ({...prev, numero_afiliado: e.target.value}))}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Domicilio</label>
                    <input
                      type="text"
                      value={newPatientData.domicilio}
                      onChange={e => setNewPatientData(prev => ({...prev, domicilio: e.target.value}))}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 shrink-0 bg-white dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => {
                  setShowNewPatientModal(false);
                  setNewPatientData({
                    nombre: "",
                    apellido: "",
                    dni: "",
                    telefono: "",
                    email: "",
                    fecha_nacimiento: "",
                    obra_social: "",
                    numero_afiliado: "",
                    domicilio: "",
                  });
                  setPatientError("");
                }}
                className="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="new-patient-form"
                disabled={isSavingPatient}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {isSavingPatient ? "Guardando..." : "Guardar Paciente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
