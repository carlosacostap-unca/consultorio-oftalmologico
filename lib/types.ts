import type { RecordModel } from "pocketbase";
import type { UserRole } from "./permissions";

export interface AppUser extends RecordModel {
  avatar?: string;
  email?: string;
  name?: string;
  role?: UserRole;
  roles?: UserRole[];
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
  estado_registro?: string;
  fusionado_en_paciente_id?: string;
  fusionado_at?: string;
  fusionado_por?: string;
  fusion_motivo?: string;
  expand?: {
    mutual_id?: Mutual;
    fusionado_en_paciente_id?: Patient;
    fusionado_por?: AppUser;
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
