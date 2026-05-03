import type { RecordModel } from "pocketbase";
import type { UserRole } from "./permissions";

export interface AppUser extends RecordModel {
  avatar?: string;
  email?: string;
  name?: string;
  role?: UserRole;
}

export interface Patient extends RecordModel {
  nombre: string;
  apellido: string;
  tipo_documento?: string;
  numero_documento?: string;
  dni?: string;
  telefono: string;
  email: string;
  fecha_nacimiento: string;
  obra_social: string;
  numero_afiliado: string;
  domicilio: string;
  numero_ficha?: string;
  mutual_id?: string;
  expand?: {
    mutual_id?: Mutual;
  };
}

export interface Mutual extends RecordModel {
  nombre: string;
  codigo: string;
  direccion: string;
  telefono: string;
}

export interface Consulta extends RecordModel {
  paciente_id: string;
  fecha?: string;
  motivo_consulta?: string;
  diagnostico?: string;
}

export interface Receta extends RecordModel {
  paciente_id: string;
  consulta_id?: string;
  fecha: string;
  medicamentos: string;
  indicaciones: string;
  expand?: {
    paciente_id?: Patient;
    consulta_id?: Consulta;
  };
}
