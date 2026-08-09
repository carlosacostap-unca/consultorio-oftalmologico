## ADDED Requirements

### Requirement: Compatibilidad del filtro web de pacientes activos
El sistema SHALL listar, buscar y validar pacientes en la aplicación web sin depender de campos pertenecientes al esquema opcional de sincronización de escritorio.

#### Scenario: Operar la web sin esquema de escritorio
- **WHEN** PocketBase dispone de los campos del esquema web base y no dispone de `sync_deleted`
- **THEN** los filtros web de pacientes no incluyen `sync_deleted`
- **AND** la validación de documento y el cálculo de siguiente ficha responden sin error de esquema

#### Scenario: Excluir pacientes fusionados
- **WHEN** un flujo web consulta pacientes activos
- **THEN** el sistema excluye los registros cuyo `estado_registro` es `fusionado`
- **AND** no requiere metadatos de sincronización para aplicar ese criterio

#### Scenario: Criterio de escritorio explícito
- **WHEN** un consumidor opera contra un PocketBase con el esquema de sincronización instalado
- **THEN** el criterio que excluye bajas lógicas de escritorio se define separadamente del filtro web base
- **AND** no se aplica implícitamente a entornos que no soportan ese campo
