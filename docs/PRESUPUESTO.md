# Presupuesto de Desarrollo de Software
**Proyecto:** Sistema de Gestión para Consultorio Oftalmológico
**Fecha:** 23 de Marzo de 2026
**Cliente:** Dr Gonzalo F. Caldelari

---

## 1. Descripción del Proyecto

Desarrollo de una aplicación web moderna, rápida y segura para la gestión integral de un consultorio oftalmológico. El sistema está diseñado para optimizar el flujo de trabajo diario de los profesionales de la salud, permitiendo un manejo centralizado de pacientes, turnos, historias clínicas (consultas) y emisión de recetas.

## 2. Módulos y Funcionalidades Incluidas

El sistema se compone de los siguientes módulos principales:

### A. Autenticación, Seguridad y Roles
- Sistema de inicio de sesión seguro.
- Integración de Single Sign-On (SSO) con Google (OAuth2).
- Protección de rutas y privacidad de los datos médicos.
- **Perfiles de Usuario:** El sistema soportará múltiples usuarios asignados a 3 roles principales:
  - **Profesional:** Acceso integral a historias clínicas, consultas y recetas.
  - **Secretaría:** Asistencia y gestión enfocada en la agenda de turnos y listado de pacientes.
  - **Administrador:** Parametrización y configuración general de toda la aplicación.

### B. Gestión de Pacientes
- Alta, baja y modificación (ABM) de perfiles de pacientes.
- Registro de datos personales, de contacto y antecedentes médicos.
- Buscador integrado y listado completo.

### C. Gestión de Turnos (Agenda)
- Sistema de agendamiento de citas médicas.
- Visualización de turnos por estado, fecha y paciente.
- Prevención de solapamiento de horarios.

### D. Gestión de Consultas (Historia Clínica)
- Registro detallado de cada atención médica (motivo de consulta, diagnóstico, observaciones).
- Asociación de cada consulta al historial unificado del paciente.
- Trazabilidad cronológica de la evolución oftalmológica del paciente.

### E. Gestión de Recetas
- Generación de recetas médicas vinculadas a las consultas.
- Almacenamiento del historial de recetas emitidas por paciente.
- Formato optimizado para visualización clara de las prescripciones ópticas y/o farmacológicas.
- *(Aclaración: No se incluye integración con la aplicación externa rcta.me).*

### F. Migración de Datos
- Se incluye la migración completa de datos históricos (pacientes y consultas) desde el sistema de gestión anterior hacia la nueva plataforma.

---

## 3. Arquitectura y Tecnologías Propuestas

El proyecto se construirá utilizando un stack tecnológico de última generación para garantizar rendimiento, escalabilidad y un excelente diseño de interfaz:

- **Frontend:** Next.js (React), ofreciendo cargas ultrarrápidas y una navegación fluida.
- **Diseño UI/UX:** Tailwind CSS, con soporte nativo para **Modo Claro / Modo Oscuro**, asegurando una interfaz moderna, limpia y adaptable a cualquier dispositivo (Responsive Design).
- **Backend & Base de Datos:** PocketBase, un sistema backend robusto y ligero que maneja autenticación, base de datos en tiempo real y almacenamiento de archivos de manera altamente eficiente.

---

## 4. Tiempos de Desarrollo y Garantía

- **Tiempo de Desarrollo:** Se estima que el desarrollo completo de la aplicación, incluyendo todos los módulos descriptos, tomará aproximadamente **1 mes**.
- **Período de Garantía:** Se incluye **1 mes** posterior a la entrega y puesta en producción del sistema para realizar tareas de **mantenimiento correctivo sin cargo** (resolución de posibles errores o bugs detectados durante el uso inicial).

---

## 5. Inversión y Entregables

El proyecto se presupuesta en base a un paquete cerrado de horas de trabajo que cubre todas las fases y módulos descritos.

| Concepto | Descripción | Total |
| :--- | :--- | :--- |
| **Desarrollo Integral** | Pack de 50 horas de trabajo a $50 USD por hora. | USD $ 2,500 |
| | | |
| **TOTAL ESTIMADO** | | **USD $ 2,500** |

### Entregables y Alojamiento

- **Código Fuente:** Al finalizar el proyecto, se hará entrega del código fuente completo al cliente.
- **Servidor Integrado:** El presupuesto incluye **1 año gratis** de funcionamiento en un servidor provisto por el desarrollador.
- **Renovación posterior:** Luego del primer año gratuito, el cliente podrá optar por:
  - Migrar el sistema a un servidor propio (se incluye **asesoría gratuita** para llevar a cabo este proceso).
  - Abonar un servicio para uso y mantenimiento (precio a convenir).

---

## 6. Condiciones de Pago

- **Anticipo:** 20% al momento de aceptar el presupuesto y comenzar el desarrollo.
- **Entrega de Desarrollo:** 40% al finalizar el desarrollo del sistema.
- **Cierre y Garantía:** 40% un mes posterior a la finalización del desarrollo.

**Validez del presupuesto:** 15 días a partir de la fecha de emisión.

---
**Mg. Ing. Carlos A. Acosta Parra**
