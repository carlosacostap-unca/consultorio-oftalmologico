"use client";

import { useState, useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { useRouter } from "next/navigation";

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono?: string;
  email?: string;
  fecha_nacimiento?: string;
  obra_social?: string;
  numero_afiliado?: string;
  domicilio?: string;
}

interface Disponibilidad {
  id: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  tipo: "Consulta" | "Estudio" | "Cirugía";
}

export default function NuevoTurnoPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [isLoadingDisponibilidades, setIsLoadingDisponibilidades] = useState(false);

  const [isFromAgenda, setIsFromAgenda] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

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
    paciente_id: "",
    fecha: "",
    disponibilidad_id: "",
    hora: "",
    duracion: "15",
    motivo: "",
    observaciones: "",
    tipo: "Consulta",
    estado: "",
    es_sobreturno: true,
    sobreturno_tipo: "",
  });

  const [prevTurno, setPrevTurno] = useState<any>(null);
  const [nextTurno, setNextTurno] = useState<any>(null);

  const TURN_STATES = ["En espera", "En consulta", "Atendido", "Ausente", "Atrasado", "Quiere adelantarlo", "No llegó"];

  const [selectedDisponibilidad, setSelectedDisponibilidad] = useState<Disponibilidad | null>(null);

  const removeAccents = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  useEffect(() => {
    const fetchTurnos = async () => {
      if (!formData.fecha || !formData.hora) return;

      try {
        const startOfDay = new Date(`${formData.fecha}T00:00:00Z`).toISOString().replace('T', ' ');
        const endOfDay = new Date(`${formData.fecha}T23:59:59Z`).toISOString().replace('T', ' ');
        
        const records = await pb.collection("turnos").getFullList({
          filter: `fecha_hora >= "${startOfDay}" && fecha_hora <= "${endOfDay}"`,
          sort: "fecha_hora",
          expand: "paciente_id"
        });

        const targetTime = new Date(`${formData.fecha}T${formData.hora}:00`);
        
        let prev = null;
        let next = null;

        for (const turno of records) {
          const tTime = new Date(turno.fecha_hora);
          if (tTime <= targetTime) {
            if (!prev || tTime > new Date(prev.fecha_hora)) {
              prev = turno;
            }
          }
          if (tTime > targetTime) {
            if (!next || tTime < new Date(next.fecha_hora)) {
              next = turno;
            }
          }
        }

        setPrevTurno(prev);
        setNextTurno(next);

      } catch (error) {
        console.error("Error al cargar turnos adyacentes:", error);
      }
    };

    fetchTurnos();
  }, [formData.fecha, formData.hora]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlFecha = params.get('fecha');
      const urlHora = params.get('hora');
      const urlFechaHora = params.get('fecha_hora');
      const urlDispId = params.get('disponibilidad_id');
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
    setUser(pb.authStore.record);

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      try {
        const pacientesRecords = await pb.collection("pacientes").getFullList<Paciente>({
          sort: "apellido,nombre",
        });
        setPacientes(pacientesRecords);
      } catch (error) {
        console.error("Error al cargar pacientes:", error);
      }
    };

    loadData();
  }, [router]);

  useEffect(() => {
    const fetchDisponibilidades = async () => {
      if (!formData.fecha) {
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
        
        const records = await pb.collection("disponibilidades").getFullList<Disponibilidad>({
          filter: `fecha_hora_inicio >= "${startOfDay}" && fecha_hora_inicio <= "${endOfDay}"`,
          sort: "fecha_hora_inicio",
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
  }, [formData.fecha]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (name === "disponibilidad_id") {
      const disp = disponibilidades.find(d => d.id === value) || null;
      setSelectedDisponibilidad(disp);
      setFormData(prev => ({
        ...prev,
        disponibilidad_id: value,
        hora: disp ? new Date(disp.fecha_hora_inicio).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit', hour12: false}) : "",
        duracion: disp?.tipo === "Consulta" ? "15" : "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.paciente_id) {
      alert("Por favor, seleccione un paciente de la lista.");
      return;
    }

    // Validar hora dentro de la disponibilidad (solo si no es sobreturno)
    if (selectedDisponibilidad && !formData.es_sobreturno) {
      const turnoDate = new Date(`${formData.fecha}T${formData.hora}:00`);
      const dispStart = new Date(selectedDisponibilidad.fecha_hora_inicio);
      const dispEnd = new Date(selectedDisponibilidad.fecha_hora_fin);
      
      if (turnoDate < dispStart || turnoDate > dispEnd) {
        const startStr = dispStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const endStr = dispEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        alert(`La hora debe estar dentro del rango de la disponibilidad (${startStr} - ${endStr}). Si es un sobreturno, marque la casilla correspondiente.`);
        return;
      }
    }
    
    setIsLoading(true);
    try {
      const fechaHoraIso = new Date(`${formData.fecha}T${formData.hora}`).toISOString();
      
      await pb.collection("turnos").create({
        paciente_id: formData.paciente_id,
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
      
      router.push("/turnos");
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

    // Validar DNI
    if (pacientes.some(p => p.dni === newPatientData.dni)) {
      setPatientError("Ya existe un paciente registrado con este DNI.");
      return;
    }

    setIsSavingPatient(true);
    try {
      const record = await pb.collection("pacientes").create<Paciente>(newPatientData);
      
      setPacientes(prev => {
        const newList = [...prev, record];
        return newList.sort((a, b) => a.apellido.localeCompare(b.apellido));
      });
      
      // Seleccionar automáticamente el nuevo paciente
      setFormData(prev => ({ ...prev, paciente_id: record.id }));
      setSearchTerm(`${record.apellido}, ${record.nombre} (DNI: ${record.dni})`);
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
      const updatedRecord = await pb.collection("pacientes").update<Paciente>(formData.paciente_id, editingPatientData);
      
      setPacientes(prev => prev.map(p => p.id === formData.paciente_id ? updatedRecord : p).sort((a, b) => a.apellido.localeCompare(b.apellido)));
      setSearchTerm(`${updatedRecord.apellido}, ${updatedRecord.nombre} (DNI: ${updatedRecord.dni})`);
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
      <div className="max-w-2xl mx-auto">
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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Agendar Nuevo Sobreturno</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Completa los datos para agendar el sobreturno</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    placeholder="Buscar por apellido, nombre o DNI..."
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                    required={!formData.paciente_id}
                  />
                  {showDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {pacientes.filter(p => 
                        removeAccents(p.nombre).toLowerCase().includes(removeAccents(searchTerm).toLowerCase()) ||
                        removeAccents(p.apellido).toLowerCase().includes(removeAccents(searchTerm).toLowerCase()) ||
                        p.dni.includes(searchTerm)
                      ).length > 0 ? (
                        pacientes.filter(p => 
                          removeAccents(p.nombre).toLowerCase().includes(removeAccents(searchTerm).toLowerCase()) ||
                          removeAccents(p.apellido).toLowerCase().includes(removeAccents(searchTerm).toLowerCase()) ||
                          p.dni.includes(searchTerm)
                        ).map(p => (
                          <div
                            key={p.id}
                            className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-sm text-zinc-700 dark:text-zinc-300"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, paciente_id: p.id }));
                              setSearchTerm(`${p.apellido}, ${p.nombre} (DNI: ${p.dni})`);
                              setEditingPatientData(p);
                              setIsEditingPatient(false);
                              setShowDropdown(false);
                            }}
                          >
                            {p.apellido}, {p.nombre} (DNI: {p.dni})
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
                  No hay pacientes registrados. Usa el botón "+ Nuevo" para agregar uno.
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
                        value={isEditingPatient ? editingPatientData.dni || "" : selectedPatient.dni}
                        onChange={(e) => setEditingPatientData(prev => ({ ...prev, dni: e.target.value }))}
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

            <div className="bg-orange-50/50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-800/30 p-4">
              <h3 className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-3">Detalles del Sobreturno</h3>
              
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-zinc-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 font-medium uppercase">Turno Anterior</div>
                    <div className="text-sm text-zinc-700 dark:text-zinc-300">
                      {prevTurno ? (
                        <>
                          <span className="font-semibold">{new Date(prevTurno.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="mx-2">-</span>
                          {prevTurno.expand?.paciente_id ? `${prevTurno.expand.paciente_id.apellido}, ${prevTurno.expand.paciente_id.nombre}` : 'Sin paciente'}
                        </>
                      ) : (
                        <span className="italic text-zinc-500">Ninguno</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 py-2 border-y border-orange-200/50 dark:border-orange-800/30">
                  <div className="text-orange-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <div>
                    <div className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase">Nuevo Sobreturno</div>
                    <div className="text-sm font-bold text-orange-700 dark:text-orange-300">
                      {formData.fecha && formData.hora ? `${new Date(formData.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${formData.hora}` : 'Horario no definido'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-zinc-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 font-medium uppercase">Turno Siguiente</div>
                    <div className="text-sm text-zinc-700 dark:text-zinc-300">
                      {nextTurno ? (
                        <>
                          <span className="font-semibold">{new Date(nextTurno.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="mx-2">-</span>
                          {nextTurno.expand?.paciente_id ? `${nextTurno.expand.paciente_id.apellido}, ${nextTurno.expand.paciente_id.nombre}` : 'Sin paciente'}
                        </>
                      ) : (
                        <span className="italic text-zinc-500">Ninguno</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
                disabled={isLoading || pacientes.length === 0}
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