## MODIFIED Requirements

### Requirement: Alta de paciente
El sistema SHALL permitir crear pacientes con datos personales, documento, ficha, contacto y cobertura, y SHALL ejecutar las validaciones previas sin requerir permisos administrativos de lectura del esquema de PocketBase.

#### Scenario: Crear paciente con mutual existente
- **WHEN** el usuario completa apellido, nombre, numero de documento y selecciona una mutual
- **THEN** el sistema guarda el paciente en `pacientes`
- **AND** normaliza nombre, apellido y numero de ficha a mayusculas
- **AND** redirige a crear una nueva consulta para el paciente creado

#### Scenario: Calculo de siguiente ficha
- **WHEN** el usuario abre el alta de paciente
- **THEN** el sistema consulta `/api/pacientes/ficha`
- **AND** precarga el siguiente numero de ficha disponible cuando el campo esta vacio

#### Scenario: Ficha duplicada
- **WHEN** el usuario intenta guardar un numero de ficha ya asignado a otro paciente
- **THEN** el sistema informa el paciente duplicado
- **AND** no crea el registro

#### Scenario: DNI duplicado
- **WHEN** el usuario intenta guardar un DNI asignado a otro paciente activo del mismo tipo de documento
- **THEN** el sistema informa el paciente duplicado
- **AND** no crea el registro

#### Scenario: Validacion de DNI con permisos operativos
- **WHEN** el usuario intenta guardar un paciente y las credenciales del servidor pueden consultar registros pero no leer el esquema de PocketBase
- **THEN** el sistema valida el DNI mediante `numero_documento`
- **AND** no requiere acceso a `/api/collections/pacientes` para completar la validacion

#### Scenario: Falla tecnica al validar el DNI
- **WHEN** `/api/pacientes/documento` no puede completar la consulta
- **THEN** el sistema informa que no pudo validar el documento
- **AND** no afirma que la coleccion `pacientes` sea inexistente
- **AND** no intenta crear el registro sin validar el DNI
