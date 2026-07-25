## ADDED Requirements

### Requirement: Revision de DNI duplicados
El sistema SHALL permitir a administradores revisar DNI presentes en mas de una ficha activa.

#### Scenario: Acceso desde calidad de datos
- **WHEN** un usuario con rol activo admin abre el menu lateral
- **THEN** el sistema muestra la opcion "DNI duplicados" dentro de "Calidad de datos"
- **AND** la opcion navega a `/pacientes/dni-duplicados`

#### Scenario: Listar DNI en mas de una ficha
- **WHEN** un administrador abre `/pacientes/dni-duplicados`
- **THEN** el sistema lista cada DNI normalizado que aparece en mas de una ficha activa
- **AND** muestra para cada DNI los pacientes, documentos cargados, fichas, telefono, obra social y enlace a la ficha del paciente

#### Scenario: No autorizado
- **WHEN** un usuario sin rol activo admin intenta consultar DNI duplicados
- **THEN** el sistema rechaza el acceso
