## ADDED Requirements

### Requirement: Restablecimiento administrativo de contraseñas
El sistema SHALL permitir que un usuario con rol activo `admin` establezca una nueva contraseña para una cuenta seleccionada desde `/usuarios`, sin exponer la contraseña en la respuesta del servidor.

#### Scenario: Abrir restablecimiento desde el listado
- **WHEN** un admin selecciona `Restablecer contraseña` en la fila de un usuario
- **THEN** el sistema muestra un modal que identifica la cuenta objetivo
- **AND** solicita nueva contraseña y confirmación

#### Scenario: Validar contraseña en el modal
- **WHEN** la contraseña tiene menos de 8 caracteres o no coincide con la confirmación
- **THEN** el sistema muestra un error
- **AND** no envía la actualización a PocketBase

#### Scenario: Restablecimiento exitoso
- **WHEN** un admin confirma dos contraseñas válidas e iguales
- **THEN** el sistema actualiza la contraseña de la cuenta seleccionada
- **AND** marca `password_configured` como verdadero
- **AND** muestra una confirmación visual sin incluir la contraseña
- **AND** limpia los campos sensibles del modal

#### Scenario: Cuenta activa
- **WHEN** el admin selecciona su propia cuenta desde `/usuarios`
- **THEN** el sistema permite restablecer su contraseña
- **AND** conserva las restricciones existentes para eliminar la cuenta activa o quitar su rol admin

#### Scenario: Usuario sin rol activo admin
- **WHEN** un usuario sin rol activo `admin` llama al endpoint de restablecimiento
- **THEN** el sistema responde `403`
- **AND** no modifica la contraseña del usuario objetivo

#### Scenario: Respuesta sin contraseña
- **WHEN** el endpoint completa el restablecimiento
- **THEN** la respuesta incluye únicamente datos no sensibles de la cuenta y el estado de configuración
- **AND** no incluye `password` ni `passwordConfirm`
